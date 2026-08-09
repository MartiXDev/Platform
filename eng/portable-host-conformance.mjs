import {
  canonicalJson,
  sha256,
  validateDeploymentManifest,
} from "./deployment-manifest.mjs";

export const PORTABLE_HOST_CONFORMANCE_SCHEMA_VERSION = "1.0.0";
export const PORTABLE_HOST_CONFORMANCE_SCHEMA_URI =
  "https://github.com/MartiXDev/Platform/schemas/portable-host-conformance.schema.json";

export const PORTABLE_HOST_CHECKS = Object.freeze([
  "artifactIdentity",
  "runnable",
  "externalConfiguration",
  "migrationOrdering",
  "readiness",
  "liveness",
  "gracefulShutdown",
  "restart",
  "permissions",
  "networking",
  "failureBehavior",
]);

const COMBINATION_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: "linux-container",
    profile: "container",
    kind: "oci-image",
    operatingSystem: "linux",
    distribution: "oci",
    osVersion: "linux",
    runtime: "net10.0",
    rid: "linux-x64",
    adapter: "oci",
  }),
  Object.freeze({
    id: "linux-process",
    profile: "process",
    kind: "archive",
    operatingSystem: "linux",
    distribution: "ubuntu",
    osVersion: "24.04",
    runtime: "net10.0",
    rid: "linux-x64",
    adapter: "nginx-systemd",
  }),
  Object.freeze({
    id: "ubuntu-26.04",
    profile: "process",
    kind: "archive",
    operatingSystem: "linux",
    distribution: "ubuntu",
    osVersion: "26.04",
    runtime: "net10.0",
    rid: "linux-x64",
    adapter: "nginx-systemd",
  }),
  Object.freeze({
    id: "windows-process",
    profile: "process",
    kind: "archive",
    operatingSystem: "windows",
    distribution: "windows-server",
    osVersion: "2022",
    runtime: "net10.0",
    rid: "win-x64",
    adapter: "iis",
  }),
]);

export const PORTABLE_HOST_COMBINATIONS = Object.freeze(
  COMBINATION_DEFINITIONS.map((definition) => Object.freeze({ ...definition })),
);

export const PORTABLE_HOST_PLANNED_TARGETS = Object.freeze([
  Object.freeze({
    id: "active24-ubuntu-vps",
    provider: "active24",
    maturity: "planned",
    attestation: "not-attested",
  }),
]);

const DEFAULT_ARTIFACT_DIGESTS = Object.freeze({
  "linux-container": `sha256:${"3".repeat(64)}`,
  "linux-process": `sha256:${"4".repeat(64)}`,
  "ubuntu-26.04": `sha256:${"4".repeat(64)}`,
  "windows-process": `sha256:${"5".repeat(64)}`,
});
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;
const IDENTIFIER_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const SECRET_KEY_PATTERN =
  /(?:secret|password|token|private.?key|access.?key|api.?key|credential)/i;

export class PortableHostConformanceError extends Error {
  constructor(message, code = "invalid-host-conformance") {
    super(message);
    this.name = "PortableHostConformanceError";
    this.code = code;
  }
}

function fail(message, code = "invalid-host-conformance") {
  throw new PortableHostConformanceError(message, code);
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

function requireIdentifier(value, label) {
  const identifier = requireString(value, label);
  if (!IDENTIFIER_PATTERN.test(identifier)) {
    fail(`${label} must be a lowercase Platform identifier.`, "invalid-input");
  }
  return identifier;
}

function requireDigest(value, label) {
  const digest = requireString(value, label);
  if (!DIGEST_PATTERN.test(digest)) {
    fail(`${label} must be a sha256 digest.`, "invalid-identity");
  }
  return digest;
}

function requireBoolean(value, label) {
  if (typeof value !== "boolean") {
    fail(`${label} must be a boolean.`, "invalid-input");
  }
  return value;
}

function requireArray(value, label) {
  if (!Array.isArray(value)) {
    fail(`${label} must be an array.`, "invalid-input");
  }
  return value;
}

function rejectUnknownProperties(value, allowed, label) {
  for (const property of Object.keys(value)) {
    if (!allowed.includes(property)) {
      fail(`${label}.${property} is not part of the Portable Host Conformance contract.`);
    }
  }
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

function deepClone(value) {
  return structuredClone(value);
}

function assertSecretFree(value, path = "host conformance") {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertSecretFree(item, `${path}[${index}]`),
    );
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (SECRET_KEY_PATTERN.test(key)) {
      fail(`${path}.${key} is not allowed in host conformance evidence.`, "secret-input");
    }
    assertSecretFree(child, `${path}.${key}`);
  }
}

function checkRecord() {
  return Object.fromEntries(PORTABLE_HOST_CHECKS.map((check) => [check, true]));
}

function configurationProjection(manifest) {
  return {
    schemaVersion: manifest.configuration.schemaVersion,
    digest: manifest.identity.configurationSchemaDigest,
    keys: manifest.configuration.entries.map((entry) => entry.key),
  };
}

function migrationProjection(manifest) {
  return {
    resource: manifest.migration.resource,
    order: [...manifest.migration.order],
    beforeServing: [...manifest.migration.beforeServing],
    concurrency: manifest.migration.concurrency,
  };
}

function artifactFor(manifest, profile) {
  const artifact = manifest.artifacts.find((candidate) => candidate.profile === profile);
  if (artifact === undefined) {
    fail(`No Deployment Manifest artifact exists for profile ${profile}.`, "invalid-artifact");
  }
  return artifact;
}

function expectedDefinition(id) {
  return COMBINATION_DEFINITIONS.find((definition) => definition.id === id);
}

function combinationDefinitionMatches(value, definition) {
  const exactProperties =
    definition.id === "ubuntu-26.04"
      ? ["operatingSystem", "distribution", "osVersion", "runtime", "rid"]
      : [
          "profile",
          "kind",
          "operatingSystem",
          "distribution",
          "osVersion",
          "runtime",
          "rid",
        ];
  if (
    exactProperties.some(
      (property) => value[property] !== definition[property],
    )
  ) {
    return false;
  }
  if (definition.id === "ubuntu-26.04") {
    return (
      (value.profile === "process" &&
        value.kind === "archive" &&
        value.adapter === "nginx-systemd") ||
      (value.profile === "container" &&
        value.kind === "oci-image" &&
        value.adapter === "oci")
    );
  }
  return value.adapter === definition.adapter;
}

function expectedArtifactMetadata(manifest, profile) {
  const artifact = artifactFor(manifest, profile);
  return {
    sourceDigest: artifact.digest,
    sourceRevision: manifest.identity.sourceRevision,
    platformContractVersion: manifest.identity.platformContractVersion,
    topologyDigest: manifest.identity.topologyDigest,
    configurationSchemaDigest: manifest.identity.configurationSchemaDigest,
  };
}

function evidenceDigest(value) {
  return sha256({
    ...value,
    verification: {
      ...value.verification,
      evidenceDigest: null,
    },
  });
}

function normalizePlannedTargets(value) {
  const targets = requireArray(value, "plannedTargets");
  if (targets.length !== PORTABLE_HOST_PLANNED_TARGETS.length) {
    fail("Host conformance must retain the un-attested Active24 target.", "incomplete-evidence");
  }
  return targets.map((target, index) => {
    const label = `plannedTargets[${index}]`;
    requireRecord(target, label);
    rejectUnknownProperties(
      target,
      ["id", "provider", "maturity", "attestation"],
      label,
    );
    for (const property of ["id", "provider", "maturity", "attestation"]) {
      requireString(target[property], `${label}.${property}`);
    }
    const expected = PORTABLE_HOST_PLANNED_TARGETS[index];
    if (canonicalJson(target) !== canonicalJson(expected)) {
      fail(
        "Active24 must remain Planned / Not Attested until a real target passes admission.",
        "support-claim",
      );
    }
    return target;
  });
}

function normalizeChecks(value, label) {
  requireRecord(value, label);
  rejectUnknownProperties(value, PORTABLE_HOST_CHECKS, label);
  for (const check of PORTABLE_HOST_CHECKS) {
    if (!Object.hasOwn(value, check)) {
      fail(`${label}.${check} is required for host conformance evidence.`, "incomplete-evidence");
    }
    if (!requireBoolean(value[check], `${label}.${check}`)) {
      fail(`${label}.${check} failed; host conformance is fail-closed.`, "failed-conformance");
    }
  }
  return value;
}

function normalizeArtifact(value, manifest, profile, label) {
  requireRecord(value, label);
  rejectUnknownProperties(
    value,
    [
      "digest",
      "sourceDigest",
      "sourceRevision",
      "platformContractVersion",
      "topologyDigest",
      "configurationSchemaDigest",
    ],
    label,
  );
  const artifact = {
    digest: requireDigest(value.digest, `${label}.digest`),
    sourceDigest: requireDigest(value.sourceDigest, `${label}.sourceDigest`),
    sourceRevision: requireString(value.sourceRevision, `${label}.sourceRevision`),
    platformContractVersion: requireString(
      value.platformContractVersion,
      `${label}.platformContractVersion`,
    ),
    topologyDigest: requireDigest(
      value.topologyDigest,
      `${label}.topologyDigest`,
    ),
    configurationSchemaDigest: requireDigest(
      value.configurationSchemaDigest,
      `${label}.configurationSchemaDigest`,
    ),
  };
  const expected = expectedArtifactMetadata(manifest, profile);
  if (canonicalJson(artifact) !== canonicalJson({ ...artifact, ...expected })) {
    fail(
      `${label} is not bound to the selected ${profile} Deployment Manifest artifact.`,
      "drift-detected",
    );
  }
  return artifact;
}

function normalizeCombination(value, manifest, index) {
  const label = `combinations[${index}]`;
  requireRecord(value, label);
  rejectUnknownProperties(
    value,
    [
      "id",
      "profile",
      "kind",
      "operatingSystem",
      "distribution",
      "osVersion",
      "runtime",
      "rid",
      "adapter",
      "artifact",
      "checks",
    ],
    label,
  );
  const id = requireIdentifier(value.id, `${label}.id`);
  const definition = expectedDefinition(id);
  if (definition === undefined || !combinationDefinitionMatches(value, definition)) {
    fail(
      `${label} declares an unsupported OS/RID/runtime or host adapter combination.`,
      "unsupported-combination",
    );
  }
  for (const property of [
    "profile",
    "kind",
    "operatingSystem",
    "distribution",
    "osVersion",
    "runtime",
    "rid",
    "adapter",
  ]) {
    requireString(value[property], `${label}.${property}`);
  }
  const artifact = normalizeArtifact(
    value.artifact,
    manifest,
    value.profile,
    `${label}.artifact`,
  );
  const checks = normalizeChecks(value.checks, `${label}.checks`);
  return {
    id,
    profile: value.profile,
    kind: value.kind,
    operatingSystem: value.operatingSystem,
    distribution: value.distribution,
    osVersion: value.osVersion,
    runtime: value.runtime,
    rid: value.rid,
    adapter: value.adapter,
    artifact,
    checks,
  };
}

function normalizeConformance(manifest, value) {
  const normalizedManifest = validateDeploymentManifest(manifest);
  requireRecord(value, "portable host conformance");
  assertSecretFree(value);
  rejectUnknownProperties(
    value,
    [
      "$schema",
      "schemaVersion",
      "solution",
      "source",
      "manifestDigest",
      "topologyDigest",
      "configurationSchemaDigest",
      "configuration",
      "migration",
      "outcome",
      "failClosed",
      "combinations",
      "plannedTargets",
      "supportClaims",
      "verification",
    ],
    "portable host conformance",
  );
  if (
    value.$schema !== PORTABLE_HOST_CONFORMANCE_SCHEMA_URI ||
    value.schemaVersion !== PORTABLE_HOST_CONFORMANCE_SCHEMA_VERSION
  ) {
    fail("Unsupported Portable Host Conformance schema version.", "invalid-schema");
  }
  requireString(value.solution, "solution");
  const source = requireRecord(value.source, "source");
  rejectUnknownProperties(source, ["manifest"], "source");
  if (source.manifest !== "../DeploymentManifestGeneratedSolution/deployment-manifest.json") {
    fail("Portable Host Conformance must consume the Deployment Manifest fixture.", "invalid-source");
  }
  for (const [property, expected] of [
    ["manifestDigest", normalizedManifest.identity.manifestDigest],
    ["topologyDigest", normalizedManifest.identity.topologyDigest],
    [
      "configurationSchemaDigest",
      normalizedManifest.identity.configurationSchemaDigest,
    ],
  ]) {
    if (requireDigest(value[property], property) !== expected) {
      fail(`${property} does not identify the validated Deployment Manifest.`, "drift-detected");
    }
  }
  if (value.outcome !== "passed" || value.failClosed !== true) {
    fail("Portable Host Conformance must be a passed fail-closed record.", "invalid-evidence");
  }
  const configuration = requireRecord(value.configuration, "configuration");
  rejectUnknownProperties(configuration, ["schemaVersion", "digest", "keys"], "configuration");
  if (canonicalJson(configuration) !== canonicalJson(configurationProjection(normalizedManifest))) {
    fail("Host configuration evidence drifted from the Deployment Manifest.", "drift-detected");
  }
  const migration = requireRecord(value.migration, "migration");
  rejectUnknownProperties(
    migration,
    ["resource", "order", "beforeServing", "concurrency"],
    "migration",
  );
  if (canonicalJson(migration) !== canonicalJson(migrationProjection(normalizedManifest))) {
    fail("Host migration evidence drifted from the Deployment Manifest.", "drift-detected");
  }
  const combinations = requireArray(value.combinations, "combinations");
  if (
    combinations.length !== COMBINATION_DEFINITIONS.length ||
    new Set(combinations.map((combination) => combination?.id)).size !==
      combinations.length ||
    COMBINATION_DEFINITIONS.some(
      (definition) =>
        !combinations.some((combination) => combination?.id === definition.id),
    )
  ) {
    fail(
      "Portable Host Conformance must cover every admitted Windows/Linux process and OCI combination.",
      "incomplete-evidence",
    );
  }
  const normalizedCombinations = combinations.map((combination, index) =>
    normalizeCombination(combination, normalizedManifest, index),
  );
  const plannedTargets = normalizePlannedTargets(value.plannedTargets);
  if (!Array.isArray(value.supportClaims) || value.supportClaims.length !== 0) {
    fail("Portable Host Conformance cannot make a Supported claim.", "support-claim");
  }
  const verification = requireRecord(value.verification, "verification");
  rejectUnknownProperties(verification, ["evidenceDigest"], "verification");
  if (requireDigest(verification.evidenceDigest, "verification.evidenceDigest") !== evidenceDigest(value)) {
    fail("Portable Host Conformance evidence digest does not match its immutable content.", "invalid-evidence");
  }
  return {
    ...value,
    manifest: normalizedManifest,
    combinations: normalizedCombinations,
    plannedTargets,
  };
}

export function createPortableHostConformance({
  manifest,
  artifactDigests = DEFAULT_ARTIFACT_DIGESTS,
  plannedTargets = PORTABLE_HOST_PLANNED_TARGETS,
} = {}) {
  const normalizedManifest = validateDeploymentManifest(manifest);
  const combinations = COMBINATION_DEFINITIONS.map((definition) => {
    const sourceArtifact = artifactFor(normalizedManifest, definition.profile);
    const digest = artifactDigests[definition.id];
    if (digest === undefined) {
      fail(`No digest was supplied for ${definition.id}.`, "invalid-artifact");
    }
    return {
      ...definition,
      artifact: {
        digest: requireDigest(digest, `${definition.id}.artifact.digest`),
        sourceDigest: sourceArtifact.digest,
        sourceRevision: normalizedManifest.identity.sourceRevision,
        platformContractVersion: normalizedManifest.identity.platformContractVersion,
        topologyDigest: normalizedManifest.identity.topologyDigest,
        configurationSchemaDigest:
          normalizedManifest.identity.configurationSchemaDigest,
      },
      checks: checkRecord(),
    };
  });
  const value = {
    $schema: PORTABLE_HOST_CONFORMANCE_SCHEMA_URI,
    schemaVersion: PORTABLE_HOST_CONFORMANCE_SCHEMA_VERSION,
    solution: "PortableHostConformanceGeneratedSolution",
    source: {
      manifest: "../DeploymentManifestGeneratedSolution/deployment-manifest.json",
    },
    manifestDigest: normalizedManifest.identity.manifestDigest,
    topologyDigest: normalizedManifest.identity.topologyDigest,
    configurationSchemaDigest: normalizedManifest.identity.configurationSchemaDigest,
    configuration: configurationProjection(normalizedManifest),
    migration: migrationProjection(normalizedManifest),
    outcome: "passed",
    failClosed: true,
    combinations,
    plannedTargets: deepClone(plannedTargets),
    supportClaims: [],
    verification: {
      evidenceDigest: null,
    },
  };
  value.verification.evidenceDigest = evidenceDigest(value);
  return deepFreeze(value);
}

export function verifyPortableHostConformance(manifest, conformance) {
  const normalized = normalizeConformance(manifest, conformance);
  return {
    status: "passed",
    solution: normalized.solution,
    manifestDigest: normalized.manifest.identity.manifestDigest,
    topologyDigest: normalized.manifest.identity.topologyDigest,
    combinations: normalized.combinations.map((combination) => ({
      id: combination.id,
      profile: combination.profile,
      operatingSystem: combination.operatingSystem,
      rid: combination.rid,
    })),
    active24: normalized.plannedTargets[0],
    evidenceDigest: normalized.verification.evidenceDigest,
  };
}

export const validatePortableHostConformance = verifyPortableHostConformance;

export function evaluatePortableHostConformance({ manifest, conformance } = {}) {
  try {
    return {
      status: "passed",
      evidence: verifyPortableHostConformance(manifest, conformance),
    };
  } catch (error) {
    if (!(error instanceof PortableHostConformanceError)) {
      throw error;
    }
    return {
      status: "failed",
      failClosed: true,
      error: {
        code: error.code,
        message: error.message,
      },
    };
  }
}
