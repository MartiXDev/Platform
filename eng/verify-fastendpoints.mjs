import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  fail,
  listZipEntries,
  readZipEntry,
  runDotnet,
} from "./package-verification.mjs";

const KERNEL_PACKAGE_ID = "MartiX.Platform";
const KERNEL_PACKAGE_VERSION = "0.1.0-preview.1";
const ASPNETCORE_PACKAGE_ID = "MartiX.Platform.AspNetCore";
const ASPNETCORE_PACKAGE_VERSION = "0.1.0-preview.1";
const ADAPTER_PACKAGE_ID = "MartiX.Platform.AspNetCore.FastEndpoints";
const ADAPTER_PACKAGE_VERSION = "0.1.0-preview.1";
const KERNEL_PROJECT = "src/MartiX.Platform/MartiX.Platform.csproj";
const ASPNETCORE_PROJECT =
  "src/MartiX.Platform.AspNetCore/MartiX.Platform.AspNetCore.csproj";
const ADAPTER_PROJECT =
  "src/MartiX.Platform.AspNetCore.FastEndpoints/MartiX.Platform.AspNetCore.FastEndpoints.csproj";
const CONSUMER_PROJECT =
  "tests/Compatibility/FastEndpointsAdapterGeneratedSolution/FastEndpointsAdapterGeneratedSolution.csproj";
const PACKAGE_EVIDENCE =
  "tests/Compatibility/MartiX.Platform.AspNetCore.FastEndpoints.package-content.json";
const NUGET_SOURCE = "https://api.nuget.org/v3/index.json";

export const FASTENDPOINTS_COMBINATION_EVIDENCE = Object.freeze([
  Object.freeze({
    combination: "fastendpoints/jit/tunit/openapi",
    status: "supported",
  }),
  Object.freeze({
    combination: "fastendpoints/trim",
    status: "Invalid",
    reason: "FastEndpoints reflection discovery is JIT-only in this profile.",
  }),
  Object.freeze({
    combination: "fastendpoints/native-aot",
    status: "Invalid",
    reason: "Native AOT support is undeclared for the optional adapter.",
  }),
]);

async function verifyPackageContent(packagePath, rootDir) {
  const evidence = JSON.parse(
    await readFile(join(rootDir, PACKAGE_EVIDENCE), "utf8"),
  );
  if (
    evidence.packageId !== ADAPTER_PACKAGE_ID ||
    evidence.version !== ADAPTER_PACKAGE_VERSION ||
    evidence.targetFramework !== "net10.0"
  ) {
    fail("FastEndpoints package evidence has an unexpected identity.");
  }

  const archive = await readFile(packagePath);
  const entries = listZipEntries(archive, "FastEndpoints adapter");
  const entryNames = entries.map((entry) => entry.name);
  for (const requiredEntry of evidence.requiredEntries) {
    if (!entryNames.includes(requiredEntry)) {
      fail(
        `FastEndpoints adapter package is missing required entry: ${requiredEntry}`,
      );
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
    fail("FastEndpoints adapter package contains an unexpected runtime asset.");
  }

  const nuspecEntry = entries.find((entry) =>
    entry.name.endsWith(".nuspec"),
  );
  if (!nuspecEntry) {
    fail("FastEndpoints adapter package is missing its nuspec.");
  }
  const nuspec = readZipEntry(
    archive,
    nuspecEntry,
    "FastEndpoints adapter",
  ).toString("utf8");
  const dependencyIds = [
    ...nuspec.matchAll(/<dependency\s+id="([^"]+)"/g),
  ].map((match) => match[1]);
  const expectedDependencies = [...evidence.dependencies].sort();
  const actualDependencies = [...new Set(dependencyIds)].sort();
  if (
    JSON.stringify(actualDependencies) !== JSON.stringify(expectedDependencies)
  ) {
    fail(
      `FastEndpoints adapter dependencies differ from evidence: ${actualDependencies.join(
        ", ",
      )}`,
    );
  }

  return entryNames;
}

export async function verifyFastEndpoints({ rootDir = process.cwd() } = {}) {
  const repositoryRoot = resolve(rootDir);
  const dotnet = process.env.DOTNET ?? "dotnet";
  const temporaryRoot = await mkdtemp(
    join(tmpdir(), "martix-platform-fastendpoints-"),
  );
  const packageFeed = join(temporaryRoot, "feed");
  const packageCache = join(temporaryRoot, "packages");
  const adapterPackagePath = join(
    packageFeed,
    `${ADAPTER_PACKAGE_ID}.${ADAPTER_PACKAGE_VERSION}.nupkg`,
  );
  const environment = {
    ...process.env,
    NUGET_PACKAGES: packageCache,
  };
  const runCommand = (argumentsList) =>
    runDotnet(
      dotnet,
      argumentsList,
      repositoryRoot,
      "FastEndpoints adapter",
      environment,
    );

  try {
    await runCommand([
      "pack",
      KERNEL_PROJECT,
      "--configuration",
      "Release",
      "--output",
      packageFeed,
      "--nologo",
    ]);
    await runCommand([
      "restore",
      ASPNETCORE_PROJECT,
      "--source",
      packageFeed,
      "--source",
      NUGET_SOURCE,
      "--ignore-failed-sources",
      "--nologo",
    ]);
    await runCommand([
      "pack",
      ASPNETCORE_PROJECT,
      "--configuration",
      "Release",
      "--output",
      packageFeed,
      "--no-restore",
      "--nologo",
    ]);
    await runCommand([
      "restore",
      ADAPTER_PROJECT,
      "--source",
      packageFeed,
      "--source",
      NUGET_SOURCE,
      "--ignore-failed-sources",
      "--nologo",
    ]);
    await runCommand([
      "pack",
      ADAPTER_PROJECT,
      "--configuration",
      "Release",
      "--output",
      packageFeed,
      "--no-restore",
      "--nologo",
    ]);

    const packageEntries = await verifyPackageContent(
      adapterPackagePath,
      repositoryRoot,
    );

    await runCommand([
      "restore",
      CONSUMER_PROJECT,
      "--source",
      packageFeed,
      "--source",
      NUGET_SOURCE,
      "--ignore-failed-sources",
      "--nologo",
    ]);
    await runCommand([
      "run",
      "--project",
      CONSUMER_PROJECT,
      "--configuration",
      "Release",
      "--no-restore",
      "--",
      "--disable-logo",
    ]);

    return {
      status: "passed",
      packages: [
        `${KERNEL_PACKAGE_ID}.${KERNEL_PACKAGE_VERSION}`,
        `${ASPNETCORE_PACKAGE_ID}.${ASPNETCORE_PACKAGE_VERSION}`,
        `${ADAPTER_PACKAGE_ID}.${ADAPTER_PACKAGE_VERSION}`,
      ],
      consumer: "FastEndpointsAdapterGeneratedSolution",
      packageEntries,
      combinations: FASTENDPOINTS_COMBINATION_EVIDENCE,
    };
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

async function runCli() {
  console.log(JSON.stringify(await verifyFastEndpoints(), null, 2));
}

const invokedFile = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : null;

if (invokedFile === import.meta.url) {
  runCli().catch((error) => {
    console.error(`FastEndpoints verification failed: ${error.message}`);
    process.exitCode = 1;
  });
}
