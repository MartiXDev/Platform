import assert from "node:assert/strict";
import test from "node:test";
import {
  createCandidateEvidence,
  verifyCandidateEvidence,
} from "../eng/api-release.mjs";

const candidateInput = {
  sourceCommit: "0123456789abcdef0123456789abcdef01234567",
  platformVersion: "0.1.0-preview.1",
  applicationName: "MartiX.Verification",
  generatedSolutionDigest:
    "sha256:1111111111111111111111111111111111111111111111111111111111111111",
  manifestDigest:
    "sha256:2222222222222222222222222222222222222222222222222222222222222222",
  packages: [
    {
      id: "MartiX.Platform.AspNetCore",
      version: "0.1.0-preview.1",
      digest:
        "sha256:3333333333333333333333333333333333333333333333333333333333333333",
    },
    {
      id: "MartiX.Platform",
      version: "0.1.0-preview.1",
      digest:
        "sha256:4444444444444444444444444444444444444444444444444444444444444444",
    },
    {
      id: "MartiX.Platform.Analyzers",
      version: "0.1.0-preview.1",
      digest:
        "sha256:5555555555555555555555555555555555555555555555555555555555555555",
    },
  ],
  nativeAot: {
    rid: "linux-x64",
    digest:
      "sha256:6666666666666666666666666666666666666666666666666666666666666666",
  },
  verification: {
    artifactsPackedOnce: true,
    isolatedFeed: "isolated",
    packedArtifactCount: 3,
    warningsAsErrors: true,
    jit: true,
    tunit: true,
    openApi: true,
    trim: true,
    aot: true,
    reproducible: true,
    cleanOutput: true,
  },
};

test("candidate evidence is deterministic, content addressed, and self-verifying", () => {
  const first = createCandidateEvidence(candidateInput);
  const second = createCandidateEvidence({
    ...candidateInput,
    packages: [...candidateInput.packages].reverse(),
  });

  assert.deepEqual(first, second);
  assert.match(
    first.candidateId,
    /^api-0\.1\.0-preview\.1-[0-9a-f]{16}$/,
  );
  assert.match(first.evidenceDigest, /^sha256:[0-9a-f]{64}$/);
  assert.equal(first.preset, "api");
  assert.deepEqual(first.providers, []);
  assert.equal(first.persistence, "none");
  assert.deepEqual(first.supportClaims, []);
  assert.equal(verifyCandidateEvidence(first), true);
});

test("candidate evidence is immutable and records only the lean API claim", () => {
  const evidence = createCandidateEvidence(candidateInput);
  const mutated = {
    ...evidence,
    persistence: "postgresql",
  };

  assert.throws(
    () => verifyCandidateEvidence(mutated),
    /digest does not match/i,
  );
  assert.equal("identity" in evidence, false);
  assert.equal("ui" in evidence, false);
  assert.equal("enterpriseReadiness" in evidence, false);
  assert.deepEqual(evidence.providers, []);
  assert.deepEqual(evidence.supportClaims, []);
});

test("candidate evidence requires every release gate to pass", () => {
  assert.throws(
    () =>
      createCandidateEvidence({
        ...candidateInput,
        verification: {
          ...candidateInput.verification,
          aot: false,
        },
      }),
    /verification\.aot must be true/i,
  );

  const { tunit, ...missingGate } = candidateInput.verification;
  assert.throws(
    () =>
      createCandidateEvidence({
        ...candidateInput,
        verification: missingGate,
      }),
    /verification\.tunit must be true/i,
  );

  assert.throws(
    () =>
      createCandidateEvidence({
        ...candidateInput,
        verification: {
          ...candidateInput.verification,
          packedArtifactCount: 2,
        },
      }),
    /packedArtifactCount must be 3/i,
  );
});
