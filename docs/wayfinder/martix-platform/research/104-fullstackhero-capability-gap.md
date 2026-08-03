# FullStackHero v10 capability gap for the MartiX Full Stack Preset

Research date: 2026-07-15

## Scope and revision

This note compares the accepted MartiX Platform direction with FullStackHero
`v10.0.0` at commit
[`44412b23675b76fc38ddc8eefba93f60f0127be0`](https://github.com/fullstackhero/dotnet-starter-kit/commit/44412b23675b76fc38ddc8eefba93f60f0127be0).
The tag is the latest stable GitHub release inspected, dated 2026-06-20
([release](https://github.com/fullstackhero/dotnet-starter-kit/releases/tag/10.0.0)).
The comparison uses the pinned repository, FullStackHero's official
documentation, and the earlier MartiX fixed-revision source audit. Marketing
claims are treated as capability inventory, not proof of correctness.

## Executive recommendation

Do not copy or fork FullStackHero. Use it as a scenario and pattern catalog.
MartiX should adopt its separation of operator and application UIs, runtime
frontend configuration, browser-test discipline, environment doctor, local
orchestration ordering, one-shot migrator lifecycle, and deployment of immutable
API/migrator artifacts. Adapt its identity, auditing, files, webhooks, jobs,
caching, notifications, and real-time designs as optional MartiX capabilities.
Reject its mandatory SaaS topology, universal third-party stack, business-module
catalog, and source-only framework ownership as Platform defaults.

FullStackHero v10 supplies React only. It is therefore evidence for the MartiX
React option, not a reason to subordinate Blazor Web App or Vue. MartiX should
offer all three behind one UI Capability Contract and apply the same security,
accessibility, contract, browser, observability, and deployment gates to each.

## What FullStackHero v10 contains

The stable release describes a .NET 10 modular monolith with ten runtime plus
Contracts Business Modules, two React 19 applications, an API, Aspire AppHost,
one-shot database migrator, CLI/template distribution, deployment assets, and
large backend/browser test suites
([pinned README](https://github.com/fullstackhero/dotnet-starter-kit/blob/44412b23675b76fc38ddc8eefba93f60f0127be0/README.md),
[release](https://github.com/fullstackhero/dotnet-starter-kit/releases/tag/10.0.0)).

Its two UIs have distinct roles:

- `clients/admin` is the root-operator console;
- `clients/dashboard` is the tenant-facing application;
- both use React 19, TypeScript, Vite, React Router, TanStack Query, Tailwind,
  Radix-style components, and Playwright;
- both load runtime configuration so one built artifact can move between
  environments; and
- SignalR and SSE supply real-time behavior.

The official frontend documentation confirms that runtime `/config.json`
avoids rebuilding per environment and that a single static artifact can be
served by a container or static host
([admin frontend](https://fullstackhero.net/docs/frontend/admin/)).

The backend includes ASP.NET Core Identity/JWT, permissions, sessions,
impersonation, TOTP, password policy/history, multitenancy, auditing, files,
chat, notifications, webhooks, billing, catalog, and tickets. Cross-cutting
BuildingBlocks add PostgreSQL, caching through HybridCache/Valkey, Hangfire,
S3/MinIO, quotas, rate limiting, API versioning, Problem Details, Serilog,
OpenTelemetry, and Scalar. The official module catalog describes the ten
modules and their roles
([modules](https://fullstackhero.net/docs/modules/)).

Aspire starts and orders PostgreSQL, Valkey, MinIO initialization, the migrator,
demo seeder, API, and both React apps. The API waits for dependencies and
one-shot operations rather than racing an unmigrated database
([Aspire topology](https://fullstackhero.net/docs/deployment/aspire/)). The CLI
provides `new`, `doctor`, `info`, and `update`, supports interactive and
non-interactive generation, dry runs, optional frontend/Aspire removal,
environment checks, secret generation, package installation, and optional Git
initialization ([CLI](https://fullstackhero.net/docs/cli/)).

## Gaps in the current MartiX Full Stack definition

The accepted MartiX definition currently says only “Modular Monolith plus a
selected UI.” FullStackHero exposes decisions that must be explicit before that
is a complete product:

| Missing decision or capability | Recommended MartiX response |
| --- | --- |
| Application UI versus operator/admin UI | Separate `application-ui` from optional `admin-ui`; do not generate two UIs when only one role exists. |
| UI provider contract | Support `blazor-webapp`, `react`, and `vue` behind equivalent auth, configuration, API-contract, error, observability, accessibility, browser-test, and deployment expectations. |
| Environment configuration | Adopt runtime frontend configuration so the same artifact is promoted unchanged. Never bake environment secrets into a UI bundle. |
| API client lifecycle | Generate typed clients from the versioned OpenAPI contract with a small provider-specific transport/auth layer. Do not copy FullStackHero's hand-maintained client as the MartiX default. |
| Browser quality | Adopt Playwright end-to-end and accessibility scenarios for every Supported UI/provider/auth combination. Add component tests appropriate to each framework. |
| Authentication flow composition | Keep identity optional, but explicitly verify anonymous, cookie/BFF, OIDC/OAuth, token refresh/session expiry, logout, antiforgery, and authorization-denial flows where applicable. |
| Frontend security | Add CSP, secure cookie/token policy, XSS-safe rendering, dependency auditing, source-map policy, and security-header verification to each UI profile. |
| Accessibility and localization | Require WCAG 2.2 AA for Supported UI capabilities and supply localization/theming seams. FullStackHero's inspected inventory establishes theming, but not a complete MartiX-grade accessibility/localization contract. |
| Frontend observability | Define safe error, trace-correlation, performance, and deployment-version signals without forcing a monitoring vendor. |
| Local orchestration | Offer Aspire as an optional development/orchestration capability with dependency health and one-shot operation ordering. It must not be required by Platform Libraries. |
| Deployment | Offer container assets as a provider-neutral Supported capability. Keep AWS Terraform and other cloud-specific topologies separate and explicitly selected. |
| Tooling | Adopt `doctor`, `info`, `dry-run`, interactive and non-interactive generation. Replace template reapplication with Capability Manifest-aware Platform Migrations. |

## Adopt, adapt, reject, and defer

### Adopt substantially

- Separate operator/admin and application UI roles.
- Runtime UI configuration and promote-the-same-artifact deployment.
- Playwright end-to-end suites and shipped-template smoke tests.
- Environment `doctor`, generation dry-run, and non-interactive CLI operation.
- Contracts-only Business Module references and architecture tests.
- One-shot migration lifecycle and deployment failure when migration fails.
- Aspire dependency/health ordering as an optional local-development capability.
- Immutable, same-commit API and migrator images.
- Presigned direct-to-object-storage uploads as the preferred large-file pattern
  when the Files capability is selected.
- Permission metadata, negative authorization architecture tests, session and
  impersonation scenarios, and security audit scenarios.

### Adapt behind MartiX capability seams

| FullStackHero area | MartiX adaptation |
| --- | --- |
| Identity/JWT/permissions | Optional identity providers over the accepted actor and authorization seams; local Identity, external OIDC, cookie/BFF, and service actors remain separate choices. |
| Auditing | Split security audit events, business audit requirements, HTTP diagnostics, and EF change history instead of enabling indiscriminate request/response capture. Apply classification, masking, retention, and access policy. |
| Multitenancy | Keep deferred until concrete isolation requirements exist; later offer explicit isolation models rather than a universal tenant filter. |
| Cache/Valkey | `HybridCache` capability first; distributed provider selected separately. Never use a process cache for correctness or coordination. |
| Hangfire/jobs | Separate ordinary hosted background work from durable scheduling. Introduce a job provider only for durable, delayed, recurring, or operator-managed work. |
| Files/S3/MinIO | Define a storage Interface around lifecycle, authorization, scanning, retention, and presigned operations; providers remain adapters. |
| Webhooks | Optional capability over Integration Events with HMAC signing, encrypted secrets, bounded retries, idempotency, SSRF protection, delivery audit, and rotation. |
| Notifications/realtime | Separate durable notification inbox from SignalR/SSE transport. Prefer SSE for simple one-way streams; select SignalR when bidirectional groups/backplanes are required. |
| Mail | Optional notification delivery provider with template, localization, retry, privacy, and observability contracts. |
| Aspire/containers/cloud | Separate local orchestration, container packaging, and cloud deployment capabilities; no cloud or orchestrator is implied by Full Stack. |
| CLI/template | Keep the useful UX but drive it from the Capability Manifest and emit explicit Platform Migrations for owned source. |

### Reject as Platform or Preset defaults

- Mandatory multitenancy, billing, Identity storage, impersonation, Redis/Valkey,
  Hangfire, MinIO/S3, broker, quotas, chat, files, webhooks, or notifications.
- Generating ten example business modules into every application.
- Source-generated mediator, FluentValidation, specification/repository, or
  Serilog as universal conventions.
- A single PostgreSQL-only support claim; MartiX has already committed to equal
  PostgreSQL and SQL Server verification for persistence profiles.
- Shipping shared development credentials or a shared signing key. Generate
  per-solution development material and keep secrets out of committed source.
- Automatic Git commits as unavoidable behavior; initialization may be an
  explicit convenience.
- AWS Terraform as the meaning of enterprise readiness.
- Full source ownership for stable reusable Platform behavior. MartiX retains
  its hybrid Platform Library plus generated-source lifecycle.

### Defer pending dedicated capability decisions

- Exact Blazor render modes and project topology.
- Exact React framework/SPA stack and component system.
- Exact Vue stack and state/query libraries.
- Whether admin and application UIs may use different providers in one
  solution.
- Concrete cache, job, object-storage, mail, broker, and cloud provider catalog.
- Multitenancy models and tenant-isolation guarantees.
- Business-domain reference modules and sample-data policy.

## Recommended Full Stack matrix consequence

`full-stack` should mean `modular-monolith + application-ui(provider)`.
`application-ui` is required and its provider must be explicitly one of
`blazor-webapp`, `react`, or `vue`. `admin-ui(provider)` is separately optional.
Identity remains independently selectable; each UI/provider/identity
combination is Supported only when its complete Composed Quality Profile passes.

React and Blazor Web App should be co-equal, prominent choices. Vue may be a
less frequently documented choice, but if labelled Supported it receives the
same release gates and cannot be treated as best effort. Scope should be reduced
by shipping fewer optional platform capabilities, not by weakening Vue's
quality contract.

## Sources and limitations

- [FullStackHero v10.0.0 release](https://github.com/fullstackhero/dotnet-starter-kit/releases/tag/10.0.0)
- [Pinned repository README](https://github.com/fullstackhero/dotnet-starter-kit/blob/44412b23675b76fc38ddc8eefba93f60f0127be0/README.md)
- [Official module catalog](https://fullstackhero.net/docs/modules/)
- [Official CLI documentation](https://fullstackhero.net/docs/cli/)
- [Official Aspire topology](https://fullstackhero.net/docs/deployment/aspire/)
- [Official deployment documentation](https://fullstackhero.net/docs/deployment/)
- [Official admin frontend documentation](https://fullstackhero.net/docs/frontend/admin/)

This is an architecture and capability comparison, not a security audit or
production certification of FullStackHero. Absence claims are limited to the
pinned release and the cited active documentation. Provider-specific
correctness remains for the later dedicated Wayfinder tickets.
