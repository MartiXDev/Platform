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
  assert.ok(
    firstPlan.baselineCapabilities.includes(
      "modular-monolith.reliable-integration-events",
    ),
  );
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
    "src/MartiX.Planner.Client/MartiX.Planner.Client.csproj",
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

test("generation emits module-owned relational persistence for each provider", async () => {
  const roots = await Promise.all([
    createTemporaryDirectory(),
    createTemporaryDirectory(),
  ]);

  try {
    for (const [index, provider] of ["postgresql", "sqlserver"].entries()) {
      const root = join(roots[index], "generated");
      const result = await generateModularMonolithPreset({
        applicationName: "MartiX.Planner",
        businessModules: ["Orders", "Billing"],
        moduleDependencies: { Billing: ["Orders"] },
        relationalProvider: provider,
        outputDirectory: root,
      });

      assert.equal(result.plan.relationalProvider, provider);
      assert.ok(
        result.files.includes(
          "src/MartiX.Planner.Orders/Infrastructure/Persistence/OrdersDbContext.cs",
        ),
      );
      assert.ok(
        result.files.includes(
          "src/MartiX.Planner.Billing/Infrastructure/Persistence/BillingDbContext.cs",
        ),
      );
      assert.ok(
        result.files.includes(
          "src/MartiX.Planner.Orders/Infrastructure/Persistence/Migrations/20260101000000_InitialOrders.cs",
        ),
      );
      assert.ok(
        result.files.includes(
          "src/MartiX.Planner.Billing/Infrastructure/Persistence/Migrations/20260101000000_InitialBilling.cs",
        ),
      );
      assert.ok(
        result.files.includes(
          "src/MartiX.Planner.Orders/Contracts/IntegrationEvents/OrdersIntegrationEvents.cs",
        ),
      );
      assert.ok(
        result.files.includes(
          "src/MartiX.Planner.Orders/Infrastructure/IntegrationEvents/OrdersReliableEvents.cs",
        ),
      );

      const ordersContext = await readFile(
        join(
          root,
          "src",
          "MartiX.Planner.Orders",
          "Infrastructure",
          "Persistence",
          "OrdersDbContext.cs",
        ),
        "utf8",
      );
      const ordersModule = await readFile(
        join(root, "src", "MartiX.Planner.Orders", "OrdersModule.cs"),
        "utf8",
      );
      const migrator = await readFile(
        join(root, "src", "MartiX.Planner.Migrator", "Program.cs"),
        "utf8",
      );
      const migration = await readFile(
        join(
          root,
          "src",
          "MartiX.Planner.Orders",
          "Infrastructure",
          "Persistence",
          "Migrations",
          "20260101000000_InitialOrders.cs",
        ),
        "utf8",
      );
      const api = await readFile(
        join(root, "src", "MartiX.Planner.Api", "Program.cs"),
        "utf8",
      );
      const ordersEvents = await readFile(
        join(
          root,
          "src",
          "MartiX.Planner.Orders",
          "Contracts",
          "IntegrationEvents",
          "OrdersIntegrationEvents.cs",
        ),
        "utf8",
      );
      const ordersReliableEvents = await readFile(
        join(
          root,
          "src",
          "MartiX.Planner.Orders",
          "Infrastructure",
          "IntegrationEvents",
          "OrdersReliableEvents.cs",
        ),
        "utf8",
      );
      const billingReliableEvents = await readFile(
        join(
          root,
          "src",
          "MartiX.Planner.Billing",
          "Infrastructure",
          "IntegrationEvents",
          "BillingReliableEvents.cs",
        ),
        "utf8",
      );
      const reliableEventsComposition = await readFile(
        join(
          root,
          "src",
          "MartiX.Planner.Api",
          "Infrastructure",
          "IntegrationEvents",
          "ReliableEventsComposition.cs",
        ),
        "utf8",
      );

      assert.match(ordersContext, /internal sealed class OrdersDbContext : DbContext/);
      assert.match(ordersContext, /HasDefaultSchema\("orders"\)/);
      assert.match(
        ordersModule,
        /MigrationsHistoryTable\("__ef_migrations_history", "orders"\)/,
      );
      const ordersModel = await readFile(
        join(
          root,
          "src",
          "MartiX.Planner.Orders",
          "Infrastructure",
          "Persistence",
          "OrdersPersistenceModel.cs",
        ),
        "utf8",
      );
      assert.match(ordersModel, /ToTable\("orders_aggregate", "orders"\)/);
      assert.match(
        ordersModel,
        /internal sealed class OrdersAggregateConfiguration\s*:\s*IEntityTypeConfiguration<OrdersAggregate>/,
      );
      assert.match(
        ordersModel,
        /ApplyConfiguration\(new OrdersAggregateConfiguration\(\)\)/,
      );
      assert.match(ordersModel, /HasEntityTimestamps\(\)/);
      assert.match(
        ordersModel,
        /HasColumnName\("concurrency_token"\)[\s\S]*?IsConcurrencyToken\(\)[\s\S]*?ValueGeneratedNever\(\)/,
      );
      assert.match(ordersModule, /AddDbContext<OrdersDbContext>/);
      assert.match(
        ordersModule,
        provider === "postgresql" ? /UseNpgsql\(/ : /UseSqlServer\(/,
      );
      assert.doesNotMatch(
        ordersModule,
        provider === "postgresql" ? /UseSqlServer\(/ : /UseNpgsql\(/,
      );
      assert.match(
        migration,
        provider === "postgresql"
          ? /type: "uuid"/
          : /type: "uniqueidentifier"/,
      );
      assert.match(
        migration,
        provider === "postgresql"
          ? /type: "character varying\(200\)"/
          : /type: "nvarchar\(200\)"/,
      );
      assert.match(migration, /concurrency_token = table.Column<Guid>/);
      assert.match(migration, /protected override void Down/);
      assert.match(migration, /DropTable\(/);
      assert.match(
        migration,
        /created_at = table.Column[\s\S]*updated_at = table.Column/,
      );
      assert.match(migrator, /validate/);
      assert.match(migrator, /script/);
      assert.match(migrator, /apply/);
      assert.match(ordersModule, /MigrationsSqlGenerationOptions\.Idempotent/);
      assert.match(ordersModule, /CanConnectAsync\(cancellationToken\)/);
      assert.match(ordersModule, /GetAppliedMigrationsAsync\(cancellationToken\)/);
      assert.match(ordersModule, /GetPendingMigrationsAsync\(cancellationToken\)/);
      assert.match(ordersModule, /HasPendingModelChanges\(\)/);
      assert.match(ordersModule, /MigrateAsync\(cancellationToken\)/);
      assert.match(ordersModule, /ApplyAndValidateAsync/);
      assert.doesNotMatch(api, /\.Migrate(?:Async)?\(|EnsureCreated|UseSeeding/);
      assert.match(ordersEvents, /public sealed record OrdersSubmittedV1/);
      assert.match(ordersEvents, /JsonSerializable/);
      assert.match(ordersReliableEvents, /ReliableEventsSaveChangesInterceptor/);
      assert.match(ordersReliableEvents, /ReliableEventEnvelope\.Create/);
      assert.match(ordersReliableEvents, /OutboxMessage\.Create/);
      assert.match(migration, /outbox_messages|outbox_deliveries/i);
      assert.match(billingReliableEvents, /ConsumeOrdersSubmittedAsync/);
      assert.match(billingReliableEvents, /ReliableEventsInboxExecutor\.ExecuteAsync/);
      assert.match(reliableEventsComposition, /ReliableEventsDispatcher/);
      assert.match(reliableEventsComposition, /ClaimReliableEventsAsync/);
      assert.match(reliableEventsComposition, /AcknowledgeReliableEventAsync/);
      assert.doesNotMatch(
        `${ordersEvents}\n${ordersReliableEvents}`,
        /AssemblyQualifiedName|GetType\(\)|IIntegrationEventHandler|IOutboxStore/,
      );
    }
  } finally {
    await Promise.all(
      roots.map((root) => rm(root, { recursive: true, force: true })),
    );
  }
});

test("generated module endpoints inherit the versioned HTTP contract", async () => {
  const root = await createTemporaryDirectory();

  try {
    const output = join(root, "generated");
    await generateModularMonolithPreset({
      applicationName: "MartiX.Planner",
      businessModules: ["Orders", "Billing"],
      moduleDependencies: { Billing: ["Orders"] },
      outputDirectory: output,
    });

    const api = await readFile(
      join(output, "src", "MartiX.Planner.Api", "Program.cs"),
      "utf8",
    );
    const orders = await readFile(
      join(
        output,
        "src",
        "MartiX.Planner.Orders",
        "Features",
        "Status",
        "OrdersStatus.cs",
      ),
      "utf8",
    );

    assert.match(api, /MapGroup\("\/api\/v1"\)/);
    assert.match(api, /WithGroupName\("v1"\)/);
    assert.match(orders, /MapGroup\("\/orders"\)/);
    assert.match(orders, /WithSummary\(/);
    assert.match(orders, /ProducesMartiXProblemDetails/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("generated relational identifiers are deterministic lowercase snake_case", async () => {
  const root = await createTemporaryDirectory();

  try {
    const output = join(root, "generated");
    await generateModularMonolithPreset({
      applicationName: "MartiX.Planner",
      businessModules: ["SalesOrders"],
      outputDirectory: output,
    });

    test("generated relational identifiers separate acronym word boundaries", async () => {
      const root = await createTemporaryDirectory();

      try {
        const output = join(root, "generated");
        await generateModularMonolithPreset({
          applicationName: "MartiX.Planner",
          businessModules: ["XMLParser"],
          outputDirectory: output,
        });

        const model = await readFile(
          join(
            output,
            "src",
            "MartiX.Planner.XMLParser",
            "Infrastructure",
            "Persistence",
            "XMLParserPersistenceModel.cs",
          ),
          "utf8",
        );

        assert.match(model, /ToTable\("xml_parser_aggregate", "xml_parser"\)/);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    });

    const model = await readFile(
      join(
        output,
        "src",
        "MartiX.Planner.SalesOrders",
        "Infrastructure",
        "Persistence",
        "SalesOrdersPersistenceModel.cs",
      ),
      "utf8",
    );
    const migration = await readFile(
      join(
        output,
        "src",
        "MartiX.Planner.SalesOrders",
        "Infrastructure",
        "Persistence",
        "Migrations",
        "20260101000000_InitialSalesOrders.cs",
      ),
      "utf8",
    );

    assert.match(model, /ToTable\("sales_orders_aggregate", "sales_orders"\)/);
    assert.match(migration, /pk_sales_orders_aggregate/);
    assert.doesNotMatch(model, /ToTable\("[^"]*SalesOrders|ToTable\("[^"]*salesorders/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
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
          applicationName: "Class.App",
          businessModules: ["Orders"],
        },
        /C# keyword/i,
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
    assert.equal(first.files.length, 37);
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
    assert.match(apiSource, /OrdersModule\.AddServices\(services, configuration\)/);
    assert.match(apiSource, /BillingModule\.MapEndpoints\(versionOne\)/);
    assert.doesNotMatch(apiSource, /Assembly\.|GetTypes|MediatR|IModule/);

    const generatedText = source.join("\n");
    assert.match(generatedText, /Contracts\.ModuleContracts/);
    assert.match(generatedText, /await Assert\.That/);
    assert.match(generatedText, /GetRequiredService<IOrdersStatus>/);
    assert.match(generatedText, /inbox_receipts/);
    assert.match(generatedText, /consumer commits before acknowledgement/i);
    assert.match(generatedText, /duplicate.*business effect/i);
    assert.doesNotMatch(generatedText, /Shared\.Contracts|Microsoft\.NET\.Test\.Sdk/);
    assert.deepEqual(
      first.files.filter((file) => file.endsWith(".csproj")),
      [
        "src/MartiX.Planner.Api/MartiX.Planner.Api.csproj",
        "src/MartiX.Planner.Billing/MartiX.Planner.Billing.csproj",
        "src/MartiX.Planner.Client/MartiX.Planner.Client.csproj",
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
