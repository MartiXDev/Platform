import { createHash } from "node:crypto";

export const AZURE_KEY_VAULT_EVIDENCE_SCHEMA_VERSION = "1.0.0";
export const AZURE_KEY_VAULT_PROVIDER = Object.freeze({
  capability: "secrets",
  id: "azure-key-vault",
});
export const AZURE_KEY_VAULT_REQUIRED_CONFIGURATION = Object.freeze([
  "Azure:KeyVault:ReloadInterval",
  "Azure:KeyVault:Uri",
]);
export const AZURE_KEY_VAULT_RELOAD_INTERVAL_SECONDS = 300;
export const AZURE_KEY_VAULT_MAX_STALE_SECONDS = 600;
export const AZURE_KEY_VAULT_CHECK_IDS = Object.freeze([
  "managed-identity",
  "rotation-restart",
  "cache-freshness",
  "outage",
  "startup",
  "redaction",
]);

export class AzureKeyVaultEvidenceError extends Error {
  constructor(message) {
    super(message);
    this.name = "AzureKeyVaultEvidenceError";
  }
}

function fail(message) {
  throw new AzureKeyVaultEvidenceError(message);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireRecord(value, label) {
  if (!isRecord(value)) {
    fail(`${label} must be an object.`);
  }

  return value;
}

function requireString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(`${label} must be a non-empty string.`);
  }

  return value.trim();
}

function requireBoolean(value, label) {
  if (typeof value !== "boolean") {
    fail(`${label} must be a boolean.`);
  }

  return value;
}

function requirePositiveInteger(value, label) {
  if (!Number.isInteger(value) || value <= 0) {
    fail(`${label} must be a positive integer.`);
  }

  return value;
}

function requireKeys(value, allowed, label) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      fail(`${label}.${key} is not allowed.`);
    }
  }
}

function requireExact(value, expected, label) {
  if (value !== expected) {
    fail(`${label} must be ${expected}.`);
  }

  return expected;
}

function normalizeStringList(value, label) {
  if (!Array.isArray(value)) {
    fail(`${label} must be an array.`);
  }

  const values = value.map((item, index) =>
    requireString(item, `${label}[${index}]`),
  );
  if (new Set(values).size !== values.length) {
    fail(`${label} must contain unique values.`);
  }

  return [...values].sort((left, right) => left.localeCompare(right));
}

function requireExactStringList(value, expected, label) {
  const actual = normalizeStringList(value, label);
  const normalizedExpected = [...expected].sort((left, right) =>
    left.localeCompare(right),
  );
  if (JSON.stringify(actual) !== JSON.stringify(normalizedExpected)) {
    fail(`${label} must contain exactly ${normalizedExpected.join(", ")}.`);
  }

  return actual;
}

function normalizeProvider(value) {
  const provider = requireRecord(value, "provider");
  requireKeys(provider, ["capability", "id"], "provider");

  return {
    capability: requireExact(
      requireString(provider.capability, "provider.capability"),
      AZURE_KEY_VAULT_PROVIDER.capability,
      "provider.capability",
    ),
    id: requireExact(
      requireString(provider.id, "provider.id"),
      AZURE_KEY_VAULT_PROVIDER.id,
      "provider.id",
    ),
  };
}

function normalizeConfiguration(value) {
  const configuration = requireRecord(value, "configuration");
  requireKeys(
    configuration,
    [
      "requiredKeys",
      "selectedKeys",
      "uriSource",
      "uriFormat",
      "keyPrefix",
      "reloadIntervalSeconds",
      "failFast",
      "fallbackPolicy",
    ],
    "configuration",
  );

  return {
    requiredKeys: requireExactStringList(
      configuration.requiredKeys,
      AZURE_KEY_VAULT_REQUIRED_CONFIGURATION,
      "configuration.requiredKeys",
    ),
    selectedKeys: requireExactStringList(
      configuration.selectedKeys,
      AZURE_KEY_VAULT_REQUIRED_CONFIGURATION,
      "configuration.selectedKeys",
    ),
    uriSource: requireExact(
      requireString(configuration.uriSource, "configuration.uriSource"),
      "Azure:KeyVault:Uri",
      "configuration.uriSource",
    ),
    uriFormat: requireExact(
      requireString(configuration.uriFormat, "configuration.uriFormat"),
      "https",
      "configuration.uriFormat",
    ),
    keyPrefix: requireExact(
      requireString(configuration.keyPrefix, "configuration.keyPrefix"),
      "App--",
      "configuration.keyPrefix",
    ),
    reloadIntervalSeconds: requireExact(
      requirePositiveInteger(
        configuration.reloadIntervalSeconds,
        "configuration.reloadIntervalSeconds",
      ),
      AZURE_KEY_VAULT_RELOAD_INTERVAL_SECONDS,
      "configuration.reloadIntervalSeconds",
    ),
    failFast: requireExact(
      requireBoolean(configuration.failFast, "configuration.failFast"),
      true,
      "configuration.failFast",
    ),
    fallbackPolicy: requireExact(
      requireString(configuration.fallbackPolicy, "configuration.fallbackPolicy"),
      "none",
      "configuration.fallbackPolicy",
    ),
  };
}

function normalizeIdentity(value) {
  const identity = requireRecord(value, "identity");
  requireKeys(
    identity,
    ["mode", "localMode", "fallbackPolicy"],
    "identity",
  );

  return {
    mode: requireExact(
      requireString(identity.mode, "identity.mode"),
      "managed-identity",
      "identity.mode",
    ),
    localMode: requireExact(
      requireString(identity.localMode, "identity.localMode"),
      "standard-configuration",
      "identity.localMode",
    ),
    fallbackPolicy: requireExact(
      requireString(identity.fallbackPolicy, "identity.fallbackPolicy"),
      "none",
      "identity.fallbackPolicy",
    ),
  };
}

function normalizeLifecycle(value, reloadIntervalSeconds) {
  const lifecycle = requireRecord(value, "lifecycle");
  requireKeys(lifecycle, ["rotation", "freshness"], "lifecycle");

  const rotation = requireRecord(lifecycle.rotation, "lifecycle.rotation");
  requireKeys(
    rotation,
    ["strategy", "restartRequired", "oldBindingRevokedBeforeReady"],
    "lifecycle.rotation",
  );

  const freshness = requireRecord(lifecycle.freshness, "lifecycle.freshness");
  requireKeys(
    freshness,
    [
      "reloadIntervalSeconds",
      "maxStaleSeconds",
      "cachePolicy",
      "staleValuePolicy",
    ],
    "lifecycle.freshness",
  );

  return {
    rotation: {
      strategy: requireExact(
        requireString(rotation.strategy, "lifecycle.rotation.strategy"),
        "replace-and-restart",
        "lifecycle.rotation.strategy",
      ),
      restartRequired: requireExact(
        requireBoolean(
          rotation.restartRequired,
          "lifecycle.rotation.restartRequired",
        ),
        true,
        "lifecycle.rotation.restartRequired",
      ),
      oldBindingRevokedBeforeReady: requireExact(
        requireBoolean(
          rotation.oldBindingRevokedBeforeReady,
          "lifecycle.rotation.oldBindingRevokedBeforeReady",
        ),
        true,
        "lifecycle.rotation.oldBindingRevokedBeforeReady",
      ),
    },
    freshness: {
      reloadIntervalSeconds: requireExact(
        requirePositiveInteger(
          freshness.reloadIntervalSeconds,
          "lifecycle.freshness.reloadIntervalSeconds",
        ),
        reloadIntervalSeconds,
        "lifecycle.freshness.reloadIntervalSeconds",
      ),
      maxStaleSeconds: requireExact(
        requirePositiveInteger(
          freshness.maxStaleSeconds,
          "lifecycle.freshness.maxStaleSeconds",
        ),
        AZURE_KEY_VAULT_MAX_STALE_SECONDS,
        "lifecycle.freshness.maxStaleSeconds",
      ),
      cachePolicy: requireExact(
        requireString(freshness.cachePolicy, "lifecycle.freshness.cachePolicy"),
        "bounded-last-known",
        "lifecycle.freshness.cachePolicy",
      ),
      staleValuePolicy: requireExact(
        requireString(
          freshness.staleValuePolicy,
          "lifecycle.freshness.staleValuePolicy",
        ),
        "never-empty-or-development",
        "lifecycle.freshness.staleValuePolicy",
      ),
    },
  };
}

function normalizeOutage(value) {
  const outage = requireRecord(value, "outage");
  requireKeys(
    outage,
    ["startupPolicy", "runtimePolicy", "readinessPolicy", "maxStaleSeconds"],
    "outage",
  );

  return {
    startupPolicy: requireExact(
      requireString(outage.startupPolicy, "outage.startupPolicy"),
      "fail-closed",
      "outage.startupPolicy",
    ),
    runtimePolicy: requireExact(
      requireString(outage.runtimePolicy, "outage.runtimePolicy"),
      "bounded-last-known",
      "outage.runtimePolicy",
    ),
    maxStaleSeconds: requireExact(
      requirePositiveInteger(
        outage.maxStaleSeconds,
        "outage.maxStaleSeconds",
      ),
      AZURE_KEY_VAULT_MAX_STALE_SECONDS,
      "outage.maxStaleSeconds",
    ),
    readinessPolicy: requireExact(
      requireString(outage.readinessPolicy, "outage.readinessPolicy"),
      "not-ready-after-max-stale",
      "outage.readinessPolicy",
    ),
  };
}

function normalizeStartup(value) {
  const startup = requireRecord(value, "startup");
  requireKeys(
    startup,
    ["missingUri", "invalidUri", "localFallback"],
    "startup",
  );

  return {
    missingUri: requireExact(
      requireString(startup.missingUri, "startup.missingUri"),
      "fail-before-readiness",
      "startup.missingUri",
    ),
    invalidUri: requireExact(
      requireString(startup.invalidUri, "startup.invalidUri"),
      "fail-before-readiness",
      "startup.invalidUri",
    ),
    localFallback: requireExact(
      requireString(startup.localFallback, "startup.localFallback"),
      "disabled",
      "startup.localFallback",
    ),
  };
}

function normalizeRedaction(value) {
  const redaction = requireRecord(value, "redaction");
  const surfaces = ["logs", "telemetry", "health", "exceptions", "evidence"];
  requireKeys(redaction, surfaces, "redaction");

  return Object.fromEntries(
    surfaces.map((surface) => [
      surface,
      requireExact(
        requireString(redaction[surface], `redaction.${surface}`),
        "metadata-only",
        `redaction.${surface}`,
      ),
    ]),
  );
}

function normalizeChecks(value) {
  if (!Array.isArray(value)) {
    fail("checks must be an array.");
  }

  const checks = value.map((check, index) => {
    const path = `checks[${index}]`;
    const record = requireRecord(check, path);
    requireKeys(record, ["id", "outcome"], path);
    return {
      id: requireString(record.id, `${path}.id`),
      outcome: requireExact(
        requireString(record.outcome, `${path}.outcome`),
        "passed",
        `${path}.outcome`,
      ),
    };
  });
  if (new Set(checks.map(({ id }) => id)).size !== checks.length) {
    fail("checks must contain unique ids.");
  }

  const ids = checks.map(({ id }) => id).sort((left, right) =>
    left.localeCompare(right),
  );
  const expectedIds = [...AZURE_KEY_VAULT_CHECK_IDS].sort((left, right) =>
    left.localeCompare(right),
  );
  if (JSON.stringify(ids) !== JSON.stringify(expectedIds)) {
    fail(`checks must contain exactly ${expectedIds.join(", ")}.`);
  }

  return checks.sort((left, right) => left.id.localeCompare(right.id));
}

function normalizeEvidence(value) {
  const evidence = requireRecord(value, "Azure Key Vault evidence");
  requireKeys(
    evidence,
    [
      "schemaVersion",
      "provider",
      "outcome",
      "failClosed",
      "configuration",
      "identity",
      "lifecycle",
      "outage",
      "startup",
      "redaction",
      "checks",
      "supportClaims",
    ],
    "Azure Key Vault evidence",
  );

  const schemaVersion = requireString(
    evidence.schemaVersion,
    "schemaVersion",
  );
  if (schemaVersion !== AZURE_KEY_VAULT_EVIDENCE_SCHEMA_VERSION) {
    fail(`Unsupported Azure Key Vault evidence schema: ${schemaVersion}.`);
  }

  requireExact(
    requireString(evidence.outcome, "outcome"),
    "passed",
    "outcome",
  );
  requireExact(requireBoolean(evidence.failClosed, "failClosed"), true, "failClosed");
  const configuration = normalizeConfiguration(evidence.configuration);

  return {
    schemaVersion,
    provider: normalizeProvider(evidence.provider),
    outcome: "passed",
    failClosed: true,
    configuration,
    identity: normalizeIdentity(evidence.identity),
    lifecycle: normalizeLifecycle(
      evidence.lifecycle,
      configuration.reloadIntervalSeconds,
    ),
    outage: normalizeOutage(evidence.outage),
    startup: normalizeStartup(evidence.startup),
    redaction: normalizeRedaction(evidence.redaction),
    checks: normalizeChecks(evidence.checks),
    supportClaims: requireExactStringList(
      evidence.supportClaims,
      [],
      "supportClaims",
    ),
  };
}

function canonicalJson(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    .join(",")}}`;
}

export function sha256(value) {
  return `sha256:${createHash("sha256")
    .update(typeof value === "string" ? value : canonicalJson(value))
    .digest("hex")}`;
}

function deepFreeze(value) {
  if (!isRecord(value) && !Array.isArray(value)) {
    return value;
  }

  for (const child of Object.values(value)) {
    deepFreeze(child);
  }

  return Object.freeze(value);
}

export function createAzureKeyVaultEvidence(input) {
  const body = normalizeEvidence(input);
  return deepFreeze({
    ...body,
    evidenceDigest: sha256(body),
  });
}

export function verifyAzureKeyVaultEvidence(evidence) {
  const value = requireRecord(evidence, "Azure Key Vault evidence");
  const { evidenceDigest, ...body } = value;
  if (
    typeof evidenceDigest !== "string" ||
    !/^sha256:[0-9a-f]{64}$/.test(evidenceDigest)
  ) {
    fail("Azure Key Vault evidenceDigest must be a sha256 digest.");
  }

  const normalized = normalizeEvidence(body);
  if (canonicalJson(body) !== canonicalJson(normalized)) {
    fail("Azure Key Vault evidence is not normalized.");
  }
  if (sha256(normalized) !== evidenceDigest) {
    fail("Azure Key Vault evidence digest does not match its content.");
  }

  return {
    status: "passed",
    provider: { ...AZURE_KEY_VAULT_PROVIDER },
    checks: [...AZURE_KEY_VAULT_CHECK_IDS],
  };
}
