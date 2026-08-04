import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  ApiReleaseVerificationError,
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
    if (error instanceof ApiReleaseVerificationError) {
      console.error(`API release verification failed: ${error.message}`);
    } else {
      console.error("API release verification failed due to an unexpected error.");
    }
    process.exitCode = 1;
  });
}
