import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { toDatabaseIdentifier } from "./database-naming.mjs";
import { listFiles } from "./list-files.mjs";
import { findDependencyCycle } from "./module-graph.mjs";

const CADENCES = [
  "fast",
  "pull-request",
  "main-nightly",
  "release-candidate",
];

const GENERATED_SOLUTION_NAME = "RepositoryBootstrapGeneratedSolution";
const GENERATED_SOLUTION_ROOT = `tests/fixtures/${GENERATED_SOLUTION_NAME}`;
const MODULAR_MONOLITH_SOLUTION_NAME = "ModularMonolithGeneratedSolution";
const MODULAR_MONOLITH_SOLUTION_ROOT =
  `tests/fixtures/${MODULAR_MONOLITH_SOLUTION_NAME}`;
const MODULAR_MONOLITH_COMPOSITION_MEMBERS = [
  "AddServices",
  "MapEndpoints",
  "MigrationIdentity",
];
const RELATIONAL_PROVIDER_APIS = Object.freeze({
  postgresql: "UseNpgsql",
  sqlserver: "UseSqlServer",
});
const MANIFEST_PRESETS = new Set(["api", "modular-monolith", "full-stack"]);
const BOOTSTRAP_GATE_IDS = [
  "bootstrap.manifest",
  "bootstrap.governance",
  "bootstrap.generated-solution",
  "bootstrap.modular-monolith",
  "bootstrap.secret-free",
];
const MANIFEST_REQUIRED_PROPERTIES = [
  "$schema",
  "kind",
  "manifestSchemaVersion",
  "platformVersion",
  "platformContractVersion",
  "repository",
  "origin",
  "preset",
  "capabilities",
  "providers",
  "appliedMigrations",
  "supportClaims",
  "security",
  "verification",
];
const MANIFEST_ALLOWED_PROPERTIES = [
  ...MANIFEST_REQUIRED_PROPERTIES,
  "modules",
];

export const REQUIRED_BOOTSTRAP_INPUTS = [
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
  `${GENERATED_SOLUTION_ROOT}/README.md`,
  `${GENERATED_SOLUTION_ROOT}/AGENTS.md`,
  `${GENERATED_SOLUTION_ROOT}/martix.platform.json`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/README.md`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/AGENTS.md`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/CONTEXT.md`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/MartiX.TemplateTestApp.slnx`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/martix.platform.json`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Api/MartiX.TemplateTestApp.Api.csproj`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Api/Program.cs`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Migrator/MartiX.TemplateTestApp.Migrator.csproj`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Migrator/Program.cs`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Orders/MartiX.TemplateTestApp.Orders.csproj`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Orders/OrdersModule.cs`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Orders/Contracts/ModuleContracts/IOrdersStatus.cs`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Orders/Domain/OrdersAggregate.cs`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Orders/Features/Status/OrdersStatus.cs`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Orders/Infrastructure/Persistence/OrdersDbContext.cs`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Orders/Infrastructure/Persistence/OrdersPersistenceModel.cs`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Orders/Infrastructure/Persistence/Migrations/20260101000000_InitialOrders.cs`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Orders/Infrastructure/Persistence/Migrations/OrdersDbContextModelSnapshot.cs`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Billing/MartiX.TemplateTestApp.Billing.csproj`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Billing/BillingModule.cs`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Billing/Contracts/ModuleContracts/IBillingStatus.cs`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Billing/Domain/BillingAggregate.cs`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Billing/Features/Status/BillingStatus.cs`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Billing/Infrastructure/Persistence/BillingDbContext.cs`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Billing/Infrastructure/Persistence/BillingPersistenceModel.cs`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Billing/Infrastructure/Persistence/Migrations/20260101000000_InitialBilling.cs`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Billing/Infrastructure/Persistence/Migrations/BillingDbContextModelSnapshot.cs`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/tests/MartiX.TemplateTestApp.Tests/MartiX.TemplateTestApp.Tests.csproj`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/tests/MartiX.TemplateTestApp.Tests/ModularMonolithCompositionTests.cs`,
];

const FORBIDDEN_SECRET_KEY =
  /(?:secret|password|token|private.?key|access.?key|api.?key|credential)/i;
const ALLOWED_SECRET_METADATA_KEYS = new Set([
  "secretPolicy",
  "containsSecrets",
]);

class BootstrapVerificationError extends Error {}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function fail(message) {
  throw new BootstrapVerificationError(message);
}

async function readRequiredFile(rootDir, relativePath) {
  try {
    return await readFile(resolve(rootDir, relativePath), "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      fail(`Missing required bootstrap input: ${relativePath}`);
    }

    throw error;
  }
}

function requireRecord(value, path) {
  if (!isRecord(value)) {
    fail(`Invalid bootstrap value at ${path}: expected an object.`);
  }
}

function requireString(value, path) {
  if (typeof value !== "string" || value.length === 0) {
    fail(`Invalid bootstrap value at ${path}: expected a non-empty string.`);
  }
}

function requireArray(value, path) {
  if (!Array.isArray(value)) {
    fail(`Invalid bootstrap value at ${path}: expected an array.`);
  }
}

function requireProperty(value, property, path) {
  if (!Object.hasOwn(value, property)) {
    fail(
      `Invalid bootstrap value at ${path}.${property}: required property is missing.`,
    );
  }
}

function rejectUnknownProperties(value, allowedProperties, path) {
  for (const property of Object.keys(value)) {
    if (!allowedProperties.includes(property)) {
      fail(`Invalid bootstrap property at ${path}.${property}.`);
    }
  }
}

function assertSecretFree(
  value,
  path = "manifest",
  subject = "Bootstrap manifest",
) {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertSecretFree(item, `${path}[${index}]`, subject),
    );
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    if (
      FORBIDDEN_SECRET_KEY.test(key) &&
      !ALLOWED_SECRET_METADATA_KEYS.has(key)
    ) {
      fail(`${subject} contains a secret-shaped field: ${path}.${key}`);
    }

    assertSecretFree(child, `${path}.${key}`, subject);
  }
}

function validateManifestSchema(schema) {
  const path = "schemas/martix.platform.schema.json";
  requireRecord(schema, path);
  assertSecretFree(schema, path, "Bootstrap schema");

  if (schema.type !== "object") {
    fail(`${path}.type must be object.`);
  }

  requireArray(schema.required, `${path}.required`);
  const requiredProperties = new Set(schema.required);
  for (const property of MANIFEST_REQUIRED_PROPERTIES) {
    if (!requiredProperties.has(property)) {
      fail(`Manifest schema is missing required property: ${property}`);
    }
  }

  requireRecord(schema.properties, `${path}.properties`);
  for (const property of MANIFEST_REQUIRED_PROPERTIES) {
    if (!Object.hasOwn(schema.properties, property)) {
      fail(`Manifest schema is missing property definition: ${property}`);
    }
  }

  const supportClaims = schema.properties.supportClaims;
  requireRecord(supportClaims, `${path}.properties.supportClaims`);
  if (supportClaims.maxItems !== 0) {
    fail("Manifest schema must keep supportClaims empty during bootstrap.");
  }

  validateClosedObjectSchemas(schema, path);
}

function validateClosedObjectSchemas(value, path) {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      validateClosedObjectSchemas(item, `${path}[${index}]`),
    );
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  if (value.type === "object" && value.additionalProperties !== false) {
    fail(`${path}.additionalProperties must be false.`);
  }

  for (const [key, child] of Object.entries(value)) {
    validateClosedObjectSchemas(child, `${path}.${key}`);
  }
}

function formatSchemaPath(path, issuePath) {
  return issuePath.reduce(
    (currentPath, segment) =>
      typeof segment === "number"
        ? `${currentPath}[${segment}]`
        : `${currentPath}.${segment}`,
    path,
  );
}

function validateAgainstSchema(value, schema, path) {
  const validator = z.fromJSONSchema(schema);
  const result = validator.safeParse(value);
  if (result.success) {
    return;
  }

  const issue = result.error.issues[0];
  const issuePath = formatSchemaPath(path, issue.path);
  if (issue.code === "unrecognized_keys") {
    for (const property of issue.keys) {
      fail(`Invalid bootstrap property at ${issuePath}.${property}.`);
    }
  }

  fail(`Invalid bootstrap value at ${issuePath}: ${issue.message}.`);
}

function validateManifest(manifest, expectedKind, path) {
  requireRecord(manifest, path);
  assertSecretFree(manifest, path);
  rejectUnknownProperties(manifest, MANIFEST_ALLOWED_PROPERTIES, path);

  for (const property of MANIFEST_REQUIRED_PROPERTIES) {
    requireProperty(manifest, property, path);
  }

  for (const property of [
    "$schema",
    "kind",
    "manifestSchemaVersion",
    "platformVersion",
    "platformContractVersion",
  ]) {
    requireString(manifest[property], `${path}.${property}`);
  }

  if (manifest.kind !== expectedKind) {
    fail(
      `Invalid bootstrap value at ${path}.kind: expected ${expectedKind}, received ${manifest.kind}.`,
    );
  }

  if (manifest.preset === "modular-monolith") {
    validateModularMonolithManifest(manifest, path);
  } else if (Object.hasOwn(manifest, "modules")) {
    fail(
      `Invalid bootstrap value at ${path}.modules: modules require the modular-monolith preset.`,
    );
  }

  if (
    manifest.preset !== null &&
    (typeof manifest.preset !== "string" ||
      !MANIFEST_PRESETS.has(manifest.preset))
  ) {
    fail(
      `Invalid bootstrap value at ${path}.preset: expected null or one of ${[
        ...MANIFEST_PRESETS,
      ].join(", ")}.`,
    );
  }

  requireRecord(manifest.repository, `${path}.repository`);
  requireRecord(manifest.origin, `${path}.origin`);
  requireArray(manifest.capabilities, `${path}.capabilities`);
  requireArray(manifest.providers, `${path}.providers`);
  requireArray(manifest.appliedMigrations, `${path}.appliedMigrations`);
  requireArray(manifest.supportClaims, `${path}.supportClaims`);

  if (manifest.supportClaims.length !== 0) {
    fail(
      `Bootstrap manifest must not make a Supported Capability claim: ${path}.supportClaims`,
    );
  }

  requireRecord(manifest.security, `${path}.security`);
  if (
    manifest.security.secretPolicy !== "external-only" ||
    manifest.security.containsSecrets !== false
  ) {
    fail(
      `Bootstrap manifest must declare external-only secret delivery and containsSecrets=false: ${path}.security`,
    );
  }

  requireRecord(manifest.verification, `${path}.verification`);
  requireString(
    manifest.verification.entrypoint,
    `${path}.verification.entrypoint`,
  );
  requireString(manifest.verification.policy, `${path}.verification.policy`);
  requireArray(manifest.verification.cadences, `${path}.verification.cadences`);
  if (
    JSON.stringify(manifest.verification.cadences) !== JSON.stringify(CADENCES)
  ) {
    fail(
      `Bootstrap manifest verification cadences must be ${CADENCES.join(", ")}.`,
    );
  }
}

function validateModularMonolithManifest(manifest, path) {
  requireArray(manifest.modules, `${path}.modules`);
  if (manifest.modules.length === 0) {
    fail(`Invalid bootstrap value at ${path}.modules: expected at least one module.`);
  }

  const moduleNames = new Set();
  for (const [index, module] of manifest.modules.entries()) {
    const modulePath = `${path}.modules[${index}]`;
    requireRecord(module, modulePath);
    rejectUnknownProperties(
      module,
      ["name", "project", "contractsNamespace", "dependencies"],
      modulePath,
    );
    for (const property of [
      "name",
      "project",
      "contractsNamespace",
    ]) {
      requireString(module[property], `${modulePath}.${property}`);
    }
    requireArray(module.dependencies, `${modulePath}.dependencies`);
    if (moduleNames.has(module.name)) {
      fail(`Duplicate Business Module identity: ${module.name}`);
    }
    moduleNames.add(module.name);
  }

  const dependencies = new Map();
  for (const [index, module] of manifest.modules.entries()) {
    const modulePath = `${path}.modules[${index}]`;
    const providers = [];
    for (const [dependencyIndex, provider] of module.dependencies.entries()) {
      requireString(
        provider,
        `${modulePath}.dependencies[${dependencyIndex}]`,
      );
      if (!moduleNames.has(provider)) {
        fail(
          `Unknown Business Module dependency at ${modulePath}.dependencies[${dependencyIndex}]: ${provider}.`,
        );
      }
      if (provider === module.name) {
        fail(`Business Module ${module.name} cannot depend on itself.`);
      }
      if (providers.includes(provider)) {
        fail(`Duplicate Business Module dependency: ${module.name} -> ${provider}.`);
      }
      providers.push(provider);
    }
    dependencies.set(module.name, providers);
  }

  const cycle = findDependencyCycle(
    [...moduleNames],
    (moduleName) => dependencies.get(moduleName),
  );
  if (cycle !== null) {
    fail(
      `Business Module dependency graph must be acyclic: ${cycle.join(" -> ")}.`,
    );
  }
}

function modularMonolithExpectedFiles(manifest) {
  const applicationName = manifest.repository.name;
  const files = [
    "AGENTS.md",
    "CONTEXT.md",
    `${applicationName}.slnx`,
    "README.md",
    "martix.platform.json",
    `src/${applicationName}.Api/${applicationName}.Api.csproj`,
    `src/${applicationName}.Api/Program.cs`,
    `src/${applicationName}.Migrator/${applicationName}.Migrator.csproj`,
    `src/${applicationName}.Migrator/Program.cs`,
    `tests/${applicationName}.Tests/${applicationName}.Tests.csproj`,
    `tests/${applicationName}.Tests/ModularMonolithCompositionTests.cs`,
  ];

  for (const module of manifest.modules) {
    const project = module.project;
    const projectName = project.slice("src/".length);
    files.push(
      `${project}/${projectName}.csproj`,
      `${project}/${module.name}Module.cs`,
      `${project}/Contracts/ModuleContracts/I${module.name}Status.cs`,
      `${project}/Domain/${module.name}Aggregate.cs`,
      `${project}/Features/Status/${module.name}Status.cs`,
      `${project}/Infrastructure/Persistence/${module.name}DbContext.cs`,
      `${project}/Infrastructure/Persistence/${module.name}PersistenceModel.cs`,
      `${project}/Infrastructure/Persistence/Migrations/20260101000000_Initial${module.name}.cs`,
      `${project}/Infrastructure/Persistence/Migrations/${module.name}DbContextModelSnapshot.cs`,
    );
  }

  return files.sort();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractMsbuildItemIncludes(projectSource, itemName) {
  const itemPattern = new RegExp(
    `<${escapeRegExp(
      itemName,
    )}\\b[^>]*\\bInclude\\s*=\\s*(?:"([^"]+)"|'([^']+)')[^>]*\\/?>`,
    "g",
  );
  return [...projectSource.matchAll(itemPattern)].map(
    (match) => match[1] ?? match[2],
  );
}

function extractProjectReferences(projectSource) {
  return extractMsbuildItemIncludes(projectSource, "ProjectReference").map(
    (reference) => reference.replaceAll("\\", "/"),
  );
}

function validateExactValues(actual, expected, path, description) {
  const actualValues = [...actual].sort();
  const expectedValues = [...expected].sort();
  if (JSON.stringify(actualValues) !== JSON.stringify(expectedValues)) {
    fail(
      `Invalid Modular Monolith ${description} at ${path}: expected ${
        expectedValues.join(", ") || "none"
      }; received ${actualValues.join(", ") || "none"}.`,
    );
  }
}

function validateProjectReferences(projectSource, expected, path) {
  validateExactValues(
    extractProjectReferences(projectSource),
    expected,
    path,
    "project references",
  );
}

function extractInternalsVisibleTo(projectSource) {
  return extractMsbuildItemIncludes(projectSource, "InternalsVisibleTo");
}

function validateInternalsVisibleTo(projectSource, expected, path) {
  validateExactValues(
    extractInternalsVisibleTo(projectSource),
    expected,
    path,
    "test visibility",
  );
}

function extractPublicTypeNames(source) {
  return [
    ...source.matchAll(
      /\bpublic\s+(?:(?:abstract|file|partial|readonly|ref|sealed|static)\s+)*(?:class|delegate|enum|interface|record|struct)\s+([A-Za-z_][A-Za-z0-9_]*)/g,
    ),
  ]
    .map((match) => match[1])
    .sort();
}

function validatePublicContracts(module, contractsSource, path) {
  const actualDeclarations = extractPublicTypeNames(contractsSource);
  const expectedDeclarations = [
    `I${module.name}Status`,
    `${module.name}StatusResponse`,
  ].sort();
  if (
    JSON.stringify(actualDeclarations) !==
    JSON.stringify(expectedDeclarations)
  ) {
    fail(
      `Business Module ${module.name} must expose public Contracts declarations in ${path}.`,
    );
  }
}

function hasPublicStaticMember(source, memberName) {
  return new RegExp(
    `\\bpublic\\s+static\\b[^;{}\\r\\n]*\\b${escapeRegExp(
      memberName,
    )}\\s*(?:\\(|\\{|=>|=)`,
  ).test(source);
}

function validateInternalModuleSource(module, source, path) {
  if (extractPublicTypeNames(source).length > 0) {
    fail(
      `Business Module ${module.name} must keep non-Contracts types internal: ${path}.`,
    );
  }
}

function validateExecutableProject(projectSource, path, label) {
  if (!/<OutputType>\s*Exe\s*<\/OutputType>/.test(projectSource)) {
    fail(`${label} project must be an executable: ${path}.`);
  }
}

function moduleProjectName(manifest, module, path) {
  const projectPrefix = "src/";
  if (!module.project.startsWith(projectPrefix)) {
    fail(
      `Invalid Modular Monolith module project at ${path}.project: expected a src/ path.`,
    );
  }

  const projectName = module.project.slice(projectPrefix.length);
  const expectedProjectName = `${manifest.repository.name}.${module.name}`;
  if (projectName !== expectedProjectName || projectName.includes("/")) {
    fail(
      `Invalid Modular Monolith module project at ${path}.project: expected ${expectedProjectName}.`,
    );
  }

  if (module.contractsNamespace !== `${projectName}.Contracts`) {
    fail(
      `Invalid Modular Monolith Contracts namespace at ${path}.contractsNamespace: expected ${projectName}.Contracts.`,
    );
  }

  return projectName;
}

function validateContractsOnlyReferences(module, modules, source) {
  for (const provider of modules) {
    if (provider.name === module.name) {
      continue;
    }

    const providerNamespace = provider.project.slice("src/".length);
    const namespacePattern = new RegExp(
      `\\b${escapeRegExp(providerNamespace)}(?:\\.[A-Za-z_][A-Za-z0-9_]*)*(?![A-Za-z0-9_])`,
      "g",
    );
    const allowedNamespace = module.dependencies.includes(provider.name)
      ? provider.contractsNamespace
      : null;

    for (const match of source.matchAll(namespacePattern)) {
      const reference = match[0];
      const referencesAllowedNamespace =
        allowedNamespace !== null &&
        (reference === allowedNamespace ||
          reference.startsWith(`${allowedNamespace}.`));
      if (!referencesAllowedNamespace) {
        fail(
          `Business Module ${module.name} may consume only another module's Contracts namespace; found ${reference} in its source.`,
        );
      }
    }
  }
}

async function validateModularMonolithComposition(
  solutionRoot,
  actualFiles,
  manifest,
) {
  const applicationName = manifest.repository.name;
  const modules = manifest.modules;
  const relationalProviders = manifest.providers.filter(
    (provider) => provider?.capability === "relational-persistence",
  );
  if (
    relationalProviders.length !== 1 ||
    relationalProviders[0]?.state !== "selected" ||
    !Object.hasOwn(RELATIONAL_PROVIDER_APIS, relationalProviders[0]?.id)
  ) {
    fail(
      "Modular Monolith manifest must select exactly one supported relational provider.",
    );
  }
  const relationalProvider = relationalProviders[0].id;
  const relationalCapability = manifest.capabilities.find(
    (capability) => capability?.id === "modular-monolith.relational-persistence",
  );
  if (relationalCapability?.state !== "selected") {
    fail(
      "Modular Monolith manifest must select the relational-persistence capability.",
    );
  }
  const moduleProjectNames = new Map();
  for (const [index, module] of modules.entries()) {
    moduleProjectNames.set(
      module.name,
      moduleProjectName(
        manifest,
        module,
        `modular-monolith.modules[${index}]`,
      ),
    );
  }

  const readSolutionFile = (relativePath) =>
    readFile(resolve(solutionRoot, relativePath), "utf8");
  const moduleProjectReference = (projectName) =>
    `../${projectName}/${projectName}.csproj`;
  const allModuleProjectReferences = modules.map(({ name }) =>
    moduleProjectReference(moduleProjectNames.get(name)),
  );
  const dependencyProjectReferences = (module) =>
    module.dependencies.map(
      (dependency) =>
        moduleProjectReference(moduleProjectNames.get(dependency)),
    );

  const apiProjectPath = `src/${applicationName}.Api/${applicationName}.Api.csproj`;
  const apiProject = await readSolutionFile(apiProjectPath);
  validateProjectReferences(
    apiProject,
    allModuleProjectReferences,
    apiProjectPath,
  );
  validateExecutableProject(apiProject, apiProjectPath, "Modular Monolith API");
  validateInternalsVisibleTo(apiProject, [], apiProjectPath);
  const apiSource = await readSolutionFile(
    `src/${applicationName}.Api/Program.cs`,
  );
  for (const module of modules) {
    if (!apiSource.includes(`${module.name}Module.AddServices(services, configuration);`)) {
      fail(
        `API composition is missing ${module.name}Module.AddServices(services, configuration).`,
      );
    }
    if (!apiSource.includes(`${module.name}Module.MapEndpoints(app);`)) {
      fail(
        `API composition is missing ${module.name}Module.MapEndpoints(app).`,
      );
    }
  }
  if (/\b(?:Migrate|EnsureCreated|UseSeeding|HasData)(?:Async)?\s*\(/.test(apiSource)) {
    fail("Modular Monolith API composition must not migrate, create, or seed the database.");
  }

  const migratorProjectPath = `src/${applicationName}.Migrator/${applicationName}.Migrator.csproj`;
  const migratorProject = await readSolutionFile(migratorProjectPath);
  validateProjectReferences(
    migratorProject,
    allModuleProjectReferences,
    migratorProjectPath,
  );
  validateExecutableProject(
    migratorProject,
    migratorProjectPath,
    "Modular Monolith Migrator",
  );
  validateInternalsVisibleTo(migratorProject, [], migratorProjectPath);
  const migratorSource = await readSolutionFile(
    `src/${applicationName}.Migrator/Program.cs`,
  );
  if (
    !/operation\s+is\s+not\s+\("validate"\s+or\s+"script"\s+or\s+"apply"\)/.test(
      migratorSource,
    )
  ) {
    fail(
      "Modular Monolith Migrator must expose exactly validate, script, and apply operations.",
    );
  }
  for (const module of modules) {
    if (
      !migratorSource.includes(
        `${module.name}Module.AddMigrationServices(builder.Services, builder.Configuration);`,
      ) ||
      !migratorSource.includes(
        `await ${module.name}Module.ExecuteMigrationAsync(`,
      )
    ) {
      fail(
        `Migrator composition is missing the privileged persistence boundary for ${module.name}.`,
      );
    }
  }

  const testProjectPath = `tests/${applicationName}.Tests/${applicationName}.Tests.csproj`;
  const testProject = await readSolutionFile(testProjectPath);
  validateProjectReferences(
    testProject,
    [
      `../../src/${applicationName}.Api/${applicationName}.Api.csproj`,
      `../../src/${applicationName}.Migrator/${applicationName}.Migrator.csproj`,
      ...modules.map(
        (module) =>
          `../../${module.project}/${moduleProjectNames.get(module.name)}.csproj`,
      ),
    ],
    testProjectPath,
  );
  validateExecutableProject(
    testProject,
    testProjectPath,
    "Modular Monolith test",
  );
  validateInternalsVisibleTo(testProject, [], testProjectPath);
  if (!/<PackageReference\b[^>]*\bInclude="TUnit"/.test(testProject)) {
    fail(`Modular Monolith test project must reference TUnit: ${testProjectPath}.`);
  }
  const testSource = await readSolutionFile(
    `tests/${applicationName}.Tests/ModularMonolithCompositionTests.cs`,
  );
  if (!/\[Test\]/.test(testSource) || !/await\s+Assert\.That/.test(testSource)) {
    fail(
      "Modular Monolith acceptance tests must use TUnit tests with awaited assertions.",
    );
  }

  for (const module of modules) {
    const projectName = moduleProjectNames.get(module.name);
    const projectPath = `${module.project}/${projectName}.csproj`;
    const project = await readSolutionFile(projectPath);
    validateProjectReferences(
      project,
      dependencyProjectReferences(module),
      projectPath,
    );
    validateInternalsVisibleTo(
      project,
      [`${applicationName}.Tests`],
      projectPath,
    );

    const sourcePaths = actualFiles.filter(
      (file) => file.startsWith(`${module.project}/`) && file.endsWith(".cs"),
    );
    const source = (
      await Promise.all(sourcePaths.map((file) => readSolutionFile(file)))
    ).join("\n");
    validateContractsOnlyReferences(module, modules, source);

    const contractsPath = `${module.project}/Contracts/ModuleContracts/I${module.name}Status.cs`;
    const contractsSource = await readSolutionFile(contractsPath);
    if (
      !new RegExp(
        `namespace\\s+${escapeRegExp(
          module.contractsNamespace,
        )}\\.ModuleContracts\\s*;`,
      ).test(contractsSource)
    ) {
      fail(
        `Business Module ${module.name} must declare its public Contracts namespace in ${contractsPath}.`,
      );
    }
    validatePublicContracts(module, contractsSource, contractsPath);

    const compositionPath = `${module.project}/${module.name}Module.cs`;
    const compositionSource = await readSolutionFile(compositionPath);
    if (
      !new RegExp(
        `public\\s+static\\s+class\\s+${escapeRegExp(module.name)}Module`,
      ).test(compositionSource) ||
      !MODULAR_MONOLITH_COMPOSITION_MEMBERS.every((member) =>
        hasPublicStaticMember(compositionSource, member),
      )
    ) {
      fail(
        `Business Module ${module.name} must expose explicit composition in ${compositionPath}.`,
      );
    }
    if (
      JSON.stringify(extractPublicTypeNames(compositionSource)) !==
      JSON.stringify([`${module.name}Module`])
    ) {
      fail(
        `Business Module ${module.name} must keep its composition public surface explicit in ${compositionPath}.`,
      );
    }

    const domainSource = await readSolutionFile(
      `${module.project}/Domain/${module.name}Aggregate.cs`,
    );
    const featureSource = await readSolutionFile(
      `${module.project}/Features/Status/${module.name}Status.cs`,
    );
    const persistenceContextPath = `${module.project}/Infrastructure/Persistence/${module.name}DbContext.cs`;
    const persistenceModelPath = `${module.project}/Infrastructure/Persistence/${module.name}PersistenceModel.cs`;
    const migrationPath = `${module.project}/Infrastructure/Persistence/Migrations/20260101000000_Initial${module.name}.cs`;
    const snapshotPath = `${module.project}/Infrastructure/Persistence/Migrations/${module.name}DbContextModelSnapshot.cs`;
    const persistenceContextSource = await readSolutionFile(
      persistenceContextPath,
    );
    const persistenceModelSource = await readSolutionFile(persistenceModelPath);
    const migrationSource = await readSolutionFile(migrationPath);
    const snapshotSource = await readSolutionFile(snapshotPath);
    const persistenceSource = [
      compositionSource,
      domainSource,
      featureSource,
      persistenceContextSource,
      persistenceModelSource,
      migrationSource,
      snapshotSource,
    ].join("\n");
    const schema = toDatabaseIdentifier(module.name);
    const table = `${schema}_aggregate`;
    const providerApi = RELATIONAL_PROVIDER_APIS[relationalProvider];
    const otherProviderApi = Object.values(RELATIONAL_PROVIDER_APIS).find(
      (api) => api !== providerApi,
    );
    const expectedTextType =
      relationalProvider === "postgresql"
        ? 'type: "character varying(200)"'
        : 'type: "nvarchar(200)"';
    const hasExplicitAggregateConfiguration = [
      `internal sealed class ${module.name}AggregateConfiguration`,
      `IEntityTypeConfiguration<${module.name}Aggregate>`,
      `ApplyConfiguration(new ${module.name}AggregateConfiguration())`,
    ].every((fragment) => persistenceModelSource.includes(fragment));
    const hasExplicitConcurrencyMapping =
      /HasColumnName\("concurrency_token"\)[\s\S]*?IsConcurrencyToken\(\)[\s\S]*?ValueGeneratedNever\(\)/.test(
        persistenceModelSource,
      );
    const hasSeparatePersistenceConfigurations = [
      'AddPersistence(services, configuration, "Database")',
      'AddPersistence(services, configuration, "MigrationDatabase")',
    ].every((fragment) => compositionSource.includes(fragment));
    const hasDeterministicMigrationAndSnapshot = [
      `[Migration("20260101000000_Initial${module.name}")]`,
      `EnsureSchema(name: "${schema}")`,
      `name: "${table}"`,
      "concurrency_token = table.Column<Guid>",
      expectedTextType,
      "created_at = table.Column",
      "updated_at = table.Column",
      "protected override void Down",
      "DropTable(",
    ].every((fragment) => migrationSource.includes(fragment)) &&
      [
        `internal partial class ${module.name}DbContextModelSnapshot : ModelSnapshot`,
        `HasDefaultSchema("${schema}")`,
        'Property<Guid>("ConcurrencyToken")',
        "IsConcurrencyToken()",
      ].every((fragment) => snapshotSource.includes(fragment));
    const hasMigrationOperations = [
      "CanConnectAsync",
      "GetAppliedMigrationsAsync",
      "GetPendingMigrationsAsync",
      "HasPendingModelChanges",
      "GenerateScript(",
      "MigrationsSqlGenerationOptions.Idempotent",
      "MigrateAsync",
      "ApplyAndValidateAsync",
    ].every((fragment) => compositionSource.includes(fragment));
    if (
      !new RegExp(
        `internal\\s+sealed\\s+class\\s+${escapeRegExp(module.name)}Aggregate`,
      ).test(domainSource) ||
      !new RegExp(
        `internal\\s+sealed\\s+class\\s+${escapeRegExp(
          module.name,
        )}StatusOperation`,
      ).test(featureSource) ||
      !new RegExp(
        `internal\\s+static\\s+class\\s+${escapeRegExp(
          module.name,
        )}StatusEndpoint`,
      ).test(featureSource)
    ) {
      fail(
        `Business Module ${module.name} must keep Domain and feature slices internal.`,
      );
    }
    if (
      !new RegExp(
        `internal\\s+sealed\\s+class\\s+${escapeRegExp(
          module.name,
        )}DbContext\\s*:\\s*DbContext`,
      ).test(persistenceContextSource) ||
      !persistenceContextSource.includes(`HasDefaultSchema("${schema}")`) ||
      !persistenceContextSource.includes(
        `DbSet<${module.name}Aggregate>`,
      )
    ) {
      fail(
        `Business Module ${module.name} must own an internal relational DbContext in ${persistenceContextPath}.`,
      );
    }
    if (
      !hasExplicitAggregateConfiguration ||
      !persistenceModelSource.includes(`ToTable("${table}", "${schema}")`) ||
      !persistenceModelSource.includes("HasEntityTimestamps()") ||
      !hasExplicitConcurrencyMapping
    ) {
      fail(
        `Business Module ${module.name} must use an explicit configuration with portable relational naming and concurrency mapping in ${persistenceModelPath}.`,
      );
    }
    if (
      !compositionSource.includes(`${providerApi}(`) ||
      compositionSource.includes(`${otherProviderApi}(`) ||
      !compositionSource.includes(
        `MigrationsHistoryTable("__ef_migrations_history", "${schema}")`,
      ) ||
      !hasSeparatePersistenceConfigurations ||
      !compositionSource.includes(
        "public static void AddMigrationServices",
      )
    ) {
      fail(
        `Business Module ${module.name} must select one provider, compose its migration history explicitly, and keep runtime Database separate from MigrationDatabase configuration.`,
      );
    }
    if (
      !hasDeterministicMigrationAndSnapshot
    ) {
      fail(
        `Business Module ${module.name} must include deterministic migrations and a matching snapshot.`,
      );
    }
    if (
      !domainSource.includes("IHasEntityTimestamps") ||
      !domainSource.includes("DateTimeOffset") ||
      !domainSource.includes("ConcurrencyToken") ||
      !featureSource.includes(`${module.name}DbContext`) ||
      !featureSource.includes("AsNoTracking()") ||
      !featureSource.includes(`Specification<${module.name}Aggregate>`)
    ) {
      fail(
        `Business Module ${module.name} must expose direct DbContext persistence operations with UTC timestamps and opt-in concurrency.`,
      );
    }
    if (!hasMigrationOperations) {
      fail(
        `Business Module ${module.name} migration composition must validate connectivity, migration history, model state, idempotent scripts, and post-apply state.`,
      );
    }
    if (/\b(?:IUnitOfWork|UnitOfWork|IRepository|Repository)\b/.test(persistenceSource)) {
      fail(
        `Business Module ${module.name} must not introduce repository or unit-of-work persistence abstractions.`,
      );
    }
    validateInternalModuleSource(
      module,
      domainSource,
      `${module.project}/Domain/${module.name}Aggregate.cs`,
    );
    validateInternalModuleSource(
      module,
      featureSource,
      `${module.project}/Features/Status/${module.name}Status.cs`,
    );
    for (const [source, path] of [
      [persistenceContextSource, persistenceContextPath],
      [persistenceModelSource, persistenceModelPath],
      [migrationSource, migrationPath],
      [snapshotSource, snapshotPath],
    ]) {
      validateInternalModuleSource(module, source, path);
    }
  }
}

async function validateModularMonolithSolution(rootDir, manifest) {
  const solutionRoot = resolve(rootDir, MODULAR_MONOLITH_SOLUTION_ROOT);
  const actualFiles = await listFiles(solutionRoot);
  const expectedFiles = modularMonolithExpectedFiles(manifest);
  if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) {
    const missing = expectedFiles.filter((file) => !actualFiles.includes(file));
    const extra = actualFiles.filter((file) => !expectedFiles.includes(file));
    fail(
      `Modular Monolith Generated Solution inventory mismatch; missing: ${
        missing.join(", ") || "none"
      }; extra: ${extra.join(", ") || "none"}.`,
    );
  }

  const sourceFiles = await Promise.all(
    actualFiles
      .filter((file) => file.endsWith(".cs") || file.endsWith(".csproj"))
      .map((file) => readFile(resolve(solutionRoot, file), "utf8")),
  );
  const source = sourceFiles.join("\n");
  if (
    /Assembly\.Get|GetTypes\(|MediatR|Shared\.Contracts|Microsoft\.NET\.Test\.Sdk/.test(
      source,
    )
  ) {
    fail(
      "Modular Monolith Generated Solution contains discovery, mediator, shared-contract, or incompatible test-runner residue.",
    );
  }

  await validateModularMonolithComposition(solutionRoot, actualFiles, manifest);
}

function validateQualityGatePolicy(policy) {
  requireRecord(policy, "eng/quality-gates.json");
  requireString(policy.policyVersion, "eng/quality-gates.json.policyVersion");

  if (policy.stage !== "bootstrap") {
    fail("eng/quality-gates.json.stage must be bootstrap.");
  }

  requireArray(policy.supportClaims, "eng/quality-gates.json.supportClaims");
  if (policy.supportClaims.length !== 0) {
    fail("Bootstrap quality policy must not make a Supported Capability claim.");
  }

  requireArray(policy.cadences, "eng/quality-gates.json.cadences");
  const declaredCadences = policy.cadences.map((cadence) => cadence?.id);
  if (
    CADENCES.some((cadence) => !declaredCadences.includes(cadence)) ||
    new Set(declaredCadences).size !== declaredCadences.length
  ) {
    fail(
      `eng/quality-gates.json.cadences must declare each cadence exactly once: ${CADENCES.join(", ")}.`,
    );
  }

  requireArray(policy.gates, "eng/quality-gates.json.gates");
  const gateIds = new Set();
  for (const gate of policy.gates) {
    requireRecord(gate, "eng/quality-gates.json.gates[]");
    requireString(gate.id, "eng/quality-gates.json.gates[].id");
    if (!BOOTSTRAP_GATE_IDS.includes(gate.id)) {
      fail(`Unsupported bootstrap quality gate: ${gate.id}`);
    }
    requireString(gate.family, `gate ${gate.id}.family`);
    requireString(gate.owner, `gate ${gate.id}.owner`);
    if (gate.required !== true) {
      fail(`Bootstrap quality gate ${gate.id} must be required.`);
    }
    requireArray(gate.cadences, `gate ${gate.id}.cadences`);
    requireString(gate.purpose, `gate ${gate.id}.purpose`);

    if (gateIds.has(gate.id)) {
      fail(`Duplicate quality gate identity: ${gate.id}`);
    }
    gateIds.add(gate.id);
  }

  for (const requiredGate of BOOTSTRAP_GATE_IDS) {
    if (!gateIds.has(requiredGate)) {
      fail(`Missing required bootstrap quality gate: ${requiredGate}`);
    }
  }

  for (const cadence of CADENCES) {
    for (const gate of policy.gates) {
      if (!gate.cadences.includes(cadence)) {
        fail(`Required gate ${gate.id} is not declared for cadence ${cadence}.`);
      }
    }
  }
}

function validateGovernanceDocuments(documents) {
  const checks = [
    ["CONTRIBUTING.md", "MartiXDev/Platform"],
    ["SECURITY.md", "security"],
    ["PROVENANCE.md", "canonical"],
  ];

  for (const [relativePath, expectedText] of checks) {
    if (!documents.get(relativePath).toLowerCase().includes(expectedText.toLowerCase())) {
      fail(
        `Bootstrap governance input ${relativePath} does not identify its required authority.`,
      );
    }
  }
}

export async function verifyBootstrap({
  cadence = "fast",
  rootDir = process.cwd(),
} = {}) {
  if (!CADENCES.includes(cadence)) {
    fail(
      `Unknown verification cadence: ${cadence}. Expected one of ${CADENCES.join(", ")}.`,
    );
  }

  const root = resolve(rootDir);
  const documents = new Map();
  for (const relativePath of REQUIRED_BOOTSTRAP_INPUTS) {
    documents.set(relativePath, await readRequiredFile(root, relativePath));
  }

  const parseJson = (relativePath) => {
    try {
      return JSON.parse(documents.get(relativePath));
    } catch (error) {
      if (error instanceof SyntaxError) {
        fail(`Invalid JSON in bootstrap input: ${relativePath}: ${error.message}`);
      }

      throw error;
    }
  };

  const manifest = parseJson("martix.platform.json");
  const manifestSchema = parseJson("schemas/martix.platform.schema.json");
  const qualityGateSchema = parseJson("schemas/quality-gates.schema.json");
  const qualityPolicy = parseJson("eng/quality-gates.json");
  const generatedManifest = parseJson(
    `${GENERATED_SOLUTION_ROOT}/martix.platform.json`,
  );
  const modularMonolithManifest = parseJson(
    `${MODULAR_MONOLITH_SOLUTION_ROOT}/martix.platform.json`,
  );

  validateManifestSchema(manifestSchema);
  requireRecord(qualityGateSchema, "schemas/quality-gates.schema.json");
  if (qualityGateSchema.type !== "object") {
    fail("schemas/quality-gates.schema.json.type must be object.");
  }
  validateClosedObjectSchemas(
    qualityGateSchema,
    "schemas/quality-gates.schema.json",
  );
  assertSecretFree(
    qualityGateSchema,
    "schemas/quality-gates.schema.json",
    "Bootstrap quality schema",
  );
  assertSecretFree(
    qualityPolicy,
    "eng/quality-gates.json",
    "Bootstrap quality policy",
  );

  validateManifest(manifest, "platform-repository", "martix.platform.json");
  validateAgainstSchema(manifest, manifestSchema, "martix.platform.json");
  validateManifest(
    generatedManifest,
    "generated-solution",
    `${GENERATED_SOLUTION_ROOT}/martix.platform.json`,
  );
  validateAgainstSchema(
    generatedManifest,
    manifestSchema,
    `${GENERATED_SOLUTION_ROOT}/martix.platform.json`,
  );
  validateManifest(
    modularMonolithManifest,
    "generated-solution",
    `${MODULAR_MONOLITH_SOLUTION_ROOT}/martix.platform.json`,
  );
  validateAgainstSchema(
    modularMonolithManifest,
    manifestSchema,
    `${MODULAR_MONOLITH_SOLUTION_ROOT}/martix.platform.json`,
  );
  validateAgainstSchema(
    qualityPolicy,
    qualityGateSchema,
    "eng/quality-gates.json",
  );
  validateQualityGatePolicy(qualityPolicy);
  validateGovernanceDocuments(documents);
  await validateModularMonolithSolution(root, modularMonolithManifest);

  const gates = qualityPolicy.gates
    .filter((gate) => gate.cadences.includes(cadence))
    .map((gate) => gate.id);

  if (!gates.includes("bootstrap.manifest")) {
    fail(`Quality policy does not run bootstrap.manifest for cadence ${cadence}.`);
  }

  return {
    status: "passed",
    cadence,
    gates,
    generatedSolution: GENERATED_SOLUTION_NAME,
    modularMonolithSolution: MODULAR_MONOLITH_SOLUTION_NAME,
  };
}

async function runCli() {
  const cadence = process.argv[2] ?? "fast";
  const result = await verifyBootstrap({ cadence });
  console.log(JSON.stringify(result, null, 2));
}

const invokedFile = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : null;

if (invokedFile === import.meta.url) {
  runCli().catch((error) => {
    if (error instanceof BootstrapVerificationError) {
      console.error(`Verification failed: ${error.message}`);
    } else {
      console.error("Verification failed due to an unexpected internal error.");
    }
    process.exitCode = 1;
  });
}
