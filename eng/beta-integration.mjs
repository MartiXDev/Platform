import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { z } from "zod";
import { AUTHENTICATION_PROFILE_IDS } from "./authentication-profile.mjs";
import {
  FULL_STACK_UI_PROVIDERS,
} from "./full-stack-ui-contract.mjs";
import { LOCAL_ORCHESTRATION_PROFILES } from "./local-orchestration.mjs";
import {
  PLATFORM_MIGRATION_TARGET_VERSION,
} from "./platform-migration.mjs";
import {
  PROVIDER_ADMISSION_CATALOG,
} from "./provider-admission.mjs";

export const BETA_INTEGRATION_SCHEMA_VERSION = "1.0.0";
export const BETA_INTEGRATION_SCHEMA_URI =
  "https://github.com/MartiXDev/Platform/schemas/beta-integration.schema.json";
export const BETA_INTEGRATION_SOLUTION_NAME =
  "BetaIntegrationGeneratedSolution";
export const BETA_INTEGRATION_SOLUTION_ROOT =
  `tests/fixtures/${BETA_INTEGRATION_SOLUTION_NAME}`;
export const BETA_INTEGRATION_TARGET_VERSION =
  PLATFORM_MIGRATION_TARGET_VERSION;

export const BETA_REQUIRED_PRESETS = Object.freeze([
  "api",
  "modular-monolith",
  "full-stack",
]);
export const BETA_REQUIRED_ENDPOINT_MODELS = Object.freeze([
  "minimal-api",
  "fastendpoints",
]);
export const BETA_REQUIRED_RELATIONAL_PROVIDERS = Object.freeze([
  "postgresql",
  "sqlserver",
]);
export const BETA_REQUIRED_AUTHENTICATION_PROFILES = Object.freeze([
  ...AUTHENTICATION_PROFILE_IDS,
]);
export const BETA_REQUIRED_UI_PROVIDERS = Object.freeze([
  ...FULL_STACK_UI_PROVIDERS,
]);
export const BETA_REQUIRED_INFRASTRUCTURE_PROVIDERS = Object.freeze(
  PROVIDER_ADMISSION_CATALOG.map(({ capability, id }) =>
    Object.freeze({ capability, id }),
  ),
);
export const BETA_REQUIRED_DEPLOYMENT_PROFILES = Object.freeze([
  "process",
  "oci",
  ...LOCAL_ORCHESTRATION_PROFILES,
]);
export const BETA_NOT_ATTESTED_SCOPE = Object.freeze([
  "active24",
  "native-mobile",
]);
export const BETA_ALLOWED_POST_FREEZE_CHANGES = Object.freeze([
  "defect",
  "evidence-gap",
  "release-blocker",
]);
export const BETA_PROHIBITED_POST_FREEZE_CHANGES = Object.freeze([
  "feature",
  "provider",
]);

const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;
const SECRET_KEY_PATTERN =
  /(?:secret|password|token|private.?key|access.?key|api.?key|credential)/i;
const COVERAGE_STATUSES = new Set(["passed"]);
const CHANGE_IMPACTS = new Set(["patch", "minor", "major"]);
const MIGRATION_DISPOSITIONS = new Set(["none", "optional", "required"]);
const MATRIX_AXIS_NAMES = Object.freeze([
  "presets",
  "endpointModels",
  "relationalProviders",
  "authenticationProfiles",
  "uiProviders",
  "infrastructureProviders",
  "deploymentProfiles",
]);
const EVIDENCE_SECTION_NAMES = Object.freeze([
  "presets",
  "endpointModels",
  "relationalProviders",
  "authenticationProfiles",
  "uiProviders",
  "infrastructureProviders",
  "deploymentProfiles",
]);

export class BetaIntegrationError extends Error {
  constructor(message, code = "invalid-beta-integration") {
    super(message);
    this.name = "BetaIntegrationError";
    this.code = code;
  }
}

function fail(message, code = "invalid-beta-integration") {
  throw new BetaIntegrationError(message, code);
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

function requireArray(value, label) {
  if (!Array.isArray(value)) {
    fail(`${label} must be an array.`);
  }
  return value;
}

function requireBoolean(value, label) {
  if (typeof value !== "boolean") {
    fail(`${label} must be a boolean.`);
  }
  return value;
}

function requireDigest(value, label) {
  const digest = requireString(value, label);
  if (!DIGEST_PATTERN.test(digest)) {
    fail(`${label} must be a sha256 digest.`);
  }
  return digest;
}

function requireUniqueStrings(value, label) {
  const values = requireArray(value, label).map((item, index) =>
    requireString(item, `${label}[${index}]`),
  );
  if (new Set(values).size !== values.length) {
    fail(`${label} must contain unique values.`);
  }
  return values;
}

function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item));
  }
  if (!isRecord(value)) {
    return value;
  }
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

export function sha256(value) {
  return `sha256:${createHash("sha256").update(
    typeof value === "string" ? value : canonicalJson(value),
  ).digest("hex")}`;
}

function assertSecretFree(value, path = "beta integration") {
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
      fail(`${path}.${key} is not allowed in beta integration evidence.`, "secret-input");
    }
    assertSecretFree(child, `${path}.${key}`);
  }
}

function validateClosedObjectSchemas(value, path) {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      validateClosedObjectSchemas(item, `${path}[${index}]`),
    );
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  if (value.type === "object" && value.additionalProperties !== false) {
    fail(`${path}.additionalProperties must be false.`, "invalid-schema");
  }
  for (const [key, child] of Object.entries(value)) {
    validateClosedObjectSchemas(child, `${path}.${key}`);
  }
}

function validateSchema(fixture, schema) {
  requireRecord(schema, "beta integration schema");
  if (
    schema.$id !== BETA_INTEGRATION_SCHEMA_URI ||
    schema.type !== "object"
  ) {
    fail("Beta integration schema identity is invalid.", "invalid-schema");
  }
  assertSecretFree(schema, "schemas/beta-integration.schema.json");
  validateClosedObjectSchemas(schema, "schemas/beta-integration.schema.json");
  const result = z.fromJSONSchema(schema).safeParse(fixture);
  if (!result.success) {
    const issue = result.error.issues[0];
    fail(
      `Beta integration schema rejected ${issue.path.join(".") || "the fixture"}: ${issue.message}.`,
      "invalid-schema",
    );
  }
}

function requireExactStrings(actual, expected, label) {
  const values = requireUniqueStrings(actual, label);
  if (JSON.stringify(values) !== JSON.stringify(expected)) {
    fail(
      `${label} must be exactly ${JSON.stringify(expected)}.`,
    );
  }
  return values;
}

function providerKey(provider) {
  return `${provider.capability}:${provider.id}`;
}

function requireProvider(value, label) {
  const provider = requireRecord(value, label);
  const capability = requireString(provider.capability, `${label}.capability`);
  const id = requireString(provider.id, `${label}.id`);
  return { capability, id };
}

function requireProviderList(value, expected, label) {
  const providers = requireArray(value, label).map((item, index) =>
    requireProvider(item, `${label}[${index}]`),
  );
  if (
    JSON.stringify(providers.map(providerKey)) !==
    JSON.stringify(expected.map(providerKey))
  ) {
    fail(`${label} must contain the complete admitted provider catalog.`);
  }
  return providers;
}

function requireEvidence(value, label) {
  const paths = requireUniqueStrings(value, label);
  for (const path of paths) {
    if (path.startsWith("/") || path.includes("..")) {
      fail(`${label} must contain repository-relative paths.`);
    }
  }
  return paths;
}

function requireCoverageEntry(value, label) {
  const entry = requireRecord(value, label);
  const id = requireString(entry.id, `${label}.id`);
  if (!COVERAGE_STATUSES.has(entry.status)) {
    fail(`${label}.status must be passed.`);
  }
  const evidence = requireEvidence(entry.evidence, `${label}.evidence`);
  return { id, evidence };
}

function requireCoverageEntries(value, expectedIds, label) {
  const entries = requireArray(value, label).map((entry, index) =>
    requireCoverageEntry(entry, `${label}[${index}]`),
  );
  if (
    JSON.stringify(entries.map(({ id }) => id)) !==
    JSON.stringify(expectedIds)
  ) {
    fail(`${label} must cover every required value exactly once.`);
  }
  return entries;
}

function requireProviderCoverageEntries(value, expectedProviders, label) {
  const entries = requireArray(value, label).map((entry, index) => {
    const item = requireRecord(entry, `${label}[${index}]`);
    const provider = requireProvider(item, `${label}[${index}]`);
    const base = requireCoverageEntry(item, `${label}[${index}]`);
    requireString(item.preset, `${label}[${index}].preset`);
    return { ...provider, ...base, preset: item.preset };
  });
  if (
    JSON.stringify(entries.map(providerKey)) !==
    JSON.stringify(expectedProviders.map(providerKey))
  ) {
    fail(`${label} must cover every admitted provider exactly once.`);
  }
  return entries;
}

function verifyMatrix(matrix) {
  const value = requireRecord(matrix, "betaIntegration.matrix");
  if (value.strategy !== "risk-based-covering-array") {
    fail("betaIntegration.matrix.strategy must be risk-based-covering-array.");
  }
  const axes = requireRecord(value.axes, "betaIntegration.matrix.axes");
  requireExactStrings(axes.presets, BETA_REQUIRED_PRESETS, "matrix.axes.presets");
  requireExactStrings(
    axes.endpointModels,
    BETA_REQUIRED_ENDPOINT_MODELS,
    "matrix.axes.endpointModels",
  );
  requireExactStrings(
    axes.relationalProviders,
    BETA_REQUIRED_RELATIONAL_PROVIDERS,
    "matrix.axes.relationalProviders",
  );
  requireExactStrings(
    axes.authenticationProfiles,
    BETA_REQUIRED_AUTHENTICATION_PROFILES,
    "matrix.axes.authenticationProfiles",
  );
  requireExactStrings(
    axes.uiProviders,
    BETA_REQUIRED_UI_PROVIDERS,
    "matrix.axes.uiProviders",
  );
  requireProviderList(
    axes.infrastructureProviders,
    BETA_REQUIRED_INFRASTRUCTURE_PROVIDERS,
    "matrix.axes.infrastructureProviders",
  );
  requireExactStrings(
    axes.deploymentProfiles,
    BETA_REQUIRED_DEPLOYMENT_PROFILES,
    "matrix.axes.deploymentProfiles",
  );

  const coverage = requireRecord(value.coverage, "betaIntegration.matrix.coverage");
  const coverageResult = {
    presets: requireCoverageEntries(
      coverage.presets,
      BETA_REQUIRED_PRESETS,
      "matrix.coverage.presets",
    ),
    endpointModels: requireCoverageEntries(
      coverage.endpointModels,
      BETA_REQUIRED_ENDPOINT_MODELS,
      "matrix.coverage.endpointModels",
    ),
    relationalProviders: requireCoverageEntries(
      coverage.relationalProviders,
      BETA_REQUIRED_RELATIONAL_PROVIDERS,
      "matrix.coverage.relationalProviders",
    ),
    authenticationProfiles: requireCoverageEntries(
      coverage.authenticationProfiles,
      BETA_REQUIRED_AUTHENTICATION_PROFILES,
      "matrix.coverage.authenticationProfiles",
    ),
    uiProviders: requireCoverageEntries(
      coverage.uiProviders,
      BETA_REQUIRED_UI_PROVIDERS,
      "matrix.coverage.uiProviders",
    ),
    infrastructureProviders: requireProviderCoverageEntries(
      coverage.infrastructureProviders,
      BETA_REQUIRED_INFRASTRUCTURE_PROVIDERS,
      "matrix.coverage.infrastructureProviders",
    ),
    deploymentProfiles: requireCoverageEntries(
      coverage.deploymentProfiles,
      BETA_REQUIRED_DEPLOYMENT_PROFILES,
      "matrix.coverage.deploymentProfiles",
    ),
  };

  const coordinates = requireArray(
    value.coordinates,
    "betaIntegration.matrix.coordinates",
  ).map((coordinate, index) => {
    const item = requireRecord(
      coordinate,
      `matrix.coordinates[${index}]`,
    );
    const label = `matrix.coordinates[${index}]`;
    const id = requireString(item.id, `${label}.id`);
    requireString(item.preset, `${label}.preset`);
    requireString(item.endpointModel, `${label}.endpointModel`);
    if (
      item.relationalProvider !== null &&
      !BETA_REQUIRED_RELATIONAL_PROVIDERS.includes(item.relationalProvider)
    ) {
      fail(`${label}.relationalProvider is not an admitted relational provider.`);
    }
    if (
      item.authenticationProfile !== null &&
      !BETA_REQUIRED_AUTHENTICATION_PROFILES.includes(
        item.authenticationProfile,
      )
    ) {
      fail(`${label}.authenticationProfile is not an initial authentication profile.`);
    }
    if (
      item.uiProvider !== null &&
      !BETA_REQUIRED_UI_PROVIDERS.includes(item.uiProvider)
    ) {
      fail(`${label}.uiProvider is not an admitted UI provider.`);
    }
    const infrastructureProviders = requireArray(
      item.infrastructureProviders,
      `${label}.infrastructureProviders`,
    ).map((provider, providerIndex) =>
      requireProvider(provider, `${label}.infrastructureProviders[${providerIndex}]`),
    );
    const infrastructureKeys = infrastructureProviders.map(providerKey);
    if (new Set(infrastructureKeys).size !== infrastructureKeys.length) {
      fail(`${label}.infrastructureProviders must be unique.`);
    }
    if (
      infrastructureProviders.some(
        (provider) =>
          !BETA_REQUIRED_INFRASTRUCTURE_PROVIDERS.some(
            (expected) => providerKey(expected) === providerKey(provider),
          ),
      )
    ) {
      fail(`${label}.infrastructureProviders contains an unadmitted provider.`);
    }
    const deploymentProfiles = requireUniqueStrings(
      item.deploymentProfiles,
      `${label}.deploymentProfiles`,
    );
    if (
      deploymentProfiles.some(
        (profile) => !BETA_REQUIRED_DEPLOYMENT_PROFILES.includes(profile),
      )
    ) {
      fail(`${label}.deploymentProfiles contains an unadmitted profile.`);
    }
    if (!COVERAGE_STATUSES.has(item.status)) {
      fail(`${label}.status must be passed.`);
    }
    const evidence = requireEvidence(item.evidence, `${label}.evidence`);
    if (
      item.preset === "full-stack" &&
      !BETA_REQUIRED_UI_PROVIDERS.includes(item.uiProvider)
    ) {
      fail(`${label} must select a UI provider for full-stack.`);
    }
    if (
      item.preset !== "full-stack" &&
      item.uiProvider !== null
    ) {
      fail(`${label} cannot select a UI provider outside full-stack.`);
    }
    if (
      item.endpointModel === "fastendpoints" &&
      item.preset !== "api"
    ) {
      fail(`${label} FastEndpoints coverage must use the api preset.`);
    }
    if (
      item.relationalProvider !== null &&
      item.preset === "api"
    ) {
      fail(`${label} cannot attach relational persistence to api.`);
    }
    return {
      id,
      evidence,
      preset: item.preset,
      endpointModel: item.endpointModel,
      relationalProvider: item.relationalProvider,
      authenticationProfile: item.authenticationProfile,
      uiProvider: item.uiProvider,
      infrastructureProviders,
      deploymentProfiles,
    };
  });
  if (new Set(coordinates.map(({ id }) => id)).size !== coordinates.length) {
    fail("betaIntegration.matrix.coordinates must have unique ids.");
  }
  if (coordinates.length >= 3 * 2 * 2 * 7 * 3 * 5) {
    fail("betaIntegration.matrix.coordinates must remain risk-based, not Cartesian.");
  }

  const invalidCombinations = requireArray(
    value.invalidCombinations,
    "betaIntegration.matrix.invalidCombinations",
  ).map((combination, index) => {
    const item = requireRecord(
      combination,
      `matrix.invalidCombinations[${index}]`,
    );
    const label = `matrix.invalidCombinations[${index}]`;
    const id = requireString(item.id, `${label}.id`);
    requireString(item.combination, `${label}.combination`);
    if (item.outcome !== "invalid") {
      fail(`${label}.outcome must be invalid.`);
    }
    requireString(item.reason, `${label}.reason`);
    const evidence = requireEvidence(item.evidence, `${label}.evidence`);
    return { id, evidence };
  });
  if (invalidCombinations.length === 0) {
    fail("betaIntegration.matrix.invalidCombinations must not be empty.");
  }

  return {
    axes: {
      presets: BETA_REQUIRED_PRESETS,
      endpointModels: BETA_REQUIRED_ENDPOINT_MODELS,
      relationalProviders: BETA_REQUIRED_RELATIONAL_PROVIDERS,
      authenticationProfiles: BETA_REQUIRED_AUTHENTICATION_PROFILES,
      uiProviders: BETA_REQUIRED_UI_PROVIDERS,
      infrastructureProviders: BETA_REQUIRED_INFRASTRUCTURE_PROVIDERS,
      deploymentProfiles: BETA_REQUIRED_DEPLOYMENT_PROFILES,
    },
    coverage: coverageResult,
    coordinates,
    invalidCombinations,
  };
}

function verifyNotAttested(value) {
  const entries = requireArray(value, "betaIntegration.notAttested").map(
    (entry, index) => {
      const item = requireRecord(
        entry,
        `betaIntegration.notAttested[${index}]`,
      );
      const label = `betaIntegration.notAttested[${index}]`;
      const id = requireString(item.id, `${label}.id`);
      if (item.state !== "not-attested") {
        fail(`${label}.state must be not-attested.`);
      }
      if (!["planned", "parked"].includes(item.maturity)) {
        fail(`${label}.maturity must be planned or parked.`);
      }
      requireString(item.reason, `${label}.reason`);
      requireString(item.reentryTrigger, `${label}.reentryTrigger`);
      return id;
    },
  );
  if (JSON.stringify(entries) !== JSON.stringify(BETA_NOT_ATTESTED_SCOPE)) {
    fail(
      `betaIntegration.notAttested must classify ${BETA_NOT_ATTESTED_SCOPE.join(", ")}.`,
    );
  }
  return entries;
}

function verifyPerformance(value) {
  const performance = requireRecord(value, "betaIntegration.performance");
  if (performance.status !== "recorded") {
    fail("betaIntegration.performance.status must be recorded.");
  }
  if (performance.baselineVersion !== BETA_INTEGRATION_TARGET_VERSION) {
    fail("betaIntegration.performance.baselineVersion must target beta.1.");
  }
  const runner = requireRecord(
    performance.runner,
    "betaIntegration.performance.runner",
  );
  for (const property of ["id", "os", "runtime", "architecture"]) {
    requireString(
      runner[property],
      `betaIntegration.performance.runner.${property}`,
    );
  }
  if (
    !Number.isInteger(performance.noiseFloorRuns) ||
    performance.noiseFloorRuns < 5
  ) {
    fail("betaIntegration.performance.noiseFloorRuns must be at least five.");
  }
  const baselines = requireArray(
    performance.baselines,
    "betaIntegration.performance.baselines",
  ).map((baseline, index) => {
    const item = requireRecord(
      baseline,
      `betaIntegration.performance.baselines[${index}]`,
    );
    const label = `betaIntegration.performance.baselines[${index}]`;
    requireString(item.id, `${label}.id`);
    requireString(item.signal, `${label}.signal`);
    requireString(item.unit, `${label}.unit`);
    if (typeof item.value !== "number" || !Number.isFinite(item.value)) {
      fail(`${label}.value must be a finite number.`);
    }
    const budget = requireRecord(item.budget, `${label}.budget`);
    requireString(budget.kind, `${label}.budget.kind`);
    if (
      typeof budget.regressionPercent !== "number" &&
      typeof budget.maximum !== "number"
    ) {
      fail(`${label}.budget must declare a numeric threshold.`);
    }
    const evidence = requireEvidence(item.evidence, `${label}.evidence`);
    return { id: item.id, evidence };
  });
  if (baselines.length === 0) {
    fail("betaIntegration.performance.baselines must not be empty.");
  }
  return {
    runner,
    baselineVersion: performance.baselineVersion,
    noiseFloorRuns: performance.noiseFloorRuns,
    baselines,
  };
}

function verifyReviews(value) {
  const expected = ["threat-model", "supply-chain"];
  const reviews = requireArray(value, "betaIntegration.reviews").map(
    (review, index) => {
      const item = requireRecord(review, `betaIntegration.reviews[${index}]`);
      const label = `betaIntegration.reviews[${index}]`;
      const id = requireString(item.id, `${label}.id`);
      if (item.status !== "complete") {
        fail(`${label}.status must be complete.`);
      }
      requireString(item.scope, `${label}.scope`);
      const evidence = requireEvidence(item.evidence, `${label}.evidence`);
      return { id, evidence };
    },
  );
  if (JSON.stringify(reviews.map(({ id }) => id)) !== JSON.stringify(expected)) {
    fail("betaIntegration.reviews must complete threat-model and supply-chain review.");
  }
  return reviews;
}

function verifyChangeFragments(value) {
  const fragments = requireArray(
    value,
    "betaIntegration.changeFragments",
  ).map((fragment, index) => {
    const item = requireRecord(
      fragment,
      `betaIntegration.changeFragments[${index}]`,
    );
    const label = `betaIntegration.changeFragments[${index}]`;
    const path = requireString(item.path, `${label}.path`);
    if (!path.startsWith("docs/changes/")) {
      fail(`${label}.path must point to docs/changes.`);
    }
    if (!CHANGE_IMPACTS.has(item.impact)) {
      fail(`${label}.impact must be patch, minor, or major.`);
    }
    if (!MIGRATION_DISPOSITIONS.has(item.migration)) {
      fail(`${label}.migration must be none, optional, or required.`);
    }
    if (item.status !== "reconciled") {
      fail(`${label}.status must be reconciled.`);
    }
    return { path, impact: item.impact, migration: item.migration };
  });
  if (fragments.length === 0) {
    fail("betaIntegration.changeFragments must reconcile at least one fragment.");
  }
  return fragments;
}

function verifyCompatibility(value) {
  const compatibility = requireRecord(
    value,
    "betaIntegration.compatibility",
  );
  if (compatibility.status !== "recorded") {
    fail("betaIntegration.compatibility.status must be recorded.");
  }
  const inputs = requireArray(
    compatibility.inputs,
    "betaIntegration.compatibility.inputs",
  ).map((input, index) => {
    const item = requireRecord(
      input,
      `betaIntegration.compatibility.inputs[${index}]`,
    );
    const label = `betaIntegration.compatibility.inputs[${index}]`;
    const id = requireString(item.id, `${label}.id`);
    if (item.status !== "included") {
      fail(`${label}.status must be included.`);
    }
    const evidence = requireEvidence(item.evidence, `${label}.evidence`);
    return { id, evidence };
  });
  if (inputs.length === 0) {
    fail("betaIntegration.compatibility.inputs must not be empty.");
  }
  return inputs;
}

function verifyScopeFreeze(value) {
  const scopeFreeze = requireRecord(value, "betaIntegration.scopeFreeze");
  if (scopeFreeze.status !== "frozen") {
    fail("betaIntegration.scopeFreeze.status must be frozen.");
  }
  if (scopeFreeze.version !== "1.0") {
    fail("betaIntegration.scopeFreeze.version must be 1.0.");
  }
  const allowed = requireExactStrings(
    scopeFreeze.allowedPostFreezeChanges,
    BETA_ALLOWED_POST_FREEZE_CHANGES,
    "betaIntegration.scopeFreeze.allowedPostFreezeChanges",
  );
  requireExactStrings(
    scopeFreeze.prohibitedPostFreezeChanges,
    BETA_PROHIBITED_POST_FREEZE_CHANGES,
    "betaIntegration.scopeFreeze.prohibitedPostFreezeChanges",
  );
  requireString(scopeFreeze.decision, "betaIntegration.scopeFreeze.decision");
  return allowed;
}

function verifyManifest(manifest) {
  requireRecord(manifest, "beta integration manifest");
  if (
    manifest.kind !== "generated-solution" ||
    manifest.repository?.name !== BETA_INTEGRATION_SOLUTION_NAME
  ) {
    fail("Beta integration manifest must identify its named Generated Solution.");
  }
  if (manifest.preset !== "api") {
    fail("Beta integration fixture manifest must use the api preset.");
  }
  if (manifest.supportClaims?.length !== 0) {
    fail("Beta integration fixture manifest must remain claim-free.");
  }
  if (
    manifest.security?.secretPolicy !== "external-only" ||
    manifest.security?.containsSecrets !== false
  ) {
    fail("Beta integration fixture manifest must be secret-free.");
  }
}

function evidencePayload(fixture, matrixDigest) {
  return {
    matrixDigest,
    notAttested: fixture.notAttested,
    performance: fixture.performance,
    reviews: fixture.reviews,
    changeFragments: fixture.changeFragments,
    compatibility: fixture.compatibility,
    scopeFreeze: fixture.scopeFreeze,
  };
}

function collectEvidencePaths(fixture) {
  const paths = [];
  const add = (entries) => {
    for (const entry of entries) {
      paths.push(...entry.evidence);
    }
  };
  for (const section of EVIDENCE_SECTION_NAMES) {
    add(fixture.matrix.coverage[section]);
  }
  add(fixture.matrix.coordinates);
  add(fixture.matrix.invalidCombinations);
  add(fixture.performance.baselines);
  for (const review of fixture.reviews) {
    paths.push(...review.evidence);
  }
  for (const input of fixture.compatibility.inputs) {
    paths.push(...input.evidence);
  }
  paths.push(...fixture.changeFragments.map(({ path }) => path));
  return [...new Set(paths)];
}

export function verifyBetaIntegrationEvidence(fixture, manifest, schema) {
  requireRecord(fixture, "betaIntegration");
  assertSecretFree(fixture);
  if (schema !== undefined) {
    validateSchema(fixture, schema);
  }
  if (fixture.schemaVersion !== BETA_INTEGRATION_SCHEMA_VERSION) {
    fail("betaIntegration.schemaVersion is unsupported.");
  }
  if (fixture.kind !== "beta-integration-evidence") {
    fail("betaIntegration.kind must be beta-integration-evidence.");
  }
  if (fixture.solution !== BETA_INTEGRATION_SOLUTION_NAME) {
    fail("betaIntegration.solution must identify the named Generated Solution.");
  }
  if (fixture.targetPlatformVersion !== BETA_INTEGRATION_TARGET_VERSION) {
    fail("betaIntegration.targetPlatformVersion must be 1.0.0-beta.1.");
  }
  if (fixture.maturity !== "beta") {
    fail("betaIntegration.maturity must be beta.");
  }

  verifyManifest(manifest);
  const matrix = verifyMatrix(fixture.matrix);
  const notAttested = verifyNotAttested(fixture.notAttested);
  const performance = verifyPerformance(fixture.performance);
  const reviews = verifyReviews(fixture.reviews);
  const changeFragments = verifyChangeFragments(fixture.changeFragments);
  const compatibility = verifyCompatibility(fixture.compatibility);
  const allowedPostFreezeChanges = verifyScopeFreeze(fixture.scopeFreeze);

  requireArray(fixture.supportClaims, "betaIntegration.supportClaims");
  if (fixture.supportClaims.length !== 0) {
    fail("Beta integration evidence must not make Supported claims.");
  }

  const verification = requireRecord(
    fixture.verification,
    "betaIntegration.verification",
  );
  if (verification.entrypoint !== "eng/verify.mjs") {
    fail("betaIntegration.verification.entrypoint must be eng/verify.mjs.");
  }
  if (verification.command !== "npm run verify:beta-integration") {
    fail(
      "betaIntegration.verification.command must be npm run verify:beta-integration.",
    );
  }
  requireBoolean(verification.failClosed, "betaIntegration.verification.failClosed");
  if (!verification.failClosed) {
    fail("Beta integration verification must fail closed.");
  }
  requireExactStrings(
    verification.requiredGates,
    ["beta.integration"],
    "betaIntegration.verification.requiredGates",
  );
  const matrixDigest = requireDigest(
    verification.matrixDigest,
    "betaIntegration.verification.matrixDigest",
  );
  if (matrixDigest !== sha256(fixture.matrix)) {
    fail("betaIntegration.verification.matrixDigest does not match the matrix.");
  }
  const evidenceDigest = requireDigest(
    verification.evidenceDigest,
    "betaIntegration.verification.evidenceDigest",
  );
  if (evidenceDigest !== sha256(evidencePayload(fixture, matrixDigest))) {
    fail("betaIntegration.verification.evidenceDigest does not match the evidence.");
  }

  const evidencePaths = collectEvidencePaths(fixture);
  return {
    status: "passed",
    maturity: fixture.maturity,
    solution: fixture.solution,
    fixtureRoot: BETA_INTEGRATION_SOLUTION_ROOT,
    presets: matrix.axes.presets,
    endpointModels: matrix.axes.endpointModels,
    relationalProviders: matrix.axes.relationalProviders,
    authenticationProfiles: matrix.axes.authenticationProfiles,
    uiProviders: matrix.axes.uiProviders,
    infrastructureProviders: matrix.axes.infrastructureProviders,
    deploymentProfiles: matrix.axes.deploymentProfiles,
    coordinates: matrix.coordinates.map(({ id }) => id),
    invalidCombinations: matrix.invalidCombinations.map(({ id }) => id),
    notAttested,
    performance,
    reviews,
    changeFragments,
    compatibility,
    allowedPostFreezeChanges,
    supportClaims: [],
    evidencePaths,
    evidenceDigest,
  };
}

async function readJson(root, relativePath) {
  try {
    return JSON.parse(await readFile(join(root, relativePath), "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") {
      fail(`Missing beta integration input: ${relativePath}.`, "missing-input");
    }
    if (error instanceof SyntaxError) {
      fail(`Invalid JSON in beta integration input: ${relativePath}.`, "invalid-input");
    }
    throw error;
  }
}

export async function verifyBetaIntegrationFixture({
  rootDir = process.cwd(),
  fixture,
  manifest,
  schema,
} = {}) {
  const root = resolve(rootDir);
  const loadedFixture =
    fixture ??
    (await readJson(
      root,
      `${BETA_INTEGRATION_SOLUTION_ROOT}/beta-integration.json`,
    ));
  const loadedManifest =
    manifest ??
    (await readJson(
      root,
      `${BETA_INTEGRATION_SOLUTION_ROOT}/martix.platform.json`,
    ));
  const loadedSchema =
    schema ?? (await readJson(root, "schemas/beta-integration.schema.json"));
  const result = verifyBetaIntegrationEvidence(
    loadedFixture,
    loadedManifest,
    loadedSchema,
  );
  for (const relativePath of result.evidencePaths) {
    try {
      await readFile(join(root, relativePath));
    } catch (error) {
      if (error?.code === "ENOENT") {
        fail(
          `Beta integration evidence path is missing: ${relativePath}.`,
          "missing-evidence",
        );
      }
      throw error;
    }
  }
  return result;
}

export const verifyBetaIntegration = verifyBetaIntegrationFixture;
