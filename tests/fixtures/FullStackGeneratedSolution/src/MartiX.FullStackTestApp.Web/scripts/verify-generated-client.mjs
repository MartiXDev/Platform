import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const [contract, source] = await Promise.all([
  readFile(new URL("../../../contracts/openapi-v1.json", import.meta.url), "utf8"),
  readFile(new URL("../Platform/Api/generated.ts", import.meta.url), "utf8"),
]);
if (!source.includes("openapi-typescript 7.13.0")) {
  throw new Error("Generated client drifted from the pinned OpenAPI generator.");
}
const expectedDigest = source.match(/Contract SHA-256: ([a-f0-9]{64})\./)?.[1];
const actualDigest = createHash("sha256")
  .update(contract.replaceAll(/\r\n?/g, "\n"))
  .digest("hex");
if (expectedDigest === undefined || expectedDigest !== actualDigest) {
  throw new Error("Generated client drifted from contracts/openapi-v1.json.");
}
