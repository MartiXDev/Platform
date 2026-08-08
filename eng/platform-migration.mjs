import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
  rename,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import {
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
} from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const PLATFORM_MIGRATION_TOOL_VERSION = "1.0.0-beta.1";
export const PLATFORM_MIGRATION_TARGET_VERSION = "1.0.0-beta.1";
export const PLATFORM_MIGRATION_SOURCE_VERSION = "0.1.0-preview.1";
export const PLATFORM_MIGRATION_SCHEMA_VERSION = "1.0.0";
export const PLATFORM_MIGRATION_SOURCE_MATURITY = "Experimental Public Alpha";

const FIRST_PARTY_PACKAGE_IDS = Object.freeze([
  "MartiX.Platform",
  "MartiX.Platform.Analyzers",
  "MartiX.Platform.AspNetCore",
  "MartiX.Platform.EntityFrameworkCore",
]);
const FIRST_PARTY_PACKAGE_SET = new Set(FIRST_PARTY_PACKAGE_IDS);
const TEXT_EXTENSIONS = new Set([
  ".cs",
  ".csproj",
  ".json",
  ".md",
  ".props",
  ".slnx",
  ".txt",
  ".xml",
]);
const IGNORED_DIRECTORY_NAMES = new Set([".git", "bin", "node_modules", "obj"]);
const REQUIRED_MANIFEST_PROPERTIES = Object.freeze([
  "$schema",
  "kind",
  "manifestSchemaVersion",
  "platformVersion",
  "platformContractVersion",
  "repository",
  "origin",
  "preset",
  "capabilities",
  "providers",
  "appliedMigrations",
  "supportClaims",
  "security",
  "verification",
]);
const OWNER_COHORTS = Object.freeze([
  Object.freeze({
    sourceVersion: PLATFORM_MIGRATION_SOURCE_VERSION,
    targetVersion: PLATFORM_MIGRATION_TARGET_VERSION,
    sourceOwner: "MartiX.AlphaRehearsal",
    targetOwner: "MartiX.BetaRehearsal",
  }),
  Object.freeze({
    sourceVersion: PLATFORM_MIGRATION_SOURCE_VERSION,
    targetVersion: PLATFORM_MIGRATION_TARGET_VERSION,
    sourceOwner: "MartiX.TemplateTestApp",
    targetOwner: "MartiX.BetaTemplateTestApp",
  }),
]);
const BASE_STEP_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: "MXM-ALPHA-BETA-PACKAGES",
    kind: "msbuild-package-version",
    recovery: "source-revert",
    reason:
      "Upgrade every exact first-party Platform package input to the target candidate.",
  }),
  Object.freeze({
    id: "MXM-ALPHA-BETA-OWNER",
    kind: "csharp-owner-rename",
    recovery: "source-revert",
    reason:
      "Rename the declared application owner through compiled C# identifier tokens and owned project paths.",
  }),
]);

export class PlatformMigrationError extends Error {
  constructor(message, details = undefined) {
    super(message);
    this.name = "PlatformMigrationError";
    this.details = details;
  }
}

export class MigrationConflictError extends PlatformMigrationError {
  constructor(conflict) {
    super(
      `Migration conflict ${conflict.id} at ${conflict.path}: ${conflict.message}`,
      conflict,
    );
    this.name = "MigrationConflictError";
    this.conflict = conflict;
  }
}

function fail(message, details = undefined) {
  throw new PlatformMigrationError(message, details);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireRecord(value, label) {
  if (!isRecord(value)) {
    fail(`${label} must be an object.`);
  }
  return value;
}

function requireString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(`${label} is required.`);
  }
  return value.trim();
}

function isHex(value) {
  if (value.length === 0) {
    return false;
  }
  for (const character of value) {
    if (
      !(
        (character >= "0" && character <= "9") ||
        (character >= "a" && character <= "f")
      )
    ) {
      return false;
    }
  }
  return true;
}

function requireDigest(value, label) {
  if (
    typeof value !== "string" ||
    !value.startsWith("sha256:") ||
    value.length !== "sha256:".length + 64 ||
    !isHex(value.slice("sha256:".length))
  ) {
    fail(`${label} must be a sha256 digest.`);
  }
  return value;
}

function requireCommit(value) {
  const commit = requireString(value, "source commit").toLowerCase();
  if (commit.length !== 40 || !isHex(commit)) {
    fail("source commit must be a 40-character hexadecimal commit.");
  }
  return commit;
}

function requireTargetVersion(value) {
  const targetVersion = requireString(
    value ?? PLATFORM_MIGRATION_TARGET_VERSION,
    "target platform version",
  );
  if (targetVersion !== PLATFORM_MIGRATION_TARGET_VERSION) {
    fail(
      `No exact migration catalog edge is available for ${targetVersion}; use ${PLATFORM_MIGRATION_TARGET_VERSION}.`,
    );
  }
  return targetVersion;
}

export function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item));
  }
  if (!isRecord(value)) {
    return value;
  }
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

export function sha256(value) {
  return `sha256:${createHash("sha256")
    .update(typeof value === "string" ? value : value)
    .digest("hex")}`;
}

function renderedJson(value) {
  return `${JSON.stringify(canonicalize(value), null, 2)}\n`;
}

function replaceExact(value, search, replacement) {
  if (!value.includes(search)) {
    return value;
  }
  return value.split(search).join(replacement);
}

async function runGit(rootDir, argumentsList) {
  try {
    const result = await execFileAsync("git", argumentsList, {
      cwd: rootDir,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
    return result.stdout;
  } catch (error) {
    const detail = typeof error.stderr === "string" ? error.stderr.trim() : "";
    throw new PlatformMigrationError(
      `git ${argumentsList.join(" ")} failed${detail ? `: ${detail}` : "."}`,
      { cause: error },
    );
  }
}

async function requireRepository(rootDir) {
  const requestedRoot = resolve(rootDir ?? process.cwd());
  const actualRoot = resolve(
    (await runGit(requestedRoot, ["rev-parse", "--show-toplevel"])).trim(),
  );
  if (actualRoot !== requestedRoot) {
    fail(
      `Migration root must be the Git repository root: ${requestedRoot}.`,
    );
  }
  return actualRoot;
}

async function getRepositoryState(rootDir, requireClean) {
  const repository = await requireRepository(rootDir);
  const status = (
    await runGit(repository, [
      "status",
      "--porcelain=v1",
      "--untracked-files=all",
    ])
  ).trim();
  if (requireClean && status.length > 0) {
    fail(
      "Migration requires a clean working tree; review or commit application-owned changes before planning.",
    );
  }
  const commit = requireCommit(
    (await runGit(repository, ["rev-parse", "HEAD"])).trim(),
  );
  const tracked = (await runGit(repository, ["ls-files", "-z"]))
    .split("\0")
    .filter((path) => path.length > 0)
    .sort();
  if (tracked.length === 0) {
    fail("Migration repository must contain tracked source inputs.");
  }
  return { repository, status, clean: status.length === 0, commit, tracked };
}

async function listDiskFiles(rootDir) {
  const files = [];

  async function visit(directory, relativeDirectory = "") {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name === ".git") {
        continue;
      }
      const relativePath = relativeDirectory
        ? `${relativeDirectory}/${entry.name}`
        : entry.name;
      const absolutePath = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORY_NAMES.has(entry.name)) {
          continue;
        }
        await visit(absolutePath, relativePath);
      } else {
        files.push(relativePath);
      }
    }
  }

  await visit(rootDir);
  return files.sort();
}

async function readFileMap(rootDir, paths) {
  const files = new Map();
  for (const path of [...paths].sort()) {
    files.set(path, await readFile(join(rootDir, path)));
  }
  return files;
}

function digestFileMap(files) {
  const entries = [...files.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([path, contents]) => ({
      path,
      digest: sha256(contents),
    }));
  return {
    digest: sha256(canonicalJson(entries)),
    entries,
  };
}

async function trackedSnapshot(repositoryState) {
  const files = await readFileMap(repositoryState.repository, repositoryState.tracked);
  return {
    files,
    ...digestFileMap(files),
  };
}

async function readJson(path, label) {
  let contents;
  try {
    contents = await readFile(path, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      fail(`Missing ${label}.`);
    }
    throw error;
  }

  try {
    return JSON.parse(contents);
  } catch (error) {
    if (error instanceof SyntaxError) {
      fail(`Invalid JSON in ${label}: ${error.message}`);
    }
    throw error;
  }
}

function validateManifest(manifest) {
  requireRecord(manifest, "martix.platform.json");
  for (const property of REQUIRED_MANIFEST_PROPERTIES) {
    if (!Object.hasOwn(manifest, property)) {
      fail(`martix.platform.json is missing required property ${property}.`);
    }
  }
  if (manifest.kind !== "generated-solution") {
    fail("Migration input must be a generated-solution manifest.");
  }
  if (manifest.manifestSchemaVersion !== PLATFORM_MIGRATION_SCHEMA_VERSION) {
    fail(
      `Unsupported manifest schema ${manifest.manifestSchemaVersion}; this tool reads only ${PLATFORM_MIGRATION_SCHEMA_VERSION}.`,
    );
  }
  if (
    typeof manifest.platformVersion !== "string" ||
    typeof manifest.platformContractVersion !== "string"
  ) {
    fail("Manifest Platform and contract versions must be strings.");
  }
  requireRecord(manifest.repository, "martix.platform.json.repository");
  requireString(manifest.repository.name, "manifest repository name");
  requireRecord(manifest.origin, "martix.platform.json.origin");
  if (manifest.origin.template !== "martix-app") {
    fail("Migration input must originate from the martix-app Template System.");
  }
  if (!Array.isArray(manifest.appliedMigrations)) {
    fail("Manifest appliedMigrations must be an array.");
  }
  if (!Array.isArray(manifest.supportClaims) || manifest.supportClaims.length !== 0) {
    fail(
      "Experimental Public Alpha migration input must have no Supported Capability claims.",
    );
  }
  requireRecord(manifest.security, "martix.platform.json.security");
  if (
    manifest.security.secretPolicy !== "external-only" ||
    manifest.security.containsSecrets !== false
  ) {
    fail("Migration input must use external-only secret delivery.");
  }
  return manifest;
}

function findElementValues(contents, elementName) {
  const values = [];
  const opening = `<${elementName}>`;
  const closing = `</${elementName}>`;
  let cursor = 0;
  while (true) {
    const start = contents.indexOf(opening, cursor);
    if (start === -1) {
      break;
    }
    const valueStart = start + opening.length;
    const valueEnd = contents.indexOf(closing, valueStart);
    if (valueEnd === -1) {
      fail(`Unclosed MSBuild element ${elementName}.`);
    }
    values.push({
      start,
      valueStart,
      valueEnd,
      end: valueEnd + closing.length,
      value: contents.slice(valueStart, valueEnd).trim(),
    });
    cursor = valueEnd + closing.length;
  }
  return values;
}

function findAttribute(contents, attributeName) {
  return findAttributeRange(contents, attributeName)?.value;
}

function findAttributeRange(contents, attributeName) {
  let cursor = 0;
  while (true) {
    const start = contents.indexOf(attributeName, cursor);
    if (start === -1) {
      return undefined;
    }
    const before = start === 0 ? "" : contents[start - 1];
    const after = contents[start + attributeName.length];
    if (
      (before === "" || before === " " || before === "\n" || before === "\r") &&
      (after === "=" || after === " " || after === "\t")
    ) {
      let valueStart = start + attributeName.length;
      while (
        valueStart < contents.length &&
        (contents[valueStart] === " " ||
          contents[valueStart] === "\t" ||
          contents[valueStart] === "=")
      ) {
        valueStart++;
      }
      const quote = contents[valueStart];
      if (quote !== '"' && quote !== "'") {
        fail(`MSBuild attribute ${attributeName} must be quoted.`);
      }
      const valueEnd = contents.indexOf(quote, valueStart + 1);
      if (valueEnd === -1) {
        fail(`Unclosed MSBuild attribute ${attributeName}.`);
      }
      return {
        value: contents.slice(valueStart + 1, valueEnd),
        valueStart: valueStart + 1,
        valueEnd,
      };
    }
    cursor = start + attributeName.length;
  }
}

function findPackageReferenceBlocks(contents) {
  const blocks = [];
  const opening = "<PackageReference";
  let cursor = 0;
  while (true) {
    const start = contents.indexOf(opening, cursor);
    if (start === -1) {
      break;
    }
    const next = contents[start + opening.length];
    if (
      next !== " " &&
      next !== "\t" &&
      next !== "\n" &&
      next !== "\r" &&
      next !== "/" &&
      next !== ">"
    ) {
      cursor = start + opening.length;
      continue;
    }
    const selfClosingEnd = contents.indexOf("/>", start);
    const closing = contents.indexOf("</PackageReference>", start);
    let end;
    if (closing === -1 || selfClosingEnd < closing) {
      end = selfClosingEnd === -1 ? -1 : selfClosingEnd + 2;
    } else {
      end = closing + "</PackageReference>".length;
    }
    if (end === -1) {
      fail("Unclosed MSBuild PackageReference element.");
    }
    blocks.push({
      start,
      end,
      text: contents.slice(start, end),
    });
    cursor = end;
  }
  return blocks;
}

function inspectPackages(files, expectedVersion) {
  const packages = new Map();
  for (const [path, contents] of files.entries()) {
    if (!path.endsWith(".csproj")) {
      continue;
    }
    const text = contents.toString("utf8");
    const platformProperties = findElementValues(text, "MartiXPlatformVersion");
    for (const block of findPackageReferenceBlocks(text)) {
      const id = findAttribute(block.text, "Include");
      if (!id || !FIRST_PARTY_PACKAGE_SET.has(id)) {
        continue;
      }
      const declaredVersion = findAttribute(block.text, "Version");
      if (!declaredVersion) {
        fail(`First-party package ${id} in ${path} has no exact Version.`);
      }
      const version =
        declaredVersion === "$(MartiXPlatformVersion)"
          ? platformProperties.length === 1
            ? platformProperties[0].value
            : fail(
                `${path} must declare exactly one MartiXPlatformVersion for ${id}.`,
              )
          : declaredVersion;
      const record = packages.get(id) ?? {
        id,
        versions: new Set(),
        paths: [],
      };
      record.versions.add(version);
      record.paths.push(path);
      packages.set(id, record);
    }
  }

  const normalized = [];
  for (const id of FIRST_PARTY_PACKAGE_IDS) {
    const record = packages.get(id);
    if (!record) {
      fail(`Migration input is missing first-party package ${id}.`);
    }
    if (record.versions.size !== 1 || !record.versions.has(expectedVersion)) {
      fail(
        `First-party package ${id} must use exact version ${expectedVersion}.`,
      );
    }
    normalized.push({
      id,
      version: expectedVersion,
      paths: [...new Set(record.paths)].sort(),
    });
  }
  return normalized.sort((left, right) => left.id.localeCompare(right.id));
}

function replaceMsBuildPackageVersions(
  source,
  path,
  sourceVersion,
  targetVersion,
) {
  const replacements = [];
  for (const block of findPackageReferenceBlocks(source)) {
    const id = findAttribute(block.text, "Include");
    if (!id || !FIRST_PARTY_PACKAGE_SET.has(id)) {
      continue;
    }
    const version = findAttributeRange(block.text, "Version");
    if (!version) {
      fail(`First-party package ${id} in ${path} has no exact Version.`);
    }
    if (version.value === "$(MartiXPlatformVersion)") {
      continue;
    }
    if (version.value !== sourceVersion) {
      throw new MigrationConflictError({
        id: "MXM-AMBIGUOUS-PACKAGE-VERSION",
        path,
        message: `${id} is ${version.value}, not the admitted source version`,
        resolution:
          "restore the exact source package input or record an application-owned resolution",
      });
    }
    replacements.push({
      start: block.start + version.valueStart,
      end: block.start + version.valueEnd,
      value: targetVersion,
    });
  }
  return applyReplacements(source, replacements);
}

function findOwnerDefinition(sourceVersion, targetVersion, sourceOwner) {
  const definition = OWNER_COHORTS.find(
    (candidate) =>
      candidate.sourceVersion === sourceVersion &&
      candidate.targetVersion === targetVersion &&
      candidate.sourceOwner === sourceOwner,
  );
  if (!definition) {
    fail(
      `No typed owner migration is admitted for ${sourceOwner} from ${sourceVersion} to ${targetVersion}.`,
    );
  }
  return definition;
}

function createStepDefinitions(ownerDefinition) {
  return BASE_STEP_DEFINITIONS.map((step) => ({
    ...step,
    sourceVersion: ownerDefinition.sourceVersion,
    targetVersion: ownerDefinition.targetVersion,
    ...(step.kind === "csharp-owner-rename"
      ? {
          sourceOwner: ownerDefinition.sourceOwner,
          targetOwner: ownerDefinition.targetOwner,
        }
      : {}),
    recipeDigest: sha256(
      canonicalJson({
        ...step,
        sourceVersion: ownerDefinition.sourceVersion,
        targetVersion: ownerDefinition.targetVersion,
        ...(step.kind === "csharp-owner-rename"
          ? {
              sourceOwner: ownerDefinition.sourceOwner,
              targetOwner: ownerDefinition.targetOwner,
            }
          : {}),
      }),
    ),
  }));
}

function applyReplacements(source, replacements) {
  let result = source;
  for (const replacement of [...replacements].sort(
    (left, right) => right.start - left.start,
  )) {
    result =
      result.slice(0, replacement.start) +
      replacement.value +
      result.slice(replacement.end);
  }
  return result;
}

function isIdentifierStart(character) {
  return (
    character === "_" ||
    (character >= "A" && character <= "Z") ||
    (character >= "a" && character <= "z")
  );
}

function isIdentifierPart(character) {
  return isIdentifierStart(character) || (character >= "0" && character <= "9");
}

function tokenizeCSharp(source) {
  const tokens = [];
  let cursor = 0;
  while (cursor < source.length) {
    const character = source[cursor];
    if (
      character === " " ||
      character === "\t" ||
      character === "\n" ||
      character === "\r"
    ) {
      cursor++;
      continue;
    }
    if (source.startsWith("//", cursor)) {
      const start = cursor;
      const lineEnd = source.indexOf("\n", cursor + 2);
      cursor = lineEnd === -1 ? source.length : lineEnd;
      tokens.push({ kind: "comment", start, end: cursor, text: source.slice(start, cursor) });
      continue;
    }
    if (source.startsWith("/*", cursor)) {
      const start = cursor;
      const commentEnd = source.indexOf("*/", cursor + 2);
      if (commentEnd === -1) {
        fail("C# source contains an unclosed block comment.");
      }
      cursor = commentEnd + 2;
      tokens.push({
        kind: "comment",
        start,
        end: cursor,
        text: source.slice(start, cursor),
      });
      continue;
    }
    if (character === '"' || character === "'") {
      const start = cursor;
      const quote = character;
      cursor++;
      while (cursor < source.length) {
        if (source[cursor] === "\\") {
          cursor += 2;
          continue;
        }
        if (source[cursor] === quote) {
          cursor++;
          break;
        }
        cursor++;
      }
      if (source[cursor - 1] !== quote) {
        fail("C# source contains an unclosed string or character literal.");
      }
      tokens.push({
        kind: "string",
        start,
        end: cursor,
        text: source.slice(start, cursor),
      });
      continue;
    }
    if (isIdentifierStart(character)) {
      const start = cursor;
      cursor++;
      while (cursor < source.length && isIdentifierPart(source[cursor])) {
        cursor++;
      }
      tokens.push({
        kind: "identifier",
        start,
        end: cursor,
        text: source.slice(start, cursor),
      });
      continue;
    }
    tokens.push({
      kind: character === "." ? "dot" : "punctuation",
      start: cursor,
      end: cursor + 1,
      text: character,
    });
    cursor++;
  }
  return tokens;
}

function transformCSharpOwner(source, path, sourceOwner, targetOwner) {
  const tokens = tokenizeCSharp(source);
  const ownerParts = sourceOwner.split(".");
  const targetParts = targetOwner.split(".");
  const replacements = [];
  for (const token of tokens) {
    if (
      (token.kind === "comment" || token.kind === "string") &&
      token.text.includes(sourceOwner)
    ) {
      throw new MigrationConflictError({
        id: "MXM-AMBIGUOUS-OWNER-TEXT",
        path,
        message: "the owner identity occurs in a comment or literal",
        resolution:
          "make the application-owned source decision in a reviewed source change and plan again",
      });
    }
  }

  for (let index = 0; index < tokens.length; index++) {
    if (tokens[index].kind !== "identifier") {
      continue;
    }
    let matches = true;
    let cursor = index;
    for (let partIndex = 0; partIndex < ownerParts.length; partIndex++) {
      if (
        tokens[cursor]?.kind !== "identifier" ||
        tokens[cursor]?.text !== ownerParts[partIndex]
      ) {
        matches = false;
        break;
      }
      cursor++;
      if (partIndex < ownerParts.length - 1) {
        if (tokens[cursor]?.kind !== "dot") {
          matches = false;
          break;
        }
        cursor++;
      }
    }
    if (matches) {
      const start = tokens[index].start;
      const end = tokens[cursor - 1].end;
      replacements.push({ start, end, value: targetParts.join(".") });
      index = cursor - 1;
    }
  }

  if (replacements.length === 0 && source.includes(sourceOwner)) {
    throw new MigrationConflictError({
      id: "MXM-AMBIGUOUS-OWNER-TEXT",
      path,
      message: "the owner identity is not a qualified C# namespace or identifier",
      resolution:
        "make the application-owned source decision in a reviewed source change and plan again",
    });
  }
  return applyReplacements(source, replacements);
}

function replaceMsBuildElementValue(
  source,
  path,
  elementName,
  sourceValue,
  targetValue,
) {
  const values = findElementValues(source, elementName);
  if (values.length === 0) {
    return source;
  }
  const replacements = [];
  for (const element of values) {
    if (element.value !== sourceValue) {
      throw new MigrationConflictError({
        id: "MXM-AMBIGUOUS-PACKAGE-VERSION",
        path,
        message: `${elementName} is ${element.value}, not the admitted source version`,
        resolution:
          "restore the exact source package input or record an application-owned resolution",
      });
    }
    replacements.push({
      start: element.valueStart,
      end: element.valueEnd,
      value: targetValue,
    });
  }
  return applyReplacements(source, replacements);
}

function replaceOwnerInJson(value, sourceOwner, targetOwner) {
  if (Array.isArray(value)) {
    return value.map((item) => replaceOwnerInJson(item, sourceOwner, targetOwner));
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        replaceOwnerInJson(child, sourceOwner, targetOwner),
      ]),
    );
  }
  return typeof value === "string"
    ? replaceExact(value, sourceOwner, targetOwner)
    : value;
}

function transformManifest(contents, sourceVersion, targetVersion, ownerDefinition) {
  let manifest;
  try {
    manifest = JSON.parse(contents.toString("utf8"));
  } catch (error) {
    if (error instanceof SyntaxError) {
      fail(`Invalid JSON in martix.platform.json: ${error.message}`);
    }
    throw error;
  }
  const transformed = replaceOwnerInJson(
    manifest,
    ownerDefinition.sourceOwner,
    ownerDefinition.targetOwner,
  );
  transformed.platformVersion = targetVersion;
  transformed.platformContractVersion = targetVersion;
  transformed.appliedMigrations = [
    ...transformed.appliedMigrations,
    {
      id: "MXM-ALPHA-BETA-OWNER",
      status: "rehearsed",
      from: sourceVersion,
      to: targetVersion,
    },
  ];
  return Buffer.from(renderedJson(transformed));
}

function transformTextOwner(contents, sourceOwner, targetOwner) {
  return replaceExact(contents, sourceOwner, targetOwner);
}

function isTextPath(path) {
  return TEXT_EXTENSIONS.has(extname(path).toLowerCase());
}

async function createTransformedFiles(context, ownerDefinition, targetVersion) {
  const after = new Map();
  const pathMap = new Map();
  for (const [path, contents] of context.snapshot.files.entries()) {
    let transformed = contents;
    if (path === "martix.platform.json") {
      transformed = transformManifest(
        contents,
        context.manifest.platformContractVersion,
        targetVersion,
        ownerDefinition,
      );
    } else if (path.endsWith(".cs")) {
      transformed = Buffer.from(
        transformCSharpOwner(
          contents.toString("utf8"),
          path,
          ownerDefinition.sourceOwner,
          ownerDefinition.targetOwner,
        ),
      );
    } else if (path.endsWith(".csproj")) {
      let text = contents.toString("utf8");
      text = replaceMsBuildElementValue(
        text,
        path,
        "MartiXPlatformVersion",
        context.manifest.platformVersion,
        targetVersion,
      );
      text = replaceMsBuildPackageVersions(
        text,
        path,
        context.manifest.platformVersion,
        targetVersion,
      );
      text = transformTextOwner(
        text,
        ownerDefinition.sourceOwner,
        ownerDefinition.targetOwner,
      );
      transformed = Buffer.from(text);
    } else if (isTextPath(path)) {
      transformed = Buffer.from(
        transformTextOwner(
          contents.toString("utf8"),
          ownerDefinition.sourceOwner,
          ownerDefinition.targetOwner,
        ),
      );
    } else if (contents.includes(Buffer.from(ownerDefinition.sourceOwner))) {
      throw new MigrationConflictError({
        id: "MXM-UNSUPPORTED-OWNER-BINARY",
        path,
        message: "the owner identity occurs in an unsupported non-text input",
        resolution:
          "make the application-owned source decision in a reviewed text or typed source change",
      });
    }

    const targetPath = replaceExact(
      path,
      ownerDefinition.sourceOwner,
      ownerDefinition.targetOwner,
    );
    if (after.has(targetPath)) {
      throw new MigrationConflictError({
        id: "MXM-OWNER-PATH-COLLISION",
        path,
        message: `the target path ${targetPath} already has another source`,
        resolution:
          "resolve the application-owned path collision in a reviewed source change",
      });
    }
    after.set(targetPath, transformed);
    pathMap.set(path, targetPath);
  }
  return { after, pathMap };
}

function createChanges(before, after, pathMap) {
  const changes = [];
  for (const [path, targetPath] of [...pathMap.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    const beforeContents = before.get(path);
    const afterContents = after.get(targetPath);
    if (!afterContents) {
      fail(`Migration transform lost expected output for ${path}.`);
    }
    if (path !== targetPath) {
      changes.push({
        operation: "move",
        path,
        targetPath,
        beforeDigest: sha256(beforeContents),
        afterDigest: sha256(afterContents),
      });
    }
    if (!beforeContents.equals(afterContents)) {
      changes.push({
        operation: "edit",
        path: targetPath,
        ...(path === targetPath ? {} : { sourcePath: path }),
        beforeDigest: sha256(beforeContents),
        afterDigest: sha256(afterContents),
      });
    }
  }
  return changes.sort((left, right) =>
    `${left.operation}:${left.path}:${left.targetPath ?? ""}`.localeCompare(
      `${right.operation}:${right.path}:${right.targetPath ?? ""}`,
    ),
  );
}

async function verifyTargetFiles(rootDir, targetVersion) {
  const paths = await listDiskFiles(rootDir);
  const files = await readFileMap(rootDir, paths);
  const manifest = validateManifest(
    await readJson(join(rootDir, "martix.platform.json"), "martix.platform.json"),
  );
  if (
    manifest.platformVersion !== targetVersion ||
    manifest.platformContractVersion !== targetVersion
  ) {
    fail("Target manifest does not declare the exact requested Platform contract.");
  }
  const ownerDefinition = OWNER_COHORTS.find(
    (candidate) =>
      candidate.targetVersion === targetVersion &&
      candidate.targetOwner === manifest.repository.name,
  );
  if (!ownerDefinition) {
    fail("Target manifest owner is not an admitted migration target.");
  }
  const migration = manifest.appliedMigrations.find(
    (candidate) => candidate.id === "MXM-ALPHA-BETA-OWNER",
  );
  if (
    !isRecord(migration) ||
    migration.status !== "rehearsed" ||
    migration.from !== ownerDefinition.sourceVersion ||
    migration.to !== targetVersion
  ) {
    fail("Target manifest is missing the rehearsed alpha-to-beta ledger entry.");
  }
  const packages = inspectPackages(files, targetVersion);
  let targetOwnerFound = false;
  const sourceOwnerBytes = Buffer.from(ownerDefinition.sourceOwner);
  for (const [path, contents] of files.entries()) {
    if (path.includes(ownerDefinition.sourceOwner)) {
      fail(`Target output retains the source owner in path ${path}.`);
    }
    if (contents.includes(sourceOwnerBytes)) {
      fail(`Target output retains the source owner in ${path}.`);
    }
    if (path.endsWith(".cs") && contents.includes(Buffer.from(ownerDefinition.targetOwner))) {
      targetOwnerFound = true;
    }
  }
  if (!targetOwnerFound) {
    fail("Target output does not contain the compiled owner transformation.");
  }
  return {
    status: "passed",
    rehearsal: true,
    maturity: {
      stage: PLATFORM_MIGRATION_SOURCE_MATURITY,
      productionSupported: false,
    },
    manifest,
    packages,
    output: digestFileMap(files),
  };
}

async function materializeFileMap(rootDir, before, after) {
  const affectedPaths = new Set();
  for (const path of before.keys()) {
    if (!after.has(path) || !before.get(path).equals(after.get(path))) {
      affectedPaths.add(path);
    }
  }
  for (const path of after.keys()) {
    if (!before.has(path)) {
      affectedPaths.add(path);
    }
  }

  const snapshots = new Map();
  for (const path of affectedPaths) {
    const absolutePath = join(rootDir, path);
    try {
      const details = await stat(absolutePath);
      if (!details.isFile()) {
        fail(`Migration path is not a regular file: ${path}.`);
      }
      snapshots.set(path, await readFile(absolutePath));
    } catch (error) {
      if (error?.code === "ENOENT") {
        snapshots.set(path, undefined);
      } else if (error instanceof PlatformMigrationError) {
        throw error;
      } else {
        throw error;
      }
    }
  }
  for (const path of after.keys()) {
    if (!before.has(path) && snapshots.get(path) !== undefined) {
      fail(
        `Migration target path already exists outside the accepted source snapshot: ${path}.`,
      );
    }
  }

  const temporaryFiles = [];
  try {
    for (const [path, contents] of after.entries()) {
      if (
        before.has(path) &&
        before.get(path).equals(contents)
      ) {
        continue;
      }
      const absolutePath = join(rootDir, path);
      await mkdir(dirname(absolutePath), { recursive: true });
      const temporaryPath = `${absolutePath}.martix-migration-${process.pid}.tmp`;
      temporaryFiles.push(temporaryPath);
      await writeFile(temporaryPath, contents);
      await rename(temporaryPath, absolutePath);
    }
    for (const path of before.keys()) {
      if (!after.has(path)) {
        await rm(join(rootDir, path), { force: true });
      }
    }
  } catch (error) {
    for (const temporaryPath of temporaryFiles) {
      await rm(temporaryPath, { force: true });
    }
    try {
      for (const path of affectedPaths) {
        await rm(join(rootDir, path), { force: true });
      }
      for (const [path, contents] of snapshots.entries()) {
        if (contents !== undefined) {
          const absolutePath = join(rootDir, path);
          await mkdir(dirname(absolutePath), { recursive: true });
          await writeFile(absolutePath, contents);
        }
      }
    } catch (rollbackError) {
      throw new PlatformMigrationError(
        "Migration I/O failed and automatic restoration also failed; recover from the recorded source commit.",
        { cause: error, rollbackError },
      );
    }
    throw new PlatformMigrationError(
      "Migration I/O failed; the tool restored the original source files.",
      { cause: error },
    );
  } finally {
    for (const temporaryPath of temporaryFiles) {
      await rm(temporaryPath, { force: true });
    }
  }
}

async function createSimulationWorktree(context, after, targetVersion) {
  const worktreeParent = await mkdtemp(
    join(tmpdir(), "martix-platform-migration-worktree-"),
  );
  const worktree = join(worktreeParent, "source");
  await runGit(context.repository, [
    "worktree",
    "add",
    "--detach",
    worktree,
    context.repositoryState.commit,
  ]);
  try {
    await materializeFileMap(worktree, context.snapshot.files, after);
    const verification = await verifyTargetFiles(worktree, targetVersion);
    return {
      output: verification.output,
      verificationDigest: sha256(
        canonicalJson({
          status: verification.status,
          rehearsal: verification.rehearsal,
          maturity: verification.maturity,
          manifest: verification.manifest,
          packages: verification.packages,
        }),
      ),
    };
  } finally {
    await runGit(context.repository, ["worktree", "remove", "--force", worktree]);
    await rm(worktreeParent, { recursive: true, force: true });
  }
}

async function loadSourceContext(rootDir, requireClean) {
  const repositoryState = await getRepositoryState(rootDir, requireClean);
  const snapshot = await trackedSnapshot(repositoryState);
  const manifest = validateManifest(
    await readJson(
      join(repositoryState.repository, "martix.platform.json"),
      "martix.platform.json",
    ),
  );
  if (manifest.platformVersion !== manifest.platformContractVersion) {
    fail(
      "Migration input must have matching installed Platform and source contract versions.",
    );
  }
  if (manifest.platformContractVersion !== PLATFORM_MIGRATION_SOURCE_VERSION) {
    fail(
      `No alpha migration edge is available from ${manifest.platformContractVersion}.`,
    );
  }
  const packages = inspectPackages(snapshot.files, manifest.platformVersion);
  const ownerDefinition = findOwnerDefinition(
    manifest.platformContractVersion,
    PLATFORM_MIGRATION_TARGET_VERSION,
    manifest.repository.name,
  );
  return {
    repository: repositoryState.repository,
    repositoryState,
    manifest,
    packages,
    ownerDefinition,
    snapshot,
  };
}

function sourceRecord(context) {
  return {
    commit: context.repositoryState.commit,
    clean: context.repositoryState.clean,
    manifestDigest: sha256(canonicalJson(context.manifest)),
    platformVersion: context.manifest.platformVersion,
    platformContractVersion: context.manifest.platformContractVersion,
    sourceDigest: context.snapshot.digest,
    files: context.snapshot.entries,
  };
}

function maturityRecord() {
  return {
    stage: PLATFORM_MIGRATION_SOURCE_MATURITY,
    productionSupported: false,
    boundary:
      "Migration rehearsal evidence does not make a prerelease alpha fixture retroactively supported.",
  };
}

export async function inspectMigration({ rootDir = process.cwd() } = {}) {
  const context = await loadSourceContext(rootDir, true);
  return {
    kind: "migration-inspection",
    toolVersion: PLATFORM_MIGRATION_TOOL_VERSION,
    status: "ready",
    repository: context.repository,
    source: sourceRecord(context),
    manifest: {
      kind: context.manifest.kind,
      preset: context.manifest.preset,
      manifestSchemaVersion: context.manifest.manifestSchemaVersion,
      appliedMigrations: context.manifest.appliedMigrations,
    },
    packages: context.packages,
    owner: {
      source: context.ownerDefinition.sourceOwner,
      target: context.ownerDefinition.targetOwner,
    },
    maturity: maturityRecord(),
  };
}

function createPlanBody(context, targetVersion, steps, status, extra = {}) {
  return {
    kind: "migration-plan",
    planSchemaVersion: PLATFORM_MIGRATION_SCHEMA_VERSION,
    toolVersion: PLATFORM_MIGRATION_TOOL_VERSION,
    status,
    source: sourceRecord(context),
    target: {
      platformVersion: targetVersion,
      platformContractVersion: targetVersion,
      manifestSchemaVersion: PLATFORM_MIGRATION_SCHEMA_VERSION,
      owner: context.ownerDefinition.targetOwner,
    },
    maturity: maturityRecord(),
    steps,
    recovery: {
      strategy: "source-revert",
      pointOfNoReturn: "materialization of the accepted source diff",
      note:
        "This rehearsal changes source files only; deployed database rollback is not claimed.",
    },
    ...extra,
  };
}

function finalizePlan(body) {
  return {
    ...body,
    planDigest: sha256(canonicalJson(body)),
  };
}

export async function createMigrationPlan({
  rootDir = process.cwd(),
  targetVersion = PLATFORM_MIGRATION_TARGET_VERSION,
} = {}) {
  const exactTargetVersion = requireTargetVersion(targetVersion);
  const context = await loadSourceContext(rootDir, true);
  const steps = createStepDefinitions(context.ownerDefinition);
  try {
    const transformed = await createTransformedFiles(
      context,
      context.ownerDefinition,
      exactTargetVersion,
    );
    const simulation = await createSimulationWorktree(
      context,
      transformed.after,
      exactTargetVersion,
    );
    const body = createPlanBody(context, exactTargetVersion, steps, "ready", {
      changes: createChanges(
        context.snapshot.files,
        transformed.after,
        transformed.pathMap,
      ),
      output: simulation.output,
      evidence: {
        inputDigest: context.snapshot.digest,
        outputDigest: simulation.output.digest,
        verificationDigest: simulation.verificationDigest,
        immutableInputs: true,
        targetGates: ["manifest-coherence", "exact-packages", "owner-postcondition"],
      },
    });
    return finalizePlan(body);
  } catch (error) {
    if (!(error instanceof MigrationConflictError)) {
      throw error;
    }
    return finalizePlan(
      createPlanBody(context, exactTargetVersion, steps, "blocked", {
        changes: [],
        conflicts: [error.conflict],
        evidence: {
          inputDigest: context.snapshot.digest,
          immutableInputs: true,
          targetGates: ["manifest-coherence", "exact-packages", "owner-postcondition"],
        },
      }),
    );
  }
}

function assertPlanDigest(plan) {
  requireRecord(plan, "migration plan");
  const planDigest = requireDigest(plan.planDigest, "migration plan digest");
  const { planDigest: ignored, ...body } = plan;
  if (sha256(canonicalJson(body)) !== planDigest) {
    fail("Migration plan digest does not match its content.");
  }
  return plan;
}

export async function writeMigrationPlan(plan, path) {
  assertPlanDigest(plan);
  const targetPath = resolve(requireString(path, "migration plan path"));
  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, renderedJson(plan), "utf8");
  return targetPath;
}

async function readMigrationPlan(path) {
  const plan = await readJson(
    resolve(requireString(path, "migration plan path")),
    "migration plan",
  );
  return assertPlanDigest(plan);
}

function ensurePlanOutsideRepository(repository, planPath) {
  const relativePlanPath = relative(repository, resolve(planPath));
  if (
    relativePlanPath === "" ||
    (!relativePlanPath.startsWith("..") && !isAbsolute(relativePlanPath))
  ) {
    fail(
      "Migration plans must be stored outside the source repository so planning remains non-mutating.",
    );
  }
}

export async function applyMigration({
  rootDir = process.cwd(),
  planPath,
} = {}) {
  const plan = await readMigrationPlan(planPath);
  if (plan.status !== "ready") {
    fail("Only a ready migration plan may be applied.");
  }
  const context = await loadSourceContext(rootDir, true);
  ensurePlanOutsideRepository(context.repository, planPath);
  if (
    plan.toolVersion !== PLATFORM_MIGRATION_TOOL_VERSION ||
    plan.target.platformVersion !== PLATFORM_MIGRATION_TARGET_VERSION ||
    plan.source.commit !== context.repositoryState.commit ||
    plan.source.sourceDigest !== context.snapshot.digest ||
    plan.source.manifestDigest !==
      sha256(canonicalJson(context.manifest)) ||
    plan.source.platformContractVersion !==
      context.manifest.platformContractVersion
  ) {
    fail(
      "Migration plan is stale: exact tool, source commit, manifest, or input digest no longer matches.",
    );
  }
  const transformed = await createTransformedFiles(
    context,
    context.ownerDefinition,
    plan.target.platformVersion,
  );
  const output = digestFileMap(transformed.after);
  if (output.digest !== plan.output.digest) {
    fail(
      "Migration plan is stale: compiled transformation output no longer matches the accepted digest.",
    );
  }
  await materializeFileMap(
    context.repository,
    context.snapshot.files,
    transformed.after,
  );
  try {
    const verification = await verifyTargetFiles(
      context.repository,
      plan.target.platformVersion,
    );
    return {
      status: "applied",
      planDigest: plan.planDigest,
      outputDigest: verification.output.digest,
      verificationDigest: sha256(
        canonicalJson({
          status: verification.status,
          rehearsal: verification.rehearsal,
          maturity: verification.maturity,
          manifest: verification.manifest,
          packages: verification.packages,
        }),
      ),
    };
  } catch (error) {
    await materializeFileMap(
      context.repository,
      transformed.after,
      context.snapshot.files,
    );
    throw error;
  }
}

export async function verifyMigration({
  rootDir = process.cwd(),
  targetVersion = PLATFORM_MIGRATION_TARGET_VERSION,
} = {}) {
  const exactTargetVersion = requireTargetVersion(targetVersion);
  const repository = await requireRepository(rootDir);
  const verification = await verifyTargetFiles(repository, exactTargetVersion);
  return {
    kind: "migration-verification",
    toolVersion: PLATFORM_MIGRATION_TOOL_VERSION,
    ...verification,
  };
}

function parseCliArguments(argumentsList) {
  let cursor = 0;
  if (argumentsList[0] === "migrate") {
    cursor++;
  }
  const command = argumentsList[cursor++];
  const options = {};
  while (cursor < argumentsList.length) {
    const argument = argumentsList[cursor++];
    if (argument === "--help" || argument === "-h") {
      return { help: true };
    }
    if (!argument.startsWith("--")) {
      fail(`Unknown migration argument ${argument}.`);
    }
    const separator = argument.indexOf("=");
    const name = separator === -1 ? argument : argument.slice(0, separator);
    const value =
      separator === -1
        ? argumentsList[cursor++]
        : argument.slice(separator + 1);
    if (value === undefined || value.startsWith("--")) {
      fail(`Migration option ${name} requires a value.`);
    }
    switch (name) {
      case "--root":
        options.rootDir = value;
        break;
      case "--to":
        options.targetVersion = value;
        break;
      case "--output":
        options.outputPath = value;
        break;
      case "--plan":
        options.planPath = value;
        break;
      default:
        fail(`Unknown migration option ${name}.`);
    }
  }
  return { command, options };
}

export async function runPlatformMigrationCli(
  argumentsList = process.argv.slice(2),
) {
  const parsed = parseCliArguments(argumentsList);
  if (parsed.help || parsed.command === undefined) {
    console.log(
      [
        "Usage: node eng/migrate.mjs migrate inspect --root <repository>",
        "       node eng/migrate.mjs migrate plan --to <exact-version> --output <plan-file>",
        "       node eng/migrate.mjs migrate apply --plan <plan-file> --root <repository>",
        "       node eng/migrate.mjs migrate verify --root <repository>",
      ].join("\n"),
    );
    return { status: "help" };
  }

  let result;
  switch (parsed.command) {
    case "inspect":
      result = await inspectMigration(parsed.options);
      break;
    case "plan": {
      result = await createMigrationPlan(parsed.options);
      if (parsed.options.outputPath !== undefined) {
        const repository = await requireRepository(
          parsed.options.rootDir ?? process.cwd(),
        );
        ensurePlanOutsideRepository(repository, parsed.options.outputPath);
        await writeMigrationPlan(result, parsed.options.outputPath);
      }
      break;
    }
    case "apply":
      result = await applyMigration(parsed.options);
      break;
    case "verify":
      result = await verifyMigration(parsed.options);
      break;
    default:
      fail(
        `Unknown migration command ${parsed.command}; expected inspect, plan, apply, or verify.`,
      );
  }
  console.log(renderedJson(result));
  return result;
}

const invokedFile = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : null;

if (invokedFile === import.meta.url) {
  runPlatformMigrationCli().then(
    (result) => {
      if (result.status === "blocked") {
        process.exitCode = 2;
      }
    },
    (error) => {
      console.error(`Platform migration failed: ${error.message}`);
      process.exitCode = 1;
    },
  );
}
