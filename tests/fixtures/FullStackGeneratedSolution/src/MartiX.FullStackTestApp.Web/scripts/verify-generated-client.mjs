import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../Platform/Api/generated.ts", import.meta.url), "utf8");
if (!source.includes("openapi-typescript 7.13.0")) {
  throw new Error("Generated client drifted from the pinned OpenAPI generator.");
}
