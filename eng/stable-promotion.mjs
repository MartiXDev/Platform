import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { z } from "zod";
import {
  RELEASE_CANDIDATE_ARTIFACT_KINDS,
  RELEASE_CANDIDATE_CADENCE,
  RELEASE_CANDIDATE_GATE_IDS,
  RELEASE_CANDIDATE_SOLUTION_NAME,
  RELEASE_CANDIDATE_SOLUTION_ROOT,
  canonicalJson,
  sha256,
  verifyReleaseCandidateEvidence,
} from "./release-candidate.mjs";

export { canonicalJson, sha256 };

export const STABLE_PROMOTION_SCHEMA_VERSION = "1.0.0";
export const STABLE_PROMOTION_SCHEMA_URI =
  "https://github.com/MartiXDev/Platform/schemas/stable-promotion.schema.json";
export const STABLE_PROMOTION_SOLUTION_NAME =
  "StablePromotionGeneratedSolution";
export const STABLE_PROMOTION_SOLUTION_ROOT =
  `tests/fixtures/${STABLE_PROMOTION_SOLUTION_NAME}`;
export const STABLE_PLATFORM_VERSION = "1.0.0";
export const STABLE_PLATFORM_CONTRACT_VERSION = "1.0.0";
export const STABLE_PROMOTION_CADENCE = RELEASE_CANDIDATE_CADENCE;
export const STABLE_PROMOTION_CADENCES = Object.freeze([
  STABLE_PROMOTION_CADENCE,
]);
export const STABLE_PROMOTION_GATE_ID = "stable.promotion";
export const STABLE_PROMOTION_VERIFICATION_COMMAND =
  "npm run verify:stable-promotion";
export const STABLE_PROMOTION_REQUIRED_GATES = Object.freeze([
  ...RELEASE_CANDIDATE_GATE_IDS,
  STABLE_PROMOTION_GATE_ID,
]);

const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;
const SOURCE_COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const ARTIFACT_KIND_SET = new Set(RELEASE_CANDIDATE_ARTIFACT_KINDS);
const REQUIRED_GATE_SET = new Set(STABLE_PROMOTION_REQUIRED_GATES);
const SECRET_KEY_PATTERN =
  /(?:secret|password|token|private.?key|access.?key|api.?key|credential)/i;
const DESTINATION_BY_ARTIFACT_KIND = Object.freeze({
  package: "nuget.org",
  template: "nuget.org",
  tool: "nuget.org",
  "process-archive": "github-release",
  "oci-image": "github-release",
  schema: "MartiXDev/Platform",
  skill: "martix/skills",
  "generated-client": "github-release",
  sbom: "github-release",
  provenance: "github-release",
  "evidence-bundle": "github-release",
  documentation: "github-pages",
  migration: "github-release",
});
const DESTINATIONS = Object.freeze([
  ...new Set(Object.values(DESTINATION_BY_ARTIFACT_KIND)),
]);
const PROMOTION_STATES = Object.freeze([
  "preflight",
  "reserve",
  "build-once",
  "finalize",
  "approve",
  "promote",
]);
const FIRST_MAJOR_FLOOR_REASON =
  "No preceding stable release exists for the first production major.";
const NO_SUPPORT_CLAIMS = Object.freeze([]);

export class StablePromotionError extends Error {
  constructor(message, code = "invalid-stable-promotion") {
    super(message);
    this.name = "StablePromotionError";
    this.code = code;
  }
}

function fail(message, code = "invalid-stable-promotion") {
  throw new StablePromotionError(message, code);
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

function requireCommit(value, label) {
  const commit = requireString(value, label).toLowerCase();
  if (!SOURCE_COMMIT_PATTERN.test(commit)) {
    fail(`${label} must be a 40-character hexadecimal commit.`);
  }
  return commit;
}

function requireUniqueStrings(value, label) {
  if (!Array.isArray(value)) {
    fail(`${label} must be an array.`);
  }
  const strings = value.map((item, index) =>
    requireString(item, `${label}[${index}]`),
  );
  if (new Set(strings).size !== strings.length) {
    fail(`${label} must contain unique values.`);
  }
  return strings;
}

function requirePaths(value, label) {
  const paths = requireUniqueStrings(value, label);
  for (const relativePath of paths) {
    if (
      relativePath.startsWith("/") ||
      relativePath.includes("..") ||
      relativePath.includes("\\")
    ) {
      fail(`${label} must contain repository-relative paths.`);
    }
  }
  if (paths.length === 0) {
    fail(`${label} must not be empty.`);
  }
  return paths;
}

function assertSecretFree(value, path = "stable promotion evidence") {
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
      fail(`${path}.${key} is not allowed in stable promotion evidence.`, "secret-input");
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
  requireRecord(schema, "stable promotion schema");
  if (
    schema.$id !== STABLE_PROMOTION_SCHEMA_URI ||
    schema.type !== "object"
  ) {
    fail("Stable promotion schema identity is invalid.", "invalid-schema");
  }
  assertSecretFree(schema, "schemas/stable-promotion.schema.json");
  validateClosedObjectSchemas(schema, "schemas/stable-promotion.schema.json");
  const result = z.fromJSONSchema(schema).safeParse(evidence);
  if (!result.success) {
    const issue = result.error.issues[0];
    fail(
      `Stable promotion schema rejected ${
        issue.path.join(".") || "the fixture"
      }: ${issue.message}.`,
      "invalid-schema",
    );
  }
}

function normalizeSource(value) {
  const source = requireRecord(value, "source");
  const normalized = {
    commit: requireCommit(source.commit, "source.commit"),
    clean: requireBoolean(source.clean, "source.clean"),
    reviewed: requireBoolean(source.reviewed, "source.reviewed"),
    reviewEvidence: requirePaths(
      source.reviewEvidence,
      "source.reviewEvidence",
    ),
  };
  if (!normalized.clean || !normalized.reviewed) {
    fail("Stable promotion source must be clean and reviewed.");
  }
  return normalized;
}

function normalizeAcceptedReleaseCandidate(value) {
  const candidate = requireRecord(value, "acceptedReleaseCandidate");
  const normalized = {
    candidateId: requireString(
      candidate.candidateId,
      "acceptedReleaseCandidate.candidateId",
    ),
    platformVersion: requireString(
      candidate.platformVersion,
      "acceptedReleaseCandidate.platformVersion",
    ),
    platformContractVersion: requireString(
      candidate.platformContractVersion,
      "acceptedReleaseCandidate.platformContractVersion",
    ),
    sourceCommit: requireCommit(
      candidate.sourceCommit,
      "acceptedReleaseCandidate.sourceCommit",
    ),
    artifactSetDigest: requireDigest(
      candidate.artifactSetDigest,
      "acceptedReleaseCandidate.artifactSetDigest",
    ),
    evidenceDigest: requireDigest(
      candidate.evidenceDigest,
      "acceptedReleaseCandidate.evidenceDigest",
    ),
    status: requireString(candidate.status, "acceptedReleaseCandidate.status"),
  };
  if (
    normalized.platformVersion !== "1.0.0-rc.1" ||
    normalized.platformContractVersion !== "1.0.0-rc.1" ||
    normalized.status !== "accepted"
  ) {
    fail("acceptedReleaseCandidate must identify the accepted 1.0.0-rc.1 candidate.");
  }
  return normalized;
}

function normalizeArtifacts(value, stableVersion) {
  if (
    !Array.isArray(value) ||
    value.length < RELEASE_CANDIDATE_ARTIFACT_KINDS.length
  ) {
    fail(
      `artifacts must contain at least ${RELEASE_CANDIDATE_ARTIFACT_KINDS.length} synchronized artifacts.`,
    );
  }
  const artifacts = value.map((artifact, index) => {
    const label = `artifacts[${index}]`;
    requireRecord(artifact, label);
    const kind = requireString(artifact.kind, `${label}.kind`);
    if (!ARTIFACT_KIND_SET.has(kind)) {
      fail(`${label}.kind is not a recognized release artifact kind.`);
    }
    const identity = requireRecord(artifact.identity, `${label}.identity`);
    const mode = requireString(identity.mode, `${label}.identity.mode`);
    if (!["signed", "digest-identified"].includes(mode)) {
      fail(`${label}.identity.mode must be signed or digest-identified.`);
    }
    const normalized = {
      id: requireString(artifact.id, `${label}.id`),
      sourceArtifactId: requireString(
        artifact.sourceArtifactId,
        `${label}.sourceArtifactId`,
      ),
      kind,
      version: requireString(artifact.version, `${label}.version`),
      acceptedDigest: requireDigest(
        artifact.acceptedDigest,
        `${label}.acceptedDigest`,
      ),
      promotedDigest: requireDigest(
        artifact.promotedDigest,
        `${label}.promotedDigest`,
      ),
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
      path: requirePaths([artifact.path], `${label}.path`)[0],
      destination: requireString(artifact.destination, `${label}.destination`),
    };
    if (
      normalized.version !== stableVersion ||
      normalized.acceptedDigest !== normalized.promotedDigest ||
      normalized.destination !== DESTINATION_BY_ARTIFACT_KIND[kind]
    ) {
      fail(`${label} is not an exact-byte stable promotion of its accepted RC artifact.`);
    }
    return normalized;
  });
  if (new Set(artifacts.map(({ id }) => id)).size !== artifacts.length) {
    fail("artifacts must contain unique stable identities.");
  }
  if (
    new Set(artifacts.map(({ sourceArtifactId }) => sourceArtifactId)).size !==
    artifacts.length
  ) {
    fail("artifacts must contain unique accepted RC identities.");
  }
  for (const kind of RELEASE_CANDIDATE_ARTIFACT_KINDS) {
    if (!artifacts.some((artifact) => artifact.kind === kind)) {
      fail(`artifacts must include a ${kind} identity.`);
    }
  }
  return artifacts.sort((left, right) =>
    `${left.kind}:${left.id}`.localeCompare(`${right.kind}:${right.id}`),
  );
}

function normalizePublications(value, artifacts) {
  if (!Array.isArray(value) || value.length !== DESTINATIONS.length) {
    fail(`publications must contain exactly ${DESTINATIONS.length} destinations.`);
  }
  const artifactIds = new Set(artifacts.map(({ id }) => id));
  const publications = value.map((publication, index) => {
    const label = `publications[${index}]`;
    requireRecord(publication, label);
    const destination = requireString(
      publication.destination,
      `${label}.destination`,
    );
    if (!DESTINATIONS.includes(destination)) {
      fail(`${label}.destination is not authoritative.`);
    }
    const ids = requireUniqueStrings(
      publication.artifactIds,
      `${label}.artifactIds`,
    );
    if (ids.some((id) => !artifactIds.has(id))) {
      fail(`${label}.artifactIds contains an unknown stable artifact.`);
    }
    if (publication.status !== "verified") {
      fail(`${label}.status must be verified.`);
    }
    const expectedReceiptDigest = sha256({
      artifactIds: ids,
      destination,
      status: "verified",
    });
    const receiptDigest = requireDigest(
      publication.receiptDigest,
      `${label}.receiptDigest`,
    );
    if (receiptDigest !== expectedReceiptDigest) {
      fail(`${label}.receiptDigest does not identify its verified digest set.`);
    }
    return {
      destination,
      artifactIds: ids.sort(),
      status: "verified",
      receiptDigest,
    };
  });
  const destinations = new Set(
    publications.map(({ destination }) => destination),
  );
  if (destinations.size !== publications.length) {
    fail("publications must contain each authoritative destination exactly once.");
  }
  const publishedIds = publications.flatMap(({ artifactIds: ids }) => ids);
  if (
    publishedIds.length !== artifacts.length ||
    new Set(publishedIds).size !== artifacts.length ||
    publishedIds.some((id) => !artifactIds.has(id))
  ) {
    fail("publications must cover every stable artifact exactly once.");
  }
  return publications.sort((left, right) =>
    left.destination.localeCompare(right.destination),
  );
}

function normalizeDocumentation(value) {
  const documentation = requireRecord(value, "documentation");
  const normalized = {
    version: requireString(documentation.version, "documentation.version"),
    versionedPath: requirePaths(
      [documentation.versionedPath],
      "documentation.versionedPath",
    )[0],
    releaseEvidencePath: requirePaths(
      [documentation.releaseEvidencePath],
      "documentation.releaseEvidencePath",
    )[0],
    immutable: requireBoolean(
      documentation.immutable,
      "documentation.immutable",
    ),
    contentDigest: requireDigest(
      documentation.contentDigest,
      "documentation.contentDigest",
    ),
    indexDigest: requireDigest(
      documentation.indexDigest,
      "documentation.indexDigest",
    ),
  };
  if (normalized.version !== STABLE_PLATFORM_VERSION || !normalized.immutable) {
    fail("Stable documentation must be immutable and versioned as 1.0.0.");
  }
  if (
    !normalized.versionedPath.startsWith("docs/releases/1.0.0/") ||
    normalized.releaseEvidencePath !==
      `${STABLE_PROMOTION_SOLUTION_ROOT}/stable-promotion.json`
  ) {
    fail("Stable documentation must use the immutable 1.0.0 release paths.");
  }
  return normalized;
}

function normalizeApproval(value, documentation) {
  const approval = requireRecord(value, "approval");
  const normalized = {
    status: requireString(approval.status, "approval.status"),
    method: requireString(approval.method, "approval.method"),
    evidencePath: requirePaths(
      [approval.evidencePath],
      "approval.evidencePath",
    )[0],
    digest: requireDigest(approval.digest, "approval.digest"),
  };
  if (
    normalized.status !== "recorded" ||
    normalized.method !== "authenticated-review" ||
    normalized.evidencePath !== documentation.versionedPath ||
    normalized.digest !==
      sha256({
        evidencePath: normalized.evidencePath,
        method: normalized.method,
        status: normalized.status,
      })
  ) {
    fail("Stable promotion approval must be an authenticated, immutable evidence record.");
  }
  return normalized;
}

function normalizeCompatibilityBaseline(value) {
  const baseline = requireRecord(value, "compatibilityBaseline");
  const immediate = requireRecord(
    baseline.immediate,
    "compatibilityBaseline.immediate",
  );
  const predecessor = requireRecord(
    baseline.predecessor,
    "compatibilityBaseline.predecessor",
  );
  const normalized = {
    kind: requireString(baseline.kind, "compatibilityBaseline.kind"),
    major: baseline.major,
    version: requireString(
      baseline.version,
      "compatibilityBaseline.version",
    ),
    status: requireString(baseline.status, "compatibilityBaseline.status"),
    immediate: {
      status: requireString(
        immediate.status,
        "compatibilityBaseline.immediate.status",
      ),
      reason: requireString(
        immediate.reason,
        "compatibilityBaseline.immediate.reason",
      ),
    },
    minorCohorts: Array.isArray(baseline.minorCohorts)
      ? baseline.minorCohorts
      : fail("compatibilityBaseline.minorCohorts must be an array."),
    predecessor: {
      status: requireString(
        predecessor.status,
        "compatibilityBaseline.predecessor.status",
      ),
      reason: requireString(
        predecessor.reason,
        "compatibilityBaseline.predecessor.reason",
      ),
    },
    providerClaims: Array.isArray(baseline.providerClaims)
      ? baseline.providerClaims
      : fail("compatibilityBaseline.providerClaims must be an array."),
    deploymentClaims: Array.isArray(baseline.deploymentClaims)
      ? baseline.deploymentClaims
      : fail("compatibilityBaseline.deploymentClaims must be an array."),
    migrationClaims: Array.isArray(baseline.migrationClaims)
      ? baseline.migrationClaims
      : fail("compatibilityBaseline.migrationClaims must be an array."),
    digest: requireDigest(
      baseline.digest,
      "compatibilityBaseline.digest",
    ),
  };
  if (
    normalized.kind !== "major-floor" ||
    normalized.major !== 1 ||
    normalized.version !== STABLE_PLATFORM_VERSION ||
    normalized.status !== "established" ||
    normalized.immediate.status !== "not-applicable" ||
    normalized.immediate.reason !== FIRST_MAJOR_FLOOR_REASON ||
    normalized.predecessor.status !== "not-applicable" ||
    normalized.predecessor.reason !== FIRST_MAJOR_FLOOR_REASON ||
    normalized.minorCohorts.length !== 0 ||
    normalized.providerClaims.length !== 0 ||
    normalized.deploymentClaims.length !== 0 ||
    normalized.migrationClaims.length !== 0
  ) {
    fail(
      "The first stable release must establish only the 1.0.0 major-floor baseline.",
    );
  }
  const { digest, ...baselineBody } = normalized;
  if (sha256(baselineBody) !== digest) {
    fail("compatibilityBaseline.digest does not match its immutable baseline.");
  }
  return normalized;
}

function normalizeReleasePolicy(value) {
  const policy = requireRecord(value, "releasePolicy");
  const states = requireUniqueStrings(policy.states, "releasePolicy.states");
  const publicationOrder = requireUniqueStrings(
    policy.publicationOrder,
    "releasePolicy.publicationOrder",
  );
  const normalized = {
    states,
    terminalState: requireString(
      policy.terminalState,
      "releasePolicy.terminalState",
    ),
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
    approvalRequired: requireBoolean(
      policy.approvalRequired,
      "releasePolicy.approvalRequired",
    ),
    atomicCompleteSet: requireBoolean(
      policy.atomicCompleteSet,
      "releasePolicy.atomicCompleteSet",
    ),
    failedPublicationBurnsVersion: requireBoolean(
      policy.failedPublicationBurnsVersion,
      "releasePolicy.failedPublicationBurnsVersion",
    ),
    publicationOrder,
  };
  if (
    canonicalJson(states) !== canonicalJson(PROMOTION_STATES) ||
    normalized.terminalState !== "promote" ||
    !normalized.builtOnce ||
    !normalized.exactBytes ||
    !normalized.promotionWithoutRebuild ||
    normalized.patchInPlace ||
    !normalized.approvalRequired ||
    !normalized.atomicCompleteSet ||
    !normalized.failedPublicationBurnsVersion ||
    canonicalJson(publicationOrder) !== canonicalJson(DESTINATIONS)
  ) {
    fail("Stable promotion policy must be build-once, approved, atomic, and immutable.");
  }
  return normalized;
}

function normalizeVerification(value) {
  const verification = requireRecord(value, "verification");
  const requiredGates = requireUniqueStrings(
    verification.requiredGates,
    "verification.requiredGates",
  );
  const normalized = {
    cadence: requireString(verification.cadence, "verification.cadence"),
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
    requiredGates,
    notApplicable: requireUniqueStrings(
      verification.notApplicable,
      "verification.notApplicable",
    ),
    notSelected: requireUniqueStrings(
      verification.notSelected,
      "verification.notSelected",
    ),
  };
  if (
    normalized.cadence !== STABLE_PROMOTION_CADENCE ||
    normalized.entrypoint !== "eng/verify.mjs" ||
    normalized.command !== STABLE_PROMOTION_VERIFICATION_COMMAND ||
    !normalized.failClosed ||
    canonicalJson(requiredGates) !== canonicalJson(STABLE_PROMOTION_REQUIRED_GATES) ||
    normalized.notApplicable.length !== 0 ||
    normalized.notSelected.length !== 0
  ) {
    fail("Stable promotion verification must run fail-closed with every release gate.");
  }
  if (
    requiredGates.some((gateId) => !REQUIRED_GATE_SET.has(gateId)) ||
    requiredGates.length !== STABLE_PROMOTION_REQUIRED_GATES.length
  ) {
    fail("Stable promotion verification must not omit or add release gates.");
  }
  return normalized;
}

function normalizeEvidence(value, artifacts, acceptedReleaseCandidate) {
  const evidence = requireRecord(value, "evidence");
  const paths = requirePaths(evidence.paths, "evidence.paths");
  const normalized = {
    paths,
    digest: requireDigest(evidence.digest, "evidence.digest"),
  };
  const { digest, ...evidenceBody } = normalized;
  if (
    digest !==
    sha256({
      acceptedReleaseCandidate,
      artifactIds: artifacts.map(({ id }) => id),
      paths,
    })
  ) {
    fail("evidence.digest does not identify the immutable release evidence index.");
  }
  return normalized;
}

function createStablePromotionEvidenceBody(input) {
  requireRecord(input, "Stable promotion evidence input");
  const source = normalizeSource(input.source);
  const acceptedReleaseCandidate = normalizeAcceptedReleaseCandidate(
    input.acceptedReleaseCandidate,
  );
  const stableVersion = requireString(input.stableVersion, "stableVersion");
  const platformContractVersion = requireString(
    input.platformContractVersion,
    "platformContractVersion",
  );
  if (
    stableVersion !== STABLE_PLATFORM_VERSION ||
    platformContractVersion !== STABLE_PLATFORM_CONTRACT_VERSION
  ) {
    fail("Stable promotion evidence must target Platform 1.0.0.");
  }
  const artifacts = normalizeArtifacts(input.artifacts, stableVersion);
  const artifactSetDigest = sha256(artifacts);
  const publications = normalizePublications(input.publications, artifacts);
  const publicationDigest = sha256(publications);
  const documentation = normalizeDocumentation(input.documentation);
  const approval = normalizeApproval(input.approval, documentation);
  const compatibilityBaseline = normalizeCompatibilityBaseline(
    input.compatibilityBaseline,
  );
  const releasePolicy = normalizeReleasePolicy(input.releasePolicy);
  const verification = normalizeVerification(input.verification);
  const supportClaims = Array.isArray(input.supportClaims)
    ? input.supportClaims
    : fail("supportClaims must be an array.");
  if (supportClaims.length !== 0) {
    fail("Stable promotion evidence must not make Supported claims.");
  }
  const evidence = normalizeEvidence(
    input.evidence,
    artifacts,
    acceptedReleaseCandidate,
  );
  const promotionInputDigest = sha256({
    acceptedReleaseCandidate,
    artifactSetDigest,
    publicationDigest,
  });
  const promotionEvidenceDigest = sha256({
    artifactSetDigest,
    compatibilityBaselineDigest: compatibilityBaseline.digest,
    documentationIndexDigest: documentation.indexDigest,
    approvalDigest: approval.digest,
    evidenceDigest: evidence.digest,
    platformContractVersion,
    promotionInputDigest,
  });
  const promotionGate = {
    id: STABLE_PROMOTION_GATE_ID,
    outcome: "passed",
    inputDigest: promotionInputDigest,
    evidenceDigest: promotionEvidenceDigest,
    attempts: [{ number: 1, outcome: "passed" }],
  };
  const identity = {
    acceptedReleaseCandidate,
    artifacts,
    artifactSetDigest,
    compatibilityBaseline,
    documentation,
    approval,
    evidence,
    platformContractVersion,
    publicationDigest,
    publications,
    releasePolicy,
    source,
    stableVersion,
    verification,
  };
  const promotionSeed = sha256(identity).slice("sha256:".length);
  return {
    $schema: STABLE_PROMOTION_SCHEMA_URI,
    schemaVersion: STABLE_PROMOTION_SCHEMA_VERSION,
    kind: "stable-promotion-evidence",
    solution: STABLE_PROMOTION_SOLUTION_NAME,
    promotionId: `stable-${stableVersion}-${promotionSeed.slice(0, 16)}`,
    stableVersion,
    platformContractVersion,
    maturity: "stable",
    source,
    acceptedReleaseCandidate,
    artifacts,
    artifactSetDigest,
    publications,
    publicationDigest,
    documentation,
    approval,
    compatibilityBaseline,
    releasePolicy,
    verification,
    promotionGate,
    evidence,
    supportClaims: NO_SUPPORT_CLAIMS,
  };
}

export function createStablePromotionEvidence(input) {
  const evidenceBody = createStablePromotionEvidenceBody(input);
  assertSecretFree(evidenceBody);
  return {
    ...evidenceBody,
    evidenceDigest: sha256(evidenceBody),
  };
}

function compareAcceptedReleaseCandidate(evidence, releaseCandidate) {
  const accepted = evidence.acceptedReleaseCandidate;
  if (
    evidence.source.commit !== releaseCandidate.source.commit ||
    accepted.candidateId !== releaseCandidate.candidateId ||
    accepted.platformVersion !== releaseCandidate.platformVersion ||
    accepted.platformContractVersion !==
      releaseCandidate.platformContractVersion ||
    accepted.sourceCommit !== releaseCandidate.source.commit ||
    accepted.artifactSetDigest !== releaseCandidate.artifactSetDigest ||
    accepted.evidenceDigest !== releaseCandidate.evidenceDigest
  ) {
    fail("Stable promotion does not bind the accepted Release Candidate identity.");
  }
  const candidateArtifacts = new Map(
    releaseCandidate.artifacts.map((artifact) => [artifact.id, artifact]),
  );
  if (
    evidence.artifacts.length !== releaseCandidate.artifacts.length ||
    releaseCandidate.artifacts.some(
      (artifact) =>
        !evidence.artifacts.some(
          ({ sourceArtifactId }) => sourceArtifactId === artifact.id,
        ),
    )
  ) {
    fail("Stable promotion must cover the complete accepted Release Candidate artifact set.");
  }
  for (const artifact of evidence.artifacts) {
    const acceptedArtifact = candidateArtifacts.get(artifact.sourceArtifactId);
    if (
      acceptedArtifact === undefined ||
      artifact.kind !== acceptedArtifact.kind ||
      artifact.path !== acceptedArtifact.path ||
      artifact.acceptedDigest !== acceptedArtifact.digest ||
      canonicalJson(artifact.identity) !== canonicalJson(acceptedArtifact.identity)
    ) {
      fail(
        `Stable artifact ${artifact.id} is not byte-identical to its accepted Release Candidate artifact.`,
      );
    }
  }
}

export function verifyStablePromotionEvidence(
  evidence,
  releaseCandidate,
  schema,
) {
  requireRecord(evidence, "Stable promotion evidence");
  assertSecretFree(evidence);
  if (schema !== undefined) {
    validateSchema(evidence, schema);
  }
  const { evidenceDigest, ...evidenceBody } = evidence;
  requireDigest(evidenceDigest, "evidenceDigest");
  if (sha256(evidenceBody) !== evidenceDigest) {
    fail("Stable promotion evidence digest does not match its content.");
  }
  if (
    evidenceBody.$schema !== STABLE_PROMOTION_SCHEMA_URI ||
    evidenceBody.schemaVersion !== STABLE_PROMOTION_SCHEMA_VERSION ||
    evidenceBody.kind !== "stable-promotion-evidence" ||
    evidenceBody.solution !== STABLE_PROMOTION_SOLUTION_NAME ||
    evidenceBody.stableVersion !== STABLE_PLATFORM_VERSION ||
    evidenceBody.platformContractVersion !== STABLE_PLATFORM_CONTRACT_VERSION ||
    evidenceBody.maturity !== "stable"
  ) {
    fail("Stable promotion evidence identity is invalid.");
  }
  const recreated = createStablePromotionEvidence({
    source: evidenceBody.source,
    acceptedReleaseCandidate: evidenceBody.acceptedReleaseCandidate,
    stableVersion: evidenceBody.stableVersion,
    platformContractVersion: evidenceBody.platformContractVersion,
    artifacts: evidenceBody.artifacts,
    publications: evidenceBody.publications,
    documentation: evidenceBody.documentation,
    approval: evidenceBody.approval,
    compatibilityBaseline: evidenceBody.compatibilityBaseline,
    releasePolicy: evidenceBody.releasePolicy,
    verification: evidenceBody.verification,
    evidence: evidenceBody.evidence,
    supportClaims: evidenceBody.supportClaims,
  });
  if (canonicalJson(recreated) !== canonicalJson(evidence)) {
    fail("Stable promotion evidence identity is not reproducible.");
  }
  if (evidenceBody.artifactSetDigest !== sha256(evidenceBody.artifacts)) {
    fail("artifactSetDigest does not match the stable artifact set.");
  }
  if (releaseCandidate !== undefined) {
    verifyReleaseCandidateEvidence(releaseCandidate);
    compareAcceptedReleaseCandidate(evidenceBody, releaseCandidate);
  }
  return true;
}

function verifyManifest(manifest) {
  requireRecord(manifest, "stable promotion manifest");
  if (
    manifest.kind !== "generated-solution" ||
    manifest.repository?.name !== STABLE_PROMOTION_SOLUTION_NAME
  ) {
    fail("Stable promotion manifest must identify its named Generated Solution.");
  }
  if (
    manifest.platformVersion !== STABLE_PLATFORM_VERSION ||
    manifest.platformContractVersion !== STABLE_PLATFORM_CONTRACT_VERSION
  ) {
    fail("Stable promotion manifest must identify Platform 1.0.0.");
  }
  if (manifest.supportClaims?.length !== 0) {
    fail("Stable promotion manifest must remain claim-free.");
  }
  if (
    manifest.security?.secretPolicy !== "external-only" ||
    manifest.security?.containsSecrets !== false
  ) {
    fail("Stable promotion manifest must be secret-free.");
  }
  if (!manifest.verification?.cadences?.includes(STABLE_PROMOTION_CADENCE)) {
    fail("Stable promotion manifest must identify the release-candidate cadence.");
  }
}

function collectEvidencePaths(evidence) {
  const paths = [
    ...evidence.source.reviewEvidence,
    evidence.documentation.versionedPath,
    evidence.documentation.releaseEvidencePath,
    ...evidence.evidence.paths,
  ];
  for (const artifact of evidence.artifacts) {
    paths.push(artifact.path);
  }
  return [...new Set(paths)];
}

async function readJson(root, relativePath, label = "stable promotion input") {
  try {
    return JSON.parse(await readFile(join(root, relativePath), "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") {
      fail(`Missing ${label}: ${relativePath}.`, "missing-input");
    }
    if (error instanceof SyntaxError) {
      fail(`Invalid JSON in ${label}: ${relativePath}.`, "invalid-input");
    }
    throw error;
  }
}

async function verifyEvidencePaths(root, evidencePaths) {
  for (const relativePath of evidencePaths) {
    try {
      await readFile(join(root, relativePath));
    } catch (error) {
      if (error?.code === "ENOENT") {
        fail(
          `Stable promotion evidence path is missing: ${relativePath}.`,
          "missing-evidence",
        );
      }
      throw error;
    }
  }
}

export async function verifyStablePromotionFixture({
  rootDir = process.cwd(),
  fixture,
  manifest,
  schema,
  releaseCandidate,
  releaseCandidateSchema,
} = {}) {
  const root = resolve(rootDir);
  const loadedFixture =
    fixture ??
    (await readJson(
      root,
      `${STABLE_PROMOTION_SOLUTION_ROOT}/stable-promotion.json`,
    ));
  const loadedManifest =
    manifest ??
    (await readJson(
      root,
      `${STABLE_PROMOTION_SOLUTION_ROOT}/martix.platform.json`,
    ));
  const loadedSchema =
    schema ?? (await readJson(root, "schemas/stable-promotion.schema.json"));
  const loadedReleaseCandidate =
    releaseCandidate ??
    (await readJson(
      root,
      `${RELEASE_CANDIDATE_SOLUTION_ROOT}/release-candidate.json`,
      "accepted Release Candidate",
    ));
  const loadedReleaseCandidateSchema =
    releaseCandidateSchema ??
    (await readJson(
      root,
      "schemas/release-candidate.schema.json",
      "Release Candidate schema",
    ));

  verifyReleaseCandidateEvidence(
    loadedReleaseCandidate,
    loadedReleaseCandidateSchema,
  );
  verifyStablePromotionEvidence(
    loadedFixture,
    loadedReleaseCandidate,
    loadedSchema,
  );
  verifyManifest(loadedManifest);

  const evidencePaths = collectEvidencePaths(loadedFixture);
  await verifyEvidencePaths(root, evidencePaths);
  const documentationContent = await readFile(
    join(root, loadedFixture.documentation.versionedPath),
    "utf8",
  );
  if (sha256(documentationContent) !== loadedFixture.documentation.contentDigest) {
    fail(
      "Stable documentation content does not match its immutable evidence digest.",
    );
  }
  return {
    status: "passed",
    maturity: loadedFixture.maturity,
    cadence: loadedFixture.verification.cadence,
    solution: loadedFixture.solution,
    promotionId: loadedFixture.promotionId,
    platformVersion: loadedFixture.stableVersion,
    acceptedCandidateVersion:
      loadedFixture.acceptedReleaseCandidate.platformVersion,
    artifactCount: loadedFixture.artifacts.length,
    destinationCount: loadedFixture.publications.length,
    compatibilityBaseline: loadedFixture.compatibilityBaseline.version,
    supportClaims: [...loadedFixture.supportClaims],
    evidencePaths,
    evidenceDigest: loadedFixture.evidenceDigest,
    fixtureRoot: STABLE_PROMOTION_SOLUTION_ROOT,
  };
}

export const verifyStablePromotion = verifyStablePromotionFixture;

async function runCli() {
  const result = await verifyStablePromotionFixture();
  console.log(JSON.stringify(result, null, 2));
}

const invokedFile = process.argv[1]
  ? `file://${resolve(process.argv[1])}`
  : null;

if (invokedFile === import.meta.url) {
  runCli().catch((error) => {
    if (
      error instanceof StablePromotionError ||
      error?.name === "ReleaseCandidateError"
    ) {
      console.error(`Verification failed: ${error.message}`);
    } else {
      console.error("Verification failed due to an unexpected internal error.");
    }
    process.exitCode = 1;
  });
}
