import { readdir } from "node:fs/promises";
import { resolve } from "node:path";

export async function listFiles(rootDir, { ignoredDirectories = [] } = {}) {
  const files = [];
  const ignoredDirectoryNames = new Set(ignoredDirectories);

  async function visit(directory, relativeDirectory = "") {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const relativePath = relativeDirectory
        ? `${relativeDirectory}/${entry.name}`
        : entry.name;
      const absolutePath = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        if (ignoredDirectoryNames.has(entry.name)) {
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
