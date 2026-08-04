import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import {
  API_BASELINE_CAPABILITIES,
  API_MANIFEST_SCHEMA_URI,
  API_PLATFORM_VERSION,
  generateApiPreset,
} from "./api-preset.mjs";
import { fail, runDotnet } from "./package-verification.mjs";

const PACKAGE_PROJECTS = [
  "src/MartiX.Platform/MartiX.Platform.csproj",
  "src/MartiX.Platform.Analyzers/MartiX.Platform.Analyzers.csproj",
];
const ADAPTER_PROJECT = "src/MartiX.Platform.AspNetCore/MartiX.Platform.AspNetCore.csproj";
const NUGET_SOURCE = "https://api.nuget.org/v3/index.json";
const FORBIDDEN_GENERATED_RESIDUE =
  /WeatherForecast|DbContext|EntityFramework|Npgsql|SqlServer|Migrations|Sample|Demo/;

function parseJson(contents, path) {
  try {
    return JSON.parse(contents);
  } catch (error) {
    fail(`Generated API verification found invalid JSON in ${path}: ${error.message}`);
  }
}

async function verifyManifest(rootDir, generatedRoot) {
  const manifestPath = join(generatedRoot, "martix.platform.json");
  const manifest = parseJson(
    await readFile(manifestPath, "utf8"),
    "martix.platform.json",
  );
  const schema = parseJson(
    await readFile(
      join(rootDir, "schemas", "martix.platform.schema.json"),
      "utf8",
    ),
    "schemas/martix.platform.schema.json",
  );
  const result = z.fromJSONSchema(schema).safeParse(manifest);
  if (!result.success) {
    const issue = result.error.issues[0];
    fail(
      `Generated API manifest does not satisfy the schema at ${issue.path.join(".")}: ${issue.message}`,
    );
  }

  if (
    manifest.$schema !== API_MANIFEST_SCHEMA_URI ||
    manifest.kind !== "generated-solution" ||
    manifest.platformVersion !== API_PLATFORM_VERSION ||
    manifest.platformContractVersion !== API_PLATFORM_VERSION ||
    manifest.preset !== "api" ||
    manifest.origin.template !== "martix-app" ||
    manifest.providers.length !== 0 ||
    manifest.capabilities.length !== API_BASELINE_CAPABILITIES.length ||
    manifest.capabilities.some(
      (capability, index) =>
        capability.id !== API_BASELINE_CAPABILITIES[index] ||
        capability.state !== "selected",
    )
  ) {
    fail("Generated API manifest does not match the resolved API composition.");
  }

  return manifest;
}

async function verifyGeneratedAbsence(generatedRoot, files) {
  for (const relativePath of files) {
    if (relativePath === "martix.platform.json") {
      continue;
    }

    const contents = await readFile(join(generatedRoot, relativePath), "utf8");
    if (FORBIDDEN_GENERATED_RESIDUE.test(contents)) {
      fail(`Generated API output contains forbidden residue: ${relativePath}`);
    }
  }

  if (
    files.some((file) =>
      /(?:Migrator|Module|Web|Persistence|DbContext|Migrations)/i.test(file),
    )
  ) {
    fail("Generated API output contains an unselected project or directory.");
  }
}

export async function verifyApiPreset({
  rootDir = process.cwd(),
  applicationName = "MartiX.Verification",
} = {}) {
  const repositoryRoot = resolve(rootDir);
  const dotnet = process.env.DOTNET ?? "dotnet";
  const temporaryRoot = await mkdtemp(join(tmpdir(), "martix-api-preset-"));
  const generatedRoot = join(temporaryRoot, "generated");
  const packageFeed = join(temporaryRoot, "feed");
  const packageCache = join(temporaryRoot, "packages");
  const environment = {
    ...process.env,
    NUGET_PACKAGES: packageCache,
  };
  const generatedTestProject = join(
    generatedRoot,
    "tests",
    `${applicationName}.Tests`,
    `${applicationName}.Tests.csproj`,
  );
  const run = (argumentsList, cwd = repositoryRoot) =>
    runDotnet(
      dotnet,
      argumentsList,
      cwd,
      "API preset",
      environment,
    );

  try {
    const generation = await generateApiPreset({
      applicationName,
      outputDirectory: generatedRoot,
    });
    await verifyManifest(repositoryRoot, generatedRoot);
    await verifyGeneratedAbsence(generatedRoot, generation.files);

    for (const project of PACKAGE_PROJECTS) {
      await run([
        "pack",
        project,
        "--configuration",
        "Release",
        "--output",
        packageFeed,
        "--nologo",
      ]);
    }
    await run([
      "restore",
      ADAPTER_PROJECT,
      "--source",
      packageFeed,
      "--source",
      NUGET_SOURCE,
      "--nologo",
    ]);
    await run([
      "pack",
      ADAPTER_PROJECT,
      "--configuration",
      "Release",
      "--output",
      packageFeed,
      "--no-restore",
      "--nologo",
    ]);
    await run(
      [
        "restore",
        generatedTestProject,
        "--source",
        packageFeed,
        "--source",
        NUGET_SOURCE,
        "--nologo",
      ],
      generatedRoot,
    );
    await run(
      [
        "run",
        "--project",
        generatedTestProject,
        "--configuration",
        "Release",
        "--no-restore",
        "--",
        "--disable-logo",
      ],
      generatedRoot,
    );

    return {
      status: "passed",
      preset: "api",
      applicationName,
      files: generation.files,
      packages: [
        "MartiX.Platform",
        "MartiX.Platform.AspNetCore",
        "MartiX.Platform.Analyzers",
      ],
      consumer: `${applicationName}.Tests`,
    };
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

async function runCli() {
  console.log(JSON.stringify(await verifyApiPreset(), null, 2));
}

const invokedFile = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : null;

if (invokedFile === import.meta.url) {
  runCli().catch((error) => {
    console.error(`API preset verification failed: ${error.message}`);
    process.exitCode = 1;
  });
}
