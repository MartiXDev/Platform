import { createHash } from "node:crypto";

export const MODULAR_MONOLITH_ALPHA_EVIDENCE_SCHEMA_VERSION = "1.0.0";
export const MODULAR_MONOLITH_ALPHA_MATURITY = "experimental";
export const MODULAR_MONOLITH_ALPHA_MATURITY_LABEL =
  "Experimental Public Alpha";
export const MODULAR_MONOLITH_ALPHA_PROVIDERS = Object.freeze([
  "postgresql",
  "sqlserver",
]);
export const MODULAR_MONOLITH_ALPHA_GATE_IDS = Object.freeze([
  "modular-monolith.generated-solution",
  "modular-monolith.architecture",
  "modular-monolith.provider-integration",
  "modular-monolith.migration",
  "modular-monolith.reliability",
  "modular-monolith.release-evidence",
]);

const FIRST_PARTY_ARTIFACT_IDS = Object.freeze([
  "MartiX.Platform",
  "MartiX.Platform.AspNetCore",
  "MartiX.Platform.Analyzers",
  "MartiX.Platform.EntityFrameworkCore",
]);
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;
const SOURCE_COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const PROVIDER_APIS = Object.freeze({
  postgresql: "UseNpgsql",
  sqlserver: "UseSqlServer",
});
const SECRET_KEY_PATTERN =
  /(?:secret|password|token|private.?key|access.?key|api.?key|credential)/i;

export class ModularMonolithAlphaEvidenceError extends Error {
  constructor(message) {
    super(message);
    this.name = "ModularMonolithAlphaEvidenceError";
  }
}

function fail(message) {
  throw new ModularMonolithAlphaEvidenceError(message);
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
    fail(`${label} is required.`);
  }

  return value.trim();
}

function requireDigest(value, label) {
  if (typeof value !== "string" || !DIGEST_PATTERN.test(value)) {
    fail(`${label} must be a sha256 digest.`);
  }

  return value;
}

function requireSourceCommit(value) {
  const sourceCommit = requireString(value, "sourceCommit").toLowerCase();
  if (!SOURCE_COMMIT_PATTERN.test(sourceCommit)) {
    fail("sourceCommit must be a 40-character hexadecimal commit.");
  }

  return sourceCommit;
}

function requireProvider(value, label) {
  const provider = requireString(value, label).toLowerCase();
  if (!MODULAR_MONOLITH_ALPHA_PROVIDERS.includes(provider)) {
    fail(`${label} must be postgresql or sqlserver.`);
  }

  return provider;
}

function requireNonEmptyArray(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    fail(`${label} must contain at least one item.`);
  }

  return value;
}

function normalizeNames(value, label) {
  const names = requireNonEmptyArray(value, label).map((name, index) =>
    requireString(name, `${label}[${index}]`),
  );
  if (new Set(names).size !== names.length) {
    fail(`${label} must contain unique names.`);
  }

  return [...names].sort((left, right) => left.localeCompare(right));
}

function normalizeDependencies(value) {
  const dependencies = requireNonEmptyArray(
    value,
    "moduleDependencies",
  ).map((dependency, index) => {
    requireRecord(dependency, `moduleDependencies[${index}]`);
    return {
      consumer: requireString(
        dependency.consumer,
        `moduleDependencies[${index}].consumer`,
      ),
      provider: requireString(
        dependency.provider,
        `moduleDependencies[${index}].provider`,
      ),
      access: requireString(
        dependency.access,
        `moduleDependencies[${index}].access`,
      ),
    };
  });

  return dependencies.sort((left, right) =>
    `${left.consumer}:${left.provider}:${left.access}`.localeCompare(
      `${right.consumer}:${right.provider}:${right.access}`,
    ),
  );
}

function normalizeArtifacts(value) {
  const artifacts = requireNonEmptyArray(value, "artifacts").map(
    (artifact, index) => {
      requireRecord(artifact, `artifacts[${index}]`);
      return {
        id: requireString(artifact.id, `artifacts[${index}].id`),
        version: requireString(
          artifact.version,
          `artifacts[${index}].version`,
        ),
        digest: requireDigest(
          artifact.digest,
          `artifacts[${index}].digest`,
        ),
      };
    },
  );
  if (artifacts.length !== FIRST_PARTY_ARTIFACT_IDS.length) {
    fail(
      `artifacts must contain exactly ${FIRST_PARTY_ARTIFACT_IDS.length} first-party artifacts.`,
    );
  }
  if (new Set(artifacts.map((artifact) => artifact.id)).size !== artifacts.length) {
    fail("artifacts must contain unique package identities.");
  }
  for (const artifactId of FIRST_PARTY_ARTIFACT_IDS) {
    if (!artifacts.some((artifact) => artifact.id === artifactId)) {
      fail(`artifacts must contain ${artifactId}.`);
    }
  }

  return artifacts.sort((left, right) => left.id.localeCompare(right.id));
}

function normalizeGates(value, provider) {
  if (!Array.isArray(value) || value.length !== MODULAR_MONOLITH_ALPHA_GATE_IDS.length - 1) {
    fail(
      `${provider} alpha evidence must contain exactly ${
        MODULAR_MONOLITH_ALPHA_GATE_IDS.length - 1
      } provider gates.`,
    );
  }

  const gates = value.map((gate, index) => {
    requireRecord(gate, `${provider}.gates[${index}]`);
    const id = requireString(gate.id, `${provider}.gates[${index}].id`);
    if (!MODULAR_MONOLITH_ALPHA_GATE_IDS.slice(0, -1).includes(id)) {
      fail(`${provider} declares an unsupported alpha gate: ${id}.`);
    }
    if (gate.outcome !== "passed") {
      fail(`${provider} gate ${id} must have outcome passed.`);
    }

    const normalized = {
      id,
      outcome: "passed",
      evidenceDigest: requireDigest(
        gate.evidenceDigest,
        `${provider}.gates[${index}].evidenceDigest`,
      ),
    };
    if (gate.command !== undefined) {
      normalized.command = requireString(
        gate.command,
        `${provider}.gates[${index}].command`,
      );
    }
    return normalized;
  });
  const ids = gates.map((gate) => gate.id);
  if (
    new Set(ids).size !== ids.length ||
    MODULAR_MONOLITH_ALPHA_GATE_IDS.slice(0, -1).some((id) => !ids.includes(id))
  ) {
    fail(`${provider} alpha evidence must cover each provider gate exactly once.`);
  }

  return gates.sort((left, right) => left.id.localeCompare(right.id));
}

function normalizeVariants(value) {
  if (
    !Array.isArray(value) ||
    value.length !== MODULAR_MONOLITH_ALPHA_PROVIDERS.length
  ) {
    fail("Alpha evidence requires exactly one postgresql and one sqlserver variant.");
  }

  const variants = value.map((variant, index) => {
    requireRecord(variant, `variants[${index}]`);
    const provider = requireProvider(variant.provider, `variants[${index}].provider`);
    return {
      provider,
      generatedSolutionDigest: requireDigest(
        variant.generatedSolutionDigest,
        `${provider}.generatedSolutionDigest`,
      ),
      manifestDigest: requireDigest(
        variant.manifestDigest,
        `${provider}.manifestDigest`,
      ),
      inputDigest: requireDigest(variant.inputDigest, `${provider}.inputDigest`),
      gates: normalizeGates(variant.gates, provider),
    };
  });
  const providers = variants.map((variant) => variant.provider);
  if (
    new Set(providers).size !== providers.length ||
    MODULAR_MONOLITH_ALPHA_PROVIDERS.some(
      (provider) => !providers.includes(provider),
    )
  ) {
    fail("Alpha evidence requires exactly one postgresql and one sqlserver variant.");
  }
  if (new Set(variants.map((variant) => variant.inputDigest)).size !== 1) {
    fail("PostgreSQL and SQL Server variants must use the same exact candidate inputs.");
  }

  return variants.sort((left, right) =>
    left.provider.localeCompare(right.provider),
  );
}

function normalizeReleaseGate(value) {
  requireRecord(value, "releaseGate");
  if (value.id !== "modular-monolith.release-evidence") {
    fail("releaseGate.id must be modular-monolith.release-evidence.");
  }
  if (value.outcome !== "passed") {
    fail("modular-monolith.release-evidence gate must have outcome passed.");
  }

  return {
    id: value.id,
    outcome: "passed",
    evidenceDigest: requireDigest(
      value.evidenceDigest,
      "releaseGate.evidenceDigest",
    ),
    ...(value.command === undefined
      ? {}
      : { command: requireString(value.command, "releaseGate.command") }),
  };
}

function normalizeCompatibility(value) {
  requireRecord(value, "compatibility");
  if (value.synchronized !== true) {
    fail("compatibility.synchronized must be true.");
  }
  const coordinates = normalizeNames(
    value.coordinates,
    "compatibility.coordinates",
  );
  const expectedCoordinates = MODULAR_MONOLITH_ALPHA_PROVIDERS.map(
    (provider) => `modular-monolith/${provider}`,
  );
  if (JSON.stringify(coordinates) !== JSON.stringify(expectedCoordinates)) {
    fail("compatibility.coordinates must identify both relational variants.");
  }
  const invalidSelections = normalizeNames(
    value.invalidSelections,
    "compatibility.invalidSelections",
  );
  for (const invalidSelection of ["mixed-relational-providers", "sqlite"]) {
    if (!invalidSelections.includes(invalidSelection)) {
      fail(
        `compatibility.invalidSelections must record ${invalidSelection} as unsupported.`,
      );
    }
  }

  return {
    synchronized: true,
    coordinates,
    invalidSelections,
    providerApis: Object.fromEntries(
      MODULAR_MONOLITH_ALPHA_PROVIDERS.map((provider) => [
        provider,
        PROVIDER_APIS[provider],
      ]),
    ),
  };
}

function assertSecretFree(value, path = "evidence") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertSecretFree(item, `${path}[${index}]`));
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (SECRET_KEY_PATTERN.test(key) && key !== "supportClaims") {
      fail(`${path}.${key} is not allowed in alpha evidence.`);
    }
    assertSecretFree(child, `${path}.${key}`);
  }
}

export function canonicalize(value) {
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
  return `sha256:${createHash("sha256")
    .update(typeof value === "string" ? value : value)
    .digest("hex")}`;
}

function createBody(input) {
  requireRecord(input, "Alpha evidence input");
  const sourceCommit = requireSourceCommit(input.sourceCommit);
  const platformVersion = requireString(
    input.platformVersion,
    "platformVersion",
  );
  const applicationName = requireString(
    input.applicationName,
    "applicationName",
  );
  const businessModules = normalizeNames(
    input.businessModules,
    "businessModules",
  );
  const moduleDependencies = normalizeDependencies(input.moduleDependencies);
  const artifacts = normalizeArtifacts(input.artifacts);
  if (artifacts.some((artifact) => artifact.version !== platformVersion)) {
    fail("All first-party artifacts must match platformVersion.");
  }
  const variants = normalizeVariants(input.variants);
  const releaseGate = normalizeReleaseGate(input.releaseGate);
  const compatibility = normalizeCompatibility(input.compatibility);
  const inputRecord = {
    applicationName,
    artifacts,
    businessModules,
    compatibility,
    moduleDependencies,
    platformVersion,
    sourceCommit,
    variants,
  };
  const candidateSeed = sha256(canonicalJson(inputRecord)).slice("sha256:".length);
  const body = {
    kind: "candidate-evidence",
    evidenceSchemaVersion: MODULAR_MONOLITH_ALPHA_EVIDENCE_SCHEMA_VERSION,
    candidateId: `modular-monolith-alpha-${platformVersion}-${candidateSeed.slice(
      0,
      16,
    )}`,
    platformVersion,
    platformContractVersion: platformVersion,
    source: { commit: sourceCommit },
    preset: "modular-monolith",
    maturity: {
      stage: MODULAR_MONOLITH_ALPHA_MATURITY,
      label: MODULAR_MONOLITH_ALPHA_MATURITY_LABEL,
      productionReady: false,
    },
    inputs: {
      applicationName,
      businessModules,
      moduleDependencies,
      artifacts,
      variants: variants.map(({ provider, inputDigest }) => ({
        provider,
        inputDigest,
      })),
    },
    generatedSolutions: variants.map(
      ({ provider, generatedSolutionDigest, manifestDigest, inputDigest }) => ({
        provider,
        generatedSolutionDigest,
        manifestDigest,
        inputDigest,
      }),
    ),
    gates: [
      ...variants.flatMap((variant) =>
        variant.gates.map((gate) => ({
          ...gate,
          provider: variant.provider,
        })),
      ),
      releaseGate,
    ].sort((left, right) =>
      `${left.id}:${left.provider ?? ""}`.localeCompare(
        `${right.id}:${right.provider ?? ""}`,
      ),
    ),
    compatibility,
    providers: [...MODULAR_MONOLITH_ALPHA_PROVIDERS],
    supportClaims: [],
  };
  if (input.verification !== undefined) {
    body.verification = canonicalize(input.verification);
  }
  return body;
}

export function createModularMonolithAlphaEvidence(input) {
  const body = createBody(input);
  assertSecretFree(body);
  return {
    ...body,
    evidenceDigest: sha256(canonicalJson(body)),
  };
}

export function verifyModularMonolithAlphaEvidence(evidence) {
  requireRecord(evidence, "Alpha evidence");
  const { evidenceDigest, ...body } = evidence;
  requireDigest(evidenceDigest, "evidenceDigest");
  if (sha256(canonicalJson(body)) !== evidenceDigest) {
    fail("Alpha evidence digest does not match its content.");
  }
  if (body.maturity?.stage !== MODULAR_MONOLITH_ALPHA_MATURITY) {
    fail("Alpha evidence must declare Experimental maturity.");
  }
  if (body.maturity?.productionReady !== false) {
    fail("Alpha evidence must not declare production readiness.");
  }
  if (body.supportClaims?.length !== 0) {
    fail("Alpha evidence must not make a Supported Capability claim.");
  }

  const variants = body.generatedSolutions;
  const recreated = createModularMonolithAlphaEvidence({
    sourceCommit: body.source?.commit,
    platformVersion: body.platformVersion,
    applicationName: body.inputs?.applicationName,
    businessModules: body.inputs?.businessModules,
    moduleDependencies: body.inputs?.moduleDependencies,
    artifacts: body.inputs?.artifacts,
    variants: variants?.map((variant) => ({
      provider: variant.provider,
      generatedSolutionDigest: variant.generatedSolutionDigest,
      manifestDigest: variant.manifestDigest,
      inputDigest: variant.inputDigest,
      gates: body.gates?.filter(
        (gate) => gate.provider === variant.provider,
      ),
    })),
    releaseGate: body.gates?.find(
      (gate) => gate.id === "modular-monolith.release-evidence",
    ),
    compatibility: body.compatibility,
    verification: body.verification,
  });
  if (canonicalJson(recreated) !== canonicalJson(evidence)) {
    fail("Alpha evidence identity is not reproducible.");
  }

  return true;
}
