import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import {
  CANONICAL_CUTOVER_CADENCE,
  CANONICAL_CUTOVER_GATE_ID,
  CANONICAL_CUTOVER_REQUIRED_GATES,
  CANONICAL_CUTOVER_SOLUTION_NAME,
  verifyCanonicalCutoverEvidence,
} from "../eng/canonical-cutover.mjs";
import { sha256 } from "../eng/stable-promotion.mjs";
import { validateQualityGatePolicy } from "../eng/verify.mjs";

const repositoryRoot = resolve(import.meta.dirname, "..");

async function readJson(relativePath) {
  return JSON.parse(
    await readFile(`${repositoryRoot}/${relativePath}`, "utf8"),
  );
}

test("Canonical cutover verifies promoted installation and predecessor archival", async () => {
  const fixture = await readJson(
    "tests/fixtures/CanonicalCutoverGeneratedSolution/canonical-cutover.json",
  );
  const stablePromotion = await readJson(
    "tests/fixtures/StablePromotionGeneratedSolution/stable-promotion.json",
  );
  const schema = await readJson("schemas/canonical-cutover.schema.json");

  assert.equal(
    verifyCanonicalCutoverEvidence(fixture, stablePromotion, schema),
    true,
  );
  assert.equal(fixture.verification.cadence, CANONICAL_CUTOVER_CADENCE);
  assert.equal(fixture.solution, CANONICAL_CUTOVER_SOLUTION_NAME);
  assert.equal(fixture.cutoverGate.id, CANONICAL_CUTOVER_GATE_ID);
  assert.equal(fixture.canonicalSource.repository, "MartiXDev/Platform");
  assert.equal(fixture.stableVersion, "1.0.0");
  assert.equal(fixture.installations.length, 5);
  assert.equal(fixture.smokeTests.length, 3);
  assert.equal(fixture.predecessors.length, 2);
  assert.equal(fixture.marketplaceSkill.direction, "platform-to-marketplace");
  assert.equal(fixture.editableSources.documentation.count, 1);
  assert.equal(fixture.editableSources.skill.count, 1);
});

test("Canonical cutover binds the complete final gate list and rejects bridge packages", async () => {
  const fixture = await readJson(
    "tests/fixtures/CanonicalCutoverGeneratedSolution/canonical-cutover.json",
  );
  const stablePromotion = await readJson(
    "tests/fixtures/StablePromotionGeneratedSolution/stable-promotion.json",
  );
  const schema = await readJson("schemas/canonical-cutover.schema.json");

  assert.deepEqual(
    fixture.verification.requiredGates,
    CANONICAL_CUTOVER_REQUIRED_GATES,
  );
  const mutated = structuredClone(fixture);
  mutated.migration.bridgePackages = ["MartiX.Platform.LegacyBridge"];
  const { evidenceDigest, ...evidenceBody } = mutated;
  mutated.evidenceDigest = sha256(evidenceBody);

  assert.throws(
    () => verifyCanonicalCutoverEvidence(mutated, stablePromotion, schema),
    /schema rejected|bridge-package|bridge package/i,
  );
});

test("Canonical cutover is the final release-candidate quality gate", async () => {
  const policy = await readJson("eng/quality-gates.json");
  validateQualityGatePolicy(policy);

  const profile = policy.profiles.find(({ id }) => id === "canonical-cutover");
  assert.equal(profile.command, "npm run verify:canonical-cutover");
  assert.deepEqual(profile.gates, [CANONICAL_CUTOVER_GATE_ID]);
  assert.equal(
    policy.gates.at(-1).id,
    CANONICAL_CUTOVER_GATE_ID,
  );
});
