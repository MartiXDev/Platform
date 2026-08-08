import {
  mkdir,
  readdir,
  writeFile,
} from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { toDatabaseIdentifier } from "./database-naming.mjs";
import { findDependencyCycle } from "./module-graph.mjs";

export const MODULAR_MONOLITH_PRESET = "modular-monolith";
export const MODULAR_MONOLITH_MANIFEST_SCHEMA_VERSION = "1.0.0";
export const MODULAR_MONOLITH_PLATFORM_VERSION = "0.1.0-preview.1";
export const MODULAR_MONOLITH_CANONICAL_REPOSITORY =
  "https://github.com/MartiXDev/Platform";
export const MODULAR_MONOLITH_MANIFEST_SCHEMA_URI =
  "https://github.com/MartiXDev/Platform/schemas/martix.platform.schema.json";
export const MODULAR_MONOLITH_VERIFICATION_CADENCES = Object.freeze([
  "fast",
  "pull-request",
  "main-nightly",
  "release-candidate",
]);

export const MODULAR_MONOLITH_CAPABILITY_MATRIX = Object.freeze([
  Object.freeze({
    id: "kernel.result-error",
    classification: "required",
    provider: null,
  }),
  Object.freeze({
    id: "aspnetcore.failure-adapter",
    classification: "required",
    provider: null,
  }),
  Object.freeze({
    id: "analyzers.contract-diagnostics",
    classification: "required",
    provider: null,
  }),
  Object.freeze({
    id: "api.explicit-composition",
    classification: "required",
    provider: null,
  }),
  Object.freeze({
    id: "api.openapi",
    classification: "required",
    provider: null,
  }),
  Object.freeze({
    id: "api.safe-failure",
    classification: "required",
    provider: null,
  }),
  Object.freeze({
    id: "modular-monolith.business-modules",
    classification: "required",
    provider: null,
  }),
  Object.freeze({
    id: "modular-monolith.contracts-only-graph",
    classification: "required",
    provider: null,
  }),
  Object.freeze({
    id: "modular-monolith.explicit-composition",
    classification: "required",
    provider: null,
  }),
  Object.freeze({
    id: "modular-monolith.one-shot-migrator",
    classification: "required",
    provider: null,
  }),
  Object.freeze({
    id: "modular-monolith.relational-persistence",
    classification: "required",
    provider: "relational",
  }),
  Object.freeze({
    id: "modular-monolith.reliable-integration-events",
    classification: "required",
    provider: null,
  }),
]);

export const MODULAR_MONOLITH_BASELINE_CAPABILITIES = Object.freeze(
  MODULAR_MONOLITH_CAPABILITY_MATRIX.map((capability) => capability.id),
);

const PLATFORM_PACKAGE_REFERENCES = Object.freeze([
  Object.freeze({
    id: "MartiX.Platform",
    version: MODULAR_MONOLITH_PLATFORM_VERSION,
  }),
  Object.freeze({
    id: "MartiX.Platform.AspNetCore",
    version: MODULAR_MONOLITH_PLATFORM_VERSION,
  }),
  Object.freeze({
    id: "MartiX.Platform.Analyzers",
    version: MODULAR_MONOLITH_PLATFORM_VERSION,
  }),
]);
const ENTITY_FRAMEWORK_PACKAGE_REFERENCES = Object.freeze([
  Object.freeze({
    id: "MartiX.Platform.EntityFrameworkCore",
    version: MODULAR_MONOLITH_PLATFORM_VERSION,
  }),
  Object.freeze({
    id: "Microsoft.EntityFrameworkCore",
    version: "10.0.10",
  }),
  Object.freeze({
    id: "Microsoft.EntityFrameworkCore.Design",
    version: "10.0.10",
    privateAssets: true,
  }),
]);
const RELATIONAL_PROVIDER_DEFINITIONS = Object.freeze({
  postgresql: Object.freeze({
    packageReference: Object.freeze({
      id: "Npgsql.EntityFrameworkCore.PostgreSQL",
      version: "10.0.0",
    }),
    providerApiMethod: "UseNpgsql",
    migrationTypes: Object.freeze({
      identifier: "uuid",
      timestamp: "timestamp with time zone",
      text: "character varying(200)",
      binary: "bytea",
      integer: "integer",
    }),
  }),
  sqlserver: Object.freeze({
    packageReference: Object.freeze({
      id: "Microsoft.EntityFrameworkCore.SqlServer",
      version: "10.0.10",
    }),
    providerApiMethod: "UseSqlServer",
    migrationTypes: Object.freeze({
      identifier: "uniqueidentifier",
      timestamp: "datetimeoffset",
      text: "nvarchar(200)",
      binary: "varbinary(max)",
      integer: "int",
    }),
  }),
});
const API_APPLICATION_PACKAGE_REFERENCES = Object.freeze([
  Object.freeze({ id: "Microsoft.AspNetCore.OpenApi", version: "10.0.10" }),
  Object.freeze({ id: "Microsoft.OpenApi", version: "2.11.0" }),
]);
const TEST_PACKAGE_REFERENCES = Object.freeze([
  ...API_APPLICATION_PACKAGE_REFERENCES,
  Object.freeze({ id: "Microsoft.AspNetCore.TestHost", version: "10.0.10" }),
  Object.freeze({ id: "TUnit", version: "1.63.0" }),
]);
const ANALYZER_PACKAGE_ID = "MartiX.Platform.Analyzers";
const APPLICATION_NAME_PATTERN =
  /^[A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)*$/;
const MODULE_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9]*$/;
const CSHARP_KEYWORDS = new Set([
  "abstract",
  "as",
  "base",
  "bool",
  "break",
  "byte",
  "case",
  "catch",
  "char",
  "checked",
  "class",
  "const",
  "continue",
  "decimal",
  "default",
  "delegate",
  "do",
  "double",
  "else",
  "enum",
  "event",
  "explicit",
  "extern",
  "false",
  "finally",
  "fixed",
  "float",
  "for",
  "foreach",
  "goto",
  "if",
  "implicit",
  "in",
  "int",
  "interface",
  "internal",
  "is",
  "lock",
  "long",
  "namespace",
  "new",
  "null",
  "object",
  "operator",
  "out",
  "override",
  "params",
  "private",
  "protected",
  "public",
  "readonly",
  "record",
  "ref",
  "return",
  "sbyte",
  "sealed",
  "short",
  "sizeof",
  "stackalloc",
  "static",
  "string",
  "struct",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "uint",
  "ulong",
  "unchecked",
  "unsafe",
  "ushort",
  "using",
  "virtual",
  "void",
  "volatile",
  "while",
]);
const PLACEHOLDER_MODULE_NAMES = new Set([
  "app",
  "application",
  "businessmodule",
  "default",
  "demo",
  "example",
  "generated",
  "module",
  "placeholder",
  "sample",
  "test",
  "testmodule",
  "weatherforecast",
]);
const SUPPORTED_RELATIONAL_PROVIDERS = new Set(
  Object.keys(RELATIONAL_PROVIDER_DEFINITIONS),
);
const SUPPORTED_CAPABILITIES = new Set(
  MODULAR_MONOLITH_BASELINE_CAPABILITIES,
);
const MODULAR_MONOLITH_OPTION_NAMES = new Set([
  "applicationName",
  "businessModules",
  "capabilities",
  "databaseProvider",
  "dependencies",
  "moduleDependencies",
  "modules",
  "outputDirectory",
  "persistence",
  "preset",
  "provider",
  "providers",
  "relationalProvider",
]);

export class ModularMonolithPresetGenerationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ModularMonolithPresetGenerationError";
  }
}

function fail(message) {
  throw new ModularMonolithPresetGenerationError(message);
}

function requireNonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(`${label} is required.`);
  }

  return value.trim();
}

function rejectCSharpKeyword(value, label) {
  if (CSHARP_KEYWORDS.has(value.toLowerCase())) {
    fail(`${label} cannot be a C# keyword.`);
  }
}

function normalizeApplicationName(value) {
  const applicationName = requireNonEmptyString(value, "An application name");
  if (!APPLICATION_NAME_PATTERN.test(applicationName)) {
    fail(
      "The application name must contain only dot-separated .NET identifier segments.",
    );
  }
  for (const segment of applicationName.split(".")) {
    rejectCSharpKeyword(
      segment,
      `The application name segment "${segment}"`,
    );
  }

  return applicationName;
}

function normalizeModuleName(value, label) {
  const moduleName = requireNonEmptyString(value, label);
  if (!MODULE_NAME_PATTERN.test(moduleName)) {
    fail(
      `${label} must be one .NET identifier segment without dots or separators.`,
    );
  }
  rejectCSharpKeyword(moduleName, label);
  if (PLACEHOLDER_MODULE_NAMES.has(moduleName.toLowerCase())) {
    fail(`${label} "${moduleName}" is a placeholder and cannot be generated.`);
  }

  return moduleName;
}

function normalizeSelectionList(value, label) {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    fail(`${label} must be an array.`);
  }

  const normalized = value.map((item, index) => {
    if (typeof item !== "string" || item.trim().length === 0) {
      fail(`${label}[${index}] must be a non-empty string.`);
    }
    return item.trim();
  });

  if (new Set(normalized).size !== normalized.length) {
    fail(`${label} cannot contain duplicate selections.`);
  }

  return normalized;
}

function normalizeBusinessModules(options) {
  const value = options.businessModules ?? options.modules;
  if (value === undefined) {
    fail("At least one Business Module name is required.");
  }
  if (!Array.isArray(value) || value.length === 0) {
    fail("At least one Business Module name is required.");
  }

  const modules = value.map((item, index) =>
    normalizeModuleName(item, `businessModules[${index}]`),
  );
  const normalizedNames = modules.map((moduleName) => moduleName.toLowerCase());
  if (new Set(normalizedNames).size !== normalizedNames.length) {
    fail("Business Module names must be unique ignoring case.");
  }

  return modules;
}

function normalizeDependencyList(value, label) {
  if (!Array.isArray(value)) {
    fail(`${label} must be an array.`);
  }

  const normalized = value.map((item, index) =>
    requireNonEmptyString(item, `${label}[${index}]`),
  );
  if (
    new Set(normalized.map((dependency) => dependency.toLowerCase())).size !==
    normalized.length
  ) {
    fail(`${label} cannot contain duplicate module dependencies.`);
  }
  return normalized;
}

function normalizeModuleDependencies(options, modules) {
  const supplied = options.moduleDependencies ?? options.dependencies;
  const dependencies = Object.fromEntries(
    modules.map((moduleName) => [moduleName, []]),
  );
  if (supplied === undefined) {
    return dependencies;
  }

  if (Array.isArray(supplied)) {
    for (const [index, edge] of supplied.entries()) {
      if (edge === null || typeof edge !== "object" || Array.isArray(edge)) {
        fail(`moduleDependencies[${index}] must be an object.`);
      }
      const consumer = normalizeModuleName(
        edge.consumer ?? edge.module ?? edge.from,
        `moduleDependencies[${index}].consumer`,
      );
      const providers = normalizeDependencyList(
        edge.providers ?? edge.dependsOn ?? edge.to,
        `moduleDependencies[${index}].providers`,
      );
      addDependencies(dependencies, modules, consumer, providers);
    }
  } else if (typeof supplied === "object" && supplied !== null) {
    for (const [consumer, providers] of Object.entries(supplied)) {
      addDependencies(
        dependencies,
        modules,
        normalizeModuleName(consumer, "moduleDependencies consumer"),
        normalizeDependencyList(
          providers,
          `moduleDependencies.${consumer}`,
        ),
      );
    }
  } else {
    fail("moduleDependencies must be an object or an array.");
  }

  for (const moduleName of modules) {
    dependencies[moduleName].sort((left, right) =>
      left.localeCompare(right, "en"),
    );
  }
  assertAcyclicModuleGraph(dependencies, modules);
  return dependencies;
}

function addDependencies(dependencies, modules, consumer, providers) {
  const canonicalConsumer = findModule(modules, consumer);
  if (canonicalConsumer === undefined) {
    fail(`Unknown Business Module dependency consumer: ${consumer}.`);
  }

  for (const provider of providers) {
    const canonicalProvider = findModule(modules, provider);
    if (canonicalProvider === undefined) {
      fail(`Unknown Business Module dependency provider: ${provider}.`);
    }
    if (canonicalConsumer.toLowerCase() === canonicalProvider.toLowerCase()) {
      fail(`Business Module "${canonicalConsumer}" cannot depend on itself.`);
    }
    if (!dependencies[canonicalConsumer].includes(canonicalProvider)) {
      dependencies[canonicalConsumer].push(canonicalProvider);
    }
  }
}

function findModule(modules, requestedName) {
  return modules.find(
    (moduleName) => moduleName.toLowerCase() === requestedName.toLowerCase(),
  );
}

function assertAcyclicModuleGraph(dependencies, modules) {
  const cycle = findDependencyCycle(
    modules,
    (moduleName) => dependencies[moduleName],
  );
  if (cycle !== null) {
    fail(`Business Module dependency graph must be acyclic: ${cycle.join(" -> ")}.`);
  }
}

function rejectUnknownOptions(options) {
  for (const option of Object.keys(options)) {
    if (!MODULAR_MONOLITH_OPTION_NAMES.has(option)) {
      fail(`Unknown modular-monolith preset option: ${option}.`);
    }
  }
}

function validateSelections(options) {
  const preset = options.preset ?? MODULAR_MONOLITH_PRESET;
  if (preset !== MODULAR_MONOLITH_PRESET) {
    fail(
      `The Modular Monolith generator only supports the "${MODULAR_MONOLITH_PRESET}" preset.`,
    );
  }

  const requestedCapabilities = normalizeSelectionList(
    options.capabilities,
    "capabilities",
  );
  for (const capability of requestedCapabilities) {
    if (!SUPPORTED_CAPABILITIES.has(capability)) {
      fail(
        `Capability "${capability}" is not supported by the modular-monolith preset.`,
      );
    }
  }

  const requestedProviders = normalizeSelectionList(
    options.providers,
    "providers",
  );
  if (options.provider !== undefined) {
    requestedProviders.push(
      requireNonEmptyString(options.provider, "provider"),
    );
  }
  if (new Set(requestedProviders).size !== requestedProviders.length) {
    fail("providers cannot contain duplicate selections.");
  }

  const persistence = options.persistence ?? "relational";
  if (persistence !== "relational") {
    fail(
      `Persistence selection "${persistence}" is not supported by the modular-monolith preset.`,
    );
  }

  const relationalProvider =
    options.relationalProvider ??
    options.databaseProvider ??
    (requestedProviders.length === 1 ? requestedProviders[0] : "postgresql");
  if (!SUPPORTED_RELATIONAL_PROVIDERS.has(relationalProvider)) {
    fail(
      `Relational provider "${relationalProvider}" is not supported by the modular-monolith preset.`,
    );
  }
  if (
    requestedProviders.length > 0 &&
    (requestedProviders.length !== 1 ||
      requestedProviders[0] !== relationalProvider)
  ) {
    fail(
      "The modular-monolith preset selects exactly one relational provider.",
    );
  }

  return { persistence, relationalProvider };
}

function getProjectNames(applicationName, businessModules) {
  return {
    api: `${applicationName}.Api`,
    migrator: `${applicationName}.Migrator`,
    tests: `${applicationName}.Tests`,
    modules: businessModules.map((moduleName) => ({
      name: moduleName,
      project: `${applicationName}.${moduleName}`,
    })),
  };
}

function createPlan(
  applicationName,
  businessModules,
  dependencies,
  selections,
) {
  const projectNames = getProjectNames(applicationName, businessModules);
  const baselineCapabilities = [...MODULAR_MONOLITH_BASELINE_CAPABILITIES];
  const modulePlans = projectNames.modules.map(({ name, project }) => ({
    name,
    project: `src/${project}`,
    contractsNamespace: `${project}.Contracts`,
    dependencies: [...dependencies[name]],
  }));
  const moduleDependencyEdges = modulePlans.flatMap((module) =>
    module.dependencies.map((provider) => ({
      consumer: module.name,
      provider,
      access: "Contracts",
    })),
  );
  return {
    applicationName,
    preset: MODULAR_MONOLITH_PRESET,
    manifestSchemaVersion: MODULAR_MONOLITH_MANIFEST_SCHEMA_VERSION,
    platformVersion: MODULAR_MONOLITH_PLATFORM_VERSION,
    platformContractVersion: MODULAR_MONOLITH_PLATFORM_VERSION,
    origin: {
      canonicalRepository: MODULAR_MONOLITH_CANONICAL_REPOSITORY,
      template: "martix-app",
    },
    baselineCapabilities,
    capabilities: baselineCapabilities,
    providers: [
      {
        id: selections.relationalProvider,
        capability: "relational-persistence",
        state: "selected",
      },
    ],
    persistence: selections.persistence,
    relationalProvider: selections.relationalProvider,
    packageReferences: [
      ...PLATFORM_PACKAGE_REFERENCES,
      ...ENTITY_FRAMEWORK_PACKAGE_REFERENCES,
      RELATIONAL_PROVIDER_DEFINITIONS[selections.relationalProvider]
        .packageReference,
    ].map((reference) => ({ ...reference })),
    projects: [
      `src/${projectNames.api}/${projectNames.api}.csproj`,
      `src/${projectNames.migrator}/${projectNames.migrator}.csproj`,
      ...projectNames.modules.map(
        ({ project }) => `src/${project}/${project}.csproj`,
      ),
      `tests/${projectNames.tests}/${projectNames.tests}.csproj`,
    ],
    businessModules: modulePlans,
    moduleDependencies: moduleDependencyEdges,
    selected: {
      applicationUi: false,
      businessModules: true,
      relationalPersistence: true,
      oneShotMigrator: true,
    },
  };
}

export function createModularMonolithPresetPlan(options = {}) {
  if (
    options === null ||
    typeof options !== "object" ||
    Array.isArray(options)
  ) {
    fail("Modular Monolith preset options must be an object.");
  }

  rejectUnknownOptions(options);
  const applicationName = normalizeApplicationName(options.applicationName);
  const businessModules = normalizeBusinessModules(options);
  const selections = validateSelections(options);
  const dependencies = normalizeModuleDependencies(options, businessModules);

  return createPlan(
    applicationName,
    businessModules,
    dependencies,
    selections,
  );
}

function renderPackageReferences(references, platformReferences) {
  const platformPackageIds = new Set(
    platformReferences.map(({ id }) => id),
  );
  return references
    .map(({ id, version, privateAssets: referencePrivateAssets }) => {
      const privateAssets =
        id === ANALYZER_PACKAGE_ID || referencePrivateAssets
          ? ' PrivateAssets="all"'
          : "";
      const renderedVersion = platformPackageIds.has(id)
        ? "$(MartiXPlatformVersion)"
        : version;
      return `    <PackageReference Include="${id}" Version="${renderedVersion}"${privateAssets} />`;
    })
    .join("\n");
}

function projectReferences(paths) {
  return paths
    .map((path) => `    <ProjectReference Include="${path}" />`)
    .join("\n");
}

function platformPackageReferences() {
  return renderPackageReferences(
    PLATFORM_PACKAGE_REFERENCES,
    PLATFORM_PACKAGE_REFERENCES,
  );
}

function persistencePackageReferences(plan) {
  const providerReference =
    RELATIONAL_PROVIDER_DEFINITIONS[plan.relationalProvider].packageReference;
  return renderPackageReferences(
    [
      ...ENTITY_FRAMEWORK_PACKAGE_REFERENCES,
      providerReference,
    ],
    [
      ...ENTITY_FRAMEWORK_PACKAGE_REFERENCES.filter(
        ({ id }) => id === "MartiX.Platform.EntityFrameworkCore",
      ),
    ],
  );
}

function migratorPackageReferences(plan) {
  const providerReference =
    RELATIONAL_PROVIDER_DEFINITIONS[plan.relationalProvider].packageReference;
  return renderPackageReferences(
    [
      Object.freeze({
        id: "Microsoft.EntityFrameworkCore",
        version: "10.0.10",
      }),
      Object.freeze({
        id: "Microsoft.EntityFrameworkCore.Design",
        version: "10.0.10",
        privateAssets: true,
      }),
      providerReference,
    ],
    [],
  );
}

function moduleNamespace(plan, moduleName) {
  return `${plan.applicationName}.${moduleName}`;
}

function moduleProject(plan, moduleName) {
  return `${plan.applicationName}.${moduleName}`;
}

function modulePath(plan, moduleName) {
  return `src/${moduleProject(plan, moduleName)}`;
}

function routeName(moduleName) {
  return moduleName.toLowerCase();
}

function modulePlan(plan, moduleName) {
  return plan.businessModules.find(({ name }) => name === moduleName);
}

function apiProjectFile(plan) {
  const moduleReferences = plan.businessModules.map(
    ({ name }) =>
      `../${moduleProject(plan, name)}/${moduleProject(plan, name)}.csproj`,
  );
  return `<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net10.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
    <MartiXPlatformVersion>${plan.platformVersion}</MartiXPlatformVersion>
  </PropertyGroup>

  <ItemGroup>
${projectReferences(moduleReferences)}
${platformPackageReferences()}
${renderPackageReferences(API_APPLICATION_PACKAGE_REFERENCES, [])}
  </ItemGroup>
</Project>
`;
}

function migratorProjectFile(plan) {
  const moduleReferences = plan.businessModules.map(
    ({ name }) =>
      `../${moduleProject(plan, name)}/${moduleProject(plan, name)}.csproj`,
  );
  return `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net10.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
    <MartiXPlatformVersion>${plan.platformVersion}</MartiXPlatformVersion>
  </PropertyGroup>

  <ItemGroup>
${projectReferences(moduleReferences)}
${migratorPackageReferences(plan)}
  </ItemGroup>

  <ItemGroup>
    <FrameworkReference Include="Microsoft.AspNetCore.App" />
  </ItemGroup>
</Project>
`;
}

function moduleProjectFile(plan, moduleName) {
  const currentModule = modulePlan(plan, moduleName);
  const moduleReferences = currentModule.dependencies.map(
    (provider) =>
      `../${moduleProject(plan, provider)}/${moduleProject(plan, provider)}.csproj`,
  );
  return `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
    <RootNamespace>${moduleNamespace(plan, moduleName)}</RootNamespace>
    <AssemblyName>${moduleProject(plan, moduleName)}</AssemblyName>
    <MartiXPlatformVersion>${plan.platformVersion}</MartiXPlatformVersion>
  </PropertyGroup>

  <ItemGroup>
${projectReferences(moduleReferences)}
${platformPackageReferences()}
${persistencePackageReferences(plan)}
  </ItemGroup>

  <ItemGroup>
    <FrameworkReference Include="Microsoft.AspNetCore.App" />
  </ItemGroup>

  <ItemGroup>
    <InternalsVisibleTo Include="${plan.applicationName}.Tests" />
  </ItemGroup>
</Project>
`;
}

function testProjectFile(plan) {
  const references = [
    `../../src/${plan.applicationName}.Api/${plan.applicationName}.Api.csproj`,
    `../../src/${plan.applicationName}.Migrator/${plan.applicationName}.Migrator.csproj`,
    ...plan.businessModules.map(
      ({ name }) =>
        `../../src/${moduleProject(plan, name)}/${moduleProject(plan, name)}.csproj`,
    ),
  ];
  return `<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net10.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
    <MartiXPlatformVersion>${plan.platformVersion}</MartiXPlatformVersion>
  </PropertyGroup>

  <ItemGroup>
${projectReferences(references)}
${platformPackageReferences()}
${renderPackageReferences(TEST_PACKAGE_REFERENCES, [])}
  </ItemGroup>
</Project>
`;
}

function apiProgramFile(plan) {
  const moduleUsings = plan.businessModules
    .map((module) => `using ${moduleNamespace(plan, module.name)};`)
    .join("\n");
  const serviceComposition = plan.businessModules
    .map(
      (module) =>
        `        ${module.name}Module.AddServices(services, configuration);`,
    )
    .join("\n");
  const endpointComposition = plan.businessModules
    .map((module) => `        ${module.name}Module.MapEndpoints(app);`)
    .join("\n");

  return `${moduleUsings}
using ${plan.applicationName}.Infrastructure.IntegrationEvents;
using MartiX.Platform.AspNetCore;
using MartiX.Platform.Results;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

var builder = WebApplication.CreateBuilder(args);
ApiComposition.ConfigureServices(builder.Services, builder.Configuration);

var app = builder.Build();
ApiComposition.Configure(app);
app.Run();

public static class ApiComposition
{
    public static void ConfigureServices(
        IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddMartiXProblemDetails();
        services.AddOpenApi(static options =>
            options.AddMartiXProblemDetailsContract());
${serviceComposition}
        ReliableEventsComposition.AddServices(services);
    }

    public static void Configure(WebApplication app)
    {
        app.UseExceptionHandler();
        app.MapOpenApi();
        app.MapGet(
                "/health",
                static () => TypedResults.Ok(new HealthResponse("ok")))
            .WithName("Health")
            .Produces<HealthResponse>(StatusCodes.Status200OK)
            .ProducesMartiXProblemDetails(ErrorKind.Unexpected);
${endpointComposition}
    }
}

public sealed record HealthResponse(string Status);
`;
}

function apiReliableEventsFile(plan) {
  const moduleUsings = plan.businessModules
    .map((module) => `using ${moduleNamespace(plan, module.name)};`)
    .join("\n");
  const claimCalls = plan.businessModules
    .map(
      (module) => `        if (remaining > 0)
        {
            var claimed${module.name} =
                await ${module.name}Module.ClaimReliableEventsAsync(
                    services,
                    remaining,
                    options,
                    timeProvider,
                    cancellationToken);
            result.AddRange(claimed${module.name});
            remaining -= claimed${module.name}.Count;
        }`,
    )
    .join("\n");
  const dispatchCases = plan.businessModules
    .map(
      (module) => `            "${module.name}" =>
                ${module.name}Module.DispatchReliableEventAsync(
                    services,
                    delivery,
                    cancellationToken),`,
    )
    .join("\n");
  const acknowledgeCases = plan.businessModules
    .map(
      (module) => `            "${module.name}" =>
                ${module.name}Module.AcknowledgeReliableEventAsync(
                    services,
                    delivery,
                    timeProvider,
                    cancellationToken),`,
    )
    .join("\n");
  const retryCases = plan.businessModules
    .map(
      (module) => `            "${module.name}" =>
                ${module.name}Module.ScheduleReliableEventRetryAsync(
                    services,
                    delivery,
                    failureCategory,
                    failureDetail,
                    options,
                    timeProvider,
                    cancellationToken),`,
    )
    .join("\n");
  const failCases = plan.businessModules
    .map(
      (module) => `            "${module.name}" =>
                ${module.name}Module.FailReliableEventAsync(
                    services,
                    delivery,
                    failureCategory,
                    failureDetail,
                    options,
                    timeProvider,
                    cancellationToken),`,
    )
    .join("\n");
  return `${moduleUsings}
using MartiX.Platform.EntityFrameworkCore.ReliableEvents;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace ${plan.applicationName}.Infrastructure.IntegrationEvents;

internal static class ReliableEventsComposition
{
    public static void AddServices(IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);
        services.AddReliableEvents();
        services.AddSingleton<IHostedService>(serviceProvider =>
        {
            var options = serviceProvider
                .GetRequiredService<ReliableEventsOptions>();
            var timeProvider = serviceProvider
                .GetRequiredService<TimeProvider>();
            return new ReliableEventsDispatcher(
                options,
                (batchSize, cancellationToken) =>
                    ClaimAsync(
                        serviceProvider,
                        batchSize,
                        options,
                        timeProvider,
                        cancellationToken),
                (delivery, cancellationToken) =>
                    DispatchAsync(
                        serviceProvider,
                        delivery,
                        cancellationToken),
                serviceProvider
                    .GetRequiredService<ILogger<ReliableEventsDispatcher>>(),
                serviceProvider
                    .GetRequiredService<ReliableEventsDiagnostics>(),
                (delivery, cancellationToken) =>
                    AcknowledgeAsync(
                        serviceProvider,
                        delivery,
                        timeProvider,
                        cancellationToken),
                (delivery, failureCategory, failureDetail, cancellationToken) =>
                    ScheduleRetryAsync(
                        serviceProvider,
                        delivery,
                        failureCategory,
                        failureDetail,
                        options,
                        timeProvider,
                        cancellationToken),
                (delivery, failureCategory, failureDetail, cancellationToken) =>
                    FailAsync(
                        serviceProvider,
                        delivery,
                        failureCategory,
                        failureDetail,
                        options,
                        timeProvider,
                        cancellationToken));
        });
    }

    private static async ValueTask<IReadOnlyList<ReliableEventDelivery>> ClaimAsync(
        IServiceProvider services,
        int batchSize,
        ReliableEventsOptions options,
        TimeProvider timeProvider,
        CancellationToken cancellationToken)
    {
        var result = new List<ReliableEventDelivery>(batchSize);
        var remaining = batchSize;
${claimCalls}
        return result;
    }

    private static ValueTask<ReliableEventDeliveryOutcome> DispatchAsync(
        IServiceProvider services,
        ReliableEventDelivery delivery,
        CancellationToken cancellationToken)
    {
        return delivery.SubscriptionId switch
        {
${dispatchCases}
            _ => new ValueTask<ReliableEventDeliveryOutcome>(
                ReliableEventDeliveryOutcome.PermanentFailure),
        };
    }

    private static ValueTask<bool> AcknowledgeAsync(
        IServiceProvider services,
        ReliableEventDelivery delivery,
        TimeProvider timeProvider,
        CancellationToken cancellationToken)
    {
        return delivery.Envelope.Publisher switch
        {
${acknowledgeCases}
            _ => new ValueTask<bool>(false),
        };
    }

    private static ValueTask<bool> ScheduleRetryAsync(
        IServiceProvider services,
        ReliableEventDelivery delivery,
        string failureCategory,
        string? failureDetail,
        ReliableEventsOptions options,
        TimeProvider timeProvider,
        CancellationToken cancellationToken)
    {
        return delivery.Envelope.Publisher switch
        {
${retryCases}
            _ => new ValueTask<bool>(false),
        };
    }

    private static ValueTask<bool> FailAsync(
        IServiceProvider services,
        ReliableEventDelivery delivery,
        string failureCategory,
        string? failureDetail,
        ReliableEventsOptions options,
        TimeProvider timeProvider,
        CancellationToken cancellationToken)
    {
        return delivery.Envelope.Publisher switch
        {
${failCases}
            _ => new ValueTask<bool>(false),
        };
    }
}
`;
}

function moduleContractsFile(plan, moduleName) {
  const namespace = `${moduleNamespace(plan, moduleName)}.Contracts.ModuleContracts`;
  return `namespace ${namespace};

public interface I${moduleName}Status
{
    Task<${moduleName}StatusResponse> GetStatusAsync(
        CancellationToken cancellationToken);
}

public sealed record ${moduleName}StatusResponse(
    string Module,
    IReadOnlyList<string> Dependencies);
`;
}

function moduleIntegrationEventsFile(plan, moduleName) {
  const namespace = `${moduleNamespace(plan, moduleName)}.Contracts.IntegrationEvents`;
  const eventName = `${toDatabaseIdentifier(moduleName).replaceAll("_", "-")}.submitted`;
  return `using System.Text.Json.Serialization;

namespace ${namespace};

public sealed record ${moduleName}SubmittedV1(
    Guid EventId,
    Guid AggregateId,
    DateTimeOffset OccurredAtUtc)
{
    public const string EventName = "${eventName}";
    public const int SchemaVersion = 1;
}

[JsonSourceGenerationOptions(
    PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(${moduleName}SubmittedV1))]
public partial class ${moduleName}IntegrationEventJsonContext :
    JsonSerializerContext
{
}
`;
}

function moduleDomainFile(plan, moduleName) {
  return `using ${moduleNamespace(plan, moduleName)}.Contracts.IntegrationEvents;
using MartiX.Platform.EntityFrameworkCore.EntityTimestamps;
using MartiX.Platform.EntityFrameworkCore.ReliableEvents;

namespace ${moduleNamespace(plan, moduleName)}.Domain;

internal sealed class ${moduleName}Aggregate :
    IHasEntityTimestamps,
    IHasConcurrencyToken
{
    public Guid Id { get; private set; } = Guid.NewGuid();

    public string Name { get; private set; } = "${moduleName}";

    public DateTimeOffset CreatedAt { get; private set; }

    public DateTimeOffset UpdatedAt { get; private set; }

    public Guid ConcurrencyToken { get; private set; } = Guid.NewGuid();

    private readonly DomainEventCollection<${moduleName}SubmittedV1> domainEvents =
        new(static domainEvent => domainEvent.EventId);

    public void RaiseSubmitted(DateTimeOffset occurredAtUtc)
    {
        domainEvents.Add(
            new ${moduleName}SubmittedV1(
                Guid.CreateVersion7(),
                Id,
                occurredAtUtc));
    }

    public void RecordSubmitted(Guid eventId)
    {
        if (eventId == Guid.Empty)
        {
            throw new ArgumentException(
                "A submitted event requires a non-empty event ID.",
                nameof(eventId));
        }

        ConcurrencyToken = eventId;
    }

    internal IReadOnlyList<${moduleName}SubmittedV1> SnapshotDomainEvents() =>
        domainEvents.Snapshot();

    internal void AcknowledgeDomainEvents(
        IReadOnlyList<${moduleName}SubmittedV1> events)
    {
        domainEvents.Acknowledge(events);
    }
}
`;
}

function modulePersistenceContextFile(plan, moduleName) {
  const schema = toDatabaseIdentifier(moduleName);
  return `using ${moduleNamespace(plan, moduleName)}.Domain;
using MartiX.Platform.EntityFrameworkCore.ReliableEvents;
using Microsoft.EntityFrameworkCore;

namespace ${moduleNamespace(plan, moduleName)}.Infrastructure.Persistence;

internal sealed class ${moduleName}DbContext : DbContext
{
    public ${moduleName}DbContext(
        DbContextOptions<${moduleName}DbContext> options)
        : base(options)
    {
    }

    public DbSet<${moduleName}Aggregate> Aggregates => Set<${moduleName}Aggregate>();

    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();

    public DbSet<OutboxDelivery> OutboxDeliveries => Set<OutboxDelivery>();

    public DbSet<InboxReceipt> InboxReceipts => Set<InboxReceipt>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("${schema}");
        ${moduleName}PersistenceModel.Configure(modelBuilder);
    }
}
`;
}

function moduleReliableEventsFile(plan, moduleName) {
  const schema = toDatabaseIdentifier(moduleName);
  const subscriptions = plan.businessModules
    .filter(({ dependencies }) => dependencies.includes(moduleName))
    .map(({ name }) => `"${name}"`);
  const subscriptionExpression =
    subscriptions.length === 0
      ? "Array.Empty<string>()"
      : `Array.AsReadOnly(new[] { ${subscriptions.join(", ")} })`;
  const currentModule = plan.businessModules.find(
    ({ name }) => name === moduleName,
  );
  const consumerUsings = currentModule.dependencies
    .map(
      (provider) => `using ${provider}SubmittedEvent =
    ${moduleNamespace(plan, provider)}.Contracts.IntegrationEvents.${provider}SubmittedV1;
using ${provider}JsonContext =
    ${moduleNamespace(plan, provider)}.Contracts.IntegrationEvents.${provider}IntegrationEventJsonContext;`,
    )
    .join("\n");
  const consumerMethods = currentModule.dependencies
    .map(
      (provider) => `    public static Task<ReliableEventDeliveryOutcome> Consume${provider}SubmittedAsync(
        ${moduleName}DbContext dbContext,
        ReliableEventEnvelope envelope,
        TimeProvider timeProvider,
        ReliableEventsDiagnostics diagnostics,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(dbContext);
        ArgumentNullException.ThrowIfNull(envelope);
        ArgumentNullException.ThrowIfNull(timeProvider);
        ArgumentNullException.ThrowIfNull(diagnostics);
        if (!string.Equals(
                envelope.EventName,
                ${provider}SubmittedEvent.EventName,
                StringComparison.Ordinal) ||
            envelope.SchemaVersion != ${provider}SubmittedEvent.SchemaVersion ||
            !string.Equals(
                envelope.Publisher,
                "${provider}",
                StringComparison.Ordinal))
        {
            return Task.FromResult(ReliableEventDeliveryOutcome.PermanentFailure);
        }

        return ReliableEventsInboxExecutor.ExecuteAsync(
            dbContext,
            "${moduleName}",
            envelope,
            static async (context, consumedEnvelope, token) =>
            {
                token.ThrowIfCancellationRequested();
                var integrationEvent = JsonSerializer.Deserialize(
                    consumedEnvelope.Payload.Span,
                    ${provider}JsonContext.Default.${provider}SubmittedV1);
                if (integrationEvent is null)
                {
                    throw new InvalidOperationException(
                        "The ${provider} integration event payload was empty.");
                }

                var aggregate = await context.Set<${moduleName}Aggregate>()
                    .SingleOrDefaultAsync(
                        candidate => candidate.Name == "${moduleName}",
                        token);
                if (aggregate is null)
                {
                    aggregate = new ${moduleName}Aggregate();
                    context.Set<${moduleName}Aggregate>().Add(aggregate);
                }

                aggregate.RecordSubmitted(integrationEvent.EventId);
                return Task.CompletedTask;
            },
            timeProvider,
            diagnostics,
            cancellationToken);
    }
`,
    )
    .join("\n")
    .trimEnd();
  const consumerUsingSection =
    consumerUsings.length === 0 ? "" : `${consumerUsings}\n`;
  const consumerMethodSection =
    consumerMethods.length === 0 ? "" : `\n\n${consumerMethods}`;
  return `using System.Text.Json;
${consumerUsingSection}using ${moduleNamespace(plan, moduleName)}.Contracts.IntegrationEvents;
using ${moduleNamespace(plan, moduleName)}.Domain;
using ${moduleNamespace(plan, moduleName)}.Infrastructure.Persistence;
using MartiX.Platform.EntityFrameworkCore.ReliableEvents;
using Microsoft.EntityFrameworkCore;

namespace ${moduleNamespace(plan, moduleName)}.Infrastructure.IntegrationEvents;

internal static class ${moduleName}ReliableEvents
{
    private static readonly IReadOnlyList<string> activeSubscriptions =
        ${subscriptionExpression};

    public static IReadOnlyList<string> ActiveSubscriptions =>
        activeSubscriptions;

    public static void Configure(ModelBuilder modelBuilder)
    {
        modelBuilder.HasReliableEvents("${schema}");
    }

    public static ReliableEventsSaveChangesInterceptor CreateInterceptor(
        ReliableEventsDiagnostics diagnostics)
    {
        return new ReliableEventsSaveChangesInterceptor(
            Snapshot,
            Stage,
            Acknowledge,
            diagnostics);
    }

    public static OutboxMessage CreateSubmittedMessage(
        ${moduleName}SubmittedV1 integrationEvent)
    {
        ArgumentNullException.ThrowIfNull(integrationEvent);
        var payload = JsonSerializer.SerializeToUtf8Bytes(
            integrationEvent,
            ${moduleName}IntegrationEventJsonContext.Default.${moduleName}SubmittedV1);
        var envelope = ReliableEventEnvelope.Create(
            integrationEvent.EventId,
            ${moduleName}SubmittedV1.EventName,
            ${moduleName}SubmittedV1.SchemaVersion,
            "${moduleName}",
            integrationEvent.OccurredAtUtc,
            DateTimeOffset.UtcNow,
            payload);
        return OutboxMessage.Create(envelope, activeSubscriptions);
    }

    private static IReadOnlyList<DomainEventCapture> Snapshot(
        DbContext dbContext)
    {
        return dbContext.ChangeTracker
            .Entries<${moduleName}Aggregate>()
            .SelectMany(entry => entry.Entity.SnapshotDomainEvents())
            .Select(integrationEvent =>
                DomainEventCapture.Create(
                    integrationEvent,
                    integrationEvent.EventId,
                    integrationEvent.OccurredAtUtc))
            .ToArray();
    }

    private static IReadOnlyList<OutboxMessage> Stage(
        DbContext _,
        IReadOnlyList<DomainEventCapture> captures)
    {
        return captures
            .Select(capture => capture.Event switch
            {
                ${moduleName}SubmittedV1 integrationEvent =>
                    CreateSubmittedMessage(integrationEvent),
                _ => throw new InvalidOperationException(
                    "An unregistered ${moduleName} domain event cannot cross the integration seam."),
            })
            .ToArray();
    }

    private static void Acknowledge(
        DbContext dbContext,
        IReadOnlyList<DomainEventCapture> captures)
    {
        foreach (var entry in dbContext.ChangeTracker
                     .Entries<${moduleName}Aggregate>())
        {
            var acknowledgedEvents = entry.Entity
                .SnapshotDomainEvents()
                .Where(integrationEvent =>
                    captures.Any(capture =>
                        ReferenceEquals(capture.Event, integrationEvent)))
                .ToArray();
            if (acknowledgedEvents.Length > 0)
            {
                entry.Entity.AcknowledgeDomainEvents(acknowledgedEvents);
            }
        }
    }${consumerMethodSection}
}
`;
}

function modulePersistenceModelFile(plan, moduleName) {
  const schema = toDatabaseIdentifier(moduleName);
  return `using ${moduleNamespace(plan, moduleName)}.Domain;
using MartiX.Platform.EntityFrameworkCore.EntityTimestamps;
using ${moduleNamespace(plan, moduleName)}.Infrastructure.IntegrationEvents;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ${moduleNamespace(plan, moduleName)}.Infrastructure.Persistence;

internal sealed class ${moduleName}AggregateConfiguration :
    IEntityTypeConfiguration<${moduleName}Aggregate>
{
    public void Configure(EntityTypeBuilder<${moduleName}Aggregate> entity)
    {
        entity.ToTable("${schema}_aggregate", "${schema}");
        entity.HasKey(aggregate => aggregate.Id)
            .HasName("pk_${schema}_aggregate");
        entity.Property(aggregate => aggregate.Id)
            .HasColumnName("id")
            .ValueGeneratedNever();
        entity.Property(aggregate => aggregate.Name)
            .HasColumnName("name")
            .HasMaxLength(200)
            .IsRequired();
        entity.HasEntityTimestamps();
        entity.Property(aggregate => aggregate.ConcurrencyToken)
            .HasColumnName("concurrency_token")
            .IsConcurrencyToken()
            .ValueGeneratedNever()
            .IsRequired();
        entity.HasIndex(aggregate => aggregate.Name)
            .HasDatabaseName("ix_${schema}_aggregate_name")
            .IsUnique();
    }
}

internal static class ${moduleName}PersistenceModel
{
    public static void Configure(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfiguration(new ${moduleName}AggregateConfiguration());
        ${moduleName}ReliableEvents.Configure(modelBuilder);
    }
}
`;
}

function reliableEventsMigrationOperations(schema, providerTypes) {
  return `        migrationBuilder.CreateTable(
            name: "outbox_messages",
            schema: "${schema}",
            columns: table => new
            {
                message_id = table.Column<Guid>(
                    type: "${providerTypes.identifier}",
                    nullable: false),
                event_name = table.Column<string>(
                    type: "${providerTypes.text}",
                    maxLength: 200,
                    nullable: false),
                publisher = table.Column<string>(
                    type: "${providerTypes.text}",
                    maxLength: 200,
                    nullable: false),
                schema_version = table.Column<int>(
                    type: "${providerTypes.integer}",
                    nullable: false),
                occurred_at_utc = table.Column<DateTimeOffset>(
                    type: "${providerTypes.timestamp}",
                    nullable: false),
                captured_at_utc = table.Column<DateTimeOffset>(
                    type: "${providerTypes.timestamp}",
                    nullable: false),
                correlation_id = table.Column<string>(
                    type: "${providerTypes.text}",
                    maxLength: 200,
                    nullable: true),
                causation_id = table.Column<Guid>(
                    type: "${providerTypes.identifier}",
                    nullable: true),
                actor_id = table.Column<string>(
                    type: "${providerTypes.text}",
                    maxLength: 200,
                    nullable: true),
                trace_parent = table.Column<string>(
                    type: "${providerTypes.text}",
                    maxLength: 200,
                    nullable: true),
                content_type = table.Column<string>(
                    type: "${providerTypes.text}",
                    maxLength: 100,
                    nullable: false),
                payload = table.Column<byte[]>(
                    type: "${providerTypes.binary}",
                    maxLength: 262144,
                    nullable: false),
                payload_length = table.Column<int>(
                    type: "${providerTypes.integer}",
                    nullable: false),
                payload_fingerprint = table.Column<string>(
                    type: "${providerTypes.text}",
                    maxLength: 64,
                    nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_${schema}_outbox_messages", x => x.message_id);
            });

        migrationBuilder.CreateTable(
            name: "outbox_deliveries",
            schema: "${schema}",
            columns: table => new
            {
                message_id = table.Column<Guid>(
                    type: "${providerTypes.identifier}",
                    nullable: false),
                subscription_id = table.Column<string>(
                    type: "${providerTypes.text}",
                    maxLength: 200,
                    nullable: false),
                status = table.Column<string>(
                    type: "${providerTypes.text}",
                    maxLength: 20,
                    nullable: false),
                attempt_count = table.Column<int>(
                    type: "${providerTypes.integer}",
                    nullable: false),
                next_attempt_at_utc = table.Column<DateTimeOffset>(
                    type: "${providerTypes.timestamp}",
                    nullable: false),
                lease_id = table.Column<Guid>(
                    type: "${providerTypes.identifier}",
                    nullable: true),
                lease_expires_at_utc = table.Column<DateTimeOffset>(
                    type: "${providerTypes.timestamp}",
                    nullable: true),
                delivered_at_utc = table.Column<DateTimeOffset>(
                    type: "${providerTypes.timestamp}",
                    nullable: true),
                last_failure_category = table.Column<string>(
                    type: "${providerTypes.text}",
                    maxLength: 200,
                    nullable: true),
                last_failure_detail = table.Column<string>(
                    type: "${providerTypes.text}",
                    maxLength: 1000,
                    nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey(
                    "pk_${schema}_outbox_deliveries",
                    x => new { x.message_id, x.subscription_id });
                table.ForeignKey(
                    "fk_${schema}_outbox_deliveries_message",
                    x => x.message_id,
                    principalSchema: "${schema}",
                    principalTable: "outbox_messages",
                    principalColumn: "message_id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "inbox_receipts",
            schema: "${schema}",
            columns: table => new
            {
                subscription_id = table.Column<string>(
                    type: "${providerTypes.text}",
                    maxLength: 200,
                    nullable: false),
                message_id = table.Column<Guid>(
                    type: "${providerTypes.identifier}",
                    nullable: false),
                event_name = table.Column<string>(
                    type: "${providerTypes.text}",
                    maxLength: 200,
                    nullable: false),
                publisher = table.Column<string>(
                    type: "${providerTypes.text}",
                    maxLength: 200,
                    nullable: false),
                schema_version = table.Column<int>(
                    type: "${providerTypes.integer}",
                    nullable: false),
                payload_fingerprint = table.Column<string>(
                    type: "${providerTypes.text}",
                    maxLength: 64,
                    nullable: false),
                completed_at_utc = table.Column<DateTimeOffset>(
                    type: "${providerTypes.timestamp}",
                    nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey(
                    "pk_${schema}_inbox_receipts",
                    x => new { x.subscription_id, x.message_id });
            });

        migrationBuilder.CreateIndex(
            name: "ix_${schema}_outbox_deliveries_due",
            schema: "${schema}",
            table: "outbox_deliveries",
            columns: new[] { "status", "next_attempt_at_utc" });

        migrationBuilder.CreateIndex(
            name: "ix_${schema}_inbox_receipts_completed",
            schema: "${schema}",
            table: "inbox_receipts",
            column: "completed_at_utc");
`;
}

function moduleMigrationFile(plan, moduleName) {
  const schema = toDatabaseIdentifier(moduleName);
  const providerTypes =
    RELATIONAL_PROVIDER_DEFINITIONS[plan.relationalProvider].migrationTypes;
  const reliableEventsUp = reliableEventsMigrationOperations(schema, providerTypes);
  return `using ${moduleNamespace(plan, moduleName)}.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace ${moduleNamespace(plan, moduleName)}.Infrastructure.Persistence.Migrations;

[DbContext(typeof(${moduleName}DbContext))]
[Migration("20260101000000_Initial${moduleName}")]
internal partial class Initial${moduleName} : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.EnsureSchema(name: "${schema}");
        migrationBuilder.CreateTable(
            name: "${schema}_aggregate",
            schema: "${schema}",
            columns: table => new
            {
                id = table.Column<Guid>(
                    type: "${providerTypes.identifier}",
                    nullable: false),
                name = table.Column<string>(
                    type: "${providerTypes.text}",
                    maxLength: 200,
                    nullable: false),
                created_at = table.Column<DateTimeOffset>(
                    type: "${providerTypes.timestamp}",
                    nullable: false),
                updated_at = table.Column<DateTimeOffset>(
                    type: "${providerTypes.timestamp}",
                    nullable: false),
                concurrency_token = table.Column<Guid>(
                    type: "${providerTypes.identifier}",
                    nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey(
                    "pk_${schema}_aggregate",
                    x => x.id);
            });

        migrationBuilder.CreateIndex(
            name: "ix_${schema}_aggregate_name",
            schema: "${schema}",
            table: "${schema}_aggregate",
            column: "name",
            unique: true);

${reliableEventsUp}
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "inbox_receipts",
            schema: "${schema}");

        migrationBuilder.DropTable(
            name: "outbox_deliveries",
            schema: "${schema}");

        migrationBuilder.DropTable(
            name: "outbox_messages",
            schema: "${schema}");

        migrationBuilder.DropTable(
            name: "${schema}_aggregate",
            schema: "${schema}");
    }
}
`;
}

function moduleMigrationSnapshotFile(plan, moduleName) {
  const schema = toDatabaseIdentifier(moduleName);
  return `using ${moduleNamespace(plan, moduleName)}.Domain;
using ${moduleNamespace(plan, moduleName)}.Infrastructure.Persistence;
using MartiX.Platform.EntityFrameworkCore.ReliableEvents;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace ${moduleNamespace(plan, moduleName)}.Infrastructure.Persistence.Migrations;

[DbContext(typeof(${moduleName}DbContext))]
internal partial class ${moduleName}DbContextModelSnapshot : ModelSnapshot
{
    protected override void BuildModel(ModelBuilder modelBuilder)
    {
        modelBuilder
            .HasDefaultSchema("${schema}")
            .HasAnnotation("ProductVersion", "10.0.10");

        modelBuilder.HasReliableEvents("${schema}");

        modelBuilder.Entity<${moduleName}Aggregate>(entity =>
        {
            entity.Property<Guid>("Id")
                .HasColumnName("id")
                .ValueGeneratedNever();
            entity.Property<Guid>("ConcurrencyToken")
                .HasColumnName("concurrency_token")
                .IsConcurrencyToken()
                .ValueGeneratedNever()
                .IsRequired();
            entity.Property<DateTimeOffset>("CreatedAt")
                .HasColumnName("created_at")
                .IsRequired();
            entity.Property<string>("Name")
                .HasColumnName("name")
                .HasMaxLength(200)
                .IsRequired();
            entity.Property<DateTimeOffset>("UpdatedAt")
                .HasColumnName("updated_at")
                .IsRequired();
            entity.HasKey("Id")
                .HasName("pk_${schema}_aggregate");
            entity.HasIndex("Name")
                .IsUnique()
                .HasDatabaseName("ix_${schema}_aggregate_name");
            entity.ToTable("${schema}_aggregate", "${schema}");
        });
    }
}
`;
}

function moduleFeatureFile(plan, moduleName) {
  const currentModule = modulePlan(plan, moduleName);
  const providerUsings = currentModule.dependencies
    .map(
      (provider) =>
        `using ${provider}Status = ${moduleNamespace(plan, provider)}.Contracts.ModuleContracts.I${provider}Status;`,
    )
    .join("\n");
  const providerFields = currentModule.dependencies
    .map(
      (provider) =>
        `    private readonly ${provider}Status ${provider.toLowerCase()}Status;`,
    )
    .join("\n");
  const hasDependencies = currentModule.dependencies.length > 0;
  let constructor = "";
  if (hasDependencies) {
    constructor = `    public ${moduleName}StatusOperation(${currentModule.dependencies
      .map(
        (provider) =>
          `${provider}Status ${provider.toLowerCase()}Status`,
      )
      .join(", ")})
    {
${currentModule.dependencies
  .map(
    (provider) =>
      `        this.${provider.toLowerCase()}Status = ${provider.toLowerCase()}Status;`,
  )
  .join("\n")}
    }
`;
  }
  const providerCalls = currentModule.dependencies
    .map(
      (provider) =>
        `        dependencies.Add((await ${provider.toLowerCase()}Status.GetStatusAsync(cancellationToken)).Module);`,
    )
    .join("\n");
  let operationMethod;
  if (!hasDependencies) {
    operationMethod = `    public Task<${moduleName}StatusResponse> GetStatusAsync(
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var aggregate = new ${moduleName}Aggregate();
        return Task.FromResult(
            new ${moduleName}StatusResponse(
                aggregate.Name,
                Array.Empty<string>()));
    }`;
  } else {
    operationMethod = `    public async Task<${moduleName}StatusResponse> GetStatusAsync(
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var aggregate = new ${moduleName}Aggregate();
        var dependencies = new List<string>();
${providerCalls}
        return new ${moduleName}StatusResponse(aggregate.Name, dependencies);
    }`;
  }
  const operationClass = `internal sealed class ${moduleName}StatusOperation : I${moduleName}Status
{
${providerFields}
${constructor}
${operationMethod}
}
`;
  return `${providerUsings}
using ${moduleNamespace(plan, moduleName)}.Contracts.ModuleContracts;
using ${moduleNamespace(plan, moduleName)}.Domain;
using ${moduleNamespace(plan, moduleName)}.Infrastructure.Persistence;
using MartiX.Platform.EntityFrameworkCore.Specifications;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace ${moduleNamespace(plan, moduleName)}.Features.Status;

${operationClass}
internal sealed class ${moduleName}PersistenceQuery
{
    private readonly ${moduleName}DbContext dbContext;

    public ${moduleName}PersistenceQuery(${moduleName}DbContext dbContext)
    {
        this.dbContext = dbContext;
    }

    public Task<${moduleName}Aggregate?> FindAsync(
        Guid id,
        CancellationToken cancellationToken)
    {
        return new Specification<${moduleName}Aggregate>(
                aggregate => aggregate.Id == id)
            .Apply(dbContext.Aggregates)
            .AsNoTracking()
            .SingleOrDefaultAsync(cancellationToken);
    }
}

internal static class ${moduleName}StatusEndpoint
{
    public static void Map(IEndpointRouteBuilder endpoints)
    {
        var group = endpoints
            .MapGroup("/${routeName(moduleName)}")
            .WithTags("${moduleName}");
        group.MapGet(
                "/status",
                static (
                    I${moduleName}Status status,
                    CancellationToken cancellationToken) =>
                    status.GetStatusAsync(cancellationToken))
            .WithName("${plan.applicationName}.${moduleName}.Status")
            .Produces<${moduleName}StatusResponse>(StatusCodes.Status200OK);
    }
}
`;
}

function moduleCompositionFile(plan, moduleName) {
  const schema = toDatabaseIdentifier(moduleName);
  const providerApiMethod =
    RELATIONAL_PROVIDER_DEFINITIONS[plan.relationalProvider].providerApiMethod;
  const reliableProvider =
    plan.relationalProvider === "postgresql"
      ? "ReliableEventsProvider.PostgreSql"
      : "ReliableEventsProvider.SqlServer";
  const providerRegistration = `                options.${providerApiMethod}(
                  connectionString,
                  providerOptions => providerOptions.MigrationsHistoryTable("__ef_migrations_history", "${schema}"));`;
  const currentModule = plan.businessModules.find(
    ({ name }) => name === moduleName,
  );
  const dependencyEventUsings = currentModule.dependencies
    .map(
      (provider) =>
        `using ${moduleNamespace(plan, provider)}.Contracts.IntegrationEvents;`,
    )
    .join("\n");
  const dependencyEventUsingSection =
    dependencyEventUsings.length === 0 ? "" : `${dependencyEventUsings}\n`;
  const dispatchCases = currentModule.dependencies
    .map(
      (provider) => `            ${provider}SubmittedV1.EventName =>
                await ${moduleName}ReliableEvents.Consume${provider}SubmittedAsync(
                   dbContext,
                   delivery.Envelope,
                   timeProvider,
                   diagnostics,
                   cancellationToken),`,
    )
    .join("\n");
  const dispatchMethod =
    currentModule.dependencies.length === 0
      ? `    public static ValueTask<ReliableEventDeliveryOutcome> DispatchReliableEventAsync(
        IServiceProvider services,
        ReliableEventDelivery delivery,
        CancellationToken cancellationToken)
    {
        _ = services;
        _ = delivery;
        cancellationToken.ThrowIfCancellationRequested();
        return new ValueTask<ReliableEventDeliveryOutcome>(
            ReliableEventDeliveryOutcome.PermanentFailure);
    }
`
      : `    public static async ValueTask<ReliableEventDeliveryOutcome> DispatchReliableEventAsync(
        IServiceProvider services,
        ReliableEventDelivery delivery,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(services);
        await using var scope = services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider
            .GetRequiredService<${moduleName}DbContext>();
        var diagnostics = scope.ServiceProvider
            .GetRequiredService<ReliableEventsDiagnostics>();
        var timeProvider = scope.ServiceProvider
            .GetRequiredService<TimeProvider>();
        return delivery.Envelope.EventName switch
        {
${dispatchCases}
            _ => ReliableEventDeliveryOutcome.PermanentFailure,
        };
    }
`;
  return `${dependencyEventUsingSection}using ${moduleNamespace(plan, moduleName)}.Contracts.ModuleContracts;
using ${moduleNamespace(plan, moduleName)}.Features.Status;
using ${moduleNamespace(plan, moduleName)}.Infrastructure.IntegrationEvents;
using ${moduleNamespace(plan, moduleName)}.Infrastructure.Persistence;
using MartiX.Platform.EntityFrameworkCore.EntityTimestamps;
using MartiX.Platform.EntityFrameworkCore.ReliableEvents;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace ${moduleNamespace(plan, moduleName)};

public static class ${moduleName}Module
{
    public static void AddServices(
        IServiceCollection services,
        IConfiguration configuration)
    {
        AddPersistence(services, configuration, "Database");
        services.AddSingleton<I${moduleName}Status, ${moduleName}StatusOperation>();
    }

    public static void AddMigrationServices(
        IServiceCollection services,
        IConfiguration configuration)
    {
        AddPersistence(services, configuration, "MigrationDatabase");
    }

    public static void MapEndpoints(IEndpointRouteBuilder endpoints)
    {
        ${moduleName}StatusEndpoint.Map(endpoints);
    }

${dispatchMethod}
    public static async ValueTask<IReadOnlyList<ReliableEventDelivery>> ClaimReliableEventsAsync(
        IServiceProvider services,
        int batchSize,
        ReliableEventsOptions options,
        TimeProvider timeProvider,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(options);
        ArgumentNullException.ThrowIfNull(timeProvider);
        if (batchSize <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(batchSize));
        }

        await using var scope = services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider
            .GetRequiredService<${moduleName}DbContext>();
        var diagnostics = scope.ServiceProvider
            .GetRequiredService<ReliableEventsDiagnostics>();
        return await ReliableEventsLeaseCoordinator.ClaimDueEventsAsync(
            dbContext,
            "${schema}",
            ${reliableProvider},
            options.WithBatchSize(batchSize),
            timeProvider,
            diagnostics,
            cancellationToken);
    }

    public static async ValueTask<bool> AcknowledgeReliableEventAsync(
        IServiceProvider services,
        ReliableEventDelivery delivery,
        TimeProvider timeProvider,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(timeProvider);
        await using var scope = services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider
            .GetRequiredService<${moduleName}DbContext>();
        var diagnostics = scope.ServiceProvider
            .GetRequiredService<ReliableEventsDiagnostics>();
        return await ReliableEventsLeaseCoordinator.AcknowledgeAsync(
            dbContext,
            delivery.MessageId,
            delivery.SubscriptionId,
            delivery.LeaseId,
            timeProvider,
            diagnostics,
            cancellationToken);
    }

    public static async ValueTask<bool> ScheduleReliableEventRetryAsync(
        IServiceProvider services,
        ReliableEventDelivery delivery,
        string failureCategory,
        string? failureDetail,
        ReliableEventsOptions options,
        TimeProvider timeProvider,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(options);
        ArgumentNullException.ThrowIfNull(timeProvider);
        ArgumentException.ThrowIfNullOrWhiteSpace(failureCategory);
        await using var scope = services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider
            .GetRequiredService<${moduleName}DbContext>();
        var diagnostics = scope.ServiceProvider
            .GetRequiredService<ReliableEventsDiagnostics>();
        var now = timeProvider.GetUtcNow();
        var delay = options.GetRetryDelay(delivery.Attempt, Random.Shared);
        if (delay <= TimeSpan.Zero)
        {
            delay = TimeSpan.FromMilliseconds(1);
        }

        return await ReliableEventsLeaseCoordinator.ScheduleRetryAsync(
            dbContext,
            delivery.MessageId,
            delivery.SubscriptionId,
            delivery.LeaseId,
            now.Add(delay),
            failureCategory,
            failureDetail,
            options,
            timeProvider,
            diagnostics,
            cancellationToken);
    }

    public static async ValueTask<bool> FailReliableEventAsync(
        IServiceProvider services,
        ReliableEventDelivery delivery,
        string failureCategory,
        string? failureDetail,
        ReliableEventsOptions options,
        TimeProvider timeProvider,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(options);
        ArgumentNullException.ThrowIfNull(timeProvider);
        ArgumentException.ThrowIfNullOrWhiteSpace(failureCategory);
        await using var scope = services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider
            .GetRequiredService<${moduleName}DbContext>();
        var diagnostics = scope.ServiceProvider
            .GetRequiredService<ReliableEventsDiagnostics>();
        return await ReliableEventsLeaseCoordinator.FailAsync(
            dbContext,
            delivery.MessageId,
            delivery.SubscriptionId,
            delivery.LeaseId,
            failureCategory,
            failureDetail,
            options,
            timeProvider,
            diagnostics,
            cancellationToken);
    }

    public static async Task<string> ExecuteMigrationAsync(
        IServiceProvider services,
        string operation,
        CancellationToken cancellationToken)
    {
        await using var scope = services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider
            .GetRequiredService<${moduleName}DbContext>();
        return operation switch
        {
            "validate" => await ValidateAsync(dbContext, cancellationToken),
            "script" => dbContext.Database.GenerateScript(
                options: MigrationsSqlGenerationOptions.Idempotent),
            "apply" => await ApplyAndValidateAsync(dbContext, cancellationToken),
            _ => throw new ArgumentOutOfRangeException(nameof(operation)),
        };
    }

    public static string MigrationIdentity => "${moduleName}";

    private static void AddPersistence(
        IServiceCollection services,
        IConfiguration configuration,
        string connectionName)
    {
        var connectionString = configuration.GetConnectionString(connectionName);
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                $"Connection string '{connectionName}' is required.");
        }
        services.AddSingleton<TimeProvider>(TimeProvider.System);
        services.AddDbContext<${moduleName}DbContext>(
            (serviceProvider, options) =>
            {
${providerRegistration}
                options.AddInterceptors(
                    new EntityTimestampsSaveChangesInterceptor(
                        serviceProvider.GetRequiredService<TimeProvider>()),
                    ${moduleName}ReliableEvents.CreateInterceptor(
                        serviceProvider.GetRequiredService<ReliableEventsDiagnostics>()));
            });
    }

    private static async Task<string> ValidateAsync(
        ${moduleName}DbContext dbContext,
        CancellationToken cancellationToken)
    {
        if (!await dbContext.Database.CanConnectAsync(cancellationToken))
        {
            throw new InvalidOperationException(
                "${moduleName} database connectivity validation failed.");
        }

        var availableMigrations = dbContext.Database.GetMigrations().ToArray();
        var appliedMigrations = (await dbContext.Database
                .GetAppliedMigrationsAsync(cancellationToken))
            .ToArray();
        var pendingMigrations = (await dbContext.Database
                .GetPendingMigrationsAsync(cancellationToken))
            .ToArray();
        var unexpectedMigrations = appliedMigrations
            .Except(availableMigrations)
            .ToArray();
        if (unexpectedMigrations.Length > 0)
        {
            throw new InvalidOperationException(
                $"${moduleName} has unexpected migrations: {string.Join(", ", unexpectedMigrations)}");
        }

        if (pendingMigrations.Length > 0)
        {
            throw new InvalidOperationException(
                $"${moduleName} has pending migrations: {string.Join(", ", pendingMigrations)}");
        }

        if (dbContext.Database.HasPendingModelChanges())
        {
            throw new InvalidOperationException(
                "${moduleName} has pending model changes.");
        }

        return "validated: ${moduleName}";
    }

    private static async Task<string> ApplyAndValidateAsync(
        ${moduleName}DbContext dbContext,
        CancellationToken cancellationToken)
    {
        await dbContext.Database.MigrateAsync(cancellationToken);
        await ValidateAsync(dbContext, cancellationToken);
        return "applied: ${moduleName}";
    }
}
`;
}

function migratorProgramFile(plan) {
  const moduleUsings = plan.businessModules
    .map((module) => `using ${moduleNamespace(plan, module.name)};`)
    .join("\n");
  const registrations = plan.businessModules
    .map(
      (module) =>
        `${module.name}Module.AddMigrationServices(builder.Services, builder.Configuration);`,
    )
    .join("\n");
  const executions = plan.businessModules
    .map(
      (module) =>
        `Console.WriteLine(
    await ${module.name}Module.ExecuteMigrationAsync(
        host.Services,
        operation,
        CancellationToken.None));`,
    )
    .join("\n");
  return `${moduleUsings}
using MartiX.Platform.EntityFrameworkCore.ReliableEvents;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var operation = args.FirstOrDefault()?.ToLowerInvariant() ?? "validate";
if (operation is not ("validate" or "script" or "apply"))
{
    Console.Error.WriteLine(
        "Usage: dotnet run --project ${plan.applicationName}.Migrator -- [validate|script|apply]");
    return 2;
}

var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddLogging();
builder.Services.AddReliableEvents();
${registrations}
using var host = builder.Build();

${executions}
return 0;
`;
}

function testSourceFile(plan) {
  const firstModule = plan.businessModules[0];
  const consumerModule = plan.businessModules.find((module) =>
    module.dependencies.includes(firstModule.name),
  );
  const realEvidenceUsings =
    consumerModule === undefined
      ? ""
      : `using ${moduleNamespace(plan, firstModule.name)};
using ${moduleNamespace(plan, firstModule.name)}.Domain;
using ${moduleNamespace(plan, firstModule.name)}.Infrastructure.Persistence;
using ${moduleNamespace(plan, consumerModule.name)};
using ${moduleNamespace(plan, consumerModule.name)}.Infrastructure.Persistence;
`;
  const moduleUsings = plan.businessModules
    .map(
      (module) =>
        `using ${moduleNamespace(plan, module.name)}.Contracts.ModuleContracts;`,
    )
    .join("\n");
  const moduleAssertions = plan.businessModules
    .map(
      (module) => `        await Assert.That(
            ${module.name.toLowerCase()}Document.RootElement
                .GetProperty("module").GetString())
            .IsEqualTo("${module.name}");`,
    )
    .join("\n");
  const moduleRoutes = plan.businessModules
    .map(
      (module) =>
        `        using var ${module.name.toLowerCase()}Response =
            await host.Client.GetAsync("/${routeName(module.name)}/status");
        using var ${module.name.toLowerCase()}Document =
            JsonDocument.Parse(await ${module.name.toLowerCase()}Response.Content.ReadAsStringAsync());
        await Assert.That(${module.name.toLowerCase()}Response.StatusCode)
            .IsEqualTo(HttpStatusCode.OK);`,
    )
    .join("\n");
 const crashRedeliveryScenario =
   consumerModule === undefined
     ? `    [Test]
    public async Task The_generated_acceptance_boundary_is_executable()
    {
        await Assert.That(true).IsTrue();
    }
`
     : `    [Test, NotInParallel("modular-monolith-alpha-database")]
    public async Task Real_provider_transaction_and_crash_redelivery_are_idempotent()
    {
        await using var services = BuildEvidenceServices();
        var timeProvider = services.GetRequiredService<TimeProvider>();
        var options = new ReliableEventsOptions
        {
            AttemptTimeout = TimeSpan.FromMilliseconds(100),
            LeaseDuration = TimeSpan.FromSeconds(6),
            ShutdownBudget = TimeSpan.FromMilliseconds(100)
        };
        Guid messageId;
        int inboxReceiptsBefore;

        await using (var scope = services.CreateAsyncScope())
        {
            var dbContext = scope.ServiceProvider
                .GetRequiredService<${firstModule.name}DbContext>();
            var aggregate = await dbContext.Aggregates
                .SingleOrDefaultAsync(candidate => candidate.Name == "${firstModule.name}");
            if (aggregate is null)
            {
                aggregate = new ${firstModule.name}Aggregate();
                dbContext.Aggregates.Add(aggregate);
                await dbContext.SaveChangesAsync();
            }

            var originalToken = aggregate.ConcurrencyToken;
            var rollbackToken = Guid.CreateVersion7();
            await using (var transaction = await dbContext.Database.BeginTransactionAsync())
            {
                aggregate.RecordSubmitted(rollbackToken);
                await dbContext.SaveChangesAsync();
                await transaction.RollbackAsync();
            }
            dbContext.ChangeTracker.Clear();
            aggregate = await dbContext.Aggregates
                .SingleAsync(candidate => candidate.Name == "${firstModule.name}");
            await Assert.That(aggregate.ConcurrencyToken).IsEqualTo(originalToken);

            aggregate.RaiseSubmitted(DateTimeOffset.UtcNow);
            await dbContext.SaveChangesAsync();
            messageId = await dbContext.OutboxMessages
                .OrderByDescending(message => message.CapturedAtUtc)
                .ThenByDescending(message => message.MessageId)
                .Select(message => message.MessageId)
                .FirstAsync();

            var billingDbContext = scope.ServiceProvider
                .GetRequiredService<${consumerModule.name}DbContext>();
            inboxReceiptsBefore = await billingDbContext.InboxReceipts.CountAsync();
        }

        var firstClaims = await ${firstModule.name}Module.ClaimReliableEventsAsync(
            services,
            10,
            options,
            timeProvider,
            CancellationToken.None);
        var firstDelivery = firstClaims.Single(delivery => delivery.MessageId == messageId);
        var firstOutcome = await ${consumerModule.name}Module.DispatchReliableEventAsync(
            services,
            firstDelivery,
            CancellationToken.None);

        // The consumer commits before acknowledgement; redelivery has no
        // duplicate business effect after the producer crash.
        await Task.Delay(options.LeaseDuration + TimeSpan.FromMilliseconds(250));
        var redeliveries = await ${firstModule.name}Module.ClaimReliableEventsAsync(
            services,
            10,
            options,
            timeProvider,
            CancellationToken.None);
        var secondDelivery = redeliveries.Single(delivery => delivery.MessageId == messageId);
        var duplicateOutcome = await ${consumerModule.name}Module.DispatchReliableEventAsync(
            services,
            secondDelivery,
            CancellationToken.None);
        var acknowledged = await ${firstModule.name}Module.AcknowledgeReliableEventAsync(
            services,
            secondDelivery,
            timeProvider,
            CancellationToken.None);

        await using (var scope = services.CreateAsyncScope())
        {
            var dbContext = scope.ServiceProvider
                .GetRequiredService<${consumerModule.name}DbContext>();
            var aggregate = await dbContext.Aggregates
                .SingleAsync(candidate => candidate.Name == "${consumerModule.name}");
            var inboxReceiptsAfter = await dbContext.InboxReceipts.CountAsync();

            await Assert.That(firstOutcome)
                .IsEqualTo(ReliableEventDeliveryOutcome.Acknowledged);
            await Assert.That(duplicateOutcome)
                .IsEqualTo(ReliableEventDeliveryOutcome.DuplicateSuppressed);
            await Assert.That(firstDelivery.Attempt).IsEqualTo(1);
            await Assert.That(secondDelivery.Attempt).IsEqualTo(2);
            await Assert.That(acknowledged).IsTrue();
            await Assert.That(inboxReceiptsAfter).IsEqualTo(inboxReceiptsBefore + 1);
            await Assert.That(aggregate.ConcurrencyToken).IsEqualTo(messageId);
        }
    }

    private static ServiceProvider BuildEvidenceServices()
    {
        var connectionString = Environment.GetEnvironmentVariable(
            "MARTIX_MODULAR_MONOLITH_DATABASE");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "MARTIX_MODULAR_MONOLITH_DATABASE is required for provider evidence.");
        }

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:Database"] = connectionString
            })
            .Build();
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddReliableEvents();
        ${plan.businessModules
          .map(
            (module) =>
              `${module.name}Module.AddServices(services, configuration);`,
          )
          .join("\n        ")}
        return services.BuildServiceProvider();
    }
`;

  return `using System.Net;
using System.Text.Json;
${moduleUsings}
${realEvidenceUsings}
using MartiX.Platform.EntityFrameworkCore.ReliableEvents;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

public sealed class ModularMonolithCompositionTests
{
    [Test, NotInParallel("modular-monolith-alpha-database")]
    public async Task The_generated_host_composes_every_business_module()
    {
        await using var host = await ApiHost.StartAsync();

${moduleRoutes}
${moduleAssertions}
    }

${crashRedeliveryScenario}
    [Test]
    public async Task The_first_module_contract_is_resolvable_at_the_declared_seam()
    {
        await using var host = await ApiHost.StartAsync();

        var status = host.Services.GetRequiredService<I${firstModule.name}Status>();
        var result = await status.GetStatusAsync(CancellationToken.None);

        await Assert.That(result.Module).IsEqualTo("${firstModule.name}");
    }

    private sealed class ApiHost : IAsyncDisposable
    {
        private ApiHost(WebApplication app, HttpClient client)
        {
            App = app;
            Client = client;
            Services = app.Services;
        }

        private WebApplication App { get; }

        public HttpClient Client { get; }

        public IServiceProvider Services { get; }

        public static async Task<ApiHost> StartAsync()
        {
            var builder = WebApplication.CreateBuilder(
                new WebApplicationOptions
                {
                    EnvironmentName = Environments.Development,
                });
            builder.WebHost.UseTestServer();
            builder.Configuration["ConnectionStrings:Database"] =
                Environment.GetEnvironmentVariable(
                    "MARTIX_MODULAR_MONOLITH_DATABASE")
                ?? "Host=localhost;Database=martix_test";
            ApiComposition.ConfigureServices(
                builder.Services,
                builder.Configuration);

            var app = builder.Build();
            ApiComposition.Configure(app);
            await app.StartAsync();

            return new ApiHost(app, app.GetTestClient());
        }

        public async ValueTask DisposeAsync()
        {
            await App.DisposeAsync();
            Client.Dispose();
        }
    }
}
`;
}

function solutionFile(plan) {
  const projectPaths = plan.projects
    .map((project) => `  <Project Path="${project}" />`)
    .join("\n");
  return `<Solution>
${projectPaths}
</Solution>
`;
}

function createManifest(plan) {
  return {
    $schema: MODULAR_MONOLITH_MANIFEST_SCHEMA_URI,
    kind: "generated-solution",
    manifestSchemaVersion: plan.manifestSchemaVersion,
    platformVersion: plan.platformVersion,
    platformContractVersion: plan.platformContractVersion,
    repository: {
      organization: "MartiXDev",
      name: plan.applicationName,
      product: `${plan.applicationName} Modular Monolith`,
      role: "generated-solution",
    },
    origin: {
      canonicalRepository: plan.origin.canonicalRepository,
      template: plan.origin.template,
    },
    preset: plan.preset,
    capabilities: plan.capabilities.map((id) => ({
      id,
      state: "selected",
    })),
    providers: plan.providers.map((provider) => ({ ...provider })),
    appliedMigrations: [],
    supportClaims: [],
    security: {
      secretPolicy: "external-only",
      containsSecrets: false,
    },
    verification: {
      entrypoint: "eng/verify.mjs",
      policy: "eng/quality-gates.json",
      cadences: [...MODULAR_MONOLITH_VERIFICATION_CADENCES],
    },
    modules: plan.businessModules.map((module) => ({
      name: module.name,
      project: module.project,
      contractsNamespace: module.contractsNamespace,
      dependencies: [...module.dependencies],
    })),
  };
}

function readmeFile(plan) {
  const modules = plan.businessModules
    .map(
      (module) =>
        `- \`${module.name}\`: \`${module.project}\` (${module.dependencies.length > 0 ? `Contracts from ${module.dependencies.join(", ")}` : "no synchronous module dependency"})`,
    )
    .join("\n");
  return `# ${plan.applicationName}

This solution was generated by the \`martix-app\` Template System.

- Preset: \`${plan.preset}\`
- Platform Contract Version: \`${plan.platformContractVersion}\`
- Relational Provider: \`${plan.relationalProvider}\`
- Consolidated tests: \`tests/${plan.applicationName}.Tests\`

## Composition

The API host explicitly composes the Migrator boundary and each Business Module.
Business Modules are single projects with public Contracts and composition entry
points; Domain, feature slices, and infrastructure remain internal to the module.

${modules}

Run the one-shot migration boundary before serving traffic:

\`\`\`text
dotnet run --project src/${plan.applicationName}.Migrator -- validate
dotnet run --project src/${plan.applicationName}.Migrator -- script
dotnet run --project src/${plan.applicationName}.Migrator -- apply
\`\`\`

The API runtime uses external \`ConnectionStrings:Database\` configuration.
Migration operations use \`ConnectionStrings:MigrationDatabase\`; no migration
or startup seeding runs in the API process. Each module owns its EF Core context,
portable schema/table naming, migrations, and snapshot under
\`Infrastructure/Persistence\`.

The generated source is application-owned. Review \`martix.platform.json\` for
the exact origin, provider, module list, and dependency graph.
`;
}

function agentsFile(plan) {
  return `# ${plan.applicationName} agent routing

- API composition root: \`src/${plan.applicationName}.Api/Program.cs\`
- Migrator: \`src/${plan.applicationName}.Migrator/Program.cs\`
- Manifest: \`martix.platform.json\`
- Preset: \`${plan.preset}\`
- Tests: \`tests/${plan.applicationName}.Tests\`

Keep module registration, endpoint mapping, Contracts, and dependency direction
explicit. A Business Module may consume only another module's Contracts
namespace, never its Domain, Features, or Infrastructure. It owns direct
DbContext operations, persistence mappings, migrations, and migration history;
do not add repositories or \`IUnitOfWork\`.
`;
}

function contextFile(plan) {
  return `# ${plan.applicationName} context

This is a Modular Monolith Generated Solution with one API host, one one-shot
Migrator, one assembly per genuine Business Module, and one consolidated test
project. The API and Migrator call module composition entry points directly.

Business Modules:

${plan.businessModules.map((module) => `- ${module.name}`).join("\n")}
`;
}

function createFiles(plan, manifest) {
  const files = new Map([
    ["AGENTS.md", agentsFile(plan)],
    ["CONTEXT.md", contextFile(plan)],
    [`${plan.applicationName}.slnx`, solutionFile(plan)],
    ["README.md", readmeFile(plan)],
    ["martix.platform.json", `${JSON.stringify(manifest, null, 2)}\n`],
    [
      `src/${plan.applicationName}.Api/${plan.applicationName}.Api.csproj`,
      apiProjectFile(plan),
    ],
    [
      `src/${plan.applicationName}.Api/Program.cs`,
      apiProgramFile(plan),
    ],
    [
      `src/${plan.applicationName}.Api/Infrastructure/IntegrationEvents/ReliableEventsComposition.cs`,
      apiReliableEventsFile(plan),
    ],
    [
      `src/${plan.applicationName}.Migrator/${plan.applicationName}.Migrator.csproj`,
      migratorProjectFile(plan),
    ],
    [
      `src/${plan.applicationName}.Migrator/Program.cs`,
      migratorProgramFile(plan),
    ],
    [
      `tests/${plan.applicationName}.Tests/${plan.applicationName}.Tests.csproj`,
      testProjectFile(plan),
    ],
    [
      `tests/${plan.applicationName}.Tests/ModularMonolithCompositionTests.cs`,
      testSourceFile(plan),
    ],
  ]);

  for (const module of plan.businessModules) {
    const root = modulePath(plan, module.name);
    files.set(
      `${root}/${module.name}Module.cs`,
      moduleCompositionFile(plan, module.name),
    );
    files.set(
      `${root}/${moduleProject(plan, module.name)}.csproj`,
      moduleProjectFile(plan, module.name),
    );
    files.set(
      `${root}/Contracts/ModuleContracts/I${module.name}Status.cs`,
      moduleContractsFile(plan, module.name),
    );
    files.set(
      `${root}/Contracts/IntegrationEvents/${module.name}IntegrationEvents.cs`,
      moduleIntegrationEventsFile(plan, module.name),
    );
    files.set(
      `${root}/Domain/${module.name}Aggregate.cs`,
      moduleDomainFile(plan, module.name),
    );
    files.set(
      `${root}/Infrastructure/Persistence/${module.name}DbContext.cs`,
      modulePersistenceContextFile(plan, module.name),
    );
    files.set(
      `${root}/Infrastructure/Persistence/${module.name}PersistenceModel.cs`,
      modulePersistenceModelFile(plan, module.name),
    );
    files.set(
      `${root}/Infrastructure/IntegrationEvents/${module.name}ReliableEvents.cs`,
      moduleReliableEventsFile(plan, module.name),
    );
    files.set(
      `${root}/Infrastructure/Persistence/Migrations/20260101000000_Initial${module.name}.cs`,
      moduleMigrationFile(plan, module.name),
    );
    files.set(
      `${root}/Infrastructure/Persistence/Migrations/${module.name}DbContextModelSnapshot.cs`,
      moduleMigrationSnapshotFile(plan, module.name),
    );
    files.set(
      `${root}/Features/Status/${module.name}Status.cs`,
      moduleFeatureFile(plan, module.name),
    );
  }

  return files;
}

async function prepareOutputDirectory(outputDirectory) {
  const output = resolve(
    requireNonEmptyString(outputDirectory, "An output directory"),
  );

  let entries;
  try {
    entries = await readdir(output);
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }

    await mkdir(output, { recursive: true });
    entries = [];
  }

  if (entries.length > 0) {
    fail(`The output directory is not empty: ${output}`);
  }

  return output;
}

async function writeFiles(outputDirectory, files) {
  const writtenFiles = [];
  for (const [relativePath, contents] of files) {
    const target = join(outputDirectory, relativePath);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, contents, "utf8");
    writtenFiles.push(relative(outputDirectory, target).replaceAll("\\", "/"));
  }

  return writtenFiles.sort();
}

export async function generateModularMonolithPreset(options = {}) {
  const plan = createModularMonolithPresetPlan(options);
  const outputDirectory = await prepareOutputDirectory(options.outputDirectory);
  const manifest = createManifest(plan);
  const files = createFiles(plan, manifest);
  const writtenFiles = await writeFiles(outputDirectory, files);

  return {
    outputDirectory,
    plan,
    manifest,
    files: writtenFiles,
  };
}
