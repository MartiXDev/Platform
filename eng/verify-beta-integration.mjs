import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import {
  BetaIntegrationError,
  verifyBetaIntegrationFixture,
} from "./beta-integration.mjs";

async function runCli() {
  const result = await verifyBetaIntegrationFixture();
  console.log(JSON.stringify(result, null, 2));
}

const invokedFile = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : null;

if (invokedFile === import.meta.url) {
  runCli().catch((error) => {
    if (error instanceof BetaIntegrationError) {
      console.error(`Verification failed: ${error.message}`);
    } else {
      console.error("Verification failed due to an unexpected internal error.");
    }
    process.exitCode = 1;
  });
}
