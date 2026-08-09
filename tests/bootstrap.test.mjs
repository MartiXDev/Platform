import assert from "node:assert/strict";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  REQUIRED_BOOTSTRAP_INPUTS,
  validateProviderAdmissionFixture,
  verifyBootstrap,
} from "../eng/verify.mjs";

const repositoryRoot = join(import.meta.dirname, "..");

async function copyBootstrapInputs(destination) {
  for (const relativePath of REQUIRED_BOOTSTRAP_INPUTS) {
    const target = join(destination, relativePath);
    await mkdir(dirname(target), { recursive: true });
    await cp(join(repositoryRoot, relativePath), target);
  }
}

async function createTemporaryBootstrapRoot() {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "martix-platform-"));
  await copyBootstrapInputs(temporaryRoot);
  return temporaryRoot;
}

async function withTemporaryBootstrapRoot(callback) {
  const temporaryRoot = await createTemporaryBootstrapRoot();
  try {
    return await callback(temporaryRoot);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

function modularMonolithFixturePath(rootDir, ...segments) {
  return join(
    rootDir,
    "tests",
    "fixtures",
    "ModularMonolithGeneratedSolution",
    ...segments,
  );
}

function fullStackFixturePath(rootDir, ...segments) {
  return join(
    rootDir,
    "tests",
    "fixtures",
    "FullStackGeneratedSolution",
    ...segments,
  );
}

test("fast cadence verifies the repository bootstrap contract", async () => {
  const result = await verifyBootstrap({
    cadence: "fast",
    rootDir: repositoryRoot,
  });

  assert.equal(result.status, "passed");
  assert.equal(result.cadence, "fast");
  assert.ok(result.gates.includes("bootstrap.manifest"));
});

test("missing bootstrap inputs fail with an actionable path", async () => {
  const emptyRoot = await mkdtemp(join(tmpdir(), "martix-platform-"));

  await assert.rejects(
    () => verifyBootstrap({ cadence: "fast", rootDir: emptyRoot }),
    /Missing required bootstrap input: martix\.platform\.json/,
  );
});

test("pull-request cadence verifies the named Generated Solution seam", async () => {
  const result = await verifyBootstrap({
    cadence: "pull-request",
    rootDir: repositoryRoot,
  });

  assert.equal(result.status, "passed");
  assert.equal(result.cadence, "pull-request");
  assert.equal(result.generatedSolution, "RepositoryBootstrapGeneratedSolution");
  assert.ok(result.gates.includes("bootstrap.generated-solution"));
  assert.equal(result.modularMonolithSolution, "ModularMonolithGeneratedSolution");
  assert.ok(result.gates.includes("bootstrap.modular-monolith"));
  assert.ok(result.gates.includes("bootstrap.provider-admission"));
});

test("the named Full Stack fixture exercises the Blazor provider", async () => {
  const manifest = JSON.parse(
    await readFile(
      fullStackFixturePath(repositoryRoot, "martix.platform.json"),
      "utf8",
    ),
  );

  assert.equal(manifest.ui.provider, "blazor-webapp");
  assert.deepEqual(
    manifest.providers.filter(({ capability }) => capability === "application-ui"),
    [{
      id: "blazor-webapp",
      capability: "application-ui",
      state: "selected",
    }],
  );
});

test("the named Provider Admission fixture proves selection, absence, and invalid input", async () => {
  const fixture = JSON.parse(
    await readFile(
      join(
        repositoryRoot,
        "tests",
        "fixtures",
        "ProviderAdmissionGeneratedSolution",
        "provider-admission.json",
      ),
      "utf8",
    ),
  );
  const result = await validateProviderAdmissionFixture(fixture);

  assert.equal(result.status, "passed");
  assert.equal(result.providerCount, 2);
  assert.equal(result.invalidSelectionCount, 4);
  assert.equal(
    result.matrixCoordinate,
    "operatingSystem=linux|preset=modular-monolith|runtime=net10.0",
  );
});

test("Full Stack verification rejects UI contract version drift", async () => {
  await withTemporaryBootstrapRoot(async (temporaryRoot) => {
    const manifestPath = fullStackFixturePath(
      temporaryRoot,
      "martix.platform.json",
    );
    const contractPath = fullStackFixturePath(
      temporaryRoot,
      "contracts",
      "ui-capability-v1.json",
    );
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const contract = JSON.parse(await readFile(contractPath, "utf8"));
    manifest.ui.contractVersion = "0.9.0";
    contract.contractVersion = "0.9.0";
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    await writeFile(contractPath, `${JSON.stringify(contract, null, 2)}\n`);

    await assert.rejects(
      () => verifyBootstrap({ cadence: "fast", rootDir: temporaryRoot }),
      /Invalid Full Stack UI contract version/,
    );
  });
});

test("Full Stack verification rejects a Blazor client with an incorrect HTTP method", async () => {
  await withTemporaryBootstrapRoot(async (temporaryRoot) => {
    const clientPath = fullStackFixturePath(
      temporaryRoot,
      "src",
      "MartiX.FullStackTestApp.Web",
      "Platform",
      "Api",
      "GeneratedClient.cs",
    );
    const client = await readFile(clientPath, "utf8");
    await writeFile(
      clientPath,
      client.replace(
        "HttpMethod.Get,\n            \"/api/v1/orders/status\"",
        "HttpMethod.Post,\n            \"/api/v1/orders/status\"",
      ),
    );

    await assert.rejects(
      () => verifyBootstrap({ cadence: "fast", rootDir: temporaryRoot }),
      /generated UI client must expose every operation/,
    );
  });
});

test("Full Stack verification rejects a Blazor client missing an OpenAPI parameter", async () => {
  await withTemporaryBootstrapRoot(async (temporaryRoot) => {
    const contractPath = fullStackFixturePath(
      temporaryRoot,
      "contracts",
      "openapi-v1.json",
    );
    const contract = JSON.parse(await readFile(contractPath, "utf8"));
    const operation = contract.paths["/api/v1/orders/status"].get;
    operation.parameters = [
      {
        name: "cursor",
        in: "query",
        required: true,
        schema: { type: "string" },
      },
    ];
    operation["x-client"].queryParameters = [
      { name: "cursor", type: "string" },
    ];
    await writeFile(contractPath, `${JSON.stringify(contract, null, 2)}\n`);

    await assert.rejects(
      () => verifyBootstrap({ cadence: "fast", rootDir: temporaryRoot }),
      /generated UI client must expose every operation/,
    );
  });
});

test("modular monolith verification rejects cross-module implementation references", async () => {
  await withTemporaryBootstrapRoot(async (temporaryRoot) => {
    const billingFeaturePath = modularMonolithFixturePath(
      temporaryRoot,
      "src",
      "MartiX.TemplateTestApp.Billing",
      "Features",
      "Status",
      "BillingStatus.cs",
    );
    const billingFeature = await readFile(billingFeaturePath, "utf8");
    await writeFile(
      billingFeaturePath,
      `${billingFeature}\nusing MartiX.TemplateTestApp.Orders.Domain;\n`,
    );

    await assert.rejects(
      () => verifyBootstrap({ cadence: "fast", rootDir: temporaryRoot }),
      /may consume only .*Contracts/i,
    );
  });
});

test("modular monolith verification rejects undeclared cross-module references", async () => {
  await withTemporaryBootstrapRoot(async (temporaryRoot) => {
    const ordersFeaturePath = modularMonolithFixturePath(
      temporaryRoot,
      "src",
      "MartiX.TemplateTestApp.Orders",
      "Features",
      "Status",
      "OrdersStatus.cs",
    );
    const ordersFeature = await readFile(ordersFeaturePath, "utf8");
    await writeFile(
      ordersFeaturePath,
      `${ordersFeature}\nusing MartiX.TemplateTestApp.Billing.Domain;\n`,
    );

    await assert.rejects(
      () => verifyBootstrap({ cadence: "fast", rootDir: temporaryRoot }),
      /may consume only .*Contracts/i,
    );
  });
});

test("modular monolith verification requires public module Contracts", async () => {
  await withTemporaryBootstrapRoot(async (temporaryRoot) => {
    const contractsPath = modularMonolithFixturePath(
      temporaryRoot,
      "src",
      "MartiX.TemplateTestApp.Billing",
      "Contracts",
      "ModuleContracts",
      "IBillingStatus.cs",
    );
    const contracts = await readFile(contractsPath, "utf8");
    await writeFile(
      contractsPath,
      contracts.replace("public interface", "internal interface"),
    );

    await assert.rejects(
      () => verifyBootstrap({ cadence: "fast", rootDir: temporaryRoot }),
      /must expose public Contracts declarations/i,
    );
  });
});

test("modular monolith verification requires public module composition members", async () => {
  await withTemporaryBootstrapRoot(async (temporaryRoot) => {
    const compositionPath = modularMonolithFixturePath(
      temporaryRoot,
      "src",
      "MartiX.TemplateTestApp.Billing",
      "BillingModule.cs",
    );
    const composition = await readFile(compositionPath, "utf8");
    await writeFile(
      compositionPath,
      composition.replace(
        "public static void AddServices",
        "internal static void AddServices",
      ),
    );

    await assert.rejects(
      () => verifyBootstrap({ cadence: "fast", rootDir: temporaryRoot }),
      /must expose explicit composition/i,
    );
  });
});

test("modular monolith verification restricts module test visibility", async () => {
  await withTemporaryBootstrapRoot(async (temporaryRoot) => {
    const projectPath = modularMonolithFixturePath(
      temporaryRoot,
      "src",
      "MartiX.TemplateTestApp.Billing",
      "MartiX.TemplateTestApp.Billing.csproj",
    );
    const project = await readFile(projectPath, "utf8");
    await writeFile(
      projectPath,
      project.replace(
        '<InternalsVisibleTo Include="MartiX.TemplateTestApp.Tests" />',
        [
          '<InternalsVisibleTo Include="MartiX.TemplateTestApp.Tests" />',
          "<InternalsVisibleTo Include='Unexpected.Consumer' />",
        ].join("\n    "),
      ),
    );

    await assert.rejects(
      () => verifyBootstrap({ cadence: "fast", rootDir: temporaryRoot }),
      /test visibility/i,
    );
  });
});

test("modular monolith verification keeps non-Contracts types internal", async () => {
  await withTemporaryBootstrapRoot(async (temporaryRoot) => {
    const featurePath = modularMonolithFixturePath(
      temporaryRoot,
      "src",
      "MartiX.TemplateTestApp.Billing",
      "Features",
      "Status",
      "BillingStatus.cs",
    );
    const feature = await readFile(featurePath, "utf8");
    await writeFile(
      featurePath,
      `${feature}\npublic sealed class LeakedBillingType { }\n`,
    );

    await assert.rejects(
      () => verifyBootstrap({ cadence: "fast", rootDir: temporaryRoot }),
      /must keep non-Contracts types internal/i,
    );
  });
});

test("modular monolith verification keeps migration execution out of the API", async () => {
  await withTemporaryBootstrapRoot(async (temporaryRoot) => {
    const apiPath = modularMonolithFixturePath(
      temporaryRoot,
      "src",
      "MartiX.TemplateTestApp.Api",
      "Program.cs",
    );
    const api = await readFile(apiPath, "utf8");
    await writeFile(apiPath, `${api}\napp.Services.GetRequiredService<object>().Migrate();\n`);

    await assert.rejects(
      () => verifyBootstrap({ cadence: "fast", rootDir: temporaryRoot }),
      /API composition must not migrate/i,
    );
  });
});

test("modular monolith verification rejects repository persistence wrappers", async () => {
  await withTemporaryBootstrapRoot(async (temporaryRoot) => {
    const featurePath = modularMonolithFixturePath(
      temporaryRoot,
      "src",
      "MartiX.TemplateTestApp.Orders",
      "Features",
      "Status",
      "OrdersStatus.cs",
    );
    const feature = await readFile(featurePath, "utf8");
    await writeFile(
      featurePath,
      `${feature}\ninternal interface IRepository<TEntity> { }\n`,
    );

    await assert.rejects(
      () => verifyBootstrap({ cadence: "fast", rootDir: temporaryRoot }),
      /must not introduce repository/i,
    );
  });
});

test("modular monolith verification requires a separate migration database configuration", async () => {
  await withTemporaryBootstrapRoot(async (temporaryRoot) => {
    const modulePath = modularMonolithFixturePath(
      temporaryRoot,
      "src",
      "MartiX.TemplateTestApp.Orders",
      "OrdersModule.cs",
    );
    const module = await readFile(modulePath, "utf8");
    await writeFile(modulePath, module.replaceAll('"MigrationDatabase"', '"Database"'));

    await assert.rejects(
      () => verifyBootstrap({ cadence: "fast", rootDir: temporaryRoot }),
      /separate .*MigrationDatabase/i,
    );
  });
});

test("modular monolith verification rejects a provider manifest that disagrees with generated code", async () => {
  await withTemporaryBootstrapRoot(async (temporaryRoot) => {
    const manifestPath = modularMonolithFixturePath(
      temporaryRoot,
      "martix.platform.json",
    );
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    manifest.providers[0].id = "sqlserver";
    await writeFile(manifestPath, JSON.stringify(manifest));

    await assert.rejects(
      () => verifyBootstrap({ cadence: "fast", rootDir: temporaryRoot }),
      /must select one provider/i,
    );
  });
});

test("modular monolith verification rejects deferred relational providers", async () => {
  await withTemporaryBootstrapRoot(async (temporaryRoot) => {
    const manifestPath = modularMonolithFixturePath(
      temporaryRoot,
      "martix.platform.json",
    );
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    manifest.providers[0].state = "deferred";
    await writeFile(manifestPath, JSON.stringify(manifest));

    await assert.rejects(
      () => verifyBootstrap({ cadence: "fast", rootDir: temporaryRoot }),
      /must select exactly one supported relational provider/i,
    );
  });
});

test("modular monolith verification requires executable API and Migrator projects", async () => {
  const projects = [
    {
      path: [
        "src",
        "MartiX.TemplateTestApp.Api",
        "MartiX.TemplateTestApp.Api.csproj",
      ],
      error: /Modular Monolith API project must be an executable/i,
    },
    {
      path: [
        "src",
        "MartiX.TemplateTestApp.Migrator",
        "MartiX.TemplateTestApp.Migrator.csproj",
      ],
      error: /Modular Monolith Migrator project must be an executable/i,
    },
  ];

  for (const { path: relativePath, error } of projects) {
    const temporaryRoot = await createTemporaryBootstrapRoot();
    try {
      const projectPath = modularMonolithFixturePath(
        temporaryRoot,
        ...relativePath,
      );
      const project = await readFile(projectPath, "utf8");
      await writeFile(
        projectPath,
        project.replace(
          /<OutputType>\s*Exe\s*<\/OutputType>/,
          "<OutputType>Library</OutputType>",
        ),
      );

      await assert.rejects(
        () => verifyBootstrap({ cadence: "fast", rootDir: temporaryRoot }),
        error,
      );
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }
});

test("unknown verification cadences fail before reading repository inputs", async () => {
  await assert.rejects(
    () => verifyBootstrap({ cadence: "unsupported", rootDir: repositoryRoot }),
    /Unknown verification cadence: unsupported/,
  );
});

test("manifest validation enforces the declared required fields", async () => {
  const temporaryRoot = await createTemporaryBootstrapRoot();

  const manifestPath = join(temporaryRoot, "martix.platform.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  delete manifest.preset;
  await writeFile(manifestPath, JSON.stringify(manifest));

  await assert.rejects(
    () => verifyBootstrap({ cadence: "fast", rootDir: temporaryRoot }),
    /Invalid bootstrap value at martix\.platform\.json\.preset/,
  );
});

test("the manifest schema declares every required bootstrap field", async () => {
  const temporaryRoot = await createTemporaryBootstrapRoot();

  const schemaPath = join(
    temporaryRoot,
    "schemas",
    "martix.platform.schema.json",
  );
  const schema = JSON.parse(await readFile(schemaPath, "utf8"));
  schema.required = schema.required.filter((property) => property !== "preset");
  await writeFile(schemaPath, JSON.stringify(schema));

  await assert.rejects(
    () => verifyBootstrap({ cadence: "fast", rootDir: temporaryRoot }),
    /Manifest schema is missing required property: preset/,
  );
});

test("manifest schema closes every object definition", async () => {
  const temporaryRoot = await createTemporaryBootstrapRoot();

  const schemaPath = join(
    temporaryRoot,
    "schemas",
    "martix.platform.schema.json",
  );
  const schema = JSON.parse(await readFile(schemaPath, "utf8"));
  schema.$defs.repository.additionalProperties = true;
  await writeFile(schemaPath, JSON.stringify(schema));

  await assert.rejects(
    () => verifyBootstrap({ cadence: "fast", rootDir: temporaryRoot }),
    /schemas\/martix\.platform\.schema\.json\.\$defs\.repository\.additionalProperties must be false/,
  );
});

test("bootstrap schemas reject secret-shaped metadata", async () => {
  const temporaryRoot = await createTemporaryBootstrapRoot();

  const schemaPath = join(
    temporaryRoot,
    "schemas",
    "martix.platform.schema.json",
  );
  const schema = JSON.parse(await readFile(schemaPath, "utf8"));
  schema.properties.apiKey = { type: "string" };
  await writeFile(schemaPath, JSON.stringify(schema));

  await assert.rejects(
    () => verifyBootstrap({ cadence: "fast", rootDir: temporaryRoot }),
    /Bootstrap schema contains a secret-shaped field: schemas\/martix\.platform\.schema\.json\.properties\.apiKey/,
  );
});

test("quality policy validation rejects undeclared properties", async () => {
  const temporaryRoot = await createTemporaryBootstrapRoot();

  const policyPath = join(temporaryRoot, "eng", "quality-gates.json");
  const policy = JSON.parse(await readFile(policyPath, "utf8"));
  policy.unexpected = true;
  await writeFile(policyPath, JSON.stringify(policy));

  await assert.rejects(
    () => verifyBootstrap({ cadence: "fast", rootDir: temporaryRoot }),
    /Invalid bootstrap property at eng\/quality-gates\.json\.unexpected/,
  );
});

test("quality policy validation rejects unsupported gates", async () => {
  const temporaryRoot = await createTemporaryBootstrapRoot();

  const policyPath = join(temporaryRoot, "eng", "quality-gates.json");
  const policy = JSON.parse(await readFile(policyPath, "utf8"));
  policy.gates.push({
    id: "bootstrap.unimplemented",
    family: "repository-integrity",
    owner: "platform-maintainers",
    required: true,
    cadences: [
      "fast",
      "pull-request",
      "main-nightly",
      "release-candidate",
    ],
    purpose: "This gate has no verifier implementation.",
  });
  await writeFile(policyPath, JSON.stringify(policy));

  await assert.rejects(
    () => verifyBootstrap({ cadence: "fast", rootDir: temporaryRoot }),
    /Unsupported bootstrap quality gate: bootstrap\.unimplemented/,
  );
});

test("manifest validation rejects API-key-shaped fields", async () => {
  const temporaryRoot = await createTemporaryBootstrapRoot();

  const manifestPath = join(temporaryRoot, "martix.platform.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.apiKey = "placeholder";
  await writeFile(manifestPath, JSON.stringify(manifest));

  await assert.rejects(
    () => verifyBootstrap({ cadence: "fast", rootDir: temporaryRoot }),
    /Bootstrap manifest contains a secret-shaped field: martix\.platform\.json\.apiKey/,
  );
});

test("manifest validation rejects undeclared root properties", async () => {
  const temporaryRoot = await createTemporaryBootstrapRoot();

  const manifestPath = join(temporaryRoot, "martix.platform.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.unexpected = true;
  await writeFile(manifestPath, JSON.stringify(manifest));

  await assert.rejects(
    () => verifyBootstrap({ cadence: "fast", rootDir: temporaryRoot }),
    /Invalid bootstrap property at martix\.platform\.json\.unexpected/,
  );
});

test("manifest validation rejects undeclared nested properties", async () => {
  const temporaryRoot = await createTemporaryBootstrapRoot();

  const manifestPath = join(temporaryRoot, "martix.platform.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.repository.internal = true;
  await writeFile(manifestPath, JSON.stringify(manifest));

  await assert.rejects(
    () => verifyBootstrap({ cadence: "fast", rootDir: temporaryRoot }),
    /Invalid bootstrap property at martix\.platform\.json\.repository\.internal/,
  );
});
