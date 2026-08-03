---
title: Design the supported capability and preset matrix
status: closed
type: wayfinder:grilling
parent: ../map.md
claimed_by:
resolved: 2026-07-16
blocked_by:
  - 101-compare-platform-sources.md
  - 102-audit-current-webapi.md
---

## Question

Which Platform Capabilities belong to the Platform Baseline, each Preset, or explicit selection, and which combinations are supported, invalid, or deferred?

## Resolution

Use one deterministic Capability Matrix as the executable source of truth for template composition. Keep the Platform Baseline intentionally small, make `modular-monolith` the default Preset, and define `full-stack` as that same architecture plus a required, explicitly selected Application UI provider. Enterprise readiness comes from stable seams, declared prerequisites, operational contracts, and verified providers rather than from enabling every possible subsystem.

The generator must show the resolved plan before writing files, reject invalid combinations, support deterministic non-interactive use, and write the final Capability Manifest into the Generated Solution. No Capability may be enabled as a hidden side effect. Provider dependencies, conflicts, support level, and quality evidence belong to the concrete combination rather than to a marketing-level feature name.

### Classification vocabulary

The Capability Matrix uses these states:

- **Required**: always present for the Preset.
- **Required with default provider**: required, with a supported provider selected unless explicitly replaced.
- **Required with explicit provider**: required, but generation cannot proceed until the user selects a provider.
- **Optional Supported**: selectable and release-gated for every declared supported combination.
- **Experimental**: available for evaluation without a production-readiness or compatibility guarantee.
- **Deferred**: deliberately outside the initial supported catalog pending sharper forces or research.
- **Invalid**: a known unsafe, incoherent, or unsupported combination that generation must reject.

### Platform Baseline

Every Preset receives:

- the redesigned, framework-independent Result and error model;
- direct Application Operations, explicit cancellation propagation, and `TimeProvider` where time is a dependency;
- actor and authorization seams without an authentication or identity-storage provider;
- generated ownership, dependency-direction, and architecture conventions;
- an ASP.NET Core Minimal API foundation with typed results, safe Problem Details, built-in OpenAPI, startup configuration validation, global safe exception handling, secure forwarded-header, HTTPS, HSTS, request-limit, authorization, and explicit-anonymous defaults;
- vendor-neutral structured logging, `ActivitySource`, `IMeterFactory`, health and readiness semantics, graceful startup and shutdown, and no mandatory exporter or observability vendor;
- TUnit on Microsoft.Testing.Platform, relevant unit, architecture, and host tests, analyzers, zero-warning enforcement, a Capability Manifest, documentation, CI, and the Security Audit Event contract.

The baseline does **not** imply EF Core, a database, Domain or Integration Events, outbox or inbox, an identity provider, UI, cache, idempotency, API versioning, background jobs, a mediator, FastEndpoints, FluentValidation, Mapperly, Serilog, Aspire, containers, cloud infrastructure, or telemetry exporters.

### Preset matrix

| Concern | `api` | `modular-monolith` | `full-stack` |
| --- | --- | --- | --- |
| Platform Baseline | Required | Required | Required |
| Business Module topology | Not included | Required | Required |
| Relational Persistence | Optional | Required; PostgreSQL default, SQL Server equal | Required; PostgreSQL default, SQL Server equal |
| One-shot migrator | With persistence | Required | Required |
| Integration Events plus outbox/inbox | Invalid; migrate to modular topology | Required | Required |
| In-process Integration Event transport | Not included | Required default | Required default |
| Application UI | Not included | Not included | Required with explicit provider |
| Admin UI | Not included | Not included | Optional Supported |
| Localization and Theme Readiness | Not included | Not included | Required |
| Authentication and identity storage | Optional Supported | Optional Supported | Optional Supported |
| Permission Capability | Optional Supported | Optional Supported | Optional Supported |
| Cache and output-cache capabilities | Optional Supported | Optional Supported | Optional Supported |
| Hosted Background Work and Durable Jobs | Optional Supported | Optional Supported | Optional Supported |
| Broker transport | Not included | Optional Supported | Optional Supported |
| Object Storage and File Management | Optional Supported | Optional Supported | Optional Supported |
| Notification Inbox | Not included | Optional Supported | Optional Supported |
| Real-time delivery and external delivery channels | Optional Supported | Optional Supported | Optional Supported |
| Webhook ingestion | Optional Supported | Optional Supported | Optional Supported |
| Webhook delivery | Not included | Optional Supported | Optional Supported |
| Durable audit, Entity Change History, and HTTP diagnostics | Optional Supported | Optional Supported | Optional Supported |
| Idempotent Execution and Feature Management | Optional Supported | Optional Supported | Optional Supported |
| API versioning, Aspire, Docker, Docker Compose, and exporters | Optional Supported | Optional Supported | Optional Supported |

The `api` Preset is a lean production HTTP host with non-modular vertical slices. It defaults to no persistence and is the strongest Native AOT candidate. Selecting multiple Business Modules or reliable Integration Events requires migration to `modular-monolith`; the template must not simulate modularity inside `api`.

The `modular-monolith` Preset is the default starting point. Business Modules own their EF Core contexts and migrations, communicate synchronously through Module Contracts, keep Domain Events internal, and use Integration Events across module boundaries. A one-shot migrator and production outbox/inbox deduplication are required. Delivery is in-process by default, so a broker is not required. The outbox may remain operationally dormant until a module publishes an Integration Event.

The `full-stack` Preset adds an Application UI to the modular architecture. `blazor-webapp`, `react`, and `vue` are Supported UI providers behind one UI Capability Contract. React and Blazor have equal prominence; Vue is expected less often but must pass the same declared quality gates. `ui=none` is invalid for this Preset. Admin UI is a separate optional role, and identity remains independent and optional. WCAG 2.2 AA, runtime UI configuration, localization readiness, theme readiness, accessible states, culture-invariant API contracts, and browser verification are required. Exact render modes, framework stacks, hosting, generated-client, and authentication-flow choices are delegated to the UI provider architecture ticket.

### Capability dependencies and safety rules

#### Identity and authorization

Authorization foundations belong to the baseline, while authentication and identity storage remain optional for every Preset; even `full-stack` may use `auth=none`. Future supported categories are local ASP.NET Core Identity, external OIDC/OAuth, Microsoft Entra ID, machine-to-machine credentials, and API keys. Local Identity requires relational persistence. External identity need not. Local and external identity together are invalid until account linking and conflict semantics are designed.

Permission management is separate from authentication. Local Identity subcapabilities such as two-factor authentication, session management, impersonation, password history, recovery, and account linking must be explicit. Impersonation and privileged permission administration require a Durable Security Audit Trail. For React and Vue, a secure cookie/BFF posture is preferred; long-lived browser token storage is invalid. Blazor authentication must follow the selected render mode.

#### Persistence

Relational Persistence is optional and absent by default in `api`, but required in both modular Presets. PostgreSQL is the default provider and SQL Server receives equal support verification. Select one relational provider per solution initially. Mixed providers, production SQLite, non-relational primary storage, and provider-independent persistence abstractions are Deferred. EF Core InMemory is test-only. Relational persistence becomes a prerequisite when local identity, durable idempotency, outbox/inbox, durable jobs, Notification Inbox, webhook delivery, or durable audit is selected.

#### Caching and idempotency

Caching is optional everywhere and defaults to none. Local `HybridCache` is suitable only as an optimization; in a multi-instance host it must never carry correctness, authorization, session, or idempotency state. Distributed `HybridCache` uses a verified Redis-compatible provider profile, with Valkey and Redis supported as server choices once selected. Output caching, data-protection key storage, and distributed locks or leases are separate concerns.

Production Idempotent Execution is durable and atomically claims an operation key scoped to the operation, actor, future tenant where applicable, and request fingerprint. It defines concurrent waiting or replay, changed-payload conflict, failure recovery, TTL, and sensitive-response policy. Selecting it in `api` also selects persistence. Relational storage is the initial correctness provider; in-memory is development/test only and Redis-backed correctness is Deferred. It is separate from output caching and the Integration Event inbox.

#### Work, events, and messaging

Hosted Background Work means recoverable, bounded, graceful first-party `BackgroundService` or Channel-based work. Durable Jobs add persisted schedules, retries, and operator controls. Both are optional and distinct. Durable Jobs require persistence; handlers must be idempotent and propagate actor, correlation, and observability context explicitly.

Reliable Integration Event delivery is required in modular Presets and invalid in `api`. It uses an outbox, inbox/deduplication, at-least-once delivery, and explicit versioned contract metadata. In-process delivery is the default transport. A broker is an optional transport, does not replace the outbox, and initially permits one selected provider per solution. Multiple brokers and Kafka-style streaming are Deferred. Webhooks are separate protocols.

#### Files, notifications, real time, and webhooks

Object Storage is optional in every Preset. Candidate provider categories are S3-compatible storage such as AWS S3 or MinIO, Azure Blob Storage, and a local provider for development or verified single-host use. Local storage is invalid for multi-instance production unless a verified shared-volume profile exists. Database blobs are Deferred.

File Management is a higher-level capability depending on Object Storage. Its contract includes authorized upload/finalization, presigned direct transfer, ownership, validation, checksums, scanning and quarantine, retention, visibility, quotas, and audit. Provider selection is separate from that policy.

Notification Inbox is durable application state, optional in modular Presets, and depends on persistence plus stable recipients. Email, push, and SMS are separate optional delivery channels. Real-Time Delivery is optional everywhere: SSE is preferred for one-way notifications and SignalR for richer bidirectional interactions. Real-time messages are transient hints, never the source of truth; reconnecting clients recover through authoritative queries, and multi-instance SignalR requires a backplane profile. Chat remains a business/reference module, not a Platform Capability.

Webhook Ingestion is optional everywhere and requires signature verification, timestamp and replay protection, raw-payload handling, and production-durable idempotency. Selecting it in a persistence-free `api` therefore adds persistence. Webhook Delivery is optional only in modular Presets and builds on Integration Events plus durable background execution. It requires HMAC signing, secret rotation and encryption, retries, delivery history, and strong SSRF, DNS-rebinding, redirect, and private-address protections. Ingestion and delivery are separate contracts.

#### Audit, feature management, and observability

The Security Audit Event contract is in the baseline. Durable Security Audit Trail is optional unless required by a privileged capability. Entity Change History is a separate, opt-in persisted concern. HTTP Diagnostic Capture is also separate, disabled by default, privacy-bounded, and never treated as an audit trail. Audit is not primary business state; each risk-sensitive operation must declare its audit failure policy.

Feature Management is optional and defaults to none. The initial provider is configuration-backed; remote providers come later. Flags are temporary rollout, canary, replacement, or kill-switch mechanisms with an owner, expiry, removal plan, safe fallback, server authority, privacy rules, and tests for both states. They must not implement authorization, tenancy, schema compatibility, permanent architecture, unfinished code, configuration, or commercial entitlements.

The baseline emits vendor-neutral logs, traces, and metrics. Optional profiles may add OpenTelemetry OTLP, Prometheus, Azure Monitor/Application Insights, console/development export, or the Aspire dashboard when Aspire is selected. Structured console logging is the default and Serilog is optional. Profiles must prevent duplicate signals, unbounded queues, and secret leakage. Health checks are not exporter liveness, and security audit evidence must not disappear through trace sampling.

#### Development, deployment, and HTTP framework choices

Aspire, Docker packaging, Docker Compose, exporters, and deployment integrations are independent optional capabilities for every Preset and default to none. Aspire models only selected resources and does not imply production deployment. Docker images must be hardened and immutable. Cloud-specific Terraform/Bicep and Kubernetes/Helm are Deferred. Environment variables and local development secrets are baseline mechanisms; Azure Key Vault, AWS secrets, and Vault-style integrations remain future providers. The same capability resolution drives the doctor command and migrator prerequisites.

Minimal APIs are the canonical HTTP model. FastEndpoints is an optional Supported provider, but one Generated Solution uses one business endpoint model. Native transport validation and explicit slice mapping are defaults; FluentValidation and Mapperly are optional for justified complexity. Direct dispatch is the default; a source-generated mediator is optional and never Preset-required. Built-in OpenAPI is required, Scalar and API versioning are optional, and third-party types may not leak into Platform or business contracts.

HTTP/JSON plus OpenAPI is canonical. Outbound integrations use typed `HttpClient` clients and standard resilience, with no unsafe retries of non-idempotent operations. SSE, SignalR, webhooks, and broker delivery remain distinct capabilities. gRPC, GraphQL, direct general-purpose WebSockets, and Kafka streaming are Deferred or invalid defaults. Business logic remains transport-independent.

### Deferred and invalid scope

The initial Platform deliberately defers:

- multi-tenancy until a concrete consumer and isolation model exist;
- billing, subscriptions, entitlements, commercial quotas, and metering;
- workflows, sagas, event sourcing, and streaming platforms;
- gRPC, GraphQL, external or vector search;
- non-relational primary databases, mixed PostgreSQL/SQL Server, and production SQLite;
- distributed locks and general coordination;
- native mobile and desktop clients;
- Kubernetes/Helm and cloud-specific infrastructure as code;
- tenant-specific branding and localization;
- business-domain modules.

Ordinary application concerns such as module-owned EF queries, reports and exports, application retention policy, direct workflows, hosted services, typed HTTP clients, pagination, domain models, seeding, and deliberate soft-delete behavior remain application code rather than generic Platform Capabilities.

Invalid defaults include universal repository/specification/unit-of-work layers, universal base entities or soft deletion, mandatory mediator/FastEndpoints/FluentValidation/Mapperly/Serilog/Aspire, hidden infrastructure behind `AddDefaults`, bundled business modules, template reapplication, production in-memory critical state, process-local correctness guarantees, and a nominal provider without verified compatibility tests.

### FullStackHero disposition

The comparison with FullStackHero v10 is recorded in [the fixed-revision research note](../research/104-fullstackhero-capability-gap.md). MartiX should:

- **adopt** separate application and operator UI roles, runtime frontend configuration, Playwright discipline, doctor/dry-run tooling, explicit Contracts boundaries, a one-shot migrator, Aspire startup ordering, and immutable deployment artifacts;
- **adapt** identity, auditing, files, webhooks, caching, jobs, notifications, and real-time behavior behind MartiX-owned Capability Interfaces and providers;
- **reject as defaults** a mandatory SaaS/multi-tenant topology, universal third-party framework choices, PostgreSQL-only assumptions, shared operational credentials, AWS-specific enterprise assumptions, and bundled Billing, Catalog, Tickets, or Chat modules.

FullStackHero's React implementation is useful evidence for the React provider but does not make React architecturally superior to Blazor Web App or Vue. All three must satisfy the same UI Capability Contract and declared quality profile.

## Rationale

A maximum-feature starting solution would optimize for visible inventory while increasing attack surface, cold-start and build cost, upgrade pressure, accidental coupling, and the number of combinations that cannot honestly be verified. A tiny baseline plus explicit, deep capabilities preserves KISS and YAGNI without sacrificing enterprise readiness: future needs attach at already-defined seams and become Supported only when their concrete combinations pass the quality gates.

Making Modular Monolith the default reflects the expected applications: several Business Modules, relational persistence, and future integration needs are common enough to justify structural boundaries and reliable event semantics. Keeping `api` truly lean preserves a low-complexity and AOT-conscious option. Defining Full Stack as Modular Monolith plus an explicit UI avoids a second backend architecture and gives Blazor, React, and Vue equal contractual standing.

This resolution supersedes earlier shorthand that described UI as merely optional: UI remains an explicit capability in the overall Template System, but it is required with an explicit provider inside the `full-stack` Preset.
