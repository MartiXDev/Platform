import { createHash } from "node:crypto";

export const DEPLOYMENT_MANIFEST_SCHEMA_VERSION = "1.0.0";
export const DEPLOYMENT_EVIDENCE_SCHEMA_VERSION = "1.0.0";
export const DEPLOYMENT_MANIFEST_SCHEMA_URI =
  "https://github.com/MartiXDev/Platform/schemas/deployment-manifest.schema.json";
export const DEPLOYMENT_PROFILES = Object.freeze(["process", "container"]);
export const DEPLOYMENT_OUTCOMES = Object.freeze([
  "passed",
  "failed",
  "unstable",
  "infrastructure-error",
  "cancelled",
  "not-applicable",
]);

const PROFILE_DEFINITIONS = Object.freeze({
  process: Object.freeze({ kind: "archive", target: "process-host" }),
  container: Object.freeze({ kind: "oci-image", target: "oci" }),
});
const RESOURCE_ROLES = new Set([
  "stateful",
  "migrator",
  "serving",
  "worker",
]);
const DEPENDENCY_CONDITIONS = new Set(["ready", "healthy", "completed"]);
const CONFIGURATION_TYPES = new Set([
  "boolean",
  "integer",
  "number",
  "string",
  "uri",
]);
const CONFIGURATION_SENSITIVITIES = new Set(["public", "sensitive"]);
const CONFIGURATION_SOURCES = new Set(["external", "mounted-file"]);
const RESTART_POLICIES = new Set(["optional", "required", "startup"]);
const CHECK_KINDS = new Set(["http", "tcp"]);
const PORT_PROTOCOLS = new Set(["http", "https", "tcp"]);
const PORT_EXPOSURES = new Set(["private", "public"]);
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;
const SOURCE_REVISION_PATTERN = /^[0-9a-f]{40}$/;
const IDENTIFIER_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const APPLICATION_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9.-]*$/;
const FORBIDDEN_BUILD_COMMAND =
  /(?:^|\s)(?:(?:dotnet|msbuild)\s+(?:\S+\s+)*publish|(?:docker|podman)\s+build|(?:npm|pnpm|yarn)\s+(?:run\s+)?build)(?:\s|$)/i;
const SECRET_KEY_PATTERN =
  /(?:secret|password|token|private.?key|access.?key|api.?key|credential|value)/i;

export class DeploymentManifestError extends Error {
  constructor(message, code = "invalid-manifest", details = undefined) {
    super(message);
    this.name = "DeploymentManifestError";
    this.code = code;
    this.details = details;
  }
}

function fail(message, code = "invalid-manifest", details = undefined) {
  throw new DeploymentManifestError(message, code, details);
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
  const identifier = requireString(value, label).toLowerCase();
  if (!IDENTIFIER_PATTERN.test(identifier)) {
    fail(`${label} must be a lowercase Platform identifier.`, "invalid-input");
  }
  return identifier;
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

function requireBoolean(value, label) {
  if (typeof value !== "boolean") {
    fail(`${label} must be a boolean.`, "invalid-input");
  }
  return value;
}

function requirePositiveInteger(value, label) {
  if (!Number.isInteger(value) || value <= 0) {
    fail(`${label} must be a positive integer.`, "invalid-input");
  }
  return value;
}

function requireDigest(value, label) {
  const digest = requireString(value, label);
  if (!DIGEST_PATTERN.test(digest)) {
    fail(`${label} must be a sha256 digest.`, "invalid-identity");
  }
  return digest;
}

function requireSourceRevision(value, label) {
  const revision = requireString(value, label).toLowerCase();
  if (!SOURCE_REVISION_PATTERN.test(revision)) {
    fail(`${label} must be a 40-character hexadecimal commit.`, "invalid-identity");
  }
  return revision;
}

function rejectUnknownProperties(value, allowed, label) {
  for (const property of Object.keys(value)) {
    if (!allowed.includes(property)) {
      fail(`${label}.${property} is not part of the Deployment Manifest contract.`);
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
  const input = typeof value === "string" ? value : canonicalJson(value);
  return `sha256:${createHash("sha256").update(input).digest("hex")}`;
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
      SECRET_KEY_PATTERN.test(key) &&
      !["containsSecrets", "secretPolicy", "sensitivity"].includes(key)
    ) {
      fail(
        `Deployment Manifest contains a secret or value field: ${path}.${key}.`,
        "secret-input",
      );
    }
    assertSecretFree(child, `${path}.${key}`);
  }
}

function normalizeApplication(value, sourceRevision) {
  const application = requireRecord(value, "application");
  rejectUnknownProperties(
    application,
    ["name", "platformVersion", "platformContractVersion", "sourceRevision"],
    "application",
  );
  const name = requireString(application.name, "application.name");
  if (!APPLICATION_NAME_PATTERN.test(name)) {
    fail("application.name must be a stable application identifier.", "invalid-input");
  }
  return {
    name,
    platformVersion: requireString(
      application.platformVersion,
      "application.platformVersion",
    ),
    platformContractVersion: requireString(
      application.platformContractVersion,
      "application.platformContractVersion",
    ),
    sourceRevision,
  };
}

function normalizeConfiguration(value) {
  const configuration = requireRecord(value, "configuration");
  rejectUnknownProperties(configuration, ["schemaVersion", "entries"], "configuration");
  const schemaVersion = requireString(
    configuration.schemaVersion,
    "configuration.schemaVersion",
  );
  if (!Array.isArray(configuration.entries) || configuration.entries.length === 0) {
    fail("configuration.entries must contain at least one entry.", "invalid-configuration");
  }

  const entries = configuration.entries.map((entry, index) => {
    const label = `configuration.entries[${index}]`;
    requireRecord(entry, label);
    rejectUnknownProperties(
      entry,
      ["key", "type", "required", "sensitivity", "source", "restart", "owner"],
      label,
    );
    const key = requireString(entry.key, `${label}.key`);
    const type = requireString(entry.type, `${label}.type`);
    if (!CONFIGURATION_TYPES.has(type)) {
      fail(`${label}.type is not a supported configuration type.`, "invalid-configuration");
    }
    const required = requireBoolean(entry.required, `${label}.required`);
    const sensitivity = requireString(
      entry.sensitivity,
      `${label}.sensitivity`,
    );
    if (!CONFIGURATION_SENSITIVITIES.has(sensitivity)) {
      fail(
        `${label}.sensitivity is not a supported configuration classification.`,
        "invalid-configuration",
      );
    }
    const source = requireString(entry.source, `${label}.source`);
    if (!CONFIGURATION_SOURCES.has(source)) {
      fail(
        `${label}.source must use an external Secret Delivery Adapter.`,
        "unsupported-deployment",
      );
    }
    const restart = requireString(entry.restart, `${label}.restart`);
    if (!RESTART_POLICIES.has(restart)) {
      fail(`${label}.restart is not supported.`, "invalid-configuration");
    }
    return {
      key,
      type,
      required,
      sensitivity,
      source,
      restart,
      owner: requireString(entry.owner, `${label}.owner`),
    };
  });

  if (new Set(entries.map((entry) => entry.key)).size !== entries.length) {
    fail("configuration.entries must have unique keys.", "invalid-configuration");
  }

  return {
    schemaVersion,
    entries: entries.sort((left, right) => left.key.localeCompare(right.key)),
  };
}

function normalizePort(value, label) {
  const port = requireRecord(value, label);
  rejectUnknownProperties(
    port,
    ["name", "number", "protocol", "exposure"],
    label,
  );
  const name = requireIdentifier(port.name, `${label}.name`);
  const number = requirePositiveInteger(port.number, `${label}.number`);
  if (number > 65535) {
    fail(`${label}.number must be a valid TCP port.`, "invalid-topology");
  }
  const protocol = requireString(port.protocol, `${label}.protocol`).toLowerCase();
  if (!PORT_PROTOCOLS.has(protocol)) {
    fail(`${label}.protocol is not supported.`, "invalid-topology");
  }
  const exposure = requireString(port.exposure, `${label}.exposure`).toLowerCase();
  if (!PORT_EXPOSURES.has(exposure)) {
    fail(`${label}.exposure is not supported.`, "invalid-topology");
  }
  return { name, number, protocol, exposure };
}

function normalizeCheck(value, label, ports) {
  const check = requireRecord(value, label);
  rejectUnknownProperties(
    check,
    ["kind", "path", "port", "timeoutSeconds", "intervalSeconds"],
    label,
  );
  const kind = requireString(check.kind, `${label}.kind`).toLowerCase();
  if (!CHECK_KINDS.has(kind)) {
    fail(`${label}.kind is not supported.`, "invalid-lifecycle");
  }
  const port = requireIdentifier(check.port, `${label}.port`);
  if (!ports.some((candidate) => candidate.name === port)) {
    fail(`${label}.port must reference a declared resource port.`, "invalid-lifecycle");
  }
  const normalized = {
    kind,
    port,
    timeoutSeconds:
      check.timeoutSeconds === undefined
        ? 5
        : requirePositiveInteger(check.timeoutSeconds, `${label}.timeoutSeconds`),
    intervalSeconds:
      check.intervalSeconds === undefined
        ? 10
        : requirePositiveInteger(check.intervalSeconds, `${label}.intervalSeconds`),
  };
  if (kind === "http") {
    const path = requireString(check.path, `${label}.path`);
    if (!path.startsWith("/")) {
      fail(`${label}.path must be an absolute HTTP path.`, "invalid-lifecycle");
    }
    normalized.path = path;
  }
  return normalized;
}

function normalizeShutdown(value, label) {
  const shutdown = requireRecord(value, label);
  rejectUnknownProperties(shutdown, ["signal", "gracePeriodSeconds"], label);
  const signal = requireString(shutdown.signal, `${label}.signal`);
  if (!["SIGTERM", "SIGINT"].includes(signal)) {
    fail(`${label}.signal must describe a graceful termination signal.`, "invalid-lifecycle");
  }
  return {
    signal,
    gracePeriodSeconds: requirePositiveInteger(
      shutdown.gracePeriodSeconds,
      `${label}.gracePeriodSeconds`,
    ),
  };
}

function normalizePersistence(value, label) {
  const persistence = requireRecord(value, label);
  rejectUnknownProperties(
    persistence,
    ["durability", "backup", "restore", "upgrade", "owner"],
    label,
  );
  return {
    durability: requireString(persistence.durability, `${label}.durability`),
    backup: requireString(persistence.backup, `${label}.backup`),
    restore: requireString(persistence.restore, `${label}.restore`),
    upgrade: requireString(persistence.upgrade, `${label}.upgrade`),
    owner: requireString(persistence.owner, `${label}.owner`),
  };
}

function normalizeDependency(value, label) {
  const dependency = requireRecord(value, label);
  rejectUnknownProperties(dependency, ["resource", "condition"], label);
  const condition = requireString(dependency.condition, `${label}.condition`).toLowerCase();
  if (!DEPENDENCY_CONDITIONS.has(condition)) {
    fail(
      `${label}.condition must be readiness or completed-work evidence, not a delay.`,
      "invalid-topology",
    );
  }
  return {
    resource: requireIdentifier(dependency.resource, `${label}.resource`),
    condition,
  };
}

function normalizeResource(value, index, configurationKeys) {
  const label = `resources[${index}]`;
  const resource = requireRecord(value, label);
  rejectUnknownProperties(
    resource,
    [
      "id",
      "role",
      "type",
      "artifact",
      "command",
      "arguments",
      "configuration",
      "dependsOn",
      "ports",
      "checks",
      "shutdown",
      "persistence",
    ],
    label,
  );
  const id = requireIdentifier(resource.id, `${label}.id`);
  const role = requireString(resource.role, `${label}.role`).toLowerCase();
  if (!RESOURCE_ROLES.has(role)) {
    fail(`${label}.role is not supported.`, "invalid-topology");
  }
  const type = requireString(resource.type, `${label}.type`);
  const configuration = requireUniqueStrings(
    resource.configuration ?? [],
    `${label}.configuration`,
  ).sort();
  for (const key of configuration) {
    if (!configurationKeys.has(key)) {
      fail(`${label}.configuration references an unknown key: ${key}.`, "invalid-configuration");
    }
  }
  const dependsOn = (resource.dependsOn ?? []).map((dependency, dependencyIndex) =>
    normalizeDependency(
      dependency,
      `${label}.dependsOn[${dependencyIndex}]`,
    ),
  );
  if (
    new Set(dependsOn.map((dependency) => dependency.resource)).size !==
    dependsOn.length
  ) {
    fail(`${label}.dependsOn must reference each resource once.`, "invalid-topology");
  }

  const ports = (resource.ports ?? []).map((port, portIndex) =>
    normalizePort(port, `${label}.ports[${portIndex}]`),
  );
  if (new Set(ports.map((port) => port.name)).size !== ports.length) {
    fail(`${label}.ports must have unique names.`, "invalid-topology");
  }

  const executable = ["serving", "migrator", "worker"].includes(role);
  let artifact;
  let command;
  let args;
  let shutdown;
  if (executable) {
    artifact = requireIdentifier(resource.artifact, `${label}.artifact`);
    command = requireString(resource.command, `${label}.command`);
    args = requireUniqueStrings(resource.arguments ?? [], `${label}.arguments`);
    const invocation = [command, ...args].join(" ");
    if (FORBIDDEN_BUILD_COMMAND.test(invocation)) {
      fail(
        `${label} embeds a production build step; deployment consumes immutable artifacts.`,
        "unsupported-deployment",
      );
    }
    shutdown = normalizeShutdown(resource.shutdown, `${label}.shutdown`);
  } else if (
    resource.artifact != null ||
    resource.command != null ||
    (resource.arguments !== undefined && resource.arguments.length > 0) ||
    resource.shutdown != null
  ) {
    fail(`${label} stateful resources cannot execute application artifacts.`, "invalid-topology");
  }

  let checks = null;
  if (role === "serving") {
    const source = requireRecord(resource.checks, `${label}.checks`);
    rejectUnknownProperties(source, ["startup", "readiness", "liveness"], `${label}.checks`);
    checks = {
      startup: normalizeCheck(source.startup, `${label}.checks.startup`, ports),
      readiness: normalizeCheck(source.readiness, `${label}.checks.readiness`, ports),
      liveness: normalizeCheck(source.liveness, `${label}.checks.liveness`, ports),
    };
  } else if (resource.checks != null) {
    fail(`${label}.checks are only valid for serving resources.`, "invalid-lifecycle");
  }

  let persistence = null;
  if (role === "stateful") {
    persistence = normalizePersistence(
      resource.persistence,
      `${label}.persistence`,
    );
  } else if (resource.persistence != null) {
    fail(`${label}.persistence is only valid for stateful resources.`, "invalid-topology");
  }

  const normalized = {
    id,
    role,
    type,
    artifact: artifact ?? null,
    command: command ?? null,
    arguments: args ?? [],
    configuration,
    dependsOn: dependsOn.sort((left, right) =>
      `${left.resource}:${left.condition}`.localeCompare(
        `${right.resource}:${right.condition}`,
      ),
    ),
    ports: ports.sort((left, right) => left.name.localeCompare(right.name)),
    checks,
    shutdown: shutdown ?? null,
    persistence,
  };
  return normalized;
}

function findCycle(resources) {
  const graph = new Map(
    resources.map((resource) => [
      resource.id,
      resource.dependsOn.map((dependency) => dependency.resource),
    ]),
  );
  const state = new Map();
  const stack = [];

  function visit(id) {
    const current = state.get(id) ?? 0;
    if (current === 1) {
      const start = stack.indexOf(id);
      return [...stack.slice(start), id];
    }
    if (current === 2) {
      return null;
    }
    state.set(id, 1);
    stack.push(id);
    for (const dependency of graph.get(id) ?? []) {
      const cycle = visit(dependency);
      if (cycle !== null) {
        return cycle;
      }
    }
    stack.pop();
    state.set(id, 2);
    return null;
  }

  for (const resource of resources) {
    const cycle = visit(resource.id);
    if (cycle !== null) {
      return cycle;
    }
  }
  return null;
}

function normalizeMigration(value, resources) {
  const migration = requireRecord(value, "migration");
  rejectUnknownProperties(
    migration,
    ["resource", "order", "beforeServing", "concurrency"],
    "migration",
  );
  const resource = requireIdentifier(migration.resource, "migration.resource");
  const resourceById = new Map(resources.map((candidate) => [candidate.id, candidate]));
  const migrator = resourceById.get(resource);
  if (migrator?.role !== "migrator") {
    fail("migration.resource must identify a Migrator resource.", "invalid-migration");
  }
  const order = requireUniqueStrings(migration.order, "migration.order").map((id) =>
    requireIdentifier(id, "migration.order[]"),
  );
  if (order.length === 0 || order[0] !== resource) {
    fail(
      "migration.order must start with the one-shot Migrator.",
      "invalid-migration",
    );
  }
  for (const id of order) {
    if (resourceById.get(id)?.role !== "migrator") {
      fail(`migration.order references a non-Migrator resource: ${id}.`, "invalid-migration");
    }
  }
  const beforeServing = requireUniqueStrings(
    migration.beforeServing,
    "migration.beforeServing",
  ).map((id) => requireIdentifier(id, "migration.beforeServing[]"));
  const servingIds = resources
    .filter((candidate) => candidate.role === "serving")
    .map((candidate) => candidate.id)
    .sort();
  if (
    JSON.stringify([...beforeServing].sort()) !== JSON.stringify(servingIds)
  ) {
    fail(
      "migration.beforeServing must list every serving resource exactly once.",
      "invalid-migration",
    );
  }
  if (migration.concurrency !== "exclusive") {
    fail("migration.concurrency must be exclusive.", "invalid-migration");
  }
  return {
    resource,
    order,
    beforeServing: beforeServing.sort(),
    concurrency: "exclusive",
  };
}

function validateTopology(resources, migration) {
  const ids = new Set();
  for (const resource of resources) {
    if (ids.has(resource.id)) {
      fail(`Duplicate Deployment Manifest resource identity: ${resource.id}.`, "invalid-topology");
    }
    ids.add(resource.id);
  }
  if (!resources.some((resource) => resource.role === "serving")) {
    fail("Deployment Manifest must declare a serving resource.", "invalid-topology");
  }
  const migrators = resources.filter((resource) => resource.role === "migrator");
  if (migrators.length !== 1 || migrators[0].id !== migration.resource) {
    fail(
      "Deployment Manifest must declare exactly one Migrator resource matching migration.resource.",
      "invalid-migration",
    );
  }
  for (const resource of resources) {
    for (const dependency of resource.dependsOn) {
      const target = resources.find((candidate) => candidate.id === dependency.resource);
      if (target === undefined) {
        fail(
          `${resource.id} depends on an unknown resource: ${dependency.resource}.`,
          "invalid-topology",
        );
      }
      if (target.id === resource.id) {
        fail(`${resource.id} cannot depend on itself.`, "invalid-topology");
      }
      if (dependency.condition === "completed" && target.role !== "migrator") {
        fail(
          `${resource.id} uses completed dependency semantics for non-Migrator ${target.id}.`,
          "invalid-migration",
        );
      }
    }
    if (resource.role === "serving") {
      const migrationDependency = resource.dependsOn.find(
        (dependency) =>
          dependency.resource === migration.resource &&
          dependency.condition === "completed",
      );
      if (migrationDependency === undefined) {
        fail(
          `Serving resource ${resource.id} must wait for Migrator completion before readiness.`,
          "invalid-migration",
        );
      }
    }
  }
  const cycle = findCycle(resources);
  if (cycle !== null) {
    fail(
      `Deployment Manifest dependency graph must be acyclic: ${cycle.join(" -> ")}.`,
      "invalid-topology",
    );
  }
}

function normalizeProfiles(value) {
  if (!Array.isArray(value)) {
    fail("profiles must be an array.", "invalid-profile");
  }
  const profiles = value.map((entry, index) => {
    const label = `profiles[${index}]`;
    const profile = requireRecord(entry, label);
    rejectUnknownProperties(profile, ["id", "kind", "target"], label);
    const id = requireIdentifier(profile.id, `${label}.id`);
    if (!DEPLOYMENT_PROFILES.includes(id)) {
      fail(`${label}.id is not an admitted Deployment Profile: ${id}.`, "unsupported-deployment");
    }
    const definition = PROFILE_DEFINITIONS[id];
    if (profile.kind !== definition.kind || profile.target !== definition.target) {
      fail(
        `${label} does not match the immutable ${id} Deployment Profile contract.`,
        "unsupported-deployment",
      );
    }
    return { id, kind: definition.kind, target: definition.target };
  });
  if (
    profiles.length !== DEPLOYMENT_PROFILES.length ||
    new Set(profiles.map((profile) => profile.id)).size !== profiles.length
  ) {
    fail(
      "Deployment Manifest must select exactly one process and one container profile.",
      "unsupported-deployment",
    );
  }
  return profiles.sort(
    (left, right) =>
      DEPLOYMENT_PROFILES.indexOf(left.id) - DEPLOYMENT_PROFILES.indexOf(right.id),
  );
}

function normalizeArtifacts(value, identity, profiles) {
  if (!Array.isArray(value)) {
    fail("artifacts must be an array.", "invalid-artifact");
  }
  const profileIds = new Set(profiles.map((profile) => profile.id));
  const artifacts = value.map((entry, index) => {
    const label = `artifacts[${index}]`;
    const artifact = requireRecord(entry, label);
    rejectUnknownProperties(
      artifact,
      [
        "profile",
        "kind",
        "digest",
        "sourceRevision",
        "platformContractVersion",
        "runtime",
        "operatingSystem",
        "topologyDigest",
        "configurationSchemaDigest",
        "reproducible",
        "builtOnce",
      ],
      label,
    );
    const profile = requireIdentifier(artifact.profile, `${label}.profile`);
    if (!profileIds.has(profile)) {
      fail(`${label}.profile is not selected by the manifest.`, "invalid-artifact");
    }
    const expected = PROFILE_DEFINITIONS[profile];
    const kind = requireString(artifact.kind, `${label}.kind`);
    if (kind !== expected.kind) {
      fail(`${label}.kind does not match its profile.`, "invalid-artifact");
    }
    const normalized = {
      profile,
      kind,
      digest: requireDigest(artifact.digest, `${label}.digest`),
      sourceRevision: identity.sourceRevision,
      platformContractVersion: identity.platformContractVersion,
      runtime: identity.runtime,
      operatingSystem: identity.operatingSystem,
      topologyDigest: identity.topologyDigest,
      configurationSchemaDigest: identity.configurationSchemaDigest,
      reproducible: true,
      builtOnce: true,
    };
    for (const key of [
      "sourceRevision",
      "platformContractVersion",
      "runtime",
      "operatingSystem",
      "topologyDigest",
      "configurationSchemaDigest",
    ]) {
      if (artifact[key] !== undefined && artifact[key] !== normalized[key]) {
        fail(`${label}.${key} does not match the manifest artifact identity.`, "invalid-identity");
      }
    }
    if (artifact.reproducible !== undefined && artifact.reproducible !== true) {
      fail(`${label}.reproducible must be true.`, "invalid-artifact");
    }
    if (artifact.builtOnce !== undefined && artifact.builtOnce !== true) {
      fail(`${label}.builtOnce must be true.`, "invalid-artifact");
    }
    return normalized;
  });
  if (
    artifacts.length !== profiles.length ||
    new Set(artifacts.map((artifact) => artifact.profile)).size !== artifacts.length
  ) {
    fail(
      "Each selected Deployment Profile must have exactly one digest-addressed artifact.",
      "invalid-artifact",
    );
  }
  return artifacts.sort(
    (left, right) =>
      DEPLOYMENT_PROFILES.indexOf(left.profile) -
      DEPLOYMENT_PROFILES.indexOf(right.profile),
  );
}

function sourceRevisionFrom(input) {
  const source = input.source;
  const application = input.application;
  return requireSourceRevision(
    input.sourceRevision ??
      (isRecord(source) ? source.revision : undefined) ??
      (isRecord(application) ? application.sourceRevision : undefined),
    "source.revision",
  );
}

function buildManifest(input) {
  const value = requireRecord(input, "deployment manifest");
  assertSecretFree(value);
  rejectUnknownProperties(
    value,
    [
      "$schema",
      "schemaVersion",
      "application",
      "source",
      "security",
      "configuration",
      "resources",
      "migration",
      "profiles",
      "artifacts",
      "identity",
      "supportClaims",
      "runtime",
      "operatingSystem",
      "sourceRevision",
    ],
    "deployment manifest",
  );
  const schemaVersion = requireString(
    value.schemaVersion ?? DEPLOYMENT_MANIFEST_SCHEMA_VERSION,
    "schemaVersion",
  );
  if (schemaVersion !== DEPLOYMENT_MANIFEST_SCHEMA_VERSION) {
    fail(`Unsupported Deployment Manifest schema version: ${schemaVersion}.`, "unsupported-schema");
  }
  const sourceRevision = sourceRevisionFrom(value);
  const application = normalizeApplication(value.application, sourceRevision);
  const configuration = normalizeConfiguration(value.configuration);
  const configurationKeys = new Set(
    configuration.entries.map((entry) => entry.key),
  );
  if (!Array.isArray(value.resources) || value.resources.length === 0) {
    fail("resources must contain at least one logical resource.", "invalid-topology");
  }
  const resources = value.resources
    .map((resource, index) => normalizeResource(resource, index, configurationKeys))
    .sort((left, right) => left.id.localeCompare(right.id));
  const migration = normalizeMigration(value.migration, resources);
  validateTopology(resources, migration);
  const profiles = normalizeProfiles(value.profiles);

  const runtime = requireString(
    value.runtime ?? "net10.0",
    "runtime",
  ).toLowerCase();
  const operatingSystem = requireIdentifier(
    value.operatingSystem ?? "linux",
    "operatingSystem",
  );
  const topologyDigest = sha256({
    application,
    resources,
    migration,
  });
  const configurationSchemaDigest = sha256(configuration);
  const identity = {
    sourceRevision,
    platformContractVersion: application.platformContractVersion,
    runtime,
    operatingSystem,
    topologyDigest,
    configurationSchemaDigest,
    reproducible: true,
    builtOnce: true,
    manifestDigest: null,
  };
  const artifacts = normalizeArtifacts(value.artifacts, identity, profiles);
  const manifest = {
    $schema: value.$schema ?? DEPLOYMENT_MANIFEST_SCHEMA_URI,
    schemaVersion,
    application: {
      name: application.name,
      platformVersion: application.platformVersion,
      platformContractVersion: application.platformContractVersion,
    },
    source: { revision: sourceRevision },
    security: {
      secretPolicy: "external-only",
      containsSecrets: false,
    },
    configuration,
    resources,
    migration,
    profiles,
    artifacts,
    identity,
    supportClaims: [],
  };
  identity.manifestDigest = sha256(manifest);
  if (value.identity !== undefined) {
    const suppliedIdentity = requireRecord(value.identity, "identity");
    if (canonicalJson(suppliedIdentity) !== canonicalJson(identity)) {
      fail(
        "Deployment Manifest identity does not match its immutable content.",
        "invalid-identity",
      );
    }
  }
  if (value.security !== undefined && canonicalJson(value.security) !== canonicalJson(manifest.security)) {
    fail(
      "Deployment Manifest security metadata must remain external-only and secret-free.",
      "secret-input",
    );
  }
  if (value.supportClaims !== undefined) {
    if (!Array.isArray(value.supportClaims) || value.supportClaims.length !== 0) {
      fail("Deployment Manifest cannot make a Supported deployment claim.", "support-claim");
    }
  }
  return manifest;
}

export function createDeploymentManifest(input) {
  return deepFreeze(buildManifest(input));
}

export const composeDeploymentManifest = createDeploymentManifest;

export function normalizeDeploymentManifest(manifest) {
  return buildManifest(manifest);
}

export function validateDeploymentManifest(manifest) {
  const normalized = buildManifest(manifest);
  if (canonicalJson(manifest) !== canonicalJson(normalized)) {
    fail(
      "Deployment Manifest is not normalized or contains an unverifiable derived field.",
      "invalid-identity",
    );
  }
  return normalized;
}

export const resolveDeploymentManifest = validateDeploymentManifest;

function artifactFor(manifest, profile, label = "artifact") {
  const normalized = validateDeploymentManifest(manifest);
  const id = requireIdentifier(profile, `${label}.profile`);
  const artifact = normalized.artifacts.find((candidate) => candidate.profile === id);
  if (artifact === undefined) {
    fail(`${label} does not identify a selected Deployment Profile artifact.`, "invalid-artifact");
  }
  return { manifest: normalized, artifact };
}

function projectionBody(manifest, profile) {
  const { manifest: normalized, artifact } = artifactFor(manifest, profile, "profile");
  const selectedProfile = normalized.profiles.find((candidate) => candidate.id === artifact.profile);
  return {
    schemaVersion: DEPLOYMENT_MANIFEST_SCHEMA_VERSION,
    profile: selectedProfile.id,
    kind: selectedProfile.kind,
    target: selectedProfile.target,
    manifestDigest: normalized.identity.manifestDigest,
    identity: {
      sourceRevision: normalized.identity.sourceRevision,
      platformContractVersion: normalized.identity.platformContractVersion,
      runtime: normalized.identity.runtime,
      operatingSystem: normalized.identity.operatingSystem,
      topologyDigest: normalized.identity.topologyDigest,
      configurationSchemaDigest: normalized.identity.configurationSchemaDigest,
      artifactDigest: artifact.digest,
    },
    configuration: {
      schemaVersion: normalized.configuration.schemaVersion,
      digest: normalized.identity.configurationSchemaDigest,
      keys: normalized.configuration.entries.map((entry) => entry.key),
    },
    resources: normalized.resources,
    migration: normalized.migration,
  };
}

export function projectDeploymentProfile(manifest, profile) {
  const body = projectionBody(manifest, profile);
  const projection = {
    ...body,
    projectionDigest: null,
  };
  projection.projectionDigest = sha256(projection);
  return deepFreeze(projection);
}

export const projectArtifactProfile = projectDeploymentProfile;

export function verifyDeploymentProjection(manifest, projection) {
  const value = requireRecord(projection, "deployment projection");
  const expected = projectDeploymentProfile(manifest, value.profile);
  if (canonicalJson(value) !== canonicalJson(expected)) {
    fail(
      `Deployment projection drift detected for profile ${value.profile}.`,
      "drift-detected",
    );
  }
  return {
    status: "passed",
    profile: expected.profile,
    manifestDigest: expected.manifestDigest,
    projectionDigest: expected.projectionDigest,
  };
}

export const verifyDeploymentDrift = verifyDeploymentProjection;

function normalizeArtifactReference(manifest, input, label) {
  const value =
    typeof input === "string"
      ? { profile: "process", digest: input }
      : requireRecord(input, label);
  const profile = requireIdentifier(value.profile, `${label}.profile`);
  const { artifact } = artifactFor(manifest, profile, label);
  const digest = requireDigest(value.digest, `${label}.digest`);
  if (digest !== artifact.digest) {
    fail(
      `${label}.digest is not the immutable digest selected by the Deployment Manifest.`,
      "invalid-artifact",
    );
  }
  return { profile, digest };
}

export function promoteDeploymentArtifact({
  manifest,
  profile,
  artifact = undefined,
  sourceEnvironment = "candidate",
  targetEnvironment,
  rebuilt = false,
}) {
  const normalized = validateDeploymentManifest(manifest);
  const target = requireIdentifier(targetEnvironment, "targetEnvironment");
  if (rebuilt !== false) {
    fail(
      "Promotion must consume the candidate artifact without a production rebuild.",
      "rebuild-detected",
    );
  }
  const reference = normalizeArtifactReference(
    normalized,
    artifact ?? { profile, digest: artifactFor(normalized, profile, "profile").artifact.digest },
    "promotion.artifact",
  );
  return deepFreeze({
    schemaVersion: DEPLOYMENT_EVIDENCE_SCHEMA_VERSION,
    action: "promote",
    profile: reference.profile,
    artifactDigest: reference.digest,
    manifestDigest: normalized.identity.manifestDigest,
    topologyDigest: normalized.identity.topologyDigest,
    sourceEnvironment: requireIdentifier(sourceEnvironment, "sourceEnvironment"),
    targetEnvironment: target,
    rebuilt: false,
    verified: true,
  });
}

export const createPromotionEvidence = promoteDeploymentArtifact;

export function rollbackDeploymentArtifact({
  manifest,
  profile,
  artifact = undefined,
  sourceEnvironment = "current",
  targetEnvironment = "previous",
  rebuilt = false,
}) {
  const normalized = validateDeploymentManifest(manifest);
  if (rebuilt !== false) {
    fail(
      "Rollback must restore a previously built digest without rebuilding.",
      "rebuild-detected",
    );
  }
  const reference = normalizeArtifactReference(
    normalized,
    artifact ?? { profile, digest: artifactFor(normalized, profile, "profile").artifact.digest },
    "rollback.artifact",
  );
  return deepFreeze({
    schemaVersion: DEPLOYMENT_EVIDENCE_SCHEMA_VERSION,
    action: "rollback",
    profile: reference.profile,
    artifactDigest: reference.digest,
    manifestDigest: normalized.identity.manifestDigest,
    topologyDigest: normalized.identity.topologyDigest,
    sourceEnvironment: requireIdentifier(sourceEnvironment, "sourceEnvironment"),
    targetEnvironment: requireIdentifier(targetEnvironment, "targetEnvironment"),
    rebuilt: false,
    verified: true,
  });
}

export const createRollbackEvidence = rollbackDeploymentArtifact;

function verifyTransition(manifest, transition, action) {
  const value = requireRecord(transition, `${action} evidence`);
  rejectUnknownProperties(
    value,
    [
      "schemaVersion",
      "action",
      "profile",
      "artifactDigest",
      "manifestDigest",
      "topologyDigest",
      "sourceEnvironment",
      "targetEnvironment",
      "rebuilt",
      "verified",
    ],
    `${action} evidence`,
  );
  if (value.schemaVersion !== DEPLOYMENT_EVIDENCE_SCHEMA_VERSION || value.action !== action) {
    fail(`${action} evidence has an unsupported schema or action.`, "invalid-evidence");
  }
  const reference = normalizeArtifactReference(
    manifest,
    { profile: value.profile, digest: value.artifactDigest },
    `${action} evidence.artifact`,
  );
  const normalized = validateDeploymentManifest(manifest);
  if (
    value.manifestDigest !== normalized.identity.manifestDigest ||
    value.topologyDigest !== normalized.identity.topologyDigest ||
    value.rebuilt !== false ||
    value.verified !== true ||
    reference.profile !== value.profile ||
    reference.digest !== value.artifactDigest
  ) {
    fail(`${action} evidence does not prove immutable artifact use.`, "invalid-evidence");
  }
  requireIdentifier(value.sourceEnvironment, `${action} evidence.sourceEnvironment`);
  requireIdentifier(value.targetEnvironment, `${action} evidence.targetEnvironment`);
  return true;
}

export function verifyPromotionEvidence(manifest, evidence) {
  return verifyTransition(manifest, evidence, "promote");
}

export function verifyRollbackEvidence(manifest, evidence) {
  return verifyTransition(manifest, evidence, "rollback");
}

function deploymentChecks(manifest, projections, promotion, rollback) {
  const normalized = validateDeploymentManifest(manifest);
  if (!Array.isArray(projections)) {
    fail(
      "Deployment evidence projections must be an array.",
      "incomplete-evidence",
    );
  }
  const projectionProfiles = projections.map((projection) => projection?.profile);
  if (
    projectionProfiles.length !== DEPLOYMENT_PROFILES.length ||
    new Set(projectionProfiles).size !== DEPLOYMENT_PROFILES.length ||
    DEPLOYMENT_PROFILES.some((profile) => !projectionProfiles.includes(profile))
  ) {
    fail("Deployment evidence must include both process and container projections.", "incomplete-evidence");
  }
  const projectionResults = projections.map((projection) =>
    verifyDeploymentProjection(normalized, projection),
  );
  verifyPromotionEvidence(normalized, promotion);
  verifyRollbackEvidence(normalized, rollback);
  return {
    artifactIdentity: true,
    reproducible: normalized.identity.reproducible === true,
    builtOnce: normalized.identity.builtOnce === true,
    externalConfiguration: normalized.security.containsSecrets === false,
    readiness: normalized.resources
      .filter((resource) => resource.role === "serving")
      .every((resource) => resource.checks?.readiness !== undefined),
    liveness: normalized.resources
      .filter((resource) => resource.role === "serving")
      .every((resource) => resource.checks?.liveness !== undefined),
    gracefulShutdown: normalized.resources
      .filter((resource) => resource.shutdown !== null)
      .every((resource) => resource.shutdown.gracePeriodSeconds > 0),
    migratorOrdering: normalized.migration.beforeServing.every((resourceId) =>
      normalized.resources
        .find((resource) => resource.id === resourceId)
        ?.dependsOn.some(
          (dependency) =>
            dependency.resource === normalized.migration.resource &&
            dependency.condition === "completed",
        ),
    ),
    promotion: true,
    rollback: true,
    drift: projectionResults.every((result) => result.status === "passed"),
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

export function createDeploymentEvidence({
  manifest,
  projections = undefined,
  promotion = undefined,
  rollback = undefined,
}) {
  const normalized = validateDeploymentManifest(manifest);
  const selectedProjections =
    projections ?? DEPLOYMENT_PROFILES.map((profile) =>
      projectDeploymentProfile(normalized, profile),
    );
  const selectedPromotion =
    promotion ??
    promoteDeploymentArtifact({
      manifest: normalized,
      profile: "process",
      targetEnvironment: "staging",
    });
  const selectedRollback =
    rollback ??
    rollbackDeploymentArtifact({
      manifest: normalized,
      profile: "process",
    });
  const checks = deploymentChecks(
    normalized,
    selectedProjections,
    selectedPromotion,
    selectedRollback,
  );
  if (Object.values(checks).some((value) => value !== true)) {
    fail("Deployment evidence is incomplete and must fail closed.", "incomplete-evidence");
  }
  const evidence = {
    schemaVersion: DEPLOYMENT_EVIDENCE_SCHEMA_VERSION,
    outcome: "passed",
    failClosed: true,
    manifestDigest: normalized.identity.manifestDigest,
    topologyDigest: normalized.identity.topologyDigest,
    configurationSchemaDigest: normalized.identity.configurationSchemaDigest,
    artifacts: normalized.artifacts,
    projections: selectedProjections,
    promotion: selectedPromotion,
    rollback: selectedRollback,
    checks,
    supportClaims: [],
    verification: {
      evidenceDigest: null,
    },
  };
  evidence.verification.evidenceDigest = evidenceDigest(evidence);
  return deepFreeze(evidence);
}

export function verifyDeploymentEvidence(manifest, evidence) {
  const normalized = validateDeploymentManifest(manifest);
  const value = requireRecord(evidence, "deployment evidence");
  assertSecretFree(value, "deployment evidence");
  rejectUnknownProperties(
    value,
    [
      "schemaVersion",
      "outcome",
      "failClosed",
      "manifestDigest",
      "topologyDigest",
      "configurationSchemaDigest",
      "artifacts",
      "projections",
      "promotion",
      "rollback",
      "checks",
      "supportClaims",
      "verification",
    ],
    "deployment evidence",
  );
  if (value.schemaVersion !== DEPLOYMENT_EVIDENCE_SCHEMA_VERSION) {
    fail("Unsupported deployment evidence schema version.", "invalid-evidence");
  }
  if (value.outcome !== "passed" || value.failClosed !== true) {
    fail("Deployment evidence must be a passed fail-closed terminal record.", "invalid-evidence");
  }
  if (!Array.isArray(value.supportClaims) || value.supportClaims.length !== 0) {
    fail("Deployment evidence cannot make a Supported deployment claim.", "support-claim");
  }
  if (
    value.manifestDigest !== normalized.identity.manifestDigest ||
    value.topologyDigest !== normalized.identity.topologyDigest ||
    value.configurationSchemaDigest !== normalized.identity.configurationSchemaDigest
  ) {
    fail("Deployment evidence does not identify the verified manifest.", "invalid-identity");
  }
  if (canonicalJson(value.artifacts) !== canonicalJson(normalized.artifacts)) {
    fail("Deployment evidence artifact identities drifted from the manifest.", "drift-detected");
  }
  const checks = requireRecord(value.checks, "deployment evidence.checks");
  const expectedChecks = deploymentChecks(
    normalized,
    value.projections,
    value.promotion,
    value.rollback,
  );
  if (canonicalJson(checks) !== canonicalJson(expectedChecks)) {
    fail(
      "Deployment evidence checks do not cover every required contract.",
      "incomplete-evidence",
    );
  }
  requireRecord(value.verification, "deployment evidence.verification");
  rejectUnknownProperties(
    value.verification,
    ["evidenceDigest"],
    "deployment evidence.verification",
  );
  requireDigest(
    value.verification.evidenceDigest,
    "deployment evidence.verification.evidenceDigest",
  );
  if (value.verification.evidenceDigest !== evidenceDigest(value)) {
    fail("Deployment evidence digest does not match its immutable content.", "invalid-evidence");
  }
  return {
    status: "passed",
    outcome: value.outcome,
    manifestDigest: value.manifestDigest,
    topologyDigest: value.topologyDigest,
    artifactProfiles: normalized.artifacts.map((artifact) => artifact.profile),
  };
}

export function evaluateDeploymentManifest({ manifest, evidence = undefined }) {
  try {
    const normalized = validateDeploymentManifest(manifest);
    const verifiedEvidence =
      evidence === undefined
        ? createDeploymentEvidence({ manifest: normalized })
        : verifyDeploymentEvidence(normalized, evidence);
    return {
      status: "passed",
      manifest: normalized,
      evidence: verifiedEvidence,
    };
  } catch (error) {
    if (!(error instanceof DeploymentManifestError)) {
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

export function verifyDeploymentManifest(manifest) {
  const normalized = validateDeploymentManifest(manifest);
  const projections = DEPLOYMENT_PROFILES.map((profile) =>
    projectDeploymentProfile(normalized, profile),
  );
  return {
    status: "passed",
    manifest: normalized,
    manifestDigest: normalized.identity.manifestDigest,
    topologyDigest: normalized.identity.topologyDigest,
    projections,
  };
}

export const verifyDeployment = verifyDeploymentManifest;
