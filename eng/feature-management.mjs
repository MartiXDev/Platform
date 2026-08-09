import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { listFiles } from "./list-files.mjs";

export const FEATURE_MANAGEMENT_SOLUTION_NAME =
  "FeatureManagementGeneratedSolution";
export const FEATURE_MANAGEMENT_SOLUTION_ROOT =
  `tests/fixtures/${FEATURE_MANAGEMENT_SOLUTION_NAME}`;

const FEATURE_MANAGEMENT_CAPABILITY_ID = "feature-management";
const FEATURE_MANAGEMENT_PROVIDER_ID = "microsoft-feature-management";
const FEATURE_MANAGEMENT_CONFIGURATION_SECTION = "feature_management";
const FEATURE_MANAGEMENT_INTERFACE = "IVariantFeatureManager";
const FEATURE_MANAGEMENT_SNAPSHOT_INTERFACE = "IVariantFeatureManagerSnapshot";
const REQUIRED_FEATURE_IDS = Object.freeze([
  "CheckoutV2",
  "DisabledCheckout",
  "TargetedCheckout",
  "CheckoutVariant",
  "RefreshProbe",
  "MissingFilter",
  "MalformedFlag",
  "TelemetryProbe",
]);
const FEATURE_MANAGEMENT_FILE_PATHS = Object.freeze({
  configuration: "appsettings.json",
  manifest: "martix.platform.json",
  applicationProject:
    "src/MartiX.FeatureManagementTestApp/MartiX.FeatureManagementTestApp.csproj",
  composition:
    "src/MartiX.FeatureManagementTestApp/FeatureManagementComposition.cs",
  program: "src/MartiX.FeatureManagementTestApp/Program.cs",
  observer:
    "src/MartiX.FeatureManagementTestApp/FeatureEvaluationObserver.cs",
  authorizationPolicy:
    "src/MartiX.FeatureManagementTestApp/AuthorizationPolicy.cs",
  durableState:
    "src/MartiX.FeatureManagementTestApp/DurableCheckoutState.cs",
  testProject:
    "tests/MartiX.FeatureManagementTestApp.Tests/MartiX.FeatureManagementTestApp.Tests.csproj",
  contractTests:
    "tests/MartiX.FeatureManagementTestApp.Tests/FeatureManagementContractTests.cs",
});

export const FEATURE_MANAGEMENT_FIXTURE_FILES = Object.freeze([
  "AGENTS.md",
  "CONTEXT.md",
  "FeatureManagementGeneratedSolution.slnx",
  "README.md",
  FEATURE_MANAGEMENT_FILE_PATHS.configuration,
  FEATURE_MANAGEMENT_FILE_PATHS.manifest,
  FEATURE_MANAGEMENT_FILE_PATHS.authorizationPolicy,
  FEATURE_MANAGEMENT_FILE_PATHS.durableState,
  FEATURE_MANAGEMENT_FILE_PATHS.observer,
  FEATURE_MANAGEMENT_FILE_PATHS.composition,
  FEATURE_MANAGEMENT_FILE_PATHS.applicationProject,
  FEATURE_MANAGEMENT_FILE_PATHS.program,
  FEATURE_MANAGEMENT_FILE_PATHS.contractTests,
  FEATURE_MANAGEMENT_FILE_PATHS.testProject,
]);

export class FeatureManagementVerificationError extends Error {}

function fail(message) {
  throw new FeatureManagementVerificationError(message);
}

async function readFixtureFile(solutionRoot, relativePath) {
  try {
    return await readFile(resolve(solutionRoot, relativePath), "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      fail(`Missing Feature Management fixture file: ${relativePath}.`);
    }
    throw error;
  }
}

function requireFragments(source, fragments, path) {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) {
      fail(`Feature Management fixture is missing ${fragment} in ${path}.`);
    }
  }
}

function validateManifest(manifest, path) {
  if (
    manifest.kind !== "generated-solution" ||
    manifest.repository?.name !== FEATURE_MANAGEMENT_SOLUTION_NAME ||
    manifest.preset !== "api" ||
    manifest.supportClaims?.length !== 0 ||
    manifest.security?.secretPolicy !== "external-only" ||
    manifest.security?.containsSecrets !== false
  ) {
    fail(`Feature Management fixture manifest is not claim-free API metadata: ${path}.`);
  }

  if (
    !Array.isArray(manifest.capabilities) ||
    manifest.capabilities.length !== 1 ||
    !Array.isArray(manifest.providers) ||
    manifest.providers.length !== 1
  ) {
    fail(
      "Feature Management fixture must contain exactly one selected capability and provider.",
    );
  }

  const providers = manifest.providers.filter(
    ({ id }) => id === FEATURE_MANAGEMENT_PROVIDER_ID,
  );
  if (
    providers.length !== 1 ||
    providers[0].capability !== FEATURE_MANAGEMENT_CAPABILITY_ID ||
    providers[0].state !== "selected"
  ) {
    fail(
      "Feature Management fixture must select microsoft-feature-management exactly once.",
    );
  }

  const capability = manifest.capabilities.find(
    ({ id }) => id === FEATURE_MANAGEMENT_CAPABILITY_ID,
  );
  if (capability?.state !== "selected") {
    fail("Feature Management fixture must select the feature-management capability.");
  }
}

function validateProject(project, path, { testProject = false } = {}) {
  requireFragments(
    project,
    [
      "<TargetFramework>net10.0</TargetFramework>",
      "<OutputType>Exe</OutputType>",
      "<TreatWarningsAsErrors>true</TreatWarningsAsErrors>",
    ],
    path,
  );

  if (project.includes("Microsoft.NET.Test.Sdk")) {
    fail(`Feature Management fixture must not use Microsoft.NET.Test.Sdk: ${path}.`);
  }

  if (testProject) {
    requireFragments(project, ['PackageReference Include="TUnit"'], path);
    requireFragments(
      project,
      [
        'ProjectReference Include="../../src/MartiX.FeatureManagementTestApp/MartiX.FeatureManagementTestApp.csproj"',
      ],
      path,
    );
  } else {
    requireFragments(
      project,
      [
        'PackageReference Include="Microsoft.FeatureManagement" Version="4.6.0"',
        'PackageReference Include="Microsoft.Extensions.Configuration" Version="10.0.0"',
        'PackageReference Include="Microsoft.Extensions.DependencyInjection" Version="10.0.0"',
      ],
      path,
    );
    if (project.includes("Microsoft.FeatureManagement.AspNetCore")) {
      fail(
        "Feature Management fixture must use the direct Microsoft.FeatureManagement package.",
      );
    }
    if (project.includes("ProjectReference")) {
      fail(`Feature Management application must remain isolated: ${path}.`);
    }
  }
}

function validateConfiguration(configuration, path) {
  const featureManagement =
    configuration[FEATURE_MANAGEMENT_CONFIGURATION_SECTION];
  if (
    featureManagement === null ||
    typeof featureManagement !== "object" ||
    Array.isArray(featureManagement) ||
    configuration.FeatureManagement !== undefined ||
    !Array.isArray(featureManagement.feature_flags)
  ) {
    fail(
      `Feature Management configuration must use the current feature_management schema: ${path}.`,
    );
  }

  const featureIds = featureManagement.feature_flags.map(
    (feature) => feature?.id,
  );
  for (const id of REQUIRED_FEATURE_IDS) {
    if (!featureIds.includes(id)) {
      fail(`Feature Management configuration is missing feature ${id}: ${path}.`);
    }
  }

  const targeting = featureManagement.feature_flags.find(
    (feature) => feature?.id === "TargetedCheckout",
  );
  if (
    targeting?.conditions?.client_filters?.[0]?.name !== "Microsoft.Targeting"
  ) {
    fail("TargetedCheckout must use the built-in Microsoft.Targeting filter.");
  }
}

async function validateSourceContracts(solutionRoot) {
  const projectPath = FEATURE_MANAGEMENT_FILE_PATHS.applicationProject;
  const project = await readFixtureFile(solutionRoot, projectPath);
  validateProject(project, projectPath);

  const compositionPath = FEATURE_MANAGEMENT_FILE_PATHS.composition;
  const composition = await readFixtureFile(solutionRoot, compositionPath);
  requireFragments(
    composition,
    [
      "AddFeatureManagement(configuration)",
      "IConfiguration",
      "IgnoreMissingFeatureFilters = false",
      "IgnoreMissingFeatures = false",
    ],
    compositionPath,
  );
  if (
    composition.includes("Microsoft.FeatureManagement.AspNetCore") ||
    /class\s+\w*FeatureManager\b/.test(composition)
  ) {
    fail(
      "Feature Management composition must not wrap or replace the provider manager.",
    );
  }

  const programPath = FEATURE_MANAGEMENT_FILE_PATHS.program;
  requireFragments(
    await readFixtureFile(solutionRoot, programPath),
    [
      "FeatureManagementComposition.AddServices",
      FEATURE_MANAGEMENT_INTERFACE,
      FEATURE_MANAGEMENT_SNAPSHOT_INTERFACE,
    ],
    programPath,
  );

  const observerPath = FEATURE_MANAGEMENT_FILE_PATHS.observer;
  const observer = await readFixtureFile(solutionRoot, observerPath);
  requireFragments(
    observer,
    [
      "ActivityListener",
      "Microsoft.FeatureManagement",
      "FeatureFlag",
      "MaxEvents",
      "ActivityStopped",
    ],
    observerPath,
  );
  if (
    /TargetingId|UserId|Email|GroupId|TargetingContext/i.test(observer) ||
    !observer.includes("observations.Count >= MaxEvents")
  ) {
    fail(
      "Feature Management telemetry evidence must be bounded and omit targeting identifiers.",
    );
  }

  const authorizationPath = FEATURE_MANAGEMENT_FILE_PATHS.authorizationPolicy;
  const authorization = await readFixtureFile(solutionRoot, authorizationPath);
  requireFragments(
    authorization,
    ["AuthorizationPolicy", "RequiredPermission", "permissions.Contains"],
    authorizationPath,
  );
  if (authorization.includes(FEATURE_MANAGEMENT_INTERFACE)) {
    fail("AuthorizationPolicy must not depend on feature evaluation.");
  }

  const durableStatePath = FEATURE_MANAGEMENT_FILE_PATHS.durableState;
  const durableState = await readFixtureFile(solutionRoot, durableStatePath);
  requireFragments(
    durableState,
    ["CheckoutDecision", "Variant", "CaptureDecision"],
    durableStatePath,
  );
  if (
    durableState.includes(FEATURE_MANAGEMENT_INTERFACE) ||
    durableState.includes("IsEnabledAsync") ||
    durableState.includes("GetVariantAsync")
  ) {
    fail("Durable checkout state must capture a decision, not re-evaluate a feature.");
  }

  const testsPath = FEATURE_MANAGEMENT_FILE_PATHS.contractTests;
  const tests = await readFixtureFile(solutionRoot, testsPath);
  requireFragments(
    tests,
    [
      "[Test]",
      "await Assert.That",
      FEATURE_MANAGEMENT_INTERFACE,
      FEATURE_MANAGEMENT_SNAPSHOT_INTERFACE,
      "GetVariantAsync",
      "TargetingContext",
      "FeatureManagementError.MissingFeature",
      "FeatureManagementError.MissingFeatureFilter",
      "FeatureManagementError.InvalidConfigurationSetting",
      "ConfigurationBuilder().Build()",
      "repeatedTargeted",
      "repeatedVariant",
      "AuthorizationPolicy",
      "DurableCheckoutState",
      "CaptureDecision",
      "Reload()",
    ],
    testsPath,
  );
}

export async function validateFeatureManagementFixture({ rootDir, manifest } = {}) {
  const solutionRoot = resolve(
    rootDir ?? process.cwd(),
    FEATURE_MANAGEMENT_SOLUTION_ROOT,
  );
  const actualFiles = await listFiles(solutionRoot, {
    ignoredDirectories: ["bin", "obj"],
  });
  if (
    JSON.stringify(actualFiles) !==
    JSON.stringify(FEATURE_MANAGEMENT_FIXTURE_FILES)
  ) {
    const missing = FEATURE_MANAGEMENT_FIXTURE_FILES.filter(
      (file) => !actualFiles.includes(file),
    );
    const extra = actualFiles.filter(
      (file) => !FEATURE_MANAGEMENT_FIXTURE_FILES.includes(file),
    );
    fail(
      `Feature Management fixture inventory mismatch; missing: ${
        missing.join(", ") || "none"
      }; extra: ${extra.join(", ") || "none"}.`,
    );
  }

  const fixtureManifest =
    manifest ??
    JSON.parse(
      await readFixtureFile(
        solutionRoot,
        FEATURE_MANAGEMENT_FILE_PATHS.manifest,
      ),
    );
  validateManifest(
    fixtureManifest,
    `${FEATURE_MANAGEMENT_SOLUTION_ROOT}/${FEATURE_MANAGEMENT_FILE_PATHS.manifest}`,
  );

  const configurationPath = FEATURE_MANAGEMENT_FILE_PATHS.configuration;
  const configuration = JSON.parse(
    await readFixtureFile(solutionRoot, configurationPath),
  );
  validateConfiguration(configuration, configurationPath);

  const testProjectPath = FEATURE_MANAGEMENT_FILE_PATHS.testProject;
  validateProject(
    await readFixtureFile(solutionRoot, testProjectPath),
    testProjectPath,
    { testProject: true },
  );
  await validateSourceContracts(solutionRoot);

  return {
    status: "passed",
    solution: FEATURE_MANAGEMENT_SOLUTION_NAME,
    provider: FEATURE_MANAGEMENT_PROVIDER_ID,
    schema: FEATURE_MANAGEMENT_CONFIGURATION_SECTION,
    directInterface: FEATURE_MANAGEMENT_INTERFACE,
  };
}
