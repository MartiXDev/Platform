import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { toDatabaseIdentifier } from "./database-naming.mjs";
import { listFiles } from "./list-files.mjs";
import { findDependencyCycle } from "./module-graph.mjs";
import {
  listOpenApiOperations,
  renderOpenApiContract,
} from "./openapi-client.mjs";
import { verifyAgentReadiness } from "./agent-readiness.mjs";
import {
  FORBIDDEN_RELIABLE_EVENT_PROVIDER_IMPLEMENTATIONS,
  MODULAR_MONOLITH_ALPHA_GATE_IDS,
  MODULAR_MONOLITH_ALPHA_PROVIDERS,
  RELIABLE_EVENT_PROVIDER_IMPLEMENTATIONS,
} from "./modular-monolith-alpha.mjs";
import {
  FULL_STACK_UI_APPLICATION_FILES,
  FULL_STACK_UI_BROWSER_ENTRY_FILES,
  FULL_STACK_UI_BUILD_ALLOWLIST,
  FULL_STACK_UI_BUILD_SCRIPT,
  FULL_STACK_UI_CAPABILITIES,
  FULL_STACK_UI_CONTRACT_VERSION,
  FULL_STACK_UI_CULTURE_PATTERN,
  FULL_STACK_UI_EVIDENCE,
  FULL_STACK_UI_LOCKFILE_SECTIONS,
  FULL_STACK_REACT_NODE_ENGINE,
  FULL_STACK_REACT_PACKAGE_MANAGER,
  FULL_STACK_UI_MESSAGE_KEYS,
  FULL_STACK_UI_NODE_ENGINE,
  FULL_STACK_UI_PACKAGE_MANAGER,
  FULL_STACK_UI_PNPM_WORKSPACE_SETTINGS,
  FULL_STACK_UI_PROVIDERS,
  FULL_STACK_UI_RENDERING_PROFILE_CLAIMS,
  FULL_STACK_UI_RENDERING_PROFILES,
  FULL_STACK_UI_SESSION_OWNER,
  FULL_STACK_UI_THEMES,
} from "./full-stack-ui-contract.mjs";
import {
  ProviderAdmissionError,
  admitProviderSelection,
  verifyProviderAdmission,
  verifyProviderAdmissionEvidence,
} from "./provider-admission.mjs";

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
const FULL_STACK_SOLUTION_NAME = "FullStackGeneratedSolution";
const FULL_STACK_SOLUTION_ROOT = `tests/fixtures/${FULL_STACK_SOLUTION_NAME}`;
const PROVIDER_ADMISSION_SOLUTION_NAME = "ProviderAdmissionGeneratedSolution";
const PROVIDER_ADMISSION_SOLUTION_ROOT =
  `tests/fixtures/${PROVIDER_ADMISSION_SOLUTION_NAME}`;
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
  "bootstrap.full-stack",
  "bootstrap.provider-admission",
  "bootstrap.host-baseline",
  "bootstrap.secret-free",
  "bootstrap.agent-readiness",
];
const MODULAR_MONOLITH_ALPHA_PROFILE_ID = "modular-monolith-alpha";
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
  "authentication",
  "ui",
  "modules",
];
const FULL_STACK_UI_PROVIDER_SET = new Set(FULL_STACK_UI_PROVIDERS);
const FULL_STACK_UI_INPUTS = [
  ...FULL_STACK_UI_EVIDENCE.map(
    (evidenceName) =>
      `${FULL_STACK_SOLUTION_ROOT}/evidence/ui/${evidenceName}.md`,
  ),
  `${FULL_STACK_SOLUTION_ROOT}/src/MartiX.FullStackTestApp.Web/App.razor`,
  `${FULL_STACK_SOLUTION_ROOT}/src/MartiX.FullStackTestApp.Web/Platform/Api/README.md`,
  `${FULL_STACK_SOLUTION_ROOT}/src/MartiX.FullStackTestApp.Web/Platform/Api/GeneratedClient.cs`,
  `${FULL_STACK_SOLUTION_ROOT}/src/MartiX.FullStackTestApp.Web/Platform/Api/Transport.cs`,
  `${FULL_STACK_SOLUTION_ROOT}/src/MartiX.FullStackTestApp.Web/Platform/Authorization/Authorization.cs`,
  `${FULL_STACK_SOLUTION_ROOT}/src/MartiX.FullStackTestApp.Web/Platform/Localization/en-US.json`,
  `${FULL_STACK_SOLUTION_ROOT}/src/MartiX.FullStackTestApp.Web/Platform/Localization/Messages.cs`,
  `${FULL_STACK_SOLUTION_ROOT}/src/MartiX.FullStackTestApp.Web/Platform/Runtime/Config.cs`,
  `${FULL_STACK_SOLUTION_ROOT}/src/MartiX.FullStackTestApp.Web/Platform/Session/Session.cs`,
  `${FULL_STACK_SOLUTION_ROOT}/src/MartiX.FullStackTestApp.Web/wwwroot/Platform/Ui/DesignContract.css`,
  `${FULL_STACK_SOLUTION_ROOT}/src/MartiX.FullStackTestApp.Web/wwwroot/Platform/Ui/themes.css`,
  `${FULL_STACK_SOLUTION_ROOT}/src/MartiX.FullStackTestApp.Web/Components/Routes.razor`,
  `${FULL_STACK_SOLUTION_ROOT}/src/MartiX.FullStackTestApp.Web/Components/Routes.razor.css`,
  `${FULL_STACK_SOLUTION_ROOT}/src/MartiX.FullStackTestApp.Web/MartiX.FullStackTestApp.Web.csproj`,
  `${FULL_STACK_SOLUTION_ROOT}/src/MartiX.FullStackTestApp.Web/Program.cs`,
  `${FULL_STACK_SOLUTION_ROOT}/tests/MartiX.FullStackTestApp.Tests/UiCapabilityContractTests.cs`,
];
const AUTHENTICATION_PROFILES = new Map([
  ["none", ["none", "anonymous"]],
  ["identity:interactive", ["identity", "interactive"]],
  ["oidc:interactive", ["oidc", "interactive"]],
  ["oidc:api", ["oidc", "api"]],
  ["entra:interactive", ["entra", "interactive"]],
  ["entra:api-delegated", ["entra", "api-delegated"]],
  ["entra:api-application", ["entra", "api-application"]],
]);

export const REQUIRED_BOOTSTRAP_INPUTS = [
  "martix.platform.json",
  "schemas/martix.platform.schema.json",
  "schemas/agent-context.schema.json",
  "schemas/quality-gates.schema.json",
  "eng/quality-gates.json",
  "eng/agent-context.mjs",
  "eng/agent-readiness.mjs",
  "skills/martix-platform/SKILL.md",
  "skills/martix-platform/agents/openai.yaml",
  "skills/martix-platform/release.json",
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
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Api/Infrastructure/Host/HostSecurity.cs`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Api/Infrastructure/Identity/ActorAuthorization.cs`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Api/Infrastructure/Identity/AuthenticationComposition.cs`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Api/Infrastructure/IntegrationEvents/ReliableEventsComposition.cs`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/contracts/openapi-v1.json`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Client/MartiX.TemplateTestApp.Client.csproj`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Client/MartiX.TemplateTestApp.Client.cs`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Migrator/MartiX.TemplateTestApp.Migrator.csproj`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Migrator/Program.cs`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Orders/MartiX.TemplateTestApp.Orders.csproj`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Orders/OrdersModule.cs`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Orders/Contracts/ModuleContracts/IOrdersStatus.cs`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Orders/Contracts/IntegrationEvents/OrdersIntegrationEvents.cs`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Orders/Domain/OrdersAggregate.cs`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Orders/Features/Status/OrdersStatus.cs`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Orders/Infrastructure/Persistence/OrdersDbContext.cs`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Orders/Infrastructure/Persistence/OrdersPersistenceModel.cs`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Orders/Infrastructure/IntegrationEvents/OrdersReliableEvents.cs`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Orders/Infrastructure/Persistence/Migrations/20260101000000_InitialOrders.cs`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Orders/Infrastructure/Persistence/Migrations/OrdersDbContextModelSnapshot.cs`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Billing/MartiX.TemplateTestApp.Billing.csproj`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Billing/BillingModule.cs`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Billing/Contracts/ModuleContracts/IBillingStatus.cs`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Billing/Contracts/IntegrationEvents/BillingIntegrationEvents.cs`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Billing/Domain/BillingAggregate.cs`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Billing/Features/Status/BillingStatus.cs`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Billing/Infrastructure/Persistence/BillingDbContext.cs`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Billing/Infrastructure/Persistence/BillingPersistenceModel.cs`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Billing/Infrastructure/IntegrationEvents/BillingReliableEvents.cs`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Billing/Infrastructure/Persistence/Migrations/20260101000000_InitialBilling.cs`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/src/MartiX.TemplateTestApp.Billing/Infrastructure/Persistence/Migrations/BillingDbContextModelSnapshot.cs`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/tests/MartiX.TemplateTestApp.Tests/MartiX.TemplateTestApp.Tests.csproj`,
  `${MODULAR_MONOLITH_SOLUTION_ROOT}/tests/MartiX.TemplateTestApp.Tests/ModularMonolithCompositionTests.cs`,
  `${FULL_STACK_SOLUTION_ROOT}/README.md`,
  `${FULL_STACK_SOLUTION_ROOT}/AGENTS.md`,
  `${FULL_STACK_SOLUTION_ROOT}/CONTEXT.md`,
  `${FULL_STACK_SOLUTION_ROOT}/MartiX.FullStackTestApp.slnx`,
  `${FULL_STACK_SOLUTION_ROOT}/martix.platform.json`,
  `${FULL_STACK_SOLUTION_ROOT}/contracts/openapi-v1.json`,
  `${FULL_STACK_SOLUTION_ROOT}/contracts/ui-capability-v1.json`,
  `${FULL_STACK_SOLUTION_ROOT}/src/MartiX.FullStackTestApp.Api/MartiX.FullStackTestApp.Api.csproj`,
  `${FULL_STACK_SOLUTION_ROOT}/src/MartiX.FullStackTestApp.Api/Program.cs`,
  `${FULL_STACK_SOLUTION_ROOT}/src/MartiX.FullStackTestApp.Api/Infrastructure/Host/HostSecurity.cs`,
  `${FULL_STACK_SOLUTION_ROOT}/src/MartiX.FullStackTestApp.Api/Infrastructure/Identity/ActorAuthorization.cs`,
  `${FULL_STACK_SOLUTION_ROOT}/src/MartiX.FullStackTestApp.Api/Infrastructure/Identity/AuthenticationComposition.cs`,
  `${FULL_STACK_SOLUTION_ROOT}/src/MartiX.FullStackTestApp.Api/Infrastructure/IntegrationEvents/ReliableEventsComposition.cs`,
  `${FULL_STACK_SOLUTION_ROOT}/src/MartiX.FullStackTestApp.Client/MartiX.FullStackTestApp.Client.csproj`,
  `${FULL_STACK_SOLUTION_ROOT}/src/MartiX.FullStackTestApp.Client/MartiX.FullStackTestApp.Client.cs`,
  `${FULL_STACK_SOLUTION_ROOT}/src/MartiX.FullStackTestApp.Migrator/MartiX.FullStackTestApp.Migrator.csproj`,
  `${FULL_STACK_SOLUTION_ROOT}/src/MartiX.FullStackTestApp.Migrator/Program.cs`,
  `${FULL_STACK_SOLUTION_ROOT}/src/MartiX.FullStackTestApp.Orders/MartiX.FullStackTestApp.Orders.csproj`,
  `${FULL_STACK_SOLUTION_ROOT}/src/MartiX.FullStackTestApp.Orders/OrdersModule.cs`,
  `${FULL_STACK_SOLUTION_ROOT}/src/MartiX.FullStackTestApp.Orders/Contracts/ModuleContracts/IOrdersStatus.cs`,
  `${FULL_STACK_SOLUTION_ROOT}/src/MartiX.FullStackTestApp.Orders/Contracts/IntegrationEvents/OrdersIntegrationEvents.cs`,
  `${FULL_STACK_SOLUTION_ROOT}/src/MartiX.FullStackTestApp.Orders/Domain/OrdersAggregate.cs`,
  `${FULL_STACK_SOLUTION_ROOT}/src/MartiX.FullStackTestApp.Orders/Features/Status/OrdersStatus.cs`,
  `${FULL_STACK_SOLUTION_ROOT}/src/MartiX.FullStackTestApp.Orders/Infrastructure/Persistence/OrdersDbContext.cs`,
  `${FULL_STACK_SOLUTION_ROOT}/src/MartiX.FullStackTestApp.Orders/Infrastructure/Persistence/OrdersPersistenceModel.cs`,
  `${FULL_STACK_SOLUTION_ROOT}/src/MartiX.FullStackTestApp.Orders/Infrastructure/IntegrationEvents/OrdersReliableEvents.cs`,
  `${FULL_STACK_SOLUTION_ROOT}/src/MartiX.FullStackTestApp.Orders/Infrastructure/Persistence/Migrations/20260101000000_InitialOrders.cs`,
  `${FULL_STACK_SOLUTION_ROOT}/src/MartiX.FullStackTestApp.Orders/Infrastructure/Persistence/Migrations/OrdersDbContextModelSnapshot.cs`,
  `${FULL_STACK_SOLUTION_ROOT}/tests/MartiX.FullStackTestApp.Tests/MartiX.FullStackTestApp.Tests.csproj`,
  `${FULL_STACK_SOLUTION_ROOT}/tests/MartiX.FullStackTestApp.Tests/ModularMonolithCompositionTests.cs`,
  ...FULL_STACK_UI_INPUTS,
  `${PROVIDER_ADMISSION_SOLUTION_ROOT}/README.md`,
  `${PROVIDER_ADMISSION_SOLUTION_ROOT}/AGENTS.md`,
  `${PROVIDER_ADMISSION_SOLUTION_ROOT}/CONTEXT.md`,
  `${PROVIDER_ADMISSION_SOLUTION_ROOT}/martix.platform.json`,
  `${PROVIDER_ADMISSION_SOLUTION_ROOT}/provider-admission.json`,
  "eng/provider-admission.mjs",
  "tests/fixtures/PlatformMigrationAlphaGeneratedSolution/AGENTS.md",
  "tests/fixtures/PlatformMigrationAlphaGeneratedSolution/CONTEXT.md",
  "tests/fixtures/PlatformMigrationAlphaGeneratedSolution/PlatformMigrationRehearsal.json",
  "tests/fixtures/PlatformMigrationAlphaGeneratedSolution/README.md",
  "tests/fixtures/PlatformMigrationAlphaGeneratedSolution/martix.platform.json",
  "tests/fixtures/PlatformMigrationAlphaGeneratedSolution/src/MartiX.AlphaRehearsal.Api/MartiX.AlphaRehearsal.Api.csproj",
  "tests/fixtures/PlatformMigrationAlphaGeneratedSolution/src/MartiX.AlphaRehearsal.Api/OwnerComposition.cs",
  "tests/fixtures/PlatformMigrationAlphaGeneratedSolution/src/MartiX.AlphaRehearsal.Orders/MartiX.AlphaRehearsal.Orders.csproj",
  "tests/fixtures/PlatformMigrationAlphaGeneratedSolution/src/MartiX.AlphaRehearsal.Orders/OrdersModule.cs",
  "tests/fixtures/PlatformMigrationAlphaGeneratedSolution/tests/MartiX.AlphaRehearsal.Tests/MartiX.AlphaRehearsal.Tests.csproj",
];

const FORBIDDEN_SECRET_KEY =
  /(?:secret|password|token|private.?key|access.?key|api.?key|credential)/i;
const ALLOWED_SECRET_METADATA_KEYS = new Set([
  "secretPolicy",
  "containsSecrets",
]);

export class BootstrapVerificationError extends Error {}

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

  if (manifest.authentication !== undefined) {
    validateAuthenticationManifest(manifest.authentication, `${path}.authentication`);
  }

  if (
    manifest.preset === "modular-monolith" ||
    manifest.preset === "full-stack"
  ) {
    validateModularMonolithManifest(manifest, path);
  } else if (Object.hasOwn(manifest, "modules")) {
    fail(
      `Invalid bootstrap value at ${path}.modules: modules require the modular-monolith preset.`,
    );
  }
  if (manifest.preset === "full-stack") {
    validateFullStackManifest(manifest, path);
  } else if (Object.hasOwn(manifest, "ui")) {
    fail(
      `Invalid bootstrap value at ${path}.ui: ui requires the full-stack preset.`,
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

  function validateAuthenticationManifest(authentication, path) {
    requireRecord(authentication, path);
    rejectUnknownProperties(authentication, ["profile", "provider", "flow", "state"], path);
    for (const property of ["profile", "provider", "flow", "state"]) {
      requireString(authentication[property], `${path}.${property}`);
    }
    const expected = AUTHENTICATION_PROFILES.get(authentication.profile);
    if (expected === undefined) {
      fail(`Invalid authentication profile at ${path}.profile: ${authentication.profile}.`);
    }
    if (
      authentication.provider !== expected[0]
      || authentication.flow !== expected[1]
      || authentication.state !== "selected"
    ) {
      fail(`Authentication profile metadata is inconsistent at ${path}.`);
    }
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

function validateFullStackManifest(manifest, path) {
  requireRecord(manifest.ui, `${path}.ui`);
  rejectUnknownProperties(
    manifest.ui,
    [
      "provider",
      "contractVersion",
      "renderingProfile",
      "defaultCulture",
      "sessionOwner",
      "themes",
    ],
    `${path}.ui`,
  );
  requireString(manifest.ui.provider, `${path}.ui.provider`);
  if (!FULL_STACK_UI_PROVIDER_SET.has(manifest.ui.provider)) {
    fail(
      `Invalid Full Stack UI provider at ${path}.ui.provider: ${manifest.ui.provider}.`,
    );
  }
  requireString(manifest.ui.contractVersion, `${path}.ui.contractVersion`);
  if (manifest.ui.contractVersion !== FULL_STACK_UI_CONTRACT_VERSION) {
    fail(
      `Invalid Full Stack UI contract version at ${path}.ui.contractVersion: expected ${FULL_STACK_UI_CONTRACT_VERSION}.`,
    );
  }
  requireString(
    manifest.ui.renderingProfile,
    `${path}.ui.renderingProfile`,
  );
  if (!FULL_STACK_UI_RENDERING_PROFILES.includes(manifest.ui.renderingProfile)) {
    fail(
      `Invalid Full Stack rendering profile at ${path}.ui.renderingProfile.`,
    );
  }
  requireString(manifest.ui.defaultCulture, `${path}.ui.defaultCulture`);
  if (
    !FULL_STACK_UI_CULTURE_PATTERN.test(manifest.ui.defaultCulture)
  ) {
    fail(`Invalid BCP 47 default culture at ${path}.ui.defaultCulture.`);
  }
  if (manifest.ui.sessionOwner !== FULL_STACK_UI_SESSION_OWNER) {
    fail(
      `Full Stack UI sessions must be owned by the server BFF at ${path}.ui.sessionOwner.`,
    );
  }
  requireArray(manifest.ui.themes, `${path}.ui.themes`);
  if (
    JSON.stringify(manifest.ui.themes) !== JSON.stringify(FULL_STACK_UI_THEMES)
  ) {
    fail(
      `Full Stack UI themes must be light, dark, and system at ${path}.ui.themes.`,
    );
  }

  const uiProviders = manifest.providers.filter(
    (provider) => provider?.capability === "application-ui",
  );
  if (
    uiProviders.length !== 1 ||
    uiProviders[0].state !== "selected" ||
    uiProviders[0].id !== manifest.ui.provider
  ) {
    fail(
      "Full Stack manifest must select exactly one application UI provider matching ui.provider.",
    );
  }
  for (const capability of FULL_STACK_UI_CAPABILITIES) {
    const selected = manifest.capabilities.find(
      (candidate) => candidate?.id === capability,
    );
    if (selected?.state !== "selected") {
      fail(
        `Full Stack manifest must select the ${capability} capability.`,
      );
    }
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
    "contracts/openapi-v1.json",
    `src/${applicationName}.Api/${applicationName}.Api.csproj`,
    `src/${applicationName}.Api/Infrastructure/Host/HostSecurity.cs`,
    `src/${applicationName}.Api/Infrastructure/Identity/ActorAuthorization.cs`,
    `src/${applicationName}.Api/Infrastructure/Identity/AuthenticationComposition.cs`,
    `src/${applicationName}.Api/Program.cs`,
    `src/${applicationName}.Api/Infrastructure/IntegrationEvents/ReliableEventsComposition.cs`,
    `src/${applicationName}.Client/${applicationName}.Client.csproj`,
    `src/${applicationName}.Client/${applicationName}.Client.cs`,
    `src/${applicationName}.Migrator/${applicationName}.Migrator.csproj`,
    `src/${applicationName}.Migrator/Program.cs`,
    `tests/${applicationName}.Tests/${applicationName}.Tests.csproj`,
    `tests/${applicationName}.Tests/ModularMonolithCompositionTests.cs`,
  ];

  if (manifest.authentication?.profile === "identity:interactive") {
    files.push(
      `src/${applicationName}.Api/Infrastructure/Identity/IdentityDbContext.cs`,
      `src/${applicationName}.Api/Infrastructure/Identity/IdentityMigrationComposition.cs`,
      `src/${applicationName}.Api/Infrastructure/Identity/Migrations/20260101000000_InitialIdentity.cs`,
      `src/${applicationName}.Api/Infrastructure/Identity/Migrations/IdentityDbContextModelSnapshot.cs`,
    );
  }

  for (const module of manifest.modules) {
    const project = module.project;
    const projectName = project.slice("src/".length);
    files.push(
      `${project}/${projectName}.csproj`,
      `${project}/${module.name}Module.cs`,
      `${project}/Contracts/ModuleContracts/I${module.name}Status.cs`,
      `${project}/Contracts/IntegrationEvents/${module.name}IntegrationEvents.cs`,
      `${project}/Domain/${module.name}Aggregate.cs`,
      `${project}/Features/Status/${module.name}Status.cs`,
      `${project}/Infrastructure/Persistence/${module.name}DbContext.cs`,
      `${project}/Infrastructure/Persistence/${module.name}PersistenceModel.cs`,
      `${project}/Infrastructure/IntegrationEvents/${module.name}ReliableEvents.cs`,
      `${project}/Infrastructure/Persistence/Migrations/20260101000000_Initial${module.name}.cs`,
      `${project}/Infrastructure/Persistence/Migrations/${module.name}DbContextModelSnapshot.cs`,
    );
  }

  return files.sort();
}

function fullStackApplicationFileName(provider) {
  const fileName = FULL_STACK_UI_APPLICATION_FILES[provider];
  if (fileName === undefined) {
    fail(`Unsupported Full Stack UI provider: ${provider}.`);
  }
  return fileName;
}

function fullStackBrowserEntryFileName(provider) {
  const fileName = FULL_STACK_UI_BROWSER_ENTRY_FILES[provider];
  if (fileName === undefined) {
    fail(`Unsupported browser UI provider: ${provider}.`);
  }
  return fileName;
}

function fullStackExpectedFiles(manifest) {
  const applicationName = manifest.repository.name;
  const root = `src/${applicationName}.Web`;
  const isBlazorProvider = manifest.ui.provider === "blazor-webapp";
  const uiAssetRoot =
    isBlazorProvider
      ? `${root}/wwwroot/Platform/Ui`
      : `${root}/Platform/Ui`;
  const files = [
    ...modularMonolithExpectedFiles(manifest),
    "contracts/ui-capability-v1.json",
    ...FULL_STACK_UI_EVIDENCE.map(
      (evidenceName) => `evidence/ui/${evidenceName}.md`,
    ),
    `${root}/Platform/Api/README.md`,
    `${root}/Platform/Localization/${manifest.ui.defaultCulture}.json`,
    `${uiAssetRoot}/DesignContract.css`,
    `${uiAssetRoot}/themes.css`,
    `${root}/${fullStackApplicationFileName(manifest.ui.provider)}`,
  ];

  if (isBlazorProvider) {
    files.push(
      `${root}/${applicationName}.Web.csproj`,
      `${root}/Components/Routes.razor`,
      `${root}/Components/Routes.razor.css`,
      `${root}/Platform/Api/GeneratedClient.cs`,
      `${root}/Platform/Api/Transport.cs`,
      `${root}/Platform/Authorization/Authorization.cs`,
      `${root}/Platform/Localization/Messages.cs`,
      `${root}/Platform/Runtime/Config.cs`,
      `${root}/Platform/Session/Session.cs`,
      `${root}/Program.cs`,
      `tests/${applicationName}.Tests/UiCapabilityContractTests.cs`,
    );
  } else {
    files.push(
      `${root}/Platform/Api/generated.ts`,
      `${root}/Platform/Api/openapi.ts`,
      `${root}/Platform/Api/transport.ts`,
      `${root}/Platform/Authorization/authorization.ts`,
      `${root}/Platform/Localization/messages.ts`,
      `${root}/Platform/Runtime/config.ts`,
      `${root}/Platform/Session/session.ts`,
      `${root}/${fullStackBrowserEntryFileName(manifest.ui.provider)}`,
      `${root}/index.html`,
      `${root}/package.json`,
      `${root}/scripts/verify-generated-client.mjs`,
      `${root}/tsconfig.json`,
      `${root}/tests/ui-capability-contract.test.ts`,
      `${root}/vite.config.ts`,
      `${root}/vitest.config.ts`,
      "pnpm-lock.yaml",
      "pnpm-workspace.yaml",
      ".npmrc",
      "package.json",
    );
    if (manifest.ui.provider === "vue") {
      files.push(`${root}/Platform/Navigation/router.ts`);
    }
    files.push(`${root}/public/ui-config.json`);
  }

  if (manifest.ui.provider === "react") {
    files.push(`${root}/public/ui-config.json`);
  }

  return files.sort();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function generatedTypeScriptPathBlock(source, path) {
  const marker = `  ${JSON.stringify(path)}: {`;
  const start = source.indexOf(marker);
  if (start === -1) {
    return null;
  }

  const remainder = source.slice(start + marker.length);
  const nextPath = remainder.search(/\n  "[^"]+": \{/);
  return nextPath === -1 ? remainder : remainder.slice(0, nextPath);
}

function generatedClientMatchesHttpContract(source, contract) {
  const digest = source.match(
    /generatedContractSha256\s*=\s*"([a-f0-9]{64})"/,
  )?.[1];
  if (digest === undefined) {
    return false;
  }

  const expectedDigest = createHash("sha256")
    .update(renderOpenApiContract(contract))
    .digest("hex");
  return digest === expectedDigest;
}

function generatedBlazorClientMethodSource(source, methodName) {
  const methodNameStart = source.indexOf(` ${methodName}(`);
  if (methodNameStart === -1) {
    return null;
  }

  const methodStart = source.lastIndexOf("    public ", methodNameStart);
  if (methodStart === -1) {
    return null;
  }

  const memberEnds = [
    source.indexOf("\n    public ", methodStart + 1),
    source.indexOf("\n    private ", methodStart + 1),
  ].filter((index) => index !== -1);
  const methodEnd =
    memberEnds.length === 0 ? undefined : Math.min(...memberEnds);
  return source.slice(methodStart, methodEnd);
}

function generatedBlazorClientCoversOperation(source, method, operation, path) {
  const methodName = operation["x-client"]?.methodName;
  if (typeof methodName !== "string") {
    return false;
  }

  const methodSource = generatedBlazorClientMethodSource(source, methodName);
  if (methodSource === null) {
    return false;
  }

  const httpMethod = `HttpMethod.${
    method[0].toUpperCase() + method.slice(1)
  }`;
  if (
    !methodSource.includes(httpMethod) ||
    !methodSource.includes(`"${path}"`) ||
    !methodSource.includes("CancellationToken cancellationToken") ||
    !methodSource.includes("apiTransport.SendAsync") ||
    !methodSource.includes("response.IsSuccessStatusCode") ||
    !methodSource.includes("CreateApiExceptionAsync") ||
    !source.includes("ProblemDetails")
  ) {
    return false;
  }

  const client = operation["x-client"] ?? {};
  const parameterNames = [
    ...(operation.parameters ?? [])
      .filter(({ in: location }) =>
        ["path", "query", "header"].includes(location),
      )
      .map(({ name }) => name),
    ...(client.pathParameters ?? []).map(({ name }) => name),
    ...(client.queryParameters ?? []).map(({ name }) => name),
    ...(client.headers ?? []).map(({ name }) => name),
  ];
  if (
    parameterNames.some(
      (name) =>
        !methodSource.includes(`("${name}",`) &&
        !methodSource.includes(`"${name}"`),
    )
  ) {
    return false;
  }

  if (operation.requestBody !== undefined) {
    if (
      typeof client.bodyType !== "string" ||
      !methodSource.includes(client.bodyType) ||
      !methodSource.includes("JsonContent.Create")
    ) {
      return false;
    }
  }

  const expectedReturnType = client.returnType;
  const returnSignature =
    expectedReturnType === null
      ? `Task ${methodName}(`
      : `Task<${expectedReturnType}> ${methodName}(`;
  return methodSource.includes(returnSignature);
}

function generatedClientCoversHttpOperations(source, provider, contract) {
  const operations = listOpenApiOperations(contract);
  if (provider === "blazor-webapp") {
    return operations.every(({ method, operation, path }) =>
      generatedBlazorClientCoversOperation(source, method, operation, path),
    );
  }

  if (!generatedClientMatchesHttpContract(source, contract)) {
    return false;
  }

  return operations.every(({ method, path }) => {
    const pathBlock = generatedTypeScriptPathBlock(source, path);
    return pathBlock !== null && pathBlock.includes(`\n    ${method}:`);
  });
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
  const reliableEventsCapability = manifest.capabilities.find(
    (capability) =>
      capability?.id === "modular-monolith.reliable-integration-events",
  );
  if (reliableEventsCapability?.state !== "selected") {
    fail(
      "Modular Monolith manifest must select the reliable-integration-events capability.",
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
  const apiHostSource = await readSolutionFile(
    `src/${applicationName}.Api/Infrastructure/Host/HostSecurity.cs`,
  );
  const authenticationSource = await readSolutionFile(
    `src/${applicationName}.Api/Infrastructure/Identity/AuthenticationComposition.cs`,
  );
  const actorAuthorizationSource = await readSolutionFile(
    `src/${applicationName}.Api/Infrastructure/Identity/ActorAuthorization.cs`,
  );
  const clientProjectPath = `src/${applicationName}.Client/${applicationName}.Client.csproj`;
  const clientProject = await readSolutionFile(clientProjectPath);
  const clientSourcePath = `src/${applicationName}.Client/${applicationName}.Client.cs`;
  const clientSource = await readSolutionFile(clientSourcePath);
  const openApiContractPath = "contracts/openapi-v1.json";
  const openApiContract = JSON.parse(
    await readSolutionFile(openApiContractPath),
  );
  if (
    openApiContract.openapi !== "3.1.0" ||
    !modules.every((module) =>
      openApiContract.paths?.[
        `/api/v1/${module.name.toLowerCase()}/status`
      ],
    ) ||
    !modules.every((module) =>
      openApiContract.paths?.[
        `/api/v1/${module.name.toLowerCase()}/status/permissioned`
      ],
    )
  ) {
    fail(
      `Modular Monolith OpenAPI contract must describe the versioned module status and permissioned routes: ${openApiContractPath}.`,
    );
  }
  validateProjectReferences(clientProject, [], clientProjectPath);
  if (
    /\b(?:MartiX\.Platform|EntityFramework|Backend)\b/i.test(clientSource)
  ) {
    fail(
      `Generated Modular Monolith client must remain an OpenAPI-only isolated project: ${clientSourcePath}.`,
    );
  }
  if (!modules.every((module) =>
    clientSource.includes(`Get${module.name}StatusAsync`),
  )) {
    fail(
      `Generated Modular Monolith client is missing the Orders status operation: ${clientSourcePath}.`,
    );
  }
  const apiReliableEventsSource = await readSolutionFile(
    `src/${applicationName}.Api/Infrastructure/IntegrationEvents/ReliableEventsComposition.cs`,
  );
  if (
    !apiSource.includes("AuthenticationComposition.AddServices(") ||
    !authenticationSource.includes("RequireAuthenticatedUser") ||
    !authenticationSource.includes("PermissionAuthorizationHandler") ||
    !authenticationSource.includes("ActorAuthorization.Resolve(") ||
    !authenticationSource.includes("context.User") ||
    !actorAuthorizationSource.includes("ActorContext") ||
    !actorAuthorizationSource.includes("PermissionSet") ||
    !actorAuthorizationSource.includes("FindFirst(\"iss\")") ||
    !actorAuthorizationSource.includes("FindFirst(\"sub\")") ||
    /FindFirst\("(?:email|upn)"\)/i.test(actorAuthorizationSource)
  ) {
    fail(
      "Generated identity composition must resolve provider-independent actors and permissions from issuer and subject claims.",
    );
  }
  if (
    manifest.authentication?.profile === "identity:interactive" &&
    (!apiProject.includes(
      'PackageReference Include="Microsoft.EntityFrameworkCore"',
    ) ||
      !apiProject.includes(
        `PackageReference Include="${relationalProvider === "postgresql"
          ? "Npgsql.EntityFrameworkCore.PostgreSQL"
          : "Microsoft.EntityFrameworkCore.SqlServer"}"`,
      ) ||
      !apiProject.includes(
        'PackageReference Include="Microsoft.AspNetCore.Identity.EntityFrameworkCore"',
      ))
  ) {
    fail(
      "Local Identity API composition must reference EF Core, the selected relational provider, and Identity stores.",
    );
  }
  const authenticationIsConfigured =
    manifest.authentication?.profile !== "none";
  if (
    authenticationIsConfigured !== apiSource.includes("app.UseAuthentication();")
  ) {
    fail(
      "Generated authentication middleware must match the selected authentication profile.",
    );
  }
  if (manifest.authentication?.profile === "identity:interactive") {
    const identityMigrationCompositionSource = await readSolutionFile(
      `src/${applicationName}.Api/Infrastructure/Identity/IdentityMigrationComposition.cs`,
    );
    const identityMigrationSource = await readSolutionFile(
      `src/${applicationName}.Api/Infrastructure/Identity/Migrations/20260101000000_InitialIdentity.cs`,
    );
    if (
      !identityMigrationCompositionSource.includes(
        "AddMigrationServices(builder.Services, builder.Configuration)",
      ) &&
      !identityMigrationCompositionSource.includes("AddMigrationServices(")
    ) {
      fail(
        "Local Identity must expose an explicit migration composition boundary.",
      );
    }
    if (
      !identityMigrationSource.includes("AspNetUsers") ||
      !identityMigrationSource.includes("AspNetRoles") ||
      /CREATE TABLE IF NOT EXISTS|actor_registry/i.test(identityMigrationSource)
    ) {
      fail(
        "Local Identity migration must contain the provider-selected ASP.NET Identity schema without provider-specific raw SQL.",
      );
    }
  }
  if (
    !apiSource.includes('MapGroup("/api/v1")') ||
    !apiSource.includes('WithGroupName("v1")') ||
    !apiSource.includes("HostSecurity.ValidateStartup") ||
    !apiSource.includes("app.UseForwardedHeaders();") ||
    !apiSource.includes("app.UseRateLimiter();") ||
    !apiSource.includes("app.UseAuthorization();") ||
    !apiHostSource.includes("RequireAuthenticatedUser") ||
    !apiHostSource.includes("SecurityAuditEvent.Create") ||
    !apiHostSource.includes("ActivitySource") ||
    !apiHostSource.includes("IMeterFactory") ||
    !apiHostSource.includes("Microsoft.Extensions.Compliance.Classification") ||
    !apiHostSource.includes("Microsoft.Extensions.Compliance.Redaction") ||
    !apiHostSource.includes("ErasingRedactor") ||
    !apiHostSource.includes("AddOpenTelemetry") ||
    !apiHostSource.includes("AddAspNetCoreInstrumentation") ||
    !apiHostSource.includes("AddHttpClientInstrumentation") ||
    !apiHostSource.includes("FixedWindowRateLimiterOptions") ||
    !apiHostSource.includes("CreateChained") ||
    !apiHostSource.includes("MaxRequestHeadersTotalSize") ||
    !apiHostSource.includes("MultipartBodyLengthLimit") ||
    !apiHostSource.includes("AddMeter(") ||
    !apiHostSource.includes('"System.Runtime"') ||
    !apiHostSource.includes("SecurityAuditSink : BackgroundService") ||
    !apiHostSource.includes("SetFallbackRedactor") ||
    !apiHostSource.includes("GetHostAddressesAsync") ||
    !apiHostSource.includes("ConnectCallback") ||
    !apiHostSource.includes("UseProxy = false") ||
    ![
      "Microsoft.Extensions.Compliance.Abstractions",
      "Microsoft.Extensions.Compliance.Redaction",
      "OpenTelemetry.Extensions.Hosting",
      "OpenTelemetry.Instrumentation.AspNetCore",
      "OpenTelemetry.Instrumentation.Http",
    ].every((packageId) =>
      apiProject.includes(`PackageReference Include="${packageId}"`),
    ) ||
    !apiHostSource.includes("KnownProxies") ||
    !apiHostSource.includes("SafeOutboundHandler") ||
    !apiSource.includes("ReliableEventsComposition.AddServices(services);") ||
    !apiReliableEventsSource.includes("ReliableEventsDispatcher") ||
    !apiReliableEventsSource.includes("ClaimAsync") ||
    !apiReliableEventsSource.includes("AcknowledgeAsync")
  ) {
    fail(
      "API composition must host the bounded durable reliable-events dispatcher.",
    );
  }
  for (const module of modules) {
    if (!apiSource.includes(`${module.name}Module.AddServices(services, configuration);`)) {
      fail(
        `API composition is missing ${module.name}Module.AddServices(services, configuration).`,
      );
    }
    if (!apiSource.includes(`${module.name}Module.MapEndpoints(versionOne);`)) {
      fail(
        `API composition is missing ${module.name}Module.MapEndpoints(app).`,
      );
    }
  }
  if (
    manifest.authentication?.profile === "identity:interactive" &&
    (!migratorSource.includes(
      "IdentityMigrationComposition.AddMigrationServices(builder.Services, builder.Configuration);",
    ) ||
      !migratorSource.includes(
        "await IdentityMigrationComposition.ExecuteMigrationAsync(",
      ))
  ) {
    fail(
      "The one-shot Migrator must execute the API-owned local Identity migration boundary.",
    );
  }
  if (/\b(?:Migrate|EnsureCreated|UseSeeding|HasData)(?:Async)?\s*\(/.test(apiSource)) {
    fail("Modular Monolith API composition must not migrate, create, or seed the database.");
  }

  const migratorProjectPath = `src/${applicationName}.Migrator/${applicationName}.Migrator.csproj`;
  const migratorProject = await readSolutionFile(migratorProjectPath);
  const migratorProjectReferences =
    manifest.authentication?.profile === "identity:interactive"
      ? [
        ...allModuleProjectReferences,
        `../${applicationName}.Api/${applicationName}.Api.csproj`,
      ]
      : allModuleProjectReferences;
  validateProjectReferences(
    migratorProject,
    migratorProjectReferences,
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
  const testProjectReferences = [
    `../../src/${applicationName}.Api/${applicationName}.Api.csproj`,
    `../../src/${applicationName}.Client/${applicationName}.Client.csproj`,
    `../../src/${applicationName}.Migrator/${applicationName}.Migrator.csproj`,
    ...modules.map(
      (module) =>
        `../../${module.project}/${moduleProjectNames.get(module.name)}.csproj`,
    ),
  ];
  if (
    manifest.preset === "full-stack" &&
    manifest.ui?.provider === "blazor-webapp"
  ) {
    testProjectReferences.push(
      `../../src/${applicationName}.Web/${applicationName}.Web.csproj`,
    );
  }
  validateProjectReferences(
    testProject,
    testProjectReferences,
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
  if (
    !testSource.includes("ActorContext.Create") ||
    !testSource.includes("permission-required") ||
    !testSource.includes(
      'RequireAuthorization("permission:platform-access")',
    )
  ) {
    fail(
      "Modular Monolith acceptance tests must prove Kernel permission decisions and an operation-level authorization policy.",
    );
  }
  if (!/\[Test\]/.test(testSource) || !/await\s+Assert\.That/.test(testSource)) {
    fail(
      "Modular Monolith acceptance tests must use TUnit tests with awaited assertions.",
    );
  }
  if (
    !testSource.includes("GeneratedApiClient") ||
    !modules.every((module) =>
      testSource.includes(`/api/v1/${module.name.toLowerCase()}/status`),
    )
  ) {
    fail(
      "Modular Monolith acceptance tests must consume the versioned generated client contract.",
    );
  }
  if (testSource.includes("CrashRedeliveryProbe")) {
    fail(
      "Modular Monolith acceptance tests must not substitute an in-memory crash probe for provider evidence.",
    );
  }
  const hasModuleConsumer = modules.some((module) =>
    module.dependencies.some((dependency) =>
      modules.some(
        (candidate) =>
          candidate.name === dependency &&
          candidate.name !== module.name,
      ),
    ),
  );
  if (
    hasModuleConsumer &&
    ![
      "Real_provider_transaction_and_crash_redelivery_are_idempotent",
      "MARTIX_MODULAR_MONOLITH_DATABASE",
      "InboxReceipts",
      "DuplicateSuppressed",
      "RollbackAsync",
      "LeaseDuration",
      "DbUpdateConcurrencyException",
      "concurrencyConflictObserved",
    ].every((fragment) => testSource.includes(fragment))
  ) {
    fail(
      "Modular Monolith acceptance tests must exercise real-provider rollback, concurrency conflict, lease expiry, and Inbox deduplication.",
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
    const integrationEventsPath = `${module.project}/Contracts/IntegrationEvents/${module.name}IntegrationEvents.cs`;
    const integrationEventsSource = await readSolutionFile(
      integrationEventsPath,
    );
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
    if (
      !new RegExp(
        `public\\s+sealed\\s+record\\s+${escapeRegExp(module.name)}SubmittedV1`,
      ).test(integrationEventsSource) ||
      !integrationEventsSource.includes("[JsonSerializable(") ||
      !integrationEventsSource.includes("SchemaVersion = 1")
    ) {
      fail(
        `Business Module ${module.name} must publish an explicit versioned Integration Event Contract in ${integrationEventsPath}.`,
      );
    }

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
    const reliableEventsPath = `${module.project}/Infrastructure/IntegrationEvents/${module.name}ReliableEvents.cs`;
    const reliableEventsSource = await readSolutionFile(reliableEventsPath);
    const migrationSource = await readSolutionFile(migrationPath);
    const snapshotSource = await readSolutionFile(snapshotPath);
    const expectedSubscriptions = modules
      .filter((candidate) => candidate.dependencies.includes(module.name))
      .map((candidate) => `"${candidate.name}"`);
    const persistenceSource = [
      compositionSource,
      domainSource,
      featureSource,
      persistenceContextSource,
      persistenceModelSource,
      reliableEventsSource,
      integrationEventsSource,
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
        `HasReliableEvents("${schema}")`,
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
    const providerLeaseImplementation =
      RELIABLE_EVENT_PROVIDER_IMPLEMENTATIONS[relationalProvider];
    const forbiddenProviderLeaseImplementation =
      FORBIDDEN_RELIABLE_EVENT_PROVIDER_IMPLEMENTATIONS[relationalProvider];
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
      ) ||
      !persistenceContextSource.includes("DbSet<OutboxMessage>") ||
      !persistenceContextSource.includes("DbSet<OutboxDelivery>") ||
      !persistenceContextSource.includes("DbSet<InboxReceipt>")
    ) {
      fail(
        `Business Module ${module.name} must own an internal relational DbContext in ${persistenceContextPath}.`,
      );
    }
    if (
      !hasExplicitAggregateConfiguration ||
      !persistenceModelSource.includes(`ToTable("${table}", "${schema}")`) ||
      !persistenceModelSource.includes("HasEntityTimestamps()") ||
      !hasExplicitConcurrencyMapping ||
      !persistenceModelSource.includes(
        `${module.name}ReliableEvents.Configure(modelBuilder)`,
      ) ||
      !compositionSource.includes(providerLeaseImplementation) ||
      compositionSource.includes(forbiddenProviderLeaseImplementation)
    ) {
      fail(
        `Business Module ${module.name} must select one provider-specific lease implementation and use portable relational naming with concurrency mapping in ${persistenceModelPath}.`,
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
    if (
      !reliableEventsSource.includes("ReliableEventsSaveChangesInterceptor") ||
      !reliableEventsSource.includes("ReliableEventEnvelope.Create") ||
      !reliableEventsSource.includes("OutboxMessage.Create") ||
      !reliableEventsSource.includes("HasReliableEvents") ||
      !reliableEventsSource.includes(
        expectedSubscriptions.length === 0
          ? "Array.Empty<string>()"
          : expectedSubscriptions.join(", "),
      ) ||
      !migrationSource.includes('name: "outbox_messages"') ||
      !migrationSource.includes('name: "outbox_deliveries"') ||
      !migrationSource.includes('name: "inbox_receipts"') ||
      !migrationSource.includes("protected override void Down")
    ) {
      fail(
        `Business Module ${module.name} must persist immutable Outbox Messages, fenced Deliveries, and Inbox Receipts with explicit event capture.`,
      );
    }
    for (const dependency of module.dependencies) {
      if (
        !reliableEventsSource.includes(
          `Consume${dependency}SubmittedAsync`,
        )
      ) {
        fail(
          `Business Module ${module.name} must register its ${dependency} Inbox consumer explicitly.`,
        );
      }
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
      [reliableEventsSource, reliableEventsPath],
      [migrationSource, migrationPath],
      [snapshotSource, snapshotPath],
    ]) {
      validateInternalModuleSource(module, source, path);
    }
  }
}

async function validateModularMonolithSolution(rootDir, manifest) {
  const solutionRoot = resolve(rootDir, MODULAR_MONOLITH_SOLUTION_ROOT);
  const actualFiles = await listFiles(solutionRoot, {
    ignoredDirectories: ["bin", "obj"],
  });
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

function hasReviewedPnpmWorkspaceSettings(workspaceSource) {
  return (
    FULL_STACK_UI_PNPM_WORKSPACE_SETTINGS.every((setting) =>
      workspaceSource.includes(setting),
    ) &&
    FULL_STACK_UI_BUILD_ALLOWLIST.every((entry) => {
      const separator = entry.lastIndexOf("@");
      const packageName = entry.slice(0, separator);
      const version = entry.slice(separator + 1);
      return (
        workspaceSource.includes(`"${entry}": true`) ||
        workspaceSource.includes(`  ${packageName}: ${version}`)
      );
    }) &&
    !workspaceSource.includes("dangerouslyAllowAllBuilds")
  );
}

function hasExpectedPnpmLockfileSections(lockfileSource) {
  return FULL_STACK_UI_LOCKFILE_SECTIONS.every((section) =>
    lockfileSource.includes(section),
  );
}

function hasReviewedTypeScriptUiToolchain({
  packageJson,
  rootPackageJson,
  workspaceSource,
  lockfileSource,
  provider,
}) {
  const expectedNodeEngine =
    provider === "react" ? FULL_STACK_REACT_NODE_ENGINE : FULL_STACK_UI_NODE_ENGINE;
  return (
    packageJson.dependencies?.["openapi-fetch"] === "0.17.0" &&
    packageJson.devDependencies?.["openapi-typescript"] === "7.13.0" &&
    (provider !== "vue" ||
      packageJson.devDependencies?.["@types/node"] === "24.7.2") &&
    packageJson.devDependencies?.["@testing-library/dom"] !== undefined &&
    packageJson.engines?.node === expectedNodeEngine &&
    packageJson.scripts?.build === FULL_STACK_UI_BUILD_SCRIPT[provider] &&
    rootPackageJson.packageManager === FULL_STACK_UI_PACKAGE_MANAGER &&
    rootPackageJson.engines?.node === FULL_STACK_UI_NODE_ENGINE &&
    hasReviewedPnpmWorkspaceSettings(workspaceSource) &&
    hasExpectedPnpmLockfileSections(lockfileSource)
  );
}

async function validateFullStackSolution(rootDir, manifest) {
  const solutionRoot = resolve(rootDir, FULL_STACK_SOLUTION_ROOT);
  const actualFiles = await listFiles(solutionRoot, {
    ignoredDirectories: ["bin", "obj", "node_modules"],
  });
  const expectedFiles = fullStackExpectedFiles(manifest);
  if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) {
    const missing = expectedFiles.filter((file) => !actualFiles.includes(file));
    const extra = actualFiles.filter((file) => !expectedFiles.includes(file));
    fail(
      `Full Stack Generated Solution inventory mismatch; missing: ${
        missing.join(", ") || "none"
      }; extra: ${extra.join(", ") || "none"}.`,
    );
  }

  await validateModularMonolithComposition(solutionRoot, actualFiles, manifest);

  const applicationName = manifest.repository.name;
  const uiRoot = `src/${applicationName}.Web`;
  const isBlazorProvider = manifest.ui.provider === "blazor-webapp";
  const readSolutionFile = (relativePath) =>
    readFile(resolve(solutionRoot, relativePath), "utf8");
  const uiContract = JSON.parse(
    await readSolutionFile("contracts/ui-capability-v1.json"),
  );
  const httpContract = JSON.parse(
    await readSolutionFile("contracts/openapi-v1.json"),
  );
  if (
    uiContract.contractVersion !== FULL_STACK_UI_CONTRACT_VERSION ||
    manifest.ui.contractVersion !== FULL_STACK_UI_CONTRACT_VERSION ||
    uiContract.provider !== "provider-neutral" ||
    uiContract.role !== "application-ui" ||
    uiContract.transport?.source !== "contracts/openapi-v1.json" ||
    uiContract.transport?.problemDetails !== "rfc-9457" ||
    uiContract.transport?.credentials !== "server-owned-session" ||
    uiContract.session?.owner !== "server-bff" ||
    uiContract.session?.browserPersistence !== "session-cookie-only" ||
    JSON.stringify(uiContract.session?.states) !==
      JSON.stringify(["anonymous", "authenticated", "denied", "expired"]) ||
    ![
      "loading",
      "empty",
      "validation",
      "denied",
      "error",
      "offline",
      "reconnecting",
      "stale",
    ].every((state) => uiContract.states?.includes(state)) ||
    uiContract.accessibility?.standard !== "WCAG-2.2-AA" ||
    uiContract.accessibility?.markup !== "semantic-html" ||
    uiContract.accessibility?.keyboard !== true ||
    uiContract.accessibility?.reducedMotion !== true ||
    uiContract.accessibility?.forcedColors !== true ||
    uiContract.accessibility?.rtl !== true ||
    uiContract.localization?.defaultCulture !== manifest.ui.defaultCulture ||
    JSON.stringify(uiContract.localization?.messageKeys) !==
      JSON.stringify(FULL_STACK_UI_MESSAGE_KEYS) ||
    uiContract.localization?.identifierPolicy !== "stable-semantic-keys" ||
    uiContract.localization?.protocolInvariant !== true ||
    uiContract.theme?.tokens !== "semantic" ||
    JSON.stringify(uiContract.theme?.modes) !==
      JSON.stringify(["light", "dark", "system"]) ||
    uiContract.rendering?.profile !== manifest.ui.renderingProfile ||
    JSON.stringify(uiContract.rendering?.claims) !==
      JSON.stringify(
        FULL_STACK_UI_RENDERING_PROFILE_CLAIMS[
          manifest.ui.renderingProfile
        ],
      ) ||
    JSON.stringify(uiContract.evidence) !==
      JSON.stringify(FULL_STACK_UI_EVIDENCE)
  ) {
    fail(
      "Full Stack UI Capability Contract does not match the provider-neutral contract.",
    );
  }

  const uiFiles = actualFiles.filter(
    (file) => file.startsWith(`${uiRoot}/`) && !file.endsWith(".csproj"),
  );
  const uiSource = (
    await Promise.all(uiFiles.map((file) => readSolutionFile(file)))
  ).join("\n");
  const applicationSource = await readSolutionFile(
    `${uiRoot}/${fullStackApplicationFileName(manifest.ui.provider)}`,
  );
  const runtimeSource =
    manifest.ui.provider === "blazor-webapp"
      ? ""
      : await readSolutionFile(`${uiRoot}/Platform/Runtime/config.ts`);
  const publicConfiguration =
    manifest.ui.provider === "blazor-webapp"
      ? null
      : JSON.parse(await readSolutionFile(`${uiRoot}/public/ui-config.json`));
  const forbiddenBackendReference = new RegExp(
    `(?:ProjectReference|${[
      `${applicationName}.Api`,
      ...manifest.modules.map(
        (module) => `${applicationName}.${module.name}`,
      ),
    ]
      .map(
        (reference) =>
          `${escapeRegExp(reference)}(?:\\.|\\b)`,
      )
      .join("|")})`,
    "i",
  );
  if (forbiddenBackendReference.test(uiSource)) {
    fail(
      "Full Stack UI must consume only HTTP/OpenAPI and must not reference backend or Business Module implementation.",
    );
  }

  const transportSource = await readSolutionFile(
    isBlazorProvider
      ? `${uiRoot}/Platform/Api/Transport.cs`
      : `${uiRoot}/Platform/Api/transport.ts`,
  );
  const sessionSource = await readSolutionFile(
    isBlazorProvider
      ? `${uiRoot}/Platform/Session/Session.cs`
      : `${uiRoot}/Platform/Session/session.ts`,
  );
  const authorizationSource = await readSolutionFile(
    isBlazorProvider
      ? `${uiRoot}/Platform/Authorization/Authorization.cs`
      : `${uiRoot}/Platform/Authorization/authorization.ts`,
  );
  const uiAssetRoot =
    isBlazorProvider
      ? `${uiRoot}/wwwroot/Platform/Ui`
      : `${uiRoot}/Platform/Ui`;
  const designSource = await readSolutionFile(
    `${uiAssetRoot}/DesignContract.css`,
  );
  const themeSource = await readSolutionFile(`${uiAssetRoot}/themes.css`);
  const localizationSource =
    isBlazorProvider
      ? await readSolutionFile(`${uiRoot}/Platform/Localization/Messages.cs`)
      : await readSolutionFile(`${uiRoot}/Platform/Localization/messages.ts`);
  const generatedClientSource =
    isBlazorProvider
      ? await readSolutionFile(`${uiRoot}/Platform/Api/GeneratedClient.cs`)
      : await readSolutionFile(`${uiRoot}/Platform/Api/generated.ts`);
  if (
    !generatedClientCoversHttpOperations(
      generatedClientSource,
      manifest.ui.provider,
      httpContract,
    )
  ) {
    fail(
      "Full Stack generated UI client must expose every operation from contracts/openapi-v1.json.",
    );
  }
  const browserTestSource =
    isBlazorProvider
      ? await readSolutionFile(
          `tests/${applicationName}.Tests/UiCapabilityContractTests.cs`,
        )
        : await readSolutionFile(`${uiRoot}/tests/ui-capability-contract.test.ts`);
  const clientCheckSource =
    manifest.ui.provider === "blazor-webapp"
      ? ""
      : await readSolutionFile(`${uiRoot}/scripts/verify-generated-client.mjs`);

  let transportContractValid;
  if (isBlazorProvider) {
    transportContractValid =
      transportSource.includes("HttpClient") &&
      transportSource.includes("If-Match") &&
      transportSource.includes("Idempotency-Key") &&
      transportSource.includes("traceparent") &&
      transportSource.includes("IApiCredentialProvider") &&
      transportSource.includes("RetrySafeRead") &&
      transportSource.includes("ResponseHeadersRead") &&
      transportSource.includes("HttpRequestException") &&
      transportSource.includes("CloneSafeReadRequest") &&
      generatedClientSource.includes("apiTransport.SendAsync");
  } else {
    transportContractValid =
      transportSource.includes('credentials: "include"') &&
      transportSource.includes("ProblemDetails") &&
      transportSource.includes("If-Match") &&
      transportSource.includes("Idempotency-Key") &&
      transportSource.includes("traceparent");
  }
  let sessionContractValid;
  if (isBlazorProvider) {
    sessionContractValid =
      sessionSource.includes("AuthenticationStateProvider") &&
      sessionSource.includes("server") &&
      sessionSource.includes("Publish") &&
      sessionSource.includes("IHttpContextAccessor") &&
      !sessionSource.includes("localStorage");
  } else {
    sessionContractValid = sessionSource.includes('credentials: "include"');
  }
  const authorizationContractValid =
    /anonymous/i.test(authorizationSource) &&
    /authenticated/i.test(authorizationSource) &&
    /denied/i.test(authorizationSource) &&
    /expired/i.test(authorizationSource);
  if (
    !transportContractValid ||
    !sessionContractValid ||
    !authorizationContractValid ||
    !FULL_STACK_UI_MESSAGE_KEYS.every((key) => localizationSource.includes(key)) ||
    !designSource.includes("--mx-color-focus") ||
    !designSource.includes("--mx-color-danger-surface") ||
    /#[0-9a-f]{3,8}\b/i.test(designSource) ||
    /fluent/i.test(designSource) ||
    /tailwind/i.test(designSource) ||
    !themeSource.includes('data-theme="system"') ||
    !themeSource.includes('data-theme="light"') ||
    !themeSource.includes('data-theme="dark"') ||
    !generatedClientSource.includes("ProblemDetails") ||
    (manifest.ui.provider === "react" &&
      (!applicationSource.includes("createGeneratedClient") ||
        !applicationSource.includes("QueryClientProvider") ||
        !applicationSource.includes('aria-live="polite"') ||
        !runtimeSource.includes("loadRuntimeConfiguration") ||
        !clientCheckSource.includes("createHash") ||
        /localStorage|sessionStorage|indexedDB|accessToken|refreshToken/i.test(
          sessionSource,
        ))) ||
    (manifest.ui.provider !== "blazor-webapp" &&
      (!runtimeSource.includes("loadRuntimeConfiguration") ||
        publicConfiguration?.provider !== manifest.ui.provider ||
        typeof publicConfiguration?.apiBasePath !== "string" ||
        !publicConfiguration.apiBasePath.startsWith("/") ||
        publicConfiguration.apiBasePath.startsWith("//") ||
        publicConfiguration?.defaultCulture !== manifest.ui.defaultCulture ||
        !publicConfiguration?.supportedCultures?.includes(
          manifest.ui.defaultCulture,
        ))) ||
    (manifest.ui.provider === "vue" &&
      (!applicationSource.includes("useQuery") ||
        !applicationSource.includes("createGeneratedClient") ||
        !applicationSource.includes("request") ||
        !applicationSource.includes("readSession") ||
        !applicationSource.includes("loadRuntimeConfiguration"))) ||
    !browserTestSource.includes("loading") ||
    !browserTestSource.includes("offline") ||
    !browserTestSource.includes("denied") ||
    !browserTestSource.includes("reconnect") ||
    (!isBlazorProvider &&
      !browserTestSource.includes("getByRole")) ||
    (isBlazorProvider &&
      (!browserTestSource.includes("BunitContext") ||
       !browserTestSource.includes("IPage") ||
       !uiSource.includes("AuthorizeView")))
  ) {
    fail(
      "Full Stack UI sources must expose transport, session, authorization, accessibility, localization, theme, and browser contract evidence.",
    );
  }

  for (const evidenceName of FULL_STACK_UI_EVIDENCE) {
    const evidence = await readSolutionFile(`evidence/ui/${evidenceName}.md`);
    if (
      !evidence.includes("# UI") ||
      !evidence.toLowerCase().includes(manifest.ui.provider) ||
      /(?:orders|billing|weather|todo)/i.test(evidence)
    ) {
      fail(
        `Full Stack ${evidenceName} evidence must be provider-specific infrastructure evidence without product behavior.`,
      );
    }
  }

  if (!isBlazorProvider) {
    const packageJson = JSON.parse(
      await readSolutionFile(`${uiRoot}/package.json`),
    );
    const typeScriptConfig = JSON.parse(
      await readSolutionFile(`${uiRoot}/tsconfig.json`),
    );
    const rootPackageJson = JSON.parse(
      await readSolutionFile("package.json"),
    );
    const workspaceSource = await readSolutionFile("pnpm-workspace.yaml");
    const lockfileSource = await readSolutionFile("pnpm-lock.yaml");
    if (
      !hasReviewedTypeScriptUiToolchain({
        packageJson,
        rootPackageJson,
        workspaceSource,
        lockfileSource,
        provider: manifest.ui.provider,
      })
    ) {
      fail(
        "Full Stack TypeScript UI must pin its reviewed toolchain, OpenAPI, accessibility, and pnpm supply-chain profiles.",
      );
    }
    if (manifest.ui.provider === "react") {
      const workspacePolicy = await readSolutionFile("pnpm-workspace.yaml");
      const lockfile = await readSolutionFile("pnpm-lock.yaml");
      const runtimeConfiguration = JSON.parse(
        await readSolutionFile(`${uiRoot}/public/ui-config.json`),
      );
      if (
        packageJson.packageManager !== FULL_STACK_REACT_PACKAGE_MANAGER ||
        packageJson.engines?.node !== FULL_STACK_REACT_NODE_ENGINE ||
        packageJson.engines?.pnpm !==
          FULL_STACK_REACT_PACKAGE_MANAGER.slice("pnpm@".length) ||
        packageJson.peerDependencies?.react !== "19.1.1" ||
        packageJson.peerDependencies?.["react-dom"] !== "19.1.1" ||
        packageJson.scripts?.["install:ci"] !==
          "pnpm install --frozen-lockfile --ignore-scripts" ||
        !workspacePolicy.includes("minimumReleaseAge: 4320") ||
        !workspacePolicy.includes("trustLockfile: false") ||
        !workspacePolicy.includes("blockExoticSubdeps: true") ||
        !workspacePolicy.includes("strictPeerDependencies: true") ||
        !workspacePolicy.includes("engineStrict: true") ||
        !workspacePolicy.includes("strictDepBuilds: true") ||
        !workspacePolicy.includes("allowBuilds:") ||
        !workspacePolicy.includes("esbuild: 0.25.12") ||
        !lockfile.includes("'@fluentui/react-icons@") ||
        !lockfile.includes("'@fluentui/react-components@") ||
        runtimeConfiguration.provider !== "react" ||
        runtimeConfiguration.defaultCulture !== manifest.ui.defaultCulture
      ) {
        fail(
          "Full Stack React UI must declare the pinned pnpm, runtime configuration, and dependency policy.",
        );
      }
    }
    if (
      manifest.ui.provider === "vue" &&
      (typeScriptConfig.compilerOptions?.strict !== true ||
        typeScriptConfig.compilerOptions?.exactOptionalPropertyTypes !== true ||
        typeScriptConfig.compilerOptions?.noUncheckedIndexedAccess !== true ||
        typeScriptConfig.compilerOptions?.skipLibCheck !== false)
    ) {
      fail(
        "Full Stack TypeScript UI must use the reviewed strict compiler profile.",
      );
    }
  } else {
    const project = await readSolutionFile(
      `${uiRoot}/${applicationName}.Web.csproj`,
    );
    const testProject = await readSolutionFile(
      `tests/${applicationName}.Tests/${applicationName}.Tests.csproj`,
    );
    const programSource = await readSolutionFile(`${uiRoot}/Program.cs`);
    const componentCss = await readSolutionFile(
      `${uiRoot}/Components/Routes.razor.css`,
    );
    const appSource = await readSolutionFile(`${uiRoot}/App.razor`);
    const routesSource = await readSolutionFile(
      `${uiRoot}/Components/Routes.razor`,
    );
    if (
      !project.includes('NSwag.ConsoleCore" Version="14.7.1"') ||
      !project.includes("TargetFramework>net10.0") ||
      !project.includes("<OutputType>Exe</OutputType>") ||
      !project.includes("<TreatWarningsAsErrors>true</TreatWarningsAsErrors>") ||
      project.includes("ProjectReference")
    ) {
      fail(
        "Full Stack Blazor UI must use the isolated NSwag client profile without backend project references.",
      );
    }
    if (
      !project.includes(
        'Microsoft.FluentUI.AspNetCore.Components" Version="4.14.0"',
      ) ||
      !testProject.includes('PackageReference Include="bunit"') ||
      !testProject.includes(
        'PackageReference Include="Microsoft.Playwright"',
      ) ||
      !testProject.includes(
        `ProjectReference Include="../../src/${applicationName}.Web/${applicationName}.Web.csproj"`,
      ) ||
      !testProject.includes("<OutputType>Exe</OutputType>") ||
      !testProject.includes('PackageReference Include="TUnit"') ||
      testProject.includes("Microsoft.NET.Test.Sdk") ||
      !appSource.includes("FluentDesignTheme") ||
      !appSource.includes("blazor.web.js") ||
      !routesSource.includes("FluentButton") ||
      !routesSource.includes("ApiClient") ||
      !componentCss.includes(":host") ||
      !componentCss.includes(".application-shell") ||
      !componentCss.includes("--neutral-foreground-rest") ||
      !programSource.includes("AddCascadingAuthenticationState") ||
      !programSource.includes("UseAntiforgery") ||
      !programSource.includes("CacheControl = \"no-store\"") ||
      !programSource.includes("IApiCredentialProvider") ||
      (manifest.ui.renderingProfile === "application" &&
        !appSource.includes('<Routes @rendermode="InteractiveServer" />')) ||
      (manifest.ui.renderingProfile === "hybrid-web" &&
        (!appSource.includes("<Routes />") ||
          !routesSource.includes(
            '<AuthorizeView @rendermode="InteractiveServer">',
          )))
    ) {
      fail(
        "Full Stack Blazor UI must expose Fluent styling, isolated component CSS, and bUnit/Playwright evidence.",
      );
    }
  }
}

export function validateQualityGatePolicy(policy) {
  requireRecord(policy, "eng/quality-gates.json");
  requireString(policy.policyVersion, "eng/quality-gates.json.policyVersion");

  if (policy.stage !== "bootstrap") {
    fail("eng/quality-gates.json.stage must be bootstrap.");
  }

  requireArray(policy.supportClaims, "eng/quality-gates.json.supportClaims");
  if (policy.supportClaims.length !== 0) {
    fail("Bootstrap quality policy must not make a Supported Capability claim.");
  }

  requireArray(policy.profiles, "eng/quality-gates.json.profiles");
  const alphaProfiles = policy.profiles.filter(
    (profile) => profile?.id === MODULAR_MONOLITH_ALPHA_PROFILE_ID,
  );
  if (alphaProfiles.length !== 1) {
    fail(
      `Quality policy must declare exactly one ${MODULAR_MONOLITH_ALPHA_PROFILE_ID} profile.`,
    );
  }
  const alphaProfile = alphaProfiles[0];
  if (
    alphaProfile.maturity !== "experimental" ||
    alphaProfile.preset !== "modular-monolith" ||
    JSON.stringify(alphaProfile.providers) !==
      JSON.stringify(MODULAR_MONOLITH_ALPHA_PROVIDERS) ||
    JSON.stringify(alphaProfile.cadences) !==
      JSON.stringify(["release-candidate"]) ||
    JSON.stringify(alphaProfile.gates) !==
      JSON.stringify(MODULAR_MONOLITH_ALPHA_GATE_IDS) ||
    alphaProfile.command !== "npm run verify:modular-monolith-alpha"
  ) {
    fail(
      `${MODULAR_MONOLITH_ALPHA_PROFILE_ID} quality profile is not the declared Experimental provider matrix.`,
    );
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
    if (
      !BOOTSTRAP_GATE_IDS.includes(gate.id) &&
      !MODULAR_MONOLITH_ALPHA_GATE_IDS.includes(gate.id)
    ) {
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

  for (const requiredGate of MODULAR_MONOLITH_ALPHA_GATE_IDS) {
    if (!gateIds.has(requiredGate)) {
      fail(`Missing required Modular Monolith alpha quality gate: ${requiredGate}`);
    }
  }

  for (const gate of policy.gates) {
    if (BOOTSTRAP_GATE_IDS.includes(gate.id)) {
      for (const cadence of CADENCES) {
        if (!gate.cadences.includes(cadence)) {
          fail(`Required gate ${gate.id} is not declared for cadence ${cadence}.`);
        }
      }
    } else if (
      JSON.stringify(gate.cadences) !== JSON.stringify(["release-candidate"])
    ) {
      fail(
        `Modular Monolith alpha gate ${gate.id} must run on release-candidate.`,
      );
    }
  }

  for (const gateId of alphaProfile.gates) {
    if (!gateIds.has(gateId)) {
      fail(
        `Quality profile ${MODULAR_MONOLITH_ALPHA_PROFILE_ID} references an unknown gate: ${gateId}.`,
      );
    }
  }
  for (const gate of policy.gates) {
    if (
      MODULAR_MONOLITH_ALPHA_GATE_IDS.includes(gate.id) &&
      !alphaProfile.gates.includes(gate.id)
    ) {
      fail(
        `Modular Monolith alpha gate ${gate.id} is not selected by its quality profile.`,
      );
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

export async function validateProviderAdmissionFixture(
  fixture,
  manifest,
) {
  const manifestPath = `${PROVIDER_ADMISSION_SOLUTION_ROOT}/martix.platform.json`;
  assertSecretFree(
    fixture,
    `${PROVIDER_ADMISSION_SOLUTION_ROOT}/provider-admission.json`,
    "Provider admission fixture",
  );
  requireRecord(fixture, `${PROVIDER_ADMISSION_SOLUTION_ROOT}/provider-admission.json`);
  requireRecord(
    fixture.selection,
    `${PROVIDER_ADMISSION_SOLUTION_ROOT}/provider-admission.json.selection`,
  );
  requireRecord(
    fixture.observed,
    `${PROVIDER_ADMISSION_SOLUTION_ROOT}/provider-admission.json.observed`,
  );
  requireRecord(
    fixture.evidence,
    `${PROVIDER_ADMISSION_SOLUTION_ROOT}/provider-admission.json.evidence`,
  );
  requireArray(
    fixture.invalidSelections,
    `${PROVIDER_ADMISSION_SOLUTION_ROOT}/provider-admission.json.invalidSelections`,
  );
  requireRecord(manifest, manifestPath);
  requireArray(manifest.providers, `${manifestPath}.providers`);
  requireArray(manifest.supportClaims, `${manifestPath}.supportClaims`);

  let result;
  try {
    result = await verifyProviderAdmission({
      selection: fixture.selection,
      observed: fixture.observed,
    });
    verifyProviderAdmissionEvidence(fixture.evidence);
  } catch (error) {
    if (error instanceof ProviderAdmissionError) {
      fail(`Provider admission fixture failed: ${error.message}`);
    }
    throw error;
  }

  if (JSON.stringify(result.evidence) !== JSON.stringify(fixture.evidence)) {
    fail(
      `Provider admission fixture evidence does not match the resolved composition: ${PROVIDER_ADMISSION_SOLUTION_ROOT}/provider-admission.json.`,
    );
  }
  if (manifest.preset !== fixture.selection.preset) {
    fail(
      `Provider admission manifest preset ${manifest.preset} does not match the fixture selection preset ${fixture.selection.preset}.`,
    );
  }
  const manifestProviders = manifest.providers
    .filter((provider) => provider?.state === "selected")
    .map(({ capability, id }) => ({ capability, id }))
    .sort((left, right) =>
      `${left.capability}:${left.id}`.localeCompare(
        `${right.capability}:${right.id}`,
      ),
    );
  const selectedProviders = result.plan.providers.map(({ capability, id }) => ({
    capability,
    id,
  }));
  if (JSON.stringify(manifestProviders) !== JSON.stringify(selectedProviders)) {
    fail(
      "Provider admission manifest providers do not match the resolved fixture selection.",
    );
  }
  if (manifest.supportClaims.length !== 0) {
    fail("Provider admission manifest must not make a Supported claim.");
  }

  for (const [index, invalid] of fixture.invalidSelections.entries()) {
    const path =
      `${PROVIDER_ADMISSION_SOLUTION_ROOT}/provider-admission.json.invalidSelections[${index}]`;
    requireRecord(invalid, path);
    requireString(invalid.id, `${path}.id`);
    requireString(invalid.expectedCode, `${path}.expectedCode`);
    requireRecord(invalid.selection, `${path}.selection`);
    let generated = false;
    try {
      await admitProviderSelection({
        selection: invalid.selection,
        generate: async () => {
          generated = true;
        },
      });
    } catch (error) {
      if (!(error instanceof ProviderAdmissionError)) {
        throw error;
      }
      if (error.code !== invalid.expectedCode) {
        fail(
          `Provider admission invalid selection ${invalid.id} returned ${error.code}; expected ${invalid.expectedCode}.`,
        );
      }
      if (generated) {
        fail(
          `Provider admission invalid selection ${invalid.id} invoked generation before rejection.`,
        );
      }
      continue;
    }
    fail(
      `Provider admission invalid selection ${invalid.id} was accepted before generation.`,
    );
  }

  return {
    status: "passed",
    providerCount: result.plan.providers.length,
    matrixCoordinate: result.evidence.matrix.coordinate,
    evidenceDigest: result.evidence.verification.evidenceDigest,
    invalidSelectionCount: fixture.invalidSelections.length,
  };
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
  const agentContextSchema = parseJson("schemas/agent-context.schema.json");
  const qualityPolicy = parseJson("eng/quality-gates.json");
  const generatedManifest = parseJson(
    `${GENERATED_SOLUTION_ROOT}/martix.platform.json`,
  );
  const modularMonolithManifest = parseJson(
    `${MODULAR_MONOLITH_SOLUTION_ROOT}/martix.platform.json`,
  );
  const fullStackManifest = parseJson(
    `${FULL_STACK_SOLUTION_ROOT}/martix.platform.json`,
  );
  const providerAdmissionManifest = parseJson(
    `${PROVIDER_ADMISSION_SOLUTION_ROOT}/martix.platform.json`,
  );
  const providerAdmissionFixture = parseJson(
    `${PROVIDER_ADMISSION_SOLUTION_ROOT}/provider-admission.json`,
  );

  validateManifestSchema(manifestSchema);
  requireRecord(agentContextSchema, "schemas/agent-context.schema.json");
  if (agentContextSchema.type !== "object") {
    fail("schemas/agent-context.schema.json.type must be object.");
  }
  validateClosedObjectSchemas(
    agentContextSchema,
    "schemas/agent-context.schema.json",
  );
  assertSecretFree(
    agentContextSchema,
    "schemas/agent-context.schema.json",
    "Agent context schema",
  );
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
  validateManifest(
    fullStackManifest,
    "generated-solution",
    `${FULL_STACK_SOLUTION_ROOT}/martix.platform.json`,
  );
  validateAgainstSchema(
    fullStackManifest,
    manifestSchema,
    `${FULL_STACK_SOLUTION_ROOT}/martix.platform.json`,
  );
  validateManifest(
    providerAdmissionManifest,
    "generated-solution",
    `${PROVIDER_ADMISSION_SOLUTION_ROOT}/martix.platform.json`,
  );
  validateAgainstSchema(
    providerAdmissionManifest,
    manifestSchema,
    `${PROVIDER_ADMISSION_SOLUTION_ROOT}/martix.platform.json`,
  );
  validateAgainstSchema(
    qualityPolicy,
    qualityGateSchema,
    "eng/quality-gates.json",
  );
  validateQualityGatePolicy(qualityPolicy);
  validateGovernanceDocuments(documents);
  await validateModularMonolithSolution(root, modularMonolithManifest);
  await validateFullStackSolution(root, fullStackManifest);
  const providerAdmission = await validateProviderAdmissionFixture(
    providerAdmissionFixture,
    providerAdmissionManifest,
  );
  const agentReadiness = await verifyAgentReadiness({
    rootDir: root,
    platformRoot: root,
  });

  const gates = qualityPolicy.gates
    .filter(
      (gate) =>
        BOOTSTRAP_GATE_IDS.includes(gate.id) &&
        gate.cadences.includes(cadence),
    )
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
    fullStackSolution: FULL_STACK_SOLUTION_NAME,
    providerAdmissionSolution: PROVIDER_ADMISSION_SOLUTION_NAME,
    providerAdmission,
    agentReadiness,
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
