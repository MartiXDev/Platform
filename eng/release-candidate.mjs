import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { z } from "zod";

export const RELEASE_CANDIDATE_SCHEMA_VERSION = "1.0.0";
export const RELEASE_CANDIDATE_SCHEMA_URI =
  "https://github.com/MartiXDev/Platform/schemas/release-candidate.schema.json";
export const RELEASE_CANDIDATE_SOLUTION_NAME =
  "ReleaseCandidateGeneratedSolution";
export const RELEASE_CANDIDATE_SOLUTION_ROOT =
  `tests/fixtures/${RELEASE_CANDIDATE_SOLUTION_NAME}`;
export const RELEASE_CANDIDATE_PLATFORM_VERSION = "1.0.0-rc.1";

export const RELEASE_CANDIDATE_ARTIFACT_KINDS = Object.freeze([
  "package",
  "template",
  "tool",
  "process-archive",
  "oci-image",
  "schema",
  "skill",
  "generated-client",
  "sbom",
  "provenance",
  "evidence-bundle",
  "documentation",
  "migration",
]);

export const RELEASE_CANDIDATE_EVIDENCE_IDS = Object.freeze([
  "compatibility",
  "reproducibility",
  "licensingProvenance",
  "realProvider",
  "failureInjection",
  "security",
  "performance",
  "deployment",
  "documentation",
  "agentReadiness",
]);

const BOOTSTRAP_GATE_IDS = Object.freeze([
  "bootstrap.manifest",
  "bootstrap.governance",
  "bootstrap.generated-solution",
  "bootstrap.modular-monolith",
  "bootstrap.full-stack",
  "bootstrap.provider-admission",
  "bootstrap.deployment-manifest",
  "bootstrap.portable-host-conformance",
  "bootstrap.local-orchestration",
  "bootstrap.otlp-export",
  "bootstrap.feature-management",
  "bootstrap.mailkit-smtp",
  "bootstrap.valkey-distributed-cache",
  "bootstrap.quartz-durable-jobs",
  "bootstrap.host-baseline",
  "bootstrap.secret-free",
  "bootstrap.agent-readiness",
]);

export const RELEASE_CANDIDATE_GATE_IDS = Object.freeze([
  ...BOOTSTRAP_GATE_IDS,
  "modular-monolith.generated-solution",
  "modular-monolith.architecture",
  "modular-monolith.provider-integration",
  "modular-monolith.migration",
  "modular-monolith.reliability",
  "modular-monolith.release-evidence",
  "beta.integration",
  "release-candidate.evidence",
]);

const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;
const SOURCE_COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const ARTIFACT_KIND_SET = new Set(RELEASE_CANDIDATE_ARTIFACT_KINDS);
const EVIDENCE_ID_SET = new Set(RELEASE_CANDIDATE_EVIDENCE_IDS);
const GATE_ID_SET = new Set(RELEASE_CANDIDATE_GATE_IDS);
const SECRET_KEY_PATTERN =
  /(?:secret|password|token|private.?key|access.?key|api.?key|credential)/i;
const GATE_OUTCOMES = new Set([
  "passed",
  "failed",
  "unstable",
  "infrastructure-error",
  "cancelled",
]);

export class ReleaseCandidateError extends Error {
  constructor(message, code = "invalid-release-candidate") {
    super(message);
    this.name = "ReleaseCandidateError";
    this.code = code;
  }
}

function fail(message, code = "invalid-release-candidate") {
  throw new ReleaseCandidateError(message, code);
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

function requireDigest(value, label) {
  const digest = requireString(value, label);
  if (!DIGEST_PATTERN.test(digest)) {
    fail(`${label} must be a sha256 digest.`);
  }
  return digest;
}

function requireSourceCommit(value) {
  const commit = requireString(value, "source.commit").toLowerCase();
  if (!SOURCE_COMMIT_PATTERN.test(commit)) {
    fail("source.commit must be a 40-character hexadecimal commit.");
  }
  return commit;
}

function requireUniqueStrings(value, label) {
  if (!Array.isArray(value)) {
    fail(`${label} must be an array.`);
  }
  const values = value.map((item, index) =>
    requireString(item, `${label}[${index}]`),
  );
  if (new Set(values).size !== values.length) {
    fail(`${label} must contain unique values.`);
  }
  return values;
}

function requireEvidencePaths(value, label) {
  const paths = requireUniqueStrings(value, label);
  for (const path of paths) {
    if (path.startsWith("/") || path.includes("..") || path.includes("\\")) {
      fail(`${label} must contain repository-relative paths.`);
    }
  }
  if (paths.length === 0) {
    fail(`${label} must not be empty.`);
  }
  return paths;
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
    .update(typeof value === "string" ? value : canonicalJson(value))
    .digest("hex")}`;
}

function assertSecretFree(value, path = "release candidate") {
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
      fail(`${path}.${key} is not allowed in release candidate evidence.`, "secret-input");
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

function validateSchema(evidence, schema) {
  requireRecord(schema, "release candidate schema");
  if (
    schema.$id !== RELEASE_CANDIDATE_SCHEMA_URI ||
    schema.type !== "object"
  ) {
    fail("Release candidate schema identity is invalid.", "invalid-schema");
  }
  assertSecretFree(schema, "schemas/release-candidate.schema.json");
  validateClosedObjectSchemas(schema, "schemas/release-candidate.schema.json");
  const result = z.fromJSONSchema(schema).safeParse(evidence);
  if (!result.success) {
    const issue = result.error.issues[0];
    fail(
      `Release candidate schema rejected ${
        issue.path.join(".") || "the fixture"
      }: ${issue.message}.`,
      "invalid-schema",
    );
  }
}

function normalizeSource(value) {
  const source = requireRecord(value, "source");
  const normalized = {
    commit: requireSourceCommit(source.commit),
    clean: requireBoolean(source.clean, "source.clean"),
    reviewed: requireBoolean(source.reviewed, "source.reviewed"),
  };
  if (!normalized.clean || !normalized.reviewed) {
    fail("Release candidate source must be clean and reviewed.");
  }
  if (source.reviewEvidence !== undefined) {
    normalized.reviewEvidence = requireEvidencePaths(
      source.reviewEvidence,
      "source.reviewEvidence",
    );
  }
  return normalized;
}

function normalizeArtifacts(value, platformVersion) {
  if (!Array.isArray(value) || value.length === 0) {
    fail("artifacts must contain at least one release artifact.");
  }
  const artifacts = value.map((artifact, index) => {
    const label = `artifacts[${index}]`;
    requireRecord(artifact, label);
    const kind = requireString(artifact.kind, `${label}.kind`);
    if (!ARTIFACT_KIND_SET.has(kind)) {
      fail(`${label}.kind is not a recognized release artifact kind.`);
    }
    const version = requireString(artifact.version, `${label}.version`);
    if (version !== platformVersion) {
      fail(`${label}.version must match platformVersion.`);
    }
    const identity = requireRecord(artifact.identity, `${label}.identity`);
    const mode = requireString(identity.mode, `${label}.identity.mode`);
    if (!["signed", "digest-identified"].includes(mode)) {
      fail(`${label}.identity.mode must be signed or digest-identified.`);
    }
    const normalized = {
      id: requireString(artifact.id, `${label}.id`),
      kind,
      version,
      digest: requireDigest(artifact.digest, `${label}.digest`),
      identity: {
        mode,
        ...(mode === "signed"
          ? {
              signatureDigest: requireDigest(
                identity.signatureDigest,
                `${label}.identity.signatureDigest`,
              ),
            }
          : {}),
      },
    };
    if (artifact.path !== undefined) {
      normalized.path = requireEvidencePaths(
        [artifact.path],
        `${label}.path`,
      )[0];
    }
    return normalized;
  });
  if (new Set(artifacts.map(({ id }) => id)).size !== artifacts.length) {
    fail("artifacts must contain unique identities.");
  }
  const presentKinds = new Set(artifacts.map(({ kind }) => kind));
  for (const kind of RELEASE_CANDIDATE_ARTIFACT_KINDS) {
    if (!presentKinds.has(kind)) {
      fail(`artifacts must include a ${kind} identity.`);
    }
  }
  return artifacts.sort((left, right) =>
    `${left.kind}:${left.id}`.localeCompare(`${right.kind}:${right.id}`),
  );
}

function normalizeGateAttempts(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    fail(`${label} must contain at least one attempt.`);
  }
  const attempts = value.map((attempt, index) => {
    const attemptLabel = `${label}[${index}]`;
    requireRecord(attempt, attemptLabel);
    const number = attempt.number;
    if (!Number.isInteger(number) || number < 1) {
      fail(`${attemptLabel}.number must be a positive integer.`);
    }
    const outcome = requireString(attempt.outcome, `${attemptLabel}.outcome`);
    if (!GATE_OUTCOMES.has(outcome)) {
      fail(`${attemptLabel}.outcome is not a recognized gate outcome.`);
    }
    return { number, outcome };
  });
  if (
    new Set(attempts.map(({ number }) => number)).size !== attempts.length ||
    attempts.some((attempt, index) => attempt.number !== index + 1)
  ) {
    fail(`${label} numbers must be contiguous and unique.`);
  }
  if (attempts.some(({ outcome }) => outcome !== "passed")) {
    fail(`${label} cannot use a retry-to-green outcome.`);
  }
  return attempts;
}

function normalizeGates(value) {
  if (!Array.isArray(value)) {
    fail("gates must be an array.");
  }
  const gates = value.map((gate, index) => {
    const label = `gates[${index}]`;
    requireRecord(gate, label);
    const id = requireString(gate.id, `${label}.id`);
    if (!GATE_ID_SET.has(id)) {
      fail(`${label}.id is not a required release-candidate gate.`);
    }
    if (gate.outcome !== "passed") {
      fail(`${label}.outcome must be passed.`);
    }
    return {
      id,
      outcome: "passed",
      inputDigest: requireDigest(gate.inputDigest, `${label}.inputDigest`),
      evidenceDigest: requireDigest(
        gate.evidenceDigest,
        `${label}.evidenceDigest`,
      ),
      attempts: normalizeGateAttempts(gate.attempts, `${label}.attempts`),
    };
  });
  const ids = gates.map(({ id }) => id);
  if (
    new Set(ids).size !== ids.length ||
    RELEASE_CANDIDATE_GATE_IDS.some((id) => !ids.includes(id))
  ) {
    fail("gates must cover every release-candidate gate exactly once.");
  }
  return gates.sort((left, right) => left.id.localeCompare(right.id));
}

function normalizeEvidence(value) {
  const input = requireRecord(value, "evidence");
  const evidence = {};
  for (const id of RELEASE_CANDIDATE_EVIDENCE_IDS) {
    const label = `evidence.${id}`;
    const item = requireRecord(input[id], label);
    if (item.status !== "passed") {
      fail(`${label}.status must be passed.`);
    }
    evidence[id] = {
      status: "passed",
      digest: requireDigest(item.digest, `${label}.digest`),
      evidence: requireEvidencePaths(item.evidence, `${label}.evidence`),
    };
  }
  const unexpected = Object.keys(input).filter((id) => !EVIDENCE_ID_SET.has(id));
  if (unexpected.length > 0) {
    fail(`evidence contains unsupported categories: ${unexpected.join(", ")}.`);
  }
  return evidence;
}

function normalizeReleasePolicy(value) {
  const policy = requireRecord(value, "releasePolicy");
  const releaseBlockingFix = requireRecord(
    policy.releaseBlockingFix,
    "releasePolicy.releaseBlockingFix",
  );
  const normalized = {
    builtOnce: requireBoolean(policy.builtOnce, "releasePolicy.builtOnce"),
    exactBytes: requireBoolean(policy.exactBytes, "releasePolicy.exactBytes"),
    promotionWithoutRebuild: requireBoolean(
      policy.promotionWithoutRebuild,
      "releasePolicy.promotionWithoutRebuild",
    ),
    patchInPlace: requireBoolean(
      policy.patchInPlace,
      "releasePolicy.patchInPlace",
    ),
    releaseBlockingFix: {
      createsNewCandidate: requireBoolean(
        releaseBlockingFix.createsNewCandidate,
        "releasePolicy.releaseBlockingFix.createsNewCandidate",
      ),
      rerunsAffectedGates: requireBoolean(
        releaseBlockingFix.rerunsAffectedGates,
        "releasePolicy.releaseBlockingFix.rerunsAffectedGates",
      ),
      invalidatesPreviousCandidate: requireBoolean(
        releaseBlockingFix.invalidatesPreviousCandidate,
        "releasePolicy.releaseBlockingFix.invalidatesPreviousCandidate",
      ),
    },
  };
  if (
    !normalized.builtOnce ||
    !normalized.exactBytes ||
    !normalized.promotionWithoutRebuild ||
    normalized.patchInPlace ||
    !normalized.releaseBlockingFix.createsNewCandidate ||
    !normalized.releaseBlockingFix.rerunsAffectedGates ||
    !normalized.releaseBlockingFix.invalidatesPreviousCandidate
  ) {
    fail("Release candidate policy must be immutable and build-once.");
  }
  return normalized;
}

function normalizeVerification(value) {
  const verification = requireRecord(value, "verification");
  if (verification.cadence !== "release-candidate") {
    fail("verification.cadence must be release-candidate.");
  }
  const normalized = {
    cadence: "release-candidate",
    policyVersion: requireString(
      verification.policyVersion,
      "verification.policyVersion",
    ),
    entrypoint: requireString(
      verification.entrypoint,
      "verification.entrypoint",
    ),
    command: requireString(verification.command, "verification.command"),
    failClosed: requireBoolean(
      verification.failClosed,
      "verification.failClosed",
    ),
    requiredGates: RELEASE_CANDIDATE_GATE_IDS,
    notApplicable: requireUniqueStrings(
      verification.notApplicable,
      "verification.notApplicable",
    ),
    notSelected: requireUniqueStrings(
      verification.notSelected,
      "verification.notSelected",
    ),
  };
  if (normalized.entrypoint !== "eng/verify.mjs") {
    fail("verification.entrypoint must be eng/verify.mjs.");
  }
  if (normalized.command !== "npm run verify:release-candidate") {
    fail("verification.command must be npm run verify:release-candidate.");
  }
  if (!normalized.failClosed) {
    fail("Release candidate verification must fail closed.");
  }
  if (
    normalized.notApplicable.length !== 0 ||
    normalized.notSelected.length !== 0
  ) {
    fail("Release candidate verification must not omit required evidence.");
  }
  return normalized;
}

function normalizeSupportClaims(value) {
  if (!Array.isArray(value) || value.length !== 0) {
    fail("Release candidate evidence must not make Supported claims.");
  }
  return [];
}

function createBody(input) {
  requireRecord(input, "Release candidate evidence input");
  const source = normalizeSource(input.source);
  const platformVersion = requireString(
    input.platformVersion,
    "platformVersion",
  );
  const artifacts = normalizeArtifacts(input.artifacts, platformVersion);
  const artifactSetDigest = sha256(artifacts);
  const gates = normalizeGates(input.gates);
  const evidence = normalizeEvidence(input.evidence);
  const releasePolicy = normalizeReleasePolicy(input.releasePolicy);
  const verification = normalizeVerification(input.verification);
  const supportClaims = normalizeSupportClaims(input.supportClaims);
  const identity = {
    artifacts,
    evidence,
    gates,
    platformVersion,
    releasePolicy,
    source,
    verification,
  };
  const candidateSeed = sha256(identity).slice("sha256:".length);
  return {
    $schema: RELEASE_CANDIDATE_SCHEMA_URI,
    schemaVersion: RELEASE_CANDIDATE_SCHEMA_VERSION,
    kind: "release-candidate-evidence",
    solution: RELEASE_CANDIDATE_SOLUTION_NAME,
    candidateId: `rc-${platformVersion}-${candidateSeed.slice(0, 16)}`,
    platformVersion,
    platformContractVersion: platformVersion,
    maturity: "release-candidate",
    source,
    artifacts,
    artifactSetDigest,
    gates,
    evidence,
    releasePolicy,
    verification,
    supportClaims,
  };
}

export function createReleaseCandidateEvidence(input) {
  const body = createBody(input);
  assertSecretFree(body);
  return {
    ...body,
    evidenceDigest: sha256(body),
  };
}

export function verifyReleaseCandidateEvidence(evidence, schema) {
  requireRecord(evidence, "Release candidate evidence");
  assertSecretFree(evidence);
  if (schema !== undefined) {
    validateSchema(evidence, schema);
  }
  const { evidenceDigest, ...body } = evidence;
  requireDigest(evidenceDigest, "evidenceDigest");
  if (sha256(body) !== evidenceDigest) {
    fail("Release candidate evidence digest does not match its content.");
  }
  if (
    body.$schema !== RELEASE_CANDIDATE_SCHEMA_URI ||
    body.schemaVersion !== RELEASE_CANDIDATE_SCHEMA_VERSION ||
    body.kind !== "release-candidate-evidence" ||
    body.solution !== RELEASE_CANDIDATE_SOLUTION_NAME ||
    body.maturity !== "release-candidate"
  ) {
    fail("Release candidate evidence identity is invalid.");
  }
  if (body.platformVersion !== RELEASE_CANDIDATE_PLATFORM_VERSION) {
    fail(
      `Release candidate evidence must target ${RELEASE_CANDIDATE_PLATFORM_VERSION}.`,
    );
  }
  const recreated = createReleaseCandidateEvidence({
    source: body.source,
    platformVersion: body.platformVersion,
    artifacts: body.artifacts,
    gates: body.gates,
    evidence: body.evidence,
    releasePolicy: body.releasePolicy,
    verification: body.verification,
    supportClaims: body.supportClaims,
  });
  if (canonicalJson(recreated) !== canonicalJson(evidence)) {
    fail("Release candidate evidence identity is not reproducible.");
  }
  if (body.artifactSetDigest !== sha256(body.artifacts)) {
    fail("artifactSetDigest does not match the exact candidate artifact set.");
  }
  return true;
}

function verifyManifest(manifest) {
  requireRecord(manifest, "release candidate manifest");
  if (
    manifest.kind !== "generated-solution" ||
    manifest.repository?.name !== RELEASE_CANDIDATE_SOLUTION_NAME
  ) {
    fail("Release candidate manifest must identify its named Generated Solution.");
  }
  if (manifest.platformVersion !== RELEASE_CANDIDATE_PLATFORM_VERSION) {
    fail("Release candidate manifest must identify the RC platform version.");
  }
  if (manifest.supportClaims?.length !== 0) {
    fail("Release candidate manifest must remain claim-free.");
  }
  if (
    manifest.security?.secretPolicy !== "external-only" ||
    manifest.security?.containsSecrets !== false
  ) {
    fail("Release candidate manifest must be secret-free.");
  }
}

function collectEvidencePaths(evidence) {
  const paths = [];
  if (Array.isArray(evidence.source.reviewEvidence)) {
    paths.push(...evidence.source.reviewEvidence);
  }
  for (const artifact of evidence.artifacts) {
    if (artifact.path !== undefined) {
      paths.push(artifact.path);
    }
  }
  for (const item of Object.values(evidence.evidence)) {
    paths.push(...item.evidence);
  }
  return [...new Set(paths)];
}

async function readJson(root, relativePath) {
  try {
    return JSON.parse(await readFile(join(root, relativePath), "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") {
      fail(
        `Missing release candidate input: ${relativePath}.`,
        "missing-input",
      );
    }
    if (error instanceof SyntaxError) {
      fail(
        `Invalid JSON in release candidate input: ${relativePath}.`,
        "invalid-input",
      );
    }
    throw error;
  }
}

export async function verifyReleaseCandidateFixture({
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
      `${RELEASE_CANDIDATE_SOLUTION_ROOT}/release-candidate.json`,
    ));
  const loadedManifest =
    manifest ??
    (await readJson(
      root,
      `${RELEASE_CANDIDATE_SOLUTION_ROOT}/martix.platform.json`,
    ));
  const loadedSchema =
    schema ?? (await readJson(root, "schemas/release-candidate.schema.json"));
  verifyReleaseCandidateEvidence(loadedFixture, loadedSchema);
  verifyManifest(loadedManifest);

  const evidencePaths = collectEvidencePaths(loadedFixture);
  for (const relativePath of evidencePaths) {
    try {
      await readFile(join(root, relativePath));
    } catch (error) {
      if (error?.code === "ENOENT") {
        fail(
          `Release candidate evidence path is missing: ${relativePath}.`,
          "missing-evidence",
        );
      }
      throw error;
    }
  }
  return {
    status: "passed",
    maturity: loadedFixture.maturity,
    solution: loadedFixture.solution,
    candidateId: loadedFixture.candidateId,
    platformVersion: loadedFixture.platformVersion,
    artifactCount: loadedFixture.artifacts.length,
    gateCount: loadedFixture.gates.length,
    evidenceCategories: [...RELEASE_CANDIDATE_EVIDENCE_IDS],
    evidencePaths,
    evidenceDigest: loadedFixture.evidenceDigest,
    fixtureRoot: RELEASE_CANDIDATE_SOLUTION_ROOT,
  };
}

export const verifyReleaseCandidate = verifyReleaseCandidateFixture;
