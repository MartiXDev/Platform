import { execFile } from "node:child_process";
import { inflateRawSync } from "node:zlib";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export function fail(message) {
  throw new Error(message);
}

export async function runDotnet(
  dotnet,
  argumentsList,
  rootDir,
  verificationName,
  environment = process.env,
  failure = fail,
) {
  try {
    return await execFileAsync(dotnet, argumentsList, {
      cwd: rootDir,
      env: environment,
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (error) {
    const detail = error?.stderr?.trim() || error?.message || "unknown error";
    failure(
      `${verificationName} verification command failed: ${dotnet} ${argumentsList.join(
        " ",
      )}: ${detail}`,
    );
  }
}

export function listZipEntries(archive, packageName) {
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
    fail(`${packageName} package is not a valid ZIP archive.`);
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
      fail(`${packageName} package has an invalid central directory.`);
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

export function readZipEntry(archive, entry, packageName) {
  const localHeaderOffset = entry.localHeaderOffset;
  if (
    localHeaderOffset + 30 > archive.length ||
    archive.readUInt32LE(localHeaderOffset) !== 0x04034b50
  ) {
    fail(`${packageName} package has an invalid local entry: ${entry.name}`);
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
