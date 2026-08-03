import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { verifyBootstrap } from "../eng/verify.mjs";

const repositoryRoot = join(import.meta.dirname, "..");

test("fast cadence verifies the repository bootstrap contract", async () => {
  const result = await verifyBootstrap({
    cadence: "fast",
    rootDir: repositoryRoot,
  });

  assert.equal(result.status, "passed");
  assert.equal(result.cadence, "fast");
  assert.ok(result.gates.includes("bootstrap.manifest"));
});

test("missing bootstrap inputs fail with an actionable path", async () => {
  const emptyRoot = await mkdtemp(join(tmpdir(), "martix-platform-"));

  await assert.rejects(
    () => verifyBootstrap({ cadence: "fast", rootDir: emptyRoot }),
    /Missing required bootstrap input: martix\.platform\.json/,
  );
});

test("pull-request cadence verifies the named Generated Solution seam", async () => {
  const result = await verifyBootstrap({
    cadence: "pull-request",
    rootDir: repositoryRoot,
  });

  assert.equal(result.status, "passed");
  assert.equal(result.cadence, "pull-request");
  assert.equal(result.generatedSolution, "RepositoryBootstrapGeneratedSolution");
  assert.ok(result.gates.includes("bootstrap.generated-solution"));
});

test("unknown verification cadences fail before reading repository inputs", async () => {
  await assert.rejects(
    () => verifyBootstrap({ cadence: "unsupported", rootDir: repositoryRoot }),
    /Unknown verification cadence: unsupported/,
  );
});
