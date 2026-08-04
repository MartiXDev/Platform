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
  MODULAR_MONOLITH_BASELINE_CAPABILITIES,
  MODULAR_MONOLITH_PLATFORM_VERSION,
  createModularMonolithPresetPlan,
  generateModularMonolithPreset,
} from "../eng/modular-monolith-preset.mjs";
import { runModularMonolithCli } from "../eng/generate-modular-monolith.mjs";
import { listFiles } from "../eng/list-files.mjs";

async function createTemporaryDirectory(prefix = "martix-modular-monolith-") {
  return mkdtemp(join(tmpdir(), prefix));
}

test("the modular monolith preset requires a genuine Business Module", () => {
  assert.throws(
    () =>
      createModularMonolithPresetPlan({
        applicationName: "MartiX.Planner",
      }),
    /at least one business module/i,
  );
});

test("the modular monolith plan is deterministic and records the Contracts graph", () => {
  const options = {
    applicationName: "MartiX.Planner",
    businessModules: ["Orders", "Billing"],
    moduleDependencies: { Billing: ["Orders"] },
  };
  const firstPlan = createModularMonolithPresetPlan(options);
  const secondPlan = createModularMonolithPresetPlan(options);

  assert.deepEqual(firstPlan, secondPlan);
  assert.equal(firstPlan.preset, "modular-monolith");
  assert.equal(firstPlan.platformContractVersion, MODULAR_MONOLITH_PLATFORM_VERSION);
  assert.deepEqual(firstPlan.baselineCapabilities, MODULAR_MONOLITH_BASELINE_CAPABILITIES);
  assert.deepEqual(firstPlan.providers, [
    {
      id: "postgresql",
      capability: "relational-persistence",
      state: "selected",
    },
  ]);
  assert.deepEqual(firstPlan.businessModules, [
    {
      name: "Orders",
      project: "src/MartiX.Planner.Orders",
      contractsNamespace: "MartiX.Planner.Orders.Contracts",
      dependencies: [],
    },
    {
      name: "Billing",
      project: "src/MartiX.Planner.Billing",
      contractsNamespace: "MartiX.Planner.Billing.Contracts",
      dependencies: ["Orders"],
    },
  ]);
  assert.deepEqual(firstPlan.moduleDependencies, [
    {
      consumer: "Billing",
      provider: "Orders",
      access: "Contracts",
    },
  ]);
  assert.deepEqual(firstPlan.projects, [
    "src/MartiX.Planner.Api/MartiX.Planner.Api.csproj",
    "src/MartiX.Planner.Migrator/MartiX.Planner.Migrator.csproj",
    "src/MartiX.Planner.Orders/MartiX.Planner.Orders.csproj",
    "src/MartiX.Planner.Billing/MartiX.Planner.Billing.csproj",
    "tests/MartiX.Planner.Tests/MartiX.Planner.Tests.csproj",
  ]);
});

test("the selected relational provider is recorded in the plan", () => {
  const plan = createModularMonolithPresetPlan({
    applicationName: "MartiX.Planner",
    businessModules: ["Orders"],
    provider: "sqlserver",
  });

  assert.equal(plan.relationalProvider, "sqlserver");
  assert.deepEqual(plan.providers, [
    {
      id: "sqlserver",
      capability: "relational-persistence",
      state: "selected",
    },
  ]);
});

test("the modular monolith CLI resolves repeated module and dependency options", async () => {
  const output = [];
  const originalLog = console.log;
  console.log = (value) => output.push(value);

  try {
    await runModularMonolithCli([
      "--name",
      "MartiX.Planner",
      "--module",
      "Orders",
      "--module=Billing",
      "--module-dependency",
      "Billing:Orders",
      "--dry-run",
    ]);
  } finally {
    console.log = originalLog;
  }

  assert.equal(output.length, 1);
  const plan = JSON.parse(output[0]);
  assert.equal(plan.preset, "modular-monolith");
  assert.deepEqual(plan.businessModules.map(({ name }) => name), [
    "Orders",
    "Billing",
  ]);
  assert.deepEqual(plan.moduleDependencies, [
    { consumer: "Billing", provider: "Orders", access: "Contracts" },
  ]);
});

test("invalid module identity, provider, and graph selections fail before writing", async () => {
  const output = await createTemporaryDirectory();

  try {
    const invalidSelections = [
      [
        {},
        /application name is required/i,
      ],
      [
        { applicationName: "MartiX.Planner", businessModules: [] },
        /at least one business module/i,
      ],
      [
        {
          applicationName: "MartiX.Planner",
          businessModules: ["Sample"],
        },
        /placeholder/i,
      ],
      [
        {
          applicationName: "MartiX.Planner",
          businessModules: ["Orders", "Billing"],
          moduleDependencies: { Orders: ["Billing"], Billing: ["Orders"] },
        },
        /acyclic/i,
      ],
      [
        {
          applicationName: "MartiX.Planner",
          businessModules: ["Orders"],
          relationalProvider: "sqlite",
        },
        /not supported/i,
      ],
    ];

    for (const [options, expectedError] of invalidSelections) {
      assert.throws(
        () => createModularMonolithPresetPlan(options),
        expectedError,
      );
    }

    await assert.rejects(
      () =>
        generateModularMonolithPreset({
          applicationName: "MartiX.Planner",
          businessModules: ["Orders"],
        }),
      /output directory/i,
    );
    assert.deepEqual(await listFiles(output), []);
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test("generation emits only executable, module, and consolidated test boundaries", async () => {
  const firstRoot = await createTemporaryDirectory();
  const secondRoot = await createTemporaryDirectory();

  try {
    const options = {
      applicationName: "MartiX.Planner",
      businessModules: ["Orders", "Billing"],
      moduleDependencies: { Billing: ["Orders"] },
      outputDirectory: join(firstRoot, "generated"),
    };
    const first = await generateModularMonolithPreset(options);
    const second = await generateModularMonolithPreset({
      ...options,
      outputDirectory: join(secondRoot, "generated"),
    });

    assert.deepEqual(first.files, second.files);
    assert.equal(first.files.length, 21);
    assert.deepEqual(
      await listFiles(join(firstRoot, "generated")),
      first.files,
    );
    assert.equal(first.manifest.preset, "modular-monolith");
    assert.deepEqual(
      first.manifest.modules.map(({ name, dependencies }) => ({
        name,
        dependencies,
      })),
      [
        { name: "Orders", dependencies: [] },
        { name: "Billing", dependencies: ["Orders"] },
      ],
    );

    const source = await Promise.all(
      first.files.map((file) =>
        readFile(join(firstRoot, "generated", file), "utf8"),
      ),
    );
    const secondSource = await Promise.all(
      second.files.map((file) =>
        readFile(join(secondRoot, "generated", file), "utf8"),
      ),
    );
    assert.deepEqual(source, secondSource);

    const moduleProject = await readFile(
      join(
        firstRoot,
        "generated",
        "src",
        "MartiX.Planner.Billing",
        "MartiX.Planner.Billing.csproj",
      ),
      "utf8",
    );
    assert.match(
      moduleProject,
      /ProjectReference Include="\.\.\/MartiX\.Planner\.Orders\/MartiX\.Planner\.Orders\.csproj"/,
    );
    assert.doesNotMatch(moduleProject, /Api\.csproj|Migrator\.csproj|Tests\.csproj/);

    const apiSource = await readFile(
      join(
        firstRoot,
        "generated",
        "src",
        "MartiX.Planner.Api",
        "Program.cs",
      ),
      "utf8",
    );
    assert.match(apiSource, /OrdersModule\.AddServices\(services\)/);
    assert.match(apiSource, /BillingModule\.MapEndpoints\(app\)/);
    assert.doesNotMatch(apiSource, /Assembly\.|GetTypes|MediatR|IModule/);

    const generatedText = source.join("\n");
    assert.match(generatedText, /Contracts\.ModuleContracts/);
    assert.match(generatedText, /await Assert\.That/);
    assert.match(generatedText, /GetRequiredService<IOrdersStatus>/);
    assert.doesNotMatch(generatedText, /Shared\.Contracts|Microsoft\.NET\.Test\.Sdk/);
    assert.deepEqual(
      first.files.filter((file) => file.endsWith(".csproj")),
      [
        "src/MartiX.Planner.Api/MartiX.Planner.Api.csproj",
        "src/MartiX.Planner.Billing/MartiX.Planner.Billing.csproj",
        "src/MartiX.Planner.Migrator/MartiX.Planner.Migrator.csproj",
        "src/MartiX.Planner.Orders/MartiX.Planner.Orders.csproj",
        "tests/MartiX.Planner.Tests/MartiX.Planner.Tests.csproj",
      ],
    );
  } finally {
    await Promise.all([
      rm(firstRoot, { recursive: true, force: true }),
      rm(secondRoot, { recursive: true, force: true }),
    ]);
  }
});
