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
const ADAPTER_PACKAGE_ID = "MartiX.Platform.AspNetCore";
const ADAPTER_PACKAGE_VERSION = "0.1.0-preview.1";
const KERNEL_PROJECT = "src/MartiX.Platform/MartiX.Platform.csproj";
const ADAPTER_PROJECT = "src/MartiX.Platform.AspNetCore/MartiX.Platform.AspNetCore.csproj";
const CONSUMER_PROJECT =
  "tests/Compatibility/AspNetCoreFailureAdapterGeneratedSolution/AspNetCoreFailureAdapterGeneratedSolution.csproj";
const PACKAGE_EVIDENCE =
  "tests/Compatibility/MartiX.Platform.AspNetCore.package-content.json";
const NUGET_SOURCE = "https://api.nuget.org/v3/index.json";

async function verifyPackageContent(packagePath, rootDir) {
  const evidence = JSON.parse(
    await readFile(join(rootDir, PACKAGE_EVIDENCE), "utf8"),
  );
  if (
    evidence.packageId !== ADAPTER_PACKAGE_ID ||
    evidence.version !== ADAPTER_PACKAGE_VERSION ||
    evidence.targetFramework !== "net10.0"
  ) {
    fail("ASP.NET Core package evidence has an unexpected identity.");
  }

  const archive = await readFile(packagePath);
  const entries = listZipEntries(archive, "ASP.NET Core");
  const entryNames = entries.map((entry) => entry.name);
  for (const requiredEntry of evidence.requiredEntries) {
    if (!entryNames.includes(requiredEntry)) {
      fail(`ASP.NET Core package is missing required entry: ${requiredEntry}`);
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
    fail("ASP.NET Core package contains an unexpected runtime asset.");
  }

  const nuspecEntry = entries.find((entry) =>
    entry.name.endsWith(".nuspec"),
  );
  if (!nuspecEntry) {
    fail("ASP.NET Core package is missing its nuspec.");
  }
  const nuspec = readZipEntry(
    archive,
    nuspecEntry,
    "ASP.NET Core",
  ).toString("utf8");
  const dependencyIds = [
    ...nuspec.matchAll(/<dependency\s+id="([^"]+)"/g),
  ].map((match) => match[1]);
  const expectedDependencies = [...evidence.dependencies].sort();
  const actualDependencies = [...new Set(dependencyIds)].sort();
  if (
    JSON.stringify(actualDependencies) !==
    JSON.stringify(expectedDependencies)
  ) {
    fail(
      `ASP.NET Core package dependencies differ from evidence: ${actualDependencies.join(
        ", ",
      )}`,
    );
  }

  return entryNames;
}

export async function verifyAspNetCore({ rootDir = process.cwd() } = {}) {
  const repositoryRoot = resolve(rootDir);
  const dotnet = process.env.DOTNET ?? "dotnet";
  const temporaryRoot = await mkdtemp(
    join(tmpdir(), "martix-platform-aspnetcore-"),
  );
  const packageFeed = join(temporaryRoot, "feed");
  const adapterPackagePath = join(
    packageFeed,
    `${ADAPTER_PACKAGE_ID}.${ADAPTER_PACKAGE_VERSION}.nupkg`,
  );
  const runCommand = (argumentsList) =>
    runDotnet(dotnet, argumentsList, repositoryRoot, "ASP.NET Core");

  try {
    await runCommand(
      [
        "pack",
        KERNEL_PROJECT,
        "--configuration",
        "Release",
        "--output",
        packageFeed,
        "--nologo",
      ],
    );
    await runCommand(
      [
        "restore",
        ADAPTER_PROJECT,
        "--source",
        packageFeed,
        "--source",
        NUGET_SOURCE,
        "--ignore-failed-sources",
        "--nologo",
      ],
    );
    await runCommand(
      [
        "pack",
        ADAPTER_PROJECT,
        "--configuration",
        "Release",
        "--output",
        packageFeed,
        "--no-restore",
        "--nologo",
      ],
    );
    await runCommand(
      [
        "restore",
        CONSUMER_PROJECT,
        "--source",
        packageFeed,
        "--source",
        NUGET_SOURCE,
        "--ignore-failed-sources",
        "--nologo",
      ],
    );
    await runCommand(
      [
        "run",
        "--project",
        CONSUMER_PROJECT,
        "--configuration",
        "Release",
        "--no-restore",
        "--",
        "--disable-logo",
      ],
    );

    const packageEntries = await verifyPackageContent(
      adapterPackagePath,
      repositoryRoot,
    );
    return {
      status: "passed",
      packages: [
        `${KERNEL_PACKAGE_ID}.${KERNEL_PACKAGE_VERSION}`,
        `${ADAPTER_PACKAGE_ID}.${ADAPTER_PACKAGE_VERSION}`,
      ],
      consumer: "AspNetCoreFailureAdapterGeneratedSolution",
      packageEntries,
    };
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

async function runCli() {
  console.log(JSON.stringify(await verifyAspNetCore(), null, 2));
}

const invokedFile = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : null;

if (invokedFile === import.meta.url) {
  runCli().catch((error) => {
    console.error(`ASP.NET Core verification failed: ${error.message}`);
    process.exitCode = 1;
  });
}
