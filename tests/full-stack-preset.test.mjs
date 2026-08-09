import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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
    assert.ok(files.includes("evidence/ui/client.md"));
    assert.ok(files.includes("evidence/ui/security.md"));
    assert.ok(files.includes("evidence/ui/deployment.md"));
    assert.ok(files.includes("evidence/ui/observability.md"));
    assert.ok(
      files.includes("src/MartiX.Portal.Web/public/ui-config.json"),
    );
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
    assert.match(lockfile, /['"]@fluentui\/react-components['"]:/);
    assert.match(lockfile, /openapi-typescript:/);
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

test("Vue Full Stack composes Vue Router and Vue Query without unsafe rendering", async () => {
  const root = await createTemporaryDirectory();

  try {
    const result = await generateFullStackPreset({
      ...baseOptions,
      uiProvider: "vue",
      outputDirectory: join(root, "generated"),
    });
    const webRoot = join(
      root,
      "generated",
      "src",
      "MartiX.Portal.Web",
    );
    const application = await readFile(join(webRoot, "App.vue"), "utf8");
    const entry = await readFile(join(webRoot, "main.ts"), "utf8");
    const router = await readFile(
      join(webRoot, "Platform", "Navigation", "router.ts"),
      "utf8",
    );

    assert.equal(result.plan.ui.provider, "vue");
    assert.ok(
      result.files.includes(
        "src/MartiX.Portal.Web/Platform/Navigation/router.ts",
      ),
    );
    assert.match(application, /<script setup lang="ts">/);
    assert.match(application, /aria-live="polite"/);
    assert.doesNotMatch(application, /v-html/);
    assert.match(entry, /QueryClient/);
    assert.match(entry, /VueQueryPlugin/);
    assert.match(entry, /router/);
    assert.match(router, /createRouter/);
    assert.match(router, /createWebHistory/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Vue Full Stack pins its runtime, package graph, and install policy", async () => {
  const root = await createTemporaryDirectory();

  try {
    await generateFullStackPreset({
      ...baseOptions,
      uiProvider: "vue",
      outputDirectory: join(root, "generated"),
    });
    const generatedRoot = join(root, "generated");
    const rootPackage = JSON.parse(
      await readFile(join(generatedRoot, "package.json"), "utf8"),
    );
    const uiPackage = JSON.parse(
      await readFile(
        join(generatedRoot, "src", "MartiX.Portal.Web", "package.json"),
        "utf8",
      ),
    );
    const workspace = await readFile(
      join(generatedRoot, "pnpm-workspace.yaml"),
      "utf8",
    );
    const lockfile = await readFile(
      join(generatedRoot, "pnpm-lock.yaml"),
      "utf8",
    );

    assert.equal(rootPackage.packageManager, "pnpm@10.34.5");
    assert.deepEqual(rootPackage.engines, {
      node: "^20.19.0 || >=22.12.0",
    });
    assert.deepEqual(uiPackage.engines, rootPackage.engines);
    assert.equal(uiPackage.scripts.build, "vue-tsc --noEmit && vite build");
    assert.equal(uiPackage.devDependencies["vue-tsc"], "3.1.0");
    assert.equal(uiPackage.dependencies.vue, "3.5.22");
    assert.equal(uiPackage.dependencies["vue-router"], "4.5.1");
    assert.equal(uiPackage.dependencies["@tanstack/vue-query"], "5.90.2");
    assert.ok(
      Object.values(uiPackage).every(
        (value) => typeof value !== "string" || !/[\\^~]/.test(value),
      ),
    );
    assert.match(workspace, /minimumReleaseAge: 4320/);
    assert.match(workspace, /minimumReleaseAgeStrict: true/);
    assert.match(workspace, /minimumReleaseAgeIgnoreMissingTime: false/);
    assert.match(workspace, /trustPolicy: no-downgrade/);
    assert.match(workspace, /trustLockfile: false/);
    assert.match(workspace, /blockExoticSubdeps: true/);
    assert.match(workspace, /strictPeerDependencies: true/);
    assert.match(workspace, /engineStrict: true/);
    assert.match(workspace, /verifyDepsBeforeRun: error/);
    assert.match(workspace, /strictDepBuilds: true/);
    assert.match(workspace, /allowBuilds:\s+"esbuild@0\.25\.12": true/);
    assert.doesNotMatch(workspace, /dangerouslyAllowAllBuilds/);
    assert.match(lockfile, /src\/MartiX\.Portal\.Web:/);
    assert.match(lockfile, /vue-router/);
    assert.match(lockfile, /^packages:/m);
    assert.match(lockfile, /^snapshots:/m);
    assert.doesNotMatch(lockfile, /__UI_ROOT__/);
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
    assert.match(client, /HttpClient/);
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

test("React Full Stack emits an attested provider boundary", async () => {
  const root = await createTemporaryDirectory();

  try {
    await generateFullStackPreset({
      ...baseOptions,
      outputDirectory: join(root, "generated"),
    });

    const webRoot = join(root, "generated", "src", "MartiX.Portal.Web");
    const packageJson = JSON.parse(
      await readFile(join(webRoot, "package.json"), "utf8"),
    );
    const workspacePolicy = await readFile(
      join(root, "generated", "pnpm-workspace.yaml"),
      "utf8",
    );
    const lockfile = await readFile(
      join(root, "generated", "pnpm-lock.yaml"),
      "utf8",
    );
    const app = await readFile(join(webRoot, "App.tsx"), "utf8");
    const generatedClient = await readFile(
      join(webRoot, "Platform", "Api", "generated.ts"),
      "utf8",
    );
    const openApiContract = await readFile(
      join(root, "generated", "contracts", "openapi-v1.json"),
      "utf8",
    );
    const session = await readFile(
      join(webRoot, "Platform", "Session", "session.ts"),
      "utf8",
    );
    const runtimeConfiguration = await readFile(
      join(webRoot, "Platform", "Runtime", "config.ts"),
      "utf8",
    );
    const generatedClientCheck = await readFile(
      join(webRoot, "scripts", "verify-generated-client.mjs"),
      "utf8",
    );

    assert.match(packageJson.packageManager, /^pnpm@\d+\.\d+\.\d+$/);
    assert.deepEqual(Object.keys(packageJson.engines).sort(), ["node", "pnpm"]);
    assert.deepEqual(packageJson.peerDependencies, {
      react: "19.1.1",
      "react-dom": "19.1.1",
    });
    assert.equal(
      packageJson.scripts["install:ci"],
      "pnpm install --frozen-lockfile --ignore-scripts",
    );
    assert.match(workspacePolicy, /^minimumReleaseAge: 4320$/m);
    assert.match(workspacePolicy, /^trustLockfile: false$/m);
    assert.match(workspacePolicy, /^blockExoticSubdeps: true$/m);
    assert.match(workspacePolicy, /^strictPeerDependencies: true$/m);
    assert.match(workspacePolicy, /^engineStrict: true$/m);
    assert.match(workspacePolicy, /^strictDepBuilds: true$/m);
    assert.match(workspacePolicy, /^allowBuilds:$/m);
    assert.match(workspacePolicy, /^\s+esbuild: 0\.25\.12$/m);
    assert.match(lockfile, /^packages:$/m);
    assert.match(lockfile, /^snapshots:$/m);
    assert.match(lockfile, /^  src\/MartiX\.Portal\.Web:$/m);
    assert.doesNotMatch(lockfile, /__MARTIX_APPLICATION_NAME__/);
    assert.match(lockfile, /resolution:\s*\{integrity:/);
    assert.match(lockfile, /'@fluentui\/react-icons@/);
    assert.match(lockfile, /'@fluentui\/react-components@[^']+':\n    dependencies:/);
    assert.match(app, /createGeneratedClient/);
    assert.match(app, /QueryClientProvider/);
    assert.match(app, /readSession/);
    assert.match(session, /credentials: "include"/);
    assert.doesNotMatch(
      session,
      /localStorage|sessionStorage|indexedDB|accessToken|refreshToken/i,
    );
    assert.match(runtimeConfiguration, /ui-config\.json/);
    assert.match(generatedClientCheck, /sha256|createHash/i);
    const generatedDigest = generatedClient.match(
      /Contract SHA-256: ([a-f0-9]{64})\./,
    )?.[1];
    assert.equal(
      generatedDigest,
      createHash("sha256")
        .update(openApiContract.replaceAll(/\r\n?/g, "\n"))
        .digest("hex"),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
