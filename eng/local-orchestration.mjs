import {
  projectDeploymentProfile,
  sha256,
  validateDeploymentManifest,
} from "./deployment-manifest.mjs";

export const LOCAL_ORCHESTRATION_SCHEMA_VERSION = "1.0.0";
export const LOCAL_ORCHESTRATION_PROFILES = Object.freeze([
  "direct",
  "aspire",
  "compose",
]);
export const LOCAL_ORCHESTRATION_SCHEMA_URI =
  "https://github.com/MartiXDev/Platform/schemas/local-orchestration.schema.json";

const EXECUTABLE_ROLES = new Set(["migrator", "serving", "worker"]);
const SECRET_KEY_PATTERN =
  /(?:secret|password|token|private.?key|access.?key|api.?key|credential|value)/i;
const SECRET_ARGUMENT_PATTERN =
  /(?:^|[\s_-])(?:secret|password|token|private.?key|access.?key|api.?key|credential)(?:[\s=:/])/i;
const ALLOWED_SECRET_METADATA_KEYS = new Set([
  "secretPolicy",
  "containsSecrets",
  "sensitivity",
]);

export class LocalOrchestrationError extends Error {
  constructor(message, code = "invalid-orchestration") {
    super(message);
    this.name = "LocalOrchestrationError";
    this.code = code;
  }
}

function fail(message, code = "invalid-orchestration") {
  throw new LocalOrchestrationError(message, code);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function deepClone(value) {
  return structuredClone(value);
}

function containsSecretShapedArgument(value) {
  if (Array.isArray(value)) {
    return containsSecretShapedArgument(value.join(" "));
  }
  return typeof value === "string" && SECRET_ARGUMENT_PATTERN.test(value);
}

function assertSecretFree(value, path = "orchestration") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertSecretFree(item, `${path}[${index}]`));
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (SECRET_KEY_PATTERN.test(key) && !ALLOWED_SECRET_METADATA_KEYS.has(key)) {
      fail(`${path}.${key} is not allowed in a local orchestration projection.`, "secret-input");
    }
    if (
      (key === "command" || key === "arguments") &&
      containsSecretShapedArgument(child)
    ) {
      fail(
        `${path}.${key} contains a secret-shaped argument and is not allowed in a local orchestration projection.`,
        "secret-input",
      );
    }
    assertSecretFree(child, `${path}.${key}`);
  }
}

function configurationEnvironmentKey(key) {
  return key.replaceAll(":", "__");
}

function configurationReference(key) {
  const environmentKey = configurationEnvironmentKey(key);
  return `\${${environmentKey}:?set ${environmentKey} externally}`;
}

function csharpString(value) {
  return JSON.stringify(value);
}

function identifier(value) {
  return value.replace(/[^A-Za-z0-9_]/g, "_");
}

function resourceVariable(resource) {
  return identifier(resource.id);
}

function resourceById(resources) {
  return new Map(resources.map((resource) => [resource.id, resource]));
}

function executableResources(resources) {
  return resources.filter((resource) => EXECUTABLE_ROLES.has(resource.role));
}

function executableOrder(resources) {
  const pending = new Map(
    executableResources(resources).map((resource) => [resource.id, resource]),
  );
  const emitted = new Set(
    resources
      .filter((resource) => resource.role === "stateful")
      .map((resource) => resource.id),
  );
  const ordered = [];

  while (pending.size > 0) {
    const next = [...pending.values()].find((resource) =>
      resource.dependsOn.every((dependency) => emitted.has(dependency.resource)),
    );
    if (next === undefined) {
      fail("Aspire projection could not order executable resources.", "invalid-topology");
    }
    pending.delete(next.id);
    emitted.add(next.id);
    ordered.push(next);
  }

  return ordered;
}

function resourceImage(applicationName, digest) {
  const imageName = applicationName.toLowerCase().replaceAll(".", "-");
  return `${imageName}@${digest}`;
}

function renderAspireAppHost(manifest) {
  const resources = manifest.resources;
  const byId = resourceById(resources);
  const stateful = resources.filter((resource) => resource.role === "stateful");
  const parameterVariables = new Map();
  const lines = [
    "#:sdk Microsoft.NET.Sdk",
    "#:package Aspire.Hosting@13.0.0",
    "",
    "using Aspire.Hosting;",
    "",
    "var builder = DistributedApplication.CreateBuilder(args);",
    "// Generated from the validated Deployment Manifest; do not edit topology here.",
  ];

  for (const entry of manifest.configuration.entries) {
    if (entry.key.startsWith("ConnectionStrings:")) {
      continue;
    }
    const variable = `parameter_${identifier(entry.key)}`;
    parameterVariables.set(entry.key, variable);
    lines.push(
      `var ${variable} = builder.AddParameter(${csharpString(entry.key)});`,
    );
  }

  for (const resource of stateful) {
    lines.push(
      `var ${resourceVariable(resource)} = builder.AddConnectionString(${csharpString(resource.id)});`,
    );
  }

  for (const resource of executableOrder(resources)) {
    const variable = resourceVariable(resource);
    const commandArguments = [resource.command, ...resource.arguments];
    const renderedArguments = commandArguments.map(csharpString).join(", ");
    lines.push(
      `var ${variable} = builder.AddExecutable(${csharpString(resource.id)}, ${csharpString("dotnet")}, ".", ${renderedArguments});`,
    );

    for (const dependency of resource.dependsOn) {
      const dependencyResource = byId.get(dependency.resource);
      if (dependencyResource?.role === "stateful") {
        lines.push(
          `${variable}.WithReference(${resourceVariable(dependencyResource)});`,
        );
      } else if (dependency.condition === "completed") {
        lines.push(
          `${variable}.WaitForCompletion(${resourceVariable(dependencyResource)});`,
        );
      } else {
        lines.push(`${variable}.WaitFor(${resourceVariable(dependencyResource)});`);
      }
    }

    for (const key of resource.configuration) {
      const parameter = parameterVariables.get(key);
      if (parameter !== undefined) {
        lines.push(
          `${variable}.WithEnvironment(${csharpString(key)}, ${parameter});`,
        );
      }
    }

    if (resource.checks?.readiness?.kind === "http") {
      lines.push(
        `${variable}.WithHttpHealthCheck(${csharpString(resource.checks.readiness.path)});`,
      );
    }
  }

  lines.push(
    "",
    "// SIGTERM and the declared grace periods remain application-owned shutdown semantics.",
    "// Required configuration is supplied by the developer environment or user-secrets.",
    "builder.Build().Run();",
    "",
  );
  return lines.join("\n");
}

function renderEnvironment(resource) {
  const keys = resource.configuration;
  if (keys.length === 0) {
    return [];
  }
  return [
    "    environment:",
    ...keys.map(
      (key) =>
        `      ${configurationEnvironmentKey(key)}: ${JSON.stringify(configurationReference(key))}`,
    ),
  ];
}

function composeDependencyCondition(dependency) {
  if (dependency.condition === "completed") {
    return "service_completed_successfully";
  }
  return "service_healthy";
}

function renderDependsOn(resource) {
  if (resource.dependsOn.length === 0) {
    return [];
  }
  const lines = ["    depends_on:"];
  for (const dependency of resource.dependsOn) {
    const condition = composeDependencyCondition(dependency);
    lines.push(`      ${dependency.resource}:`, `        condition: ${condition}`);
  }
  return lines;
}

function composeRestartPolicy(resource) {
  if (resource.role === "migrator") {
    return '"no"';
  }
  return '"on-failure:3"';
}

function healthcheckCommand(resource, readiness) {
  const portNumber = resource.ports.find(
    (port) => port.name === readiness.port,
  ).number;
  if (readiness.kind === "http") {
    return `wget --spider --quiet http://localhost:${portNumber}${readiness.path}`;
  }
  return `nc -z ${portNumber}`;
}

function renderHealthcheck(resource) {
  const readiness = resource.checks?.readiness;
  if (readiness === undefined) {
    return [];
  }
  const command = healthcheckCommand(resource, readiness);
  return [
    "    healthcheck:",
    `      test: ["CMD-SHELL", ${JSON.stringify(`${command} || exit 1`)}]`,
    `      timeout: ${readiness.timeoutSeconds}s`,
    `      interval: ${readiness.intervalSeconds}s`,
    "      retries: 3",
  ];
}

function renderCompose(manifest) {
  const resources = manifest.resources;
  const containerArtifact = manifest.artifacts.find(
    (artifact) => artifact.profile === "container",
  );
  const appImage = resourceImage(
    manifest.application.name,
    containerArtifact.digest,
  );
  const lines = [
    "name: martix-local",
    "services:",
  ];

  for (const resource of resources) {
    lines.push(`  ${resource.id}:`);
    if (resource.role === "stateful") {
      lines.push(
        '    image: "${MARTIX_DATABASE_IMAGE:?set MARTIX_DATABASE_IMAGE externally}"',
        "    healthcheck:",
        `      test: ["CMD-SHELL", ${JSON.stringify(configurationReference("MARTIX_DATABASE_HEALTHCHECK"))}]`,
        "      timeout: 5s",
        "      interval: 10s",
        "      retries: 3",
      );
    } else {
      lines.push(`    image: ${JSON.stringify(appImage)}`);
      lines.push(
        `    command: ${JSON.stringify([resource.command, ...resource.arguments])}`,
      );
      lines.push(...renderEnvironment(resource));
      lines.push(...renderDependsOn(resource));
      lines.push(`    restart: ${composeRestartPolicy(resource)}`);
      lines.push(`    stop_signal: ${resource.shutdown.signal}`);
      lines.push(`    stop_grace_period: ${resource.shutdown.gracePeriodSeconds}s`);
    }

    if (resource.persistence !== null) {
      lines.push(
        "    volumes:",
        `      - ${resource.id}-data:/var/lib/martix/${resource.id}`,
      );
    }
    lines.push("    networks:", "      - private");
    lines.push(...renderHealthcheck(resource));

    const publicPorts = resource.ports.filter(
      (port) => port.exposure === "public",
    );
    if (publicPorts.length > 0) {
      lines.push(
        "    ports:",
        ...publicPorts.map((port) => `      - "${port.number}:${port.number}"`),
      );
    }
  }

  const persistedResources = resources.filter(
    (resource) => resource.persistence !== null,
  );
  if (persistedResources.length > 0) {
    lines.push("volumes:");
    for (const resource of persistedResources) {
      lines.push(`  ${resource.id}-data:`);
    }
  }
  lines.push(
    "networks:",
    "  private:",
    "    internal: true",
    "x-martix:",
    "  profile: bounded-single-host",
    "  high-availability: false",
    "  migration: one-shot-before-serving",
    "",
  );
  return lines.join("\n");
}

function projectionDetails(projection) {
  return {
    resources: deepClone(projection.resources),
    migration: deepClone(projection.migration),
    configuration: deepClone(projection.configuration),
  };
}

export function createLocalOrchestration(manifest) {
  const normalized = validateDeploymentManifest(manifest);
  assertSecretFree(normalized);

  const processProjection = projectDeploymentProfile(normalized, "process");
  const containerProjection = projectDeploymentProfile(normalized, "container");
  const base = {
    schemaVersion: LOCAL_ORCHESTRATION_SCHEMA_VERSION,
    manifestDigest: normalized.identity.manifestDigest,
    topologyDigest: normalized.identity.topologyDigest,
    configurationSchemaDigest: normalized.identity.configurationSchemaDigest,
    configuration: deepClone(processProjection.configuration),
    migration: deepClone(processProjection.migration),
    supportClaims: [],
  };
  const orchestration = {
    ...base,
    direct: {
      profile: "direct",
      sourceProfile: "process",
      command: "dotnet run",
      universal: true,
      artifactDigest: processProjection.identity.artifactDigest,
      ...projectionDetails(processProjection),
    },
    aspire: {
      profile: "aspire",
      sourceProfile: "process",
      kind: "file",
      file: "apphost.cs",
      optional: true,
      manifestDigest: normalized.identity.manifestDigest,
      ...projectionDetails(processProjection),
      content: renderAspireAppHost(normalized),
    },
    compose: {
      profile: "compose",
      sourceProfile: "container",
      kind: "yaml",
      file: "compose.yaml",
      mode: "bounded-single-host",
      build: false,
      highAvailability: false,
      manifestDigest: normalized.identity.manifestDigest,
      artifactDigest: containerProjection.identity.artifactDigest,
      ...projectionDetails(containerProjection),
      content: renderCompose(normalized),
    },
  };
  return Object.freeze(orchestration);
}

export const projectLocalOrchestration = createLocalOrchestration;

export function verifyLocalOrchestration(manifest, orchestration) {
  const expected = createLocalOrchestration(manifest);
  if (JSON.stringify(orchestration) !== JSON.stringify(expected)) {
    fail("Local orchestration projections drifted from the validated Deployment Manifest.", "drift-detected");
  }
  return {
    status: "passed",
    manifestDigest: expected.manifestDigest,
    topologyDigest: expected.topologyDigest,
    profiles: [...LOCAL_ORCHESTRATION_PROFILES],
  };
}

export const verifyLocalOrchestrationProjection = verifyLocalOrchestration;
