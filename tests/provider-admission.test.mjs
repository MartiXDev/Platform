import assert from "node:assert/strict";
import test from "node:test";
import {
  PROVIDER_ADMISSION_EFFECT_KINDS,
  admitProviderSelection,
  evaluateProviderAdmission,
  verifyProviderAdmission,
  verifyProviderAdmissionEvidence,
  verifyProviderAbsence,
  validateProviderAdmissionCatalog,
  resolveProviderAdmission,
} from "../eng/provider-admission.mjs";

function mergeObservedEffects(...effectSets) {
  return Object.fromEntries(
    PROVIDER_ADMISSION_EFFECT_KINDS.map((kind) => {
      const values = effectSets.flatMap((effects) => effects[kind]);
      const identities = new Set();
      const unique = values.filter((value) => {
        const identity =
          kind === "packages" ? `${value.id}@${value.version}` : value;
        if (identities.has(identity)) {
          return false;
        }
        identities.add(identity);
        return true;
      });
      return [kind, unique];
    }),
  );
}

function quartzSelection(overrides = {}) {
  return {
    preset: "modular-monolith",
    capabilities: ["relational-persistence", "durable-jobs"],
    providers: [
      { capability: "relational-persistence", id: "postgresql" },
      { capability: "durable-jobs", id: "quartz" },
    ],
    runtime: "net10.0",
    operatingSystem: "linux",
    configuration: [
      "ConnectionStrings:Database",
      "ConnectionStrings:Quartz",
    ],
    ...overrides,
  };
}

test("selected providers resolve prerequisites and a complete composed quality profile", () => {
  const plan = resolveProviderAdmission(quartzSelection());

  assert.deepEqual(plan.providers, [
    {
      capability: "durable-jobs",
      id: "quartz",
      state: "selected",
    },
    {
      capability: "relational-persistence",
      id: "postgresql",
      state: "selected",
    },
  ]);
  assert.deepEqual(plan.prerequisites, [
    {
      capability: "relational-persistence",
      provider: "postgresql",
    },
  ]);
  assert.equal(plan.qualityProfile.complete, true);
  assert.equal(plan.qualityProfile.matrix.runtime, "net10.0");
  assert.equal(plan.qualityProfile.matrix.operatingSystem, "linux");
  assert.equal(plan.supportClaims.length, 0);
});

test("Azure Blob selection resolves explicit endpoint and container effects", async () => {
  const selection = {
    preset: "modular-monolith",
    capabilities: ["object-storage"],
    providers: [{ capability: "object-storage", id: "azure-blob" }],
    runtime: "net10.0",
    operatingSystem: "linux",
    configuration: ["Azure:BlobServiceUri", "ObjectStorage:Container"],
  };
  const catalog = validateProviderAdmissionCatalog();
  const azureBlob = catalog.find(
    ({ capability, id }) =>
      capability === "object-storage" && id === "azure-blob",
  );
  const plan = resolveProviderAdmission(selection, catalog);

  assert.deepEqual(plan.configuration.requiredKeys, [
    "Azure:BlobServiceUri",
    "ObjectStorage:Container",
  ]);
  assert.deepEqual(plan.effects.packages, [
    { id: "Azure.Storage.Blobs", version: "12.29.1" },
  ]);
  assert.deepEqual(plan.effects.containers, ["azurite:3.35.0"]);
  assert.ok(plan.qualityProfile.providerGates.includes("streaming"));
  assert.ok(plan.qualityProfile.providerGates.includes("live-parity"));
  assert.equal(
    (await verifyProviderAdmission({
      selection,
      catalog,
      observed: mergeObservedEffects(azureBlob.effects),
    })).status,
    "passed",
  );
});

test("every catalog entry declares complete effects and claim-free admission metadata", () => {
  const catalog = validateProviderAdmissionCatalog();

  assert.equal(catalog.length, 10);
  for (const definition of catalog) {
    assert.equal(definition.supportClaim, false);
    assert.ok(
      ["required", "required-default", "required-explicit", "optional-supported", "experimental"]
        .includes(definition.classification),
    );
    assert.deepEqual(
      Object.keys(definition.effects).sort(),
      [...PROVIDER_ADMISSION_EFFECT_KINDS].sort(),
    );
    assert.equal(definition.qualityProfile.evidence.length >= 8, true);
    assert.deepEqual(
      definition.matrix.presets,
      definition.presets,
    );
    assert.equal(definition.matrix.runtimes.includes("net10.0"), true);
    assert.equal(definition.matrix.operatingSystems.includes("linux"), true);
    assert.equal(definition.matrix.operatingSystems.includes("windows"), true);
  }
});

test("selection and absence verify all provider effect categories", async () => {
  const catalog = validateProviderAdmissionCatalog();
  const postgresql = catalog.find(
    ({ capability, id }) =>
      capability === "relational-persistence" && id === "postgresql",
  );
  const quartz = catalog.find(
    ({ capability, id }) => capability === "durable-jobs" && id === "quartz",
  );
  const result = await verifyProviderAdmission({
    selection: quartzSelection(),
    observed: mergeObservedEffects(postgresql.effects, quartz.effects),
  });

  assert.equal(result.status, "passed");
  assert.equal(result.selection.outcome, "passed");
  assert.equal(result.absence.outcome, "passed");
  assert.equal(result.evidence.provider, null);
  assert.equal(result.evidence.runtime, "net10.0");
  assert.equal(result.evidence.operatingSystem, "linux");
  assert.match(
    result.evidence.matrix.coordinate,
    /operatingSystem=linux.*preset=modular-monolith.*runtime=net10\.0/,
  );
  assert.equal(verifyProviderAdmissionEvidence(result.evidence).status, "passed");
});

test("providers can require a selected baseline capability without a provider entry", () => {
  const plan = resolveProviderAdmission({
    preset: "modular-monolith",
    capabilities: ["reliable-integration-events", "broker-transport"],
    providers: [{ capability: "broker-transport", id: "rabbitmq" }],
    runtime: "net10.0",
    operatingSystem: "linux",
    configuration: ["ConnectionStrings:RabbitMq"],
  });

  assert.deepEqual(plan.prerequisites, [
    {
      capability: "reliable-integration-events",
      provider: null,
    },
  ]);
  assert.ok(
    plan.effects.packages.some(
      ({ id, version }) => id === "RabbitMQ.Client" && version === "7.2.1",
    ),
  );
});

test("absence fails closed when an unselected provider leaves any residue", () => {
  const plan = resolveProviderAdmission(quartzSelection());
  const catalog = validateProviderAdmissionCatalog();
  const valkey = catalog.find(
    ({ capability, id }) =>
      capability === "distributed-cache" && id === "valkey",
  );
  const observed = mergeObservedEffects(
    plan.effects,
    valkey.effects,
  );

  assert.throws(
    () => verifyProviderAbsence({ plan, catalog, observed }),
    /Unselected provider residue detected.*distributed-cache:valkey.*packages/i,
  );
});

test("absence fails closed for effects outside the provider catalog", () => {
  const plan = resolveProviderAdmission(quartzSelection());
  const observed = mergeObservedEffects(plan.effects);
  observed.configuration.push("Uncatalogued:Provider");

  assert.throws(
    () =>
      verifyProviderAbsence({
        plan,
        observed,
      }),
    /Unselected provider residue detected.*unknown provider.*configuration/i,
  );
});

test("absence checks every declared effect category", () => {
  const plan = resolveProviderAdmission(quartzSelection());
  const catalog = validateProviderAdmissionCatalog();
  const selectedKeys = new Set(
    plan.providers.map(({ capability, id }) => `${capability}:${id}`),
  );

  for (const kind of PROVIDER_ADMISSION_EFFECT_KINDS) {
    const source = catalog.find(
      (definition) =>
        !selectedKeys.has(`${definition.capability}:${definition.id}`) &&
        definition.effects[kind].length > 0,
    );
    assert.ok(source, `expected an unselected ${kind} effect source`);
    const observed = mergeObservedEffects(plan.effects);
    observed[kind].push(source.effects[kind][0]);

    assert.throws(
      () => verifyProviderAbsence({ plan, catalog, observed }),
      new RegExp(`Unselected provider residue detected.*${kind}`, "i"),
    );
  }
});

test("invalid combinations fail before generation", async () => {
  let generated = false;

  await assert.rejects(
    () =>
      admitProviderSelection({
        selection: quartzSelection({
          capabilities: ["durable-jobs"],
          providers: [{ capability: "durable-jobs", id: "quartz" }],
          configuration: ["ConnectionStrings:Quartz"],
        }),
        generate: async () => {
          generated = true;
        },
      }),
    /requires prerequisite relational-persistence/i,
  );
  assert.equal(generated, false);

  assert.throws(
    () =>
      resolveProviderAdmission(
        quartzSelection({ configuration: ["ConnectionStrings:Database"] }),
      ),
    /require configuration keys.*ConnectionStrings:Quartz/i,
  );

  assert.throws(
    () => resolveProviderAdmission(quartzSelection({ runtime: "net9.0" })),
    /not admitted for runtime=net9.0/i,
  );
});

test("declared conflicts are rejected before generation", async () => {
  const emptyEffects = Object.fromEntries(
    PROVIDER_ADMISSION_EFFECT_KINDS.map((kind) => [kind, []]),
  );
  const qualityProfile = {
    id: "provider.conflict",
    gates: [],
    evidence: [
      "selection",
      "prerequisites",
      "conflicts",
      "configuration",
      "effects",
      "absence",
      "runtime",
      "operating-system",
    ],
  };
  const matrix = {
    presets: ["api"],
    runtimes: ["net10.0"],
    operatingSystems: ["linux"],
  };
  const catalog = [
    {
      capability: "cache-a",
      id: "one",
      classification: "experimental",
      presets: ["api"],
      prerequisites: [],
      conflicts: [{ capability: "cache-b", provider: "two" }],
      requiredConfiguration: [],
      effects: emptyEffects,
      qualityProfile,
      matrix,
      supportClaim: false,
    },
    {
      capability: "cache-b",
      id: "two",
      classification: "experimental",
      presets: ["api"],
      prerequisites: [],
      conflicts: [],
      requiredConfiguration: [],
      effects: emptyEffects,
      qualityProfile,
      matrix,
      supportClaim: false,
    },
  ];
  let generated = false;

  await assert.rejects(
    () =>
      admitProviderSelection({
        catalog,
        selection: {
          preset: "api",
          capabilities: ["cache-a", "cache-b"],
          providers: [
            { capability: "cache-a", id: "one" },
            { capability: "cache-b", id: "two" },
          ],
          runtime: "net10.0",
          operatingSystem: "linux",
        },
        generate: async () => {
          generated = true;
        },
      }),
    /conflicts with cache-b:two/i,
  );
  assert.equal(generated, false);
});

test("evidence rejects Supported claims and non-terminal outcomes", async () => {
  const catalog = validateProviderAdmissionCatalog();
  const postgresql = catalog.find(
    ({ capability, id }) =>
      capability === "relational-persistence" && id === "postgresql",
  );
  const quartz = catalog.find(
    ({ capability, id }) => capability === "durable-jobs" && id === "quartz",
  );
  // Use the production helper to create a correctly digested artifact, then
  // alter only the consumer-facing fields under test.
  const verified = await verifyProviderAdmission({
    selection: quartzSelection(),
    observed: mergeObservedEffects(postgresql.effects, quartz.effects),
  });
  const supportedClaim = JSON.parse(JSON.stringify(verified.evidence));
  supportedClaim.supportClaims = ["durable-jobs:quartz"];
  assert.throws(
    () => verifyProviderAdmissionEvidence(supportedClaim),
    /must not make a Supported claim/i,
  );

  const nonTerminal = JSON.parse(JSON.stringify(verified.evidence));
  nonTerminal.outcome = "skipped";
  assert.throws(
    () => verifyProviderAdmissionEvidence(nonTerminal),
    /invalid terminal outcome/i,
  );
});

test("missing observations produce verifiable fail-closed evidence", () => {
  const result = evaluateProviderAdmission({
    selection: quartzSelection(),
  });

  assert.equal(result.status, "failed");
  assert.equal(result.evidence.outcome, "failed");
  assert.equal(result.evidence.failClosed, true);
  assert.equal(
    verifyProviderAdmissionEvidence(result.evidence).outcome,
    "failed",
  );
});
