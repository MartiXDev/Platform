import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";
import {
  RELEASE_CANDIDATE_ARTIFACT_KINDS,
  RELEASE_CANDIDATE_CADENCE,
  RELEASE_CANDIDATE_CADENCES,
  RELEASE_CANDIDATE_EVIDENCE_IDS,
  RELEASE_CANDIDATE_GATE_IDS,
  RELEASE_CANDIDATE_GATE_ID,
  RELEASE_CANDIDATE_PLATFORM_VERSION,
  RELEASE_CANDIDATE_SOLUTION_NAME,
  RELEASE_CANDIDATE_SOLUTION_ROOT,
  RELEASE_CANDIDATE_VERIFICATION_COMMAND,
  createReleaseCandidateEvidence,
  verifyReleaseCandidateEvidence,
  verifyReleaseCandidateFixture,
} from "../eng/release-candidate.mjs";
import { validateQualityGatePolicy } from "../eng/verify.mjs";

const digest = (character) => `sha256:${character.repeat(64)}`;
const repositoryRoot = resolve(import.meta.dirname, "..");
const fixtureRoot = join(repositoryRoot, RELEASE_CANDIDATE_SOLUTION_ROOT);

async function readJson(relativePath) {
  return JSON.parse(await readFile(join(repositoryRoot, relativePath), "utf8"));
}

const candidateInput = {
  source: {
    commit: "70749a5838ff24611b085010201e00eb595f27c8",
    clean: true,
    reviewed: true,
  },
  platformVersion: RELEASE_CANDIDATE_PLATFORM_VERSION,
  artifacts: RELEASE_CANDIDATE_ARTIFACT_KINDS.map((kind, index) => ({
    id: `artifact-${kind}`,
    kind,
    version: RELEASE_CANDIDATE_PLATFORM_VERSION,
    digest: digest(String((index % 9) + 1)),
    identity: {
      mode: index % 2 === 0 ? "signed" : "digest-identified",
      ...(index % 2 === 0
        ? { signatureDigest: digest(String((index % 8) + 2)) }
        : {}),
    },
  })),
  gates: RELEASE_CANDIDATE_GATE_IDS.map((id, index) => ({
    id,
    outcome: "passed",
    inputDigest: digest(String((index % 8) + 1)),
    evidenceDigest: digest(String((index % 8) + 2)),
    attempts: [{ number: 1, outcome: "passed" }],
  })),
  evidence: Object.fromEntries(
    RELEASE_CANDIDATE_EVIDENCE_IDS.map((id, index) => [
      id,
      {
        status: "passed",
        digest: digest(String((index % 8) + 1)),
        evidence: [`tests/${id}.test.mjs`],
      },
    ]),
  ),
  releasePolicy: {
    builtOnce: true,
    exactBytes: true,
    promotionWithoutRebuild: true,
    patchInPlace: false,
    releaseBlockingFix: {
      createsNewCandidate: true,
      rerunsAffectedGates: true,
      invalidatesPreviousCandidate: true,
    },
  },
  verification: {
    cadence: RELEASE_CANDIDATE_CADENCE,
    policyVersion: "0.0.0-bootstrap",
    entrypoint: "eng/verify.mjs",
    command: RELEASE_CANDIDATE_VERIFICATION_COMMAND,
    failClosed: true,
    notApplicable: [],
    notSelected: [],
  },
  supportClaims: [],
};

test("Release Candidate evidence is deterministic and digest-bound", () => {
  const first = createReleaseCandidateEvidence(candidateInput);
  const second = createReleaseCandidateEvidence({
    ...candidateInput,
    artifacts: [...candidateInput.artifacts].reverse(),
    gates: [...candidateInput.gates].reverse(),
  });

  assert.deepEqual(first, second);
  assert.match(first.candidateId, /^rc-1\.0\.0-rc\.1-[0-9a-f]{16}$/);
  assert.match(first.evidenceDigest, /^sha256:[0-9a-f]{64}$/);
  assert.deepEqual(first.supportClaims, []);
  assert.equal(first.maturity, RELEASE_CANDIDATE_CADENCE);
  assert.equal(verifyReleaseCandidateEvidence(first), true);
});

test("Release Candidate fixture verifies its complete evidence path", async () => {
  const result = await verifyReleaseCandidateFixture({
    rootDir: repositoryRoot,
  });

  assert.equal(result.status, "passed");
  assert.equal(result.maturity, RELEASE_CANDIDATE_CADENCE);
  assert.equal(result.solution, RELEASE_CANDIDATE_SOLUTION_NAME);
  assert.ok(result.artifactCount >= RELEASE_CANDIDATE_ARTIFACT_KINDS.length);
  assert.equal(result.gateCount, RELEASE_CANDIDATE_GATE_IDS.length);
  assert.ok(result.evidencePaths.includes("PROVENANCE.md"));
  assert.equal(fixtureRoot, join(repositoryRoot, result.fixtureRoot));
});

test("Release Candidate evidence rejects a changed artifact digest", async () => {
  const fixture = await readJson(
    `${RELEASE_CANDIDATE_SOLUTION_ROOT}/release-candidate.json`,
  );
  const schema = await readJson("schemas/release-candidate.schema.json");
  const mutated = structuredClone(fixture);
  mutated.artifacts[0].digest = digest("f");

  assert.throws(
    () => verifyReleaseCandidateEvidence(mutated, schema),
    /digest does not match/i,
  );
});

test("Release Candidate evidence rejects failed attempts hidden by retry", () => {
  const weakened = structuredClone(candidateInput);
  weakened.gates[0].attempts[0].outcome = "failed";

  assert.throws(
    () => createReleaseCandidateEvidence(weakened),
    /retry-to-green|attempts/i,
  );
});

test("quality policy selects the Release Candidate evidence profile", async () => {
  const policy = await readJson("eng/quality-gates.json");
  const profile = policy.profiles.find(({ id }) => id === "release-candidate");

  validateQualityGatePolicy(policy);

  assert.deepEqual(profile.gates, [RELEASE_CANDIDATE_GATE_ID]);
  assert.deepEqual(profile.cadences, RELEASE_CANDIDATE_CADENCES);
  assert.equal(profile.command, RELEASE_CANDIDATE_VERIFICATION_COMMAND);
});
