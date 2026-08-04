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
  runApiPresetCli,
} from "../eng/api-preset.mjs";

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
    await assert.rejects(
      () => generateApiPreset({
        applicationName: "Sample.Api",
        outputDirectory: join(output, "sample"),
      }),
      /placeholder/i,
    );
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
      "martix.platform.json",
      "src/Contoso.Inventory.Api/Contoso.Inventory.Api.csproj",
      "src/Contoso.Inventory.Api/Program.cs",
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
