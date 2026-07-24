---
title: Select the initial infrastructure capability providers
status: closed
type: wayfinder:research
parent: ../map.md
claimed_by: codex-root
resolved: 2026-07-19
blocked_by:
  - 104-capability-preset-matrix.md
  - 107-persistence-and-migrations.md
  - 109-integration-event-delivery.md
  - 111-security-observability-baseline.md
  - 112-aot-performance-matrix.md
---

## Question

Which concrete providers should initially satisfy distributed caching, Durable Jobs, broker transport, Object Storage, notification delivery, secrets, Feature Management, and observability export under the accepted capability, quality, AOT, and compatibility contracts?

## Resolution

Adopt the following initial provider catalog. A provider is not Supported merely
because it appears here: each exact package, external service revision,
configuration profile, operating system, database provider, and deployment
shape must pass its Composed Quality Profile before release. Every Capability
remains absent unless its Preset requires it or the user explicitly selects it.

| Capability | Initial production provider | Development and test profile | Initial compatibility claim |
| --- | --- | --- | --- |
| Distributed Cache | `Microsoft.Extensions.Caching.StackExchangeRedis` 10.0.10 with Valkey 9.1.0 as the first attested service profile | In-memory only for isolated tests; pinned Valkey container for integration and failure tests | JIT after conformance; no initial Native AOT claim |
| Durable Jobs | Quartz.NET 3.18.2 with ADO JobStore, System.Text.Json, and the selected PostgreSQL or SQL Server provider | The same relational provider in Testcontainers; RAMJobStore only for isolated scheduler tests | JIT only |
| Broker Transport | RabbitMQ.Client 7.2.1 with RabbitMQ 4.3.2 as the first attested service profile | Pinned RabbitMQ container and deterministic transport faults | JIT; AOT remains unclaimed until executable evidence |
| Object Storage | Azure.Storage.Blobs 12.29.1 | Azurite 3.35 through Testcontainers; bounded fake only for unit tests | JIT; live-Azure parity is required before Supported release |
| External Notification Delivery | SMTP email through MailKit 4.17.0 | Capturing fake for unit tests and pinned Mailpit for integration tests | JIT email channel only |
| Secrets | Standard .NET configuration injection; optional Azure Key Vault configuration provider 1.5.1 with Azure.Identity 1.21.0 | User Secrets, environment variables, and non-sensitive in-memory canaries | Baseline injection is provider-neutral; Key Vault is optional JIT |
| Feature Management | Microsoft.FeatureManagement 4.6.0 over `IConfiguration` | File or in-memory configuration | JIT; any lean-API AOT profile must earn separate evidence |
| Observability Export | OpenTelemetry OTLP exporter 1.17.0 | No exporter by default; Console only for bounded diagnosis; pinned Collector for integration | Optional JIT exporter |

Exact versions above are the research snapshot, not permanent architecture.
Central Package Management and immutable service-image digests own release pins;
upgrading any provider reopens its compatibility, license, supply-chain,
operational, serialization, schema, failure-recovery, and AOT evidence.

### Provider breadth and selection

Valkey is the first distributed-cache service profile because it provides the
required RESP compatibility with a permissive license and avoids making a
tri-licensed Redis 8 deployment the default. The framework seam remains
`IDistributedCache`, optionally composed under `HybridCache`; there is no
MartiX cache facade. The Supported claim requires MartiX conformance tests for
the exact Valkey release, including expiration, serialization, reconnect,
timeouts, cluster behavior used by the profile, outage recovery, and
multi-instance behavior. Redis remains Deferred until a deployment needs it,
its chosen license is recorded and legally accepted, and the same suite passes.
An in-memory cache never satisfies a distributed production profile.

Quartz is the single initial Durable Jobs provider. Its relational ADO JobStore
supports both accepted databases without introducing another storage engine.
Job adapters persist a stable operation name/version and small validated scalar
arguments, reconstruct explicit invocation context, and invoke the same
Application Operation as HTTP or messaging. They do not persist arbitrary CLR
objects, assembly-qualified business types, service providers, or an ambient
Actor. The Migrator owns schema installation and upgrade; a serving host never
creates or upgrades Quartz tables. Hosted Background Work remains the cheaper
choice when persistence, delayed execution, recurrence, recovery, or operator
control is unnecessary.

RabbitMQ is the sole initial external broker. The adapter preserves the
Transactional Outbox and consumer Inbox; it adds durable topology, publisher
confirms, mandatory routing and return handling, bounded prefetch, manual
acknowledgement after Inbox commit, redelivery tolerance, poison handling, and
graceful drain. It promises At-Least-Once Delivery, never exactly-once
transport. Azure Service Bus is the first Deferred broker candidate. Supporting
both immediately would double materially different lock/settlement, topology,
failure, live-service, security, and operating matrices without a current
consumer force. Exactly one broker provider may be selected in a Generated
Solution.

Azure Blob is the sole initial cloud Object Storage provider because it fits
the Microsoft-oriented platform, supports managed identity, and has an Azurite
development path. The provider-independent seam admits streaming reads and
writes, immutable object identity, bounded metadata, content metadata,
conditional concurrency, deletion, and deliberately governed signed access; it
does not expose Azure SDK types to Business Modules. File authorization,
logical naming, validation, scanning, retention, and recovery remain File
Management concerns. AWS S3 is the first Deferred candidate. It must pass the
same contract against one exact AWS SDK and service profile; generic “S3
compatible” is not a support claim. A filesystem fake is never a production
multi-instance provider.

MailKit SMTP is the only initial external notification channel. The application
owns templates, localization, recipient policy, attachment references, and a
durable delivery intent; the adapter owns SMTP/TLS/authentication and maps an
attempt to accepted, transient failure, permanent failure, or cancellation.
Relay acceptance does not claim delivery to a person. Notification Inbox stays
a distinct durable application Capability. Azure Communication Services Email,
Microsoft Graph, SaaS email, SMS, push, and chat remain Deferred until a real
channel requirement justifies their distinct semantics and verification.

Secrets, Feature Management, and observability deliberately use established
.NET seams instead of MartiX abstractions. Hosts bind and validate options from
`IConfiguration`; Azure Key Vault composes as an optional configuration source
and uses managed identity in Azure. Feature flags use
`IVariantFeatureManager` directly and cannot replace authorization, tenancy,
configuration, migrations, commercial entitlements, or durable business state.
Libraries emit `ILogger`, `ActivitySource`, and `IMeterFactory` signals while
the host optionally exports them through OTLP, preferably to an OpenTelemetry
Collector. Exporter failure cannot change business results or readiness, and
diagnostic telemetry never substitutes for the Durable Security Audit Trail.

### Package and project consequences

This catalog adds no project to a Generated Solution. Selected registrations,
workers, and internal adapters live in the already accepted API host, Migrator,
Business Module, and consolidated test projects as their ownership requires.
Unselected providers contribute no package, configuration, worker, health
check, telemetry, container, or deployment resource.

Most providers do not justify a MartiX package:

- cache uses `IDistributedCache` and `HybridCache` directly;
- Quartz remains generated Capability source while it is the only scheduler;
- Azure Blob and MailKit remain generated internal adapters until a second
  provider or proven cross-solution depth stabilizes their public seam;
- secrets use `IConfiguration` and validated options;
- Feature Management uses `Microsoft.FeatureManagement` directly; and
- telemetry uses native .NET instrumentation plus direct OpenTelemetry host
  composition.

Admit one optional provider package,
`MartiX.Platform.IntegrationEvents.RabbitMq`. In-process reliable delivery and
RabbitMQ are two real transport implementations, so ticket 109's smallest
proven transport Interface may now become public for the provider package. The
package depends inward on the existing
`MartiX.Platform.EntityFrameworkCore.ReliableEvents` deep module and contains
only RabbitMQ registration, validated configuration, publish/consume mechanics,
provider failure mapping, and provider-specific evidence. It does not own the
Outbox, Inbox, retry policy, event contracts, authorization, audit, or business
serialization. This is an optional Platform package, not another generated
project. If implementation review shows that the package merely renames the
RabbitMQ client without hiding the accepted transport policy, keep it as
generated source and record that evidence before publication.

### Operational and quality contract

Every selected provider must prove all of the following before release:

1. absent means fully absent from dependencies, configuration, hosted work,
   health, telemetry, containers, artifacts, and deployment resources;
2. startup rejects missing or unsafe required configuration and never falls
   back to Development values;
3. the Capability Manifest and Release Evidence Manifest identify the exact
   provider graph, external revision, image digest, license, and compatibility
   claim;
4. bounded concurrency, timeout, cancellation, backpressure, graceful
   shutdown, dependency loss, recovery, multi-instance behavior, and rolling
   deployment pass deterministic tests;
5. health is bounded, read-only, and role-aware, and affects global readiness
   only when that dependency is required to serve the host role;
6. logs, metrics, traces, Problem Details, health, manifests, and artifacts
   pass secret and classified-data canaries;
7. SDK retries cannot multiply MartiX retries or repeat unsafe business effects;
8. PostgreSQL and SQL Server both pass where equal relational support is
   claimed; and
9. trimming or Native AOT is claimed only for an exact warning-free published
   executable with black-box behavior parity.

Provider-specific signals include backlog age and terminal failures for durable
work, connection loss and recovery for cache and brokers, scheduler misfires
and overdue work, storage operation failures without object names or signed
URLs, and notification attempts without recipient or content dimensions.
Health checks must not scan cache keys, enumerate queues, send messages, write
objects, send email, or expose secret/provider response text.

### Alternatives rejected or Deferred

- SQL-backed distributed caches, Redis, NCache, and remote cache services are
  Deferred; a custom cache service is rejected.
- Hangfire and newer schedulers are Deferred; a custom scheduler and RAM-only
  “durable” jobs are rejected.
- Azure Service Bus, Kafka, MassTransit, NServiceBus, Rebus, Dapr pub/sub, and
  other brokers are Deferred; broker transports never replace Outbox/Inbox.
- AWS S3, MinIO, and database BLOB storage are Deferred; public filesystem
  storage and provider SDK leakage are rejected.
- Additional notification channels are Deferred; synchronous notification
  delivery inside a business transaction and a semantics-erasing
  `INotificationService.Send(object)` are rejected.
- AWS Secrets Manager, HashiCorp Vault, and similar secret providers are
  Deferred; `ISecretStore`, checked-in production secrets, and silent fallback
  are rejected.
- Azure App Configuration is the first Deferred remote flag provider;
  LaunchDarkly, Unleash, OpenFeature, and custom stores await a real portability
  force.
- Azure Monitor and other vendor exporters, direct Prometheus, Serilog, and
  commercial telemetry backends are Deferred; a custom telemetry facade and
  synchronous or unbounded remote export are rejected.

### Client-driven substitution guide

A client's mandated cloud, existing operational platform, procurement contract,
data residency, private-network topology, regulatory control, licensing policy,
support agreement, or workload characteristic may outweigh the initial
provider recommendation. Such a requirement starts a provider-admission
assessment; it does not silently relabel a Deferred provider as Supported.

| Capability | Credible alternative | Client or workload force that may justify reassessment | Required admission and migration evidence |
| --- | --- | --- | --- |
| Distributed Cache | Redis 8 or a managed Redis service | Existing managed service, vendor support agreement, cloud policy, or Redis-specific operational tooling | Exact engine and license approval, protocol and cache conformance, topology and outage tests, data-format compatibility, operating cost, and migration/rollback plan |
| Distributed Cache | SQL Server/PostgreSQL cache | Low-throughput deployment prohibited from operating another service, with measured database capacity available | Workload benchmark, isolation from business workload, cleanup and capacity policy, failure coupling analysis, and proof that latency/SLOs remain acceptable |
| Distributed Cache | NCache or another commercial cache | Existing enterprise license, required vendor support, Windows-oriented estate, or product-specific clustering need | Security and license review, exact client/server compatibility, operational recovery, observability, performance, and provider-conformance suite |
| Durable Jobs | Hangfire | Client requires its dashboard/operator ecosystem or already operates a supported storage/provider combination | PostgreSQL and/or SQL Server storage ownership, dashboard authorization and audit, schema lifecycle, clustering/fencing, retry/idempotency, upgrade, and licensing evidence |
| Durable Jobs | TickerQ or another scheduler | Source-generation/AOT pressure or scheduler functionality materially better matches the workload | Maturity and support review, both claimed relational providers, persistence and schema upgrades, multi-instance recovery, misfires, operator controls, and executable AOT evidence |
| Broker Transport | Azure Service Bus | Azure-native estate, private endpoints, managed broker requirement, enterprise support, sessions, or Service Bus topology already mandated | Live-Azure CI, identity/RBAC/network tests, lock renewal and settlement semantics, duplicate/dead-letter behavior, outage recovery, cost, and Outbox/Inbox conformance |
| Broker Transport | Kafka or an event-streaming platform | Ordered retained streams, replay, partition-scale analytics, or ecosystem integration is a real requirement rather than queue messaging | A separately defined streaming contract, partition/key/order semantics, retention and replay policy, schema governance, consumer offsets, operations, and proof that it is not hidden behind queue semantics |
| Object Storage | AWS S3 | AWS deployment mandate, existing S3 estate, contractual service requirement, or S3-native lifecycle/security controls | Exact AWS SDK and service profile, IAM/private-network/encryption tests, signed access, multipart upload, conditional behavior, live-service CI, migration and egress plan |
| Object Storage | MinIO or another S3-compatible service | On-premises/private-cloud object storage, data-sovereignty requirement, or an already operated service | Exact server profile rather than generic compatibility, conformance gaps, identity/TLS, erasure/recovery, upgrade, lifecycle, support, and portability evidence |
| External Notification Delivery | Azure Communication Services Email, Microsoft Graph, SendGrid, or another email API | Mandated provider, Microsoft 365 sender semantics, delivery analytics, contractual SLA, or SMTP unavailable | Provider-specific authentication, throttling, idempotency, payload/attachment limits, acceptance and bounce/webhook semantics, residency, privacy, cost, failover, and migration evidence |
| External Notification Delivery | SMS, mobile/web push, or chat | The product explicitly requires another recipient channel | A channel-specific contract, consent and recipient lifecycle, template/localization policy, provider callbacks, delivery states, privacy, abuse prevention, rate/cost controls, and tests; never force it through the email seam |
| Secrets | AWS Secrets Manager, HashiCorp Vault, Kubernetes CSI, or platform-native injection | Client deployment platform, centralized security operations, mandated HSM/audit controls, or secret rotation model | Identity and least privilege, network boundary, startup/reload and stale-value semantics, rotation/recovery, audit/redaction, live-service tests, and deployment-specific runbook |
| Feature Management | Azure App Configuration | Azure-native remote flag management, dynamic refresh, or centralized operations is required | Identity/network/outage behavior, refresh consistency, caching, audit, cost, live tests, and proof that application flag semantics remain unchanged |
| Feature Management | LaunchDarkly, Unleash, OpenFeature, or another service | Existing enterprise platform, experimentation/targeting needs, cross-language governance, or vendor-neutral flag API mandate | Semantic gap analysis, targeting and privacy controls, offline/outage behavior, audit/export, SDK lifecycle, cost, migration of definitions, and conformance tests |
| Observability Export | Azure Monitor/Application Insights or another vendor exporter | Client monitoring contract, Azure operations, direct-ingestion requirement, or an OTLP/Collector path cannot satisfy a measured constraint | Signal and sampling parity, resource mapping, data residency, authentication, redaction, failure/backpressure, cost/cardinality, duplicate-export prevention, and outage tests |
| Observability Export | Prometheus-compatible metrics endpoint | Existing pull-based monitoring estate or platform policy requires scraping | Endpoint security and isolation, stable metric contract, cardinality and scrape-cost limits, multi-instance behavior, and coexistence or replacement rules for OTLP metrics |
| Logging | Serilog or another structured logging provider | Required sink ecosystem or logging features cannot be met by the accepted `ILogger` pipeline | Measured functional need, duplicate-event prevention, configuration and redaction parity, bounded asynchronous delivery, failure behavior, dependency/license review, and retention ownership |

When a client force is accepted, record it in an ADR and Capability Manifest,
name the exact provider and profile, update the Capability Matrix, add provider-
specific documentation and migration/rollback guidance, and require its full
Composed Quality Profile before production use. Prefer adapting behind the
existing deep contract. Change the contract only when the alternative exposes a
genuine semantic difference—such as Kafka's retained streams or SMS consent—
that should not be hidden by a lowest-common-denominator abstraction.

**Why:** one well-attested provider per capability produces a smaller, more
reliable starting point than a broad catalog of nominally supported adapters.
Framework seams avoid shallow abstractions; a provider package exists only
where real variation and reusable protocol behavior already exist. Explicit
deferred candidates preserve enterprise growth paths without charging every new
application their dependency, project, operational, and verification cost.

## Current implementation and migration direction

The current WebApi implementation and templates are migration input only. Do
not preserve an existing cache, scheduler, storage, notification, secrets,
feature-flag, messaging, or telemetry wrapper because it already exists.
Replace shallow wrappers with the selected standard seams, retain only behavior
that satisfies this contract, and isolate the one admitted RabbitMQ dependency
in its provider package. Migration first establishes Capability Manifest
selection and absence tests, then provider-independent conformance fixtures,
then one provider at a time with exact release evidence. No provider enters a
Preset until its full profile is green.

## Evidence and follow-on ownership

The detailed comparison, exact-version snapshot, licenses, primary sources,
AOT caveats, emulator limitations, package consequences, and promotion evidence
are recorded in [the infrastructure provider research](../research/119-infrastructure-provider-catalog.md).
**Design local development and deployment profiles** owns containers, startup
ordering, secret injection, Aspire and Docker composition, immutable images,
and cloud-neutral deployment shapes. **Define executable quality gates and
template verification** owns the executable provider matrix and release
thresholds. Later provider promotion requires a real Generated Solution or
deployment force, the existing conformance suite, provider-specific security
and operational evidence, documentation and migration guidance, and an updated
Capability Matrix.
