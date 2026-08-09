import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";
import {
  BETA_INTEGRATION_SOLUTION_NAME,
  BETA_INTEGRATION_SOLUTION_ROOT,
  BETA_NOT_ATTESTED_SCOPE,
  BETA_REQUIRED_AUTHENTICATION_PROFILES,
  BETA_REQUIRED_DEPLOYMENT_PROFILES,
  BETA_REQUIRED_PRESETS,
  BETA_REQUIRED_UI_PROVIDERS,
  verifyBetaIntegrationFixture,
  verifyBetaIntegrationEvidence,
} from "../eng/beta-integration.mjs";

const repositoryRoot = resolve(import.meta.dirname, "..");
const fixtureRoot = join(repositoryRoot, BETA_INTEGRATION_SOLUTION_ROOT);

async function readJson(relativePath) {
  return JSON.parse(await readFile(join(repositoryRoot, relativePath), "utf8"));
}

async function readBetaIntegrationInputs() {
  return {
    fixture: await readJson(
      `${BETA_INTEGRATION_SOLUTION_ROOT}/beta-integration.json`,
    ),
    manifest: await readJson(
      `${BETA_INTEGRATION_SOLUTION_ROOT}/martix.platform.json`,
    ),
    schema: await readJson("schemas/beta-integration.schema.json"),
  };
}

test("Beta Integration evidence records the complete risk-based scope", async () => {
  const { fixture, manifest, schema } = await readBetaIntegrationInputs();

  const result = verifyBetaIntegrationEvidence(fixture, manifest, schema);

  assert.equal(result.status, "passed");
  assert.equal(result.maturity, "beta");
  assert.deepEqual(result.presets, BETA_REQUIRED_PRESETS);
  assert.deepEqual(
    result.authenticationProfiles,
    BETA_REQUIRED_AUTHENTICATION_PROFILES,
  );
  assert.deepEqual(result.uiProviders, BETA_REQUIRED_UI_PROVIDERS);
  assert.deepEqual(result.deploymentProfiles, BETA_REQUIRED_DEPLOYMENT_PROFILES);
  assert.deepEqual(result.supportClaims, []);
  assert.deepEqual(result.notAttested, BETA_NOT_ATTESTED_SCOPE);
  assert.ok(result.evidencePaths.includes("tests/agent-readiness.test.mjs"));
  assert.equal(result.solution, BETA_INTEGRATION_SOLUTION_NAME);
  assert.equal(fixtureRoot, join(repositoryRoot, result.fixtureRoot));
});

test("Beta Integration evidence fails closed when scope freeze permits a feature", async () => {
  const { fixture, manifest, schema } = await readBetaIntegrationInputs();
  const weakened = structuredClone(fixture);
  weakened.scopeFreeze.allowedPostFreezeChanges.push("feature");

  assert.throws(
    () => verifyBetaIntegrationEvidence(weakened, manifest, schema),
    /scopeFreeze|feature/i,
  );
});

test("Beta Integration fixture verifies every referenced evidence path", async () => {
  const result = await verifyBetaIntegrationFixture({
    rootDir: repositoryRoot,
  });

  assert.equal(result.status, "passed");
  assert.ok(result.evidencePaths.length > 0);
  assert.ok(result.evidenceDigest.length > 0);
});
