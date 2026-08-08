import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import {
  MODULAR_MONOLITH_ALPHA_GATE_IDS,
  MODULAR_MONOLITH_ALPHA_MATURITY,
  MODULAR_MONOLITH_ALPHA_PROVIDERS,
  createModularMonolithAlphaEvidence,
  verifyModularMonolithAlphaEvidence,
} from "../eng/modular-monolith-alpha.mjs";

const digest = (hexDigit) => `sha256:${hexDigit.repeat(64)}`;

const alphaInput = {
  sourceCommit: "0123456789abcdef0123456789abcdef01234567",
  platformVersion: "0.1.0-preview.1",
  applicationName: "MartiX.Alpha",
  businessModules: ["Orders", "Billing"],
  moduleDependencies: [
    { consumer: "Billing", provider: "Orders", access: "Contracts" },
  ],
  artifacts: [
    {
      id: "MartiX.Platform",
      version: "0.1.0-preview.1",
      digest: digest("1"),
    },
    {
      id: "MartiX.Platform.AspNetCore",
      version: "0.1.0-preview.1",
      digest: digest("2"),
    },
    {
      id: "MartiX.Platform.Analyzers",
      version: "0.1.0-preview.1",
      digest: digest("3"),
    },
    {
      id: "MartiX.Platform.EntityFrameworkCore",
      version: "0.1.0-preview.1",
      digest: digest("4"),
    },
  ],
  variants: MODULAR_MONOLITH_ALPHA_PROVIDERS.map((provider, index) => ({
    provider,
    generatedSolutionDigest: digest(["5", "6"][index]),
    manifestDigest: digest(["7", "8"][index]),
    inputDigest: digest("9"),
    gates: MODULAR_MONOLITH_ALPHA_GATE_IDS.slice(0, -1).map((id) => ({
      id,
      outcome: "passed",
      evidenceDigest: digest(["b", "c"][index]),
    })),
  })),
  releaseGate: {
    id: "modular-monolith.release-evidence",
    outcome: "passed",
    evidenceDigest:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  },
  compatibility: {
    synchronized: true,
    coordinates: [
      "modular-monolith/postgresql",
      "modular-monolith/sqlserver",
    ],
    invalidSelections: ["mixed-relational-providers", "sqlite"],
  },
};

test("Modular Monolith alpha evidence is deterministic and records Experimental maturity", () => {
  const first = createModularMonolithAlphaEvidence(alphaInput);
  const second = createModularMonolithAlphaEvidence({
    ...alphaInput,
    variants: [...alphaInput.variants].reverse(),
    artifacts: [...alphaInput.artifacts].reverse(),
  });

  assert.deepEqual(first, second);
  assert.equal(first.maturity.stage, MODULAR_MONOLITH_ALPHA_MATURITY);
  assert.equal(first.maturity.productionReady, false);
  assert.deepEqual(first.providers, MODULAR_MONOLITH_ALPHA_PROVIDERS);
  assert.deepEqual(first.supportClaims, []);
  assert.match(first.evidenceDigest, /^sha256:[0-9a-f]{64}$/);
  assert.equal(verifyModularMonolithAlphaEvidence(first), true);
});

test("Modular Monolith alpha evidence fails closed for incomplete provider or gate evidence", () => {
  assert.throws(
    () =>
      createModularMonolithAlphaEvidence({
        ...alphaInput,
        variants: alphaInput.variants.slice(0, 1),
      }),
    /exactly one postgresql and one sqlserver variant/i,
  );

  assert.throws(
    () =>
      createModularMonolithAlphaEvidence({
        ...alphaInput,
        releaseGate: {
          ...alphaInput.releaseGate,
          outcome: "infrastructure-error",
        },
      }),
    /release-evidence.*passed/i,
  );
});

test("the quality policy selects the complete claim-free alpha profile", async () => {
  const policy = JSON.parse(
    await readFile(resolve("eng", "quality-gates.json"), "utf8"),
  );
  const profile = policy.profiles.find(
    (candidate) => candidate.id === "modular-monolith-alpha",
  );

  assert.ok(profile);
  assert.equal(profile.maturity, MODULAR_MONOLITH_ALPHA_MATURITY);
  assert.equal(profile.preset, "modular-monolith");
  assert.deepEqual(profile.providers, [...MODULAR_MONOLITH_ALPHA_PROVIDERS]);
  assert.deepEqual(profile.cadences, ["release-candidate"]);
  assert.deepEqual(profile.gates, [...MODULAR_MONOLITH_ALPHA_GATE_IDS]);
  assert.equal(profile.command, "npm run verify:modular-monolith-alpha");
  assert.deepEqual(policy.supportClaims, []);
});
