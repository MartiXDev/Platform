import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { z } from "zod";
import {
  STABLE_PLATFORM_CONTRACT_VERSION,
  STABLE_PLATFORM_VERSION,
  STABLE_PROMOTION_CADENCE,
  STABLE_PROMOTION_REQUIRED_GATES,
  STABLE_PROMOTION_SOLUTION_ROOT,
  canonicalJson,
  sha256,
  verifyStablePromotionFixture,
} from "./stable-promotion.mjs";

export const CANONICAL_CUTOVER_SCHEMA_VERSION = "1.0.0";
export const CANONICAL_CUTOVER_SCHEMA_URI =
  "https://github.com/MartiXDev/Platform/schemas/canonical-cutover.schema.json";
export const CANONICAL_CUTOVER_SOLUTION_NAME =
  "CanonicalCutoverGeneratedSolution";
export const CANONICAL_CUTOVER_SOLUTION_ROOT =
  `tests/fixtures/${CANONICAL_CUTOVER_SOLUTION_NAME}`;
export const CANONICAL_CUTOVER_CADENCE = STABLE_PROMOTION_CADENCE;
export const CANONICAL_CUTOVER_CADENCES = Object.freeze([
  CANONICAL_CUTOVER_CADENCE,
]);
export const CANONICAL_CUTOVER_GATE_ID = "canonical.cutover";
export const CANONICAL_CUTOVER_VERIFICATION_COMMAND =
  "npm run verify:canonical-cutover";
export const CANONICAL_CUTOVER_REQUIRED_GATES = Object.freeze([
  ...STABLE_PROMOTION_REQUIRED_GATES,
  CANONICAL_CUTOVER_GATE_ID,
]);
export const CANONICAL_CUTOVER_RELEASE = "1.0.0";
export const CANONICAL_CUTOVER_DATE = "2026-08-09";
export const CANONICAL_REPOSITORY = "MartiXDev/Platform";
export const CANONICAL_REPOSITORY_URL =
  "https://github.com/MartiXDev/Platform";

const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;
const COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const REQUIRED_GATE_SET = new Set(CANONICAL_CUTOVER_REQUIRED_GATES);
const SECRET_KEY_PATTERN =
  /(?:secret|password|token|private.?key|access.?key|api.?key|credential)/i;
const INSTALLATION_IDS = Object.freeze([
  "runtime-packages",
  "template-package",
  "dotnet-tool",
  "versioned-documentation",
  "marketplace-skill",
]);
const SMOKE_TEST_IDS = Object.freeze([
  "api-preset",
  "modular-monolith-preset",
  "full-stack-preset",
]);
const SMOKE_SOLUTION_ROOTS = new Map([
  [
    "api-preset",
    "tests/fixtures/RepositoryBootstrapGeneratedSolution",
  ],
  [
    "modular-monolith-preset",
    "tests/fixtures/ModularMonolithGeneratedSolution",
  ],
  ["full-stack-preset", "tests/fixtures/FullStackGeneratedSolution"],
]);
const ARCHIVAL_REPOSITORIES = Object.freeze([
  {
    name: "MartiXDev/WebApi",
    url: "https://github.com/MartiXDev/WebApi",
    finalSnapshotTag: "martix-platform-cutover-1.0.0",
  },
  {
    name: "MartiXDev/dotnet-templates",
    url: "https://github.com/MartiXDev/dotnet-templates",
    finalSnapshotTag: "martix-platform-cutover-1.0.0",
  },
]);
const BANNER_TEXT = `Archived / Unsupported as of MartiX Platform ${CANONICAL_CUTOVER_RELEASE} (${CANONICAL_CUTOVER_DATE}). Canonical source: ${CANONICAL_REPOSITORY_URL}. No compatibility or migration contract is provided.`;

export class CanonicalCutoverError extends Error {
  constructor(message, code = "invalid-canonical-cutover") {
    super(message);
    this.name = "CanonicalCutoverError";
    this.code = code;
  }
}

function fail(message, code = "invalid-canonical-cutover") {
  throw new CanonicalCutoverError(message, code);
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
  if (!COMMIT_PATTERN.test(commit)) {
    fail(`${label} must be a 40-character hexadecimal commit.`);
  }
  return commit;
}

function requireDate(value, label) {
  const date = requireString(value, label);
  if (!DATE_PATTERN.test(date)) {
    fail(`${label} must be an ISO calendar date.`);
  }
  return date;
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

function assertSecretFree(value, path = "canonical cutover evidence") {
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
      fail(`${path}.${key} is not allowed in canonical cutover evidence.`, "secret-input");
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
  requireRecord(schema, "canonical cutover schema");
  if (
    schema.$id !== CANONICAL_CUTOVER_SCHEMA_URI ||
    schema.type !== "object"
  ) {
    fail("Canonical cutover schema identity is invalid.", "invalid-schema");
  }
  assertSecretFree(schema, "schemas/canonical-cutover.schema.json");
  validateClosedObjectSchemas(schema, "schemas/canonical-cutover.schema.json");
  const result = z.fromJSONSchema(schema).safeParse(evidence);
  if (!result.success) {
    const issue = result.error.issues[0];
    fail(
      `Canonical cutover schema rejected ${
        issue.path.join(".") || "the fixture"
      }: ${issue.message}.`,
      "invalid-schema",
    );
  }
}

function requireCompleteIdSet(items, expectedIds, message) {
  const ids = items.map(({ id }) => id);
  if (
    new Set(ids).size !== ids.length ||
    canonicalJson([...ids].sort()) !== canonicalJson([...expectedIds].sort())
  ) {
    fail(message);
  }
  return items.sort((left, right) => left.id.localeCompare(right.id));
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
    fail("Canonical cutover source must be clean and reviewed.");
  }
  return normalized;
}

function normalizeCanonicalSource(value) {
  const source = requireRecord(value, "canonicalSource");
  const normalized = {
    repository: requireString(
      source.repository,
      "canonicalSource.repository",
    ),
    url: requireString(source.url, "canonicalSource.url"),
    role: requireString(source.role, "canonicalSource.role"),
    activelyMaintained: requireBoolean(
      source.activelyMaintained,
      "canonicalSource.activelyMaintained",
    ),
    soleKnowledgeSource: requireBoolean(
      source.soleKnowledgeSource,
      "canonicalSource.soleKnowledgeSource",
    ),
    soleDistributionSource: requireBoolean(
      source.soleDistributionSource,
      "canonicalSource.soleDistributionSource",
    ),
  };
  if (
    normalized.repository !== CANONICAL_REPOSITORY ||
    normalized.url !== CANONICAL_REPOSITORY_URL ||
    normalized.role !== "sole-actively-maintained-canonical-source" ||
    !normalized.activelyMaintained ||
    !normalized.soleKnowledgeSource ||
    !normalized.soleDistributionSource
  ) {
    fail("Platform must be the sole actively maintained Canonical Knowledge and distribution source.");
  }
  return normalized;
}

function normalizePromotedStable(value) {
  const stable = requireRecord(value, "promotedStable");
  const artifactIds = requireUniqueStrings(
    stable.artifactIds,
    "promotedStable.artifactIds",
  );
  const normalized = {
    promotionId: requireString(
      stable.promotionId,
      "promotedStable.promotionId",
    ),
    stableVersion: requireString(
      stable.stableVersion,
      "promotedStable.stableVersion",
    ),
    platformContractVersion: requireString(
      stable.platformContractVersion,
      "promotedStable.platformContractVersion",
    ),
    evidenceDigest: requireDigest(
      stable.evidenceDigest,
      "promotedStable.evidenceDigest",
    ),
    artifactSetDigest: requireDigest(
      stable.artifactSetDigest,
      "promotedStable.artifactSetDigest",
    ),
    artifactIds,
    exactBytes: requireBoolean(
      stable.exactBytes,
      "promotedStable.exactBytes",
    ),
    rebuilt: requireBoolean(stable.rebuilt, "promotedStable.rebuilt"),
  };
  if (
    normalized.stableVersion !== STABLE_PLATFORM_VERSION ||
    normalized.platformContractVersion !== STABLE_PLATFORM_CONTRACT_VERSION ||
    !normalized.exactBytes ||
    normalized.rebuilt
  ) {
    fail("Canonical cutover must consume the exact, non-rebuilt Stable 1.0.0 bytes.");
  }
  return normalized;
}

function normalizeArtifactDigests(value, stableArtifacts, label) {
  if (!Array.isArray(value) || value.length === 0) {
    fail(`${label} must contain artifact digest entries.`);
  }
  if (stableArtifacts.some((artifact) => artifact === undefined)) {
    fail(`${label} references an unknown promoted Stable artifact.`);
  }
  const normalized = value.map((entry, index) => {
    const entryLabel = `${label}[${index}]`;
    requireRecord(entry, entryLabel);
    return {
      artifactId: requireString(entry.artifactId, `${entryLabel}.artifactId`),
      digest: requireDigest(entry.digest, `${entryLabel}.digest`),
    };
  });
  if (
    new Set(normalized.map(({ artifactId }) => artifactId)).size !==
    normalized.length
  ) {
    fail(`${label} must contain unique artifact identities.`);
  }
  const expected = new Map(
    stableArtifacts.map(({ id, promotedDigest }) => [id, promotedDigest]),
  );
  for (const { artifactId, digest } of normalized) {
    if (expected.get(artifactId) !== digest) {
      fail(`${label} must bind every artifact to its promoted Stable digest.`);
    }
  }
  if (
    normalized.length !== expected.size ||
    [...expected.keys()].some(
      (artifactId) => !normalized.some((entry) => entry.artifactId === artifactId),
    )
  ) {
    fail(`${label} must cover the complete promoted Stable artifact set.`);
  }
  return normalized.sort((left, right) =>
    left.artifactId.localeCompare(right.artifactId),
  );
}

function normalizeInstallations(value, stableArtifacts) {
  if (!Array.isArray(value) || value.length !== INSTALLATION_IDS.length) {
    fail(`installations must contain exactly ${INSTALLATION_IDS.length} public installation checks.`);
  }
  const expectedArtifacts = new Map(
    stableArtifacts.map((artifact) => [artifact.id, artifact]),
  );
  const installations = value.map((installation, index) => {
    const label = `installations[${index}]`;
    requireRecord(installation, label);
    const artifactIds = requireUniqueStrings(
      installation.artifactIds,
      `${label}.artifactIds`,
    );
    const normalized = {
      id: requireString(installation.id, `${label}.id`),
      kind: requireString(installation.kind, `${label}.kind`),
      destination: requireString(
        installation.destination,
        `${label}.destination`,
      ),
      version: requireString(installation.version, `${label}.version`),
      artifactIds,
      artifactDigests: normalizeArtifactDigests(
        installation.artifactDigests,
        artifactIds.map((artifactId) => expectedArtifacts.get(artifactId)),
        `${label}.artifactDigests`,
      ),
      public: requireBoolean(installation.public, `${label}.public`),
      status: requireString(installation.status, `${label}.status`),
      exactBytes: requireBoolean(
        installation.exactBytes,
        `${label}.exactBytes`,
      ),
      rebuilt: requireBoolean(installation.rebuilt, `${label}.rebuilt`),
      evidencePaths: requirePaths(
        installation.evidencePaths,
        `${label}.evidencePaths`,
      ),
      digest: requireDigest(installation.digest, `${label}.digest`),
    };
    if (
      !INSTALLATION_IDS.includes(normalized.id) ||
      normalized.version !== STABLE_PLATFORM_VERSION ||
      !normalized.public ||
      normalized.status !== "passed" ||
      !normalized.exactBytes ||
      normalized.rebuilt ||
      normalized.artifactIds.length === 0 ||
      normalized.artifactIds.some((artifactId) => !expectedArtifacts.has(artifactId))
    ) {
      fail(`${label} is not a passed exact-byte public installation check.`);
    }
    const { digest, ...body } = normalized;
    if (sha256(body) !== digest) {
      fail(`${label}.digest does not match its immutable installation check.`);
    }
    return normalized;
  });
  return requireCompleteIdSet(
    installations,
    INSTALLATION_IDS,
    "installations must contain each public installation check exactly once.",
  );
}

function normalizeSmokeTests(value, stableArtifacts) {
  if (!Array.isArray(value) || value.length !== SMOKE_TEST_IDS.length) {
    fail(`smokeTests must contain exactly ${SMOKE_TEST_IDS.length} generated-solution checks.`);
  }
  const templateDigest = stableArtifacts.find(
    ({ id }) => id === "martix-app",
  )?.promotedDigest;
  if (templateDigest === undefined) {
    fail("Promoted Stable artifacts must include the martix-app template.");
  }
  const smokeTests = value.map((smokeTest, index) => {
    const label = `smokeTests[${index}]`;
    requireRecord(smokeTest, label);
    const normalized = {
      id: requireString(smokeTest.id, `${label}.id`),
      solution: requireString(smokeTest.solution, `${label}.solution`),
      root: requireString(smokeTest.root, `${label}.root`),
      command: requireString(smokeTest.command, `${label}.command`),
      inputDigest: requireDigest(
        smokeTest.inputDigest,
        `${label}.inputDigest`,
      ),
      status: requireString(smokeTest.status, `${label}.status`),
      exactBytes: requireBoolean(
        smokeTest.exactBytes,
        `${label}.exactBytes`,
      ),
      evidencePaths: requirePaths(
        smokeTest.evidencePaths,
        `${label}.evidencePaths`,
      ),
      digest: requireDigest(smokeTest.digest, `${label}.digest`),
    };
    if (
      !SMOKE_TEST_IDS.includes(normalized.id) ||
      SMOKE_SOLUTION_ROOTS.get(normalized.id) !== normalized.root ||
      normalized.inputDigest !== templateDigest ||
      normalized.status !== "passed" ||
      !normalized.exactBytes
    ) {
      fail(`${label} is not a passed exact-byte Generated Solution smoke test.`);
    }
    const { digest, ...body } = normalized;
    if (sha256(body) !== digest) {
      fail(`${label}.digest does not match its immutable smoke test.`);
    }
    return normalized;
  });
  return requireCompleteIdSet(
    smokeTests,
    SMOKE_TEST_IDS,
    "smokeTests must contain each named Generated Solution exactly once.",
  );
}

function normalizeDocumentation(value) {
  const documentation = requireRecord(value, "documentation");
  const paths = requirePaths(documentation.paths, "documentation.paths");
  const contentDigests = documentation.contentDigests;
  if (!Array.isArray(contentDigests) || contentDigests.length !== paths.length) {
    fail("documentation.contentDigests must cover every immutable documentation path.");
  }
  const normalizedDigests = contentDigests.map((entry, index) => {
    const label = `documentation.contentDigests[${index}]`;
    requireRecord(entry, label);
    return {
      path: requireString(entry.path, `${label}.path`),
      digest: requireDigest(entry.digest, `${label}.digest`),
    };
  });
  if (
    new Set(normalizedDigests.map(({ path }) => path)).size !==
      normalizedDigests.length ||
    normalizedDigests.some(({ path }) => !paths.includes(path))
  ) {
    fail("documentation.contentDigests must cover the declared paths exactly once.");
  }
  const normalized = {
    version: requireString(documentation.version, "documentation.version"),
    paths,
    immutable: requireBoolean(documentation.immutable, "documentation.immutable"),
    contentDigests: normalizedDigests.sort((left, right) =>
      left.path.localeCompare(right.path),
    ),
    digest: requireDigest(documentation.digest, "documentation.digest"),
  };
  if (normalized.version !== STABLE_PLATFORM_VERSION || !normalized.immutable) {
    fail("Canonical cutover documentation must be immutable and versioned as 1.0.0.");
  }
  const { digest, ...body } = normalized;
  if (sha256(body) !== digest) {
    fail("documentation.digest does not match its immutable content index.");
  }
  return normalized;
}

function normalizeMarketplaceSkill(value, stableArtifacts) {
  const skill = requireRecord(value, "marketplaceSkill");
  const stableSkill = stableArtifacts.find(({ id }) => id === "martix-platform");
  if (stableSkill === undefined) {
    fail("Promoted Stable artifacts must include the martix-platform Skill.");
  }
  const normalized = {
    sourceRepository: requireString(
      skill.sourceRepository,
      "marketplaceSkill.sourceRepository",
    ),
    sourcePath: requireString(skill.sourcePath, "marketplaceSkill.sourcePath"),
    destinationRepository: requireString(
      skill.destinationRepository,
      "marketplaceSkill.destinationRepository",
    ),
    destinationPath: requireString(
      skill.destinationPath,
      "marketplaceSkill.destinationPath",
    ),
    direction: requireString(skill.direction, "marketplaceSkill.direction"),
    sourceDigest: requireDigest(
      skill.sourceDigest,
      "marketplaceSkill.sourceDigest",
    ),
    destinationDigest: requireDigest(
      skill.destinationDigest,
      "marketplaceSkill.destinationDigest",
    ),
    status: requireString(skill.status, "marketplaceSkill.status"),
    reverseSync: requireBoolean(
      skill.reverseSync,
      "marketplaceSkill.reverseSync",
    ),
    evidencePaths: requirePaths(
      skill.evidencePaths,
      "marketplaceSkill.evidencePaths",
    ),
  };
  if (
    normalized.sourceRepository !== CANONICAL_REPOSITORY ||
    normalized.sourcePath !== "skills/martix-platform/" ||
    normalized.destinationRepository !== "martix/skills" ||
    normalized.destinationPath !== "skills/martix-platform/" ||
    normalized.direction !== "platform-to-marketplace" ||
    normalized.sourceDigest !== stableSkill.promotedDigest ||
    normalized.destinationDigest !== normalized.sourceDigest ||
    normalized.status !== "passed" ||
    normalized.reverseSync
  ) {
    fail("Marketplace Skill publication must be a one-way, digest-preserving copy from Platform.");
  }
  return normalized;
}

function normalizeEditableSources(value) {
  const sources = requireRecord(value, "editableSources");
  const documentation = requireRecord(
    sources.documentation,
    "editableSources.documentation",
  );
  const skill = requireRecord(sources.skill, "editableSources.skill");
  const normalized = {
    documentation: {
      count: documentation.count,
      canonicalPath: requireString(
        documentation.canonicalPath,
        "editableSources.documentation.canonicalPath",
      ),
      alternatePaths: requireUniqueStrings(
        documentation.alternatePaths,
        "editableSources.documentation.alternatePaths",
      ),
    },
    skill: {
      count: skill.count,
      canonicalPath: requireString(
        skill.canonicalPath,
        "editableSources.skill.canonicalPath",
      ),
      alternatePaths: requireUniqueStrings(
        skill.alternatePaths,
        "editableSources.skill.alternatePaths",
      ),
    },
  };
  if (
    normalized.documentation.count !== 1 ||
    normalized.documentation.canonicalPath !== "docs/architecture/" ||
    normalized.documentation.alternatePaths.length !== 0 ||
    normalized.skill.count !== 1 ||
    normalized.skill.canonicalPath !== "skills/martix-platform/" ||
    normalized.skill.alternatePaths.length !== 0
  ) {
    fail("Canonical cutover must retain one editable documentation source and one editable Skill source.");
  }
  return normalized;
}

function normalizePredecessors(value) {
  if (!Array.isArray(value) || value.length !== ARCHIVAL_REPOSITORIES.length) {
    fail(`predecessors must contain exactly ${ARCHIVAL_REPOSITORIES.length} archived repositories.`);
  }
  const predecessors = value.map((predecessor, index) => {
    const label = `predecessors[${index}]`;
    requireRecord(predecessor, label);
    const repository = ARCHIVAL_REPOSITORIES.find(
      ({ name }) => name === predecessor.repository,
    );
    if (repository === undefined) {
      fail(`${label}.repository is not an accepted predecessor.`);
    }
    const banner = requireRecord(predecessor.banner, `${label}.banner`);
    const archive = requireRecord(predecessor.archive, `${label}.archive`);
    const normalized = {
      repository: requireString(predecessor.repository, `${label}.repository`),
      url: requireString(predecessor.url, `${label}.url`),
      status: requireString(predecessor.status, `${label}.status`),
      banner: {
        text: requireString(banner.text, `${label}.banner.text`),
        release: requireString(banner.release, `${label}.banner.release`),
        date: requireDate(banner.date, `${label}.banner.date`),
        canonicalRepository: requireString(
          banner.canonicalRepository,
          `${label}.banner.canonicalRepository`,
        ),
        compatibilityContract: requireBoolean(
          banner.compatibilityContract,
          `${label}.banner.compatibilityContract`,
        ),
        migrationContract: requireBoolean(
          banner.migrationContract,
          `${label}.banner.migrationContract`,
        ),
      },
      archive: {
        readOnly: requireBoolean(archive.readOnly, `${label}.archive.readOnly`),
        historyUnchanged: requireBoolean(
          archive.historyUnchanged,
          `${label}.archive.historyUnchanged`,
        ),
        tagsUnchanged: requireBoolean(
          archive.tagsUnchanged,
          `${label}.archive.tagsUnchanged`,
        ),
        issuesUnchanged: requireBoolean(
          archive.issuesUnchanged,
          `${label}.archive.issuesUnchanged`,
        ),
        releasesUnchanged: requireBoolean(
          archive.releasesUnchanged,
          `${label}.archive.releasesUnchanged`,
        ),
        sourceUnchanged: requireBoolean(
          archive.sourceUnchanged,
          `${label}.archive.sourceUnchanged`,
        ),
        historicalWayfinderSnapshotsUnchanged: requireBoolean(
          archive.historicalWayfinderSnapshotsUnchanged,
          `${label}.archive.historicalWayfinderSnapshotsUnchanged`,
        ),
        finalSnapshotTag: requireString(
          archive.finalSnapshotTag,
          `${label}.archive.finalSnapshotTag`,
        ),
        finalSnapshotPreserved: requireBoolean(
          archive.finalSnapshotPreserved,
          `${label}.archive.finalSnapshotPreserved`,
        ),
      },
      sourcePreserved: requireBoolean(
        predecessor.sourcePreserved,
        `${label}.sourcePreserved`,
      ),
      bridgePackages: requireUniqueStrings(
        predecessor.bridgePackages,
        `${label}.bridgePackages`,
      ),
      digest: requireDigest(predecessor.digest, `${label}.digest`),
    };
    if (
      normalized.url !== repository.url ||
      normalized.status !== "archived-unsupported" ||
      normalized.banner.text !== BANNER_TEXT ||
      normalized.banner.release !== CANONICAL_CUTOVER_RELEASE ||
      normalized.banner.date !== CANONICAL_CUTOVER_DATE ||
      normalized.banner.canonicalRepository !== CANONICAL_REPOSITORY_URL ||
      normalized.banner.compatibilityContract ||
      normalized.banner.migrationContract ||
      Object.values(normalized.archive).some(
        (value) => typeof value === "boolean" && !value,
      ) ||
      normalized.archive.finalSnapshotTag !== repository.finalSnapshotTag ||
      normalized.bridgePackages.length !== 0 ||
      !normalized.sourcePreserved
    ) {
      fail(`${label} does not preserve its history or carry the exact archival banner.`);
    }
    const { digest, ...body } = normalized;
    if (sha256(body) !== digest) {
      fail(`${label}.digest does not match its immutable archival record.`);
    }
    return normalized;
  });
  if (
    new Set(predecessors.map(({ repository }) => repository)).size !==
      predecessors.length ||
    predecessors.some(
      ({ repository }) =>
        !ARCHIVAL_REPOSITORIES.some(({ name }) => name === repository),
    )
  ) {
    fail("predecessors must contain each predecessor repository exactly once.");
  }
  return predecessors.sort((left, right) =>
    left.repository.localeCompare(right.repository),
  );
}

function normalizeMigration(value) {
  const migration = requireRecord(value, "migration");
  const normalized = {
    compatibilityContract: requireString(
      migration.compatibilityContract,
      "migration.compatibilityContract",
    ),
    migrationContract: requireString(
      migration.migrationContract,
      "migration.migrationContract",
    ),
    bridgePackages: requireUniqueStrings(
      migration.bridgePackages,
      "migration.bridgePackages",
    ),
    fallbackEvidencePreserved: requireBoolean(
      migration.fallbackEvidencePreserved,
      "migration.fallbackEvidencePreserved",
    ),
    sourceHistoriesPreserved: requireBoolean(
      migration.sourceHistoriesPreserved,
      "migration.sourceHistoriesPreserved",
    ),
  };
  if (
    normalized.compatibilityContract !== "none" ||
    normalized.migrationContract !== "none" ||
    normalized.bridgePackages.length !== 0 ||
    !normalized.fallbackEvidencePreserved ||
    !normalized.sourceHistoriesPreserved
  ) {
    fail("Canonical cutover must not create compatibility, migration, or bridge-package contracts.");
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
    failClosed: requireBoolean(verification.failClosed, "verification.failClosed"),
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
    normalized.cadence !== CANONICAL_CUTOVER_CADENCE ||
    normalized.entrypoint !== "eng/verify.mjs" ||
    normalized.command !== CANONICAL_CUTOVER_VERIFICATION_COMMAND ||
    !normalized.failClosed ||
    canonicalJson(normalized.requiredGates) !==
      canonicalJson(CANONICAL_CUTOVER_REQUIRED_GATES) ||
    normalized.notApplicable.length !== 0 ||
    normalized.notSelected.length !== 0 ||
    normalized.requiredGates.some((gate) => !REQUIRED_GATE_SET.has(gate))
  ) {
    fail("Canonical cutover verification must run fail-closed with the complete release gate list.");
  }
  return normalized;
}

function normalizeEvidence(value) {
  const evidence = requireRecord(value, "evidence");
  const normalized = {
    paths: requirePaths(evidence.paths, "evidence.paths"),
    immutable: requireBoolean(evidence.immutable, "evidence.immutable"),
    digest: requireDigest(evidence.digest, "evidence.digest"),
  };
  if (!normalized.immutable) {
    fail("Canonical cutover evidence must be immutable and cover its complete evidence index.");
  }
  const { digest, ...body } = normalized;
  if (sha256(body) !== digest) {
    fail("evidence.digest does not match its immutable evidence index.");
  }
  return normalized;
}

function normalizeCutoverGate(value, inputDigest, evidenceDigest) {
  const gate = requireRecord(value, "cutoverGate");
  const normalized = {
    id: requireString(gate.id, "cutoverGate.id"),
    outcome: requireString(gate.outcome, "cutoverGate.outcome"),
    inputDigest: requireDigest(gate.inputDigest, "cutoverGate.inputDigest"),
    evidenceDigest: requireDigest(
      gate.evidenceDigest,
      "cutoverGate.evidenceDigest",
    ),
    attempts: gate.attempts,
  };
  if (
    normalized.id !== CANONICAL_CUTOVER_GATE_ID ||
    normalized.outcome !== "passed" ||
    normalized.inputDigest !== inputDigest ||
    normalized.evidenceDigest !== evidenceDigest ||
    !Array.isArray(normalized.attempts) ||
    normalized.attempts.length !== 1 ||
    canonicalJson(normalized.attempts) !==
      canonicalJson([{ number: 1, outcome: "passed" }])
  ) {
    fail("Canonical cutover gate must be a single passed, digest-bound attempt.");
  }
  return normalized;
}

function createCanonicalCutoverEvidenceBody(input) {
  requireRecord(input, "Canonical cutover evidence input");
  const stable = normalizePromotedStable(input.promotedStable);
  const source = normalizeSource(input.source);
  const canonicalSource = normalizeCanonicalSource(input.canonicalSource);
  const installations = normalizeInstallations(
    input.installations,
    input.stableArtifacts,
  );
  const smokeTests = normalizeSmokeTests(input.smokeTests, input.stableArtifacts);
  const documentation = normalizeDocumentation(input.documentation);
  const marketplaceSkill = normalizeMarketplaceSkill(
    input.marketplaceSkill,
    input.stableArtifacts,
  );
  const editableSources = normalizeEditableSources(input.editableSources);
  const predecessors = normalizePredecessors(input.predecessors);
  const migration = normalizeMigration(input.migration);
  const supportClaims = Array.isArray(input.supportClaims)
    ? input.supportClaims
    : fail("supportClaims must be an array.");
  if (supportClaims.length !== 0) {
    fail("Canonical cutover evidence must not make Supported claims.");
  }
  const verification = normalizeVerification(input.verification);
  const evidence = normalizeEvidence(input.evidence);
  const installationDigest = sha256(installations);
  const smokeTestDigest = sha256(smokeTests);
  const archivalDigest = sha256(predecessors);
  const cutoverInputDigest = sha256({
    artifactSetDigest: stable.artifactSetDigest,
    installationDigest,
    smokeTestDigest,
    stableEvidenceDigest: stable.evidenceDigest,
  });
  const cutoverEvidenceDigest = sha256({
    archivalDigest,
    documentationDigest: documentation.digest,
    evidenceDigest: evidence.digest,
    marketplaceSkillDigest: sha256(marketplaceSkill),
    migration,
  });
  const cutoverGate = normalizeCutoverGate(
    input.cutoverGate,
    cutoverInputDigest,
    cutoverEvidenceDigest,
  );
  const identity = {
    canonicalSource,
    canonicalCutoverDate: CANONICAL_CUTOVER_DATE,
    cutoverGate,
    cutoverEvidenceDigest,
    cutoverInputDigest,
    documentation,
    editableSources,
    evidence,
    installations,
    marketplaceSkill,
    migration,
    predecessors,
    promotedStable: stable,
    smokeTests,
    source,
    stableArtifacts: input.stableArtifacts,
    supportClaims,
    verification,
  };
  const cutoverSeed = sha256(identity).slice("sha256:".length);
  return {
    $schema: CANONICAL_CUTOVER_SCHEMA_URI,
    schemaVersion: CANONICAL_CUTOVER_SCHEMA_VERSION,
    kind: "canonical-cutover-evidence",
    solution: CANONICAL_CUTOVER_SOLUTION_NAME,
    cutoverId: `canonical-cutover-${CANONICAL_CUTOVER_RELEASE}-${cutoverSeed.slice(
      0,
      16,
    )}`,
    cutoverRelease: CANONICAL_CUTOVER_RELEASE,
    cutoverDate: CANONICAL_CUTOVER_DATE,
    stableVersion: STABLE_PLATFORM_VERSION,
    platformContractVersion: STABLE_PLATFORM_CONTRACT_VERSION,
    maturity: "stable",
    source,
    canonicalSource,
    promotedStable: stable,
    stableArtifacts: input.stableArtifacts,
    installations,
    smokeTests,
    documentation,
    marketplaceSkill,
    predecessors,
    editableSources,
    migration,
    verification,
    cutoverGate,
    evidence,
    supportClaims,
  };
}

export function createCanonicalCutoverEvidence(input) {
  const evidenceBody = createCanonicalCutoverEvidenceBody(input);
  assertSecretFree(evidenceBody);
  return {
    ...evidenceBody,
    evidenceDigest: sha256(evidenceBody),
  };
}

export function verifyCanonicalCutoverEvidence(
  evidence,
  stablePromotion,
  schema,
) {
  requireRecord(evidence, "Canonical cutover evidence");
  assertSecretFree(evidence);
  if (schema !== undefined) {
    validateSchema(evidence, schema);
  }
  const { evidenceDigest, ...evidenceBody } = evidence;
  requireDigest(evidenceDigest, "evidenceDigest");
  if (sha256(evidenceBody) !== evidenceDigest) {
    fail("Canonical cutover evidence digest does not match its content.");
  }
  if (
    evidenceBody.$schema !== CANONICAL_CUTOVER_SCHEMA_URI ||
    evidenceBody.schemaVersion !== CANONICAL_CUTOVER_SCHEMA_VERSION ||
    evidenceBody.kind !== "canonical-cutover-evidence" ||
    evidenceBody.solution !== CANONICAL_CUTOVER_SOLUTION_NAME ||
    evidenceBody.cutoverRelease !== CANONICAL_CUTOVER_RELEASE ||
    evidenceBody.cutoverDate !== CANONICAL_CUTOVER_DATE ||
    evidenceBody.stableVersion !== STABLE_PLATFORM_VERSION ||
    evidenceBody.platformContractVersion !== STABLE_PLATFORM_CONTRACT_VERSION ||
    evidenceBody.maturity !== "stable"
  ) {
    fail("Canonical cutover evidence identity is invalid.");
  }
  if (stablePromotion !== undefined) {
    const stableArtifacts = stablePromotion.artifacts.map(
      ({ id, promotedDigest }) => ({ id, promotedDigest }),
    );
    const expectedStable = {
      promotionId: stablePromotion.promotionId,
      stableVersion: stablePromotion.stableVersion,
      platformContractVersion: stablePromotion.platformContractVersion,
      evidenceDigest: stablePromotion.evidenceDigest,
      artifactSetDigest: stablePromotion.artifactSetDigest,
      artifactIds: stableArtifacts.map(({ id }) => id),
      exactBytes: true,
      rebuilt: false,
    };
    if (
      canonicalJson(evidenceBody.promotedStable) !==
      canonicalJson(expectedStable)
    ) {
      fail("Canonical cutover does not bind the promoted Stable evidence identity.");
    }
    if (
      canonicalJson(
        evidenceBody.stableArtifacts
          .map(({ id, promotedDigest }) => ({ id, promotedDigest }))
          .sort((left, right) => left.id.localeCompare(right.id)),
      ) !==
      canonicalJson(
        stableArtifacts.sort((left, right) => left.id.localeCompare(right.id)),
      )
    ) {
      fail("Canonical cutover must bind the complete promoted Stable artifact set.");
    }
  }
  const recreated = createCanonicalCutoverEvidence({
    ...evidenceBody,
    stableArtifacts: evidenceBody.stableArtifacts,
  });
  if (canonicalJson(recreated) !== canonicalJson(evidence)) {
    fail("Canonical cutover evidence identity is not reproducible.");
  }
  return true;
}

async function readJson(root, relativePath, label = "canonical cutover input") {
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

async function verifyFileExists(root, path, missingMessage) {
  try {
    await readFile(join(root, path));
  } catch (error) {
    if (error?.code === "ENOENT") {
      fail(`${missingMessage}: ${path}.`, "missing-evidence");
    }
    throw error;
  }
}

async function verifyPaths(root, paths) {
  for (const path of paths) {
    await verifyFileExists(
      root,
      path,
      "Canonical cutover evidence path is missing",
    );
  }
}

async function verifyDocumentation(root, documentation) {
  for (const entry of documentation.contentDigests) {
    const content = await readFile(join(root, entry.path), "utf8");
    if (sha256(content) !== entry.digest) {
      fail(
        `Canonical documentation content does not match its immutable digest: ${entry.path}.`,
      );
    }
  }
}

function verifyGeneratedSolutions(smokeTests, rootDir) {
  const evidencePaths = smokeTests.flatMap(({ evidencePaths: paths }) => paths);
  return Promise.all(
    evidencePaths.map((path) =>
      verifyFileExists(
        rootDir,
        path,
        "Generated Solution smoke evidence is missing",
      ),
    ),
  );
}

export async function verifyCanonicalCutoverFixture({
  rootDir = process.cwd(),
  fixture,
  manifest,
  schema,
  stablePromotion,
  stablePromotionSchema,
  stablePromotionManifest,
} = {}) {
  const root = resolve(rootDir);
  const loadedFixture =
    fixture ??
    (await readJson(
      root,
      `${CANONICAL_CUTOVER_SOLUTION_ROOT}/canonical-cutover.json`,
    ));
  const loadedManifest =
    manifest ??
    (await readJson(
      root,
      `${CANONICAL_CUTOVER_SOLUTION_ROOT}/martix.platform.json`,
    ));
  const loadedSchema =
    schema ?? (await readJson(root, "schemas/canonical-cutover.schema.json"));
  const loadedStablePromotion =
    stablePromotion ??
    (await readJson(
      root,
      `${STABLE_PROMOTION_SOLUTION_ROOT}/stable-promotion.json`,
      "Stable promotion evidence",
    ));
  const loadedStablePromotionSchema =
    stablePromotionSchema ??
    (await readJson(
      root,
      "schemas/stable-promotion.schema.json",
      "Stable promotion schema",
    ));
  const loadedStablePromotionManifest =
    stablePromotionManifest ??
    (await readJson(
      root,
      `${STABLE_PROMOTION_SOLUTION_ROOT}/martix.platform.json`,
      "Stable promotion manifest",
    ));

  await verifyStablePromotionFixture({
    rootDir: root,
    fixture: loadedStablePromotion,
    manifest: loadedStablePromotionManifest,
    schema: loadedStablePromotionSchema,
  });
  verifyCanonicalCutoverEvidence(
    loadedFixture,
    loadedStablePromotion,
    loadedSchema,
  );

  if (
    loadedManifest.kind !== "generated-solution" ||
    loadedManifest.repository?.name !== CANONICAL_CUTOVER_SOLUTION_NAME ||
    loadedManifest.platformVersion !== STABLE_PLATFORM_VERSION ||
    loadedManifest.platformContractVersion !== STABLE_PLATFORM_CONTRACT_VERSION ||
    loadedManifest.origin?.canonicalRepository !== CANONICAL_REPOSITORY_URL ||
    loadedManifest.supportClaims?.length !== 0 ||
    loadedManifest.security?.secretPolicy !== "external-only" ||
    loadedManifest.security?.containsSecrets !== false
  ) {
    fail("Canonical cutover manifest must identify the claim-free 1.0.0 Generated Solution.");
  }
  await verifyPaths(root, loadedFixture.evidence.paths);
  await verifyDocumentation(root, loadedFixture.documentation);
  await verifyGeneratedSolutions(loadedFixture.smokeTests, root);

  return {
    status: "passed",
    cadence: loadedFixture.verification.cadence,
    solution: loadedFixture.solution,
    gate: loadedFixture.cutoverGate.id,
    cutoverId: loadedFixture.cutoverId,
    canonicalRepository: loadedFixture.canonicalSource.repository,
    stableVersion: loadedFixture.stableVersion,
    installationCount: loadedFixture.installations.length,
    smokeTestCount: loadedFixture.smokeTests.length,
    predecessorCount: loadedFixture.predecessors.length,
    marketplaceSkill: {
      direction: loadedFixture.marketplaceSkill.direction,
      sourceDigest: loadedFixture.marketplaceSkill.sourceDigest,
    },
    editableDocumentationSources:
      loadedFixture.editableSources.documentation.count,
    editableSkillSources: loadedFixture.editableSources.skill.count,
    evidenceDigest: loadedFixture.evidenceDigest,
    fixtureRoot: CANONICAL_CUTOVER_SOLUTION_ROOT,
  };
}

export const verifyCanonicalCutover = verifyCanonicalCutoverFixture;

async function runCli() {
  const result = await verifyCanonicalCutoverFixture();
  console.log(JSON.stringify(result, null, 2));
}

const invokedFile = process.argv[1]
  ? `file://${resolve(process.argv[1])}`
  : null;

if (invokedFile === import.meta.url) {
  runCli().catch((error) => {
    if (
      error instanceof CanonicalCutoverError ||
      error?.name === "StablePromotionError" ||
      error?.name === "ReleaseCandidateError"
    ) {
      console.error(`Verification failed: ${error.message}`);
    } else {
      console.error("Verification failed due to an unexpected internal error.");
    }
    process.exitCode = 1;
  });
}
