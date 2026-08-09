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
  assert.deepEqual(firstPlan.authentication, {
    profile: "none",
    provider: "none",
    flow: "anonymous",
    state: "selected",
  });
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

test("authentication profiles are explicit and provider-flow selections cannot be ambiguous", () => {
  const profiles = [
    ["none", "none", "anonymous"],
    ["oidc:interactive", "oidc", "interactive"],
    ["oidc:api", "oidc", "api"],
    ["entra:interactive", "entra", "interactive"],
    ["entra:api-delegated", "entra", "api-delegated"],
    ["entra:api-application", "entra", "api-application"],
  ];

  for (const [profile, provider, flow] of profiles) {
    const plan = createApiPresetPlan({
      applicationName: "Contoso.Inventory",
      authenticationProfile: profile,
    });
    assert.deepEqual(plan.authentication, {
      profile,
      provider,
      flow,
      state: "selected",
    });
  }
  assert.deepEqual(
    createApiPresetPlan({
      applicationName: "Contoso.Inventory",
      authenticationProvider: "none",
      authenticationFlow: "anonymous",
    }).authentication,
    {
      profile: "none",
      provider: "none",
      flow: "anonymous",
      state: "selected",
    },
  );

  assert.throws(
    () =>
      createApiPresetPlan({
        applicationName: "Contoso.Inventory",
        authenticationProfile: "identity:interactive",
      }),
    /requires relational persistence|not supported by the api preset/i,
  );
  for (const profile of ["oidc", "entra", "identity"]) {
    assert.throws(
      () =>
        createApiPresetPlan({
          applicationName: "Contoso.Inventory",
          authenticationProfile: profile,
        }),
      /explicit.*flow|interactive.*api/i,
    );
  }
  assert.throws(
    () =>
      createApiPresetPlan({
        applicationName: "Contoso.Inventory",
        authenticationProfile: "oidc:api",
        auth: "entra:api-delegated",
      }),
    /conflicting authentication profile/i,
  );
});

test("configured authentication generation emits provider-independent authorization seams", async () => {
  const root = await createTemporaryDirectory();

  try {
    const result = await generateApiPreset({
      applicationName: "Contoso.Inventory",
      authenticationProfile: "oidc:api",
      outputDirectory: join(root, "generated"),
    });
    assert.ok(
      result.files.includes(
        "src/Contoso.Inventory.Api/Infrastructure/Identity/AuthenticationComposition.cs",
      ),
    );
    assert.ok(
      result.files.includes(
        "src/Contoso.Inventory.Api/Infrastructure/Identity/ActorAuthorization.cs",
      ),
    );
    assert.ok(
      result.plan.packageReferences.some(
        ({ id }) => id === "Microsoft.AspNetCore.Authentication.JwtBearer",
      ),
    );
    assert.deepEqual(result.manifest.authentication, {
      profile: "oidc:api",
      provider: "oidc",
      flow: "api",
      state: "selected",
    });

    const authentication = await readFile(
      join(
        root,
        "generated",
        "src",
        "Contoso.Inventory.Api",
        "Infrastructure",
        "Identity",
        "AuthenticationComposition.cs",
      ),
      "utf8",
    );
    const authorization = await readFile(
      join(
        root,
        "generated",
        "src",
        "Contoso.Inventory.Api",
        "Infrastructure",
        "Identity",
        "ActorAuthorization.cs",
      ),
      "utf8",
    );
    const tests = await readFile(
      join(
        root,
        "generated",
        "tests",
        "Contoso.Inventory.Tests",
        "ApiContractTests.cs",
      ),
      "utf8",
    );
    const project = await readFile(
      join(
        root,
        "generated",
        "src",
        "Contoso.Inventory.Api",
        "Contoso.Inventory.Api.csproj",
      ),
      "utf8",
    );
    assert.match(authentication, /AddJwtBearer/);
    assert.match(authentication, /RequireAuthenticatedUser/);
    assert.match(authentication, /Authority/);
    assert.match(authentication, /claim\.Type is "scp" or "scope"/);
    assert.doesNotMatch(authentication, /client-secret-value|password|eyJ[A-Za-z0-9_-]+/i);
    assert.match(authorization, /ActorContext/);
    assert.match(authorization, /PermissionSet/);
    assert.match(authorization, /ActorId/);
    assert.match(authorization, /ClaimTypes\.Role/);
    assert.doesNotMatch(authorization, /ClaimsPrincipal.*Application|IdentityUser|HttpContext.*Operation/);
    assert.match(tests, /RequireAuthorization\("permission:platform-access"\)/);
    assert.match(tests, /ActorContext\.Create/);
    assert.match(tests, /permission-required/);
    assert.match(project, /Microsoft\.AspNetCore\.Authentication\.JwtBearer/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("FastEndpoints selection is explicit and deterministic", async () => {
  const firstRoot = await createTemporaryDirectory();
  const secondRoot = await createTemporaryDirectory();

  try {
    const options = {
      applicationName: "Contoso.Inventory",
      provider: "fastendpoints",
    };
    const first = createApiPresetPlan(options);
    const second = createApiPresetPlan(options);

    assert.deepEqual(first, second);
    assert.deepEqual(first.providers, [{
      id: "fastendpoints",
      capability: "aspnetcore.fastendpoints",
      state: "selected",
    }]);
    assert.ok(first.packageReferences.some(
      ({ id, version }) =>
        id === "MartiX.Platform.AspNetCore.FastEndpoints" &&
        version === API_PLATFORM_VERSION,
    ));

    const generated = await generateApiPreset({
      ...options,
      outputDirectory: join(firstRoot, "generated"),
    });
    const reproduced = await generateApiPreset({
      ...options,
      outputDirectory: join(secondRoot, "generated"),
    });

    assert.deepEqual(generated.files, reproduced.files);
    assert.deepEqual(
      JSON.parse(await readFile(
        join(firstRoot, "generated", "contracts", "openapi-v1.json"),
        "utf8",
      )),
      JSON.parse(await readFile(
        join(secondRoot, "generated", "contracts", "openapi-v1.json"),
        "utf8",
      )),
    );

    const manifest = JSON.parse(await readFile(
      join(firstRoot, "generated", "martix.platform.json"),
      "utf8",
    ));
    assert.deepEqual(manifest.providers, first.providers);

    const productionFiles = generated.files.filter((file) =>
      file.startsWith("src/") && !file.includes(".Client/"));
    const productionText = (
      await Promise.all(productionFiles.map((file) =>
        readFile(join(firstRoot, "generated", file), "utf8")))
    ).join("\n");
    const testSource = await readFile(
      join(
        firstRoot,
        "generated",
        "tests",
        "Contoso.Inventory.Tests",
        "ApiContractTests.cs",
      ),
      "utf8",
    );
    assert.match(productionText, /FastEndpoints/);
    assert.match(productionText, /Endpoint</);
    assert.match(productionText, /var endpointTypes = new List<Type>/);
    assert.match(productionText, /AddMartiXFastEndpoints\(endpointTypes\)/);
    assert.doesNotMatch(productionText, /AddMartiXFastEndpoints\(\);/);
    assert.doesNotMatch(
      productionText,
      /app\.Map(?:Get|Post|Put|Patch|Delete)\s*\(/,
    );
    assert.doesNotMatch(productionText, /OrdersEndpoints\.Map/);
    assert.match(testSource, /typeof\(ConformancePermissionEndpoint\)/);
  } finally {
    await Promise.all([
      rm(firstRoot, { recursive: true, force: true }),
      rm(secondRoot, { recursive: true, force: true }),
    ]);
  }
});

test("FastEndpoints preserves the canonical OpenAPI contract", async () => {
  const root = await createTemporaryDirectory();

  try {
    const baselineRoot = join(root, "minimal-api");
    const fastEndpointsRoot = join(root, "fastendpoints");
    await generateApiPreset({
      applicationName: "Contoso.Inventory",
      outputDirectory: baselineRoot,
    });
    await generateApiPreset({
      applicationName: "Contoso.Inventory",
      provider: "fastendpoints",
      outputDirectory: fastEndpointsRoot,
    });

    const baselineContract = JSON.parse(
      await readFile(
        join(baselineRoot, "contracts", "openapi-v1.json"),
        "utf8",
      ),
    );
    const fastEndpointsContract = JSON.parse(
      await readFile(
        join(fastEndpointsRoot, "contracts", "openapi-v1.json"),
        "utf8",
      ),
    );
    assert.deepEqual(fastEndpointsContract, baselineContract);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
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
    await assert.rejects(
      () => generateApiPreset({
        applicationName: "Contoso.Inventory",
        providers: ["fastendpoints", "minimal-api"],
        outputDirectory: join(output, "invalid-provider-combination"),
      }),
      /exactly one endpoint provider|unknown.*minimal-api|not supported/i,
    );
    await assert.rejects(
      () => generateApiPreset({
        applicationName: "Contoso.Inventory",
        provider: "fastendpoints",
        providers: ["fastendpoints"],
        outputDirectory: join(output, "duplicate-provider"),
      }),
      /duplicate/i,
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
      "src/Contoso.Inventory.Api/Infrastructure/Host/HostSecurity.cs",
      "src/Contoso.Inventory.Api/Infrastructure/Identity/ActorAuthorization.cs",
      "src/Contoso.Inventory.Api/Infrastructure/Identity/AuthenticationComposition.cs",
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
    assert.match(apiSource, /HostSecurity\.ValidateStartup/);
    assert.match(apiSource, /app\.UseForwardedHeaders\(\)/);
    assert.match(apiSource, /app\.UseRateLimiter\(\)/);
    assert.match(apiSource, /app\.UseAuthorization\(\)/);
    assert.match(
      apiSource,
      /\.ProducesMartiXProblemDetails\(ErrorKind\.Unexpected\)/,
    );
    const hostSource = await readFile(
      join(
        firstRoot,
        "generated",
        "src",
        "Contoso.Inventory.Api",
        "Infrastructure",
        "Host",
        "HostSecurity.cs",
      ),
      "utf8",
    );
    assert.match(hostSource, /RequireAuthenticatedUser/);
    assert.match(hostSource, /SecurityAuditEvent\.Create/);
    assert.match(hostSource, /ActivitySource/);
    assert.match(hostSource, /IMeterFactory/);
    assert.match(hostSource, /Microsoft\.Extensions\.Compliance\.Classification/);
    assert.match(hostSource, /Microsoft\.Extensions\.Compliance\.Redaction/);
    assert.match(hostSource, /ErasingRedactor/);
    assert.match(hostSource, /AddOpenTelemetry/);
    assert.match(hostSource, /AddAspNetCoreInstrumentation/);
    assert.match(hostSource, /AddHttpClientInstrumentation/);
    assert.match(hostSource, /FixedWindowRateLimiterOptions/);
    assert.match(hostSource, /CreateChained/);
    assert.match(hostSource, /MaxRequestHeadersTotalSize/);
    assert.match(hostSource, /MultipartBodyLengthLimit/);
    assert.match(hostSource, /AddMeter\(/);
    assert.match(hostSource, /"System\.Runtime"/);
    assert.match(hostSource, /SecurityAuditSink : BackgroundService/);
    assert.match(hostSource, /GetHostAddressesAsync/);
    assert.match(hostSource, /ConnectCallback/);
    assert.match(hostSource, /UseProxy = false/);
    assert.match(hostSource, /application\/problem\+json/);
    assert.match(hostSource, /KnownProxies/);
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
    assert.doesNotMatch(
      generatedText,
      /FastEndpoints|MartiX\.Platform\.AspNetCore\.FastEndpoints|UseFastEndpoints/,
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
