import assert from "node:assert/strict";
import {
  mkdtemp,
  readFile,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  API_PLATFORM_VERSION,
  createApiPresetPlan,
  generateApiPreset,
} from "../eng/api-preset.mjs";
import {
  createModularMonolithPresetPlan,
  generateModularMonolithPreset,
} from "../eng/modular-monolith-preset.mjs";
import { validateOtlpExportFixture } from "../eng/verify.mjs";

async function createTemporaryDirectory(prefix) {
  return mkdtemp(join(tmpdir(), prefix));
}

test("API OTLP selection is explicit and composes all signals", async () => {
  const root = await createTemporaryDirectory("martix-api-otlp-");

  try {
    const plan = createApiPresetPlan({
      applicationName: "Contoso.Inventory",
      providers: ["otlp"],
    });

    assert.ok(plan.capabilities.includes("observability-export"));
    assert.deepEqual(plan.providers, [{
      id: "otlp",
      capability: "observability-export",
      state: "selected",
    }]);
    assert.ok(plan.packageReferences.some(
      ({ id, version }) =>
        id === "OpenTelemetry.Exporter.OpenTelemetryProtocol"
        && version === "1.17.0",
    ));

    const result = await generateApiPreset({
      applicationName: "Contoso.Inventory",
      providers: ["otlp"],
      outputDirectory: join(root, "generated"),
    });
    const host = await readFile(
      join(
        root,
        "generated",
        "src",
        "Contoso.Inventory.Api",
        "Infrastructure",
        "Host",
        "HostSecurity.cs",
      ),
      "utf8",
    );
    const project = await readFile(
      join(
        root,
        "generated",
        "src",
        "Contoso.Inventory.Api",
        "Contoso.Inventory.Api.csproj",
      ),
      "utf8",
    );

    assert.equal(result.plan.providers[0].id, "otlp");
    assert.match(project, /OpenTelemetry\.Exporter\.OpenTelemetryProtocol/);
    assert.match(host, /OTEL_EXPORTER_OTLP_ENDPOINT/);
    assert.match(host, /AddOtlpExporter/);
    assert.match(host, /WithLogging/);
    assert.match(host, /MaxQueueSize = 2048/);
    assert.match(host, /MaxExportBatchSize = 512/);
    assert.match(host, /ScheduledDelayMilliseconds = 5000/);
    assert.match(host, /ExporterTimeoutMilliseconds = 30000/);
    assert.match(host, /ExportProcessorType\.Batch/);
    assert.match(host, /IncludeFormattedMessage = false/);
    assert.match(host, /IncludeScopes = false/);
    assert.match(host, /error\.type/);
    assert.match(host, /url\.query/);
    assert.doesNotMatch(host, /AddCheck.*otlp|otlp.*AddCheck/i);
    assert.match(host, /SetFallbackRedactor/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("modular monolith OTLP selection composes beside persistence", async () => {
  const root = await createTemporaryDirectory("martix-modular-otlp-");

  try {
    const plan = createModularMonolithPresetPlan({
      applicationName: "Contoso.Platform",
      businessModules: ["Orders"],
      providers: ["postgresql", "otlp"],
    });

    assert.equal(plan.relationalProvider, "postgresql");
    assert.ok(plan.capabilities.includes("observability-export"));
    assert.deepEqual(plan.providers, [
      {
        id: "postgresql",
        capability: "relational-persistence",
        state: "selected",
      },
      {
        id: "otlp",
        capability: "observability-export",
        state: "selected",
      },
    ]);
    assert.ok(plan.packageReferences.some(
      ({ id, version }) =>
        id === "OpenTelemetry.Exporter.OpenTelemetryProtocol"
        && version === "1.17.0",
    ));

    await generateModularMonolithPreset({
      applicationName: "Contoso.Platform",
      businessModules: ["Orders"],
      providers: ["postgresql", "otlp"],
      outputDirectory: join(root, "generated"),
    });
    const host = await readFile(
      join(
        root,
        "generated",
        "src",
        "Contoso.Platform.Api",
        "Infrastructure",
        "Host",
        "HostSecurity.cs",
      ),
      "utf8",
    );
    const project = await readFile(
      join(
        root,
        "generated",
        "src",
        "Contoso.Platform.Api",
        "Contoso.Platform.Api.csproj",
      ),
      "utf8",
    );

    assert.match(project, /OpenTelemetry\.Exporter\.OpenTelemetryProtocol/);
    assert.match(host, /WithLogging/);
    assert.match(host, /AddOtlpExporter/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("full-stack OTLP selection composes beside UI and persistence", async () => {
  const root = await createTemporaryDirectory("martix-full-stack-otlp-");

  try {
    const plan = createModularMonolithPresetPlan({
      preset: "full-stack",
      applicationName: "Contoso.FullStack",
      businessModules: ["Orders"],
      providers: ["postgresql", "react", "otlp"],
    });

    assert.equal(plan.ui.provider, "react");
    assert.ok(plan.capabilities.includes("observability-export"));
    assert.deepEqual(
      plan.providers.filter(({ id }) => id === "otlp"),
      [{
        id: "otlp",
        capability: "observability-export",
        state: "selected",
      }],
    );

    await generateModularMonolithPreset({
      preset: "full-stack",
      applicationName: "Contoso.FullStack",
      businessModules: ["Orders"],
      providers: ["postgresql", "react", "otlp"],
      outputDirectory: join(root, "generated"),
    });
    const host = await readFile(
      join(
        root,
        "generated",
        "src",
        "Contoso.FullStack.Api",
        "Infrastructure",
        "Host",
        "HostSecurity.cs",
      ),
      "utf8",
    );
    const project = await readFile(
      join(
        root,
        "generated",
        "src",
        "Contoso.FullStack.Api",
        "Contoso.FullStack.Api.csproj",
      ),
      "utf8",
    );

    assert.match(project, /OpenTelemetry\.Exporter\.OpenTelemetryProtocol/);
    assert.match(host, /AddOtlpExporter/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("unselected OTLP leaves baseline API composition unchanged", async () => {
  const root = await createTemporaryDirectory("martix-api-no-otlp-");

  try {
    const plan = createApiPresetPlan({
      applicationName: "Contoso.Inventory",
    });
    assert.equal(plan.platformVersion, API_PLATFORM_VERSION);
    assert.doesNotMatch(
      JSON.stringify(plan.packageReferences),
      /OpenTelemetry\.Exporter\.OpenTelemetryProtocol/,
    );

    await generateApiPreset({
      applicationName: "Contoso.Inventory",
      outputDirectory: join(root, "generated"),
    });
    const host = await readFile(
      join(
        root,
        "generated",
        "src",
        "Contoso.Inventory.Api",
        "Infrastructure",
        "Host",
        "HostSecurity.cs",
      ),
      "utf8",
    );
    assert.doesNotMatch(host, /AddOtlpExporter|OTEL_EXPORTER_OTLP_ENDPOINT|WithLogging/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the named OTLP fixture proves export isolation and absence", async () => {
  const fixtureRoot = join(
    import.meta.dirname,
    "fixtures",
    "OtlpExportGeneratedSolution",
  );
  const fixture = JSON.parse(
    await readFile(join(fixtureRoot, "otlp-export.json"), "utf8"),
  );
  const manifest = JSON.parse(
    await readFile(join(fixtureRoot, "martix.platform.json"), "utf8"),
  );

  const result = await validateOtlpExportFixture(fixture, manifest);

  assert.equal(result.status, "passed");
  assert.equal(result.signalCount, 3);
  assert.equal(result.absentResidueCount, 0);
});
