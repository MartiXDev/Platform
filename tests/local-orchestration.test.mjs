import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import {
  createLocalOrchestration,
  verifyLocalOrchestration,
} from "../eng/local-orchestration.mjs";

const fixtureRoot = join(
  import.meta.dirname,
  "fixtures",
  "DeploymentManifestGeneratedSolution",
);

test("local projections are deterministic and preserve the deployment identity", async () => {
  const manifest = JSON.parse(
    await readFile(join(fixtureRoot, "deployment-manifest.json"), "utf8"),
  );

  const orchestration = createLocalOrchestration(manifest);

  assert.equal(orchestration.manifestDigest, manifest.identity.manifestDigest);
  assert.equal(orchestration.direct.command, "dotnet run");
  assert.equal(orchestration.direct.universal, true);
  assert.equal(orchestration.aspire.optional, true);
  assert.equal(orchestration.compose.mode, "bounded-single-host");
  assert.equal(orchestration.compose.build, false);
  assert.equal(orchestration.compose.highAvailability, false);
  assert.deepEqual(
    orchestration.compose.resources.map(({ id }) => id),
    manifest.resources.map(({ id }) => id),
  );
  assert.equal(
    orchestration.compose.resources.find(({ id }) => id === "api").shutdown.signal,
    "SIGTERM",
  );
});

test("Aspire and Compose preserve lifecycle semantics without production orchestration claims", async () => {
  const manifest = JSON.parse(
    await readFile(join(fixtureRoot, "deployment-manifest.json"), "utf8"),
  );
  const orchestration = createLocalOrchestration(manifest);
  const processResources = orchestration.direct.resources;

  assert.deepEqual(orchestration.aspire.resources, processResources);
  assert.deepEqual(orchestration.compose.resources, processResources);
  assert.deepEqual(orchestration.aspire.migration, orchestration.migration);
  assert.deepEqual(orchestration.compose.configuration, orchestration.configuration);
  assert.match(orchestration.aspire.content, /WaitForCompletion\(migrator\)/);
  assert.match(orchestration.aspire.content, /health\/readiness/);
  assert.match(orchestration.aspire.content, /SIGTERM/);
  assert.ok(
    orchestration.aspire.content.indexOf("var migrator") <
      orchestration.aspire.content.indexOf("WaitForCompletion(migrator)"),
  );

  assert.doesNotMatch(orchestration.compose.content, /^\s*build\s*:/m);
  assert.match(
    orchestration.compose.content,
    /image: "martix-inventory@sha256:222222/,
  );
  assert.match(orchestration.compose.content, /service_completed_successfully/);
  assert.match(orchestration.compose.content, /restart: "on-failure:3"/);
  assert.match(orchestration.compose.content, /stop_grace_period: 30s/);
  assert.match(orchestration.compose.content, /high-availability: false/);
  assert.match(orchestration.compose.content, /internal: true/);
  assert.doesNotMatch(orchestration.compose.content, /replicas:\s*[2-9]/);
  assert.doesNotMatch(orchestration.compose.content, /password|token|private.key/i);

  const drifted = structuredClone(orchestration);
  drifted.compose.highAvailability = true;
  assert.throws(
    () => verifyLocalOrchestration(manifest, drifted),
    /drifted from the validated Deployment Manifest/,
  );
});
