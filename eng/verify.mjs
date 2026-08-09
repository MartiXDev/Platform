import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
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
import {
  DeploymentManifestError,
  sha256,
  verifyDeploymentEvidence,
  verifyDeploymentManifest,
} from "./deployment-manifest.mjs";
import {
  PortableHostConformanceError,
  verifyPortableHostConformance,
} from "./portable-host-conformance.mjs";
import {
  LocalOrchestrationError,
  LOCAL_ORCHESTRATION_PROFILES,
  createLocalOrchestration,
} from "./local-orchestration.mjs";
import { generateApiPreset } from "./api-preset.mjs";
import {
  FEATURE_MANAGEMENT_FIXTURE_FILES,
  FEATURE_MANAGEMENT_SOLUTION_NAME,
  FEATURE_MANAGEMENT_SOLUTION_ROOT,
  validateFeatureManagementFixture,
} from "./feature-management.mjs";
import {
  AZURE_KEY_VAULT_PROVIDER,
  AZURE_KEY_VAULT_REQUIRED_CONFIGURATION,
  AzureKeyVaultEvidenceError,
  verifyAzureKeyVaultEvidence,
} from "./azure-key-vault.mjs";
import {
  ObjectStorageEvidenceError,
  verifyAzureBlobObjectStorageEvidence,
} from "./object-storage.mjs";
import {
  BETA_INTEGRATION_SOLUTION_NAME,
  BETA_INTEGRATION_SOLUTION_ROOT,
  BetaIntegrationError,
  verifyBetaIntegrationFixture,
} from "./beta-integration.mjs";
import {
  RELEASE_CANDIDATE_CADENCE,
  RELEASE_CANDIDATE_CADENCES,
  RELEASE_CANDIDATE_GATE_IDS,
  RELEASE_CANDIDATE_GATE_ID,
  RELEASE_CANDIDATE_SOLUTION_NAME,
  RELEASE_CANDIDATE_SOLUTION_ROOT,
  RELEASE_CANDIDATE_VERIFICATION_COMMAND,
  ReleaseCandidateError,
  verifyReleaseCandidateFixture,
} from "./release-candidate.mjs";
import {
  STABLE_PROMOTION_CADENCES,
  STABLE_PROMOTION_GATE_ID,
  STABLE_PROMOTION_SOLUTION_NAME,
  STABLE_PROMOTION_SOLUTION_ROOT,
  STABLE_PROMOTION_VERIFICATION_COMMAND,
  StablePromotionError,
  verifyStablePromotionFixture,
} from "./stable-promotion.mjs";
import {
  CANONICAL_CUTOVER_CADENCES,
  CANONICAL_CUTOVER_GATE_ID,
  CANONICAL_CUTOVER_REQUIRED_GATES,
  CANONICAL_CUTOVER_SOLUTION_NAME,
  CANONICAL_CUTOVER_SOLUTION_ROOT,
  CANONICAL_CUTOVER_VERIFICATION_COMMAND,
  CanonicalCutoverError,
  verifyCanonicalCutoverFixture,
} from "./canonical-cutover.mjs";

const CADENCES = [
  "fast",
  "pull-request",
  "main-nightly",
  RELEASE_CANDIDATE_CADENCE,
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
const DEPLOYMENT_MANIFEST_SOLUTION_NAME =
  "DeploymentManifestGeneratedSolution";
const DEPLOYMENT_MANIFEST_SOLUTION_ROOT =
  `tests/fixtures/${DEPLOYMENT_MANIFEST_SOLUTION_NAME}`;
const PORTABLE_HOST_CONFORMANCE_SOLUTION_NAME =
  "PortableHostConformanceGeneratedSolution";
const PORTABLE_HOST_CONFORMANCE_SOLUTION_ROOT =
  `tests/fixtures/${PORTABLE_HOST_CONFORMANCE_SOLUTION_NAME}`;
const LOCAL_ORCHESTRATION_SOLUTION_NAME =
  "LocalOrchestrationGeneratedSolution";
const LOCAL_ORCHESTRATION_SOLUTION_ROOT =
  `tests/fixtures/${LOCAL_ORCHESTRATION_SOLUTION_NAME}`;
const OTLP_EXPORT_SOLUTION_NAME = "OtlpExportGeneratedSolution";
const OTLP_EXPORT_SOLUTION_ROOT =
  `tests/fixtures/${OTLP_EXPORT_SOLUTION_NAME}`;
const MAILKIT_SMTP_SOLUTION_NAME = "MailKitSmtpGeneratedSolution";
const MAILKIT_SMTP_SOLUTION_ROOT = `tests/fixtures/${MAILKIT_SMTP_SOLUTION_NAME}`;
const MAILKIT_SMTP_FIXTURE_PATH = `${MAILKIT_SMTP_SOLUTION_ROOT}/mailkit-smtp.json`;
const MAILKIT_SMTP_INTENT_STATES = Object.freeze([
  "Pending",
  "Accepted",
  "TransientFailure",
  "PermanentFailure",
  "Cancelled",
]);
const MAILKIT_SMTP_TRANSPORT_OPERATIONS = Object.freeze([
  "ConnectAsync",
  "AuthenticateAsync",
  "SendAsync",
  "DisconnectAsync",
]);
const MAILKIT_SMTP_OUTCOMES = Object.freeze([
  "accepted",
  "transient",
  "permanent",
  "cancelled",
]);
const MAILKIT_SMTP_REDACTED_FIELDS = Object.freeze([
  "recipient",
  "subject",
  "body",
  "attachment",
  "provider-response",
]);
const MAILKIT_SMTP_OBSERVABILITY_SIGNALS = Object.freeze([
  "backlog-age",
  "attempts",
  "provider-acceptance",
  "failure-class",
  "latency",
  "terminal-failure",
]);
const MAILKIT_SMTP_MAILPIT_VERSION = "1.30.0";
const MAILKIT_SMTP_MAILPIT_COMMIT = "af8756a";
const MAILKIT_SMTP_SOURCE_PATHS = Object.freeze({
  intent: `${MAILKIT_SMTP_SOLUTION_ROOT}/src/MartiX.MailKitSmtpTestApp.Notifications/NotificationDeliveryIntent.cs`,
  options: `${MAILKIT_SMTP_SOLUTION_ROOT}/src/MartiX.MailKitSmtpTestApp.Notifications/SmtpDeliveryOptions.cs`,
  adapter: `${MAILKIT_SMTP_SOLUTION_ROOT}/src/MartiX.MailKitSmtpTestApp.Notifications/MailKitSmtpDelivery.cs`,
  dispatcher: `${MAILKIT_SMTP_SOLUTION_ROOT}/src/MartiX.MailKitSmtpTestApp.Notifications/NotificationDeliveryDispatcher.cs`,
  tests: `${MAILKIT_SMTP_SOLUTION_ROOT}/tests/MartiX.MailKitSmtpTestApp.Tests/MailKitSmtpDeliveryTests.cs`,
  integrationTests: `${MAILKIT_SMTP_SOLUTION_ROOT}/tests/MartiX.MailKitSmtpTestApp.Tests/MailpitIntegrationTests.cs`,
  evidence: `${MAILKIT_SMTP_SOLUTION_ROOT}/evidence/mailpit.md`,
});
const VALKEY_DISTRIBUTED_CACHE_SOLUTION_NAME =
  "ValkeyDistributedCacheGeneratedSolution";
const VALKEY_DISTRIBUTED_CACHE_SOLUTION_ROOT =
  `tests/fixtures/${VALKEY_DISTRIBUTED_CACHE_SOLUTION_NAME}`;
const QUARTZ_DURABLE_JOBS_SOLUTION_NAME =
  "QuartzDurableJobsGeneratedSolution";
const QUARTZ_DURABLE_JOBS_SOLUTION_ROOT =
  `tests/fixtures/${QUARTZ_DURABLE_JOBS_SOLUTION_NAME}`;
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
  "bootstrap.deployment-manifest",
  "bootstrap.portable-host-conformance",
  "bootstrap.local-orchestration",
  "bootstrap.otlp-export",
  "bootstrap.feature-management",
  "bootstrap.mailkit-smtp",
  "bootstrap.valkey-distributed-cache",
  "bootstrap.quartz-durable-jobs",
  "bootstrap.host-baseline",
  "bootstrap.secret-free",
  "bootstrap.agent-readiness",
];
const MODULAR_MONOLITH_ALPHA_PROFILE_ID = "modular-monolith-alpha";
const BETA_INTEGRATION_PROFILE_ID = "beta-integration";
const RELEASE_CANDIDATE_PROFILE_ID = RELEASE_CANDIDATE_CADENCE;
const STABLE_PROMOTION_PROFILE_ID = "stable-promotion";
const CANONICAL_CUTOVER_PROFILE_ID = "canonical-cutover";
const BETA_INTEGRATION_GATE_IDS = Object.freeze(["beta.integration"]);
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
  "schemas/beta-integration.schema.json",
  "schemas/release-candidate.schema.json",
  "schemas/stable-promotion.schema.json",
  "schemas/canonical-cutover.schema.json",
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
  `${BETA_INTEGRATION_SOLUTION_ROOT}/README.md`,
  `${BETA_INTEGRATION_SOLUTION_ROOT}/AGENTS.md`,
  `${BETA_INTEGRATION_SOLUTION_ROOT}/CONTEXT.md`,
  `${BETA_INTEGRATION_SOLUTION_ROOT}/martix.platform.json`,
  `${BETA_INTEGRATION_SOLUTION_ROOT}/beta-integration.json`,
  `${RELEASE_CANDIDATE_SOLUTION_ROOT}/README.md`,
  `${RELEASE_CANDIDATE_SOLUTION_ROOT}/AGENTS.md`,
  `${RELEASE_CANDIDATE_SOLUTION_ROOT}/CONTEXT.md`,
  `${RELEASE_CANDIDATE_SOLUTION_ROOT}/martix.platform.json`,
  `${RELEASE_CANDIDATE_SOLUTION_ROOT}/release-candidate.json`,
  `${STABLE_PROMOTION_SOLUTION_ROOT}/README.md`,
  `${STABLE_PROMOTION_SOLUTION_ROOT}/martix.platform.json`,
  `${STABLE_PROMOTION_SOLUTION_ROOT}/stable-promotion.json`,
  `${CANONICAL_CUTOVER_SOLUTION_ROOT}/README.md`,
  `${CANONICAL_CUTOVER_SOLUTION_ROOT}/martix.platform.json`,
  `${CANONICAL_CUTOVER_SOLUTION_ROOT}/canonical-cutover.json`,
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
  `${OTLP_EXPORT_SOLUTION_ROOT}/README.md`,
  `${OTLP_EXPORT_SOLUTION_ROOT}/AGENTS.md`,
  `${OTLP_EXPORT_SOLUTION_ROOT}/CONTEXT.md`,
  `${OTLP_EXPORT_SOLUTION_ROOT}/martix.platform.json`,
  `${OTLP_EXPORT_SOLUTION_ROOT}/otlp-export.json`,
  "eng/azure-key-vault.mjs",
  `${MAILKIT_SMTP_SOLUTION_ROOT}/README.md`,
  `${MAILKIT_SMTP_SOLUTION_ROOT}/AGENTS.md`,
  `${MAILKIT_SMTP_SOLUTION_ROOT}/CONTEXT.md`,
  `${MAILKIT_SMTP_SOLUTION_ROOT}/MailKitSmtpGeneratedSolution.slnx`,
  `${MAILKIT_SMTP_SOLUTION_ROOT}/martix.platform.json`,
  `${MAILKIT_SMTP_SOLUTION_ROOT}/mailkit-smtp.json`,
  `${MAILKIT_SMTP_SOLUTION_ROOT}/evidence/mailpit.md`,
  `${MAILKIT_SMTP_SOLUTION_ROOT}/src/MartiX.MailKitSmtpTestApp.Notifications/MartiX.MailKitSmtpTestApp.Notifications.csproj`,
  `${MAILKIT_SMTP_SOLUTION_ROOT}/src/MartiX.MailKitSmtpTestApp.Notifications/NotificationDeliveryIntent.cs`,
  `${MAILKIT_SMTP_SOLUTION_ROOT}/src/MartiX.MailKitSmtpTestApp.Notifications/SmtpDeliveryOptions.cs`,
  `${MAILKIT_SMTP_SOLUTION_ROOT}/src/MartiX.MailKitSmtpTestApp.Notifications/MailKitSmtpDelivery.cs`,
  `${MAILKIT_SMTP_SOLUTION_ROOT}/src/MartiX.MailKitSmtpTestApp.Notifications/NotificationDeliveryDispatcher.cs`,
  `${MAILKIT_SMTP_SOLUTION_ROOT}/tests/MartiX.MailKitSmtpTestApp.Tests/MartiX.MailKitSmtpTestApp.Tests.csproj`,
  `${MAILKIT_SMTP_SOLUTION_ROOT}/tests/MartiX.MailKitSmtpTestApp.Tests/MailKitSmtpDeliveryTests.cs`,
  `${MAILKIT_SMTP_SOLUTION_ROOT}/tests/MartiX.MailKitSmtpTestApp.Tests/MailpitIntegrationTests.cs`,
  `${QUARTZ_DURABLE_JOBS_SOLUTION_ROOT}/README.md`,
  `${QUARTZ_DURABLE_JOBS_SOLUTION_ROOT}/AGENTS.md`,
  `${QUARTZ_DURABLE_JOBS_SOLUTION_ROOT}/CONTEXT.md`,
  `${QUARTZ_DURABLE_JOBS_SOLUTION_ROOT}/MartiX.QuartzTestApp.slnx`,
  `${QUARTZ_DURABLE_JOBS_SOLUTION_ROOT}/martix.platform.json`,
  `${QUARTZ_DURABLE_JOBS_SOLUTION_ROOT}/contracts/openapi-v1.json`,
  `${QUARTZ_DURABLE_JOBS_SOLUTION_ROOT}/src/MartiX.QuartzTestApp.Api/MartiX.QuartzTestApp.Api.csproj`,
  `${QUARTZ_DURABLE_JOBS_SOLUTION_ROOT}/src/MartiX.QuartzTestApp.Api/Program.cs`,
  `${QUARTZ_DURABLE_JOBS_SOLUTION_ROOT}/src/MartiX.QuartzTestApp.Api/Infrastructure/DurableJobs/DurableJobsComposition.cs`,
  `${QUARTZ_DURABLE_JOBS_SOLUTION_ROOT}/src/MartiX.QuartzTestApp.Api/Infrastructure/Host/HostSecurity.cs`,
  `${QUARTZ_DURABLE_JOBS_SOLUTION_ROOT}/src/MartiX.QuartzTestApp.Api/Infrastructure/Identity/ActorAuthorization.cs`,
  `${QUARTZ_DURABLE_JOBS_SOLUTION_ROOT}/src/MartiX.QuartzTestApp.Api/Infrastructure/Identity/AuthenticationComposition.cs`,
  `${QUARTZ_DURABLE_JOBS_SOLUTION_ROOT}/src/MartiX.QuartzTestApp.Api/Infrastructure/IntegrationEvents/ReliableEventsComposition.cs`,
  `${QUARTZ_DURABLE_JOBS_SOLUTION_ROOT}/src/MartiX.QuartzTestApp.Migrator/MartiX.QuartzTestApp.Migrator.csproj`,
  `${QUARTZ_DURABLE_JOBS_SOLUTION_ROOT}/src/MartiX.QuartzTestApp.Migrator/Program.cs`,
  `${QUARTZ_DURABLE_JOBS_SOLUTION_ROOT}/src/MartiX.QuartzTestApp.Migrator/Infrastructure/DurableJobs/QuartzMigrationComposition.cs`,
  `${QUARTZ_DURABLE_JOBS_SOLUTION_ROOT}/src/MartiX.QuartzTestApp.Client/MartiX.QuartzTestApp.Client.csproj`,
  `${QUARTZ_DURABLE_JOBS_SOLUTION_ROOT}/src/MartiX.QuartzTestApp.Client/MartiX.QuartzTestApp.Client.cs`,
  `${QUARTZ_DURABLE_JOBS_SOLUTION_ROOT}/src/MartiX.QuartzTestApp.Orders/MartiX.QuartzTestApp.Orders.csproj`,
  `${QUARTZ_DURABLE_JOBS_SOLUTION_ROOT}/src/MartiX.QuartzTestApp.Orders/OrdersModule.cs`,
  `${QUARTZ_DURABLE_JOBS_SOLUTION_ROOT}/src/MartiX.QuartzTestApp.Orders/Contracts/ModuleContracts/IOrdersStatus.cs`,
  `${QUARTZ_DURABLE_JOBS_SOLUTION_ROOT}/src/MartiX.QuartzTestApp.Orders/Contracts/IntegrationEvents/OrdersIntegrationEvents.cs`,
  `${QUARTZ_DURABLE_JOBS_SOLUTION_ROOT}/src/MartiX.QuartzTestApp.Orders/Domain/OrdersAggregate.cs`,
  `${QUARTZ_DURABLE_JOBS_SOLUTION_ROOT}/src/MartiX.QuartzTestApp.Orders/Features/Status/OrdersStatus.cs`,
  `${QUARTZ_DURABLE_JOBS_SOLUTION_ROOT}/src/MartiX.QuartzTestApp.Orders/Infrastructure/Persistence/OrdersDbContext.cs`,
  `${QUARTZ_DURABLE_JOBS_SOLUTION_ROOT}/src/MartiX.QuartzTestApp.Orders/Infrastructure/Persistence/OrdersPersistenceModel.cs`,
  `${QUARTZ_DURABLE_JOBS_SOLUTION_ROOT}/src/MartiX.QuartzTestApp.Orders/Infrastructure/IntegrationEvents/OrdersReliableEvents.cs`,
  `${QUARTZ_DURABLE_JOBS_SOLUTION_ROOT}/src/MartiX.QuartzTestApp.Orders/Infrastructure/Persistence/Migrations/20260101000000_InitialOrders.cs`,
  `${QUARTZ_DURABLE_JOBS_SOLUTION_ROOT}/src/MartiX.QuartzTestApp.Orders/Infrastructure/Persistence/Migrations/OrdersDbContextModelSnapshot.cs`,
  `${QUARTZ_DURABLE_JOBS_SOLUTION_ROOT}/tests/MartiX.QuartzTestApp.Tests/MartiX.QuartzTestApp.Tests.csproj`,
  `${QUARTZ_DURABLE_JOBS_SOLUTION_ROOT}/tests/MartiX.QuartzTestApp.Tests/ModularMonolithCompositionTests.cs`,
  "eng/provider-admission.mjs",
  `${DEPLOYMENT_MANIFEST_SOLUTION_ROOT}/README.md`,
  `${DEPLOYMENT_MANIFEST_SOLUTION_ROOT}/AGENTS.md`,
  `${DEPLOYMENT_MANIFEST_SOLUTION_ROOT}/CONTEXT.md`,
  `${DEPLOYMENT_MANIFEST_SOLUTION_ROOT}/martix.platform.json`,
  `${DEPLOYMENT_MANIFEST_SOLUTION_ROOT}/deployment-manifest.json`,
  `${DEPLOYMENT_MANIFEST_SOLUTION_ROOT}/deployment-evidence.json`,
  "eng/deployment-manifest.mjs",
  "schemas/deployment-manifest.schema.json",
  `${PORTABLE_HOST_CONFORMANCE_SOLUTION_ROOT}/README.md`,
  `${PORTABLE_HOST_CONFORMANCE_SOLUTION_ROOT}/AGENTS.md`,
  `${PORTABLE_HOST_CONFORMANCE_SOLUTION_ROOT}/CONTEXT.md`,
  `${PORTABLE_HOST_CONFORMANCE_SOLUTION_ROOT}/martix.platform.json`,
  `${PORTABLE_HOST_CONFORMANCE_SOLUTION_ROOT}/portable-host-conformance.json`,
  "eng/portable-host-conformance.mjs",
  "schemas/portable-host-conformance.schema.json",
  `${LOCAL_ORCHESTRATION_SOLUTION_ROOT}/README.md`,
  `${LOCAL_ORCHESTRATION_SOLUTION_ROOT}/AGENTS.md`,
  `${LOCAL_ORCHESTRATION_SOLUTION_ROOT}/CONTEXT.md`,
  `${LOCAL_ORCHESTRATION_SOLUTION_ROOT}/martix.platform.json`,
  `${LOCAL_ORCHESTRATION_SOLUTION_ROOT}/orchestration-manifest.json`,
  `${LOCAL_ORCHESTRATION_SOLUTION_ROOT}/apphost.cs`,
  `${LOCAL_ORCHESTRATION_SOLUTION_ROOT}/compose.yaml`,
  "eng/local-orchestration.mjs",
  "schemas/local-orchestration.schema.json",
  ...FEATURE_MANAGEMENT_FIXTURE_FILES.map(
    (relativePath) => `${FEATURE_MANAGEMENT_SOLUTION_ROOT}/${relativePath}`,
  ),
  "eng/feature-management.mjs",
  "eng/object-storage.mjs",
  `${VALKEY_DISTRIBUTED_CACHE_SOLUTION_ROOT}/README.md`,
  `${VALKEY_DISTRIBUTED_CACHE_SOLUTION_ROOT}/AGENTS.md`,
  `${VALKEY_DISTRIBUTED_CACHE_SOLUTION_ROOT}/CONTEXT.md`,
  `${VALKEY_DISTRIBUTED_CACHE_SOLUTION_ROOT}/MartiX.ValkeyDistributedCacheTestApp.slnx`,
  `${VALKEY_DISTRIBUTED_CACHE_SOLUTION_ROOT}/martix.platform.json`,
  `${VALKEY_DISTRIBUTED_CACHE_SOLUTION_ROOT}/valkey-conformance.json`,
  `${VALKEY_DISTRIBUTED_CACHE_SOLUTION_ROOT}/src/MartiX.ValkeyDistributedCacheTestApp.Api/MartiX.ValkeyDistributedCacheTestApp.Api.csproj`,
  `${VALKEY_DISTRIBUTED_CACHE_SOLUTION_ROOT}/src/MartiX.ValkeyDistributedCacheTestApp.Api/Program.cs`,
  `${VALKEY_DISTRIBUTED_CACHE_SOLUTION_ROOT}/src/MartiX.ValkeyDistributedCacheTestApp.Api/ValkeyHealthCheck.cs`,
  `${VALKEY_DISTRIBUTED_CACHE_SOLUTION_ROOT}/tests/MartiX.ValkeyDistributedCacheTestApp.Tests/MartiX.ValkeyDistributedCacheTestApp.Tests.csproj`,
  `${VALKEY_DISTRIBUTED_CACHE_SOLUTION_ROOT}/tests/MartiX.ValkeyDistributedCacheTestApp.Tests/ValkeyDistributedCacheConformanceTests.cs`,
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
  const durableJobsSelected = manifest.capabilities?.some(
    (capability) =>
      capability?.id === "modular-monolith.durable-jobs" &&
      capability.state === "selected",
  );
  if (durableJobsSelected) {
    files.push(
      `src/${applicationName}.Api/Infrastructure/DurableJobs/DurableJobsComposition.cs`,
      `src/${applicationName}.Migrator/Infrastructure/DurableJobs/QuartzMigrationComposition.cs`,
    );
  }

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
  const durableJobsCapability = manifest.capabilities.find(
    (capability) => capability?.id === "modular-monolith.durable-jobs",
  );
  const durableJobsSelected = durableJobsCapability?.state === "selected";
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
  const testSource = await readSolutionFile(
    `tests/${applicationName}.Tests/ModularMonolithCompositionTests.cs`,
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
  const durableJobsSource = durableJobsSelected
    ? await readSolutionFile(
        `src/${applicationName}.Api/Infrastructure/DurableJobs/DurableJobsComposition.cs`,
      )
    : "";
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
  const apiQuartzPackageResidue =
    /PackageReference\b[^>]*\bInclude="Quartz(?:[."]|")/.test(apiProject);
  const migratorQuartzPackageResidue =
    /PackageReference\b[^>]*\bInclude="Quartz(?:[."]|")/.test(migratorProject);
  if (durableJobsSelected !== apiQuartzPackageResidue) {
    fail(
      durableJobsSelected
        ? "Selected Quartz durable jobs must reference Quartz packages from the API project."
        : "Unselected Quartz durable jobs must leave no Quartz package residue.",
    );
  }
  if (migratorQuartzPackageResidue) {
    fail("The Migrator must not reference Quartz runtime packages.");
  }
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
  const quartzMigrationSource = durableJobsSelected
    ? await readSolutionFile(
        `src/${applicationName}.Migrator/Infrastructure/DurableJobs/QuartzMigrationComposition.cs`,
      )
    : "";
  if (durableJobsSelected) {
    if (
      !apiSource.includes("DurableJobsComposition.AddServices(services, configuration);") ||
      !durableJobsSource.includes("AddQuartzHostedService") ||
      !durableJobsSource.includes("UsePersistentStore") ||
      !durableJobsSource.includes("UseClustering") ||
      !durableJobsSource.includes("UseProperties = true") ||
      !durableJobsSource.includes("RequestRecovery(true)") ||
      !durableJobsSource.includes("StoreDurably(true)") ||
      !durableJobsSource.includes("DisallowConcurrentExecution") ||
      !durableJobsSource.includes("MaxBatchSize = 10") ||
      !durableJobsSource.includes("MaxConcurrency = 8") ||
      !durableJobsSource.includes("public sealed record JobInvocation") ||
      !durableJobsSource.includes("CreateJobKey") ||
      !durableJobsSource.includes("PauseAsync") ||
      !durableJobsSource.includes("ResumeAsync") ||
      !durableJobsSource.includes("InterruptAsync") ||
      !durableJobsSource.includes("DeleteAsync") ||
      !durableJobsSource.includes("CancellationToken") ||
      !durableJobsSource.includes("AddCheck<DurableJobsHealthCheck>") ||
      !durableJobsSource.includes("AddSource(DurableJobsTelemetry.ActivitySourceName)") ||
      !durableJobsSource.includes("UseSystemTextJsonSerializer") ||
      !testSource.includes("ConnectionStrings:Quartz") ||
      !testSource.includes("Quartz:SchedulerName") ||
      !quartzMigrationSource.includes(
        "public static async Task<string> ExecuteMigrationAsync",
      ) ||
      !/qrtz_job_details/i.test(quartzMigrationSource) ||
      !quartzMigrationSource.includes("RequiredTables") ||
      !quartzMigrationSource.includes("ExecuteNonQueryAsync") ||
      !migratorSource.includes(
        "QuartzMigrationComposition.AddMigrationServices(builder.Services, builder.Configuration);",
      ) ||
      !migratorSource.includes(
        "await QuartzMigrationComposition.ExecuteMigrationAsync(",
      )
    ) {
      fail(
        "Selected Quartz durable jobs must expose explicit bounded scheduling, recovery, operations, telemetry, and Migrator-owned schema composition.",
      );
    }
  }
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

async function validateModularMonolithSolution(
  rootDir,
  manifest,
  solutionRootRelative = MODULAR_MONOLITH_SOLUTION_ROOT,
) {
  const solutionRoot = resolve(rootDir, solutionRootRelative);
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
    const authenticationStateMethodSource = sessionSource.match(
      /public override Task<AuthenticationState> GetAuthenticationStateAsync\(\)[\s\S]*?(?=\s+public void Publish)/,
    )?.[0] ?? "";
    sessionContractValid =
      sessionSource.includes("AuthenticationStateProvider") &&
      sessionSource.includes("server") &&
      sessionSource.includes("Publish") &&
      sessionSource.includes("IHttpContextAccessor") &&
      authenticationStateMethodSource.includes("CreatePrincipal(session)") &&
      !authenticationStateMethodSource.includes("HttpContext") &&
      !sessionSource.includes("localStorage");
  } else {
    sessionContractValid = sessionSource.includes('credentials: "include"');
  }
  const blazorApiFailureContractValid =
    !isBlazorProvider ||
    (generatedClientSource.includes("ProblemDetails? problem = null") &&
      generatedClientSource.includes("catch (JsonException)"));
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
    !blazorApiFailureContractValid ||
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

function requireQualityProfile(
  profiles,
  {
    id,
    maturity,
    preset,
    providers,
    cadences,
    gates,
    command,
    description,
  },
) {
  const matchingProfiles = profiles.filter((profile) => profile?.id === id);
  if (matchingProfiles.length !== 1) {
    fail(`Quality policy must declare exactly one ${id} profile.`);
  }

  const profile = matchingProfiles[0];
  if (
    profile.maturity !== maturity ||
    profile.preset !== preset ||
    JSON.stringify(profile.providers) !== JSON.stringify(providers) ||
    JSON.stringify(profile.cadences) !== JSON.stringify(cadences) ||
    JSON.stringify(profile.gates) !== JSON.stringify(gates) ||
    profile.command !== command
  ) {
    fail(`${id} quality profile is not the declared ${description}.`);
  }

  return profile;
}

function validateProfileGateSelection({
  profile,
  profileId,
  requiredGateIds,
  gateIds,
  gateLabel,
}) {
  for (const gateId of profile.gates) {
    if (!gateIds.has(gateId)) {
      fail(
        `Quality profile ${profileId} references an unknown gate: ${gateId}.`,
      );
    }
  }

  for (const gateId of requiredGateIds) {
    if (!profile.gates.includes(gateId)) {
      fail(
        `${gateLabel} gate ${gateId} is not selected by its quality profile.`,
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
  const alphaProfile = requireQualityProfile(policy.profiles, {
    id: MODULAR_MONOLITH_ALPHA_PROFILE_ID,
    maturity: "experimental",
    preset: "modular-monolith",
    providers: MODULAR_MONOLITH_ALPHA_PROVIDERS,
    cadences: RELEASE_CANDIDATE_CADENCES,
    gates: MODULAR_MONOLITH_ALPHA_GATE_IDS,
    command: "npm run verify:modular-monolith-alpha",
    description: "Experimental provider matrix",
  });
  const betaProfile = requireQualityProfile(policy.profiles, {
    id: BETA_INTEGRATION_PROFILE_ID,
    maturity: "beta",
    preset: "platform",
    providers: [],
    cadences: RELEASE_CANDIDATE_CADENCES,
    gates: BETA_INTEGRATION_GATE_IDS,
    command: "npm run verify:beta-integration",
    description: "Beta integration matrix",
  });
  const releaseCandidateProfile = requireQualityProfile(policy.profiles, {
    id: RELEASE_CANDIDATE_PROFILE_ID,
    maturity: "release-candidate",
    preset: "platform",
    providers: [],
    cadences: RELEASE_CANDIDATE_CADENCES,
    gates: [RELEASE_CANDIDATE_GATE_ID],
    command: RELEASE_CANDIDATE_VERIFICATION_COMMAND,
    description: "Release Candidate evidence matrix",
  });
  const stablePromotionProfile = requireQualityProfile(policy.profiles, {
    id: STABLE_PROMOTION_PROFILE_ID,
    maturity: "stable",
    preset: "platform",
    providers: [],
    cadences: STABLE_PROMOTION_CADENCES,
    gates: [STABLE_PROMOTION_GATE_ID],
    command: STABLE_PROMOTION_VERIFICATION_COMMAND,
    description: "Stable promotion evidence matrix",
  });
  const canonicalCutoverProfile = requireQualityProfile(policy.profiles, {
    id: CANONICAL_CUTOVER_PROFILE_ID,
    maturity: "stable",
    preset: "platform",
    providers: [],
    cadences: CANONICAL_CUTOVER_CADENCES,
    gates: [CANONICAL_CUTOVER_GATE_ID],
    command: CANONICAL_CUTOVER_VERIFICATION_COMMAND,
    description: "Canonical cutover evidence matrix",
  });

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
      !MODULAR_MONOLITH_ALPHA_GATE_IDS.includes(gate.id) &&
      !BETA_INTEGRATION_GATE_IDS.includes(gate.id) &&
      !RELEASE_CANDIDATE_GATE_IDS.includes(gate.id) &&
      gate.id !== STABLE_PROMOTION_GATE_ID &&
      gate.id !== CANONICAL_CUTOVER_GATE_ID
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
  for (const requiredGate of BETA_INTEGRATION_GATE_IDS) {
    if (!gateIds.has(requiredGate)) {
      fail(`Missing required Beta integration quality gate: ${requiredGate}`);
    }
  }
  for (const requiredGate of [
    RELEASE_CANDIDATE_GATE_ID,
    STABLE_PROMOTION_GATE_ID,
    CANONICAL_CUTOVER_GATE_ID,
  ]) {
    if (!gateIds.has(requiredGate)) {
      fail(`Missing required Release Candidate quality gate: ${requiredGate}`);
    }
  }

  for (const gate of policy.gates) {
    if (BOOTSTRAP_GATE_IDS.includes(gate.id)) {
      for (const cadence of CADENCES) {
        if (!gate.cadences.includes(cadence)) {
          fail(`Required gate ${gate.id} is not declared for cadence ${cadence}.`);
        }
      }
    } else if (BETA_INTEGRATION_GATE_IDS.includes(gate.id)) {
      if (
        JSON.stringify(gate.cadences) !==
        JSON.stringify(RELEASE_CANDIDATE_CADENCES)
      ) {
        fail(
          `Beta integration gate ${gate.id} must run on release-candidate.`,
        );
      }
    } else if (gate.id === RELEASE_CANDIDATE_GATE_ID) {
      if (
        JSON.stringify(gate.cadences) !==
        JSON.stringify(RELEASE_CANDIDATE_CADENCES)
      ) {
        fail(
          `Release Candidate gate ${gate.id} must run on release-candidate.`,
        );
      }
    } else if (gate.id === STABLE_PROMOTION_GATE_ID) {
      if (
        JSON.stringify(gate.cadences) !==
        JSON.stringify(STABLE_PROMOTION_CADENCES)
      ) {
        fail(
          `Stable promotion gate ${gate.id} must run on release-candidate.`,
        );
      }
    } else if (gate.id === CANONICAL_CUTOVER_GATE_ID) {
      if (
        JSON.stringify(gate.cadences) !==
        JSON.stringify(CANONICAL_CUTOVER_CADENCES)
      ) {
        fail(
          `Canonical cutover gate ${gate.id} must run on release-candidate.`,
        );
      }
    } else if (
      JSON.stringify(gate.cadences) !==
      JSON.stringify(RELEASE_CANDIDATE_CADENCES)
    ) {
      fail(
        `Modular Monolith alpha gate ${gate.id} must run on release-candidate.`,
      );
    }
  }

  validateProfileGateSelection({
    profile: alphaProfile,
    profileId: MODULAR_MONOLITH_ALPHA_PROFILE_ID,
    requiredGateIds: MODULAR_MONOLITH_ALPHA_GATE_IDS,
    gateIds,
    gateLabel: "Modular Monolith alpha",
  });
  validateProfileGateSelection({
    profile: betaProfile,
    profileId: BETA_INTEGRATION_PROFILE_ID,
    requiredGateIds: BETA_INTEGRATION_GATE_IDS,
    gateIds,
    gateLabel: "Beta integration",
  });
  validateProfileGateSelection({
    profile: releaseCandidateProfile,
    profileId: RELEASE_CANDIDATE_PROFILE_ID,
    requiredGateIds: [RELEASE_CANDIDATE_GATE_ID],
    gateIds,
    gateLabel: "Release Candidate",
  });
  validateProfileGateSelection({
    profile: stablePromotionProfile,
    profileId: STABLE_PROMOTION_PROFILE_ID,
    requiredGateIds: [STABLE_PROMOTION_GATE_ID],
    gateIds,
    gateLabel: "Stable promotion",
  });
  validateProfileGateSelection({
    profile: canonicalCutoverProfile,
    profileId: CANONICAL_CUTOVER_PROFILE_ID,
    requiredGateIds: [CANONICAL_CUTOVER_GATE_ID],
    gateIds,
    gateLabel: "Canonical cutover",
  });
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
  { solutionRoot = PROVIDER_ADMISSION_SOLUTION_ROOT } = {},
) {
  const fixturePath = `${solutionRoot}/provider-admission.json`;
  const manifestPath = `${solutionRoot}/martix.platform.json`;
  const requiresAzureKeyVaultEvidence =
    solutionRoot === PROVIDER_ADMISSION_SOLUTION_ROOT;
  const requiresObjectStorageEvidence =
    solutionRoot === PROVIDER_ADMISSION_SOLUTION_ROOT;
  assertSecretFree(
    fixture,
    fixturePath,
    "Provider admission fixture",
  );
  requireRecord(fixture, fixturePath);
  requireRecord(
    fixture.selection,
    `${fixturePath}.selection`,
  );
  requireRecord(
    fixture.observed,
    `${fixturePath}.observed`,
  );
  requireRecord(
    fixture.evidence,
    `${fixturePath}.evidence`,
  );
  if (requiresAzureKeyVaultEvidence) {
    requireRecord(
      fixture.providerEvidence,
      `${fixturePath}.providerEvidence`,
    );
  }
  if (requiresObjectStorageEvidence) {
    requireRecord(
      fixture.objectStorage,
      `${fixturePath}.objectStorage`,
    );
  }
  requireArray(
    fixture.invalidSelections,
    `${fixturePath}.invalidSelections`,
  );
  requireRecord(manifest, manifestPath);
  requireArray(manifest.providers, `${manifestPath}.providers`);
  requireArray(manifest.supportClaims, `${manifestPath}.supportClaims`);

  let objectStorage;
  if (requiresObjectStorageEvidence) {
    try {
      objectStorage = verifyAzureBlobObjectStorageEvidence(fixture.objectStorage);
    } catch (error) {
      if (error instanceof ObjectStorageEvidenceError) {
        fail(`Azure Blob object-storage evidence failed: ${error.message}`);
      }
      throw error;
    }
  }

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

  if (requiresAzureKeyVaultEvidence) {
    try {
      verifyAzureKeyVaultEvidence(fixture.providerEvidence);
    } catch (error) {
      if (error instanceof AzureKeyVaultEvidenceError) {
        fail(`Azure Key Vault provider evidence failed: ${error.message}`);
      }
      throw error;
    }

    const selectedKeyVault = result.plan.providers.find(
      ({ capability, id }) =>
        capability === AZURE_KEY_VAULT_PROVIDER.capability &&
        id === AZURE_KEY_VAULT_PROVIDER.id,
    );
    if (selectedKeyVault === undefined) {
      fail("Provider admission fixture must select Azure Key Vault.");
    }
    const providerEvidence = fixture.providerEvidence;
    if (
      providerEvidence.provider.capability !== selectedKeyVault.capability ||
      providerEvidence.provider.id !== selectedKeyVault.id
    ) {
      fail("Azure Key Vault provider evidence does not match the selected provider.");
    }
    if (
      JSON.stringify(providerEvidence.configuration.requiredKeys) !==
      JSON.stringify([...AZURE_KEY_VAULT_REQUIRED_CONFIGURATION])
    ) {
      fail(
        "Azure Key Vault provider evidence does not declare its required configuration.",
      );
    }
    const selectedConfiguration = new Set(result.plan.configuration.selectedKeys);
    if (
      providerEvidence.configuration.selectedKeys.some(
        (key) => !selectedConfiguration.has(key),
      )
    ) {
      fail(
        "Azure Key Vault provider evidence declares configuration that was not selected.",
      );
    }
  }

  if (JSON.stringify(result.evidence) !== JSON.stringify(fixture.evidence)) {
    fail(
      `Provider admission fixture evidence does not match the resolved composition: ${fixturePath}.`,
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
  if (requiresObjectStorageEvidence) {
    if (
      !result.plan.providers.some(
        ({ capability, id }) =>
          capability === "object-storage" && id === "azure-blob",
      )
    ) {
      fail(
        "Provider admission fixture must select azure-blob for object-storage evidence.",
      );
    }
  }

  for (const [index, invalid] of fixture.invalidSelections.entries()) {
    const path =
      `${fixturePath}.invalidSelections[${index}]`;
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
    ...(requiresAzureKeyVaultEvidence
      ? { providerEvidenceDigest: fixture.providerEvidence.evidenceDigest }
      : {}),
    invalidSelectionCount: fixture.invalidSelections.length,
    ...(requiresObjectStorageEvidence
      ? {
          objectStorageStatus: objectStorage.supportStatus,
          objectStorageLiveParity: objectStorage.liveParity,
        }
      : {}),
  };
}

export function validateDeploymentManifestFixture(
  deploymentManifest,
  deploymentEvidence,
  deploymentSchema,
) {
  const manifestPath =
    `${DEPLOYMENT_MANIFEST_SOLUTION_ROOT}/deployment-manifest.json`;
  const evidencePath =
    `${DEPLOYMENT_MANIFEST_SOLUTION_ROOT}/deployment-evidence.json`;
  const schemaPath = "schemas/deployment-manifest.schema.json";

  requireRecord(deploymentManifest, manifestPath);
  requireRecord(deploymentEvidence, evidencePath);
  requireRecord(deploymentSchema, schemaPath);
  assertSecretFree(deploymentManifest, manifestPath, "Deployment Manifest fixture");
  assertSecretFree(deploymentEvidence, evidencePath, "Deployment evidence fixture");
  assertSecretFree(deploymentSchema, schemaPath, "Deployment Manifest schema");
  validateClosedObjectSchemas(deploymentSchema, schemaPath);
  validateAgainstSchema(deploymentManifest, deploymentSchema, manifestPath);

  let manifestResult;
  try {
    manifestResult = verifyDeploymentManifest(deploymentManifest);
    verifyDeploymentEvidence(deploymentManifest, deploymentEvidence);
  } catch (error) {
    if (error instanceof DeploymentManifestError) {
      fail(`Deployment Manifest fixture failed: ${error.message}`);
    }
    throw error;
  }

  if (deploymentEvidence.supportClaims.length !== 0) {
    fail("Deployment evidence fixture must not make a Supported deployment claim.");
  }

  return {
    status: "passed",
    solution: DEPLOYMENT_MANIFEST_SOLUTION_NAME,
    manifestDigest: manifestResult.manifestDigest,
    topologyDigest: manifestResult.topologyDigest,
    artifactProfiles: deploymentEvidence.artifacts.map(
      (artifact) => artifact.profile,
    ),
    evidenceDigest: deploymentEvidence.verification.evidenceDigest,
  };
}

const PORTABLE_HOST_CONFORMANCE_EXPECTED_FILES = Object.freeze([
  "AGENTS.md",
  "CONTEXT.md",
  "README.md",
  "martix.platform.json",
  "portable-host-conformance.json",
]);

export async function validatePortableHostConformanceFixture({
  rootDir,
  solutionManifest,
  conformance,
  conformanceSchema,
  deploymentManifest,
}) {
  const solutionPath = `${PORTABLE_HOST_CONFORMANCE_SOLUTION_ROOT}/martix.platform.json`;
  const conformancePath =
    `${PORTABLE_HOST_CONFORMANCE_SOLUTION_ROOT}/portable-host-conformance.json`;
  const schemaPath = "schemas/portable-host-conformance.schema.json";

  requireRecord(solutionManifest, solutionPath);
  requireRecord(conformance, conformancePath);
  requireRecord(conformanceSchema, schemaPath);
  assertSecretFree(conformance, conformancePath, "Portable Host Conformance fixture");
  assertSecretFree(conformanceSchema, schemaPath, "Portable Host Conformance schema");
  validateClosedObjectSchemas(conformanceSchema, schemaPath);
  validateAgainstSchema(conformance, conformanceSchema, conformancePath);

  if (
    solutionManifest.preset !== "api" ||
    solutionManifest.supportClaims.length !== 0
  ) {
    fail("Portable Host Conformance fixture must use the claim-free api preset.");
  }
  const selectedCapabilities = solutionManifest.capabilities
    .filter((capability) => capability?.state === "selected")
    .map((capability) => capability.id);
  if (!selectedCapabilities.includes("deployment.host-conformance")) {
    fail("Portable Host Conformance fixture must select deployment.host-conformance.");
  }
  if (
    conformance.source?.manifest !==
    "../DeploymentManifestGeneratedSolution/deployment-manifest.json"
  ) {
    fail("Portable Host Conformance fixture must identify its Deployment Manifest source.");
  }

  let result;
  try {
    result = verifyPortableHostConformance(deploymentManifest, conformance);
  } catch (error) {
    if (error instanceof PortableHostConformanceError) {
      fail(`Portable Host Conformance fixture failed: ${error.message}`);
    }
    throw error;
  }

  if (
    result.active24.maturity !== "planned" ||
    result.active24.attestation !== "not-attested"
  ) {
    fail("Portable Host Conformance must keep Active24 Planned / Not Attested.");
  }

  const solutionRoot = resolve(rootDir, PORTABLE_HOST_CONFORMANCE_SOLUTION_ROOT);
  const actualFiles = await listFiles(solutionRoot);
  if (
    JSON.stringify(actualFiles) !==
    JSON.stringify(PORTABLE_HOST_CONFORMANCE_EXPECTED_FILES)
  ) {
    const missing = PORTABLE_HOST_CONFORMANCE_EXPECTED_FILES.filter(
      (file) => !actualFiles.includes(file),
    );
    const extra = actualFiles.filter(
      (file) => !PORTABLE_HOST_CONFORMANCE_EXPECTED_FILES.includes(file),
    );
    fail(
      `Portable Host Conformance Generated Solution inventory mismatch; missing: ${
        missing.join(", ") || "none"
      }; extra: ${extra.join(", ") || "none"}.`,
    );
  }

  return {
    ...result,
    status: "passed",
    solution: PORTABLE_HOST_CONFORMANCE_SOLUTION_NAME,
  };
}

const LOCAL_ORCHESTRATION_EXPECTED_FILES = Object.freeze([
  "AGENTS.md",
  "CONTEXT.md",
  "README.md",
  "apphost.cs",
  "compose.yaml",
  "martix.platform.json",
  "orchestration-manifest.json",
]);
const LOCAL_ORCHESTRATION_RESIDUE_FILES = new Set([
  "apphost.cs",
  "compose.yaml",
  "orchestration-manifest.json",
]);

export async function validateLocalOrchestrationFixture({
  rootDir,
  solutionManifest,
  orchestrationManifest,
  orchestrationSchema,
  deploymentManifest,
  appHost,
  compose,
  readme,
}) {
  const solutionPath = `${LOCAL_ORCHESTRATION_SOLUTION_ROOT}/martix.platform.json`;
  const orchestrationPath =
    `${LOCAL_ORCHESTRATION_SOLUTION_ROOT}/orchestration-manifest.json`;
  const schemaPath = "schemas/local-orchestration.schema.json";
  const appHostPath = `${LOCAL_ORCHESTRATION_SOLUTION_ROOT}/apphost.cs`;
  const composePath = `${LOCAL_ORCHESTRATION_SOLUTION_ROOT}/compose.yaml`;

  requireRecord(solutionManifest, solutionPath);
  requireRecord(orchestrationManifest, orchestrationPath);
  requireRecord(orchestrationSchema, schemaPath);
  assertSecretFree(orchestrationManifest, orchestrationPath, "Local orchestration manifest");
  assertSecretFree(orchestrationSchema, schemaPath, "Local orchestration schema");
  validateClosedObjectSchemas(orchestrationSchema, schemaPath);
  validateAgainstSchema(orchestrationManifest, orchestrationSchema, orchestrationPath);

  if (
    solutionManifest.preset !== "api" ||
    solutionManifest.supportClaims.length !== 0
  ) {
    fail(
      "Local orchestration fixture must use the claim-free api preset.",
    );
  }
  const selectedCapabilities = solutionManifest.capabilities
    .filter((capability) => capability?.state === "selected")
    .map((capability) => capability.id);
  for (const capability of ["deployment.process", "local.aspire", "deployment.compose"]) {
    if (!selectedCapabilities.includes(capability)) {
      fail(`Local orchestration fixture must select ${capability}.`);
    }
  }
  if (!readme.includes("dotnet run")) {
    fail("Local orchestration fixture must preserve ordinary dotnet run.");
  }

  let expected;
  try {
    expected = createLocalOrchestration(deploymentManifest);
  } catch (error) {
    if (
      error instanceof DeploymentManifestError ||
      error instanceof LocalOrchestrationError
    ) {
      fail(`Local orchestration fixture failed: ${error.message}`);
    }
    throw error;
  }

  if (
    orchestrationManifest.manifestDigest !== expected.manifestDigest ||
    orchestrationManifest.topologyDigest !== expected.topologyDigest ||
    orchestrationManifest.configurationSchemaDigest !==
      expected.configurationSchemaDigest
  ) {
    fail("Local orchestration metadata does not identify the validated Deployment Manifest.");
  }
  if (
    JSON.stringify(orchestrationManifest.profiles) !==
    JSON.stringify(LOCAL_ORCHESTRATION_PROFILES)
  ) {
    fail("Local orchestration metadata must declare direct, Aspire, and Compose profiles.");
  }
  if (
    orchestrationManifest.aspire.projectionDigest !==
      sha256(appHost) ||
    orchestrationManifest.compose.projectionDigest !==
      sha256(compose)
  ) {
    fail("Local orchestration projection digests do not match their files.");
  }
  if (
    appHost !== expected.aspire.content ||
    compose !== expected.compose.content
  ) {
    fail(
      "Local orchestration projections drifted from the validated Deployment Manifest.",
    );
  }
  if (
    /^\s*build\s*:/m.test(compose) ||
    /^\s*deploy\s*:/m.test(compose) ||
    /replicas:\s*[2-9]/i.test(compose) ||
    /high-availability:\s*true/i.test(compose) ||
    /(?:password|token|private.?key|api.?key|credential)\b/i.test(compose)
  ) {
    fail(
      "Compose projection contains a build directive, secret-shaped value, or unsupported availability claim.",
    );
  }
  if (!appHost.includes("AddParameter") || appHost.includes(".csproj")) {
    fail(
      "Aspire projection must be a file-based AppHost with external configuration.",
    );
  }

  const solutionRoot = resolve(rootDir, LOCAL_ORCHESTRATION_SOLUTION_ROOT);
  const actualFiles = await listFiles(solutionRoot);
  if (JSON.stringify(actualFiles) !== JSON.stringify(LOCAL_ORCHESTRATION_EXPECTED_FILES)) {
    const missing = LOCAL_ORCHESTRATION_EXPECTED_FILES.filter(
      (file) => !actualFiles.includes(file),
    );
    const extra = actualFiles.filter(
      (file) => !LOCAL_ORCHESTRATION_EXPECTED_FILES.includes(file),
    );
    fail(
      `Local orchestration Generated Solution inventory mismatch; missing: ${
        missing.join(", ") || "none"
      }; extra: ${extra.join(", ") || "none"}.`,
    );
  }

  for (const unselectedRoot of [
    GENERATED_SOLUTION_ROOT,
    MODULAR_MONOLITH_SOLUTION_ROOT,
    FULL_STACK_SOLUTION_ROOT,
  ]) {
    const files = await listFiles(resolve(rootDir, unselectedRoot));
    const residue = files.filter((file) =>
      LOCAL_ORCHESTRATION_RESIDUE_FILES.has(file.split("/").at(-1)),
    );
    if (residue.length > 0) {
      fail(
        `Unselected Generated Solution ${unselectedRoot} contains local orchestration residue: ${residue.join(", ")}.`,
      );
    }
  }

  return {
    status: "passed",
    solution: LOCAL_ORCHESTRATION_SOLUTION_NAME,
    manifestDigest: expected.manifestDigest,
    topologyDigest: expected.topologyDigest,
    profiles: [...LOCAL_ORCHESTRATION_PROFILES],
    direct: expected.direct,
    aspire: {
      file: orchestrationManifest.aspire.file,
      optional: orchestrationManifest.aspire.optional,
      projectionDigest: orchestrationManifest.aspire.projectionDigest,
    },
    compose: {
      file: orchestrationManifest.compose.file,
      mode: orchestrationManifest.compose.mode,
      build: orchestrationManifest.compose.build,
      highAvailability: orchestrationManifest.compose.highAvailability,
      projectionDigest: orchestrationManifest.compose.projectionDigest,
    },
  };
}

const OTLP_EXPORT_EFFECT_KINDS = [
  "packages",
  "configuration",
  "registrations",
  "workers",
  "healthChecks",
  "telemetry",
  "containers",
  "deployment",
];
const OTLP_EXPORT_SIGNAL_CONTRACTS = new Map([
  ["traces", "ActivitySource"],
  ["metrics", "Meter"],
  ["logs", "ILogger"],
]);

function requireBoolean(value, path) {
  if (typeof value !== "boolean") {
    fail(`Invalid bootstrap value at ${path}: expected a boolean.`);
  }
}

function requireNumber(value, path) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    fail(`Invalid bootstrap value at ${path}: expected a finite number.`);
  }
}

function requireExactArray(actual, expected, path) {
  requireArray(actual, path);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(
      `Invalid bootstrap value at ${path}: expected ${JSON.stringify(expected)}; received ${JSON.stringify(actual)}.`,
    );
  }
}

const OTLP_EXPORT_SELECTION_PROPERTIES = Object.freeze([
  "preset",
  "capabilities",
  "providers",
  "runtime",
  "operatingSystem",
  "configuration",
]);
const OTLP_EXPORT_EVIDENCE_PROPERTIES = Object.freeze([
  "schemaVersion",
  "outcome",
  "provider",
  "signals",
  "privacy",
  "reliability",
  "isolation",
  "absence",
]);
const OTLP_EXPORT_SIGNAL_PROPERTIES = Object.freeze([
  "id",
  "contract",
  "redaction",
]);

function validateOtlpSelectionValues(selection, fixturePath) {
  const selectionPath = `${fixturePath}.selection`;
  requireExactArray(
    selection.capabilities,
    ["observability-export"],
    `${selectionPath}.capabilities`,
  );
  requireExactArray(
    selection.providers,
    [{
      capability: "observability-export",
      id: "otlp",
    }],
    `${selectionPath}.providers`,
  );

  for (const [property, expected] of [
    ["preset", "api"],
    ["runtime", "net10.0"],
    ["operatingSystem", "linux"],
  ]) {
    requireString(selection[property], `${selectionPath}.${property}`);
    if (selection[property] !== expected) {
      fail(
        `Invalid OTLP export fixture selection at ${selectionPath}.${property}: expected ${expected}.`,
      );
    }
  }

  requireExactArray(
    selection.configuration,
    ["OTEL_EXPORTER_OTLP_ENDPOINT"],
    `${selectionPath}.configuration`,
  );
}

function validateOtlpObservedValues(observed, fixturePath) {
  for (const kind of OTLP_EXPORT_EFFECT_KINDS) {
    requireArray(observed[kind], `${fixturePath}.observed.${kind}`);
  }
}

function validateOtlpManifest(manifest, selectedProviders, manifestPath) {
  requireRecord(manifest, manifestPath);
  requireArray(manifest.capabilities, `${manifestPath}.capabilities`);
  requireArray(manifest.providers, `${manifestPath}.providers`);
  requireArray(manifest.supportClaims, `${manifestPath}.supportClaims`);
  if (manifest.supportClaims.length !== 0) {
    fail("OTLP export manifest must not make a Supported claim.");
  }

  const selectedCapability = manifest.capabilities.find(
    ({ id }) => id === "observability-export",
  );
  if (selectedCapability?.state !== "selected") {
    fail("OTLP export manifest must select observability-export.");
  }

  const manifestSelectedProviders = manifest.providers
    .filter(({ state }) => state === "selected")
    .map(({ capability, id }) => ({ capability, id }));
  requireExactArray(
    manifestSelectedProviders,
    selectedProviders,
    `${manifestPath}.providers`,
  );
}

function validateOtlpSignalEvidence(signals, fixturePath) {
  const signalsPath = `${fixturePath}.evidence.signals`;
  requireArray(signals, signalsPath);
  if (signals.length !== OTLP_EXPORT_SIGNAL_CONTRACTS.size) {
    fail("OTLP export evidence must cover traces, metrics, and logs.");
  }

  for (const [index, signal] of signals.entries()) {
    const signalPath = `${signalsPath}[${index}]`;
    requireRecord(signal, signalPath);
    rejectUnknownProperties(signal, OTLP_EXPORT_SIGNAL_PROPERTIES, signalPath);
    requireString(signal.id, `${signalPath}.id`);
    requireString(signal.contract, `${signalPath}.contract`);
    requireString(signal.redaction, `${signalPath}.redaction`);
    if (
      OTLP_EXPORT_SIGNAL_CONTRACTS.get(signal.id) !== signal.contract
      || signal.redaction.length === 0
    ) {
      fail(`OTLP export signal evidence is invalid at ${signalPath}.`);
    }
  }

  if (
    new Set(signals.map(({ id }) => id)).size
      !== OTLP_EXPORT_SIGNAL_CONTRACTS.size
    || [...OTLP_EXPORT_SIGNAL_CONTRACTS.keys()].some(
      (id) => !signals.some((signal) => signal.id === id),
    )
  ) {
    fail("OTLP export evidence must contain one entry for each signal.");
  }
}

function validateOtlpPrivacyEvidence(privacy, fixturePath) {
  const privacyPath = `${fixturePath}.evidence.privacy`;
  const stringProperties = [
    "classification",
    "fallbackRedactor",
    "processorOrder",
    "endpointPolicy",
  ];
  requireRecord(privacy, privacyPath);
  rejectUnknownProperties(
    privacy,
    [...stringProperties, "sensitiveKeyFragments"],
    privacyPath,
  );
  for (const property of stringProperties) {
    requireString(privacy[property], `${privacyPath}.${property}`);
  }
  requireArray(
    privacy.sensitiveKeyFragments,
    `${privacyPath}.sensitiveKeyFragments`,
  );
  if (
    privacy.classification !== "HostDataClassification.Secret"
    || privacy.fallbackRedactor !== "ErasingRedactor"
    || privacy.processorOrder !== "redaction-before-export"
    || privacy.endpointPolicy !== "absolute-http-https-without-user-info"
    || privacy.sensitiveKeyFragments.length < 5
  ) {
    fail("OTLP export privacy evidence is incomplete.");
  }
}

function validateOtlpReliabilityEvidence(reliability, fixturePath) {
  const reliabilityPath = `${fixturePath}.evidence.reliability`;
  const boundedProperties = [
    ["maxQueueSize", 2048],
    ["maxExportBatchSize", 512],
    ["scheduledDelayMilliseconds", 5000],
    ["exporterTimeoutMilliseconds", 30000],
  ];
  const textProperties = ["retry", "cancellation", "shutdown"];
  const booleanProperties = ["boundedQueue", "boundedFailure"];
  requireRecord(reliability, reliabilityPath);
  rejectUnknownProperties(
    reliability,
    [
      ...boundedProperties.map(([property]) => property),
      ...textProperties,
      ...booleanProperties,
    ],
    reliabilityPath,
  );

  for (const [property, expected] of boundedProperties) {
    requireNumber(reliability[property], `${reliabilityPath}.${property}`);
    if (reliability[property] !== expected) {
      fail(`OTLP export reliability bound is invalid: ${property}.`);
    }
  }
  for (const property of textProperties) {
    requireString(reliability[property], `${reliabilityPath}.${property}`);
  }
  for (const property of booleanProperties) {
    requireBoolean(reliability[property], `${reliabilityPath}.${property}`);
    if (!reliability[property]) {
      fail(`OTLP export reliability must declare ${property}.`);
    }
  }
}

function validateOtlpIsolationEvidence(isolation, fixturePath) {
  const isolationPath = `${fixturePath}.evidence.isolation`;
  const properties = [
    "collectorUnavailable",
    "collectorSlow",
    "collectorRejects",
    "authorization",
    "readiness",
    "healthChecks",
    "registration",
  ];
  requireRecord(isolation, isolationPath);
  rejectUnknownProperties(isolation, properties, isolationPath);
  for (const property of properties) {
    requireString(isolation[property], `${isolationPath}.${property}`);
  }
  if (
    isolation.collectorUnavailable !== "business-result-preserved"
    || isolation.collectorSlow !== "business-result-preserved"
    || isolation.collectorRejects !== "business-result-preserved"
    || isolation.authorization !== "unchanged"
    || isolation.readiness !== "unchanged"
    || isolation.healthChecks !== "unchanged"
    || isolation.registration !== "asynchronous-provider"
  ) {
    fail("OTLP export isolation evidence is incomplete.");
  }
}

function validateOtlpAbsenceEvidence(absence, fixturePath) {
  const absencePath = `${fixturePath}.evidence.absence`;
  requireRecord(absence, absencePath);
  rejectUnknownProperties(absence, OTLP_EXPORT_EFFECT_KINDS, absencePath);
  let absentResidueCount = 0;
  for (const kind of OTLP_EXPORT_EFFECT_KINDS) {
    requireArray(absence[kind], `${absencePath}.${kind}`);
    absentResidueCount += absence[kind].length;
  }
  if (absentResidueCount !== 0) {
    fail("OTLP export absence evidence must be empty and passed.");
  }
  return absentResidueCount;
}

function validateOtlpEvidence(evidence, fixturePath) {
  requireString(evidence.schemaVersion, `${fixturePath}.evidence.schemaVersion`);
  requireString(evidence.outcome, `${fixturePath}.evidence.outcome`);
  requireString(evidence.provider, `${fixturePath}.evidence.provider`);
  if (
    evidence.schemaVersion !== "1.0.0"
    || evidence.outcome !== "passed"
    || evidence.provider !== "observability-export:otlp"
  ) {
    fail("OTLP export fixture evidence identity is invalid.");
  }

  validateOtlpSignalEvidence(evidence.signals, fixturePath);
  validateOtlpPrivacyEvidence(evidence.privacy, fixturePath);
  validateOtlpReliabilityEvidence(evidence.reliability, fixturePath);
  validateOtlpIsolationEvidence(evidence.isolation, fixturePath);
  return validateOtlpAbsenceEvidence(evidence.absence, fixturePath);
}

async function verifyGeneratedOtlpComposition() {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "martix-otlp-export-"));
  const selectedRoot = join(temporaryRoot, "selected");
  const baselineRoot = join(temporaryRoot, "baseline");
  const applicationName = "Contoso.OtlpExport";
  const hostRelativePath =
    `src/${applicationName}.Api/Infrastructure/Host/HostSecurity.cs`;
  const projectRelativePath =
    `src/${applicationName}.Api/${applicationName}.Api.csproj`;

  try {
    const [selected] = await Promise.all([
      generateApiPreset({
        applicationName,
        providers: ["otlp"],
        outputDirectory: selectedRoot,
      }),
      generateApiPreset({
        applicationName,
        outputDirectory: baselineRoot,
      }),
    ]);
    if (
      JSON.stringify(selected.plan.providers) !==
      JSON.stringify([{
        id: "otlp",
        capability: "observability-export",
        state: "selected",
      }])
    ) {
      fail("OTLP Generated Solution selected provider composition drifted.");
    }

    const [selectedHost, selectedProject, baselineHost, baselineProject] =
      await Promise.all([
        readFile(join(selectedRoot, hostRelativePath), "utf8"),
        readFile(join(selectedRoot, projectRelativePath), "utf8"),
        readFile(join(baselineRoot, hostRelativePath), "utf8"),
        readFile(join(baselineRoot, projectRelativePath), "utf8"),
      ]);
    for (const marker of [
      "OpenTelemetry.Exporter.OpenTelemetryProtocol",
      "OTEL_EXPORTER_OTLP_ENDPOINT",
      "AddOtlpExporter",
      "WithLogging",
      "OtlpActivityRedactionProcessor",
      "OtlpLogRedactionProcessor",
      "SetFallbackRedactor",
      "MaxQueueSize = 2048",
      "MaxExportBatchSize = 512",
      "ScheduledDelayMilliseconds = 5000",
      "ExporterTimeoutMilliseconds = 30000",
      "HostOptions",
    ]) {
      if (!selectedHost.includes(marker) && !selectedProject.includes(marker)) {
        fail(`OTLP Generated Solution is missing selected composition: ${marker}.`);
      }
    }
    for (const source of [baselineHost, baselineProject]) {
      if (
        source.includes("OpenTelemetry.Exporter.OpenTelemetryProtocol")
        || source.includes("OTEL_EXPORTER_OTLP_ENDPOINT")
        || source.includes("AddOtlpExporter")
        || source.includes("WithLogging")
      ) {
        fail("OTLP Generated Solution baseline retains unselected residue.");
      }
    }
    const hasOtlpHealthCheck =
      selectedHost.includes("AddCheck(\"otlp")
      || /AddCheck<[^>]*otlp/i.test(selectedHost);
    if (hasOtlpHealthCheck) {
      fail("OTLP Generated Solution must not add an OTLP health check.");
    }
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

export async function validateOtlpExportFixture(fixture, manifest) {
  const fixturePath = `${OTLP_EXPORT_SOLUTION_ROOT}/otlp-export.json`;
  const manifestPath = `${OTLP_EXPORT_SOLUTION_ROOT}/martix.platform.json`;
  assertSecretFree(fixture, fixturePath, "OTLP export fixture");
  requireRecord(fixture, fixturePath);
  rejectUnknownProperties(
    fixture,
    ["selection", "observed", "evidence"],
    fixturePath,
  );
  requireRecord(fixture.selection, `${fixturePath}.selection`);
  requireRecord(fixture.observed, `${fixturePath}.observed`);
  requireRecord(fixture.evidence, `${fixturePath}.evidence`);
  const evidence = fixture.evidence;
  rejectUnknownProperties(
    fixture.selection,
    OTLP_EXPORT_SELECTION_PROPERTIES,
    `${fixturePath}.selection`,
  );
  rejectUnknownProperties(
    fixture.observed,
    OTLP_EXPORT_EFFECT_KINDS,
    `${fixturePath}.observed`,
  );
  rejectUnknownProperties(
    fixture.evidence,
    OTLP_EXPORT_EVIDENCE_PROPERTIES,
    `${fixturePath}.evidence`,
  );

  validateOtlpSelectionValues(fixture.selection, fixturePath);
  validateOtlpObservedValues(fixture.observed, fixturePath);
  const admission = await verifyProviderAdmission({
    selection: fixture.selection,
    observed: fixture.observed,
  });
  if (admission.status !== "passed") {
    fail("OTLP export provider admission did not pass.");
  }

  validateOtlpManifest(manifest, fixture.selection.providers, manifestPath);
  const absentResidueCount = validateOtlpEvidence(
    evidence,
    fixturePath,
  );
  if (admission.absence.outcome !== "passed") {
    fail("OTLP export absence evidence must be empty and passed.");
  }
  await verifyGeneratedOtlpComposition();

  return {
    status: "passed",
    signalCount: evidence.signals.length,
    absentResidueCount,
    evidenceDigest: admission.evidence.verification.evidenceDigest,
  };
}

function requireIncludes(values, expected, path) {
  requireArray(values, path);
  for (const value of expected) {
    if (!values.includes(value)) {
      fail(`Invalid bootstrap value at ${path}: missing ${value}.`);
    }
  }
}

function requireSourceIncludes(source, expected, path) {
  for (const fragment of expected) {
    if (!source.includes(fragment)) {
      fail(`MailKit SMTP source ${path} is missing ${fragment}.`);
    }
  }
}

export async function validateMailKitSmtpFixture(
  fixture,
  manifest,
  { rootDir = process.cwd() } = {},
) {
  assertSecretFree(fixture, MAILKIT_SMTP_FIXTURE_PATH, "MailKit SMTP fixture");
  requireRecord(fixture, MAILKIT_SMTP_FIXTURE_PATH);
  requireRecord(fixture.admission, `${MAILKIT_SMTP_FIXTURE_PATH}.admission`);
  requireRecord(fixture.behavior, `${MAILKIT_SMTP_FIXTURE_PATH}.behavior`);

  const admission = await validateProviderAdmissionFixture(
    fixture.admission,
    manifest,
    { solutionRoot: MAILKIT_SMTP_SOLUTION_ROOT },
  );
  const behaviorPath = `${MAILKIT_SMTP_FIXTURE_PATH}.behavior`;
  const behavior = fixture.behavior;
  const durableIntent = behavior.durableIntent;
  requireRecord(durableIntent, `${behaviorPath}.durableIntent`);
  for (const property of [
    "recordedBeforeExternalSend",
    "doesNotClaimTransactionalEmail",
    "idempotencyAndCorrelation",
    "boundedAttachmentReferences",
  ]) {
    requireBoolean(durableIntent[property], `${behaviorPath}.durableIntent.${property}`);
  }
  if (
    JSON.stringify(durableIntent.stateMachine) !==
    JSON.stringify(MAILKIT_SMTP_INTENT_STATES)
  ) {
    fail(
      `MailKit SMTP durable intent state machine is incomplete at ${behaviorPath}.durableIntent.stateMachine.`,
    );
  }

  const smtp = behavior.smtp;
  requireRecord(smtp, `${behaviorPath}.smtp`);
  requireBoolean(smtp.tlsRequired, `${behaviorPath}.smtp.tlsRequired`);
  requireBoolean(smtp.authentication, `${behaviorPath}.smtp.authentication`);
  requireBoolean(smtp.cancellation, `${behaviorPath}.smtp.cancellation`);
  requireIncludes(
    smtp.transportOperations,
    MAILKIT_SMTP_TRANSPORT_OPERATIONS,
    `${behaviorPath}.smtp.transportOperations`,
  );
  requireIncludes(
    smtp.outcomes,
    MAILKIT_SMTP_OUTCOMES,
    `${behaviorPath}.smtp.outcomes`,
  );

  const recovery = behavior.recovery;
  requireRecord(recovery, `${behaviorPath}.recovery`);
  requireNumber(
    recovery.automaticAttemptLimit,
    `${behaviorPath}.recovery.automaticAttemptLimit`,
  );
  if (
    recovery.automaticAttemptLimit <= 0 ||
    recovery.automaticAttemptLimit > 10
  ) {
    fail(
      `MailKit SMTP automatic retry limit must be bounded at ${behaviorPath}.recovery.automaticAttemptLimit.`,
    );
  }
  requireBoolean(recovery.boundedRetry, `${behaviorPath}.recovery.boundedRetry`);
  requireBoolean(
    recovery.operatorRequeue,
    `${behaviorPath}.recovery.operatorRequeue`,
  );

  const security = behavior.security;
  requireRecord(security, `${behaviorPath}.security`);
  requireBoolean(
    security.externalOnlyConfiguration,
    `${behaviorPath}.security.externalOnlyConfiguration`,
  );
  requireIncludes(
    security.redactedFields,
    MAILKIT_SMTP_REDACTED_FIELDS,
    `${behaviorPath}.security.redactedFields`,
  );

  const observability = behavior.observability;
  requireRecord(observability, `${behaviorPath}.observability`);
  requireIncludes(
    observability.signals,
    MAILKIT_SMTP_OBSERVABILITY_SIGNALS,
    `${behaviorPath}.observability.signals`,
  );
  requireIncludes(
    observability.dataDimensionsExcluded,
    MAILKIT_SMTP_REDACTED_FIELDS,
    `${behaviorPath}.observability.dataDimensionsExcluded`,
  );

  const mailpit = behavior.mailpit;
  requireRecord(mailpit, `${behaviorPath}.mailpit`);
  if (
    mailpit.version !== MAILKIT_SMTP_MAILPIT_VERSION ||
    mailpit.commit !== MAILKIT_SMTP_MAILPIT_COMMIT
  ) {
    fail(
      `MailKit SMTP fixture must pin Mailpit ${MAILKIT_SMTP_MAILPIT_VERSION} at ${behaviorPath}.mailpit.`,
    );
  }
  requireBoolean(
    mailpit.tlsAndAuthentication,
    `${behaviorPath}.mailpit.tlsAndAuthentication`,
  );
  requireIncludes(
    mailpit.controlledFailures,
    ["451", "550"],
    `${behaviorPath}.mailpit.controlledFailures`,
  );
  requireBoolean(mailpit.containerized, `${behaviorPath}.mailpit.containerized`);

  if (behavior.aotPosture !== "jit-only-no-native-aot-claim") {
    fail(
      `MailKit SMTP fixture must keep Native AOT undeclared at ${behaviorPath}.aotPosture.`,
    );
  }

  const sources = {};
  for (const [name, relativePath] of Object.entries(MAILKIT_SMTP_SOURCE_PATHS)) {
    sources[name] = await readRequiredFile(rootDir, relativePath);
  }

  if (sources.intent.includes("MimeMessage")) {
    fail(
      `MailKit SMTP intent must not expose MimeMessage: ${MAILKIT_SMTP_SOURCE_PATHS.intent}.`,
    );
  }
  requireSourceIncludes(
    sources.intent,
    [
      "NotificationDeliveryIntent",
      "IdempotencyKey",
      "CorrelationId",
      "AttachmentReferences",
      "Pending",
    ],
    MAILKIT_SMTP_SOURCE_PATHS.intent,
  );
  requireSourceIncludes(
    sources.options,
    [
      "RequireTls",
      "UseAuthentication",
      "AutomaticAttemptLimit",
      "Validate",
      "external-only",
    ],
    MAILKIT_SMTP_SOURCE_PATHS.options,
  );
  requireSourceIncludes(
    sources.adapter,
    [
      "MailKit.Net.Smtp",
      "MimeKit",
      "ConnectAsync",
      "AuthenticateAsync",
      "SendAsync",
      "DisconnectAsync",
      "SecureSocketOptions.StartTls",
      "OperationCanceledException",
      "SmtpCommandException",
      "SmtpProtocolException",
      "SmtpDeliveryOutcome.Accepted",
      "SmtpDeliveryOutcome.TransientFailure",
      "SmtpDeliveryOutcome.PermanentFailure",
      "SmtpDeliveryOutcome.Cancelled",
    ],
    MAILKIT_SMTP_SOURCE_PATHS.adapter,
  );
  requireSourceIncludes(
    sources.dispatcher,
    [
      "SaveChangesAsync",
      "AutomaticAttemptLimit",
      "RequeueAsync",
      "TransientFailure",
      "PermanentFailure",
      "Cancelled",
      "Meter",
      "Redact",
    ],
    MAILKIT_SMTP_SOURCE_PATHS.dispatcher,
  );
  requireSourceIncludes(
    sources.tests,
    [
      "Mailpit 1.30.0",
      "451",
      "550",
      "CancellationToken",
      "RequireTls",
      "Authentication",
      "Redact",
    ],
    MAILKIT_SMTP_SOURCE_PATHS.tests,
  );
  requireSourceIncludes(
    sources.integrationTests,
    [
      "Testcontainers",
      "axllent/mailpit:1.30.0",
      "PortBinding",
      "UntilPortIsAvailable",
      "Explicit",
    ],
    MAILKIT_SMTP_SOURCE_PATHS.integrationTests,
  );
  requireSourceIncludes(
    sources.evidence,
    [
      "Mailpit",
      "1.30.0",
      "af8756a",
      "STARTTLS",
      "authentication",
      "451",
      "550",
      "requeue",
      "redaction",
    ],
    MAILKIT_SMTP_SOURCE_PATHS.evidence,
  );

  return {
    ...admission,
    behavior: {
      outcomeCount: smtp.outcomes.length,
      mailpitVersion: mailpit.version,
    },
  };
}

const VALKEY_CONFORMANCE_SEMANTICS = Object.freeze([
  "cancellation",
  "expiry",
  "failure-isolation",
  "key-isolation",
  "multi-instance",
  "reconnect",
  "serialization",
]);

const VALKEY_CONFORMANCE_EXPECTED_FILES = Object.freeze([
  "AGENTS.md",
  "CONTEXT.md",
  "MartiX.ValkeyDistributedCacheTestApp.slnx",
  "README.md",
  "martix.platform.json",
  "src/MartiX.ValkeyDistributedCacheTestApp.Api/MartiX.ValkeyDistributedCacheTestApp.Api.csproj",
  "src/MartiX.ValkeyDistributedCacheTestApp.Api/Program.cs",
  "src/MartiX.ValkeyDistributedCacheTestApp.Api/ValkeyHealthCheck.cs",
  "tests/MartiX.ValkeyDistributedCacheTestApp.Tests/MartiX.ValkeyDistributedCacheTestApp.Tests.csproj",
  "tests/MartiX.ValkeyDistributedCacheTestApp.Tests/ValkeyDistributedCacheConformanceTests.cs",
  "valkey-conformance.json",
]);
const DISALLOWED_EXCEPTION_CATCH =
  /catch\s*\(\s*(?:OperationCanceledException\b|Exception(?:\s+\w+)?\s*\)(?!\s*when\b))/;

export async function validateValkeyDistributedCacheFixture({
  rootDir,
  manifest,
  profile,
}) {
  const solutionRoot = resolve(rootDir, VALKEY_DISTRIBUTED_CACHE_SOLUTION_ROOT);
  const actualFiles = await listFiles(solutionRoot, {
    ignoredDirectories: ["bin", "obj"],
  });
  const expectedFiles = [...VALKEY_CONFORMANCE_EXPECTED_FILES];
  if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) {
    const missing = expectedFiles.filter((file) => !actualFiles.includes(file));
    const extra = actualFiles.filter((file) => !expectedFiles.includes(file));
    fail(
      `Valkey Distributed Cache Generated Solution inventory mismatch; missing: ${
        missing.join(", ") || "none"
      }; extra: ${extra.join(", ") || "none"}.`,
    );
  }

  requireRecord(
    profile,
    `${VALKEY_DISTRIBUTED_CACHE_SOLUTION_ROOT}/valkey-conformance.json`,
  );
  assertSecretFree(
    profile,
    `${VALKEY_DISTRIBUTED_CACHE_SOLUTION_ROOT}/valkey-conformance.json`,
    "Valkey conformance profile",
  );
  requireString(
    profile.schemaVersion,
    `${VALKEY_DISTRIBUTED_CACHE_SOLUTION_ROOT}/valkey-conformance.json.schemaVersion`,
  );
  if (profile.schemaVersion !== "1.0.0") {
    fail("Valkey conformance profile schemaVersion must be 1.0.0.");
  }
  requireRecord(
    profile.selection,
    `${VALKEY_DISTRIBUTED_CACHE_SOLUTION_ROOT}/valkey-conformance.json.selection`,
  );
  requireRecord(
    profile.observed,
    `${VALKEY_DISTRIBUTED_CACHE_SOLUTION_ROOT}/valkey-conformance.json.observed`,
  );
  requireRecord(
    profile.profile,
    `${VALKEY_DISTRIBUTED_CACHE_SOLUTION_ROOT}/valkey-conformance.json.profile`,
  );
  requireRecord(
    profile.failurePolicy,
    `${VALKEY_DISTRIBUTED_CACHE_SOLUTION_ROOT}/valkey-conformance.json.failurePolicy`,
  );
  requireArray(
    profile.semantics,
    `${VALKEY_DISTRIBUTED_CACHE_SOLUTION_ROOT}/valkey-conformance.json.semantics`,
  );
  if (
    JSON.stringify([...profile.semantics].sort()) !==
    JSON.stringify([...VALKEY_CONFORMANCE_SEMANTICS])
  ) {
    fail(
      "Valkey conformance profile must cover cancellation, expiry, failure isolation, key isolation, multi-instance behavior, reconnect, and serialization.",
    );
  }
  if (
    profile.profile.serverImage !== "valkey/valkey:9.1.0" ||
    profile.profile.connectionEnvironment !==
      "ConnectionStrings__DistributedCache" ||
    profile.profile.instanceName !== "martix:valkey:" ||
    profile.profile.abortOnConnectFail !== false ||
    profile.profile.connectRetry !== 3 ||
    profile.profile.connectTimeoutMilliseconds !== 1000 ||
    profile.profile.asyncTimeoutMilliseconds !== 1000
  ) {
    fail(
      "Valkey conformance profile must pin the declared server and reconnect/timeouts.",
    );
  }
  if (
    JSON.stringify(profile.failurePolicy) !==
    JSON.stringify({
      businessResults: "cache-failure-falls-back",
      authorization: "cache-never-authoritative",
      readiness: "optional-cache-failure-does-not-fail-global-readiness",
    })
  ) {
    fail(
      "Valkey conformance profile must keep cache failure outside business, authorization, and global readiness semantics.",
    );
  }

  let admission;
  try {
    admission = await verifyProviderAdmission({
      selection: profile.selection,
      observed: profile.observed,
    });
  } catch (error) {
    if (error instanceof ProviderAdmissionError) {
      fail(`Valkey provider admission failed: ${error.message}`);
    }
    throw error;
  }
  if (
    admission.plan.providers.length !== 1 ||
    admission.plan.providers[0].capability !== "distributed-cache" ||
    admission.plan.providers[0].id !== "valkey"
  ) {
    fail("Valkey conformance must select exactly distributed-cache:valkey.");
  }
  if (admission.plan.matrix.deploymentProfile !== "container") {
    fail("Valkey conformance must use the controlled container deployment profile.");
  }
  if (
    manifest.preset !== "api" ||
    manifest.supportClaims.length !== 0 ||
    manifest.capabilities.filter(
      (capability) =>
        capability?.id === "distributed-cache" &&
        capability?.state === "selected",
    ).length !== 1
  ) {
    fail(
      "Valkey Distributed Cache manifest must select the claim-free distributed-cache capability in the api preset.",
    );
  }
  const manifestProviders = manifest.providers
    .filter((provider) => provider?.state === "selected")
    .map(({ capability, id }) => ({ capability, id }));
  if (
    JSON.stringify(manifestProviders) !==
    JSON.stringify([{ capability: "distributed-cache", id: "valkey" }])
  ) {
    fail(
      "Valkey Distributed Cache manifest must select only distributed-cache:valkey.",
    );
  }

  const readSolutionFile = (relativePath) =>
    readFile(resolve(solutionRoot, relativePath), "utf8");
  const apiProjectPath =
    "src/MartiX.ValkeyDistributedCacheTestApp.Api/MartiX.ValkeyDistributedCacheTestApp.Api.csproj";
  const apiSourcePath =
    "src/MartiX.ValkeyDistributedCacheTestApp.Api/Program.cs";
  const healthSourcePath =
    "src/MartiX.ValkeyDistributedCacheTestApp.Api/ValkeyHealthCheck.cs";
  const testProjectPath =
    "tests/MartiX.ValkeyDistributedCacheTestApp.Tests/MartiX.ValkeyDistributedCacheTestApp.Tests.csproj";
  const testSourcePath =
    "tests/MartiX.ValkeyDistributedCacheTestApp.Tests/ValkeyDistributedCacheConformanceTests.cs";
  const [apiProject, apiSource, healthSource, testProject, testSource] =
    await Promise.all([
      readSolutionFile(apiProjectPath),
      readSolutionFile(apiSourcePath),
      readSolutionFile(healthSourcePath),
      readSolutionFile(testProjectPath),
      readSolutionFile(testSourcePath),
    ]);

  if (
    !/<OutputType>\s*Exe\s*<\/OutputType>/.test(apiProject) ||
    !/<TargetFramework>\s*net10\.0\s*<\/TargetFramework>/.test(apiProject) ||
    !apiProject.includes(
      '<PackageReference Include="Microsoft.Extensions.Caching.StackExchangeRedis" Version="10.0.10"',
    ) ||
    /AddDistributedMemoryCache|Microsoft\.NET\.Test\.Sdk|coverlet|ICacheService|MartiX\.Cache/i.test(
      apiProject,
    )
  ) {
    fail(
      `Valkey API project must directly reference the pinned StackExchange Redis provider without an in-memory or MartiX cache facade: ${apiProjectPath}.`,
    );
  }
  if (
    !/<OutputType>\s*Exe\s*<\/OutputType>/.test(testProject) ||
    !testProject.includes(
      '<PackageReference Include="Testcontainers.Redis" Version="4.13.0"',
    ) ||
    !testProject.includes('<PackageReference Include="TUnit" Version="1.63.0"') ||
    /Microsoft\.NET\.Test\.Sdk|coverlet/i.test(testProject)
  ) {
    fail(
      `Valkey conformance tests must use the executable TUnit runner and pinned Valkey container package: ${testProjectPath}.`,
    );
  }
  const requiredApiFragments = [
    "AddStackExchangeRedisCache",
    "IDistributedCache",
    "ConfigurationOptions",
    "AbortOnConnectFail = false",
    "ConnectRetry = 3",
    "AsyncTimeout = 1000",
    "InstanceName = CacheInstanceName",
    "JsonSerializer",
    "DistributedCacheEntryOptions",
    "AbsoluteExpirationRelativeToNow",
    "CancellationToken",
    "UseAuthentication()",
    "UseAuthorization()",
    "RequireAuthorization(CacheReaderPolicy)",
    "AddCheck<ValkeyHealthCheck>",
    '"distributed-cache"',
    "TimeSpan.FromSeconds(2)",
    'Predicate = check => check.Tags.Contains("ready")',
    'Predicate = check => check.Tags.Contains("cache")',
  ];
  if (
    requiredApiFragments.some((fragment) => !apiSource.includes(fragment)) ||
    /Predicate\s*=\s*check\s*=>\s*check\.Tags\.Contains\("ready"\)[^\n]*check\.Tags\.Contains\("cache"\)/.test(
      apiSource,
    ) ||
    /AddDistributedMemoryCache|Microsoft\.NET\.Test\.Sdk|coverlet|ICacheService|CacheService\b|MartiX\.Cache(?:Service|Facade)/i.test(
      apiSource,
    ) ||
    DISALLOWED_EXCEPTION_CATCH.test(apiSource)
  ) {
    fail(
      `Valkey API composition must use direct framework cache interfaces, explicit semantics, cancellation, and narrow failure handling: ${apiSourcePath}.`,
    );
  }
  if (
    !healthSource.includes("IDistributedCache") ||
    !healthSource.includes("GetAsync") ||
    !healthSource.includes("HealthCheckResult.Unhealthy") ||
    healthSource.includes("SetAsync") ||
    DISALLOWED_EXCEPTION_CATCH.test(healthSource)
  ) {
    fail(
      `Valkey health must be a read-only, bounded cache signal with explicit provider failures: ${healthSourcePath}.`,
    );
  }
  const requiredTestFragments = [
    'valkey/valkey:9.1.0',
    "IDistributedCache",
    "NotInParallel",
    "GetConnectionString",
    "StopAsync",
    "StartAsync",
    "OperationCanceledException",
    "/api/v1/status/",
    "/api/v1/protected-status/",
    "/cache/ready",
    "conformance:key-isolation:a",
    "conformance:key-isolation:b",
    "conformance:cancellation",
    "cancellation.Token",
  ];
  if (
    requiredTestFragments.some((fragment) => !testSource.includes(fragment)) ||
    /Microsoft\.NET\.Test\.Sdk|coverlet/i.test(testSource) ||
    DISALLOWED_EXCEPTION_CATCH.test(testSource)
  ) {
    fail(
      `Valkey TUnit conformance tests must cover the pinned service, cancellation, outage, reconnect, and multi-instance behavior: ${testSourcePath}.`,
    );
  }

  return {
    status: "passed",
    provider: "distributed-cache:valkey",
    semantics: [...VALKEY_CONFORMANCE_SEMANTICS],
    matrixCoordinate: admission.evidence.matrix.coordinate,
    evidenceDigest: admission.evidence.verification.evidenceDigest,
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
  const isReleaseCandidate = cadence === RELEASE_CANDIDATE_CADENCE;
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
  const betaIntegrationSchema = parseJson(
    "schemas/beta-integration.schema.json",
  );
  const releaseCandidateSchema = parseJson(
    "schemas/release-candidate.schema.json",
  );
  const stablePromotionSchema = parseJson(
    "schemas/stable-promotion.schema.json",
  );
  const canonicalCutoverSchema = parseJson(
    "schemas/canonical-cutover.schema.json",
  );
  const betaIntegrationManifest = parseJson(
    `${BETA_INTEGRATION_SOLUTION_ROOT}/martix.platform.json`,
  );
  const betaIntegrationFixture = parseJson(
    `${BETA_INTEGRATION_SOLUTION_ROOT}/beta-integration.json`,
  );
  const releaseCandidateManifest = parseJson(
    `${RELEASE_CANDIDATE_SOLUTION_ROOT}/martix.platform.json`,
  );
  const releaseCandidateFixture = parseJson(
    `${RELEASE_CANDIDATE_SOLUTION_ROOT}/release-candidate.json`,
  );
  const stablePromotionManifest = parseJson(
    `${STABLE_PROMOTION_SOLUTION_ROOT}/martix.platform.json`,
  );
  const stablePromotionFixture = parseJson(
    `${STABLE_PROMOTION_SOLUTION_ROOT}/stable-promotion.json`,
  );
  const canonicalCutoverManifest = parseJson(
    `${CANONICAL_CUTOVER_SOLUTION_ROOT}/martix.platform.json`,
  );
  const canonicalCutoverFixture = parseJson(
    `${CANONICAL_CUTOVER_SOLUTION_ROOT}/canonical-cutover.json`,
  );
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
  const deploymentSchema = parseJson("schemas/deployment-manifest.schema.json");
  const deploymentManifest = parseJson(
    `${DEPLOYMENT_MANIFEST_SOLUTION_ROOT}/deployment-manifest.json`,
  );
  const deploymentEvidence = parseJson(
    `${DEPLOYMENT_MANIFEST_SOLUTION_ROOT}/deployment-evidence.json`,
  );
  const portableHostConformanceManifest = parseJson(
    `${PORTABLE_HOST_CONFORMANCE_SOLUTION_ROOT}/martix.platform.json`,
  );
  const portableHostConformance = parseJson(
    `${PORTABLE_HOST_CONFORMANCE_SOLUTION_ROOT}/portable-host-conformance.json`,
  );
  const portableHostConformanceSchema = parseJson(
    "schemas/portable-host-conformance.schema.json",
  );
  const localOrchestrationManifest = parseJson(
    `${LOCAL_ORCHESTRATION_SOLUTION_ROOT}/martix.platform.json`,
  );
  const localOrchestrationProjection = parseJson(
    `${LOCAL_ORCHESTRATION_SOLUTION_ROOT}/orchestration-manifest.json`,
  );
  const localOrchestrationSchema = parseJson(
    "schemas/local-orchestration.schema.json",
  );
  const localOrchestrationAppHost = documents.get(
    `${LOCAL_ORCHESTRATION_SOLUTION_ROOT}/apphost.cs`,
  );
  const localOrchestrationCompose = documents.get(
    `${LOCAL_ORCHESTRATION_SOLUTION_ROOT}/compose.yaml`,
  );
  const localOrchestrationReadme = documents.get(
    `${LOCAL_ORCHESTRATION_SOLUTION_ROOT}/README.md`,
  );
  const otlpExportManifest = parseJson(
    `${OTLP_EXPORT_SOLUTION_ROOT}/martix.platform.json`,
  );
  const otlpExportFixture = parseJson(
    `${OTLP_EXPORT_SOLUTION_ROOT}/otlp-export.json`,
  );
  const featureManagementManifest = parseJson(
    `${FEATURE_MANAGEMENT_SOLUTION_ROOT}/martix.platform.json`,
  );
  const mailkitSmtpManifest = parseJson(
    `${MAILKIT_SMTP_SOLUTION_ROOT}/martix.platform.json`,
  );
  const mailkitSmtpFixture = parseJson(
    `${MAILKIT_SMTP_SOLUTION_ROOT}/mailkit-smtp.json`,
  );
 const valkeyDistributedCacheManifest = parseJson(
   `${VALKEY_DISTRIBUTED_CACHE_SOLUTION_ROOT}/martix.platform.json`,
 );
 const valkeyDistributedCacheProfile = parseJson(
   `${VALKEY_DISTRIBUTED_CACHE_SOLUTION_ROOT}/valkey-conformance.json`,
 );
 const quartzDurableJobsManifest = parseJson(
   `${QUARTZ_DURABLE_JOBS_SOLUTION_ROOT}/martix.platform.json`,
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
  validateManifest(
    otlpExportManifest,
    "generated-solution",
    `${OTLP_EXPORT_SOLUTION_ROOT}/martix.platform.json`,
  );
  validateAgainstSchema(
    otlpExportManifest,
    manifestSchema,
    `${OTLP_EXPORT_SOLUTION_ROOT}/martix.platform.json`,
  );
  validateManifest(
    featureManagementManifest,
    "generated-solution",
    `${FEATURE_MANAGEMENT_SOLUTION_ROOT}/martix.platform.json`,
  );
  validateAgainstSchema(
    featureManagementManifest,
    manifestSchema,
    `${FEATURE_MANAGEMENT_SOLUTION_ROOT}/martix.platform.json`,
  );
  validateManifest(
    mailkitSmtpManifest,
    "generated-solution",
    `${MAILKIT_SMTP_SOLUTION_ROOT}/martix.platform.json`,
  );
  validateAgainstSchema(
    mailkitSmtpManifest,
    manifestSchema,
    `${MAILKIT_SMTP_SOLUTION_ROOT}/martix.platform.json`,
  );
  validateManifest(
    valkeyDistributedCacheManifest,
    "generated-solution",
    `${VALKEY_DISTRIBUTED_CACHE_SOLUTION_ROOT}/martix.platform.json`,
  );
  validateAgainstSchema(
    valkeyDistributedCacheManifest,
    manifestSchema,
    `${VALKEY_DISTRIBUTED_CACHE_SOLUTION_ROOT}/martix.platform.json`,
  );
  validateManifest(
    quartzDurableJobsManifest,
    "generated-solution",
    `${QUARTZ_DURABLE_JOBS_SOLUTION_ROOT}/martix.platform.json`,
  );
  validateAgainstSchema(
    quartzDurableJobsManifest,
    manifestSchema,
    `${QUARTZ_DURABLE_JOBS_SOLUTION_ROOT}/martix.platform.json`,
  );
  validateManifest(
    portableHostConformanceManifest,
    "generated-solution",
    `${PORTABLE_HOST_CONFORMANCE_SOLUTION_ROOT}/martix.platform.json`,
  );
  validateAgainstSchema(
    portableHostConformanceManifest,
    manifestSchema,
    `${PORTABLE_HOST_CONFORMANCE_SOLUTION_ROOT}/martix.platform.json`,
  );
  validateManifest(
    localOrchestrationManifest,
    "generated-solution",
    `${LOCAL_ORCHESTRATION_SOLUTION_ROOT}/martix.platform.json`,
  );
  validateManifest(
    betaIntegrationManifest,
    "generated-solution",
    `${BETA_INTEGRATION_SOLUTION_ROOT}/martix.platform.json`,
  );
  validateAgainstSchema(
    betaIntegrationManifest,
    manifestSchema,
    `${BETA_INTEGRATION_SOLUTION_ROOT}/martix.platform.json`,
  );
  validateAgainstSchema(
    localOrchestrationManifest,
    manifestSchema,
    `${LOCAL_ORCHESTRATION_SOLUTION_ROOT}/martix.platform.json`,
  );
  validateAgainstSchema(
    qualityPolicy,
    qualityGateSchema,
    "eng/quality-gates.json",
  );
  validateManifest(
    releaseCandidateManifest,
    "generated-solution",
    `${RELEASE_CANDIDATE_SOLUTION_ROOT}/martix.platform.json`,
  );
  validateAgainstSchema(
    releaseCandidateManifest,
    manifestSchema,
    `${RELEASE_CANDIDATE_SOLUTION_ROOT}/martix.platform.json`,
  );
  validateManifest(
    stablePromotionManifest,
    "generated-solution",
    `${STABLE_PROMOTION_SOLUTION_ROOT}/martix.platform.json`,
  );
  validateAgainstSchema(
    stablePromotionManifest,
    manifestSchema,
    `${STABLE_PROMOTION_SOLUTION_ROOT}/martix.platform.json`,
  );
  validateAgainstSchema(
    stablePromotionFixture,
    stablePromotionSchema,
    `${STABLE_PROMOTION_SOLUTION_ROOT}/stable-promotion.json`,
  );
  validateManifest(
    canonicalCutoverManifest,
    "generated-solution",
    `${CANONICAL_CUTOVER_SOLUTION_ROOT}/martix.platform.json`,
  );
  validateAgainstSchema(
    canonicalCutoverManifest,
    manifestSchema,
    `${CANONICAL_CUTOVER_SOLUTION_ROOT}/martix.platform.json`,
  );
  validateAgainstSchema(
    canonicalCutoverFixture,
    canonicalCutoverSchema,
    `${CANONICAL_CUTOVER_SOLUTION_ROOT}/canonical-cutover.json`,
  );
  validateQualityGatePolicy(qualityPolicy);
  validateGovernanceDocuments(documents);
  await validateModularMonolithSolution(root, modularMonolithManifest);
  await validateFullStackSolution(root, fullStackManifest);
  await validateModularMonolithSolution(
    root,
    quartzDurableJobsManifest,
    QUARTZ_DURABLE_JOBS_SOLUTION_ROOT,
  );
  const providerAdmission = await validateProviderAdmissionFixture(
    providerAdmissionFixture,
    providerAdmissionManifest,
  );
  const deploymentManifestResult = validateDeploymentManifestFixture(
    deploymentManifest,
    deploymentEvidence,
    deploymentSchema,
  );
  const portableHostConformanceResult =
    await validatePortableHostConformanceFixture({
      rootDir: root,
      solutionManifest: portableHostConformanceManifest,
      conformance: portableHostConformance,
      conformanceSchema: portableHostConformanceSchema,
      deploymentManifest,
    });
  const localOrchestrationResult = await validateLocalOrchestrationFixture({
    rootDir: root,
    solutionManifest: localOrchestrationManifest,
    orchestrationManifest: localOrchestrationProjection,
    orchestrationSchema: localOrchestrationSchema,
    deploymentManifest,
    appHost: localOrchestrationAppHost,
    compose: localOrchestrationCompose,
    readme: localOrchestrationReadme,
  });
  const otlpExport = await validateOtlpExportFixture(
    otlpExportFixture,
    otlpExportManifest,
  );
  const featureManagement = await validateFeatureManagementFixture({
    rootDir: root,
    manifest: featureManagementManifest,
  });
  const mailkitSmtp = await validateMailKitSmtpFixture(
    mailkitSmtpFixture,
    mailkitSmtpManifest,
    { rootDir: root },
  );
  const valkeyDistributedCache = await validateValkeyDistributedCacheFixture({
    rootDir: root,
    manifest: valkeyDistributedCacheManifest,
    profile: valkeyDistributedCacheProfile,
  });
  const agentReadiness = await verifyAgentReadiness({
    rootDir: root,
    platformRoot: root,
  });
  const betaIntegration =
    isReleaseCandidate
      ? await verifyBetaIntegrationFixture({
          rootDir: root,
          fixture: betaIntegrationFixture,
          manifest: betaIntegrationManifest,
          schema: betaIntegrationSchema,
        })
      : null;
  const releaseCandidate =
    isReleaseCandidate
      ? await verifyReleaseCandidateFixture({
          rootDir: root,
          fixture: releaseCandidateFixture,
          manifest: releaseCandidateManifest,
          schema: releaseCandidateSchema,
        })
      : null;
  const stablePromotion =
    isReleaseCandidate
      ? await verifyStablePromotionFixture({
          rootDir: root,
          fixture: stablePromotionFixture,
          manifest: stablePromotionManifest,
          schema: stablePromotionSchema,
          releaseCandidate: releaseCandidateFixture,
          releaseCandidateSchema,
        })
      : null;
  const canonicalCutover =
    isReleaseCandidate
      ? await verifyCanonicalCutoverFixture({
          rootDir: root,
          fixture: canonicalCutoverFixture,
          manifest: canonicalCutoverManifest,
          schema: canonicalCutoverSchema,
          stablePromotion: stablePromotionFixture,
          stablePromotionSchema,
          stablePromotionManifest,
        })
      : null;

  const gates = qualityPolicy.gates
    .filter(
      (gate) =>
        (BOOTSTRAP_GATE_IDS.includes(gate.id) ||
          (isReleaseCandidate &&
            (MODULAR_MONOLITH_ALPHA_GATE_IDS.includes(gate.id) ||
              BETA_INTEGRATION_GATE_IDS.includes(gate.id) ||
              gate.id === RELEASE_CANDIDATE_GATE_ID ||
              gate.id === STABLE_PROMOTION_GATE_ID ||
              gate.id === CANONICAL_CUTOVER_GATE_ID))) &&
        gate.cadences.includes(cadence),
    )
    .map((gate) => gate.id);
  if (isReleaseCandidate) {
    gates.sort(
      (left, right) =>
        CANONICAL_CUTOVER_REQUIRED_GATES.indexOf(left) -
        CANONICAL_CUTOVER_REQUIRED_GATES.indexOf(right),
    );
  }

  if (!gates.includes("bootstrap.manifest")) {
    fail(`Quality policy does not run bootstrap.manifest for cadence ${cadence}.`);
  }
  if (
    isReleaseCandidate &&
    JSON.stringify(gates) !== JSON.stringify(CANONICAL_CUTOVER_REQUIRED_GATES)
  ) {
    fail(
      "Release Candidate cadence must execute the complete Release Candidate, Stable promotion, and canonical cutover gate list.",
    );
  }

  return {
    status: "passed",
    cadence,
    gates,
    generatedSolution: GENERATED_SOLUTION_NAME,
    modularMonolithSolution: MODULAR_MONOLITH_SOLUTION_NAME,
    fullStackSolution: FULL_STACK_SOLUTION_NAME,
    providerAdmissionSolution: PROVIDER_ADMISSION_SOLUTION_NAME,
    featureManagementSolution: FEATURE_MANAGEMENT_SOLUTION_NAME,
    quartzDurableJobsSolution: QUARTZ_DURABLE_JOBS_SOLUTION_NAME,
    providerAdmission,
    deploymentManifestSolution: DEPLOYMENT_MANIFEST_SOLUTION_NAME,
    deploymentManifest: deploymentManifestResult,
    portableHostConformanceSolution: PORTABLE_HOST_CONFORMANCE_SOLUTION_NAME,
    portableHostConformance: portableHostConformanceResult,
    localOrchestrationSolution: LOCAL_ORCHESTRATION_SOLUTION_NAME,
    localOrchestration: localOrchestrationResult,
    otlpExportSolution: OTLP_EXPORT_SOLUTION_NAME,
    otlpExport,
    featureManagement,
    mailkitSmtpSolution: MAILKIT_SMTP_SOLUTION_NAME,
    mailkitSmtp,
    valkeyDistributedCacheSolution: VALKEY_DISTRIBUTED_CACHE_SOLUTION_NAME,
    valkeyDistributedCache,
    agentReadiness,
    betaIntegrationSolution:
      isReleaseCandidate
        ? BETA_INTEGRATION_SOLUTION_NAME
        : null,
    betaIntegration,
    releaseCandidateSolution:
      isReleaseCandidate
        ? RELEASE_CANDIDATE_SOLUTION_NAME
        : null,
    releaseCandidate,
    stablePromotionSolution:
      isReleaseCandidate ? STABLE_PROMOTION_SOLUTION_NAME : null,
    stablePromotion,
    canonicalCutoverSolution:
      isReleaseCandidate ? CANONICAL_CUTOVER_SOLUTION_NAME : null,
    canonicalCutover,
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
    if (
      error instanceof BootstrapVerificationError ||
      error instanceof BetaIntegrationError ||
      error instanceof ReleaseCandidateError ||
      error instanceof StablePromotionError ||
      error instanceof CanonicalCutoverError
    ) {
      console.error(`Verification failed: ${error.message}`);
    } else {
      console.error("Verification failed due to an unexpected internal error.");
    }
    process.exitCode = 1;
  });
}
