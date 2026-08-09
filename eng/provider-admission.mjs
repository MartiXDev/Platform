import { createHash } from "node:crypto";

export const PROVIDER_ADMISSION_EVIDENCE_SCHEMA_VERSION = "1.0.0";
export const PROVIDER_ADMISSION_CATALOG_VERSION = "0.1.0-bootstrap";
export const PROVIDER_ADMISSION_OUTCOMES = Object.freeze([
  "passed",
  "failed",
  "unstable",
  "infrastructure-error",
  "cancelled",
  "not-applicable",
]);
export const PROVIDER_ADMISSION_EFFECT_KINDS = Object.freeze([
  "packages",
  "configuration",
  "registrations",
  "workers",
  "healthChecks",
  "telemetry",
  "containers",
  "deployment",
]);
export const PROVIDER_ADMISSION_COMMON_GATES = Object.freeze([
  "template-generation",
  "architecture",
  "security-supply-chain",
  "provider-integration",
  "reliability-operations",
  "release-evidence",
]);
export const PROVIDER_ADMISSION_EVIDENCE_DIMENSIONS = Object.freeze([
  "selection",
  "prerequisites",
  "conflicts",
  "configuration",
  "effects",
  "absence",
  "runtime",
  "operating-system",
]);

const PROVIDER_CLASSIFICATIONS = new Set([
  "required",
  "required-default",
  "required-explicit",
  "optional-supported",
  "experimental",
  "deferred",
  "invalid",
]);
const MATRIX_AXES = Object.freeze({
  preset: "presets",
  runtime: "runtimes",
  operatingSystem: "operatingSystems",
  databaseProvider: "databaseProviders",
  deploymentProfile: "deploymentProfiles",
});
const PACKAGE_VERSION_PATTERN = /^[0-9A-Za-z][0-9A-Za-z.+-]*$/;
const IDENTIFIER_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;

export class ProviderAdmissionError extends Error {
  constructor(message, code = "invalid-selection", details = undefined) {
    super(message);
    this.name = "ProviderAdmissionError";
    this.code = code;
    this.details = details;
  }
}

function fail(message, code = "invalid-selection", details = undefined) {
  throw new ProviderAdmissionError(message, code, details);
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

  return [...values];
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

function packageEffect(id, version) {
  return { id, version };
}

function emptyEffects(overrides = {}) {
  return {
    packages: [],
    configuration: [],
    registrations: [],
    workers: [],
    healthChecks: [],
    telemetry: [],
    containers: [],
    deployment: [],
    ...overrides,
  };
}

function qualityProfile(id, gates, evidence = PROVIDER_ADMISSION_EVIDENCE_DIMENSIONS) {
  return {
    id,
    gates,
    evidence,
  };
}

function providerDefinition({
  capability,
  id,
  classification = "experimental",
  presets,
  prerequisites = [],
  conflicts = [],
  requiredConfiguration = [],
  effects,
  quality,
  matrix = {},
  runtimeSupport = "jit",
  nativeAot = "undeclared",
}) {
  return {
    capability,
    id,
    classification,
    presets,
    prerequisites,
    conflicts,
    requiredConfiguration,
    effects,
    qualityProfile: quality,
    matrix: {
      presets,
      runtimes: ["net10.0"],
      operatingSystems: ["linux", "windows"],
      ...matrix,
    },
    runtimeSupport,
    nativeAot,
    supportClaim: false,
  };
}

const RELATIONAL_PROVIDER_DEFINITIONS = [
  providerDefinition({
    capability: "relational-persistence",
    id: "postgresql",
    presets: ["modular-monolith", "full-stack"],
    requiredConfiguration: ["ConnectionStrings:Database"],
    effects: emptyEffects({
      packages: [
        packageEffect("Npgsql.EntityFrameworkCore.PostgreSQL", "10.0.0"),
      ],
      configuration: ["ConnectionStrings:Database"],
      registrations: ["EntityFrameworkCore:PostgreSQL"],
      healthChecks: ["relational-database"],
      telemetry: ["relational-database"],
      containers: ["postgresql:17"],
      deployment: ["relational-database"],
    }),
    quality: qualityProfile(
      "provider.relational-persistence.postgresql",
      ["provider-translation", "migration", "reliability"],
    ),
    matrix: {
      databaseProviders: ["postgresql"],
    },
  }),
  providerDefinition({
    capability: "relational-persistence",
    id: "sqlserver",
    presets: ["modular-monolith", "full-stack"],
    requiredConfiguration: ["ConnectionStrings:Database"],
    effects: emptyEffects({
      packages: [
        packageEffect("Microsoft.EntityFrameworkCore.SqlServer", "10.0.10"),
      ],
      configuration: ["ConnectionStrings:Database"],
      registrations: ["EntityFrameworkCore:SqlServer"],
      healthChecks: ["relational-database"],
      telemetry: ["relational-database"],
      containers: ["sqlserver:2022"],
      deployment: ["relational-database"],
    }),
    quality: qualityProfile(
      "provider.relational-persistence.sqlserver",
      ["provider-translation", "migration", "reliability"],
    ),
    matrix: {
      databaseProviders: ["sqlserver"],
    },
  }),
];

const OPTIONAL_PROVIDER_DEFINITIONS = [
  providerDefinition({
    capability: "distributed-cache",
    id: "valkey",
    presets: ["api", "modular-monolith", "full-stack"],
    requiredConfiguration: ["ConnectionStrings:DistributedCache"],
    effects: emptyEffects({
      packages: [
        packageEffect(
          "Microsoft.Extensions.Caching.StackExchangeRedis",
          "10.0.10",
        ),
      ],
      configuration: [
        "ConnectionStrings:DistributedCache",
        "DistributedCache:Provider",
      ],
      registrations: ["IDistributedCache:StackExchangeRedis"],
      healthChecks: ["distributed-cache"],
      telemetry: ["distributed-cache"],
      containers: ["valkey:9.1.0"],
      deployment: ["distributed-cache"],
    }),
    quality: qualityProfile(
      "provider.distributed-cache.valkey",
      ["expiration", "serialization", "reconnect", "multi-instance"],
    ),
    matrix: {
      deploymentProfiles: ["direct", "container"],
    },
  }),
  providerDefinition({
    capability: "durable-jobs",
    id: "quartz",
    presets: ["modular-monolith", "full-stack"],
    prerequisites: [{ capability: "relational-persistence" }],
    requiredConfiguration: ["ConnectionStrings:Quartz"],
    effects: emptyEffects({
      packages: [packageEffect("Quartz", "3.18.2")],
      configuration: [
        "ConnectionStrings:Quartz",
        "Quartz:SchedulerName",
      ],
      registrations: ["Quartz:Scheduler"],
      workers: ["QuartzHostedService"],
      healthChecks: ["durable-jobs"],
      telemetry: ["durable-jobs"],
      deployment: ["durable-jobs-schema"],
    }),
    quality: qualityProfile(
      "provider.durable-jobs.quartz",
      ["persistent-scheduling", "recovery", "operator-controls"],
    ),
    matrix: {
      databaseProviders: ["postgresql", "sqlserver"],
      deploymentProfiles: ["direct", "container"],
    },
  }),
  providerDefinition({
    capability: "broker-transport",
    id: "rabbitmq",
    presets: ["modular-monolith", "full-stack"],
    prerequisites: [{ capability: "reliable-integration-events" }],
    requiredConfiguration: ["ConnectionStrings:RabbitMq"],
    effects: emptyEffects({
      packages: [packageEffect("RabbitMQ.Client", "7.2.1")],
      configuration: [
        "ConnectionStrings:RabbitMq",
        "RabbitMq:Exchange",
      ],
      registrations: ["IntegrationEvents:RabbitMqTransport"],
      workers: ["RabbitMqConsumer"],
      healthChecks: ["broker-transport"],
      telemetry: ["broker-transport"],
      containers: ["rabbitmq:4.3.2"],
      deployment: ["broker-transport"],
    }),
    quality: qualityProfile(
      "provider.broker-transport.rabbitmq",
      ["publisher-confirms", "manual-acknowledgement", "redelivery"],
    ),
    matrix: {
      deploymentProfiles: ["direct", "container"],
    },
  }),
  providerDefinition({
    capability: "object-storage",
    id: "azure-blob",
    presets: ["api", "modular-monolith", "full-stack"],
    requiredConfiguration: ["Azure:BlobServiceUri"],
    effects: emptyEffects({
      packages: [packageEffect("Azure.Storage.Blobs", "12.29.1")],
      configuration: [
        "Azure:BlobServiceUri",
        "ObjectStorage:Container",
      ],
      registrations: ["ObjectStorage:AzureBlob"],
      healthChecks: ["object-storage"],
      telemetry: ["object-storage"],
      containers: ["azurite:3.35"],
      deployment: ["object-storage"],
    }),
    quality: qualityProfile(
      "provider.object-storage.azure-blob",
      ["streaming", "conditional-concurrency", "live-parity"],
    ),
    matrix: {
      deploymentProfiles: ["direct", "container"],
    },
  }),
  providerDefinition({
    capability: "notification-delivery",
    id: "mailkit-smtp",
    presets: ["api", "modular-monolith", "full-stack"],
    requiredConfiguration: ["Mail:Smtp:Host"],
    effects: emptyEffects({
      packages: [packageEffect("MailKit", "4.17.0")],
      configuration: [
        "Mail:Smtp:Host",
        "Mail:Smtp:Port",
      ],
      registrations: ["NotificationDelivery:Smtp"],
      healthChecks: ["notification-delivery"],
      telemetry: ["notification-delivery"],
      containers: ["mailpit:1.24"],
      deployment: ["notification-delivery"],
    }),
    quality: qualityProfile(
      "provider.notification-delivery.mailkit-smtp",
      ["tls", "cancellation", "delivery-outcomes"],
    ),
    matrix: {
      deploymentProfiles: ["direct", "container"],
    },
  }),
  providerDefinition({
    capability: "secrets",
    id: "azure-key-vault",
    presets: ["api", "modular-monolith", "full-stack"],
    requiredConfiguration: ["Azure:KeyVault:Uri"],
    effects: emptyEffects({
      packages: [
        packageEffect("Azure.Extensions.AspNetCore.Configuration.Secrets", "1.5.1"),
        packageEffect("Azure.Identity", "1.21.0"),
      ],
      configuration: ["Azure:KeyVault:Uri"],
      registrations: ["IConfiguration:AzureKeyVault"],
      healthChecks: [],
      telemetry: ["secrets-provider"],
      deployment: ["managed-identity"],
    }),
    quality: qualityProfile(
      "provider.secrets.azure-key-vault",
      ["managed-identity", "rotation", "redaction"],
    ),
    matrix: {
      deploymentProfiles: ["direct", "container"],
    },
  }),
  providerDefinition({
    capability: "feature-management",
    id: "microsoft-feature-management",
    presets: ["api", "modular-monolith", "full-stack"],
    requiredConfiguration: ["FeatureManagement"],
    effects: emptyEffects({
      packages: [packageEffect("Microsoft.FeatureManagement", "4.6.0")],
      configuration: ["FeatureManagement"],
      registrations: ["IVariantFeatureManager"],
      healthChecks: [],
      telemetry: ["feature-management"],
      deployment: [],
    }),
    quality: qualityProfile(
      "provider.feature-management.microsoft-feature-management",
      ["flag-states", "authorization-separation", "safe-fallback"],
    ),
    matrix: {
      deploymentProfiles: ["direct", "container"],
    },
  }),
  providerDefinition({
    capability: "observability-export",
    id: "otlp",
    presets: ["api", "modular-monolith", "full-stack"],
    requiredConfiguration: ["OTEL_EXPORTER_OTLP_ENDPOINT"],
    effects: emptyEffects({
      packages: [
        packageEffect("OpenTelemetry.Exporter.OpenTelemetryProtocol", "1.17.0"),
      ],
      configuration: ["OTEL_EXPORTER_OTLP_ENDPOINT"],
      registrations: ["OpenTelemetry:OtlpExporter"],
      healthChecks: [],
      telemetry: ["otlp-export"],
      containers: ["otel-collector:0.140.0"],
      deployment: ["observability-export"],
    }),
    quality: qualityProfile(
      "provider.observability-export.otlp",
      ["redaction", "bounded-failure", "duplicate-export-prevention"],
    ),
    matrix: {
      deploymentProfiles: ["direct", "container"],
    },
  }),
];

export const PROVIDER_ADMISSION_CATALOG = deepFreeze([
  ...RELATIONAL_PROVIDER_DEFINITIONS,
  ...OPTIONAL_PROVIDER_DEFINITIONS,
]);

function providerKey(capability, id) {
  return `${capability}:${id}`;
}

function normalizePackageEffect(value, label) {
  const packageValue = requireRecord(value, label);
  const id = requireString(packageValue.id, `${label}.id`);
  const version = requireString(packageValue.version, `${label}.version`);
  if (!PACKAGE_VERSION_PATTERN.test(version)) {
    fail(`${label}.version is not a valid package version.`, "invalid-catalog");
  }

  return { id, version };
}

function normalizeEffects(value, label) {
  const effects = requireRecord(value, label);
  const normalized = {};
  for (const kind of PROVIDER_ADMISSION_EFFECT_KINDS) {
    if (!Object.hasOwn(effects, kind)) {
      fail(
        `${label}.${kind} must be declared, including when it is empty.`,
        "invalid-catalog",
      );
    }
    normalized[kind] =
      kind === "packages"
        ? effects[kind].map((item, index) =>
            normalizePackageEffect(item, `${label}.${kind}[${index}]`),
          )
        : requireUniqueStrings(effects[kind], `${label}.${kind}`);
  }

  return normalized;
}

function normalizeProviderReference(value, label) {
  if (typeof value === "string") {
    const separator = value.indexOf(":");
    if (separator <= 0 || separator === value.length - 1) {
      fail(
        `${label} must use the capability:provider form.`,
        "invalid-catalog",
      );
    }
    return {
      capability: requireIdentifier(value.slice(0, separator), `${label}.capability`),
      provider: requireIdentifier(value.slice(separator + 1), `${label}.provider`),
    };
  }

  const reference = requireRecord(value, label);
  return {
    capability: requireIdentifier(reference.capability, `${label}.capability`),
    provider:
      reference.provider === undefined || reference.provider === null
        ? null
        : requireIdentifier(reference.provider, `${label}.provider`),
  };
}

function normalizeQualityProfile(value, label) {
  const profile = requireRecord(value, label);
  const id = requireString(profile.id, `${label}.id`);
  const gates = requireUniqueStrings(profile.gates, `${label}.gates`);
  const evidence = requireUniqueStrings(profile.evidence, `${label}.evidence`);
  for (const dimension of PROVIDER_ADMISSION_EVIDENCE_DIMENSIONS) {
    if (!evidence.includes(dimension)) {
      fail(
        `${label}.evidence must include ${dimension}.`,
        "invalid-catalog",
      );
    }
  }

  return { id, gates, evidence };
}

function normalizeMatrix(value, label) {
  const matrix = requireRecord(value, label);
  const normalized = {};
  for (const [axis, property] of Object.entries(MATRIX_AXES)) {
    if (!Object.hasOwn(matrix, property)) {
      if (axis === "databaseProvider" || axis === "deploymentProfile") {
        continue;
      }
      fail(`${label}.${property} must be declared.`, "invalid-catalog");
    }
    normalized[property] = requireUniqueStrings(matrix[property], `${label}.${property}`);
  }

  return normalized;
}

function normalizeCatalog(catalog) {
  if (!Array.isArray(catalog) || catalog.length === 0) {
    fail("Provider admission catalog must contain at least one provider.", "invalid-catalog");
  }

  const definitions = catalog.map((entry, index) => {
    const label = `catalog[${index}]`;
    const definition = requireRecord(entry, label);
    const capability = requireIdentifier(definition.capability, `${label}.capability`);
    const id = requireIdentifier(definition.id, `${label}.id`);
    const presets = requireUniqueStrings(definition.presets, `${label}.presets`);
    if (definition.supportClaim === true) {
      fail(
        `${label} cannot create a Supported claim from catalog presence.`,
        "invalid-catalog",
      );
    }
    if (!PROVIDER_CLASSIFICATIONS.has(definition.classification)) {
      fail(
        `${label}.classification is not a recognized Capability state.`,
        "invalid-catalog",
      );
    }

    const prerequisites = (definition.prerequisites ?? []).map((value, prerequisiteIndex) =>
      normalizeProviderReference(
        value,
        `${label}.prerequisites[${prerequisiteIndex}]`,
      ),
    );
    const conflicts = (definition.conflicts ?? []).map((value, conflictIndex) =>
      normalizeProviderReference(
        value,
        `${label}.conflicts[${conflictIndex}]`,
      ),
    );
    const requiredConfiguration = requireUniqueStrings(
      definition.requiredConfiguration ?? [],
      `${label}.requiredConfiguration`,
    );
    const quality = normalizeQualityProfile(
      definition.qualityProfile,
      `${label}.qualityProfile`,
    );
    const matrix = normalizeMatrix(definition.matrix, `${label}.matrix`);
    const effects = normalizeEffects(definition.effects, `${label}.effects`);
    const key = providerKey(capability, id);

    return {
      capability,
      id,
      key,
      classification: definition.classification,
      presets,
      prerequisites,
      conflicts,
      requiredConfiguration,
      effects,
      qualityProfile: quality,
      matrix,
      runtimeSupport: requireString(
        definition.runtimeSupport ?? "undeclared",
        `${label}.runtimeSupport`,
      ),
      nativeAot: requireString(
        definition.nativeAot ?? "undeclared",
        `${label}.nativeAot`,
      ),
      supportClaim: false,
    };
  });

  const keys = definitions.map(({ key }) => key);
  if (new Set(keys).size !== keys.length) {
    fail("Provider admission catalog contains duplicate Capability/Provider inputs.", "invalid-catalog");
  }

  return definitions.sort((left, right) => left.key.localeCompare(right.key));
}

function catalogIndex(catalog) {
  const definitions = normalizeCatalog(catalog);
  return {
    definitions,
    byKey: new Map(definitions.map((definition) => [definition.key, definition])),
    byCapability: new Map(
      definitions.reduce((entries, definition) => {
        const providers = entries.get(definition.capability) ?? [];
        providers.push(definition);
        entries.set(definition.capability, providers);
        return entries;
      }, new Map()),
    ),
  };
}

function normalizeSelectionList(value, label) {
  if (!Array.isArray(value)) {
    fail(`${label} must be an array.`, "invalid-input");
  }

  return value.map((item, index) =>
    requireIdentifier(item, `${label}[${index}]`),
  );
}

function normalizeProviders(value) {
  if (!Array.isArray(value)) {
    fail("providers must be an array.", "invalid-input");
  }

  return value.map((item, index) => {
    const label = `providers[${index}]`;
    if (typeof item === "string") {
      const reference = normalizeProviderReference(item, label);
      return reference;
    }
    const reference = requireRecord(item, label);
    return {
      capability: requireIdentifier(reference.capability, `${label}.capability`),
      provider: requireIdentifier(
        reference.id ?? reference.provider,
        `${label}.id`,
      ),
    };
  });
}

function normalizeConfiguration(value) {
  if (value === undefined) {
    return [];
  }
  if (Array.isArray(value)) {
    return requireUniqueStrings(value, "configuration");
  }
  const configuration = requireRecord(value, "configuration");
  return Object.keys(configuration).sort();
}

function normalizeMatrixInput(selection) {
  const matrix = selection.matrix === undefined
    ? {}
    : requireRecord(selection.matrix, "matrix");
  for (const key of Object.keys(matrix)) {
    if (!Object.hasOwn(MATRIX_AXES, key)) {
      fail(`matrix.${key} is not a supported provider-admission axis.`, "invalid-input");
    }
  }
  const normalized = {
    preset: requireIdentifier(selection.preset, "preset"),
    runtime: requireString(selection.runtime, "runtime"),
    operatingSystem: requireIdentifier(
      selection.operatingSystem,
      "operatingSystem",
    ),
    ...matrix,
  };
  for (const key of ["databaseProvider", "deploymentProfile"]) {
    if (selection[key] !== undefined && normalized[key] === undefined) {
      normalized[key] = selection[key];
    }
  }

  for (const [key, value] of Object.entries(normalized)) {
    if (typeof value !== "string" || value.trim().length === 0) {
      fail(`matrix.${key} must be a non-empty string.`, "invalid-input");
    }
    normalized[key] = value.trim().toLowerCase();
  }

  return normalized;
}

function matrixCoordinate(matrix) {
  return Object.entries(matrix)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("|");
}

function compareReferences(left, right) {
  return providerKey(left.capability, left.provider ?? "").localeCompare(
    providerKey(right.capability, right.provider ?? ""),
  );
}

function sortReferences(references) {
  const seen = new Set();
  return [...references]
    .filter((reference) => {
      const key = providerKey(reference.capability, reference.provider ?? "");
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .sort(compareReferences);
}

function effectIdentity(kind, value) {
  if (kind === "packages") {
    return `${value.id}@${value.version}`;
  }
  return value;
}

function mergeEffects(definitions) {
  const effects = Object.fromEntries(
    PROVIDER_ADMISSION_EFFECT_KINDS.map((kind) => [kind, []]),
  );
  for (const definition of definitions) {
    for (const kind of PROVIDER_ADMISSION_EFFECT_KINDS) {
      for (const effect of definition.effects[kind]) {
        if (
          !effects[kind].some(
            (existing) => effectIdentity(kind, existing) === effectIdentity(kind, effect),
          )
        ) {
          effects[kind].push(
            kind === "packages" ? { ...effect } : effect,
          );
        }
      }
    }
  }
  for (const kind of PROVIDER_ADMISSION_EFFECT_KINDS) {
    effects[kind].sort((left, right) =>
      effectIdentity(kind, left).localeCompare(effectIdentity(kind, right)),
    );
  }
  return effects;
}

function effectList(value, kind, label) {
  if (!isRecord(value)) {
    fail(`${label} must be an object.`, "invalid-observation");
  }
  if (!Object.hasOwn(value, kind)) {
    fail(`${label}.${kind} must be observed, including when empty.`, "invalid-observation");
  }
  if (kind === "packages") {
    if (!Array.isArray(value[kind])) {
      fail(`${label}.${kind} must be an array.`, "invalid-observation");
    }
    return value[kind].map((item, index) =>
      normalizePackageEffect(item, `${label}.${kind}[${index}]`),
    );
  }
  return requireUniqueStrings(value[kind], `${label}.${kind}`);
}

function normalizeObservedEffects(value) {
  const observed = requireRecord(value, "observed effects");
  return Object.fromEntries(
    PROVIDER_ADMISSION_EFFECT_KINDS.map((kind) => [
      kind,
      effectList(observed, kind, "observed effects"),
    ]),
  );
}

function hasEffect(observed, kind, expected) {
  const identity = effectIdentity(kind, expected);
  return observed[kind].some((candidate) => effectIdentity(kind, candidate) === identity);
}

function validateMatrix(definition, matrix) {
  for (const [axis, property] of Object.entries(MATRIX_AXES)) {
    const value = matrix[axis];
    if (value === undefined || definition.matrix[property] === undefined) {
      continue;
    }
    if (!definition.matrix[property].includes(value)) {
      fail(
        `Provider ${definition.key} is not admitted for ${axis}=${value}.`,
        "unsupported-coordinate",
        { provider: definition.key, axis, value },
      );
    }
  }
}

function findProvider(index, reference, label) {
  const provider = reference.provider;
  if (provider === null) {
    const definitions = index.byCapability.get(reference.capability) ?? [];
    if (definitions.length === 0) {
      fail(
        `${label} requires unknown capability ${reference.capability}.`,
        "missing-prerequisite",
      );
    }
    return definitions;
  }

  const definition = index.byKey.get(
    providerKey(reference.capability, provider),
  );
  if (definition === undefined) {
    fail(
      `${label} references unknown provider ${providerKey(reference.capability, provider)}.`,
      "missing-prerequisite",
    );
  }
  return [definition];
}

function composeQualityProfile(definitions, matrix) {
  const providerGates = [
    ...new Set(definitions.flatMap((definition) => definition.qualityProfile.gates)),
  ].sort();
  const evidence = [
    ...new Set(
      definitions.flatMap((definition) => definition.qualityProfile.evidence),
    ),
  ].sort();
  for (const dimension of PROVIDER_ADMISSION_EVIDENCE_DIMENSIONS) {
    if (!evidence.includes(dimension)) {
      fail(
        `Composed quality profile is incomplete; missing ${dimension} evidence.`,
        "incomplete-profile",
      );
    }
  }

  const providerKeys = definitions.map(({ key }) => key).sort();
  return {
    id: `composed-provider-admission.${matrixCoordinate(matrix)}`,
    complete: true,
    commonGates: [...PROVIDER_ADMISSION_COMMON_GATES],
    providerGates,
    gates: [...new Set([...PROVIDER_ADMISSION_COMMON_GATES, ...providerGates])].sort(),
    evidence,
    providers: providerKeys,
    matrix: { ...matrix },
  };
}

function normalizeSelection(selection) {
  const value = requireRecord(selection, "provider admission selection");
  const preset = requireIdentifier(value.preset, "preset");
  const capabilities = normalizeSelectionList(
    value.capabilities,
    "capabilities",
  );
  const providers = normalizeProviders(value.providers);
  const matrix = normalizeMatrixInput(value);
  const configuration = normalizeConfiguration(value.configuration);

  if (new Set(capabilities).size !== capabilities.length) {
    fail("capabilities cannot contain duplicate selections.", "invalid-input");
  }
  const providerKeys = providers.map(({ capability, provider }) =>
    providerKey(capability, provider),
  );
  if (new Set(providerKeys).size !== providerKeys.length) {
    fail("providers cannot contain duplicate selections.", "invalid-input");
  }
  if (matrix.preset !== preset) {
    fail("matrix.preset must match preset.", "invalid-input");
  }

  return {
    preset,
    capabilities,
    providers,
    matrix,
    configuration,
  };
}

export function validateProviderAdmissionCatalog(
  catalog = PROVIDER_ADMISSION_CATALOG,
) {
  return normalizeCatalog(catalog).map((definition) => ({
    ...definition,
    prerequisites: definition.prerequisites.map((reference) => ({ ...reference })),
    conflicts: definition.conflicts.map((reference) => ({ ...reference })),
    requiredConfiguration: [...definition.requiredConfiguration],
    effects: {
      ...definition.effects,
      packages: definition.effects.packages.map((effect) => ({ ...effect })),
      configuration: [...definition.effects.configuration],
      registrations: [...definition.effects.registrations],
      workers: [...definition.effects.workers],
      healthChecks: [...definition.effects.healthChecks],
      telemetry: [...definition.effects.telemetry],
      containers: [...definition.effects.containers],
      deployment: [...definition.effects.deployment],
    },
    qualityProfile: {
      ...definition.qualityProfile,
      gates: [...definition.qualityProfile.gates],
      evidence: [...definition.qualityProfile.evidence],
    },
    matrix: Object.fromEntries(
      Object.entries(definition.matrix).map(([key, values]) => [key, [...values]]),
    ),
  }));
}

export function resolveProviderAdmission(
  selection,
  catalog = PROVIDER_ADMISSION_CATALOG,
) {
  const normalized = normalizeSelection(selection);
  const index = catalogIndex(catalog);
  const selectedDefinitions = [];

  for (const reference of normalized.providers) {
    if (!normalized.capabilities.includes(reference.capability)) {
      fail(
        `Provider ${providerKey(reference.capability, reference.provider)} requires selected capability ${reference.capability}.`,
        "missing-capability",
      );
    }

    const definition = index.byKey.get(
      providerKey(reference.capability, reference.provider),
    );
    if (definition === undefined) {
      fail(
        `Capability/Provider input ${providerKey(reference.capability, reference.provider)} is not declared by the admission catalog.`,
        "unknown-provider",
      );
    }
    if (definition.classification === "invalid" || definition.classification === "deferred") {
      fail(
        `Provider ${definition.key} is ${definition.classification} and cannot be generated.`,
        "invalid-provider",
      );
    }
    if (!definition.presets.includes(normalized.preset)) {
      fail(
        `Provider ${definition.key} is not admitted for preset ${normalized.preset}.`,
        "unsupported-preset",
      );
    }
    validateMatrix(definition, normalized.matrix);
    selectedDefinitions.push(definition);
  }

  const selectedByCapability = new Map(
    selectedDefinitions.map((definition) => [definition.capability, definition]),
  );
  if (selectedByCapability.size !== selectedDefinitions.length) {
    fail(
      "A selection may choose only one provider for each capability.",
      "conflicting-providers",
    );
  }

  for (const definition of selectedDefinitions) {
    for (const prerequisite of definition.prerequisites) {
      if (
        prerequisite.provider === null &&
        normalized.capabilities.includes(prerequisite.capability)
      ) {
        continue;
      }
      const matches = findProvider(
        index,
        prerequisite,
        `Provider ${definition.key} prerequisite`,
      );
      const selected = matches.find((candidate) =>
        selectedDefinitions.includes(candidate),
      );
      if (selected === undefined) {
        const expected = prerequisite.provider === null
          ? prerequisite.capability
          : providerKey(prerequisite.capability, prerequisite.provider);
        fail(
          `Provider ${definition.key} requires prerequisite ${expected}.`,
          "missing-prerequisite",
          { provider: definition.key, prerequisite: expected },
        );
      }
    }

    for (const conflict of definition.conflicts) {
      if (
        selectedDefinitions.some(
          (candidate) =>
            candidate.capability === conflict.capability &&
            (conflict.provider === null || candidate.id === conflict.provider),
        )
      ) {
        fail(
          `Provider ${definition.key} conflicts with ${providerKey(
            conflict.capability,
            conflict.provider ?? "*",
          )}.`,
          "conflicting-providers",
        );
      }
    }
  }

  const requiredConfiguration = [
    ...new Set(
      selectedDefinitions.flatMap(
        (definition) => definition.requiredConfiguration,
      ),
    ),
  ].sort();
  const missingConfiguration = requiredConfiguration.filter(
    (key) => !normalized.configuration.includes(key),
  );
  if (missingConfiguration.length > 0) {
    fail(
      `Selected providers require configuration keys: ${missingConfiguration.join(", ")}.`,
      "missing-configuration",
      { missingConfiguration },
    );
  }

  const sortedDefinitions = [...selectedDefinitions].sort((left, right) =>
    left.key.localeCompare(right.key),
  );
  const prerequisites = sortReferences(
    sortedDefinitions.flatMap((definition) =>
      definition.prerequisites.map((reference) => ({
        capability: reference.capability,
        provider:
          reference.provider ??
          selectedByCapability.get(reference.capability)?.id ??
          null,
      })),
    ),
  );
  const providers = sortedDefinitions.map((definition) => ({
    capability: definition.capability,
    id: definition.id,
    state: "selected",
  }));
  const capabilities = [...new Set(normalized.capabilities)].sort();
  const quality = composeQualityProfile(sortedDefinitions, normalized.matrix);
  const plan = {
    catalogVersion: PROVIDER_ADMISSION_CATALOG_VERSION,
    preset: normalized.preset,
    capabilities,
    providers,
    prerequisites,
    conflicts: [],
    configuration: {
      requiredKeys: requiredConfiguration,
      selectedKeys: [...normalized.configuration].sort(),
    },
    effects: mergeEffects(sortedDefinitions),
    matrix: {
      ...normalized.matrix,
      coordinate: matrixCoordinate(normalized.matrix),
    },
    qualityProfile: quality,
    supportClaims: [],
  };
  return deepFreeze(plan);
}

export const resolveProviderSelection = resolveProviderAdmission;

export function verifyProviderSelection({
  plan,
  observed,
}) {
  requireRecord(plan, "provider admission plan");
  const normalizedObserved = normalizeObservedEffects(observed);
  if (!Array.isArray(plan.supportClaims) || plan.supportClaims.length !== 0) {
    fail(
      "Provider selection cannot create a Supported claim before admission evidence passes.",
      "support-claim",
    );
  }
  for (const kind of PROVIDER_ADMISSION_EFFECT_KINDS) {
    for (const effect of plan.effects[kind] ?? []) {
      if (!hasEffect(normalizedObserved, kind, effect)) {
        fail(
          `Selected provider effect is missing from generated output: ${kind} ${effectIdentity(
            kind,
            effect,
          )}.`,
          "missing-effect",
          { kind, effect },
        );
      }
    }
  }

  return {
    outcome: "passed",
    providers: plan.providers.map((provider) => ({ ...provider })),
    effects: plan.effects,
  };
}

function selectedProviderKeys(plan) {
  return new Set(
    plan.providers.map((provider) => providerKey(provider.capability, provider.id)),
  );
}

export function verifyProviderAbsence({
  plan,
  catalog = PROVIDER_ADMISSION_CATALOG,
  observed,
}) {
  requireRecord(plan, "provider admission plan");
  const normalizedObserved = normalizeObservedEffects(observed);
  const index = catalogIndex(catalog);
  const selected = selectedProviderKeys(plan);
  const selectedEffectIdentities = Object.fromEntries(
    PROVIDER_ADMISSION_EFFECT_KINDS.map((kind) => [
      kind,
      new Set(plan.effects[kind].map((effect) => effectIdentity(kind, effect))),
    ]),
  );
  const absentProviders = [];
  for (const definition of index.definitions) {
    if (selected.has(definition.key)) {
      continue;
    }
    absentProviders.push(definition.key);
    for (const kind of PROVIDER_ADMISSION_EFFECT_KINDS) {
      for (const effect of definition.effects[kind]) {
        if (
          hasEffect(normalizedObserved, kind, effect) &&
          !selectedEffectIdentities[kind].has(effectIdentity(kind, effect))
        ) {
          fail(
            `Unselected provider residue detected: ${definition.key} contributes ${kind} ${effectIdentity(
              kind,
              effect,
            )}.`,
            "unselected-residue",
            { provider: definition.key, kind, effect },
          );
        }
      }
    }
  }

  return {
    outcome: "passed",
    providers: absentProviders.sort(),
    effects: Object.fromEntries(
      PROVIDER_ADMISSION_EFFECT_KINDS.map((kind) => [kind, []]),
    ),
  };
}

function providerEvidenceRecord(plan) {
  if (plan.providers.length === 1) {
    const provider = plan.providers[0];
    return {
      capability: provider.capability,
      id: provider.id,
    };
  }
  return null;
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

export function sha256(value) {
  return `sha256:${createHash("sha256")
    .update(typeof value === "string" ? value : canonicalJson(value))
    .digest("hex")}`;
}

export function createProviderAdmissionEvidence({
  plan,
  selection,
  selectionVerification,
  absenceVerification,
  outcome = "passed",
  failure = undefined,
}) {
  requireRecord(plan, "provider admission plan");
  if (!PROVIDER_ADMISSION_OUTCOMES.includes(outcome)) {
    fail(`Unknown provider admission outcome: ${outcome}.`, "invalid-evidence");
  }
  if (outcome === "passed" && (selectionVerification?.outcome !== "passed" ||
    absenceVerification?.outcome !== "passed")) {
    fail(
      "Passed provider admission evidence requires passed selection and absence outcomes.",
      "incomplete-evidence",
    );
  }
  if (outcome !== "passed" && (!isRecord(failure) ||
    typeof failure.code !== "string" ||
    typeof failure.message !== "string")) {
    fail(
      "Non-passed provider admission evidence requires a fail-closed failure record.",
      "incomplete-evidence",
    );
  }

  const evidence = {
    schemaVersion: PROVIDER_ADMISSION_EVIDENCE_SCHEMA_VERSION,
    catalogVersion: plan.catalogVersion,
    outcome,
    failClosed: true,
    provider: providerEvidenceRecord(plan),
    providers: plan.providers.map((provider) => ({ ...provider })),
    runtime: plan.matrix.runtime,
    operatingSystem: plan.matrix.operatingSystem,
    matrix: {
      ...plan.matrix,
      coordinate: plan.matrix.coordinate,
    },
    prerequisites: plan.prerequisites.map((prerequisite) => ({ ...prerequisite })),
    conflicts: plan.conflicts.map((conflict) => ({ ...conflict })),
    configuration: {
      requiredKeys: [...plan.configuration.requiredKeys],
      selectedKeys: [...plan.configuration.selectedKeys],
    },
    effects: plan.effects,
    qualityProfile: plan.qualityProfile,
    selection: selection === undefined ? null : {
      preset: selection.preset,
      capabilities: [...selection.capabilities],
      providers: selection.providers.map((provider) => ({ ...provider })),
    },
    verification: {
      selection: selectionVerification?.outcome ?? null,
      absence: absenceVerification?.outcome ?? null,
      evidenceDigest: null,
    },
    supportClaims: [],
  };
  if (failure !== undefined) {
    evidence.failure = {
      code: failure.code,
      message: failure.message,
    };
  }
  evidence.verification.evidenceDigest = sha256({
    ...evidence,
    verification: {
      ...evidence.verification,
      evidenceDigest: null,
    },
  });
  return deepFreeze(evidence);
}

export function verifyProviderAdmissionEvidence(evidence) {
  const value = requireRecord(evidence, "provider admission evidence");
  for (const property of [
    "schemaVersion",
    "catalogVersion",
    "outcome",
    "runtime",
    "operatingSystem",
  ]) {
    requireString(value[property], `provider admission evidence.${property}`);
  }
  if (value.schemaVersion !== PROVIDER_ADMISSION_EVIDENCE_SCHEMA_VERSION) {
    fail(
      `Unsupported provider admission evidence schema: ${value.schemaVersion}.`,
      "invalid-evidence",
    );
  }
  if (!PROVIDER_ADMISSION_OUTCOMES.includes(value.outcome)) {
    fail(
      `Provider admission evidence has an invalid terminal outcome: ${value.outcome}.`,
      "invalid-evidence",
    );
  }
  if (value.failClosed !== true) {
    fail("Provider admission evidence must be fail-closed.", "invalid-evidence");
  }
  if (!Array.isArray(value.supportClaims) || value.supportClaims.length !== 0) {
    fail(
      "Provider admission evidence must not make a Supported claim.",
      "support-claim",
    );
  }
  if (value.provider !== null) {
    requireRecord(value.provider, "provider admission evidence.provider");
    requireIdentifier(
      value.provider.capability,
      "provider admission evidence.provider.capability",
    );
    requireIdentifier(value.provider.id, "provider admission evidence.provider.id");
  }
  if (!Array.isArray(value.providers) || value.providers.length === 0) {
    fail(
      "Provider admission evidence must identify at least one selected provider.",
      "incomplete-evidence",
    );
  }
  for (const [index, provider] of value.providers.entries()) {
    requireRecord(provider, `provider admission evidence.providers[${index}]`);
    requireIdentifier(
      provider.capability,
      `provider admission evidence.providers[${index}].capability`,
    );
    requireIdentifier(
      provider.id,
      `provider admission evidence.providers[${index}].id`,
    );
    if (provider.state !== "selected") {
      fail(
        `Provider admission evidence.providers[${index}] must be selected.`,
        "invalid-evidence",
      );
    }
  }
  requireRecord(value.matrix, "provider admission evidence.matrix");
  requireString(
    value.matrix.coordinate,
    "provider admission evidence.matrix.coordinate",
  );
  if (value.matrix.runtime !== value.runtime) {
    fail("Provider admission runtime does not match its matrix coordinate.", "invalid-evidence");
  }
  if (value.matrix.operatingSystem !== value.operatingSystem) {
    fail(
      "Provider admission operating system does not match its matrix coordinate.",
      "invalid-evidence",
    );
  }
  if (!Array.isArray(value.prerequisites) || !Array.isArray(value.conflicts)) {
    fail(
      "Provider admission evidence must record prerequisites and conflicts.",
      "incomplete-evidence",
    );
  }
  requireRecord(value.configuration, "provider admission evidence.configuration");
  requireUniqueStrings(
    value.configuration.requiredKeys,
    "provider admission evidence.configuration.requiredKeys",
  );
  requireUniqueStrings(
    value.configuration.selectedKeys,
    "provider admission evidence.configuration.selectedKeys",
  );
  normalizeObservedEffects(value.effects);
  if (value.selection !== null) {
    requireRecord(value.selection, "provider admission evidence.selection");
  }
  requireRecord(value.qualityProfile, "provider admission evidence.qualityProfile");
  requireString(
    value.qualityProfile.id,
    "provider admission evidence.qualityProfile.id",
  );
  if (value.qualityProfile.complete !== true) {
    fail(
      "Provider admission evidence requires a complete Composed Quality Profile.",
      "incomplete-profile",
    );
  }
  requireUniqueStrings(
    value.qualityProfile.gates,
    "provider admission evidence.qualityProfile.gates",
  );
  requireUniqueStrings(
    value.qualityProfile.commonGates,
    "provider admission evidence.qualityProfile.commonGates",
  );
  requireUniqueStrings(
    value.qualityProfile.providerGates,
    "provider admission evidence.qualityProfile.providerGates",
  );
  requireUniqueStrings(
    value.qualityProfile.providers,
    "provider admission evidence.qualityProfile.providers",
  );
  requireRecord(
    value.qualityProfile.matrix,
    "provider admission evidence.qualityProfile.matrix",
  );
  requireUniqueStrings(
    value.qualityProfile.evidence,
    "provider admission evidence.qualityProfile.evidence",
  );
  for (const dimension of PROVIDER_ADMISSION_EVIDENCE_DIMENSIONS) {
    if (!value.qualityProfile.evidence.includes(dimension)) {
      fail(
        `Provider admission evidence is missing ${dimension} evidence.`,
        "incomplete-profile",
      );
    }
  }
  if (value.outcome === "passed") {
    if (!isRecord(value.verification) ||
      value.verification.selection !== "passed" ||
      value.verification.absence !== "passed") {
      fail(
        "Passed provider admission evidence must include passed selection and absence outcomes.",
        "incomplete-evidence",
      );
    }
    if (Object.hasOwn(value, "failure")) {
      fail("Passed provider admission evidence cannot contain a failure record.", "invalid-evidence");
    }
  } else {
    const failure = requireRecord(
      value.failure,
      "provider admission evidence.failure",
    );
    requireString(failure.code, "provider admission evidence.failure.code");
    requireString(failure.message, "provider admission evidence.failure.message");
  }

  requireRecord(value.verification, "provider admission evidence.verification");
  const digest = value.verification?.evidenceDigest;
  if (typeof digest !== "string" || digest !== sha256({
    ...value,
    verification: {
      ...value.verification,
      evidenceDigest: null,
    },
  })) {
    fail(
      "Provider admission evidence digest does not match its immutable content.",
      "invalid-evidence",
    );
  }

  return {
    status: "passed",
    outcome: value.outcome,
    provider: value.provider,
    runtime: value.runtime,
    operatingSystem: value.operatingSystem,
    matrixCoordinate: value.matrix.coordinate,
  };
}

export async function admitProviderSelection({
  selection,
  catalog = PROVIDER_ADMISSION_CATALOG,
  generate,
}) {
  const plan = resolveProviderAdmission(selection, catalog);
  if (typeof generate !== "function") {
    fail("Provider admission requires a generation callback.", "invalid-input");
  }
  const generated = await generate(plan);
  return {
    plan,
    generated,
    supportClaims: [],
  };
}

export async function verifyProviderAdmission({
  selection,
  catalog = PROVIDER_ADMISSION_CATALOG,
  observed,
  generate = undefined,
}) {
  const plan = resolveProviderAdmission(selection, catalog);
  const generated = generate === undefined ? undefined : await generate(plan);
  const verification = verifyProviderAdmissionObservations({
    plan,
    selection,
    catalog,
    observed,
  });
  return {
    status: "passed",
    plan,
    generated,
    ...verification,
  };
}

function verifyProviderAdmissionObservations({
  plan,
  selection,
  catalog,
  observed,
}) {
  const selectionVerification = verifyProviderSelection({ plan, observed });
  const absenceVerification = verifyProviderAbsence({
    plan,
    catalog,
    observed,
  });
  const evidence = createProviderAdmissionEvidence({
    plan,
    selection: normalizeSelection(selection),
    selectionVerification,
    absenceVerification,
  });
  verifyProviderAdmissionEvidence(evidence);
  return {
    selection: selectionVerification,
    absence: absenceVerification,
    evidence,
  };
}

export function evaluateProviderAdmission({
  selection,
  catalog = PROVIDER_ADMISSION_CATALOG,
  observed = undefined,
}) {
  try {
    if (observed === undefined) {
      const plan = resolveProviderAdmission(selection, catalog);
      const evidence = createProviderAdmissionEvidence({
        plan,
        selection: normalizeSelection(selection),
        outcome: "failed",
        failure: {
          code: "missing-observation",
          message: "Generated output effects were not supplied for verification.",
        },
      });
      verifyProviderAdmissionEvidence(evidence);
      return { status: "failed", plan, evidence };
    }
    const plan = resolveProviderAdmission(selection, catalog);
    return {
      status: "passed",
      plan,
      ...verifyProviderAdmissionObservations({
        plan,
        selection,
        catalog,
        observed,
      }),
    };
  } catch (error) {
    if (!(error instanceof ProviderAdmissionError)) {
      throw error;
    }
    return {
      status: "failed",
      error: {
        code: error.code,
        message: error.message,
      },
    };
  }
}

validateProviderAdmissionCatalog(PROVIDER_ADMISSION_CATALOG);
