import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { listFiles } from "./list-files.mjs";

export const FEATURE_MANAGEMENT_SOLUTION_NAME =
  "FeatureManagementGeneratedSolution";
export const FEATURE_MANAGEMENT_SOLUTION_ROOT =
  `tests/fixtures/${FEATURE_MANAGEMENT_SOLUTION_NAME}`;

const EXPECTED_FILES = [
  "AGENTS.md",
  "CONTEXT.md",
  "FeatureManagementGeneratedSolution.slnx",
  "README.md",
  "appsettings.json",
  "martix.platform.json",
  "src/MartiX.FeatureManagementTestApp/AuthorizationPolicy.cs",
  "src/MartiX.FeatureManagementTestApp/DurableCheckoutState.cs",
  "src/MartiX.FeatureManagementTestApp/FeatureEvaluationObserver.cs",
  "src/MartiX.FeatureManagementTestApp/FeatureManagementComposition.cs",
  "src/MartiX.FeatureManagementTestApp/MartiX.FeatureManagementTestApp.csproj",
  "src/MartiX.FeatureManagementTestApp/Program.cs",
  "tests/MartiX.FeatureManagementTestApp.Tests/FeatureManagementContractTests.cs",
  "tests/MartiX.FeatureManagementTestApp.Tests/MartiX.FeatureManagementTestApp.Tests.csproj",
];

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
    ({ id }) => id === "microsoft-feature-management",
  );
  if (
    providers?.length !== 1 ||
    providers[0].capability !== "feature-management" ||
    providers[0].state !== "selected"
  ) {
    fail(
      "Feature Management fixture must select microsoft-feature-management exactly once.",
    );
  }

  const capability = manifest.capabilities.find(
    ({ id }) => id === "feature-management",
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
  if (
    configuration.feature_management === undefined ||
    configuration.FeatureManagement !== undefined ||
    !Array.isArray(configuration.feature_management.feature_flags)
  ) {
    fail(
      `Feature Management configuration must use the current feature_management schema: ${path}.`,
    );
  }

  const featureIds = configuration.feature_management.feature_flags.map(
    ({ id }) => id,
  );
  for (const id of [
    "CheckoutV2",
    "DisabledCheckout",
    "TargetedCheckout",
    "CheckoutVariant",
    "RefreshProbe",
    "MissingFilter",
    "MalformedFlag",
    "TelemetryProbe",
  ]) {
    if (!featureIds.includes(id)) {
      fail(`Feature Management configuration is missing feature ${id}: ${path}.`);
    }
  }

  const targeting = configuration.feature_management.feature_flags.find(
    ({ id }) => id === "TargetedCheckout",
  );
  if (
    targeting?.conditions?.client_filters?.[0]?.name !== "Microsoft.Targeting"
  ) {
    fail("TargetedCheckout must use the built-in Microsoft.Targeting filter.");
  }
}

async function validateSourceContracts(solutionRoot) {
  const projectPath =
    "src/MartiX.FeatureManagementTestApp/MartiX.FeatureManagementTestApp.csproj";
  const project = await readFixtureFile(solutionRoot, projectPath);
  validateProject(project, projectPath);

  const compositionPath =
    "src/MartiX.FeatureManagementTestApp/FeatureManagementComposition.cs";
  const composition = await readFixtureFile(solutionRoot, compositionPath);
  requireFragments(
    composition,
    [
      "AddFeatureManagement(configuration)",
      "IVariantFeatureManager",
      "IVariantFeatureManagerSnapshot",
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

  const programPath = "src/MartiX.FeatureManagementTestApp/Program.cs";
  requireFragments(
    await readFixtureFile(solutionRoot, programPath),
    ["FeatureManagementComposition.AddServices", "IVariantFeatureManager"],
    programPath,
  );

  const observerPath =
    "src/MartiX.FeatureManagementTestApp/FeatureEvaluationObserver.cs";
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
    !observer.includes("Events.Count >= MaxEvents")
  ) {
    fail(
      "Feature Management telemetry evidence must be bounded and omit targeting identifiers.",
    );
  }

  const authorizationPath =
    "src/MartiX.FeatureManagementTestApp/AuthorizationPolicy.cs";
  const authorization = await readFixtureFile(solutionRoot, authorizationPath);
  requireFragments(
    authorization,
    ["AuthorizationPolicy", "RequiredPermission", "permissions.Contains"],
    authorizationPath,
  );
  if (authorization.includes("IVariantFeatureManager")) {
    fail("AuthorizationPolicy must not depend on feature evaluation.");
  }

  const durableStatePath =
    "src/MartiX.FeatureManagementTestApp/DurableCheckoutState.cs";
  const durableState = await readFixtureFile(solutionRoot, durableStatePath);
  requireFragments(
    durableState,
    ["CheckoutDecision", "Variant", "Capture"],
    durableStatePath,
  );
  if (
    durableState.includes("IVariantFeatureManager") ||
    durableState.includes("IsEnabledAsync") ||
    durableState.includes("GetVariantAsync")
  ) {
    fail("Durable checkout state must capture a decision, not re-evaluate a feature.");
  }

  const testsPath =
    "tests/MartiX.FeatureManagementTestApp.Tests/FeatureManagementContractTests.cs";
  const tests = await readFixtureFile(solutionRoot, testsPath);
  requireFragments(
    tests,
    [
      "[Test]",
      "await Assert.That",
      "IVariantFeatureManager",
      "IVariantFeatureManagerSnapshot",
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
      "Reload()",
    ],
    testsPath,
  );
}

export async function validateFeatureManagementFixture({ rootDir, manifest } = {}) {
  const solutionRoot = resolve(rootDir ?? process.cwd(), FEATURE_MANAGEMENT_SOLUTION_ROOT);
  const actualFiles = await listFiles(solutionRoot, {
    ignoredDirectories: ["bin", "obj"],
  });
  if (JSON.stringify(actualFiles) !== JSON.stringify(EXPECTED_FILES)) {
    const missing = EXPECTED_FILES.filter((file) => !actualFiles.includes(file));
    const extra = actualFiles.filter((file) => !EXPECTED_FILES.includes(file));
    fail(
      `Feature Management fixture inventory mismatch; missing: ${
        missing.join(", ") || "none"
      }; extra: ${extra.join(", ") || "none"}.`,
    );
  }

  const fixtureManifest =
    manifest ??
    JSON.parse(
      await readFixtureFile(solutionRoot, "martix.platform.json"),
    );
  validateManifest(
    fixtureManifest,
    `${FEATURE_MANAGEMENT_SOLUTION_ROOT}/martix.platform.json`,
  );

  const configurationPath = "appsettings.json";
  const configuration = JSON.parse(
    await readFixtureFile(solutionRoot, configurationPath),
  );
  validateConfiguration(configuration, configurationPath);

  const testProjectPath =
    "tests/MartiX.FeatureManagementTestApp.Tests/MartiX.FeatureManagementTestApp.Tests.csproj";
  validateProject(
    await readFixtureFile(solutionRoot, testProjectPath),
    testProjectPath,
    { testProject: true },
  );
  await validateSourceContracts(solutionRoot);

  return {
    status: "passed",
    solution: FEATURE_MANAGEMENT_SOLUTION_NAME,
    provider: "microsoft-feature-management",
    schema: "feature_management",
    directInterface: "IVariantFeatureManager",
  };
}
