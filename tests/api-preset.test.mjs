import assert from "node:assert/strict";
import {
  mkdtemp,
  readdir,
  readFile,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  API_BASELINE_CAPABILITIES,
  API_MANIFEST_SCHEMA_VERSION,
  API_PLATFORM_VERSION,
  createApiPresetPlan,
  generateApiPreset,
} from "../eng/api-preset.mjs";
import { runApiPresetCli } from "../eng/generate-api.mjs";

async function createTemporaryDirectory(prefix = "martix-api-preset-") {
  return mkdtemp(join(tmpdir(), prefix));
}

async function listFiles(root) {
  const entries = [];

  async function visit(directory, relativeDirectory = "") {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const relativePath = relativeDirectory
        ? join(relativeDirectory, entry.name)
        : entry.name;
      const absolutePath = join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(absolutePath, relativePath);
      } else {
        entries.push(relativePath);
      }
    }
  }

  await visit(root);
  return entries.sort();
}

test("the API plan is explicit and deterministic", () => {
  const firstPlan = createApiPresetPlan({
    applicationName: "Contoso.Inventory",
  });
  const secondPlan = createApiPresetPlan({
    applicationName: "Contoso.Inventory",
  });

  assert.deepEqual(firstPlan, secondPlan);
  assert.equal(firstPlan.preset, "api");
  assert.equal(firstPlan.manifestSchemaVersion, API_MANIFEST_SCHEMA_VERSION);
  assert.equal(firstPlan.platformVersion, API_PLATFORM_VERSION);
  assert.equal(firstPlan.platformContractVersion, API_PLATFORM_VERSION);
  assert.equal(firstPlan.origin.canonicalRepository, "https://github.com/MartiXDev/Platform");
  assert.deepEqual(firstPlan.baselineCapabilities, API_BASELINE_CAPABILITIES);
  assert.deepEqual(firstPlan.capabilities, API_BASELINE_CAPABILITIES);
  assert.deepEqual(firstPlan.providers, []);
  assert.equal(firstPlan.persistence, "none");
  assert.deepEqual(firstPlan.packageReferences, [
    { id: "MartiX.Platform", version: API_PLATFORM_VERSION },
    { id: "MartiX.Platform.AspNetCore", version: API_PLATFORM_VERSION },
    { id: "MartiX.Platform.Analyzers", version: API_PLATFORM_VERSION },
  ]);
  assert.equal(
    createApiPresetPlan({ applicationName: "Contoso.Api" }).applicationName,
    "Contoso.Api",
  );
  assert.equal(
    createApiPresetPlan({ applicationName: " Contoso.Api " }).applicationName,
    "Contoso.Api",
  );
});

test("the CLI prints the resolved plan without writing in dry-run mode", async () => {
  const output = [];
  const originalLog = console.log;
  console.log = (value) => output.push(value);

  try {
    await runApiPresetCli([
      "--name",
      "Contoso.Inventory",
      "--preset",
      "api",
      "--dry-run",
    ]);
  } finally {
    console.log = originalLog;
  }

  assert.equal(output.length, 1);
  const plan = JSON.parse(output[0]);
  assert.equal(plan.applicationName, "Contoso.Inventory");
  assert.equal(plan.preset, "api");
  assert.deepEqual(plan.providers, []);
});

test("identity and unsupported selections fail before generation writes", async () => {
  const output = await createTemporaryDirectory();

  try {
    await assert.rejects(
      () => generateApiPreset({ outputDirectory: join(output, "sample") }),
      /application name is required/i,
    );
    for (const [index, applicationName] of [
      "Sample.Api",
      "Api",
      "Api.Api",
      "Default.Api",
      "Default.Api.V2",
      "TestProject",
      "TestProject.Api",
    ].entries()) {
      await assert.rejects(
        () => generateApiPreset({
          applicationName,
          outputDirectory: join(output, `placeholder-${index}`),
        }),
        /placeholder/i,
      );
    }
    await assert.rejects(
      () => generateApiPreset({
        applicationName: "Contoso.Inventory",
        capabilities: ["relational-persistence"],
        outputDirectory: join(output, "invalid-capability"),
      }),
      /not supported by the api preset/i,
    );
    await assert.rejects(
      () => generateApiPreset({
        applicationName: "Contoso.Inventory",
        providers: ["react"],
        outputDirectory: join(output, "invalid-provider"),
      }),
      /providers are not supported by the api preset/i,
    );

    assert.deepEqual(await listFiles(output), []);
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test("generation writes only the selected API composition and manifest", async () => {
  const firstRoot = await createTemporaryDirectory();
  const secondRoot = await createTemporaryDirectory();

  try {
    const first = await generateApiPreset({
      applicationName: "Contoso.Inventory",
      outputDirectory: join(firstRoot, "generated"),
    });
    const second = await generateApiPreset({
      applicationName: "Contoso.Inventory",
      outputDirectory: join(secondRoot, "generated"),
    });

    assert.deepEqual(first.files, second.files);
    assert.deepEqual(first.files, [
      "AGENTS.md",
      "CONTEXT.md",
      "Contoso.Inventory.slnx",
      "README.md",
      "contracts/openapi-v1.json",
      "martix.platform.json",
      "src/Contoso.Inventory.Api/Contoso.Inventory.Api.csproj",
      "src/Contoso.Inventory.Api/Orders/Orders.cs",
      "src/Contoso.Inventory.Api/Program.cs",
      "src/Contoso.Inventory.Client/Contoso.Inventory.Client.cs",
      "src/Contoso.Inventory.Client/Contoso.Inventory.Client.csproj",
      "tests/Contoso.Inventory.Tests/ApiContractTests.cs",
      "tests/Contoso.Inventory.Tests/Contoso.Inventory.Tests.csproj",
    ]);
    assert.deepEqual(
      await listFiles(join(firstRoot, "generated")),
      first.files,
    );

    const manifest = JSON.parse(
      await readFile(join(firstRoot, "generated", "martix.platform.json"), "utf8"),
    );
    assert.equal(manifest.kind, "generated-solution");
    assert.equal(manifest.repository.name, "Contoso.Inventory");
    assert.equal(manifest.preset, "api");
    assert.equal(manifest.origin.template, "martix-app");
    assert.deepEqual(
      manifest.capabilities.map((capability) => capability.id),
      API_BASELINE_CAPABILITIES,
    );
    assert.deepEqual(manifest.providers, []);
    assert.equal(manifest.platformContractVersion, API_PLATFORM_VERSION);
    const apiSource = await readFile(
      join(
        firstRoot,
        "generated",
        "src",
        "Contoso.Inventory.Api",
        "Program.cs",
      ),
      "utf8",
    );
    assert.match(apiSource, /using MartiX\.Platform\.Results;/);
    assert.match(
      apiSource,
      /\.ProducesMartiXProblemDetails\(ErrorKind\.Unexpected\)/,
    );
    const ordersSource = await readFile(
      join(
        firstRoot,
        "generated",
        "src",
        "Contoso.Inventory.Api",
        "Orders",
        "Orders.cs",
      ),
      "utf8",
    );
    assert.match(
      ordersSource,
      /endpoints\.MapGet\("\/legacy-orders", ListAsync\)/,
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

    const generatedText = source
      .filter((_, index) => first.files[index] !== "martix.platform.json")
      .join("\n");
    assert.match(generatedText, /MartiX\.Platform\.Results/);
    assert.match(generatedText, /AddMartiXProblemDetails/);
    assert.match(generatedText, /ToProblemDetails/);
    assert.match(generatedText, /MartiX\.Platform\.Analyzers/);
    assert.doesNotMatch(
      generatedText,
      /WeatherForecast|DbContext|EntityFramework|Npgsql|SqlServer|Migrations|Sample|Demo/,
    );
  } finally {
    await Promise.all([
      rm(firstRoot, { recursive: true, force: true }),
      rm(secondRoot, { recursive: true, force: true }),
    ]);
  }
});

test("generation includes a versioned OpenAPI contract and OpenAPI-only client", async () => {
  const root = await createTemporaryDirectory();

  try {
    const output = join(root, "generated");
    const result = await generateApiPreset({
      applicationName: "Contoso.Inventory",
      outputDirectory: output,
    });

    assert.ok(result.files.includes("contracts/openapi-v1.json"));
    assert.ok(
      result.files.includes(
        "src/Contoso.Inventory.Client/Contoso.Inventory.Client.cs",
      ),
    );
    const openApi = JSON.parse(
      await readFile(join(output, "contracts", "openapi-v1.json"), "utf8"),
    );
    assert.equal(openApi.openapi, "3.1.0");
    assert.ok(openApi.paths["/api/v1/orders"]);
    assert.ok(openApi.paths["/api/v1/orders/{id}"]);
    assert.equal(openApi.paths["/api/v1/legacy-orders"].get.deprecated, true);
    assert.ok(openApi.paths["/api/v1/legacy-orders"].get.responses["200"]
      .headers.Deprecation);
    assert.ok(openApi.paths["/api/v1/legacy-orders"].get.responses["200"]
      .headers.Link);
    assert.ok(openApi.paths["/api/v1/orders"].get.responses["200"]);
    assert.ok(openApi.paths["/api/v1/orders"].post.responses["201"]);
    assert.ok(openApi.paths["/api/v1/orders"].post.responses["400"]);
    assert.ok(openApi.paths["/api/v1/orders/{id}"].put.responses["412"]);
    assert.ok(openApi.paths["/api/v1/orders/{id}"].put.responses["428"]);

    const client = await readFile(
      join(
        output,
        "src",
        "Contoso.Inventory.Client",
        "Contoso.Inventory.Client.cs",
      ),
      "utf8",
    );
    assert.match(client, /HttpClient/);
    assert.match(client, /\/api\/v1\/orders/);
    assert.doesNotMatch(client, /MartiX\.Platform|ProjectReference|EntityFramework/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
