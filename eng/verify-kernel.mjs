import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  fail,
  listZipEntries,
  runDotnet,
} from "./package-verification.mjs";

const PACKAGE_ID = "MartiX.Platform";
const PACKAGE_VERSION = "0.1.0-preview.1";
const PACKAGE_PROJECT = "src/MartiX.Platform/MartiX.Platform.csproj";
const CONSUMER_PROJECT =
  "tests/Compatibility/KernelResultErrorGeneratedSolution/KernelResultErrorGeneratedSolution.csproj";
const PACKAGE_EVIDENCE = "tests/Compatibility/MartiX.Platform.package-content.json";

async function verifyPackageContent(packagePath, rootDir) {
  const evidence = JSON.parse(
    await readFile(join(rootDir, PACKAGE_EVIDENCE), "utf8"),
  );
  if (
    evidence.packageId !== PACKAGE_ID
    || evidence.version !== PACKAGE_VERSION
    || evidence.targetFramework !== "net10.0"
    || evidence.dependencies.length !== 0
  ) {
    fail("Kernel package evidence does not describe the expected package.");
  }

  const entries = listZipEntries(
    await readFile(packagePath),
    "Kernel",
  ).map((entry) => entry.name);
  for (const requiredEntry of evidence.requiredEntries) {
    if (!entries.includes(requiredEntry)) {
      fail(`Kernel package is missing required entry: ${requiredEntry}`);
    }
  }

  const runtimeEntries = entries.filter(
    (entry) => entry.startsWith("lib/") && entry.endsWith(".dll"),
  );
  if (
    runtimeEntries.length !== evidence.runtimeAssemblyEntries.length
    || evidence.runtimeAssemblyEntries.some(
      (entry) => !runtimeEntries.includes(entry),
    )
  ) {
    fail("Kernel package contains an unexpected runtime asset.");
  }

  return entries;
}

export async function verifyKernel({ rootDir = process.cwd() } = {}) {
  const repositoryRoot = resolve(rootDir);
  const dotnet = process.env.DOTNET ?? "dotnet";
  const packageName = `${PACKAGE_ID}.${PACKAGE_VERSION}`;
  const temporaryRoot = await mkdtemp(join(tmpdir(), "martix-platform-kernel-"));
  const packageFeed = join(temporaryRoot, "feed");
  const packagePath = join(packageFeed, `${packageName}.nupkg`);
  const runCommand = (argumentsList) =>
    runDotnet(dotnet, argumentsList, repositoryRoot, "Kernel");

  try {
    await runCommand(
      [
        "pack",
        PACKAGE_PROJECT,
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
        CONSUMER_PROJECT,
        "--source",
        packageFeed,
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

    const packageEntries = await verifyPackageContent(packagePath, repositoryRoot);
    return {
      status: "passed",
      package: packageName,
      consumer: "KernelResultErrorGeneratedSolution",
      packageEntries,
    };
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

async function runCli() {
  console.log(JSON.stringify(await verifyKernel(), null, 2));
}

const invokedFile = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : null;

if (invokedFile === import.meta.url) {
  runCli().catch((error) => {
    console.error(`Kernel verification failed: ${error.message}`);
    process.exitCode = 1;
  });
}
