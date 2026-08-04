import { createHash } from "node:crypto";
import { execFile, spawn } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { z } from "zod";
import {
  API_BASELINE_CAPABILITIES,
  API_MANIFEST_SCHEMA_URI,
  API_PLATFORM_VERSION,
  generateApiPreset,
} from "./api-preset.mjs";
import {
  listZipEntries,
  readZipEntry,
  runDotnet,
} from "./package-verification.mjs";

const execFileAsync = promisify(execFile);

export const API_RELEASE_EVIDENCE_SCHEMA_VERSION = "1.0.0";
export const API_RELEASE_PACKAGE_VERSION = API_PLATFORM_VERSION;
export const API_RELEASE_PUBLIC_SOURCE = "https://api.nuget.org/v3/index.json";

const REQUIRED_VERIFICATION_FLAGS = Object.freeze([
  "artifactsPackedOnce",
  "warningsAsErrors",
  "jit",
  "tunit",
  "openApi",
  "trim",
  "aot",
  "reproducible",
  "cleanOutput",
]);
const PUBLIC_PACKAGE_PATTERNS = Object.freeze([
  "Microsoft.*",
  "NETStandard.*",
  "System.*",
  "TUnit*",
  "runtime.*",
]);
const PACKAGE_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: "MartiX.Platform",
    projectPath: "src/MartiX.Platform/MartiX.Platform.csproj",
    evidencePath: "tests/Compatibility/MartiX.Platform.package-content.json",
    targetFramework: "net10.0",
  }),
  Object.freeze({
    id: "MartiX.Platform.AspNetCore",
    projectPath: "src/MartiX.Platform.AspNetCore/MartiX.Platform.AspNetCore.csproj",
    evidencePath:
      "tests/Compatibility/MartiX.Platform.AspNetCore.package-content.json",
    targetFramework: "net10.0",
  }),
  Object.freeze({
    id: "MartiX.Platform.Analyzers",
    projectPath: "src/MartiX.Platform.Analyzers/MartiX.Platform.Analyzers.csproj",
    evidencePath:
      "tests/Compatibility/MartiX.Platform.Analyzers.package-content.json",
    targetFramework: "netstandard2.0",
  }),
]);

const PUBLIC_API_EVIDENCE = Object.freeze([
  Object.freeze({
    path: "tests/Compatibility/MartiX.Platform.public-api.txt",
    requiredSymbols: ["MartiX.Platform.Results.Result<T>", "ErrorKind"],
  }),
  Object.freeze({
    path: "tests/Compatibility/MartiX.Platform.AspNetCore.public-api.txt",
    requiredSymbols: ["ProblemHttpResult ToProblemDetails"],
  }),
]);
const FIRST_PARTY_PACKAGE_IDS = new Set(
  PACKAGE_DEFINITIONS.map((definition) => definition.id),
);
const FORBIDDEN_GENERATED_RESIDUE =
  /\b(?:WeatherForecast|DbContext|EntityFramework|Npgsql|SqlServer|Migrations)\b/i;
const SOURCE_COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;
const NATIVE_AOT_RID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class ApiReleaseVerificationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ApiReleaseVerificationError";
  }
}

function fail(message) {
  throw new ApiReleaseVerificationError(message);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(`${label} is required.`);
  }

  return value.trim();
}

function requireDigest(value, label) {
  if (typeof value !== "string" || !DIGEST_PATTERN.test(value)) {
    fail(`${label} must be a sha256 digest.`);
  }

  return value;
}

function requireSourceCommit(value) {
  const sourceCommit = requireString(value, "sourceCommit").toLowerCase();
  if (!SOURCE_COMMIT_PATTERN.test(sourceCommit)) {
    fail("sourceCommit must be a 40-character hexadecimal commit.");
  }

  return sourceCommit;
}

function requireNativeAotRid(value, label = "nativeAotRid") {
  const rid = requireString(value, label);
  if (!NATIVE_AOT_RID_PATTERN.test(rid)) {
    fail("nativeAotRid must be a lowercase runtime identifier.");
  }

  return rid;
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

function normalizeEvidencePackages(packages) {
  if (!Array.isArray(packages) || packages.length !== PACKAGE_DEFINITIONS.length) {
    fail(
      `Candidate evidence must contain exactly ${PACKAGE_DEFINITIONS.length} packages.`,
    );
  }

  const normalized = packages.map((artifact, index) => {
    if (!isRecord(artifact)) {
      fail(`Candidate evidence package ${index} must be an object.`);
    }

    return {
      id: requireString(artifact.id, `packages[${index}].id`),
      version: requireString(
        artifact.version,
        `packages[${index}].version`,
      ),
      digest: requireDigest(
        artifact.digest,
        `packages[${index}].digest`,
      ),
    };
  });

  if (
    new Set(normalized.map((artifact) => artifact.id)).size !==
    normalized.length
  ) {
    fail("Candidate evidence packages must have unique identities.");
  }

  for (const packageId of FIRST_PARTY_PACKAGE_IDS) {
    if (!normalized.some((artifact) => artifact.id === packageId)) {
      fail(`Candidate evidence is missing package ${packageId}.`);
    }
  }

  return normalized.sort((left, right) => left.id.localeCompare(right.id));
}

function normalizeNativeAot(nativeAot) {
  if (!isRecord(nativeAot)) {
    fail("Candidate evidence must declare a Native AOT artifact.");
  }

  return {
    rid: requireNativeAotRid(nativeAot.rid, "nativeAot.rid"),
    digest: requireDigest(nativeAot.digest, "nativeAot.digest"),
  };
}

function normalizeVerification(value) {
  if (!isRecord(value)) {
    fail("Candidate evidence must declare verification outcomes.");
  }

  for (const flag of REQUIRED_VERIFICATION_FLAGS) {
    if (value[flag] !== true) {
      fail(`Candidate evidence verification.${flag} must be true.`);
    }
  }
  if (value.isolatedFeed !== "isolated") {
    fail("Candidate evidence verification.isolatedFeed must be isolated.");
  }
  if (value.packedArtifactCount !== PACKAGE_DEFINITIONS.length) {
    fail(
      `Candidate evidence verification.packedArtifactCount must be ${PACKAGE_DEFINITIONS.length}.`,
    );
  }

  return canonicalize(value);
}

export function createCandidateEvidence(input) {
  if (!isRecord(input)) {
    fail("Candidate evidence input must be an object.");
  }

  const sourceCommit = requireSourceCommit(input.sourceCommit);
  const platformVersion = requireString(
    input.platformVersion,
    "platformVersion",
  );
  const applicationName = requireString(
    input.applicationName,
    "applicationName",
  );
  const generatedSolutionDigest = requireDigest(
    input.generatedSolutionDigest,
    "generatedSolutionDigest",
  );
  const manifestDigest = requireDigest(
    input.manifestDigest,
    "manifestDigest",
  );
  const packages = normalizeEvidencePackages(input.packages);
  if (packages.some((artifact) => artifact.version !== platformVersion)) {
    fail("Candidate evidence package versions must match platformVersion.");
  }
  const nativeAot = normalizeNativeAot(input.nativeAot);
  const verification = normalizeVerification(input.verification);

  const candidateSeed = sha256(
    canonicalJson({
      applicationName,
      generatedSolutionDigest,
      manifestDigest,
      nativeAot,
      packages,
      platformVersion,
      sourceCommit,
    }),
  ).slice("sha256:".length);
  const body = {
    kind: "candidate-evidence",
    evidenceSchemaVersion: API_RELEASE_EVIDENCE_SCHEMA_VERSION,
    candidateId: `api-${platformVersion}-${candidateSeed.slice(0, 16)}`,
    platformVersion,
    platformContractVersion: platformVersion,
    source: {
      commit: sourceCommit,
    },
    preset: "api",
    generatedSolution: {
      applicationName,
      digest: generatedSolutionDigest,
      manifestDigest,
    },
    artifacts: packages,
    nativeAot,
    verification,
    persistence: "none",
    providers: [],
    supportClaims: [],
  };

  if (input.packageEvidence !== undefined) {
    body.packageEvidence = canonicalize(input.packageEvidence);
  }
  if (input.publicApi !== undefined) {
    body.publicApi = canonicalize(input.publicApi);
  }

  return {
    ...body,
    evidenceDigest: sha256(canonicalJson(body)),
  };
}

export function verifyCandidateEvidence(evidence) {
  if (!isRecord(evidence)) {
    fail("Candidate evidence must be an object.");
  }

  const { evidenceDigest, ...body } = evidence;
  requireDigest(evidenceDigest, "evidenceDigest");
  if (sha256(canonicalJson(body)) !== evidenceDigest) {
    fail("Candidate evidence digest does not match its content.");
  }

  const recreated = createCandidateEvidence({
    sourceCommit: evidence.source?.commit,
    platformVersion: evidence.platformVersion,
    applicationName: evidence.generatedSolution?.applicationName,
    generatedSolutionDigest: evidence.generatedSolution?.digest,
    manifestDigest: evidence.generatedSolution?.manifestDigest,
    packages: evidence.artifacts,
    nativeAot: evidence.nativeAot,
    verification: evidence.verification,
    packageEvidence: evidence.packageEvidence,
    publicApi: evidence.publicApi,
  });
  if (canonicalJson(recreated) !== canonicalJson(evidence)) {
    fail("Candidate evidence identity is not reproducible.");
  }

  return true;
}

async function listFiles(root) {
  const files = [];

  async function visit(directory, relativeDirectory = "") {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const relativePath = relativeDirectory
        ? join(relativeDirectory, entry.name)
        : entry.name;
      const absolutePath = join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(absolutePath, relativePath);
      } else {
        files.push(relativePath.replaceAll("\\", "/"));
      }
    }
  }

  await visit(root);
  return files.sort();
}

async function digestFile(path) {
  return sha256(await readFile(path));
}

async function digestDirectory(root, files) {
  const entries = [];
  for (const relativePath of [...files].sort()) {
    entries.push({
      path: relativePath.replaceAll("\\", "/"),
      digest: await digestFile(join(root, relativePath)),
    });
  }

  return {
    digest: sha256(canonicalJson(entries)),
    files: entries,
  };
}

async function readJson(path, label) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error instanceof SyntaxError) {
      fail(`Invalid JSON in ${label}: ${error.message}`);
    }
    throw error;
  }
}

async function verifyManifest(rootDir, generatedRoot, plan) {
  const manifest = await readJson(
    join(generatedRoot, "martix.platform.json"),
    "martix.platform.json",
  );
  const schema = await readJson(
    join(rootDir, "schemas", "martix.platform.schema.json"),
    "schemas/martix.platform.schema.json",
  );
  const result = z.fromJSONSchema(schema).safeParse(manifest);
  if (!result.success) {
    const issue = result.error.issues[0];
    fail(
      `Generated API manifest does not satisfy the schema at ${issue.path.join(
        ".",
      )}: ${issue.message}`,
    );
  }

  if (
    manifest.$schema !== API_MANIFEST_SCHEMA_URI ||
    manifest.kind !== "generated-solution" ||
    manifest.manifestSchemaVersion !== plan.manifestSchemaVersion ||
    manifest.platformVersion !== API_PLATFORM_VERSION ||
    manifest.platformContractVersion !== API_PLATFORM_VERSION ||
    manifest.repository?.name !== plan.applicationName ||
    manifest.preset !== "api" ||
    manifest.origin?.template !== "martix-app" ||
    manifest.providers.length !== 0 ||
    manifest.supportClaims.length !== 0 ||
    manifest.capabilities.length !== API_BASELINE_CAPABILITIES.length ||
    manifest.capabilities.some(
      (capability, index) =>
        capability.id !== API_BASELINE_CAPABILITIES[index] ||
        capability.state !== "selected",
    )
  ) {
    fail("Generated API manifest does not match the resolved API composition.");
  }

  return {
    manifest,
    digest: sha256(canonicalJson(manifest)),
  };
}

function expectedGeneratedFiles(applicationName) {
  return [
    "AGENTS.md",
    "CONTEXT.md",
    `${applicationName}.slnx`,
    "README.md",
    "martix.platform.json",
    `src/${applicationName}.Api/${applicationName}.Api.csproj`,
    `src/${applicationName}.Api/Program.cs`,
    `tests/${applicationName}.Tests/ApiContractTests.cs`,
    `tests/${applicationName}.Tests/${applicationName}.Tests.csproj`,
  ].sort();
}

async function verifyGeneratedOutput(generatedRoot, files, applicationName) {
  const expectedFiles = expectedGeneratedFiles(applicationName);
  const generatedFiles = [...files].sort();
  const actualFiles = await listFiles(generatedRoot);
  if (
    JSON.stringify(generatedFiles) !== JSON.stringify(expectedFiles) ||
    JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)
  ) {
    fail("Generated API output is not the expected clean composition.");
  }

  for (const relativePath of files) {
    if (relativePath === "martix.platform.json") {
      continue;
    }

    const contents = await readFile(join(generatedRoot, relativePath), "utf8");
    if (FORBIDDEN_GENERATED_RESIDUE.test(contents)) {
      fail(`Generated API output contains forbidden residue: ${relativePath}`);
    }
  }
}

async function verifyReproducibleGeneration(first, second) {
  if (JSON.stringify(first.files) !== JSON.stringify(second.files)) {
    fail("API generation produced different file inventories.");
  }

  for (const relativePath of first.files) {
    const firstContents = await readFile(
      join(first.outputDirectory, relativePath),
    );
    const secondContents = await readFile(
      join(second.outputDirectory, relativePath),
    );
    if (!firstContents.equals(secondContents)) {
      fail(`API generation is not reproducible for ${relativePath}.`);
    }
  }

  const firstDigest = await digestDirectory(first.outputDirectory, first.files);
  const secondDigest = await digestDirectory(
    second.outputDirectory,
    second.files,
  );
  if (firstDigest.digest !== secondDigest.digest) {
    fail("API generation digest is not reproducible.");
  }

  return firstDigest;
}

async function verifyGeneratedProjectShape(generatedRoot, applicationName) {
  const apiProject = join(
    generatedRoot,
    "src",
    `${applicationName}.Api`,
    `${applicationName}.Api.csproj`,
  );
  const testProject = join(
    generatedRoot,
    "tests",
    `${applicationName}.Tests`,
    `${applicationName}.Tests.csproj`,
  );
  const apiProjectContents = await readFile(apiProject, "utf8");
  const testProjectContents = await readFile(testProject, "utf8");
  for (const [label, contents] of [
    ["generated API project", apiProjectContents],
    ["generated TUnit project", testProjectContents],
  ]) {
    if (!/<TreatWarningsAsErrors>true<\/TreatWarningsAsErrors>/i.test(contents)) {
      fail(`${label} must treat warnings as errors.`);
    }
  }
  if (!/<OutputType>Exe<\/OutputType>/i.test(testProjectContents)) {
    fail("Generated TUnit project must be executable.");
  }
  if (
    /<ProjectReference\b[^>]*Include="[^"]*MartiX\.Platform/i.test(
      testProjectContents,
    )
  ) {
    fail("Generated consumer must not reference Platform source projects.");
  }

  return { apiProject, testProject };
}

async function verifyPublicApi(rootDir) {
  const records = [];
  for (const { path: relativePath, requiredSymbols } of PUBLIC_API_EVIDENCE) {
    const path = join(rootDir, relativePath);
    const contents = await readFile(path, "utf8");
    if (contents.trim().length === 0) {
      fail(`Public API evidence is empty: ${relativePath}`);
    }
    for (const symbol of requiredSymbols) {
      if (!contents.includes(symbol)) {
        fail(`Public API evidence is missing ${symbol}: ${relativePath}`);
      }
    }
    records.push({
      path: relativePath,
      digest: sha256(contents),
    });
  }

  return {
    digest: sha256(canonicalJson(records)),
    files: records,
  };
}

function packagePath(feed, definition) {
  return join(
    feed,
    `${definition.id}.${API_RELEASE_PACKAGE_VERSION}.nupkg`,
  );
}

function packageBuildProperties(buildRoot) {
  return [
    "-p:ContinuousIntegrationBuild=true",
    "-p:Deterministic=true",
    `-p:BaseOutputPath=${join(buildRoot, "bin")}${"/"}`,
    `-p:BaseIntermediateOutputPath=${join(buildRoot, "obj")}${"/"}`,
  ];
}

async function verifyPackage(rootDir, definition, archivePath) {
  const evidence = await readJson(
    join(rootDir, definition.evidencePath),
    definition.evidencePath,
  );
  if (
    evidence.packageId !== definition.id ||
    evidence.version !== API_RELEASE_PACKAGE_VERSION ||
    evidence.targetFramework !== definition.targetFramework ||
    !Array.isArray(evidence.dependencies) ||
    !Array.isArray(evidence.requiredEntries) ||
    !Array.isArray(evidence.runtimeAssemblyEntries)
  ) {
    fail(`Package evidence has an unexpected identity: ${definition.evidencePath}`);
  }

  const archive = await readFile(archivePath);
  const entries = listZipEntries(archive, definition.id);
  const entryNames = entries.map((entry) => entry.name);
  for (const requiredEntry of evidence.requiredEntries) {
    if (!entryNames.includes(requiredEntry)) {
      fail(`Package is missing required entry: ${requiredEntry}`);
    }
  }

  const runtimeEntries = entryNames.filter(
    (entry) => entry.startsWith("lib/") && entry.endsWith(".dll"),
  );
  if (
    runtimeEntries.length !== evidence.runtimeAssemblyEntries.length ||
    evidence.runtimeAssemblyEntries.some(
      (entry) => !runtimeEntries.includes(entry),
    )
  ) {
    fail(`Package contains an unexpected runtime asset: ${definition.id}`);
  }

  const expectedAnalyzerEntries = evidence.analyzerAssemblyEntries ?? [];
  const analyzerEntries = entryNames.filter(
    (entry) => entry.startsWith("analyzers/dotnet/cs/") && entry.endsWith(".dll"),
  );
  if (
    analyzerEntries.length !== expectedAnalyzerEntries.length ||
    expectedAnalyzerEntries.some(
      (entry) => !analyzerEntries.includes(entry),
    )
  ) {
    fail(`Package contains an unexpected analyzer asset: ${definition.id}`);
  }

  const nuspecEntry = entries.find((entry) => entry.name.endsWith(".nuspec"));
  if (!nuspecEntry) {
    fail(`Package is missing its nuspec: ${definition.id}`);
  }
  const nuspec = readZipEntry(archive, nuspecEntry, definition.id).toString(
    "utf8",
  );
  const dependencies = [
    ...new Set(
      [...nuspec.matchAll(/<dependency\s+id="([^"]+)"/g)].map(
        (match) => match[1],
      ),
    ),
  ].sort();
  if (JSON.stringify(dependencies) !== JSON.stringify([...evidence.dependencies].sort())) {
    fail(`Package dependencies differ from evidence: ${definition.id}`);
  }

  return {
    id: definition.id,
    version: API_RELEASE_PACKAGE_VERSION,
    targetFramework: definition.targetFramework,
    digest: await digestFile(archivePath),
    entries: entryNames,
  };
}

async function createNuGetConfig(directory, packageFeed) {
  const escapeXml = (value) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  const configPath = join(directory, "NuGet.Config");
  const feed = escapeXml(packageFeed);
  const publicPackageMappings = PUBLIC_PACKAGE_PATTERNS.map(
    (pattern) => `      <package pattern="${pattern}" />`,
  ).join("\n");
  await writeFile(
    configPath,
    `<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <packageSources>
    <clear />
    <add key="candidate" value="${feed}" />
    <add key="public" value="${API_RELEASE_PUBLIC_SOURCE}" />
  </packageSources>
  <packageSourceMapping>
    <packageSource key="candidate">
      <package pattern="MartiX.*" />
    </packageSource>
    <packageSource key="public">
${publicPackageMappings}
    </packageSource>
  </packageSourceMapping>
</configuration>
`,
    "utf8",
  );
  return configPath;
}

async function verifyPackageCacheIdentity(packageCache, packageResults) {
  for (const packageResult of packageResults) {
    const packageDirectory = join(
      packageCache,
      packageResult.id.toLowerCase(),
      packageResult.version.toLowerCase(),
    );
    const packageFiles = (await readdir(packageDirectory)).filter((file) =>
      file.endsWith(".nupkg"),
    );
    if (packageFiles.length !== 1) {
      fail(
        `Isolated restore did not produce one cached package for ${packageResult.id}.`,
      );
    }
    const cachedDigest = await digestFile(
      join(packageDirectory, packageFiles[0]),
    );
    if (cachedDigest !== packageResult.digest) {
      fail(
        `Package ${packageResult.id} was not consumed byte-for-byte from the isolated feed.`,
      );
    }
  }
}

async function getSourceCommit(repositoryRoot, sourceCommit) {
  const requestedCommit =
    sourceCommit ??
    process.env.GITHUB_SHA ??
    process.env.SOURCE_COMMIT;
  if (requestedCommit !== undefined) {
    const expectedCommit = requireSourceCommit(requestedCommit);
    const result = await execFileAsync(
      "git",
      ["rev-parse", "--verify", `${expectedCommit}^{commit}`],
      { cwd: repositoryRoot },
    );
    const resolvedCommit = requireSourceCommit(result.stdout.trim());
    if (resolvedCommit !== expectedCommit) {
      fail("sourceCommit does not resolve to the requested commit.");
    }
    return resolvedCommit;
  }

  const result = await execFileAsync("git", ["rev-parse", "HEAD"], {
    cwd: repositoryRoot,
  });
  return requireSourceCommit(result.stdout.trim());
}

function defaultNativeAotRid() {
  if (process.env.MARTIX_API_RID) {
    return process.env.MARTIX_API_RID;
  }
  if (process.platform === "win32") {
    return "win-x64";
  }
  if (process.arch === "arm64") {
    return "linux-arm64";
  }
  return "linux-x64";
}

function delay(milliseconds) {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, milliseconds);
  });
}

async function findAvailablePort() {
  const server = createServer();
  await new Promise((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolvePromise);
  });
  const address = server.address();
  const port = typeof address === "object" && address !== null
    ? address.port
    : undefined;
  await new Promise((resolvePromise, reject) => {
    server.close((error) => (error ? reject(error) : resolvePromise()));
  });
  if (typeof port !== "number") {
    fail("Could not allocate a local probe port.");
  }
  return port;
}

function startServer(command, argumentsList, cwd, environment, label) {
  const child = spawn(command, argumentsList, {
    cwd,
    env: environment,
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  let processError;
  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });
  child.once("error", (error) => {
    processError = error;
  });
  const close = new Promise((resolvePromise) => {
    child.once("close", (code, signal) => {
      resolvePromise({ code, signal });
    });
  });

  return {
    child,
    close,
    get output() {
      return `${stdout}\n${stderr}`;
    },
    get error() {
      return processError;
    },
    label,
  };
}

async function stopServer(server) {
  if (server.child.exitCode === null && server.child.signalCode === null) {
    const signalProcess = (signal) => {
      if (
        process.platform !== "win32" &&
        server.child.pid !== undefined
      ) {
        process.kill(-server.child.pid, signal);
      } else {
        server.child.kill(signal);
      }
    };
    try {
      signalProcess("SIGTERM");
    } catch (error) {
      if (error?.code !== "ESRCH") {
        throw error;
      }
    }

    await Promise.race([server.close, delay(5000)]);
    if (server.child.exitCode === null && server.child.signalCode === null) {
      try {
        signalProcess("SIGKILL");
      } catch (error) {
        if (error?.code !== "ESRCH") {
          throw error;
        }
      }
    }
  }
  await server.close;
}

async function probeEndpoint(server, url, path, validate) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (server.error) {
      fail(
        `${server.label} failed to start: ${server.error.message}\n${server.output}`,
      );
    }
    if (server.child.exitCode !== null || server.child.signalCode !== null) {
      fail(`${server.label} exited before ${path} was ready.\n${server.output}`);
    }

    try {
      const response = await fetch(`${url}${path}`);
      const body = await response.text();
      if (!response.ok) {
        fail(
          `${server.label} returned ${response.status} for ${path}: ${body}`,
        );
      }
      return validate(response, body);
    } catch (error) {
      if (!(error instanceof TypeError)) {
        throw error;
      }
    }
    await delay(200);
  }

  fail(`${server.label} did not serve ${path} before the probe timeout.\n${server.output}`);
}

function validateHealth(response, body) {
  let document;
  try {
    document = JSON.parse(body);
  } catch (error) {
    fail(`Health probe returned invalid JSON: ${error.message}`);
  }
  if (document.status !== "ok") {
    fail("Health probe did not return status=ok.");
  }
  return {
    status: response.status,
    digest: sha256(body),
  };
}

function validateOpenApi(response, body) {
  let document;
  try {
    document = JSON.parse(body);
  } catch (error) {
    fail(`OpenAPI probe returned invalid JSON: ${error.message}`);
  }
  if (
    typeof document.openapi !== "string" ||
    !document.openapi.startsWith("3.1.")
  ) {
    fail("OpenAPI probe did not return an OpenAPI 3.1 document.");
  }
  for (const requiredText of [
    "application/problem+json",
    '"traceId"',
    '"errors"',
  ]) {
    if (!body.includes(requiredText)) {
      fail(`OpenAPI document is missing ${requiredText}.`);
    }
  }
  return {
    status: response.status,
    openApi: document.openapi,
    digest: sha256(body),
  };
}

async function probeServer(server, port) {
  const url = `http://127.0.0.1:${port}`;
  try {
    const health = await probeEndpoint(server, url, "/health", validateHealth);
    const openApi = await probeEndpoint(
      server,
      url,
      "/openapi/v1.json",
      validateOpenApi,
    );
    return { health, openApi };
  } finally {
    await stopServer(server);
  }
}

async function runJitProbe({
  dotnet,
  generatedRoot,
  apiProject,
  environment,
}) {
  const port = await findAvailablePort();
  const server = startServer(
    dotnet,
    [
      "run",
      "--project",
      apiProject,
      "--configuration",
      "Release",
      "--no-restore",
      "--no-build",
      "--",
      "--urls",
      `http://127.0.0.1:${port}`,
    ],
    generatedRoot,
    environment,
    "JIT API host",
  );
  return probeServer(server, port);
}

async function findNativeAotExecutable(outputDirectory, projectName, rid) {
  const candidates = [
    join(
      outputDirectory,
      `${projectName}${rid.startsWith("win") ? ".exe" : ""}`,
    ),
    join(outputDirectory, `${projectName}.exe`),
    join(outputDirectory, projectName),
  ];
  for (const candidate of candidates) {
    try {
      const details = await stat(candidate);
      if (details.isFile()) {
        if (
          process.platform !== "win32" &&
          (details.mode & 0o111) === 0
        ) {
          fail(`Native AOT artifact is not executable: ${candidate}`);
        }
        return candidate;
      }
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    }
  }

  fail(`Native AOT publish did not produce ${projectName} for ${rid}.`);
}

function assertNoNativeAotDiagnostics(output) {
  const diagnostic = output.match(
    /(?:^|\r?\n)\s*(?:warning\s+[A-Z]+\d+|IL\d{4}|ILC\d+|AOT\d+)\b/im,
  );
  if (diagnostic) {
    fail(`Native AOT or trim diagnostics were emitted: ${diagnostic[0].trim()}`);
  }
}

async function runNativeAotProbe({
  dotnet,
  generatedRoot,
  apiProject,
  apiProjectName,
  environment,
  configPath,
  rid,
  outputDirectory,
  run,
}) {
  await run(
    [
      "restore",
      apiProject,
      "--runtime",
      rid,
      "--configfile",
      configPath,
      "--nologo",
    ],
    generatedRoot,
  );
  const publishResult = await run(
    [
      "publish",
      apiProject,
      "--configuration",
      "Release",
      "--runtime",
      rid,
      "--self-contained",
      "true",
      "--no-restore",
      "--output",
      outputDirectory,
      "--nologo",
      "-p:PublishAot=true",
      "-p:PublishTrimmed=true",
      "-p:EnableTrimAnalyzer=true",
      "-p:TreatWarningsAsErrors=true",
      "-warnaserror",
    ],
    generatedRoot,
  );
  assertNoNativeAotDiagnostics(
    `${publishResult.stdout ?? ""}\n${publishResult.stderr ?? ""}`,
  );

  const executable = await findNativeAotExecutable(
    outputDirectory,
    apiProjectName,
    rid,
  );
  const port = await findAvailablePort();
  const server = startServer(
    executable,
    ["--urls", `http://127.0.0.1:${port}`],
    dirname(executable),
    environment,
    "Native AOT API host",
  );
  const probes = await probeServer(server, port);

  return {
    rid,
    digest: await digestFile(executable),
    probes,
  };
}

async function packPackage({
  repositoryRoot,
  temporaryRoot,
  packageFeed,
  definition,
  restoreArguments,
  run,
}) {
  const buildRoot = join(temporaryRoot, "package-build", definition.id);
  const properties = packageBuildProperties(buildRoot);
  await run(
    [
      "restore",
      definition.projectPath,
      ...restoreArguments,
      "--nologo",
      ...properties,
    ],
    repositoryRoot,
  );
  await run(
    [
      "pack",
      definition.projectPath,
      "--configuration",
      "Release",
      "--output",
      packageFeed,
      "--no-restore",
      "--nologo",
      ...properties,
    ],
    repositoryRoot,
  );
}

async function packFirstPartyArtifacts({
  repositoryRoot,
  temporaryRoot,
  packageFeed,
  configPath,
  run,
}) {
  const [platformPackage, adapterPackage, analyzerPackage] =
    PACKAGE_DEFINITIONS;
  for (const definition of [platformPackage, analyzerPackage]) {
    await packPackage({
      repositoryRoot,
      temporaryRoot,
      packageFeed,
      definition,
      restoreArguments: ["--source", API_RELEASE_PUBLIC_SOURCE],
      run,
    });
  }

  await packPackage({
    repositoryRoot,
    temporaryRoot,
    packageFeed,
    definition: adapterPackage,
    restoreArguments: ["--configfile", configPath],
    run,
  });
  const feedFiles = (await readdir(packageFeed)).sort();
  const expectedFiles = PACKAGE_DEFINITIONS.map(
    (definition) => `${definition.id}.${API_RELEASE_PACKAGE_VERSION}.nupkg`,
  ).sort();
  if (JSON.stringify(feedFiles) !== JSON.stringify(expectedFiles)) {
    fail(
      `Isolated package feed is not clean: expected ${expectedFiles.join(
        ", ",
      )}; found ${feedFiles.join(", ")}.`,
    );
  }

  const packageEvidence = [];
  for (const definition of PACKAGE_DEFINITIONS) {
    packageEvidence.push(
      await verifyPackage(
        repositoryRoot,
        definition,
        packagePath(packageFeed, definition),
      ),
    );
  }

  return {
    packages: packageEvidence,
    feed: "isolated",
  };
}

async function writeImmutableEvidence(evidence, evidenceDirectory) {
  if (evidenceDirectory === null) {
    return null;
  }

  const directory = resolve(
    requireString(evidenceDirectory, "evidenceDirectory"),
  );
  await mkdir(directory, { recursive: true });
  const fileName = `${evidence.candidateId}.json`;
  const evidencePath = join(directory, fileName);
  const contents = `${JSON.stringify(evidence, null, 2)}\n`;
  try {
    await writeFile(evidencePath, contents, { encoding: "utf8", flag: "wx" });
  } catch (error) {
    if (error?.code !== "EEXIST") {
      throw error;
    }
    const existing = await readJson(evidencePath, evidencePath);
    verifyCandidateEvidence(existing);
    if (canonicalJson(existing) !== canonicalJson(evidence)) {
      fail(`Candidate evidence already exists with a different identity: ${evidencePath}`);
    }
  }

  const digestPath = `${evidencePath}.sha256`;
  const digestContents = `${evidence.evidenceDigest}  ${fileName}\n`;
  try {
    await writeFile(digestPath, digestContents, { encoding: "utf8", flag: "wx" });
  } catch (error) {
    if (error?.code !== "EEXIST") {
      throw error;
    }
    const existingDigest = (await readFile(digestPath, "utf8")).trim();
    if (existingDigest !== digestContents.trim()) {
      fail(`Candidate evidence digest sidecar is mutable: ${digestPath}`);
    }
  }

  return evidencePath;
}

export async function verifyApiRelease({
  rootDir = process.cwd(),
  applicationName = "MartiX.Verification",
  nativeAotRid = defaultNativeAotRid(),
  evidenceDirectory = join(resolve(rootDir), "artifacts", "api-release"),
  sourceCommit,
} = {}) {
  const repositoryRoot = resolve(rootDir);
  const dotnet = process.env.DOTNET ?? "dotnet";
  const rid = requireNativeAotRid(nativeAotRid);
  const sourceCommitValue = await getSourceCommit(
    repositoryRoot,
    sourceCommit,
  );
  const temporaryRoot = await mkdtemp(join(tmpdir(), "martix-api-release-"));
  const generatedRoot = join(temporaryRoot, "generated");
  const reproducibleRoot = join(temporaryRoot, "generated-repro");
  const packageFeed = join(temporaryRoot, "feed");
  const packageCache = join(temporaryRoot, "packages");
  const aotOutput = join(temporaryRoot, "native-aot");
  const environment = {
    ...process.env,
    DOTNET_CLI_HOME: join(temporaryRoot, "dotnet-home"),
    DOTNET_NOLOGO: "1",
    DOTNET_SKIP_FIRST_TIME_EXPERIENCE: "1",
    NUGET_PACKAGES: packageCache,
  };
  const run = (argumentsList, cwd = repositoryRoot) =>
    runDotnet(
      dotnet,
      argumentsList,
      cwd,
      "API release",
      environment,
    );

  let releaseDetails;
  try {
    await mkdir(packageFeed, { recursive: true });
    await mkdir(aotOutput, { recursive: true });
    const firstGeneration = await generateApiPreset({
      applicationName,
      outputDirectory: generatedRoot,
    });
    const secondGeneration = await generateApiPreset({
      applicationName,
      outputDirectory: reproducibleRoot,
    });
    const generatedDigest = await verifyReproducibleGeneration(
      firstGeneration,
      secondGeneration,
    );
    const manifestEvidence = await verifyManifest(
      repositoryRoot,
      generatedRoot,
      firstGeneration.plan,
    );
    await verifyGeneratedOutput(
      generatedRoot,
      firstGeneration.files,
      firstGeneration.plan.applicationName,
    );
    const projects = await verifyGeneratedProjectShape(
      generatedRoot,
      firstGeneration.plan.applicationName,
    );
    const publicApi = await verifyPublicApi(repositoryRoot);
    const configPath = await createNuGetConfig(temporaryRoot, packageFeed);
    const packageResults = await packFirstPartyArtifacts({
      repositoryRoot,
      temporaryRoot,
      packageFeed,
      configPath,
      run,
    });
    await run(
      [
        "restore",
        projects.testProject,
        "--configfile",
        configPath,
        "--nologo",
      ],
      generatedRoot,
    );
    await verifyPackageCacheIdentity(
      packageCache,
      packageResults.packages,
    );
    await run(
      [
        "build",
        projects.apiProject,
        "--configuration",
        "Release",
        "--no-restore",
        "--nologo",
        "-p:TreatWarningsAsErrors=true",
        "-warnaserror",
      ],
      generatedRoot,
    );
    await run(
      [
        "build",
        projects.testProject,
        "--configuration",
        "Release",
        "--no-restore",
        "--nologo",
        "-p:TreatWarningsAsErrors=true",
        "-warnaserror",
      ],
      generatedRoot,
    );
    await run(
      [
        "run",
        "--project",
        projects.testProject,
        "--configuration",
        "Release",
        "--no-restore",
        "--no-build",
        "--",
        "--disable-logo",
      ],
      generatedRoot,
    );
    const jitProbes = await runJitProbe({
      dotnet,
      generatedRoot,
      apiProject: projects.apiProject,
      environment,
    });
    const apiProjectName = `${firstGeneration.plan.applicationName}.Api`;
    const nativeAot = await runNativeAotProbe({
      dotnet,
      generatedRoot,
      apiProject: projects.apiProject,
      apiProjectName,
      environment,
      configPath,
      rid,
      outputDirectory: aotOutput,
      run,
    });
    const verification = {
      artifactsPackedOnce: true,
      isolatedFeed: packageResults.feed,
      packedArtifactCount: packageResults.packages.length,
      warningsAsErrors: true,
      jit: true,
      tunit: true,
      openApi: true,
      trim: true,
      aot: true,
      reproducible: true,
      cleanOutput: true,
      jitProbes,
      nativeAotProbes: nativeAot.probes,
    };
    releaseDetails = {
      sourceCommit: sourceCommitValue,
      platformVersion: API_PLATFORM_VERSION,
      applicationName: firstGeneration.plan.applicationName,
      generatedFiles: firstGeneration.files,
      generatedSolutionDigest: generatedDigest.digest,
      manifestDigest: manifestEvidence.digest,
      packages: packageResults.packages.map(
        ({ id, version, digest }) => ({ id, version, digest }),
      ),
      nativeAot: {
        rid: nativeAot.rid,
        digest: nativeAot.digest,
      },
      verification,
      packageEvidence: packageResults.packages.map(
        ({ id, targetFramework, entries }) => ({
          id,
          targetFramework,
          entries,
        }),
      ),
      publicApi: publicApi.files,
    };
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }

  const evidence = createCandidateEvidence(releaseDetails);
  verifyCandidateEvidence(evidence);
  const evidencePath = await writeImmutableEvidence(
    evidence,
    evidenceDirectory,
  );
  return {
    status: "passed",
    ...evidence,
    evidencePath,
    preset: "api",
    applicationName: evidence.generatedSolution.applicationName,
    files: releaseDetails.generatedFiles,
    packages: PACKAGE_DEFINITIONS.map((definition) => definition.id),
    consumer: `${evidence.generatedSolution.applicationName}.Tests`,
  };
}

export async function runApiReleaseCli(argumentsList = process.argv.slice(2)) {
  const options = {
    applicationName: "MartiX.Verification",
  };
  for (let index = 0; index < argumentsList.length; index++) {
    const argument = argumentsList[index];
    if (argument === "--help" || argument === "-h") {
      console.log(
        [
          "Usage: node eng/verify-api.mjs [--name <Application.Name>]",
          "       [--rid <NativeAotRid>] [--evidence <directory>]",
          "       [--source-commit <40-character-commit>]",
        ].join("\n"),
      );
      return;
    }
    const separator = argument.indexOf("=");
    const name = separator === -1 ? argument : argument.slice(0, separator);
    const inlineValue =
      separator === -1 ? undefined : argument.slice(separator + 1);
    const value = inlineValue ?? argumentsList[++index];
    if (value === undefined || value.startsWith("--")) {
      fail(`Option ${name} requires a value.`);
    }
    switch (name) {
      case "--name":
        options.applicationName = value;
        break;
      case "--rid":
        options.nativeAotRid = value;
        break;
      case "--evidence":
        options.evidenceDirectory = value;
        break;
      case "--source-commit":
        options.sourceCommit = value;
        break;
      default:
        fail(`Unknown option: ${name}.`);
    }
  }

  console.log(JSON.stringify(await verifyApiRelease(options), null, 2));
}

const invokedFile = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : null;

if (invokedFile === import.meta.url) {
  runApiReleaseCli().catch((error) => {
    if (error instanceof ApiReleaseVerificationError) {
      console.error(`API release verification failed: ${error.message}`);
    } else {
      console.error("API release verification failed due to an unexpected error.");
    }
    process.exitCode = 1;
  });
}
