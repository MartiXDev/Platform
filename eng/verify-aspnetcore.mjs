import { execFile } from "node:child_process";
import { inflateRawSync } from "node:zlib";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);
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

function fail(message) {
  throw new Error(message);
}

async function runDotnet(dotnet, argumentsList, rootDir) {
  try {
    return await execFileAsync(dotnet, argumentsList, {
      cwd: rootDir,
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (error) {
    const detail = error?.stderr?.trim() || error?.message || "unknown error";
    fail(
      `ASP.NET Core verification command failed: ${dotnet} ${argumentsList.join(
        " ",
      )}: ${detail}`,
    );
  }
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
    fail("ASP.NET Core package is not a valid ZIP archive.");
  }

  const entryCount = archive.readUInt16LE(endOffset + 10);
  const centralDirectoryOffset = archive.readUInt32LE(endOffset + 16);
  const entries = [];
  let offset = centralDirectoryOffset;

  for (let index = 0; index < entryCount; index++) {
    if (
      offset + 46 > archive.length ||
      archive.readUInt32LE(offset) !== centralDirectoryEntry
    ) {
      fail("ASP.NET Core package has an invalid central directory.");
    }

    const compressionMethod = archive.readUInt16LE(offset + 10);
    const compressedSize = archive.readUInt32LE(offset + 20);
    const nameLength = archive.readUInt16LE(offset + 28);
    const extraLength = archive.readUInt16LE(offset + 30);
    const commentLength = archive.readUInt16LE(offset + 32);
    const localHeaderOffset = archive.readUInt32LE(offset + 42);
    const nameStart = offset + 46;
    const nameEnd = nameStart + nameLength;
    entries.push({
      name: archive.toString("utf8", nameStart, nameEnd),
      compressionMethod,
      compressedSize,
      localHeaderOffset,
    });
    offset = nameEnd + extraLength + commentLength;
  }

  return entries;
}

function readZipEntry(archive, entry) {
  const localHeaderOffset = entry.localHeaderOffset;
  if (
    localHeaderOffset + 30 > archive.length ||
    archive.readUInt32LE(localHeaderOffset) !== 0x04034b50
  ) {
    fail(`ASP.NET Core package has an invalid local entry: ${entry.name}`);
  }

  const nameLength = archive.readUInt16LE(localHeaderOffset + 26);
  const extraLength = archive.readUInt16LE(localHeaderOffset + 28);
  const dataStart = localHeaderOffset + 30 + nameLength + extraLength;
  const dataEnd = dataStart + entry.compressedSize;
  const compressedData = archive.subarray(dataStart, dataEnd);

  if (entry.compressionMethod === 0) {
    return compressedData;
  }
  if (entry.compressionMethod === 8) {
    return inflateRawSync(compressedData);
  }

  fail(`Unsupported ZIP compression method for ${entry.name}.`);
}

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
  const entries = listZipEntries(archive);
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
  const nuspec = readZipEntry(archive, nuspecEntry).toString("utf8");
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

  try {
    await runDotnet(
      dotnet,
      [
        "pack",
        KERNEL_PROJECT,
        "--configuration",
        "Release",
        "--output",
        packageFeed,
        "--nologo",
      ],
      repositoryRoot,
    );
    await runDotnet(
      dotnet,
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
      repositoryRoot,
    );
    await runDotnet(
      dotnet,
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
      repositoryRoot,
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
        "--ignore-failed-sources",
        "--nologo",
      ],
      repositoryRoot,
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
