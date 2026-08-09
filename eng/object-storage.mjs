import { createHash } from "node:crypto";

export const OBJECT_STORAGE_EVIDENCE_SCHEMA_VERSION = "1.0.0";
export const AZURE_BLOB_OBJECT_STORAGE_PACKAGE = Object.freeze({
  id: "Azure.Storage.Blobs",
  version: "12.29.1",
});
export const AZURE_BLOB_OBJECT_STORAGE_EMULATOR = Object.freeze({
  id: "azurite",
  name: "Azurite",
  version: "3.35.0",
});
export const OBJECT_STORAGE_CONFORMANCE_CHECKS = Object.freeze([
  "streaming",
  "cancellation",
  "content-metadata",
  "conditional",
  "retry",
  "failure",
  "credentials",
  "endpoint",
  "redaction",
  "health",
  "outage",
]);

const OBJECT_STORAGE_OUTCOMES = Object.freeze([
  "passed",
  "failed",
  "infrastructure-error",
  "not-attested",
]);
const OBJECT_STORAGE_FAILURE_CODES = new Set([
  "live-evidence-required",
  "infrastructure-error",
  "provider-outage",
]);
const SAFE_ENVIRONMENTS = new Set(["development", "test", "production"]);
const ALLOWED_ENDPOINT_PROTOCOLS = new Set(["http:", "https:"]);
const CREDENTIAL_SOURCES = new Set([
  "managed-identity",
  "workload-identity",
  "external-token",
  "emulator-shared-key",
]);
const RETRYABLE_STATUS_CODES = Object.freeze([
  408,
  429,
  500,
  502,
  503,
  504,
]);
const IDEMPOTENT_OPERATIONS = Object.freeze(["read", "head", "delete"]);
const FORBIDDEN_CREDENTIAL_SOURCES = Object.freeze([
  "account-key-in-source",
  "sas-in-manifest",
  "connection-string-in-manifest",
]);
const LOCAL_EMULATOR_HOSTS = new Set(["127.0.0.1", "localhost", "0.0.0.0"]);
const CONTAINER_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/;
const FORBIDDEN_REDACTED_DATA = Object.freeze([
  "object-name",
  "signed-url",
  "credential",
  "payload",
  "provider-response",
]);

export class ObjectStorageEvidenceError extends Error {
  constructor(message, code = "invalid-evidence", details = undefined) {
    super(message);
    this.name = "ObjectStorageEvidenceError";
    this.code = code;
    this.details = details;
  }
}

function fail(message, code = "invalid-evidence", details = undefined) {
  throw new ObjectStorageEvidenceError(message, code, details);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireRecord(value, label) {
  if (!isRecord(value)) {
    fail(`${label} must be an object.`, "invalid-input");
  }

  return value;
}

function requireString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(`${label} must be a non-empty string.`, "invalid-input");
  }

  return value.trim();
}

function requireBoolean(value, label) {
  if (typeof value !== "boolean") {
    fail(`${label} must be a boolean.`, "invalid-input");
  }

  return value;
}

function requirePositiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    fail(`${label} must be a positive safe integer.`, "invalid-contract");
  }

  return value;
}

function requireUniqueStrings(value, label) {
  if (!Array.isArray(value)) {
    fail(`${label} must be an array.`, "invalid-input");
  }
  const values = value.map((item, index) =>
    requireString(item, `${label}[${index}]`),
  );
  if (new Set(values).size !== values.length) {
    fail(`${label} must contain unique values.`, "invalid-input");
  }

  return values;
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

function hasSameSequence(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function sha256(value) {
  return `sha256:${createHash("sha256")
    .update(typeof value === "string" ? value : canonicalJson(value))
    .digest("hex")}`;
}

const OBJECT_STORAGE_OPERATIONS = [
  {
    id: "write",
    streaming: true,
    bounded: true,
    cancellable: true,
    contentMetadata: ["content-type", "content-length", "content-md5"],
    metadata: "bounded",
    conditions: ["if-none-match", "if-match"],
    retry: "conditional-only",
  },
  {
    id: "read",
    streaming: true,
    bounded: true,
    cancellable: true,
    contentMetadata: ["content-type", "content-length", "etag"],
    metadata: "bounded",
    conditions: ["if-match"],
    retry: "idempotent",
  },
  {
    id: "head",
    streaming: false,
    bounded: true,
    cancellable: true,
    contentMetadata: ["content-type", "content-length", "etag"],
    metadata: "bounded",
    conditions: ["if-match"],
    retry: "idempotent",
  },
  {
    id: "delete",
    streaming: false,
    bounded: true,
    cancellable: true,
    contentMetadata: [],
    metadata: "none",
    conditions: ["if-match"],
    retry: "idempotent",
  },
];

export const AZURE_BLOB_OBJECT_STORAGE_CONTRACT = deepFreeze({
  capability: "object-storage",
  provider: "azure-blob",
  boundary: "provider-sdk-types-never-cross-business-module",
  maxObjectBytes: 104857600,
  maxMetadataEntries: 16,
  maxMetadataValueBytes: 256,
  operations: OBJECT_STORAGE_OPERATIONS,
  retry: {
    maxAttempts: 3,
    maxDelayMs: 2000,
    retryableStatusCodes: RETRYABLE_STATUS_CODES,
    idempotentOperations: IDEMPOTENT_OPERATIONS,
    conditionalWriteOnly: true,
    unsafeWrite: "never",
  },
  failureMapping: {
    notFound: "not-found",
    preconditionFailed: "precondition-failed",
    conflict: "conflict",
    unauthorized: "unauthorized",
    invalidRequest: "invalid-request",
    unavailable: "unavailable",
    cancelled: "cancelled",
    unexpected: "provider-failure",
  },
  authentication: {
    policy: "external-only",
    acceptedSources: [
      "managed-identity",
      "workload-identity",
      "external-token",
      "emulator-shared-key",
    ],
    forbiddenSources: FORBIDDEN_CREDENTIAL_SOURCES,
  },
  endpoint: {
    serviceUriConfigurationKey: "Azure:BlobServiceUri",
    containerConfigurationKey: "ObjectStorage:Container",
    productionSchemes: ["https"],
    emulatorSchemes: ["http", "https"],
    allowsQueryAuth: false,
  },
  redaction: {
    forbiddenData: FORBIDDEN_REDACTED_DATA,
    telemetryDimensions: ["operation", "outcome", "status"],
    logPolicy: "stable-outcome-only",
  },
  health: {
    operation: "container-properties",
    mode: "read-only",
    bounded: true,
    timeoutMs: 2000,
    writes: false,
    enumeration: false,
    readiness: "conditional",
  },
  outage: {
    outcome: "bounded-failure",
    retryBudgetMs: 5000,
    noSilentFallback: true,
    cancellationWins: true,
    readiness: "fail-closed-when-required",
  },
  liveParity: {
    required: true,
    matchingFields: [
      "operations",
      "retry",
      "failureMapping",
      "redaction",
      "health",
      "outage",
    ],
    supportClaimRequires: "passed",
  },
});

function profileChecks(value, label) {
  const checks = requireUniqueStrings(value, label);
  for (const requiredCheck of OBJECT_STORAGE_CONFORMANCE_CHECKS) {
    if (!checks.includes(requiredCheck)) {
      fail(`${label} is missing ${requiredCheck} evidence.`, "incomplete-evidence");
    }
  }

  return checks;
}

function defaultProfileOutcome(id) {
  if (id === "azurite") {
    return "passed";
  }

  return "not-attested";
}

function defaultProfileFailure(id) {
  if (id === "live-azure") {
    return {
      code: "live-evidence-required",
      message: "Live-Azure parity evidence is required before a Supported claim.",
    };
  }

  return {
    code: "infrastructure-error",
    message: "Azurite conformance did not produce a passed outcome.",
  };
}

function createProfile({
  id,
  service,
  version,
  required,
  outcome,
  contractDigest,
  checks,
  failure,
}) {
  const normalizedOutcome = outcome ?? defaultProfileOutcome(id);
  const profile = {
    id,
    service,
    version,
    required,
    outcome: normalizedOutcome,
    contractDigest: null,
    checks: [],
  };

  if (normalizedOutcome === "passed") {
    profile.contractDigest =
      contractDigest ?? sha256(AZURE_BLOB_OBJECT_STORAGE_CONTRACT);
    profile.checks = checks ?? [...OBJECT_STORAGE_CONFORMANCE_CHECKS];
    return profile;
  }

  profile.failure = failure ?? defaultProfileFailure(id);
  return profile;
}

export function createAzureBlobObjectStorageEvidence({
  azurite = {},
  liveAzure = {},
  supportClaims = [],
} = {}) {
  const azuriteProfile = createProfile({
    id: "azurite",
    service: AZURE_BLOB_OBJECT_STORAGE_EMULATOR.name,
    version: AZURE_BLOB_OBJECT_STORAGE_EMULATOR.version,
    required: true,
    ...azurite,
  });
  const liveAzureProfile = createProfile({
    id: "live-azure",
    service: "Azure Blob Storage",
    version: "required-live-service",
    required: true,
    ...liveAzure,
  });
  const evidence = {
    schemaVersion: OBJECT_STORAGE_EVIDENCE_SCHEMA_VERSION,
    provider: {
      capability: "object-storage",
      id: "azure-blob",
    },
    package: { ...AZURE_BLOB_OBJECT_STORAGE_PACKAGE },
    emulator: { ...AZURE_BLOB_OBJECT_STORAGE_EMULATOR },
    maturity: "experimental",
    supportClaims: [...supportClaims],
    contract: AZURE_BLOB_OBJECT_STORAGE_CONTRACT,
    profiles: [azuriteProfile, liveAzureProfile],
    verification: {
      azurite: azuriteProfile.outcome,
      liveAzure: liveAzureProfile.outcome,
      parity: liveAzureProfile.outcome === "passed" ? "passed" : "blocked",
      evidenceDigest: null,
    },
  };
  evidence.verification.evidenceDigest = sha256({
    ...evidence,
    verification: {
      ...evidence.verification,
      evidenceDigest: null,
    },
  });

  return deepFreeze(evidence);
}

function validateContract(value) {
  const contract = requireRecord(value, "object-storage evidence.contract");
  requireString(contract.capability, "object-storage evidence.contract.capability");
  requireString(contract.provider, "object-storage evidence.contract.provider");
  requireString(contract.boundary, "object-storage evidence.contract.boundary");
  requirePositiveInteger(
    contract.maxObjectBytes,
    "object-storage evidence.contract.maxObjectBytes",
  );
  requirePositiveInteger(
    contract.maxMetadataEntries,
    "object-storage evidence.contract.maxMetadataEntries",
  );
  requirePositiveInteger(
    contract.maxMetadataValueBytes,
    "object-storage evidence.contract.maxMetadataValueBytes",
  );
  if (!Array.isArray(contract.operations)) {
    fail("object-storage evidence.contract.operations must be an array.", "invalid-contract");
  }
  const operationIds = contract.operations.map((operation, index) => {
    const item = requireRecord(
      operation,
      `object-storage evidence.contract.operations[${index}]`,
    );
    const id = requireString(
      item.id,
      `object-storage evidence.contract.operations[${index}].id`,
    );
    requireBoolean(
      item.streaming,
      `object-storage evidence.contract.operations[${index}].streaming`,
    );
    requireBoolean(
      item.bounded,
      `object-storage evidence.contract.operations[${index}].bounded`,
    );
    requireBoolean(
      item.cancellable,
      `object-storage evidence.contract.operations[${index}].cancellable`,
    );
    requireUniqueStrings(
      item.contentMetadata,
      `object-storage evidence.contract.operations[${index}].contentMetadata`,
    );
    requireString(
      item.metadata,
      `object-storage evidence.contract.operations[${index}].metadata`,
    );
    requireUniqueStrings(
      item.conditions,
      `object-storage evidence.contract.operations[${index}].conditions`,
    );
    requireString(
      item.retry,
      `object-storage evidence.contract.operations[${index}].retry`,
    );
    return id;
  });
  const expectedOperationIds = OBJECT_STORAGE_OPERATIONS.map(({ id }) => id);
  if (
    !hasSameSequence(operationIds, expectedOperationIds) ||
    contract.operations.some(
      (operation) =>
        operation.bounded !== true || operation.cancellable !== true,
    )
  ) {
    fail(
      "Azure Blob object-storage operations must be bounded and cancellable.",
      "invalid-contract",
    );
  }

  const retry = requireRecord(contract.retry, "object-storage evidence.contract.retry");
  requirePositiveInteger(
    retry.maxAttempts,
    "object-storage evidence.contract.retry.maxAttempts",
  );
  requirePositiveInteger(
    retry.maxDelayMs,
    "object-storage evidence.contract.retry.maxDelayMs",
  );
  if (retry.unsafeWrite !== "never") {
    fail(
      "Azure Blob unsafe writes must not be retried.",
      "unsafe-retry-policy",
    );
  }
  if (retry.conditionalWriteOnly !== true) {
    fail(
      "Azure Blob writes must require conditional retry semantics.",
      "unsafe-retry-policy",
    );
  }
  if (
    !hasSameSequence(retry.retryableStatusCodes, RETRYABLE_STATUS_CODES) ||
    !hasSameSequence(retry.idempotentOperations, IDEMPOTENT_OPERATIONS)
  ) {
    fail(
      "Azure Blob retry policy is not the bounded idempotent policy.",
      "unsafe-retry-policy",
    );
  }

  const authentication = requireRecord(
    contract.authentication,
    "object-storage evidence.contract.authentication",
  );
  if (authentication.policy !== "external-only") {
    fail(
      "Azure Blob credentials must use the external-only policy.",
      "unsafe-credentials",
    );
  }
  requireUniqueStrings(
    authentication.acceptedSources,
    "object-storage evidence.contract.authentication.acceptedSources",
  );
  requireUniqueStrings(
    authentication.forbiddenSources,
    "object-storage evidence.contract.authentication.forbiddenSources",
  );
  for (const source of FORBIDDEN_CREDENTIAL_SOURCES) {
    if (!authentication.forbiddenSources.includes(source)) {
      fail(
        `Azure Blob credential policy must forbid ${source}.`,
        "unsafe-credentials",
      );
    }
  }

  const endpoint = requireRecord(
    contract.endpoint,
    "object-storage evidence.contract.endpoint",
  );
  requireString(
    endpoint.serviceUriConfigurationKey,
    "object-storage evidence.contract.endpoint.serviceUriConfigurationKey",
  );
  requireString(
    endpoint.containerConfigurationKey,
    "object-storage evidence.contract.endpoint.containerConfigurationKey",
  );
  requireUniqueStrings(
    endpoint.productionSchemes,
    "object-storage evidence.contract.endpoint.productionSchemes",
  );
  requireUniqueStrings(
    endpoint.emulatorSchemes,
    "object-storage evidence.contract.endpoint.emulatorSchemes",
  );
  if (endpoint.allowsQueryAuth !== false) {
    fail(
      "Azure Blob endpoint policy must reject query credentials.",
      "unsafe-endpoint",
    );
  }

  const redaction = requireRecord(
    contract.redaction,
    "object-storage evidence.contract.redaction",
  );
  const forbiddenData = requireUniqueStrings(
    redaction.forbiddenData,
    "object-storage evidence.contract.redaction.forbiddenData",
  );
  for (const value of FORBIDDEN_REDACTED_DATA) {
    if (!forbiddenData.includes(value)) {
      fail(
        `Azure Blob redaction evidence must cover ${value}.`,
        "incomplete-redaction",
      );
    }
  }
  requireUniqueStrings(
    redaction.telemetryDimensions,
    "object-storage evidence.contract.redaction.telemetryDimensions",
  );
  requireString(redaction.logPolicy, "object-storage evidence.contract.redaction.logPolicy");

  const health = requireRecord(
    contract.health,
    "object-storage evidence.contract.health",
  );
  requireString(health.operation, "object-storage evidence.contract.health.operation");
  requireBoolean(health.bounded, "object-storage evidence.contract.health.bounded");
  requirePositiveInteger(health.timeoutMs, "object-storage evidence.contract.health.timeoutMs");
  if (
    health.mode !== "read-only" ||
    health.writes !== false ||
    health.enumeration !== false
  ) {
    fail(
      "Azure Blob health must be bounded, read-only, and non-enumerating.",
      "unsafe-health-check",
    );
  }

  const outage = requireRecord(
    contract.outage,
    "object-storage evidence.contract.outage",
  );
  requireString(outage.outcome, "object-storage evidence.contract.outage.outcome");
  requirePositiveInteger(
    outage.retryBudgetMs,
    "object-storage evidence.contract.outage.retryBudgetMs",
  );
  requireBoolean(
    outage.noSilentFallback,
    "object-storage evidence.contract.outage.noSilentFallback",
  );
  requireBoolean(
    outage.cancellationWins,
    "object-storage evidence.contract.outage.cancellationWins",
  );
  if (outage.noSilentFallback !== true || outage.cancellationWins !== true) {
    fail(
      "Azure Blob outage handling must be explicit and cancellation-first.",
      "unsafe-outage-policy",
    );
  }

  const liveParity = requireRecord(
    contract.liveParity,
    "object-storage evidence.contract.liveParity",
  );
  if (liveParity.required !== true || liveParity.supportClaimRequires !== "passed") {
    fail(
      "Azure Blob support requires live-Azure parity evidence.",
      "incomplete-live-parity",
    );
  }
  requireUniqueStrings(
    liveParity.matchingFields,
    "object-storage evidence.contract.liveParity.matchingFields",
  );

  if (canonicalJson(contract) !== canonicalJson(AZURE_BLOB_OBJECT_STORAGE_CONTRACT)) {
    fail(
      "Azure Blob object-storage contract differs from the admitted contract.",
      "invalid-contract",
    );
  }
}

function validateProfile(profile, expected) {
  const value = requireRecord(profile, `object-storage evidence.profiles.${expected.id}`);
  if (value.id !== expected.id || value.service !== expected.service) {
    fail(
      `Object-storage evidence profile ${expected.id} has the wrong identity.`,
      "invalid-profile",
    );
  }
  if (value.version !== expected.version) {
    fail(
      `Object-storage evidence profile ${expected.id} has the wrong service version.`,
      "invalid-profile",
    );
  }
  if (value.required !== true) {
    fail(
      `Object-storage evidence profile ${expected.id} must be required.`,
      "incomplete-profile",
    );
  }
  if (!OBJECT_STORAGE_OUTCOMES.includes(value.outcome)) {
    fail(
      `Object-storage evidence profile ${expected.id} has an invalid outcome.`,
      "invalid-profile",
    );
  }
  if (value.outcome === "passed") {
    if (value.contractDigest !== sha256(AZURE_BLOB_OBJECT_STORAGE_CONTRACT)) {
      fail(
        expected.id === "live-azure"
          ? "Object-storage live-Azure parity evidence does not match the admitted contract."
          : `Object-storage ${expected.id} evidence does not match the admitted contract.`,
        "invalid-profile",
      );
    }
    const checks = profileChecks(
      value.checks,
      `object-storage evidence.profiles.${expected.id}.checks`,
    );
    if (!hasSameSequence(checks, OBJECT_STORAGE_CONFORMANCE_CHECKS)) {
      fail(
        `Object-storage ${expected.id} evidence is missing ordered conformance checks.`,
        "incomplete-profile",
      );
    }
  } else {
    if (value.contractDigest !== null) {
      fail(
        `Object-storage ${expected.id} non-passed evidence cannot carry a contract digest.`,
        "invalid-profile",
      );
    }
    const failure = requireRecord(
      value.failure,
      `object-storage evidence.profiles.${expected.id}.failure`,
    );
    const code = requireString(
      failure.code,
      `object-storage evidence.profiles.${expected.id}.failure.code`,
    );
    requireString(
      failure.message,
      `object-storage evidence.profiles.${expected.id}.failure.message`,
    );
    if (expected.id === "live-azure" && !OBJECT_STORAGE_FAILURE_CODES.has(code)) {
      fail(
        `Object-storage live-Azure failure ${code} is not fail-closed.`,
        "invalid-profile",
      );
    }
  }
}

export function verifyAzureBlobObjectStorageEvidence(evidence) {
  const value = requireRecord(evidence, "object-storage evidence");
  if (value.schemaVersion !== OBJECT_STORAGE_EVIDENCE_SCHEMA_VERSION) {
    fail(
      `Unsupported object-storage evidence schema: ${value.schemaVersion}.`,
      "invalid-evidence",
    );
  }
  const provider = requireRecord(value.provider, "object-storage evidence.provider");
  if (provider.capability !== "object-storage" || provider.id !== "azure-blob") {
    fail(
      "Object-storage evidence must identify the azure-blob provider.",
      "invalid-evidence",
    );
  }
  if (
    canonicalJson(value.package) !== canonicalJson(AZURE_BLOB_OBJECT_STORAGE_PACKAGE)
  ) {
    fail(
      "Object-storage evidence package does not match Azure.Storage.Blobs 12.29.1.",
      "invalid-evidence",
    );
  }
  if (
    canonicalJson(value.emulator) !== canonicalJson(AZURE_BLOB_OBJECT_STORAGE_EMULATOR)
  ) {
    fail(
      "Object-storage evidence emulator does not match Azurite 3.35.0.",
      "invalid-evidence",
    );
  }
  if (value.maturity !== "experimental") {
    fail(
      "Azure Blob evidence must remain Experimental until promoted.",
      "invalid-evidence",
    );
  }
  const supportClaims = requireUniqueStrings(
    value.supportClaims,
    "object-storage evidence.supportClaims",
  );
  validateContract(value.contract);
  if (!Array.isArray(value.profiles) || value.profiles.length !== 2) {
    fail(
      "Azure Blob evidence must include Azurite and live-Azure profiles.",
      "incomplete-live-parity",
    );
  }
  const profiles = new Map(value.profiles.map((profile) => [profile?.id, profile]));
  const azurite = profiles.get("azurite");
  const liveAzure = profiles.get("live-azure");
  if (azurite === undefined || liveAzure === undefined) {
    fail(
      "Azure Blob evidence must include both required provider profiles.",
      "incomplete-live-parity",
    );
  }
  validateProfile(azurite, {
    id: "azurite",
    service: AZURE_BLOB_OBJECT_STORAGE_EMULATOR.name,
    version: AZURE_BLOB_OBJECT_STORAGE_EMULATOR.version,
  });
  validateProfile(liveAzure, {
    id: "live-azure",
    service: "Azure Blob Storage",
    version: "required-live-service",
  });

  const verification = requireRecord(
    value.verification,
    "object-storage evidence.verification",
  );
  if (
    verification.azurite !== azurite.outcome ||
    verification.liveAzure !== liveAzure.outcome
  ) {
    fail(
      "Object-storage evidence verification does not match provider outcomes.",
      "invalid-evidence",
    );
  }
  const liveParity = liveAzure.outcome === "passed" ? "passed" : "blocked";
  if (verification.parity !== liveParity) {
    fail(
      "Object-storage evidence parity outcome is inconsistent.",
      "invalid-evidence",
    );
  }
  if (
    liveAzure.outcome === "passed" &&
    liveAzure.contractDigest !== azurite.contractDigest
  ) {
    fail(
      "Object-storage live-Azure parity evidence does not match Azurite.",
      "live-parity-mismatch",
    );
  }
  if (supportClaims.length > 0 && liveParity !== "passed") {
    fail(
      "Object-storage support claims require passed live-Azure parity evidence.",
      "support-claim",
    );
  }
  const digest = verification.evidenceDigest;
  if (
    typeof digest !== "string" ||
    digest !==
      sha256({
        ...value,
        verification: {
          ...verification,
          evidenceDigest: null,
        },
      })
  ) {
    fail(
      "Object-storage evidence digest does not match its immutable content.",
      "invalid-evidence",
    );
  }

  return {
    status: "passed",
    provider: "azure-blob",
    supportStatus: liveParity === "passed" ? "eligible" : "blocked",
    liveParity: liveAzure.outcome,
    contractDigest: sha256(value.contract),
  };
}

export function validateAzureBlobObjectStorageConfiguration(configuration) {
  const value = requireRecord(configuration, "Azure Blob configuration");
  const serviceUri = requireString(value.serviceUri, "Azure Blob serviceUri");
  const container = requireString(value.container, "Azure Blob container");
  const credentialSource = requireString(
    value.credentialSource,
    "Azure Blob credentialSource",
  );
  const environment = requireString(value.environment, "Azure Blob environment").toLowerCase();
  if (!SAFE_ENVIRONMENTS.has(environment)) {
    fail(`Unsupported Azure Blob environment: ${environment}.`, "invalid-configuration");
  }
  if (!CREDENTIAL_SOURCES.has(credentialSource)) {
    fail(
      `Unsupported Azure Blob credential source: ${credentialSource}.`,
      "invalid-configuration",
    );
  }
  if (!CONTAINER_PATTERN.test(container)) {
    fail("Azure Blob container must be a lowercase storage-container name.", "invalid-configuration");
  }

  let parsed;
  try {
    parsed = new URL(serviceUri);
  } catch (error) {
    if (error instanceof TypeError) {
      fail("Azure Blob serviceUri must be an absolute URI.", "invalid-configuration");
    }
    throw error;
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    fail(
      "Azure Blob serviceUri must not contain credentials, query secrets, or fragments.",
      "unsafe-endpoint",
    );
  }
  if (!ALLOWED_ENDPOINT_PROTOCOLS.has(parsed.protocol)) {
    fail(
      "Azure Blob serviceUri must use http or https.",
      "unsafe-endpoint",
    );
  }
  if (environment === "production" && parsed.protocol !== "https:") {
    fail("Azure Blob production serviceUri must use https.", "unsafe-endpoint");
  }
  if (
    environment !== "production" &&
    parsed.protocol === "http:" &&
    !LOCAL_EMULATOR_HOSTS.has(parsed.hostname)
  ) {
    fail(
      "Azure Blob http serviceUri is restricted to a local emulator.",
      "unsafe-endpoint",
    );
  }
  if (environment === "production" && credentialSource === "emulator-shared-key") {
    fail(
      "Azure Blob emulator credentials are not valid in production.",
      "unsafe-credentials",
    );
  }

  return {
    serviceUri,
    container,
    credentialSource,
    environment,
  };
}

export function mapAzureBlobFailure({
  status = undefined,
  errorCode = undefined,
  cancelled = false,
} = {}) {
  if (cancelled) {
    return { outcome: "cancelled", retryable: false };
  }
  if (status === 404 || errorCode === "BlobNotFound") {
    return { outcome: "not-found", retryable: false };
  }
  if (status === 412 || errorCode === "ConditionNotMet") {
    return { outcome: "precondition-failed", retryable: false };
  }
  if (status === 409) {
    return { outcome: "conflict", retryable: false };
  }
  if (status === 401 || status === 403) {
    return { outcome: "unauthorized", retryable: false };
  }
  if (status === 400) {
    return { outcome: "invalid-request", retryable: false };
  }
  if (RETRYABLE_STATUS_CODES.includes(status)) {
    return { outcome: "unavailable", retryable: true };
  }

  return { outcome: "provider-failure", retryable: false };
}
