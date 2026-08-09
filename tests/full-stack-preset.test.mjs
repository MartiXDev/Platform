import assert from "node:assert/strict";
import {
  mkdtemp,
  readFile,
  readdir,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  createFullStackPresetPlan,
  generateFullStackPreset,
} from "../eng/full-stack-preset.mjs";
import {
  generateApiPreset,
} from "../eng/api-preset.mjs";
import {
  generateModularMonolithPreset,
} from "../eng/modular-monolith-preset.mjs";

async function createTemporaryDirectory() {
  return mkdtemp(join(tmpdir(), "martix-full-stack-"));
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
        entries.push(relativePath.replaceAll("\\", "/"));
      }
    }
  }

  await visit(root);
  return entries.sort();
}

const baseOptions = {
  applicationName: "MartiX.Portal",
  businessModules: ["Orders"],
  uiProvider: "react",
  defaultCulture: "en-US",
};

test("Full Stack selects exactly one explicit UI provider", () => {
  const plan = createFullStackPresetPlan(baseOptions);

  assert.equal(plan.preset, "full-stack");
  assert.equal(plan.ui.provider, "react");
  assert.equal(plan.ui.contractVersion, "1.0.0");
  assert.equal(plan.ui.defaultCulture, "en-US");
  assert.equal(plan.selected.applicationUi, true);
  assert.deepEqual(
    plan.providers.filter(({ capability }) => capability === "application-ui"),
    [{
      id: "react",
      capability: "application-ui",
      state: "selected",
    }],
  );
  assert.ok(plan.capabilities.includes("application-ui"));

  assert.throws(
    () => createFullStackPresetPlan({
      ...baseOptions,
      uiProvider: undefined,
    }),
    /exactly one explicit UI provider/i,
  );
  assert.throws(
    () => createFullStackPresetPlan({
      ...baseOptions,
      uiProvider: "react",
      ui: "vue",
    }),
    /ui.*provider.*agree|exactly one/i,
  );
  assert.throws(
    () => createFullStackPresetPlan({
      ...baseOptions,
      uiProvider: "svelte",
    }),
    /not supported|supported UI provider/i,
  );
});

test("Full Stack generation emits a provider-neutral UI contract and no product feature", async () => {
  const root = await createTemporaryDirectory();

  try {
    const result = await generateFullStackPreset({
      ...baseOptions,
      outputDirectory: join(root, "generated"),
    });
    const files = await listFiles(join(root, "generated"));

    assert.deepEqual(files, result.files);
    assert.ok(files.includes("src/MartiX.Portal.Web/package.json"));
    assert.ok(files.includes("src/MartiX.Portal.Web/Platform/Api/generated.ts"));
    assert.ok(files.includes("src/MartiX.Portal.Web/Platform/Api/transport.ts"));
    assert.ok(files.includes("src/MartiX.Portal.Web/Platform/Session/session.ts"));
    assert.ok(files.includes("src/MartiX.Portal.Web/Platform/Ui/DesignContract.css"));
    assert.ok(files.includes("src/MartiX.Portal.Web/Platform/Ui/themes.css"));
    assert.ok(files.includes("src/MartiX.Portal.Web/Platform/Localization/en-US.json"));
    assert.ok(files.includes("src/MartiX.Portal.Web/tests/ui-capability-contract.test.ts"));
    assert.ok(files.includes("evidence/ui/browser.md"));
    assert.ok(files.includes("evidence/ui/build.md"));
    assert.ok(files.includes("evidence/ui/security.md"));
    assert.ok(files.includes("evidence/ui/deployment.md"));
    assert.ok(files.includes("evidence/ui/observability.md"));
    assert.ok(
      files.every((file) => !file.includes("Orders") || !file.includes(".Web/")),
    );

    const manifest = JSON.parse(
      await readFile(join(root, "generated", "martix.platform.json"), "utf8"),
    );
    assert.deepEqual(manifest.ui, {
      provider: "react",
      contractVersion: "1.0.0",
      renderingProfile: "application",
      defaultCulture: "en-US",
      sessionOwner: "server-bff",
      themes: ["light", "dark", "system"],
    });

    const packageJson = await readFile(
      join(root, "generated", "src", "MartiX.Portal.Web", "package.json"),
      "utf8",
    );
    const lockfile = await readFile(
      join(root, "generated", "pnpm-lock.yaml"),
      "utf8",
    );
    const generatedClient = await readFile(
      join(
        root,
        "generated",
        "src",
        "MartiX.Portal.Web",
        "Platform",
        "Api",
        "generated.ts",
      ),
      "utf8",
    );
    const transport = await readFile(
      join(
        root,
        "generated",
        "src",
        "MartiX.Portal.Web",
        "Platform",
        "Api",
        "transport.ts",
      ),
      "utf8",
    );
    const designContract = await readFile(
      join(
        root,
        "generated",
        "src",
        "MartiX.Portal.Web",
        "Platform",
        "Ui",
        "DesignContract.css",
      ),
      "utf8",
    );
    const localizationSource = await readFile(
      join(
        root,
        "generated",
        "src",
        "MartiX.Portal.Web",
        "Platform",
        "Localization",
        "messages.ts",
      ),
      "utf8",
    );
    const uiTest = await readFile(
      join(
        root,
        "generated",
        "src",
        "MartiX.Portal.Web",
        "tests",
        "ui-capability-contract.test.ts",
      ),
      "utf8",
    );

    assert.match(packageJson, /openapi-typescript.*7\.13\.0/);
    assert.match(packageJson, /openapi-fetch.*0\.17\.0/);
    assert.match(packageJson, /"typescript":\s*"5\.9\.3"/);
    assert.match(lockfile, /"@fluentui\/react-components":/);
    assert.match(lockfile, /"openapi-typescript":/);
    assert.match(generatedClient, /openapi-typescript/);
    assert.match(generatedClient, /OpenAPI/);
    assert.match(generatedClient, /"\/api\/v1\/orders\/status"/);
    assert.match(generatedClient, /OrdersStatusResponse/);
    assert.match(transport, /credentials:\s*"include"/);
    assert.match(transport, /ProblemDetails/);
    assert.match(transport, /If-Match|ETag/);
    assert.match(transport, /idempotency/i);
    assert.match(transport, /traceparent|correlation/i);
    assert.match(designContract, /--mx-color-focus/);
    assert.match(designContract, /--mx-color-danger-surface/);
    assert.doesNotMatch(designContract, /#[0-9a-f]{3,8}\b/i);
    assert.doesNotMatch(designContract, /fluent/i);
    assert.match(localizationSource, /ui\.state\.empty/);
    assert.match(localizationSource, /ui\.state\.denied/);
    assert.match(localizationSource, /ui\.theme\.dark/);
    assert.match(localizationSource, /ui\.error\.offline/);
    assert.match(uiTest, /loading|empty|denied|offline|reconnect/i);
    assert.match(uiTest, /getByRole/);
    assert.doesNotMatch(uiTest, /Orders|Todo|Weather|fake product/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Blazor Full Stack uses the isolated C# client profile", async () => {
  const root = await createTemporaryDirectory();

  try {
    const result = await generateFullStackPreset({
      ...baseOptions,
      uiProvider: "blazor-webapp",
      outputDirectory: join(root, "generated"),
    });
    const webProject = await readFile(
      join(
        root,
        "generated",
        "src",
        "MartiX.Portal.Web",
        "MartiX.Portal.Web.csproj",
      ),
      "utf8",
    );
    const client = await readFile(
      join(
        root,
        "generated",
        "src",
        "MartiX.Portal.Web",
        "Platform",
        "Api",
        "GeneratedClient.cs",
      ),
      "utf8",
    );
    const localization = await readFile(
      join(
        root,
        "generated",
        "src",
        "MartiX.Portal.Web",
        "Platform",
        "Localization",
        "Messages.cs",
      ),
      "utf8",
    );

    assert.ok(result.files.includes("src/MartiX.Portal.Web/MartiX.Portal.Web.csproj"));
    assert.match(webProject, /NSwag\.ConsoleCore.*14\.7\.1/);
    assert.match(client, /HttpRequestMessage|ApiTransport/);
    assert.match(client, /CancellationToken/);
    assert.match(client, /GetOrdersStatusAsync/);
    assert.match(client, /\/api\/v1\/orders\/status/);
    assert.match(client, /HttpMethod\.Get/);
    assert.match(localization, /ui\.state\.denied/);
    assert.match(localization, /ui\.theme\.dark/);
    assert.match(localization, /ui\.error\.offline/);
    assert.match(client, /ProblemDetails|ApiException/);
    assert.doesNotMatch(webProject, /ProjectReference/);
    assert.doesNotMatch(client, /MartiX\.Portal\.(Api|Orders)/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Blazor Full Stack emits a server-owned Fluent UI composition boundary", async () => {
  const root = await createTemporaryDirectory();

  try {
    const result = await generateFullStackPreset({
      ...baseOptions,
      uiProvider: "blazor-webapp",
      outputDirectory: join(root, "generated"),
    });
    const webRoot = join(
      root,
      "generated",
      "src",
      "MartiX.Portal.Web",
    );
    const files = await listFiles(join(root, "generated"));
    const program = await readFile(join(webRoot, "Program.cs"), "utf8");
    const webProject = await readFile(
      join(webRoot, "MartiX.Portal.Web.csproj"),
      "utf8",
    );
    const testProject = await readFile(
      join(
        root,
        "generated",
        "tests",
        "MartiX.Portal.Tests",
        "MartiX.Portal.Tests.csproj",
      ),
      "utf8",
    );
    const uiContract = JSON.parse(
      await readFile(
        join(root, "generated", "contracts", "ui-capability-v1.json"),
        "utf8",
      ),
    );
    const app = await readFile(join(webRoot, "App.razor"), "utf8");
    const routes = await readFile(
      join(webRoot, "Components", "Routes.razor"),
      "utf8",
    );
    const transport = await readFile(
      join(webRoot, "Platform", "Api", "Transport.cs"),
      "utf8",
    );
    const generatedClient = await readFile(
      join(webRoot, "Platform", "Api", "GeneratedClient.cs"),
      "utf8",
    );
    const session = await readFile(
      join(webRoot, "Platform", "Session", "Session.cs"),
      "utf8",
    );
    const authorization = await readFile(
      join(webRoot, "Platform", "Authorization", "Authorization.cs"),
      "utf8",
    );
    const componentCss = await readFile(
      join(webRoot, "Components", "Routes.razor.css"),
      "utf8",
    );
    const browserTest = await readFile(
      join(
        root,
        "generated",
        "tests",
        "MartiX.Portal.Tests",
        "UiCapabilityContractTests.cs",
      ),
      "utf8",
    );
    const browserEvidence = await readFile(
      join(root, "generated", "evidence", "ui", "browser.md"),
      "utf8",
    );

    assert.ok(files.includes("src/MartiX.Portal.Web/Platform/Api/Transport.cs"));
    assert.ok(files.includes("src/MartiX.Portal.Web/Platform/Session/Session.cs"));
    assert.ok(
      files.includes(
        "src/MartiX.Portal.Web/Platform/Authorization/Authorization.cs",
      ),
    );
    assert.ok(
      files.includes("src/MartiX.Portal.Web/Components/Routes.razor.css"),
    );
    assert.ok(
      files.includes(
        "src/MartiX.Portal.Web/wwwroot/Platform/Ui/DesignContract.css",
      ),
    );
    assert.ok(
      files.includes("src/MartiX.Portal.Web/wwwroot/Platform/Ui/themes.css"),
    );
    assert.equal(
      files.some((file) => file.startsWith("src/MartiX.Portal.Web/") &&
        (file.endsWith(".ts") || file.endsWith(".tsx"))),
      false,
    );
    assert.match(webProject, /Microsoft\.FluentUI\.AspNetCore\.Components/);
    assert.match(testProject, /Include="bunit"/);
    assert.match(testProject, /Include="Microsoft\.Playwright"/);
    assert.deepEqual(uiContract.rendering.claims, {
      serverRendering: "interactive-server-prerendered",
      publicSeo: "not-guaranteed",
      privateCaching: "no-store",
    });
    assert.match(program, /AddFluentUIComponents/);
    assert.match(app, /FluentDesignTheme/);
    assert.match(routes, /GeneratedClient|Transport/);
    assert.match(routes, /FluentButton|Appearance/);
    assert.match(transport, /HttpClient/);
    assert.match(generatedClient, /apiTransport\.SendAsync/);
    assert.match(generatedClient, /ProblemDetails/);
    assert.match(generatedClient, /HttpMethod\.Get/);
    assert.match(transport, /Idempotency-Key/);
    assert.match(transport, /If-Match/);
    assert.match(session, /AuthenticationStateProvider|server-owned/i);
    assert.match(session, /IHttpContextAccessor|FromPrincipal/);
    assert.match(authorization, /anonymous|authenticated|denied|expired/i);
    assert.match(transport, /CloneSafeReadRequest/);
    assert.match(componentCss, /:host|application-shell/);
    assert.match(browserTest, /Playwright|bUnit|loading|reconnect/i);
    assert.match(browserEvidence, /Interactive Server|prerender|reconnect/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Blazor hybrid rendering keeps public routes static and private state interactive", async () => {
  const root = await createTemporaryDirectory();

  try {
    await generateFullStackPreset({
      ...baseOptions,
      uiProvider: "blazor-webapp",
      renderingProfile: "hybrid-web",
      outputDirectory: join(root, "generated"),
    });
    const webRoot = join(
      root,
      "generated",
      "src",
      "MartiX.Portal.Web",
    );
    const app = await readFile(join(webRoot, "App.razor"), "utf8");
    const routes = await readFile(
      join(webRoot, "Components", "Routes.razor"),
      "utf8",
    );

    assert.doesNotMatch(app, /<Routes\s+@rendermode="InteractiveServer"/);
    assert.match(
      routes,
      /<AuthorizeView\s+@rendermode="InteractiveServer">/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("API and Modular Monolith generation remain UI-free", async () => {
  const root = await createTemporaryDirectory();

  try {
    const api = await generateApiPreset({
      applicationName: "MartiX.ApiOnly",
      outputDirectory: join(root, "api"),
    });
    const modular = await generateModularMonolithPreset({
      applicationName: "MartiX.Modules",
      businessModules: ["Orders"],
      outputDirectory: join(root, "modular"),
    });

    assert.equal(api.plan.selected.applicationUi, false);
    assert.equal(modular.plan.selected.applicationUi, false);
    assert.equal(api.files.some((file) => file.includes(".Web/")), false);
    assert.equal(modular.files.some((file) => file.includes(".Web/")), false);
    assert.equal(
      [...api.plan.packageReferences, ...modular.plan.packageReferences]
        .some(({ id }) => /Fluent|React|Vue|openapi-fetch|openapi-typescript/i.test(id)),
      false,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
