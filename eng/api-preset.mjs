import {
  mkdir,
  readdir,
  writeFile,
} from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

export const API_PRESET = "api";
export const API_MANIFEST_SCHEMA_VERSION = "1.0.0";
export const API_PLATFORM_VERSION = "0.1.0-preview.1";
export const API_CANONICAL_REPOSITORY =
  "https://github.com/MartiXDev/Platform";
export const API_MANIFEST_SCHEMA_URI =
  "https://github.com/MartiXDev/Platform/schemas/martix.platform.schema.json";
export const API_VERIFICATION_CADENCES = Object.freeze([
  "fast",
  "pull-request",
  "main-nightly",
  "release-candidate",
]);
export const API_CAPABILITY_MATRIX = Object.freeze([
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
]);
export const API_BASELINE_CAPABILITIES = Object.freeze(
  API_CAPABILITY_MATRIX.map((capability) => capability.id),
);

const API_PACKAGE_REFERENCES = Object.freeze([
  Object.freeze({ id: "MartiX.Platform", version: API_PLATFORM_VERSION }),
  Object.freeze({
    id: "MartiX.Platform.AspNetCore",
    version: API_PLATFORM_VERSION,
  }),
  Object.freeze({
    id: "MartiX.Platform.Analyzers",
    version: API_PLATFORM_VERSION,
  }),
]);
const API_APPLICATION_PACKAGE_REFERENCES = Object.freeze([
  Object.freeze({ id: "Microsoft.AspNetCore.OpenApi", version: "10.0.10" }),
  Object.freeze({ id: "Microsoft.OpenApi", version: "2.11.0" }),
]);
const API_TEST_PACKAGE_REFERENCES = Object.freeze([
  ...API_APPLICATION_PACKAGE_REFERENCES,
  Object.freeze({ id: "Microsoft.AspNetCore.TestHost", version: "10.0.10" }),
  Object.freeze({ id: "TUnit", version: "1.63.0" }),
]);
const ANALYZER_PACKAGE_ID = "MartiX.Platform.Analyzers";
const APPLICATION_NAME_PATTERN =
  /^[A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)*$/;
const PLACEHOLDER_NAME_SEGMENTS = new Set([
  "app",
  "application",
  "appname",
  "default",
  "defaultapi",
  "defaultapp",
  "demo",
  "demoapi",
  "demoapp",
  "example",
  "exampleapi",
  "exampleapp",
  "generated",
  "generatedsolution",
  "my",
  "myapi",
  "myapp",
  "myproject",
  "placeholder",
  "placeholderapp",
  "repositorybootstrapgeneratedsolution",
  "sample",
  "sampleapi",
  "sampleapp",
  "test",
  "testproject",
  "weatherforecast",
  "yourapi",
  "yourapp",
]);
const PLACEHOLDER_APPLICATION_NAMES = new Set([
  "api",
]);
const KNOWN_UNAVAILABLE_CAPABILITIES = new Set([
  "application-ui",
  "aspnetcore.fastendpoints",
  "authentication",
  "business-modules",
  "cache",
  "containers",
  "durable-jobs",
  "integration-events",
  "database",
  "ef-core",
  "persistence",
  "postgresql",
  "relational-persistence",
  "sqlserver",
  "ui",
]);
const API_OPTION_NAMES = new Set([
  "applicationName",
  "businessModules",
  "capabilities",
  "outputDirectory",
  "persistence",
  "preset",
  "provider",
  "providers",
  "ui",
  "uiProvider",
]);

export class ApiPresetGenerationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ApiPresetGenerationError";
  }
}

function fail(message) {
  throw new ApiPresetGenerationError(message);
}

function requireNonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(`${label} is required.`);
  }

  return value.trim();
}

function normalizeApplicationName(value) {
  const applicationName = requireNonEmptyString(value, "An application name");

  if (!APPLICATION_NAME_PATTERN.test(applicationName)) {
    fail(
      "The application name must contain only dot-separated .NET identifier segments.",
    );
  }

  if (isPlaceholderApplicationName(applicationName)) {
    fail(
      `The application name "${applicationName}" is a placeholder and cannot be generated.`,
    );
  }

  return applicationName;
}

function isPlaceholderApplicationName(applicationName) {
  const normalizedName = applicationName.toLowerCase();
  const segments = normalizedName.split(".");
  const hasPlaceholderSegment = segments.some((segment) =>
    PLACEHOLDER_NAME_SEGMENTS.has(segment),
  );
  const isApiPlaceholderName =
    segments.length > 1 &&
    segments.every(
      (segment) =>
        segment === "api" || PLACEHOLDER_NAME_SEGMENTS.has(segment),
    );

  return (
    PLACEHOLDER_APPLICATION_NAMES.has(normalizedName) ||
    hasPlaceholderSegment ||
    isApiPlaceholderName
  );
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

function rejectUnknownOptions(options) {
  for (const option of Object.keys(options)) {
    if (!API_OPTION_NAMES.has(option)) {
      fail(`Unknown API preset option: ${option}.`);
    }
  }
}

function validateApiSelections({
  preset = API_PRESET,
  capabilities,
  providers,
  provider,
  persistence = "none",
  ui = "none",
  uiProvider,
  businessModules,
}) {
  if (preset !== API_PRESET) {
    fail(`The API generator only supports the "${API_PRESET}" preset.`);
  }

  const requestedCapabilities = normalizeSelectionList(
    capabilities,
    "capabilities",
  );
  const requestedProviders = normalizeSelectionList(providers, "providers");
  if (provider !== undefined) {
    requestedProviders.push(
      requireNonEmptyString(provider, "provider"),
    );
  }
  if (new Set(requestedProviders).size !== requestedProviders.length) {
    fail("providers cannot contain duplicate selections.");
  }
  const requestedModules = normalizeSelectionList(
    businessModules,
    "businessModules",
  );
  if (
    uiProvider !== undefined
    && ui !== "none"
    && ui !== uiProvider
  ) {
    fail("ui and uiProvider selections must agree.");
  }
  const selectedUiProvider = uiProvider ?? ui;

  for (const capability of requestedCapabilities) {
    if (API_BASELINE_CAPABILITIES.includes(capability)) {
      continue;
    }

    const reason = KNOWN_UNAVAILABLE_CAPABILITIES.has(capability)
      ? "not supported by the api preset"
      : "not declared by the api preset capability matrix";
    fail(`Capability "${capability}" is ${reason}.`);
  }

  if (requestedProviders.length > 0) {
    fail(
      "Capability providers are not supported by the api preset; the baseline has no selected provider.",
    );
  }

  if (persistence !== "none") {
    fail(
      `Persistence selection "${persistence}" is not supported by the api preset.`,
    );
  }

  if (selectedUiProvider !== "none") {
    fail(
      `UI provider "${selectedUiProvider}" is not supported by the api preset.`,
    );
  }

  if (requestedModules.length > 0) {
    fail("Business Modules are not supported by the api preset.");
  }
}

function createPlan(applicationName) {
  const projectNames = getProjectNames(applicationName);
  const baselineCapabilities = [...API_BASELINE_CAPABILITIES];

  return {
    applicationName,
    preset: API_PRESET,
    manifestSchemaVersion: API_MANIFEST_SCHEMA_VERSION,
    platformVersion: API_PLATFORM_VERSION,
    platformContractVersion: API_PLATFORM_VERSION,
    origin: {
      canonicalRepository: API_CANONICAL_REPOSITORY,
      template: "martix-app",
    },
    baselineCapabilities,
    capabilities: baselineCapabilities,
    providers: [],
    persistence: "none",
    packageReferences: API_PACKAGE_REFERENCES.map((reference) => ({
      ...reference,
    })),
    projects: [
      `src/${projectNames.api}/${projectNames.api}.csproj`,
      `tests/${projectNames.tests}/${projectNames.tests}.csproj`,
    ],
    selected: {
      applicationUi: false,
      businessModules: false,
      relationalPersistence: false,
    },
  };
}

function getProjectNames(applicationName) {
  return {
    api: `${applicationName}.Api`,
    tests: `${applicationName}.Tests`,
  };
}

function renderPackageReferences(references, platformReferences) {
  const platformPackageIds = new Set(
    platformReferences.map(({ id }) => id),
  );

  return references
    .map(({ id, version }) => {
      const privateAssets =
        id === ANALYZER_PACKAGE_ID ? ' PrivateAssets="all"' : "";
      const renderedVersion = platformPackageIds.has(id)
        ? "$(MartiXPlatformVersion)"
        : version;
      return `    <PackageReference Include="${id}" Version="${renderedVersion}"${privateAssets} />`;
    })
    .join("\n");
}

export function createApiPresetPlan(options = {}) {
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    fail("API preset options must be an object.");
  }
  rejectUnknownOptions(options);
  const applicationName = normalizeApplicationName(options.applicationName);
  validateApiSelections(options);
  return createPlan(applicationName);
}

function createManifest(plan) {
  return {
    $schema: API_MANIFEST_SCHEMA_URI,
    kind: "generated-solution",
    manifestSchemaVersion: plan.manifestSchemaVersion,
    platformVersion: plan.platformVersion,
    platformContractVersion: plan.platformContractVersion,
    repository: {
      organization: "MartiXDev",
      name: plan.applicationName,
      product: `${plan.applicationName} API`,
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
    providers: [],
    appliedMigrations: [],
    supportClaims: [],
    security: {
      secretPolicy: "external-only",
      containsSecrets: false,
    },
    verification: {
      entrypoint: "eng/verify.mjs",
      policy: "eng/quality-gates.json",
      cadences: [...API_VERIFICATION_CADENCES],
    },
  };
}

function apiProjectFile(plan) {
  const packageReferences = [
    ...plan.packageReferences,
    ...API_APPLICATION_PACKAGE_REFERENCES,
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
${renderPackageReferences(packageReferences, plan.packageReferences)}
  </ItemGroup>
</Project>
`;
}

function apiProgramFile() {
  return `using MartiX.Platform.AspNetCore;
using MartiX.Platform.Results;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.Extensions.DependencyInjection;

var builder = WebApplication.CreateBuilder(args);
ApiComposition.ConfigureServices(builder.Services);

var app = builder.Build();
ApiComposition.Configure(app);
app.Run();

public static class ApiComposition
{
    public static void ConfigureServices(IServiceCollection services)
    {
        services.AddMartiXProblemDetails();
        services.AddOpenApi(static options =>
            options.AddMartiXProblemDetailsContract());
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
    }
}

public sealed record HealthResponse(string Status);
`;
}

function testProjectFile(plan) {
  const projectNames = getProjectNames(plan.applicationName);
  const packageReferences = [
    ...plan.packageReferences,
    ...API_TEST_PACKAGE_REFERENCES,
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
    <ProjectReference Include="../../src/${projectNames.api}/${projectNames.api}.csproj" />
${renderPackageReferences(packageReferences, plan.packageReferences)}
  </ItemGroup>
</Project>
`;
}

function testSourceFile() {
  return `using System.Net;
using System.Text.Json;
using MartiX.Platform.AspNetCore;
using MartiX.Platform.Results;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

public sealed class ApiContractTests
{
    [Test]
    public async Task The_generated_host_returns_a_typed_success()
    {
        await using var host = await ApiHost.StartAsync();

        using var response = await host.Client.GetAsync("/health");
        using var document = JsonDocument.Parse(
            await response.Content.ReadAsStringAsync());

        await Assert.That(response.StatusCode).IsEqualTo(HttpStatusCode.OK);
        await Assert.That(document.RootElement.GetProperty("status").GetString())
            .IsEqualTo("ok");
    }

    [Test]
    [Arguments(400, 400, "validation-failed", "api.validation")]
    [Arguments(422, 422, "rule-violation", "api.rule-violation")]
    [Arguments(404, 404, "not-found", "api.not-found")]
    [Arguments(409, 409, "conflict", "api.conflict")]
    [Arguments(401, 401, "authentication-required", "api.authentication-required")]
    [Arguments(403, 403, "forbidden", "api.forbidden")]
    [Arguments(429, 429, "rate-limited", "api.rate-limited")]
    [Arguments(503, 503, "unavailable", "api.unavailable")]
    [Arguments(500, 500, "unexpected", "api.unexpected")]
    public async Task The_generated_adapter_returns_safe_problem_details(
        int routeId,
        int expectedStatus,
        string expectedType,
        string expectedCode)
    {
        await using var host = await ApiHost.StartAsync();

        using var response = await host.Client.GetAsync(
            $"/test/failures/{routeId}");
        using var document = JsonDocument.Parse(
            await response.Content.ReadAsStringAsync());
        var problem = document.RootElement;

        await Assert.That((int)response.StatusCode).IsEqualTo(expectedStatus);
        await Assert.That(response.Content.Headers.ContentType?.MediaType)
            .IsEqualTo("application/problem+json");
        await Assert.That(problem.GetProperty("type").GetString())
            .IsEqualTo($"/problems/{expectedType}");
        await Assert.That(problem.GetProperty("status").GetInt32())
            .IsEqualTo(expectedStatus);
        await Assert.That(problem.GetProperty("code").GetString())
            .IsEqualTo(expectedCode);
        await Assert.That(problem.GetProperty("traceId").GetString())
            .IsNotNull();
        await Assert.That(problem.GetProperty("errors").GetArrayLength())
            .IsEqualTo(1);
    }

    [Test]
    public async Task Unexpected_failures_are_redacted_and_correlated()
    {
        await using var host = await ApiHost.StartAsync();

        using var response = await host.Client.GetAsync("/test/unexpected");
        var body = await response.Content.ReadAsStringAsync();
        using var document = JsonDocument.Parse(body);
        var problem = document.RootElement;

        await Assert.That(response.StatusCode)
            .IsEqualTo(HttpStatusCode.InternalServerError);
        await Assert.That(problem.GetProperty("code").GetString())
            .IsEqualTo("platform.unexpected");
        await Assert.That(problem.GetProperty("detail").GetString())
            .IsEqualTo("The server could not complete the request.");
        await Assert.That(problem.GetProperty("traceId").GetString())
            .IsNotNull();
        await Assert.That(body.Contains(
                "sensitive-backend-details",
                StringComparison.Ordinal))
            .IsFalse();
    }

    [Test]
    public async Task OpenApi_describes_the_generated_failure_contract()
    {
        await using var host = await ApiHost.StartAsync();

        using var response = await host.Client.GetAsync("/openapi/v1.json");
        var body = await response.Content.ReadAsStringAsync();
        using var document = JsonDocument.Parse(body);

        await Assert.That(document.RootElement.GetProperty("openapi")
                .GetString())
            .StartsWith("3.1.");
        await Assert.That(body.Contains(
                "\\"application/problem+json\\"",
                StringComparison.Ordinal))
            .IsTrue();
        await Assert.That(body.Contains("\\"traceId\\"", StringComparison.Ordinal))
            .IsTrue();
        await Assert.That(body.Contains("\\"errors\\"", StringComparison.Ordinal))
            .IsTrue();
    }

    private sealed record ProbeResponse(string Status);

    private sealed class ApiHost : IAsyncDisposable
    {
        private ApiHost(WebApplication app, HttpClient client)
        {
            App = app;
            Client = client;
        }

        private WebApplication App { get; }

        public HttpClient Client { get; }

        public static async Task<ApiHost> StartAsync()
        {
            var builder = WebApplication.CreateBuilder(
                new WebApplicationOptions
                {
                    EnvironmentName = Environments.Development,
                });
            builder.WebHost.UseTestServer();
            ApiComposition.ConfigureServices(builder.Services);

            var app = builder.Build();
            ApiComposition.Configure(app);
            MapConformanceEndpoints(app);
            await app.StartAsync();

            return new ApiHost(app, app.GetTestClient());
        }

        public async ValueTask DisposeAsync()
        {
            await App.DisposeAsync();
            Client.Dispose();
        }

        private static void MapConformanceEndpoints(WebApplication app)
        {
            var test = app.MapGroup("/test");
            test.MapGet(
                    "/failures/{id:int}",
                    static Results<Ok<ProbeResponse>, ProblemHttpResult> (
                        int id,
                        HttpContext httpContext) =>
                        MapResult(CreateFailure(id), httpContext))
                .WithName("ConformanceFailure")
                .Produces<ProbeResponse>(StatusCodes.Status200OK)
                .ProducesMartiXProblemDetails(
                    ErrorKind.Validation,
                    ErrorKind.RuleViolation,
                    ErrorKind.NotFound,
                    ErrorKind.Conflict,
                    ErrorKind.AuthenticationRequired,
                    ErrorKind.Forbidden,
                    ErrorKind.RateLimited,
                    ErrorKind.Unavailable,
                    ErrorKind.Unexpected);

            test.MapGet(
                    "/unexpected",
                    static IResult () => throw new InvalidOperationException(
                        "sensitive-backend-details"))
                .WithName("ConformanceUnexpectedFailure")
                .Produces<ProblemDetails>(
                    StatusCodes.Status500InternalServerError,
                    "application/problem+json")
                .ProducesMartiXProblemDetails(ErrorKind.Unexpected);
        }

        private static Results<Ok<ProbeResponse>, ProblemHttpResult> MapResult(
            Result<ProbeResponse> result,
            HttpContext httpContext)
        {
            if (result.IsSuccess)
            {
                return TypedResults.Ok(result.Value);
            }

            return result.ToProblemDetails(httpContext);
        }

        private static Result<ProbeResponse> CreateFailure(int id)
        {
            return id switch
            {
                400 => Result<ProbeResponse>.Failure(Error.Create(
                    "api.validation",
                    ErrorKind.Validation,
                    "The request is invalid.",
                    target: "id")),
                422 => Result<ProbeResponse>.Failure(Error.Create(
                    "api.rule-violation",
                    ErrorKind.RuleViolation,
                    "The request violates an application rule.")),
                404 => Result<ProbeResponse>.Failure(Error.Create(
                    "api.not-found",
                    ErrorKind.NotFound,
                    "The requested resource was not found.")),
                409 => Result<ProbeResponse>.Failure(Error.Create(
                    "api.conflict",
                    ErrorKind.Conflict,
                    "The request conflicts with current state.")),
                401 => Result<ProbeResponse>.Failure(Error.Create(
                    "api.authentication-required",
                    ErrorKind.AuthenticationRequired,
                    "Authentication is required.")),
                403 => Result<ProbeResponse>.Failure(Error.Create(
                    "api.forbidden",
                    ErrorKind.Forbidden,
                    "The current actor is not allowed.")),
                429 => Result<ProbeResponse>.Failure(Error.Create(
                    "api.rate-limited",
                    ErrorKind.RateLimited,
                    "The request rate is limited.")),
                503 => Result<ProbeResponse>.Failure(Error.Create(
                    "api.unavailable",
                    ErrorKind.Unavailable,
                    "The service is temporarily unavailable.")),
                500 => Result<ProbeResponse>.Failure(Error.Create(
                    "api.unexpected",
                    ErrorKind.Unexpected,
                    "The request could not be completed safely.")),
                _ => Result<ProbeResponse>.Success(new ProbeResponse("ok")),
            };
        }
    }
}
`;
}

function solutionFile(plan) {
  const projectNames = getProjectNames(plan.applicationName);

  return `<Solution>
  <Project Path="src/${projectNames.api}/${projectNames.api}.csproj" />
  <Project Path="tests/${projectNames.tests}/${projectNames.tests}.csproj" />
</Solution>
`;
}

function readmeFile(plan) {
  return `# ${plan.applicationName} API

This solution was generated by the \`martix-app\` Template System.

- Preset: \`${plan.preset}\`
- Platform Contract Version: \`${plan.platformContractVersion}\`
- Manifest Schema Version: \`${plan.manifestSchemaVersion}\`
- Capabilities: ${plan.capabilities.map((capability) => `\`${capability}\``).join(", ")}
- Capability Providers: none

The API composition root owns service registration, middleware ordering, OpenAPI
mapping, and the health endpoint. Storage, user-interface projects, Business
Modules, and provider-specific infrastructure are not generated.

The generated source is application-owned. Review \`martix.platform.json\` for
the exact origin and resolved composition.
`;
}

function agentsFile(plan) {
  return `# ${plan.applicationName} API agent routing

- Composition root: \`src/${plan.applicationName}.Api/Program.cs\`
- Manifest: \`martix.platform.json\`
- Preset: \`${plan.preset}\`
- Verification entrypoint: \`eng/verify.mjs\` from the Platform repository

Keep service registration, middleware ordering, endpoint mapping, and selected
providers explicit in application-owned source.
`;
}

function contextFile(plan) {
  return `# ${plan.applicationName} API context

This is an API Preset Generated Solution with the Platform baseline and no
selected Capability Provider. Kernel Result/Error contracts stay transport
independent; the ASP.NET Core adapter owns safe Problem Details translation.
`;
}

function createFiles(plan, manifest) {
  const projectNames = getProjectNames(plan.applicationName);

  return new Map([
    ["AGENTS.md", agentsFile(plan)],
    ["CONTEXT.md", contextFile(plan)],
    [`${plan.applicationName}.slnx`, solutionFile(plan)],
    ["README.md", readmeFile(plan)],
    ["martix.platform.json", `${JSON.stringify(manifest, null, 2)}\n`],
    [
      `src/${projectNames.api}/${projectNames.api}.csproj`,
      apiProjectFile(plan),
    ],
    [`src/${projectNames.api}/Program.cs`, apiProgramFile()],
    [
      `tests/${projectNames.tests}/ApiContractTests.cs`,
      testSourceFile(),
    ],
    [
      `tests/${projectNames.tests}/${projectNames.tests}.csproj`,
      testProjectFile(plan),
    ],
  ]);
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

export async function generateApiPreset(options = {}) {
  const plan = createApiPresetPlan(options);
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
