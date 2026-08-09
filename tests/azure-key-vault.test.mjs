import assert from "node:assert/strict";
import test from "node:test";
import {
  AZURE_KEY_VAULT_CHECK_IDS,
  AZURE_KEY_VAULT_EVIDENCE_SCHEMA_VERSION,
  createAzureKeyVaultEvidence,
  verifyAzureKeyVaultEvidence,
} from "../eng/azure-key-vault.mjs";

const evidenceInput = {
  schemaVersion: AZURE_KEY_VAULT_EVIDENCE_SCHEMA_VERSION,
  provider: {
    capability: "secrets",
    id: "azure-key-vault",
  },
  outcome: "passed",
  failClosed: true,
  configuration: {
    requiredKeys: [
      "Azure:KeyVault:ReloadInterval",
      "Azure:KeyVault:Uri",
    ],
    selectedKeys: [
      "Azure:KeyVault:ReloadInterval",
      "Azure:KeyVault:Uri",
    ],
    uriSource: "Azure:KeyVault:Uri",
    uriFormat: "https",
    keyPrefix: "App--",
    reloadIntervalSeconds: 300,
    failFast: true,
    fallbackPolicy: "none",
  },
  identity: {
    mode: "managed-identity",
    localMode: "standard-configuration",
    fallbackPolicy: "none",
  },
  lifecycle: {
    rotation: {
      strategy: "replace-and-restart",
      restartRequired: true,
      oldBindingRevokedBeforeReady: true,
    },
    freshness: {
      reloadIntervalSeconds: 300,
      maxStaleSeconds: 600,
      cachePolicy: "bounded-last-known",
      staleValuePolicy: "never-empty-or-development",
    },
  },
  outage: {
    startupPolicy: "fail-closed",
    runtimePolicy: "bounded-last-known",
    maxStaleSeconds: 600,
    readinessPolicy: "not-ready-after-max-stale",
  },
  startup: {
    missingUri: "fail-before-readiness",
    invalidUri: "fail-before-readiness",
    localFallback: "disabled",
  },
  redaction: {
    logs: "metadata-only",
    telemetry: "metadata-only",
    health: "metadata-only",
    exceptions: "metadata-only",
    evidence: "metadata-only",
  },
  checks: AZURE_KEY_VAULT_CHECK_IDS.map((id) => ({
    id,
    outcome: "passed",
  })),
  supportClaims: [],
};

test("Azure Key Vault evidence is deterministic and claim-free", () => {
  const first = createAzureKeyVaultEvidence(evidenceInput);
  const second = createAzureKeyVaultEvidence({
    ...evidenceInput,
    checks: [...evidenceInput.checks].reverse(),
  });

  assert.deepEqual(first, second);
  assert.equal(first.outcome, "passed");
  assert.equal(first.failClosed, true);
  assert.deepEqual(first.supportClaims, []);
  assert.equal(verifyAzureKeyVaultEvidence(first).status, "passed");
});

test("Azure Key Vault evidence requires explicit fail-fast and managed identity semantics", () => {
  assert.throws(
    () =>
      createAzureKeyVaultEvidence({
        ...evidenceInput,
        configuration: {
          ...evidenceInput.configuration,
          failFast: false,
        },
      }),
    /configuration\.failFast must be true/i,
  );

  assert.throws(
    () =>
      createAzureKeyVaultEvidence({
        ...evidenceInput,
        identity: {
          ...evidenceInput.identity,
          mode: "developer-credential",
        },
      }),
    /identity\.mode must be managed-identity/i,
  );
});

test("Azure Key Vault evidence requires bounded freshness, restart rotation, and redaction", () => {
  assert.throws(
    () =>
      createAzureKeyVaultEvidence({
        ...evidenceInput,
        lifecycle: {
          ...evidenceInput.lifecycle,
          freshness: {
            ...evidenceInput.lifecycle.freshness,
            reloadIntervalSeconds: 0,
          },
        },
      }),
    /freshness\.reloadIntervalSeconds must be a positive integer/i,
  );

  assert.throws(
    () =>
      createAzureKeyVaultEvidence({
        ...evidenceInput,
        redaction: {
          ...evidenceInput.redaction,
          logs: "values-included",
        },
      }),
    /redaction\.logs must be metadata-only/i,
  );
});

test("Azure Key Vault evidence does not carry endpoint values", () => {
  assert.throws(
    () =>
      createAzureKeyVaultEvidence({
        ...evidenceInput,
        configuration: {
          ...evidenceInput.configuration,
          uri: "https://example.vault.azure.net/",
        },
      }),
    /configuration\.uri is not allowed/i,
  );
});
