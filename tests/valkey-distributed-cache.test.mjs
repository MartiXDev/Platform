import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { validateValkeyDistributedCacheFixture } from "../eng/verify.mjs";

const repositoryRoot = join(import.meta.dirname, "..");
const fixtureRoot = join(
  repositoryRoot,
  "tests",
  "fixtures",
  "ValkeyDistributedCacheGeneratedSolution",
);

test("the named Valkey fixture proves direct cache composition and failure isolation", async () => {
  const manifest = JSON.parse(
    await readFile(join(fixtureRoot, "martix.platform.json"), "utf8"),
  );
  const profile = JSON.parse(
    await readFile(join(fixtureRoot, "valkey-conformance.json"), "utf8"),
  );

  const result = await validateValkeyDistributedCacheFixture({
    rootDir: repositoryRoot,
    manifest,
    profile,
  });

  assert.equal(result.status, "passed");
  assert.equal(result.provider, "distributed-cache:valkey");
  assert.deepEqual(result.semantics, [
    "cancellation",
    "expiry",
    "failure-isolation",
    "key-isolation",
    "multi-instance",
    "reconnect",
    "serialization",
  ]);
});
