import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);
const PACKAGE_ID = "MartiX.Platform";
const PACKAGE_VERSION = "0.1.0-preview.1";
const PACKAGE_PROJECT = "src/MartiX.Platform/MartiX.Platform.csproj";
const CONSUMER_PROJECT =
  "tests/Compatibility/KernelResultErrorGeneratedSolution/KernelResultErrorGeneratedSolution.csproj";
const PACKAGE_EVIDENCE = "tests/Compatibility/MartiX.Platform.package-content.json";

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
    fail(`Kernel verification command failed: ${dotnet} ${argumentsList.join(" ")}: ${detail}`);
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

  const entries = listZipEntries(await readFile(packagePath));
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
  const temporaryRoot = await mkdtemp(join(tmpdir(), "martix-platform-kernel-"));
  const packageFeed = join(temporaryRoot, "feed");
  const packagePath = join(
    packageFeed,
    `${PACKAGE_ID}.${PACKAGE_VERSION}.nupkg`,
  );

  try {
    await runDotnet(
      process.env.DOTNET ?? "dotnet",
      [
        "pack",
        PACKAGE_PROJECT,
        "--configuration",
        "Release",
        "--output",
        packageFeed,
        "--nologo",
      ],
      repositoryRoot,
    );
    await runDotnet(
      process.env.DOTNET ?? "dotnet",
      [
        "restore",
        CONSUMER_PROJECT,
        "--source",
        packageFeed,
        "--ignore-failed-sources",
        "--nologo",
      ],
      repositoryRoot,
    );
    await runDotnet(
      process.env.DOTNET ?? "dotnet",
      [
        "run",
        "--project",
        CONSUMER_PROJECT,
        "--configuration",
        "Release",
        "--no-restore",
        "--nologo",
      ],
      repositoryRoot,
    );

    const packageEntries = await verifyPackageContent(packagePath, repositoryRoot);
    return {
      status: "passed",
      package: `${PACKAGE_ID}.${PACKAGE_VERSION}`,
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
