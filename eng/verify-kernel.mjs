import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);
const PACKAGE_VERSION = "0.1.0-preview.1";
const KERNEL_PACKAGE = Object.freeze({
  id: "MartiX.Platform",
  projectPath: "src/MartiX.Platform/MartiX.Platform.csproj",
  evidencePath: "tests/Compatibility/MartiX.Platform.package-content.json",
  targetFramework: "net10.0",
});
const ANALYZER_PACKAGE = Object.freeze({
  id: "MartiX.Platform.Analyzers",
  projectPath: "src/MartiX.Platform.Analyzers/MartiX.Platform.Analyzers.csproj",
  evidencePath:
    "tests/Compatibility/MartiX.Platform.Analyzers.package-content.json",
  targetFramework: "netstandard2.0",
});
const CONSUMER_PROJECT =
  "tests/Compatibility/KernelResultErrorGeneratedSolution/KernelResultErrorGeneratedSolution.csproj";
const INVALID_CONSUMER_PROJECT =
  "tests/Compatibility/KernelResultErrorAnalyzerInvalidGeneratedSolution/KernelResultErrorAnalyzerInvalidGeneratedSolution.csproj";
const NUGET_SOURCE = "https://api.nuget.org/v3/index.json";

function fail(message) {
  throw new Error(message);
}

async function executeDotnet(
  dotnet,
  argumentsList,
  rootDir,
  environment = process.env,
) {
  return execFileAsync(dotnet, argumentsList, {
    cwd: rootDir,
    env: environment,
    maxBuffer: 10 * 1024 * 1024,
  });
}

async function runDotnet(
  dotnet,
  argumentsList,
  rootDir,
  environment = process.env,
) {
  try {
    return await executeDotnet(dotnet, argumentsList, rootDir, environment);
  } catch (error) {
    const detail = [error?.stdout, error?.stderr]
      .filter((output) => typeof output === "string" && output.trim().length > 0)
      .join("\n")
      .trim() || error?.message || "unknown error";
    fail(`Kernel verification command failed: ${dotnet} ${argumentsList.join(" ")}: ${detail}`);
  }
}

async function runDotnetExpectFailure(
  dotnet,
  argumentsList,
  rootDir,
  environment = process.env,
) {
  try {
    await executeDotnet(dotnet, argumentsList, rootDir, environment);
  } catch (error) {
    if (error?.code === "ENOENT" || typeof error?.stderr !== "string") {
      throw error;
    }

    return `${error.stdout ?? ""}\n${error.stderr}`;
  }

  fail(
    `Expected command to fail: ${dotnet} ${argumentsList.join(" ")}`,
  );
}

function packageFilePath(packageFeed, packageDefinition) {
  return join(
    packageFeed,
    `${packageDefinition.id}.${PACKAGE_VERSION}.nupkg`,
  );
}

function listZipEntries(archive) {
  const endOfCentralDirectory = 0x06054b50;
  const centralDirectoryEntry = 0x02014b50;
  const minimumEndRecordSize = 22;
  const endOffset = archive.lastIndexOf(
    Buffer.from([
      endOfCentralDirectory & 0xff,
      (endOfCentralDirectory >> 8) & 0xff,
      (endOfCentralDirectory >> 16) & 0xff,
      (endOfCentralDirectory >> 24) & 0xff,
    ]),
  );

  if (endOffset < 0 || archive.length - endOffset < minimumEndRecordSize) {
    fail("Kernel package is not a valid ZIP archive.");
  }

  const entryCount = archive.readUInt16LE(endOffset + 10);
  const centralDirectoryOffset = archive.readUInt32LE(endOffset + 16);
  const entries = [];
  let offset = centralDirectoryOffset;

  for (let index = 0; index < entryCount; index++) {
    if (
      offset + 46 > archive.length
      || archive.readUInt32LE(offset) !== centralDirectoryEntry
    ) {
      fail("Kernel package has an invalid central directory.");
    }

    const nameLength = archive.readUInt16LE(offset + 28);
    const extraLength = archive.readUInt16LE(offset + 30);
    const commentLength = archive.readUInt16LE(offset + 32);
    const nameStart = offset + 46;
    const nameEnd = nameStart + nameLength;
    entries.push(archive.toString("utf8", nameStart, nameEnd));
    offset = nameEnd + extraLength + commentLength;
  }

  return entries;
}

async function verifyPackageContent(packagePath, packageDefinition, rootDir) {
  const evidence = JSON.parse(
    await readFile(join(rootDir, packageDefinition.evidencePath), "utf8"),
  );
  const expectedRuntimeEntries = evidence.runtimeAssemblyEntries;
  const expectedAnalyzerEntries = evidence.analyzerAssemblyEntries ?? [];
  if (
    evidence.packageId !== packageDefinition.id
    || evidence.version !== PACKAGE_VERSION
    || evidence.targetFramework !== packageDefinition.targetFramework
    || !Array.isArray(evidence.dependencies)
    || evidence.dependencies.length !== 0
    || !Array.isArray(evidence.requiredEntries)
    || !Array.isArray(expectedRuntimeEntries)
    || !Array.isArray(expectedAnalyzerEntries)
  ) {
    fail(
      `Package evidence does not describe the expected package: ${packageDefinition.evidencePath}`,
    );
  }

  const entries = listZipEntries(await readFile(packagePath));
  for (const requiredEntry of evidence.requiredEntries) {
    if (!entries.includes(requiredEntry)) {
      fail(`Package is missing required entry: ${requiredEntry}`);
    }
  }

  const runtimeEntries = entries.filter(
    (entry) => entry.startsWith("lib/") && entry.endsWith(".dll"),
  );
  if (
    runtimeEntries.length !== expectedRuntimeEntries.length
    || expectedRuntimeEntries.some(
      (entry) => !runtimeEntries.includes(entry),
    )
  ) {
    fail(
      `Package contains an unexpected runtime asset: ${packageDefinition.evidencePath}`,
    );
  }

  const analyzerEntries = entries.filter(
    (entry) => entry.startsWith("analyzers/dotnet/cs/") && entry.endsWith(".dll"),
  );
  if (
    analyzerEntries.length !== expectedAnalyzerEntries.length
    || expectedAnalyzerEntries.some(
      (entry) => !analyzerEntries.includes(entry),
    )
  ) {
    fail(
      `Package contains an unexpected analyzer asset: ${packageDefinition.evidencePath}`,
    );
  }

  return entries;
}

export async function verifyKernel({ rootDir = process.cwd() } = {}) {
  const repositoryRoot = resolve(rootDir);
  const dotnet = process.env.DOTNET ?? "dotnet";
  const packageName = `${KERNEL_PACKAGE.id}.${PACKAGE_VERSION}`;
  const temporaryRoot = await mkdtemp(join(tmpdir(), "martix-platform-kernel-"));
  const packageFeed = join(temporaryRoot, "feed");
  const packageCache = join(temporaryRoot, "packages");
  const packagePath = packageFilePath(packageFeed, KERNEL_PACKAGE);
  const analyzerPackagePath = packageFilePath(packageFeed, ANALYZER_PACKAGE);
  const dotnetEnvironment = {
    ...process.env,
    NUGET_PACKAGES: packageCache,
  };

  try {
    await runDotnet(
      dotnet,
      [
        "pack",
        KERNEL_PACKAGE.projectPath,
        "--configuration",
        "Release",
        "--output",
        packageFeed,
        "--nologo",
      ],
      repositoryRoot,
      dotnetEnvironment,
    );
    await runDotnet(
      dotnet,
      [
        "pack",
        ANALYZER_PACKAGE.projectPath,
        "--configuration",
        "Release",
        "--output",
        packageFeed,
        "--nologo",
      ],
      repositoryRoot,
      dotnetEnvironment,
    );
    await runDotnet(
      dotnet,
      [
        "restore",
        CONSUMER_PROJECT,
        "--source",
        packageFeed,
        "--source",
        NUGET_SOURCE,
        "--nologo",
      ],
      repositoryRoot,
      dotnetEnvironment,
    );
    await runDotnet(
      dotnet,
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
      repositoryRoot,
      dotnetEnvironment,
    );
    await runDotnet(
      dotnet,
      [
        "restore",
        INVALID_CONSUMER_PROJECT,
        "--source",
        packageFeed,
        "--nologo",
      ],
      repositoryRoot,
      dotnetEnvironment,
    );
    const invalidBuildOutput = await runDotnetExpectFailure(
      dotnet,
      [
        "build",
        INVALID_CONSUMER_PROJECT,
        "--configuration",
        "Release",
        "--no-restore",
        "--nologo",
      ],
      repositoryRoot,
      dotnetEnvironment,
    );
    for (const diagnosticId of ["MXP001", "MXP002"]) {
      if (!new RegExp(`\\b${diagnosticId}\\b`).test(invalidBuildOutput)) {
        fail(`Analyzer verification did not produce ${diagnosticId}.`);
      }
    }

    const packageEntries = await verifyPackageContent(
      packagePath,
      KERNEL_PACKAGE,
      repositoryRoot,
    );
    const analyzerPackageEntries = await verifyPackageContent(
      analyzerPackagePath,
      ANALYZER_PACKAGE,
      repositoryRoot,
    );
    return {
      status: "passed",
      package: packageName,
      consumer: "KernelResultErrorGeneratedSolution",
      packageEntries,
      analyzerPackage: `${ANALYZER_PACKAGE.id}.${PACKAGE_VERSION}`,
      analyzerPackageEntries,
      invalidConsumer: "KernelResultErrorAnalyzerInvalidGeneratedSolution",
      diagnostics: ["MXP001", "MXP002"],
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
