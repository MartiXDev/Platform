import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const CADENCES = [
  "fast",
  "pull-request",
  "main-nightly",
  "release-candidate",
];

const GENERATED_SOLUTION_NAME = "RepositoryBootstrapGeneratedSolution";
const GENERATED_SOLUTION_ROOT = `tests/fixtures/${GENERATED_SOLUTION_NAME}`;
const MANIFEST_PRESETS = new Set(["api", "modular-monolith", "full-stack"]);
const MANIFEST_REQUIRED_PROPERTIES = [
  "$schema",
  "kind",
  "manifestSchemaVersion",
  "platformVersion",
  "platformContractVersion",
  "repository",
  "origin",
  "preset",
  "capabilities",
  "providers",
  "appliedMigrations",
  "supportClaims",
  "security",
  "verification",
];

const REQUIRED_INPUTS = [
  "martix.platform.json",
  "schemas/martix.platform.schema.json",
  "schemas/quality-gates.schema.json",
  "eng/quality-gates.json",
  "README.md",
  "AGENTS.md",
  "LICENSE",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "PROVENANCE.md",
  `${GENERATED_SOLUTION_ROOT}/README.md`,
  `${GENERATED_SOLUTION_ROOT}/AGENTS.md`,
  `${GENERATED_SOLUTION_ROOT}/martix.platform.json`,
];

const FORBIDDEN_SECRET_KEY =
  /(?:secret|password|token|private.?key|access.?key|api.?key|credential)/i;
const ALLOWED_SECRET_METADATA_KEYS = new Set([
  "secretPolicy",
  "containsSecrets",
]);

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function fail(message) {
  throw new Error(message);
}

async function readRequiredFile(rootDir, relativePath) {
  try {
    return await readFile(resolve(rootDir, relativePath), "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      fail(`Missing required bootstrap input: ${relativePath}`);
    }

    throw error;
  }
}

function requireRecord(value, path) {
  if (!isRecord(value)) {
    fail(`Invalid bootstrap value at ${path}: expected an object.`);
  }
}

function requireString(value, path) {
  if (typeof value !== "string" || value.length === 0) {
    fail(`Invalid bootstrap value at ${path}: expected a non-empty string.`);
  }
}

function requireArray(value, path) {
  if (!Array.isArray(value)) {
    fail(`Invalid bootstrap value at ${path}: expected an array.`);
  }
}

function requireProperty(value, property, path) {
  if (!Object.hasOwn(value, property)) {
    fail(
      `Invalid bootstrap value at ${path}.${property}: required property is missing.`,
    );
  }
}

function rejectUnknownProperties(value, allowedProperties, path) {
  for (const property of Object.keys(value)) {
    if (!allowedProperties.includes(property)) {
      fail(`Invalid bootstrap property at ${path}.${property}.`);
    }
  }
}

function assertSecretFree(value, path = "manifest") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertSecretFree(item, `${path}[${index}]`));
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    if (
      FORBIDDEN_SECRET_KEY.test(key) &&
      !ALLOWED_SECRET_METADATA_KEYS.has(key)
    ) {
      fail(`Bootstrap manifest contains a secret-shaped field: ${path}.${key}`);
    }

    assertSecretFree(child, `${path}.${key}`);
  }
}

function validateManifestSchema(schema) {
  const path = "schemas/martix.platform.schema.json";
  requireRecord(schema, path);

  if (schema.type !== "object") {
    fail(`${path}.type must be object.`);
  }

  requireArray(schema.required, `${path}.required`);
  const requiredProperties = new Set(schema.required);
  for (const property of MANIFEST_REQUIRED_PROPERTIES) {
    if (!requiredProperties.has(property)) {
      fail(`Manifest schema is missing required property: ${property}`);
    }
  }

  requireRecord(schema.properties, `${path}.properties`);
  for (const property of MANIFEST_REQUIRED_PROPERTIES) {
    if (!Object.hasOwn(schema.properties, property)) {
      fail(`Manifest schema is missing property definition: ${property}`);
    }
  }

  const supportClaims = schema.properties.supportClaims;
  requireRecord(supportClaims, `${path}.properties.supportClaims`);
  if (supportClaims.maxItems !== 0) {
    fail("Manifest schema must keep supportClaims empty during bootstrap.");
  }
}

function validateManifest(manifest, expectedKind, path) {
  requireRecord(manifest, path);
  assertSecretFree(manifest, path);
  rejectUnknownProperties(manifest, MANIFEST_REQUIRED_PROPERTIES, path);

  for (const property of MANIFEST_REQUIRED_PROPERTIES) {
    requireProperty(manifest, property, path);
  }

  for (const property of [
    "$schema",
    "kind",
    "manifestSchemaVersion",
    "platformVersion",
    "platformContractVersion",
  ]) {
    requireString(manifest[property], `${path}.${property}`);
  }

  if (manifest.kind !== expectedKind) {
    fail(
      `Invalid bootstrap value at ${path}.kind: expected ${expectedKind}, received ${manifest.kind}.`,
    );
  }

  if (
    manifest.preset !== null &&
    (typeof manifest.preset !== "string" ||
      !MANIFEST_PRESETS.has(manifest.preset))
  ) {
    fail(
      `Invalid bootstrap value at ${path}.preset: expected null or one of ${[
        ...MANIFEST_PRESETS,
      ].join(", ")}.`,
    );
  }

  requireRecord(manifest.repository, `${path}.repository`);
  requireRecord(manifest.origin, `${path}.origin`);
  requireArray(manifest.capabilities, `${path}.capabilities`);
  requireArray(manifest.providers, `${path}.providers`);
  requireArray(manifest.appliedMigrations, `${path}.appliedMigrations`);
  requireArray(manifest.supportClaims, `${path}.supportClaims`);

  if (manifest.supportClaims.length !== 0) {
    fail(
      `Bootstrap manifest must not make a Supported Capability claim: ${path}.supportClaims`,
    );
  }

  requireRecord(manifest.security, `${path}.security`);
  if (
    manifest.security.secretPolicy !== "external-only" ||
    manifest.security.containsSecrets !== false
  ) {
    fail(
      `Bootstrap manifest must declare external-only secret delivery and containsSecrets=false: ${path}.security`,
    );
  }

  requireRecord(manifest.verification, `${path}.verification`);
  requireString(
    manifest.verification.entrypoint,
    `${path}.verification.entrypoint`,
  );
  requireString(manifest.verification.policy, `${path}.verification.policy`);
  requireArray(manifest.verification.cadences, `${path}.verification.cadences`);
  if (
    JSON.stringify(manifest.verification.cadences) !== JSON.stringify(CADENCES)
  ) {
    fail(
      `Bootstrap manifest verification cadences must be ${CADENCES.join(", ")}.`,
    );
  }
}

function validateQualityGatePolicy(policy) {
  requireRecord(policy, "eng/quality-gates.json");
  requireString(policy.policyVersion, "eng/quality-gates.json.policyVersion");

  if (policy.stage !== "bootstrap") {
    fail("eng/quality-gates.json.stage must be bootstrap.");
  }

  requireArray(policy.supportClaims, "eng/quality-gates.json.supportClaims");
  if (policy.supportClaims.length !== 0) {
    fail("Bootstrap quality policy must not make a Supported Capability claim.");
  }

  requireArray(policy.cadences, "eng/quality-gates.json.cadences");
  const declaredCadences = policy.cadences.map((cadence) => cadence?.id);
  if (
    CADENCES.some((cadence) => !declaredCadences.includes(cadence)) ||
    new Set(declaredCadences).size !== declaredCadences.length
  ) {
    fail(
      `eng/quality-gates.json.cadences must declare each cadence exactly once: ${CADENCES.join(", ")}.`,
    );
  }

  requireArray(policy.gates, "eng/quality-gates.json.gates");
  const gateIds = new Set();
  for (const gate of policy.gates) {
    requireRecord(gate, "eng/quality-gates.json.gates[]");
    requireString(gate.id, "eng/quality-gates.json.gates[].id");
    requireString(gate.family, `gate ${gate.id}.family`);
    requireString(gate.owner, `gate ${gate.id}.owner`);
    if (gate.required !== true) {
      fail(`Bootstrap quality gate ${gate.id} must be required.`);
    }
    requireArray(gate.cadences, `gate ${gate.id}.cadences`);
    requireString(gate.purpose, `gate ${gate.id}.purpose`);

    if (gateIds.has(gate.id)) {
      fail(`Duplicate quality gate identity: ${gate.id}`);
    }
    gateIds.add(gate.id);
  }

  for (const requiredGate of [
    "bootstrap.manifest",
    "bootstrap.governance",
    "bootstrap.generated-solution",
    "bootstrap.secret-free",
  ]) {
    if (!gateIds.has(requiredGate)) {
      fail(`Missing required bootstrap quality gate: ${requiredGate}`);
    }
  }

  for (const cadence of CADENCES) {
    for (const gate of policy.gates.filter((item) => item.required !== false)) {
      if (!gate.cadences.includes(cadence)) {
        fail(`Required gate ${gate.id} is not declared for cadence ${cadence}.`);
      }
    }
  }

  return policy.gates;
}

function validateGovernanceDocuments(documents) {
  const checks = [
    ["CONTRIBUTING.md", "MartiXDev/Platform"],
    ["SECURITY.md", "security"],
    ["PROVENANCE.md", "canonical"],
  ];

  for (const [relativePath, expectedText] of checks) {
    if (!documents.get(relativePath).toLowerCase().includes(expectedText.toLowerCase())) {
      fail(
        `Bootstrap governance input ${relativePath} does not identify its required authority.`,
      );
    }
  }
}

export async function verifyBootstrap({
  cadence = "fast",
  rootDir = process.cwd(),
} = {}) {
  if (!CADENCES.includes(cadence)) {
    fail(
      `Unknown verification cadence: ${cadence}. Expected one of ${CADENCES.join(", ")}.`,
    );
  }

  const root = resolve(rootDir);
  const documents = new Map();
  for (const relativePath of REQUIRED_INPUTS) {
    documents.set(relativePath, await readRequiredFile(root, relativePath));
  }

  const parseJson = (relativePath) => {
    try {
      return JSON.parse(documents.get(relativePath));
    } catch (error) {
      if (error instanceof SyntaxError) {
        fail(`Invalid JSON in bootstrap input: ${relativePath}: ${error.message}`);
      }

      throw error;
    }
  };

  const manifest = parseJson("martix.platform.json");
  const manifestSchema = parseJson("schemas/martix.platform.schema.json");
  const qualityGateSchema = parseJson("schemas/quality-gates.schema.json");
  const qualityPolicy = parseJson("eng/quality-gates.json");
  const generatedManifest = parseJson(
    `${GENERATED_SOLUTION_ROOT}/martix.platform.json`,
  );

  validateManifestSchema(manifestSchema);
  requireRecord(qualityGateSchema, "schemas/quality-gates.schema.json");
  if (qualityGateSchema.type !== "object") {
    fail("schemas/quality-gates.schema.json.type must be object.");
  }

  validateManifest(manifest, "platform-repository", "martix.platform.json");
  validateManifest(
    generatedManifest,
    "generated-solution",
    `${GENERATED_SOLUTION_ROOT}/martix.platform.json`,
  );
  validateQualityGatePolicy(qualityPolicy);
  validateGovernanceDocuments(documents);

  const gates = qualityPolicy.gates
    .filter((gate) => gate.cadences.includes(cadence))
    .map((gate) => gate.id);

  if (!gates.includes("bootstrap.manifest")) {
    fail(`Quality policy does not run bootstrap.manifest for cadence ${cadence}.`);
  }

  return {
    status: "passed",
    cadence,
    gates,
    generatedSolution: GENERATED_SOLUTION_NAME,
  };
}

async function runCli() {
  const cadence = process.argv[2] ?? "fast";
  const result = await verifyBootstrap({ cadence });
  console.log(JSON.stringify(result, null, 2));
}

const invokedFile = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : null;

if (invokedFile === import.meta.url) {
  runCli().catch((error) => {
    console.error(`Verification failed: ${error.message}`);
    process.exitCode = 1;
  });
}
