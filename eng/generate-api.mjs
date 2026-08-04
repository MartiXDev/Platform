import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { runApiPresetCli } from "./api-preset.mjs";

export * from "./api-preset.mjs";

const invokedFile = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : null;

if (invokedFile === import.meta.url) {
  runApiPresetCli().catch((error) => {
    console.error(`API preset generation failed: ${error.message}`);
    process.exitCode = 1;
  });
}
