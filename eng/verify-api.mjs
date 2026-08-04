import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  runApiReleaseCli,
  verifyApiRelease,
} from "./api-release.mjs";

export * from "./api-release.mjs";
export { verifyApiRelease as verifyApiPreset };

const invokedFile = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : null;

if (invokedFile === import.meta.url) {
  runApiReleaseCli().catch((error) => {
    console.error(`API release verification failed: ${error.message}`);
    process.exitCode = 1;
  });
}
