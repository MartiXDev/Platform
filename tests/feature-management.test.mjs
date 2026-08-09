import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import {
  FEATURE_MANAGEMENT_SOLUTION_ROOT,
  validateFeatureManagementFixture,
} from "../eng/feature-management.mjs";
import {
  REQUIRED_BOOTSTRAP_INPUTS,
  verifyBootstrap,
} from "../eng/verify.mjs";
import {
  resolveProviderAdmission,
  validateProviderAdmissionCatalog,
  verifyProviderAbsence,
} from "../eng/provider-admission.mjs";

const repositoryRoot = join(import.meta.dirname, "..");
const fixtureRoot = join(repositoryRoot, FEATURE_MANAGEMENT_SOLUTION_ROOT);

test("the feature-management provider uses the current schema and direct interface", async () => {
  const catalog = validateProviderAdmissionCatalog();
  const definition = catalog.find(
    ({ capability, id }) =>
      capability === "feature-management" &&
      id === "microsoft-feature-management",
  );

  assert.deepEqual(definition.requiredConfiguration, ["feature_management"]);
  assert.deepEqual(definition.effects.packages, [
    { id: "Microsoft.FeatureManagement", version: "4.6.0" },
  ]);
  assert.deepEqual(definition.effects.registrations, ["IVariantFeatureManager"]);

  const composition = await readFile(
    join(
      fixtureRoot,
      "src",
      "MartiX.FeatureManagementTestApp",
      "FeatureManagementComposition.cs",
    ),
    "utf8",
  );
  assert.match(
    composition,
    /AddFeatureManagement\(configuration\)/,
  );
  assert.match(composition, /IVariantFeatureManager/);
  assert.doesNotMatch(composition, /FeatureManagement\.AspNetCore/);
});

test("the named Feature Management Generated Solution passes its acceptance seam", async () => {
  const result = await validateFeatureManagementFixture({
    rootDir: repositoryRoot,
  });

  assert.equal(result.status, "passed");
  assert.equal(result.solution, "FeatureManagementGeneratedSolution");
  assert.equal(result.provider, "microsoft-feature-management");
});

test("unselected Feature Management leaves no provider-admission residue", async () => {
  const catalog = validateProviderAdmissionCatalog();
  const admissionFixture = JSON.parse(
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
  const plan = resolveProviderAdmission(admissionFixture.selection);
  const featureManagement = catalog.find(
    ({ capability, id }) =>
      capability === "feature-management" &&
      id === "microsoft-feature-management",
  );

  assert.equal(
    verifyProviderAbsence({
      plan,
      catalog,
      observed: admissionFixture.observed,
    }).outcome,
    "passed",
  );

  for (const effectKind of [
    "packages",
    "configuration",
    "registrations",
    "telemetry",
  ]) {
    const residue = structuredClone(admissionFixture.observed);
    residue[effectKind].push(featureManagement.effects[effectKind][0]);
    assert.throws(
      () => verifyProviderAbsence({ plan, catalog, observed: residue }),
      /microsoft-feature-management/,
    );
  }
});

test("pull-request bootstrap runs the Feature Management acceptance gate", async () => {
  assert.ok(
    REQUIRED_BOOTSTRAP_INPUTS.includes(
      `${FEATURE_MANAGEMENT_SOLUTION_ROOT}/martix.platform.json`,
    ),
  );

  const result = await verifyBootstrap({
    cadence: "pull-request",
    rootDir: repositoryRoot,
  });

  assert.equal(
    result.featureManagementSolution,
    "FeatureManagementGeneratedSolution",
  );
  assert.ok(result.gates.includes("bootstrap.feature-management"));
});
