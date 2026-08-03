# Infrastructure provider catalog for ticket 119

## Research scope

Research date: **2026-07-19**.

This document evaluates concrete .NET 10-compatible providers for distributed
caching, Durable Jobs, broker transport, Object Storage, notification delivery,
secrets, Feature Management, and observability export. It is evidence for
Wayfinder ticket 119, not an accepted decision by itself.

Only primary sources were used: Microsoft and vendor documentation, project
repositories, release records, specifications, and NuGet package pages. A
package targeting `net8.0`, `net10.0`, or .NET Standard is treated as .NET 10
reference compatibility, not as trimming or Native AOT proof. Microsoft states
that Native AOT implies trimming and prohibits facilities such as runtime code
generation and dynamic assembly loading; an executable publish and behavioral
test remain necessary evidence ([Native AOT deployment](https://learn.microsoft.com/en-us/dotnet/core/deploying/native-aot/)).

The recommendations preserve the accepted MartiX boundaries:

- none of these providers is part of the Platform Baseline;
- every provider is generated only when its Capability is selected;
- the `api` preset remains lean and may retain a provider-free Native AOT lane;
- initial modular-monolith and full-stack combinations are honest JIT profiles;
- PostgreSQL remains the relational default and SQL Server remains equally
  Supported;
- provider SDK types do not cross Application or Business Module boundaries;
- existing framework abstractions are preferred over MartiX wrappers;
- provider registration and visible policy live in generated host or existing
  infrastructure source, without adding a project per provider; and
- health, telemetry, failure, shutdown, and upgrade evidence attach to the exact
  provider combination.

## Recommended catalog at a glance

| Capability | Recommended initial provider | Development and test | Initial claim |
| --- | --- | --- | --- |
| Distributed cache | `Microsoft.Extensions.Caching.StackExchangeRedis` 10.0.10 against an exact RESP-compatible service profile | `AddDistributedMemoryCache` for unit/development-only scenarios; Testcontainers 4.13.0 for integration | Supported JIT after Valkey/Redis service conformance; no AOT claim yet |
| Durable Jobs | Quartz.NET 3.18.2 with ADO JobStore and System.Text.Json | The same PostgreSQL or SQL Server store in Testcontainers; RAMJobStore only for isolated scheduler tests | Supported JIT only |
| Broker transport | RabbitMQ.Client 7.2.1 with RabbitMQ 4.3.2 | Testcontainers.RabbitMq 4.13.0 | Supported JIT; AOT remains unclaimed until executable evidence |
| Object Storage | Azure.Storage.Blobs 12.29.1 | Azurite 3.35.0 through Testcontainers.Azurite 4.13.0; bounded filesystem fake for unit tests only | Supported JIT; AOT remains unclaimed |
| Notification delivery | SMTP through MailKit 4.17.0 | Capturing fake for unit tests and Mailpit 1.30.0 for integration | Supported JIT email channel only |
| Secrets | Standard .NET configuration; optional Azure Key Vault configuration provider 1.5.1 with Azure.Identity 1.21.0 | User Secrets and environment injection, explicitly non-production | Baseline uses deployment injection; Azure Key Vault is optional Supported JIT |
| Feature Management | Microsoft.FeatureManagement 4.6.0; add ASP.NET Core package only when transport integration is used | `appsettings*.json` and in-memory configuration | Supported JIT; lean API AOT requires a separate exact publish lane |
| Observability export | OTLP through OpenTelemetry.Exporter.OpenTelemetryProtocol 1.17.0 | No exporter by default; Console exporter 1.17.0 for diagnosis; Collector 0.153.0 for integration | Optional Supported JIT exporter; no vendor backend required |

“Supported” above is conditional on the ticket 112 executable release gates. It
does not mean that installing a package is sufficient.

## Distributed caching

### Initial distributed-cache shape

Use the framework `IDistributedCache` contract and
`Microsoft.Extensions.Caching.StackExchangeRedis` **10.0.10**. The package
targets `net10.0`, supplies `RedisCache`, and is MIT-licensed; it depends on
StackExchange.Redis rather than adding a MartiX cache abstraction
([NuGet package](https://www.nuget.org/packages/Microsoft.Extensions.Caching.StackExchangeRedis/10.0.10)).
Microsoft's .NET 10 guidance recommends Redis for most production distributed
caches because it normally offers higher throughput and lower latency than SQL
cache providers, while still requiring workload benchmarks
([distributed caching guidance](https://learn.microsoft.com/en-us/aspnet/core/performance/caching/distributed?view=aspnetcore-10.0)).

If stampede protection, local-primary plus distributed-secondary caching, and
tag invalidation are needed, compose the provider under `HybridCache`; it uses
the configured `IDistributedCache` as secondary storage
([HybridCache guidance](https://learn.microsoft.com/en-us/aspnet/core/performance/caching/hybrid?view=aspnetcore-10.0)).
Do not make HybridCache or a distributed provider mandatory merely because the
Capability exists.

The service engine must be explicit. Two viable candidates require different
governance:

- **Valkey 9.1.0** is the preferred conformance candidate for a permissively
  licensed self-hosted service. Valkey documents RESP2/RESP3 compatibility and
  states that existing Redis clients can connect without code changes
  ([migration and compatibility](https://valkey.io/topics/migration/)); its
  current release is recorded by the official repository
  ([Valkey releases](https://github.com/valkey-io/valkey/releases)). The exact
  cache operations, scripts, expiration, reconnect, cluster, and failure
  behavior used by the Microsoft provider still need MartiX tests before the
  Valkey combination is marked Supported.
- **Redis 8.8.0** is a concrete alternative with official images and an active
  release line ([Redis 8.8.0 release](https://github.com/redis/redis/releases/tag/8.8.0)).
  Redis 8 and later are tri-licensed under RSALv2, SSPLv1, or AGPLv3; the
  deployment must record the chosen license and receive legal review rather
  than inheriting the MIT license of the .NET client
  ([Redis licensing](https://redis.io/legal/licenses/)).

Ticket 120 should pin the chosen server image by digest. Ticket 119 should not
call a generic “Redis” selection Supported without naming which engine and
release family was tested.

### Distributed-cache development, tests, operations, and AOT

`AddDistributedMemoryCache` is useful for development and testing but is not
distributed: each process owns its entries. Microsoft explicitly documents
that limitation, so it must never satisfy a multi-instance production manifest
([distributed memory cache](https://learn.microsoft.com/en-us/aspnet/core/performance/caching/distributed?view=aspnetcore-10.0#distributed-memory-cache)).
Use `Testcontainers.Redis` **4.13.0** or a generic pinned Valkey container for
real integration tests; Testcontainers 4.13.0 targets .NET 8 and is compatible
with .NET 10 ([Testcontainers.Redis](https://www.nuget.org/packages/Testcontainers.Redis/4.13.0)).

Health should report connection restoration, latency, timeout, and capacity as
Capability signals. It should affect global readiness only when nearly all
served operations require the cache. StackExchange.Redis exposes connection
failed/restored and error events suitable for bounded operational signals
([client events](https://stackexchange.github.io/StackExchange.Redis/Events.html)).
Do not run key scans in a health check.

No trimming or Native AOT claim is recommended initially. The exact provider,
serializer metadata for cached values, outage behavior, and generated host must
pass ticket 112's native publish and black-box matrix first.

### Distributed-cache alternatives

- `Microsoft.Extensions.Caching.Postgres` and
  `Microsoft.Extensions.Caching.SqlServer` are **Deferred**, not rejected. They
  reuse an already selected database technology but compete with application
  workload; Microsoft recommends a dedicated SQL Server instance when using it
  for cache and calls Redis the usual higher-throughput option
  ([provider comparison](https://learn.microsoft.com/en-us/aspnet/core/performance/caching/distributed?view=aspnetcore-10.0#recommendations)).
- NCache and Cosmos providers are Deferred until a real deployment force and
  exact conformance profile exist.
- A custom `ICacheService`, repository, JSON envelope, or universal cache-key
  hierarchy is **rejected**. Use framework contracts and Capability-owned typed
  helpers only where repeated semantics are proven.

## Durable Jobs

### Initial Durable Jobs shape

Use Quartz.NET **3.18.2** in JIT profiles:

- `Quartz.Extensions.Hosting` 3.18.2 integrates scheduler lifetime with the
  Generic Host and supports graceful wait-on-shutdown
  ([hosting package](https://www.nuget.org/packages/Quartz.Extensions.Hosting/3.18.2));
- `Quartz.AspNetCore` 3.18.2 adds ASP.NET Core integration and a net10.0 asset
  with health-check dependencies
  ([ASP.NET Core package](https://www.nuget.org/packages/Quartz.AspNetCore/3.18.2));
- `Quartz.Serialization.SystemTextJson` 3.18.2 supplies the recommended JSON
  persistence serializer; Quartz recommends `UseProperties = true` so job data
  remains strings rather than arbitrary object graphs
  ([serializer package](https://www.nuget.org/packages/Quartz.Serialization.SystemTextJson/3.18.2)); and
- Quartz ADO JobStore has dedicated PostgreSQL and SQL Server delegates, so the
  provider matrix can use either accepted relational engine without adopting a
  second database technology
  ([configuration reference](https://www.quartz-scheduler.net/documentation/quartz-3.x/configuration/reference.html)).

Quartz packages are Apache-2.0 licensed. The operational cost is not trivial:
Quartz owns a separate table set and schema lifecycle, clustering identity,
misfire policy, trigger acquisition, and cleanup. The capability must generate
and validate those artifacts explicitly; the serving API must not create or
upgrade tables on startup.

Application Operations remain the business entry point. Persist only stable
operation name/version and small validated scalar arguments. Do not persist an
assembly-qualified type, arbitrary CLR object, service provider, or ambient
Actor. Quartz job types are adapters that reconstruct explicit invocation
context and call the same authorized Application Operation used by HTTP or
messaging.

### Durable Jobs development, tests, operations, and AOT

High-fidelity tests use the same ADO JobStore against the already selected
Testcontainers PostgreSQL or SQL Server instance. RAMJobStore is acceptable
only for isolated scheduling tests; because it loses state on restart, it
cannot prove durable execution, multi-instance fencing, failover, misfires, or
recovery.

Required signals include scheduler started/standby, trigger acquisition,
execution outcome and duration, misfires, retries, stuck/overdue work, database
connectivity, and graceful shutdown. Database loss may make a dedicated worker
unready; it should not automatically make an API host unready when job
execution is not required for serving requests.

The initial claim is **JIT only**. Quartz relies on configurable job types and a
persistent serializer; `net10.0` assets do not establish reflection-disabled
Native AOT behavior. A future AOT promotion requires a generated closed job
registry, warning-free native publish, restart/failover tests, and parity with
JIT.

### Durable Jobs alternatives

- Hangfire is Deferred. Its dashboard and ecosystem are attractive, but equal
  PostgreSQL and SQL Server support crosses different storage packages and
  ownership, while MartiX already owns its authorization, audit, and reliable
  execution contracts.
- TickerQ and other source-generated schedulers are Deferred until maturity,
  both relational providers, upgrade behavior, clustering, and release evidence
  satisfy the same contract.
- A custom scheduler, mandatory dashboard, or RAM-only “durable” provider is
  rejected. `BackgroundService` and bounded Channels remain the lower-cost
  Hosted Background Work capability, not a substitute for Durable Jobs.

## Broker transport

### Initial broker-transport shape

Use RabbitMQ.Client **7.2.1** with RabbitMQ Server **4.3.2** for the first
external broker provider. The client targets .NET 8 and is therefore compatible
with .NET 10; it is dual Apache-2.0/MPL-2.0 licensed
([RabbitMQ.Client package](https://www.nuget.org/packages/RabbitMQ.Client/7.2.1)).
RabbitMQ 4.3 is the current fully supported server series as of the research
date, with 4.3.2 the current patch
([RabbitMQ release information](https://www.rabbitmq.com/release-information)).

Use the narrow transport seam already identified by ticket 109. The adapter
publishes the persisted MartiX envelope and maps broker results to acknowledged,
transient failure, permanent failure, or cancellation. It does not replace the
relational Outbox, Inbox, schema compatibility, or Application authorization.

RabbitMQ's own guide requires publisher confirms for publishers that cannot
afford message loss, warns that automatic connection recovery does not buffer
publishes, and requires consumers to tolerate redelivery
([.NET client guide](https://www.rabbitmq.com/client-libraries/dotnet-api-guide)).
Therefore the initial adapter must use durable topology, publisher confirms,
mandatory routing/return handling, manual consumer acknowledgement only after
Inbox commit, bounded prefetch, and explicit poison/terminal handling. It must
not claim exactly-once delivery.

### Broker development, tests, operations, and AOT

Use `Testcontainers.RabbitMq` **4.13.0** for broker integration and recovery
tests ([NuGet package](https://www.nuget.org/packages/Testcontainers.RabbitMq/4.13.0)).
Tests must exercise broker absence at startup, connection loss after publish,
confirm timeout, unroutable messages, duplicate delivery, consumer crash before
acknowledgement, queue capacity, restart, and graceful drain.

The stable RabbitMQ OpenTelemetry instrumentation package has not yet been
released: `RabbitMQ.Client.OpenTelemetry` is **1.0.0-rc.2** as of the research
date ([prerelease package](https://www.nuget.org/packages/RabbitMQ.Client.OpenTelemetry/1.0.0-rc.2)).
Do not make it a Supported dependency. Instrument the MartiX transport boundary
with the already accepted `ActivitySource` and metrics contract, propagate only
the classified W3C context, and consume stable provider instrumentation later.

RabbitMQ.Client has addressed a historical trimming warning and its repository
describes the .NET 8 asset as trim-compatible
([completed AOT issue](https://github.com/rabbitmq/rabbitmq-dotnet-client/issues/1410)).
That is useful upstream evidence but not enough to declare the full generated
broker profile Native AOT. Keep the initial profile JIT and run ticket 112's
native artifact tests before promotion.

### Broker alternatives

- `Azure.Messaging.ServiceBus` **7.20.2** is the leading Deferred second broker
  provider. It targets .NET 8 and is MIT licensed
  ([NuGet package](https://www.nuget.org/packages/Azure.Messaging.ServiceBus/7.20.2)),
  but adds Azure operational semantics and lacks a fully faithful local broker;
  promote it when an Azure deployment profile needs it and live-service CI can
  prove locks, settlement, sessions if used, duplicate detection, and outage
  behavior.
- MassTransit is Deferred rather than layered over the initial adapter. Its
  broader bus, topology, middleware, and outbox facilities would overlap the
  MartiX contracts and expand the dependency graph.
- Kafka, NServiceBus, Rebus, Dapr pub/sub, and cloud-specific brokers are
  Deferred until a workload force exists.
- Using Redis pub/sub, an in-memory queue, or direct HTTP as the Supported
  external durable broker is rejected.

## Object Storage

### Initial Object Storage shape

Use Azure Blob Storage through `Azure.Storage.Blobs` **12.29.1** as the first
Object Storage provider. The SDK targets .NET 8 and .NET Standard 2.0, is MIT
licensed, supports streaming, conditional requests, metadata, leases, and
Microsoft Entra authentication through `TokenCredential`
([NuGet package](https://www.nuget.org/packages/Azure.Storage.Blobs/12.29.1)).
It is optional and does not make Azure a Platform default.

The MartiX Object Storage seam is justified because Azure Blob and S3-like
providers have real variation. Keep it capability-specific and semantic:
stream read/write, immutable object identity, content type and length, bounded
metadata, conditional concurrency, delete, and explicit signed-access policy if
admitted. Do not expose `BlobClient`, `BlobUriBuilder`, Azure response types, or
provider exception types to Business Modules. File Management concerns such as
authorization, scanning, logical names, retention, and database metadata remain
above the storage adapter.

### Object Storage development, tests, operations, and AOT

Use Azurite **3.35.0**, exact commit `fd1103b`, for local and CI fidelity. It is
MIT licensed and documents both its supported APIs and important differences
from Azure Storage
([Azurite release](https://github.com/Azure/Azurite/releases/tag/v3.35.0),
[support matrix](https://github.com/Azure/Azurite#support-matrix)). Run it with
`Testcontainers.Azurite` **4.13.0**
([NuGet package](https://www.nuget.org/packages/Testcontainers.Azurite/4.13.0)).
A bounded filesystem or in-memory adapter is acceptable for unit tests only; it
must not be used to claim Azure semantics, concurrency, authentication, signed
URLs, or multi-instance behavior.

Health checks should use a bounded read-only account/container operation only
when Object Storage is a hard dependency for the host role. Instrument SDK
requests through the Azure SDK's standard diagnostics and MartiX operation
signals; never record object names, signed URLs, credentials, or payloads.

No trimming or AOT claim is made initially. A future claim requires a warning-
free native publish with the exact Azure.Identity credential subset, streaming
upload/download, conditional operations, cancellation, failure mapping, and
Azurite plus live-Azure parity tests.

### Object Storage alternatives

- `AWSSDK.S3` **4.0.101.3** and MinIO SDK **7.0.0** are Deferred candidates.
  The AWS package is Apache-2.0 licensed
  ([AWSSDK.S3 versions](https://www.nuget.org/packages/AWSSDK.S3/4.0.101.3));
  the MinIO SDK is Apache-2.0 licensed and targets .NET 8
  ([MinIO package](https://www.nuget.org/packages/Minio/7.0.0)). Add an S3
  provider only after one exact SDK and one exact server/service profile pass
  the same conformance suite; “S3 compatible” is not a complete behavior
  contract.
- Database BLOB storage is Deferred for small transactional artifacts, not a
  universal Object Storage provider.
- A public local-filesystem production provider, exposing provider SDK models,
  buffering whole files, or storing arbitrary user paths is rejected.

## Notification delivery

### Initial notification-delivery shape

Support one initial external channel: email over SMTP using MailKit **4.17.0**.
MailKit targets .NET 8 and .NET Standard 2.0 and is MIT licensed
([NuGet package](https://www.nuget.org/packages/MailKit/4.17.0)). Its SMTP client
supports asynchronous cancellable connect/send/disconnect and modern SMTP
extensions including STARTTLS and SMTPUTF8
([MailKit introduction](https://mimekit.net/docs/html/Introduction.htm)).
Microsoft explicitly does not recommend `System.Net.Mail.SmtpClient` for new
development and points to MailKit or another modern library
([Microsoft API guidance](https://learn.microsoft.com/en-us/dotnet/api/system.net.mail.smtpclient?view=net-10.0)).

The provider consumes a durable Notification Delivery intent outside the
originating business transaction. The seam carries a validated recipient,
template or composed subject/body, culture, bounded attachment references, and
idempotency/correlation facts; it does not expose `MimeMessage`. Provider
responses map to accepted, transient, permanent, or cancellation. The platform
does not claim final human delivery merely because an SMTP relay accepted a
message.

TLS is required in production unless a documented private relay threat model
allows otherwise. Validate recipient and message size, reuse connections only
within a bounded concurrency/lifetime policy, redact addresses and content from
ordinary telemetry, and keep templates out of transport code.

### Notification development, tests, operations, and AOT

Use a deterministic capturing adapter for unit tests. Use Mailpit **1.30.0**,
commit `af8756a`, in a generic Testcontainers container for SMTP integration.
Mailpit is MIT licensed, exposes an API for assertions, supports TLS and auth,
and includes controlled SMTP failure injection
([Mailpit repository](https://github.com/axllent/mailpit),
[1.30.0 release](https://github.com/axllent/mailpit/releases/tag/v1.30.0)).
Never route Development messages to real recipients by default.

Signals cover durable backlog age, attempts, provider acceptance, stable failure
class, latency, and terminal failure. Email address, subject, body, attachment,
and provider response text are classified data and not metric dimensions.

The initial claim is JIT. MailKit's target framework compatibility is not Native
AOT proof; promotion requires reflection-disabled MIME composition, TLS/auth,
attachment streaming, cancellation, and failure tests in the native artifact.

### Notification alternatives

- Azure Communication Services Email, Microsoft Graph, SendGrid, SMS, push, and
  chat channels are Deferred until a real channel requirement exists.
- A generic `INotificationService.Send(object)` and a single interface that
  erases materially different email/SMS/push semantics are rejected.
- Synchronous email inside a database transaction and direct reliance on
  `System.Net.Mail.SmtpClient` are rejected.

## Secrets

### Initial secrets shape

Do not introduce `ISecretStore`. Application code should consume validated
options or provider clients, while the generated host composes standard .NET
configuration sources. Deployment-injected environment or mounted values remain
the vendor-neutral baseline, with fail-fast options validation and no secret
values in logs, health, Problem Details, or the Capability Manifest.

For Azure deployments, support
`Azure.Extensions.AspNetCore.Configuration.Secrets` **1.5.1** plus
`Azure.Identity` **1.21.0**. The Key Vault package is MIT licensed, targets .NET
8, integrates directly with `IConfiguration`, and uses thread-safe Azure SDK
clients ([configuration-provider package](https://www.nuget.org/packages/Azure.Extensions.AspNetCore.Configuration.Secrets/1.5.1)).
Azure.Identity is also MIT licensed and provides the `TokenCredential`
implementations used by Azure SDK clients
([Azure.Identity package](https://www.nuget.org/packages/Azure.Identity/1.21.0)).
Use managed identity in Azure rather than a client secret; Microsoft recommends
managed identity for applications
([Key Vault authentication](https://learn.microsoft.com/en-us/azure/key-vault/general/authentication)).

The configuration provider needs both secret-list and secret-read permissions;
that operational fact can make it broader than retrieving individually named
secrets, so least-privilege review is mandatory
([provider RBAC requirements](https://www.nuget.org/packages/Azure.Extensions.AspNetCore.Configuration.Secrets/1.5.1#readme-body-tab)).
Select and prefix only application-owned keys through a `KeyVaultSecretManager`,
validate naming, and set an explicit reload policy. A required secret unavailable
at startup must fail startup; a stale value must not silently become an empty or
development default.

### Secrets development, tests, operations, and AOT

Use User Secrets and explicit environment injection for development. Microsoft
states that User Secrets are not encrypted and are development-only
([ASP.NET Core app secrets](https://learn.microsoft.com/en-us/aspnet/core/security/app-secrets?view=aspnetcore-10.0)).
Tests use unique non-sensitive canary values through in-memory configuration;
they verify precedence, validation, reload behavior, and complete telemetry
redaction. Do not build or require a fake Key Vault server for unit tests.
Live Azure tests are required for the Azure provider's identity, RBAC, network,
rotation, outage, and recovery behavior.

No AOT claim is recommended initially because Azure.Identity selects credential
implementations dynamically and the full generated configuration path must be
tested. An AOT profile, if required, should register the narrow exact credential
type for its deployment rather than `DefaultAzureCredential`, then pass native
publish and live-service smoke tests.

### Secrets alternatives

- AWS Secrets Manager, HashiCorp Vault, Kubernetes CSI, and Azure App
  Configuration Key Vault references are Deferred deployment providers.
- A checked-in development secret, plaintext production `appsettings`, command-
  line secret, silent optional fallback, or universal secret CRUD abstraction
  is rejected.
- Key Vault is not a general-purpose runtime database. High-frequency dynamic
  secret reads belong behind a separately designed provider client and cache,
  not configuration evaluation on every operation.

## Feature Management

### Initial Feature Management shape

Use `Microsoft.FeatureManagement` **4.6.0** for Application-level evaluation;
add `Microsoft.FeatureManagement.AspNetCore` **4.6.0** only when ASP.NET Core
endpoint, MVC, Razor, or targeting integration is actually used. Both are MIT
licensed, target .NET 8, and are compatible with .NET 10
([core package](https://www.nuget.org/packages/Microsoft.FeatureManagement/4.6.0),
[ASP.NET Core package](https://www.nuget.org/packages/Microsoft.FeatureManagement.AspNetCore/4.6.0)).

The library is already built on `IConfiguration`; any .NET configuration
provider can supply flags. It provides Percentage, TimeWindow, and contextual
targeting filters, variants, request-consistent
`IVariantFeatureManagerSnapshot`, and opt-in Activity-based evaluation telemetry
([official .NET reference](https://learn.microsoft.com/en-us/azure/azure-app-configuration/feature-management-dotnet-reference)).
Use the current `feature_management` schema; the older `FeatureManagement`
schema does not support newer variants and telemetry.

Do not wrap `IVariantFeatureManager` in another generic MartiX interface.
Business decisions that must be historically reproducible should capture the
chosen decision/variant in durable business state; a mutable feature flag is not
an authorization permission, consistency mechanism, or durable audit record.
Fail on missing configured filters rather than enabling the library's ignore-
missing fallback.

### Feature Management development, tests, operations, and AOT

The initial provider is ordinary `appsettings*.json` plus standard configuration
overrides. This adds no network service. Tests use in-memory configuration and
cover enabled, disabled, missing, targeting, variant, refresh, and request-
snapshot behavior. Keep flag names and telemetry metadata bounded and
non-sensitive.

The exact 4.6.0 combination is Supported initially for JIT. A lean API Native
AOT declaration remains possible only after ticket 112's reflection-disabled
publish and behavior suite proves all selected filters and targeting-context
composition; no dynamic filter discovery or assembly scanning is allowed.

### Feature Management alternatives

- Azure App Configuration is the leading Deferred remote provider. It composes
  through `IConfiguration`, supports refresh and adds feature-evaluation
  telemetry metadata
  ([configuration-provider reference](https://learn.microsoft.com/en-us/azure/azure-app-configuration/reference-dotnet-provider)).
  Promote it with an Azure deployment profile and live tests rather than adding
  another Application abstraction.
- LaunchDarkly, Unleash, OpenFeature, database-backed custom definitions, and
  other SaaS providers are Deferred until cross-provider forces justify a new
  seam.
- Feature flags as authorization, permanent configuration, database migration
  switches, or an unbounded user/tenant metric dimension are rejected.

## Observability export

### Initial observability-export shape

Keep the accepted native instrumentation (`ILogger`, `ActivitySource`, and
`IMeterFactory`) independent from export. The initial optional production
exporter is `OpenTelemetry.Exporter.OpenTelemetryProtocol` **1.17.0**, an
Apache-2.0 package targeting .NET 8 and .NET Standard 2.0 that exports logs,
metrics, and traces via OTLP
([NuGet package](https://www.nuget.org/packages/OpenTelemetry.Exporter.OpenTelemetryProtocol/1.17.0)).
OTLP preserves the OpenTelemetry data model and supports a Collector or many
vendor backends; OpenTelemetry recommends a Collector in production
([.NET exporters](https://opentelemetry.io/docs/languages/dotnet/exporters/)).

The exporter remains host composition. Libraries never reference exporter or
vendor packages. Configuration uses standard OTLP endpoint/protocol variables,
TLS and authentication supplied by deployment, bounded batches/queues, explicit
sampling, resource identity, shutdown flush budget, and the accepted
classification/redaction contract
([OTLP configuration](https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/)).
Exporter failure must not change business results or global readiness; dropped
diagnostic telemetry is observable but is not upgraded into Durable Audit.

### Observability development, tests, operations, and AOT

No exporter is the default Development adapter. This proves that instrumentation
has no hidden backend dependency. `OpenTelemetry.Exporter.Console` **1.17.0** is
allowed for bounded local diagnosis only; its own package documentation says the
format is unstable and not recommended for production
([Console exporter](https://www.nuget.org/packages/OpenTelemetry.Exporter.Console/1.17.0)).

Use OpenTelemetry Collector **0.153.0**, release commit `452cae1`, as the exact
integration receiver. The official release repository is Apache-2.0 licensed
and publishes binaries and images
([Collector release](https://github.com/open-telemetry/opentelemetry-collector/releases/tag/v0.153.0)).
Tests assert all three signals, resource identity, propagation, classification,
bounded cardinality, exporter absence, receiver outage, buffer/loss policy,
recovery, duplicates, and shutdown.

The exact exporter receives a Supported **JIT** claim only. A future Native AOT
claim must include the entire SDK, instrumentation packages, exporter protocol,
TLS/auth handler, and generated host, with zero relevant warnings and signal
parity. No provider inherits an AOT claim from the OpenTelemetry API alone.

### Observability alternatives

- Azure Monitor, Application Insights, Seq, Datadog, New Relic, Grafana Cloud,
  direct Prometheus, Jaeger, and Zipkin exporters are Deferred backend-specific
  profiles. Prefer OTLP to a Collector unless a measured operational constraint
  requires a direct exporter.
- The Prometheus ASP.NET Core exporter is still prerelease in the current
  OpenTelemetry .NET documentation, which recommends OTLP for production
  ([Prometheus exporter status](https://opentelemetry.io/docs/languages/dotnet/exporters/#prometheus)).
- Serilog remains Deferred as an explicit logging provider, consistent with
  ticket 111. It is not required to export OpenTelemetry.
- A custom `ITelemetryService`, synchronous remote export, unbounded queues,
  duplicate Console plus OTLP log emission, and exporter failure affecting
  business success are rejected.

## Package and project consequences

The initial recommendation does **not** require eight new projects. Selected
provider registrations and adapters should live in visible generated source or
the already justified deep package boundary:

| Provider | Runtime references only when selected | Test-only references or service |
| --- | --- | --- |
| Distributed cache | `Microsoft.Extensions.Caching.StackExchangeRedis` 10.0.10; optionally `Microsoft.Extensions.Caching.Hybrid` after separate version approval | Testcontainers 4.13.0 plus exact Valkey/Redis image |
| Durable Jobs | Quartz 3.18.2 hosting, ASP.NET Core, and STJ packages; existing Npgsql or SqlClient | Existing database Testcontainers fixture |
| RabbitMQ | RabbitMQ.Client 7.2.1 | Testcontainers.RabbitMq 4.13.0 and RabbitMQ 4.3.2 |
| Azure Blob | Azure.Storage.Blobs 12.29.1; Azure.Identity 1.21.0 when Entra auth is used | Testcontainers.Azurite 4.13.0 and Azurite 3.35.0 |
| SMTP | MailKit 4.17.0 | Capturing fake and Mailpit 1.30.0 container |
| Azure Key Vault | Configuration.Secrets 1.5.1 and Azure.Identity 1.21.0 | In-memory configuration plus live Azure lane |
| Feature Management | Microsoft.FeatureManagement 4.6.0; ASP.NET Core companion only when used | No extra test package |
| OTLP | OTLP exporter 1.17.0 and the exact selected stable OpenTelemetry SDK/instrumentation set | Console exporter 1.17.0 only when desired; Collector 0.153.0 |

Central Package Management must pin every direct and security-sensitive
transitive dependency. An upgrade retriggers restore audit, license/SBOM review,
JIT provider tests, failure/recovery tests, and every claimed trim/AOT lane.

### Initial breadth: one broker and one cloud Object Storage provider

Supporting both RabbitMQ and Azure Service Bus initially is **not justified**.
They are not simple endpoint substitutions: RabbitMQ confirmation, routing,
topology and acknowledgement behavior differs from Service Bus settlement,
locks, sessions, duplicate detection, dead-lettering and entity administration.
Azure Service Bus also requires a live Azure evidence lane because there is no
fully faithful local service. A second Supported broker would therefore roughly
double the failure, recovery, security, operations and rolling-upgrade matrix
before an accepted workload requires it. The in-process durable adapter plus
RabbitMQ are already two real transport implementations and are sufficient to
validate the narrow ticket 109 seam. Azure Service Bus remains the first
promotion candidate, not a copied stub.

Supporting both Azure Blob and AWS S3 initially is also **not justified**. They
would provide useful cloud neutrality, but signed access, conditional requests,
multipart/block upload, metadata, identity, encryption, versioning, retention,
emulator fidelity and error models differ materially. Supporting both means two
live-cloud lanes and two security/operations profiles. Azure Blob is the more
coherent first provider for the current Microsoft-oriented platform and has the
high-fidelity Azurite development path. AWS S3 remains the first Deferred
provider and the Object Storage contract must avoid Azure-only assumptions so
its later addition does not require Business Module changes.

This is a KISS/release-evidence decision, not a claim that either deferred
provider is inferior. Promote the second provider when a real Generated Solution
or deployment preset needs it; then use the existing conformance suite as the
admission gate.

### MartiX package threshold

Most initial providers do not justify a MartiX package or another Generated
Solution project:

| Capability | Initial ownership | Reason |
| --- | --- | --- |
| Distributed cache | Direct generated host registration against `IDistributedCache`/`HybridCache` | The framework already owns the stable abstraction and DI contract |
| Durable Jobs | Generated Capability source and host composition in existing projects | One provider; Application Operation adapters and policy are solution-visible, while Quartz owns scheduling |
| Broker transport | A small optional RabbitMQ provider package is justified; no new Generated Solution project | Ticket 109 already owns deep reliable-event behavior in the EF Core package, while the vendor SDK must not pollute that base package; in-process plus RabbitMQ proves the transport seam |
| Object Storage | Generated internal Capability contract and Azure adapter initially | One Supported provider is insufficient to freeze a public package API; promote/extract when S3 is admitted or reuse proves depth |
| Notification delivery | Generated notification-delivery source and internal MailKit adapter | Only SMTP is Supported; channel semantics and templates remain application-specific |
| Secrets | Direct `IConfiguration` composition in the host | A MartiX secret wrapper would erase provider configuration, identity and reload semantics |
| Feature Management | Direct `Microsoft.FeatureManagement` registration and use | `IConfiguration` plus `IVariantFeatureManager` already provide the required seams |
| Observability export | Direct OpenTelemetry host composition | Instrumentation is native and exporter-independent; a MartiX telemetry facade was already rejected |

The optional RabbitMQ package should contain only transport registration,
configuration validation, publish/receive mechanics, provider failure mapping,
and provider-specific tests. It must consume the narrow reliable-event transport
contract and must not re-own Outbox, Inbox, retries, serialization, authorization,
or audit. If implementation work shows that this package would be shallow, keep
it as generated source until depth is proven; package count is not a goal by
itself.

## Cross-provider release gates

Before any row is emitted as Supported, the generated manifest and release
evidence should prove:

1. the Capability is absent, including packages, workers, configuration, health
   checks, and instruments, when not selected;
2. startup rejects missing or unsafe required configuration without falling
   back to Development values;
3. exact provider service, SDK/package graph, license, and image digest are
   recorded;
4. multi-instance correctness, bounded concurrency, cancellation, timeout,
   graceful shutdown, dependency loss, recovery, and rolling deployment pass;
5. health semantics match hard versus optional dependencies and never perform
   expensive or side-effecting checks;
6. logs, metrics, traces, Problem Details, health, manifests, and artifacts pass
   secret and classified-data canaries;
7. provider retries cannot multiply MartiX retries or repeat unsafe business
   effects;
8. PostgreSQL and SQL Server combinations both pass where the Capability claims
   equal relational support;
9. AOT or trimming is reported only for a warning-free native executable with
   black-box behavior parity; and
10. a provider upgrade cannot silently change a service protocol, serialized
    durable payload, schema, license, operational prerequisite, or support
    claim.

## Recommendation for ticket 119

Adopt the exact initial JIT catalog shown above, but make the distributed-cache
service decision conditional on a short Valkey 9.1.0 versus Redis 8.8.0
conformance and licensing check. The other initial choices are sufficiently
concrete for implementation tickets:

- Quartz for relational Durable Jobs;
- raw RabbitMQ.Client for the one initial external broker adapter;
- Azure Blob as the one initial cloud Object Storage provider;
- MailKit SMTP as the one initial external notification channel;
- standard configuration plus optional Azure Key Vault, with no secret-store
  abstraction;
- Microsoft Feature Management over configuration, with no extra wrapper; and
- OTLP as the only initial production telemetry exporter.

Keep all other named alternatives Deferred. This gives future enterprise
extension points where provider variation is real without making a cache,
broker, scheduler, cloud account, notification service, vault, flag service, or
telemetry backend mandatory for a new application.
