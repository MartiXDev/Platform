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
import { verifyBootstrap } from "../eng/verify.mjs";

const repositoryRoot = join(import.meta.dirname, "..");
const bootstrapInputs = [
  "martix.platform.json",
  "schemas/martix.platform.schema.json",
  "schemas/quality-gates.schema.json",
  "eng/quality-gates.json",
  "README.md",
  "AGENTS.md",
  "LICENSE",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "PROVENANCE.md",
  "tests/fixtures/RepositoryBootstrapGeneratedSolution/README.md",
  "tests/fixtures/RepositoryBootstrapGeneratedSolution/AGENTS.md",
  "tests/fixtures/RepositoryBootstrapGeneratedSolution/martix.platform.json",
];

async function copyBootstrapInputs(destination) {
  for (const relativePath of bootstrapInputs) {
    const target = join(destination, relativePath);
    await mkdir(dirname(target), { recursive: true });
    await cp(join(repositoryRoot, relativePath), target);
  }
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
});

test("unknown verification cadences fail before reading repository inputs", async () => {
  await assert.rejects(
    () => verifyBootstrap({ cadence: "unsupported", rootDir: repositoryRoot }),
    /Unknown verification cadence: unsupported/,
  );
});

test("manifest validation enforces the declared required fields", async () => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "martix-platform-"));
  await copyBootstrapInputs(temporaryRoot);

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
  const temporaryRoot = await mkdtemp(join(tmpdir(), "martix-platform-"));
  await copyBootstrapInputs(temporaryRoot);

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

test("manifest validation rejects API-key-shaped fields", async () => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "martix-platform-"));
  await copyBootstrapInputs(temporaryRoot);

  const manifestPath = join(temporaryRoot, "martix.platform.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.apiKey = "placeholder";
  await writeFile(manifestPath, JSON.stringify(manifest));

  await assert.rejects(
    () => verifyBootstrap({ cadence: "fast", rootDir: temporaryRoot }),
    /Bootstrap manifest contains a secret-shaped field: martix\.platform\.json\.apiKey/,
  );
});
