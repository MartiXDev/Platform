import assert from "node:assert/strict";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  REQUIRED_BOOTSTRAP_INPUTS,
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
});

test("modular monolith verification rejects cross-module implementation references", async () => {
  const temporaryRoot = await createTemporaryBootstrapRoot();
  const billingFeaturePath = join(
    temporaryRoot,
    "tests",
    "fixtures",
    "ModularMonolithGeneratedSolution",
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
