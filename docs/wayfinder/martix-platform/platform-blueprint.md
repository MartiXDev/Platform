# MartiX Platform implementation blueprint

Status: approved planning handoff, synthesized 2026-07-20. This document states
the current target. Linked Wayfinder decisions remain authoritative for WHY,
alternatives, evidence, migration details, and extension triggers.

## Product and destination

MartiX Platform is the .NET 10+ foundation for MartiX greenfield production
applications: reusable Platform Libraries, one composable Template System,
quality and release governance, deterministic Platform Migrations, Canonical
Knowledge, and agent guidance.

The target optimizes for small teams and fast delivery while remaining
enterprise-ready through explicit seams, fail-closed security, portable
deployment contracts, and evidence-backed provider admission. Enterprise
infrastructure remains absent until selected. Generated Solutions own their
source after generation; templates are never reapplied over application code.

Use `MartiX` as the company/product identity and `MartiXDev` only as the GitHub
organization handle. Canonical source will live in the public greenfield
`MartiXDev/Platform` repository. `MartiX.WebApi` remains an unmaintained legacy
POC with no compatibility contract.

Primary decisions:
[platform destination](tickets/001-platform-destination.md),
[source comparison](tickets/101-compare-platform-sources.md), and
[repository/distribution topology](tickets/122-repository-distribution-topology.md).

## Governing design rules

- Prefer composition over inheritance. Admit an `IHas<Capability>` Interface
  only after that orthogonal Entity Capability and its semantics are accepted.
- Design deep Modules with small stable Interfaces. Avoid pass-through wrappers,
  interface-per-class, speculative provider seams, and catch-all abstractions.
- Keep types internal and sealed by default. Public surface requires a real
  consumer, stable semantics, and compatibility evidence.
- Use explicit compile-time composition and dependency injection. Avoid assembly
  scanning, reflection discovery, service location, hidden startup hooks, and
  broad `AddDefaults` methods.
- Keep the Template System deterministic: show the resolved plan, reject invalid
  combinations before writing, emit no unselected residue, and record the result
  in `martix.platform.json`.
- Prefer first-party .NET 10/C# 14 capabilities. Add a third-party dependency
  only where it provides measured depth or a real provider Adapter.
- Apply SOLID, DRY, KISS, TDD, security, performance, accessibility, and
  operability as executable contracts rather than slogans.

Primary decisions:
[package topology](tickets/105-platform-library-topology.md),
[composition audit](tickets/121-composition-over-inheritance-audit.md), and
[quality attributes](tickets/103-define-quality-attributes.md).

## Platform repository and artifact topology

```text
MartiXDev/Platform
├── src/                              package-aligned projects
├── tests/                            package, template and compatibility evidence
├── benchmarks/                       decision-relevant measurements
├── skills/martix-platform/           sole editable Platform Skill source
├── schemas/                          versioned machine contracts
├── docs/                             architecture, ADRs, guides, changes, history
├── eng/                              build, migration, verification and release
├── AGENTS.md
├── CONTEXT.md
└── martix.platform.json
```

Runtime/build package roles are:

| Artifact | Role | Presence |
| --- | --- | --- |
| `MartiX.Platform` | BCL-only Kernel: Application Result/Error and baseline Security Audit Event semantics | Baseline |
| `MartiX.Platform.AspNetCore` | Narrow ASP.NET Core adaptation, Problem Details and safe exception translation | Baseline |
| `MartiX.Platform.Analyzers` | Compile-time architecture and contract enforcement | Baseline build asset |
| `MartiX.Platform.EntityFrameworkCore` | Deep EF Core Specifications, Entity Capabilities, naming, and reliable-event persistence behavior | With relational persistence |
| `MartiX.Platform.AspNetCore.FastEndpoints` | Real alternative endpoint-framework Adapter | Optional |
| `MartiX.Platform.IntegrationEvents.RabbitMq` | RabbitMQ transport over the accepted Outbox/Inbox protocol | Optional; publish only if implementation proves depth |
| `MartiX.Platform.Templates` | The composable `martix-app` template distribution | Tooling distribution |
| `MartiX.Platform.Tool` | Exact-version inspection, generation, migration and agent-context operations | Tooling distribution |

All runtime artifacts initially target `net10.0`; analyzers use the compatible
Roslyn build target. The Kernel has no DI, hosting, logging, JSON, EF Core,
ASP.NET Core, or third-party dependency. Platform projects use
`src/<PackageId>/<PackageId>.csproj`; do not add `Core`, `Common`, `Shared`,
`Modules`, or `Adapters` directory layers around already explicit identities.

Admit another package only when behavior is deep and repeated, a second real
Adapter proves a seam, or a distinct distribution/toolchain boundary exists.
UI, ordinary provider configuration, FluentValidation, Mapperly, mediator,
cache, telemetry, Aspire, and deployment technology do not receive shallow
wrapper packages.

## Template System and Capability model

One Template System exposes `martix-app` and three Presets:

| Preset | Required shape | Intended use |
| --- | --- | --- |
| `api` | One lean ASP.NET Core host; no persistence by default | Focused HTTP workloads and primary Native AOT profile |
| `modular-monolith` | API, Migrator, Business Modules, relational persistence, durable Outbox/Inbox with in-process transport | Default production starting point |
| `full-stack` | Modular Monolith plus exactly one selected Application UI provider | Web products requiring Blazor, React, or Vue |

The Platform Baseline supplies Result/Error semantics, direct Application
Operations, cancellation and time seams, Actor/authorization seams, Minimal API
foundation, OpenAPI, safe failure handling, startup validation, host security,
vendor-neutral telemetry, health/readiness, TUnit, analyzers, documentation,
CI, Capability Manifest, and the Security Audit Event contract.

The baseline does not silently select EF Core, a database, authentication, UI,
cache, broker, jobs, Aspire, containers, exporters, FastEndpoints,
FluentValidation, Mapperly, Serilog, mediator, or cloud services.

Capabilities and providers are classified Required, Required with default or
explicit provider, Optional Supported, Experimental, Deferred, or Invalid.
Every selection declares prerequisites, conflicts, configuration, package and
deployment effects, compatibility axes, and quality evidence. Invalid or
unsupported combinations fail before generation. Absence is tested as strongly
as presence.

Primary decision: [Capability and Preset matrix](tickets/104-capability-preset-matrix.md).

## Generated Solution topology

For complete template input `name=MartiX.Planner`, a three-module default Modular
Monolith is:

```text
MartiX.Planner.slnx
README.md
AGENTS.md
CONTEXT.md
martix.platform.json
global.json
Directory.Build.props
Directory.Packages.props
.editorconfig
docs/
  architecture/
    README.md
    decisions/
src/
  MartiX.Planner.Api/
  MartiX.Planner.Migrator/
  MartiX.Planner.Orders/
  MartiX.Planner.Billing/
  MartiX.Planner.Notifications/
tests/
  MartiX.Planner.Tests/
```

This example has five production projects: one API, one required one-shot
Migrator, and one assembly per genuine Business Module. Full Stack adds exactly
`src/MartiX.Planner.Web/`. A persistence-free `api` has only
`src/MartiX.Planner.Api/`; persistence adds the Migrator. Do not turn layers,
vertical slices, Contracts, or test categories into projects. Split only for a
real compilation, executable, dependency, toolchain, versioning, or deployment
boundary.

Each Business Module owns one assembly with:

```text
Contracts/
  ModuleContracts/
  IntegrationEvents/
Domain/
Features/<Operation>/
Infrastructure/
  Persistence/
  Integrations/
<ModuleName>Module.cs
```

Only deliberate Contracts and the static composition entry point are public.
Domain, Features, Infrastructure, endpoints, Application Operations, contexts,
and Adapters are internal. Every business use case has a thin endpoint and an
internal sealed Application Operation in the same slice. Register the concrete
operation directly; do not generate a one-implementation Interface, base class,
mediator request/handler, or pipeline.

The API composition root explicitly calls every selected Platform registration,
Business Module registration, middleware stage, and endpoint mapping. Each
Module exposes explicit `AddServices` and `MapEndpoints` composition methods.
There is no module scanning or generic `IModule`.

Cross-module synchronous dependencies consume only provider-owned cohesive
Module Contracts and immutable DTOs. The project graph must be acyclic.
Independent reactions use publisher-owned versioned Integration Events. Do not
create global `Shared.Contracts` or split Contracts assemblies by default.

Primary decision: [Generated Solution topology](tickets/106-generated-solution-topology.md).

## Application and domain model

- Application Result/Error is transport-independent. HTTP, jobs, CLI, module
  calls, and messaging adapt it at their outward seams.
- Result exposes strong immutable success/failure invariants and a deliberately
  small Interface. Error codes use stable lowercase owner-prefixed identifiers;
  categories are transport-neutral.
- Business Modules own aggregates, invariants, Domain Events, persistence,
  migrations, public Contracts, and integration facts.
- Use direct Application Operations rather than a mandatory mediator. Add a
  source-generated mediator only after real pipeline/fan-out forces exist.
- Keep mapping explicit and slice-owned. Mapperly is optional where compile-time
  generation reduces demonstrated complexity; no global runtime mapping registry.
- Transport validation remains separate from application/domain rules.
  FluentValidation is optional for complex transport rules, not a universal
  dependency.
- Compose Entity behavior through admitted capabilities such as timestamps,
  Actor attribution, optimistic concurrency, or Domain Event collection. Do not
  introduce a universal `BaseEntity`, aggregate base, soft-delete base, or
  inheritance-based Specification.

## Persistence and data ownership

Relational persistence uses application-owned EF Core contexts and migrations.
PostgreSQL is the default provider; SQL Server receives equal Supported
verification. A Generated Solution initially selects one provider. Production
SQLite, mixed providers, non-relational primary storage, EF Core InMemory as
integration evidence, generic repositories, and generic units of work are not
Supported defaults.

Application Operations use the owning `DbContext` directly. Query reuse uses
immutable composable Specifications in `MartiX.Platform.EntityFrameworkCore`:
criteria, includes, ordering, pagination, projection and execution semantics are
explicit, while mutations, transactions, provider switching, and business
orchestration stay outside the pattern.

Persistent Entity capabilities use composition:

- timestamps are required where the accepted persistence profile needs them;
- Actor attribution and optimistic concurrency are opt-in;
- interfaces express behavior only after semantics are admitted;
- SaveChanges/interceptor behavior has deterministic ordering and tests; and
- UTC `DateTimeOffset`, `TimeProvider`, application-assigned identifiers and
  provider-portable naming are explicit.

Business Modules own schemas and migrations. The separate Migrator composes and
orders them, runs before traffic, may hold DDL credentials unavailable to the
API, and is the only production schema-change path. Runtime startup never calls
`Migrate`, `EnsureCreated`, or implicit seeding.

Primary decision: [Persistence and migrations](tickets/107-persistence-and-migrations.md).

## Integration Events and reliable work

The default modular transport is durable in-process delivery:

1. business changes and an immutable Outbox Message commit atomically;
2. explicit per-Subscription Delivery Attempts are leased and fenced;
3. the serialized versioned envelope crosses the transport seam;
4. a consumer Inbox Receipt and its database effects commit atomically; and
5. acknowledgement follows consumer commit.

The guarantee is observable At-Least-Once Delivery with Exactly-Once Business
Effect only where Inbox/idempotency transactions prove it. Do not claim
exactly-once transport, global ordering, or duplicate-free delivery. External
effects create new durable intents. Retry, timeout, leasing, recovery, terminal
failure, requeue, retention, and telemetry are bounded and operator-visible.

RabbitMQ is the initial optional broker and does not replace Outbox/Inbox.
Webhooks, Durable Jobs, notifications, and real-time hints remain separate
protocols.

Primary decision: [Integration Event delivery](tickets/109-integration-event-delivery.md).

## HTTP contract

Minimal APIs are canonical; FastEndpoints is an optional mutually exclusive
endpoint provider with black-box behavioral parity.

- Use explicit URL major versions (`/api/v1/...`) and one OpenAPI 3.1 document
  per supported major.
- Use ASP.NET Core typed results and explicit success DTOs.
- Translate expected failures to one RFC 9457 Problem Details contract with
  stable error codes and safe details.
- Generate authoritative OpenAPI at build time with
  `Microsoft.AspNetCore.OpenApi`; generated clients consume that artifact.
- Apply explicit lifecycle headers, deprecation/sunset policy, routes, methods,
  status codes, pagination, filtering, sorting, caching, request bounds,
  cancellation, idempotency and ETag/precondition semantics.
- Use System.Text.Json source generation where the profile requires it; wire
  contracts never serialize Kernel Result types directly.
- Use typed `HttpClient` and standard resilience for outbound calls; retry only
  operations proven safe by idempotency and protocol semantics.

Primary decision: [HTTP contracts, OpenAPI, and versioning](tickets/110-http-contract-policy.md).

## Identity, authorization, and security

Authentication is optional and separate from authorization. Provider and flow
are selected independently:

- local ASP.NET Core Identity;
- generic OIDC interactive or bearer profiles;
- Microsoft Entra interactive, delegated API, application API, and other
  explicitly verified profiles; and
- machine-to-machine or API-key profiles only where separately selected.

Business code consumes a provider-independent immutable Actor snapshot and
stable permission policy, not `ClaimsPrincipal`, provider user types, email, or
subject identifiers. A durable Actor Registry is optional when stable local
attribution, linking, local permissions, or provider migration requires it.
Local Identity remains an optional capability in the existing API host until a
real trust/deployment boundary justifies another project. ASP.NET Core Identity
is not treated as an OAuth authorization server.

Host security fails fast on unsafe production configuration. Authorization is
two-layered: coarse transport policy plus application/domain enforcement.
Security Audit Events are distinct from logs and Entity Change History; durable
retention is selected or required for privileged capabilities and must preserve
transactional failure policy.

Use native structured logging, `ActivitySource`, `IMeterFactory`, health and
readiness contracts, default-deny data classification/redaction, bounded rate
limiting and overload behavior, protected diagnostics, secure Data Protection
key lifecycle, SSRF-safe outbound HTTP, maintained Threat Models, and executable
OWASP-aligned evidence. No telemetry exporter or vendor is mandatory.

Primary decisions:
[Identity profiles](tickets/108-identity-provider-matrix.md) and
[Security/observability baseline](tickets/111-security-observability-baseline.md).

## Application UI

UI is an explicit Capability. A production solution selects exactly one provider
and one UI project:

- Blazor Web App;
- React with strict TypeScript, Vite, React Router Framework Mode, and TanStack
  Query; or
- Vue 3 SFC/Composition API with Vite, Vue Router, `vue-tsc`, and TanStack Vue
  Query.

All three providers are Supported under one behavioral UI Capability Contract;
React and Blazor have equal prominence, and Vue remains a genuine supported
choice. Provider-native implementations use Fluent 2, semantic HTML, semantic
component-root-scoped CSS, accessibility, localization and theme readiness.
Tailwind and pervasive utility-class styling are excluded.

The UI consumes only HTTP/OpenAPI and never references backend assemblies.
Generated clients are deterministic, checked in, never manually edited, and
wrapped only for credentials, antiforgery, Problem Details, ETags, idempotency,
resilience, observability and special transport behavior. React/Vue use
`openapi-typescript` plus `openapi-fetch`; Blazor uses NSwag client-only mode,
subject to exact release attestation.

Authenticated React/Vue uses ASP.NET Core cookie/BFF ownership; browser token
storage is invalid. Rendering profile `application` makes no SEO claim;
`hybrid-web` adds public SSR/prerendering with explicit caching, privacy, and SEO
evidence. PWA/offline, real-time, advanced widgets, rich text, and commercial
suites are separate capabilities.

React/Vue use exactly pinned pnpm, one frozen lockfile, exact direct
dependencies, release quarantine, provenance/trust verification, strict engine
and peer policy, and an explicit install-script allowlist. Volta remains the
owner's manual workstation tool and is not a repository or CI dependency.

Primary decision: [UI provider architectures](tickets/118-ui-provider-architecture.md).

## Initial infrastructure providers

The initial catalog chooses one attested production provider per optional
Capability while preserving client-driven alternatives:

| Capability | Initial provider/seam |
| --- | --- |
| Distributed cache | Standard `IDistributedCache`/`HybridCache` with Valkey through the Microsoft StackExchangeRedis provider |
| Durable Jobs | Quartz.NET ADO JobStore over the selected relational provider |
| Broker | RabbitMQ with Outbox/Inbox semantics |
| Object Storage | Azure Blob Storage behind the admitted object contract |
| External notification | SMTP email through MailKit |
| Secrets | Standard .NET configuration injection; optional Azure Key Vault provider |
| Feature Management | Microsoft Feature Management over `IConfiguration` |
| Observability export | OpenTelemetry OTLP, preferably through a Collector |

Central Package Management and immutable image digests pin exact release
versions. Most providers remain generated internal Adapters over standard .NET
seams and add no project. A client mandate triggers a provider-admission ADR,
Capability Matrix update, migration/rollback plan, and full Composed Quality
Profile; it never silently promotes a Deferred provider.

Primary decision: [Infrastructure provider catalog](tickets/119-infrastructure-provider-catalog.md).

## Development and deployment

Direct local execution is always supported. Aspire is an optional Local
Development Profile and models only selected resources. Containerization and
Docker Compose are independent explicit capabilities; Compose is bounded to
headless parity and verified single-host deployment, not treated as an
orchestrator.

Process and OCI artifacts are equal immutable Deployment Profiles built from
the same source and contracts. One versioned Deployment Manifest composes
logical resources, readiness, persistence, migration order, secret delivery,
ports and topology; target-specific projections derive from it instead of
becoming independent sources.

Configuration uses standard .NET configuration plus validated typed Options.
Secrets enter through deployment-specific Secret Delivery Adapters and never
appear in manifests or source. Deployment runs the Migrator as a one-shot
operation before serving traffic.

The baseline remains cloud-neutral. Azure App Service/Container Apps, AWS,
Kubernetes and other targets are documented promotion paths rather than
mandatory infrastructure. The owner's future Active24 reference is an Ubuntu
26.04 LTS Minimal VPS after its first point release and full target admission;
Ubuntu 24.04 LTS Minimal is the safety fallback and Debian 13 is a separately
attested client-driven alternative. Legacy shared Windows hosting is not assumed
to satisfy the target contract.

Primary decision: [Development and deployment profiles](tickets/120-development-deployment-profiles.md).

## Quality, performance, and compatibility

TDD is the default behavior-change workflow. Tests use TUnit on
Microsoft.Testing.Platform, source-generation mode, parallel execution, and
isolated real resources. Generated Solutions have one consolidated .NET test
project unless an incompatible toolchain, executable target, or measured CI
isolation force requires another.

Every repository exposes:

```text
dotnet run --file eng/verify.cs -- fast
dotnet run --file eng/verify.cs -- pull-request
dotnet run --file eng/verify.cs -- main-nightly
dotnet run --file eng/verify.cs -- release-candidate
```

`eng/quality-gates.json` owns stable Gate identities, families, owners,
applicability, commands, timeouts, evidence, thresholds, and fail-closed outcome
semantics. Required gates cannot be waived, skipped, quarantined, or retried to
green. Verification is strict and non-mutating.

Evidence includes package and consumer compatibility, compile-time architecture,
HTTP/OpenAPI, real providers, security controls and behavior, reliability fault
transitions, migrations over historical fixtures, UI/browser accessibility,
packed template generation through healthy applications, performance on pinned
runners, and immutable content-addressed release evidence. The compatibility
plan combines canonical Presets, provider conformance, named high-risk
interactions, deterministic covering arrays, and every Invalid combination—not
a naive Cartesian product.

Trimming and Native AOT are exact combination claims. The BCL Kernel and narrow
ASP.NET Core package must earn declared compatibility. The persistence-free
Minimal API `api` Preset is the primary production Native AOT profile. EF Core
modular/full-stack profiles remain Supported under JIT without initial trim/AOT
claims. AOT metadata, compilation, or cross-compilation never substitutes for
native OS/RID publish and black-box parity.

Performance gates use versioned reference runners, raw retained evidence, noise
floors, and relative regression budgets. Applications own workload-specific
SLOs. Unboundedness, leaks, starvation, false readiness, security/correctness
failure, or a declared JIT/AOT behavior difference is release-blocking regardless
of percentage.

Primary decisions:
[AOT/performance matrix](tickets/112-aot-performance-matrix.md) and
[Executable quality gates](tickets/113-quality-gates.md).

## Versioning, migration, and release

Every Supported release uses one synchronized SemVer 2.0 Platform Version across
first-party packages, templates, Tool, migrations, Skills, schemas,
documentation, and evidence. The first production line starts at `1.0.0`.
Within a major, package updates remain compatible without mandatory changes to
application-owned source, configuration, database schema, or deployment
topology.

Keep Installed Platform Version, Platform Contract Version, and Manifest Schema
Version distinct. `martix.platform.json` records immutable origin, current
contract, Preset, stable Capability/provider IDs, and an append-only migration
ledger. Compatible package upgrades need not change contract version. A Platform
Migration changes it only after the complete reviewed transformation and target
quality profile succeed.

Run migrations through one exact target Tool version:

```text
dotnet tool exec MartiX.Platform.Tool@2.0.0 -- migrate plan --to 2.0.0
```

The command illustrates an exact target; production commands never omit the
version or use a range/latest. The Tool embeds a typed digest-bound Migration
Catalog, inspects and simulates first, produces a reviewable Migration Plan,
stops on ambiguity, mutates only after approval, verifies postconditions, and
classifies recovery rather than promising universal rollback. Templates are not
reapplied.

Support the current Active major and immediately previous Maintenance major;
the predecessor normally receives 12 months of maintenance after successor
stability, bounded by upstream support. Prove cumulative same-major compatibility
against immediate, major-floor, minor-cohort, and escaped-defect baselines.

Release candidates are built once, signed, verified, and promoted without
rebuild. OIDC publishing identity, author signatures, provenance, SBOM,
content-addressed Candidate Evidence, Promotion Receipts, and final Release
Evidence form the trust chain. Observable changes begin as durable change
fragments. Required release failures have no maintainer waiver.

Primary decision: [Release and Platform Migration policy](tickets/114-release-migration-policy.md).

## Agent guidance and Canonical Knowledge

Generated Solutions contain a compact self-sufficient `AGENTS.md`. The Platform
repository owns one synchronized model-invoked `martix-platform` router Skill,
published one-way as an exact copy to `martix/skills`. The Skill routes process
and progressively loads focused reference; it never owns architecture.

The exact Platform Tool generates an ephemeral secret-free Agent Context
Projection from existing authorities. Do not commit a second agent manifest.
The Skill compares its version with Installed Platform Version and Platform
Contract Version before mutation and routes incompatible states to an exact
installation or read-only migration plan.

Canonical Knowledge is layered:

- `CONTEXT.md`: vocabulary only;
- architecture docs: current approved structure;
- ADRs: hard-to-reverse surprising trade-offs;
- `martix.platform.json`: exact composition and migration state;
- schemas and quality policy: machine contracts;
- change fragments: observable Platform release intent;
- task/PR record: structured WHAT, WHY, alternatives, migration, evidence,
  consequences, future triggers, Deferred scope, and supersession; and
- `AGENTS.md`/Skill: concise routing and workflow.

Agent readiness is measured with raw Generated Solution fixtures, representative
tasks, permissions, correct knowledge routing, hostile-instruction resistance,
and the same Quality Gates as human changes. A mandatory plugin/MCP layer is
Deferred until a real multi-host typed protocol provides depth beyond the CLI.

Primary decision: [Agent Guidance Package](tickets/115-agent-guidance.md).

## Native mobile posture

Native Android/iOS is a first-class future optional consumer, not a PWA or
WebView substitute. Research advanced .NET MAUI and React Native to a future
side-by-side physical-device conformance prototype. Platform-native SwiftUI plus
Kotlin/Compose remains the fidelity/escalation reference; Flutter and
Kotlin/Compose Multiplatform remain credible Deferred alternatives.

No native mobile Capability/provider is initially Supported or generated. The
branch is parked until the owner has an Xcode-capable Mac, physical iPhone,
physical Android device, signing/toolchain access, and makes it a current
priority. The current Platform contract remains prepared through explicit
OpenAPI/HTTP, public-client identity seams, versioning, idempotency, concurrency,
security, and observability, but mobile authentication, offline/sync, push,
device trust, store/release, and quality decisions remain unresolved.

Primary decisions:
[Native mobile technology research](tickets/123-native-mobile-technology-research.md)
and [parked conformance lab](tickets/132-native-mobile-conformance-lab.md).

## Explicitly Deferred or invalid defaults

Deferred until a concrete workload and evidence exist:

- multi-tenancy and isolation models;
- microservices extraction, Kubernetes/Helm and cloud-specific infrastructure;
- gRPC, GraphQL, Kafka/streaming, event sourcing, sagas and workflow engines;
- mixed or non-relational primary persistence and production SQLite;
- native mobile/PWA/offline support, advanced UI suites and tenant branding;
- additional brokers, caches, object stores, identity flows, exporters and
  remote configuration providers; and
- a mandatory MartiX plugin/MCP server.

Invalid defaults include hidden infrastructure, universal repository/unit-of-
work/Specification layers, universal base entities, mandatory mediator,
FastEndpoints, FluentValidation, Mapperly, Serilog, Aspire or Tailwind,
reflection discovery, broad shared projects, production in-memory correctness,
business modules bundled by the Platform, template reapplication, secrets in
source, and claims unsupported by executable evidence.

Deferred alternatives remain documented with client/workload triggers and
admission evidence. They add no dependency or generated source until selected.

## Implementation handoff

Implementation begins in a new `MartiXDev/Platform` greenfield repository. Copy
the complete Wayfinder history and Canonical Knowledge with verified provenance;
do not mutate the legacy WebApi POC into the target or preserve its contracts for
continuity.

The approved executable sequence, maturity gates, parallelization rules,
acceptance evidence, and predecessor cutover are defined by the
[prioritized implementation roadmap](migration-roadmap.md).

The implementation roadmap must order tracer bullets so each intermediate state
is buildable, reviewable, tested, and useful. At minimum it must establish:

1. repository identity, licenses, governance, Canonical Knowledge and build
   skeleton;
2. Kernel, ASP.NET Core, Analyzers, package graph and verification Interface;
3. Capability Matrix, manifest/schema, Template System and canonical generated
   Presets;
4. persistence/Migrator and reliable modular behavior;
5. HTTP, identity, security, observability and provider conformance;
6. equal UI provider fixtures and deployment projections;
7. compatibility baselines, Platform Tool/Migrations and release trust chain;
8. Agent Guidance Package and agent-readiness evidence; and
9. first release candidate, public promotion, Marketplace Skill copy, and only
   then archival of predecessor repositories.

This list expresses dependency constraints, not final ticket sizing or priority.
The dedicated migration-roadmap decision owns the executable sequence and
tracer-bullet acceptance criteria.
