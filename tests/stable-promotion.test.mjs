import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import {
  STABLE_PROMOTION_GATE_ID,
  STABLE_PLATFORM_VERSION,
  STABLE_PROMOTION_CADENCE,
  STABLE_PROMOTION_REQUIRED_GATES,
  STABLE_PROMOTION_SOLUTION_NAME,
  createStablePromotionEvidence,
  sha256,
  verifyStablePromotionEvidence,
  verifyStablePromotionFixture,
} from "../eng/stable-promotion.mjs";
import { validateQualityGatePolicy } from "../eng/verify.mjs";

const repositoryRoot = resolve(import.meta.dirname, "..");

async function readJson(relativePath) {
  return JSON.parse(
    await readFile(`${repositoryRoot}/${relativePath}`, "utf8"),
  );
}

test("Stable promotion verifies accepted RC bytes and the first major floor", async () => {
  const result = await verifyStablePromotionFixture({
    rootDir: repositoryRoot,
  });

  assert.equal(result.status, "passed");
  assert.equal(result.maturity, "stable");
  assert.equal(result.cadence, STABLE_PROMOTION_CADENCE);
  assert.equal(result.solution, STABLE_PROMOTION_SOLUTION_NAME);
  assert.equal(result.platformVersion, STABLE_PLATFORM_VERSION);
  assert.equal(result.acceptedCandidateVersion, "1.0.0-rc.1");
  assert.ok(result.artifactCount >= 13);
  assert.equal(result.destinationCount, 5);
  assert.equal(result.compatibilityBaseline, "1.0.0");
  assert.deepEqual(result.supportClaims, []);
});

test("Stable promotion rejects an accepted RC digest that is not the fixture source", async () => {
  const fixture = await readJson(
    "tests/fixtures/StablePromotionGeneratedSolution/stable-promotion.json",
  );
  const releaseCandidate = await readJson(
    "tests/fixtures/ReleaseCandidateGeneratedSolution/release-candidate.json",
  );
  const schema = await readJson("schemas/stable-promotion.schema.json");
  const acceptedReleaseCandidate = {
    ...fixture.acceptedReleaseCandidate,
    artifactSetDigest: "sha256:" + "f".repeat(64),
  };
  const mutated = createStablePromotionEvidence({
    ...fixture,
    acceptedReleaseCandidate,
    evidence: {
      ...fixture.evidence,
      digest: sha256({
        acceptedReleaseCandidate,
        artifactIds: fixture.artifacts.map(({ id }) => id),
        paths: fixture.evidence.paths,
      }),
    },
  });

  assert.throws(
    () => verifyStablePromotionEvidence(mutated, releaseCandidate, schema),
    /does not bind the accepted Release Candidate identity/i,
  );
});

test("Stable promotion policy selects the stable evidence gate", async () => {
  const policy = await readJson("eng/quality-gates.json");
  const profile = policy.profiles.find(({ id }) => id === "stable-promotion");

  validateQualityGatePolicy(policy);

  assert.equal(profile.maturity, "stable");
  assert.deepEqual(profile.gates, [STABLE_PROMOTION_GATE_ID]);
  assert.deepEqual(profile.cadences, [STABLE_PROMOTION_CADENCE]);
  assert.equal(profile.command, "npm run verify:stable-promotion");
  assert.equal(STABLE_PROMOTION_REQUIRED_GATES.at(-1), STABLE_PROMOTION_GATE_ID);
});
