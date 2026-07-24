---
title: Define the security and observability baseline
status: closed
type: wayfinder:grilling
parent: ../map.md
claimed_by:
blocked_by:
  - 103-define-quality-attributes.md
  - 104-capability-preset-matrix.md
  - 106-generated-solution-topology.md
  - 108-identity-provider-matrix.md
  - 109-integration-event-delivery.md
---

## Question

Which secure defaults, authorization checks, audit context, structured logs, traces, metrics, health signals, redaction rules, and exporter seams belong in the Platform Baseline without forcing a vendor or distributed runtime?

## Decisions

### Mandatory Host Security Baseline

- Every production Preset includes a non-optional Host Security Baseline independently of whether an Authentication Capability is selected. Authentication remains optional; safe hosting does not.
- Production requires a trusted HTTPS path from client to public edge. Directly exposed Kestrel SHOULD listen only on HTTPS rather than accepting sensitive API requests over HTTP and redirecting them after receipt.
- TLS termination at a reverse proxy MUST use ASP.NET Core Forwarded Headers Middleware before scheme-dependent behavior and accept forwarded data only from explicitly configured known proxies or networks with a bounded forward limit.
- Reading `X-Forwarded-Proto` directly or enabling trust for arbitrary forwarders is prohibited. The current `TrustForwardedProtoHeader = true` and manual header evaluation are migration inputs to remove.
- Production host names and public origins MUST be explicit and validated at startup. Detailed developer exception output is limited to Development, and unnecessary server-identification headers are disabled.
- CORS is disabled by default. Enabling it requires explicit origins, methods, and headers; wildcard origin plus credentials is an invalid configuration.
- Cookie/BFF Authentication Profiles require antiforgery protection on unsafe browser requests.
- Security headers are composed by host profile. API responses use relevant MIME-sniffing and referrer protections; browser/UI profiles additionally define tested CSP, framing, and browser feature policies appropriate to the selected React, Blazor, Vue, or documentation UI. One universal CSP string is prohibited.
- Request body, header, form, upload, and timeout limits require safe validated values. Production secrets MUST NOT live in source-controlled configuration; the concrete secret provider remains a deployment Capability Provider decision.
- Unsafe or ambiguous production security configuration fails startup. A weakening requires an explicit deployment decision with documented threat-model impact and MUST NOT be a casual switch in a Supported Preset.
- The current shallow security-header helper is insufficient as the target security module because it does not own transport, proxy trust, host policy, CORS, antiforgery, request limits, or startup validation.

### Two-layer fail-closed authorization

- Protected behavior is authorized at two distinct levels: the HTTP endpoint performs a coarse policy/permission gate, while the invoked Application Operation enforces operation, resource, ownership, scope, and business-state authorization.
- This is defense in depth without duplicating one rule: HTTP owns admission to the transport operation; Application owns the contextual decision that must also hold for background, scheduled, and message-driven callers.
- When an Authentication Capability is selected, the HTTP fallback policy requires an authenticated Actor. Anonymous endpoints MUST declare `AllowAnonymous()` explicitly. With provider `none`, endpoints still declare anonymous intent and no fake authenticated principal is created.
- Protected Application Operations receive an explicit `ActorSnapshot`. Missing, unresolved, uncertain, or insufficient Actor context fails closed. Background and integration processing supply an explicit service/system Actor and MUST NOT bypass authorization implicitly.
- Business Modules MUST NOT consume `HttpContext`, `ClaimsPrincipal`, raw provider claims or roles, scheme names, `IdentityUser`, or an ambient current-user service.
- Stable application permissions belong to the Generated Solution. Provider roles and claims are validated and mapped to those permissions at the composition edge; they do not become Platform Kernel vocabulary.
- Resource authorization remains local to the applicable Application Operation and domain data. A global authorization object with unrelated pass-through methods is prohibited; shared authorization infrastructure is admitted only for deep common policy such as fail-closed decision semantics and audit context.
- A denied Application Operation returns a safe Application Error. HTTP normally maps it to `403`; an explicit resource-disclosure policy MAY map it to `404` where hiding existence is a defined requirement.
- Contract and architecture tests detect missing endpoint authorization intent. Every protected operation requires positive, negative, missing-context, and cross-resource authorization tests.

### Security Audit Events and durable retention

- The Platform Baseline defines and emits immutable, structured, versioned `Security Audit Event` facts independently of diagnostic logging. Guaranteed long-term retention belongs only to the optional `Durable Security Audit Trail` Capability.
- Required event context includes opaque UUIDv7 Event ID, event name and version, UTC occurrence time, originating and effective Actor where applicable, action, safe target type and identifier, outcome, stable reason code, trace ID, and source.
- Tenant ID, client application, remote address, user agent, and additional attributes are included only when required and classified. IP addresses and user agents are not assumed harmless.
- Passwords, credentials, tokens, cookies, authorization headers, recovery codes, secrets, unrestricted exception text, and complete request or response payloads MUST NOT enter an audit event. An unbounded arbitrary metadata dictionary is prohibited.
- Impersonation records both original and effective Actor. Outcomes and reasons use stable machine values rather than prose or exception messages.
- Security Audit Events are not trace-sampled. Failure of a best-effort diagnostic exporter does not automatically fail a business operation.
- A Capability or application requiring guaranteed audit MUST select the Durable Security Audit Trail and define its atomicity, availability, retention, access, integrity, and export policy. It MUST NOT claim compliance from `ILogger` output.
- Privileged operator operations, permission administration, identity lifecycle, impersonation, and audit administration require durable audit retention. Ordinary resource reads, every successful request, and every EF property change are not audited automatically. Entity Change History remains separate.
- Baseline event coverage includes permission/security-configuration changes; identity and session lifecycle; impersonation; significant authentication failures; privileged authorization denials; available key-management actions; operator replay, discard, or override over reliability/migration/idempotency state; and audit access/export.
- The audit seam SHOULD expose one small publish operation over the immutable event rather than one method per event kind. It is justified by at least a safe diagnostic Adapter and an optional durable Adapter.

### Durable audit atomicity and failure policy

- A privileged state-changing operation that requires durable audit MUST commit its immutable Security Audit Event atomically with the protected state change. Failure to capture that event fails closed and rolls back the state change.
- For relational state sharing the same database, capture occurs in the same `DbContext`/database transaction. A different audit store requires a proven durable handoff; sequentially committing business state and then calling an audit service is insufficient.
- The immutable Audit Event is distinct from mutable export delivery state. Export to a SIEM, collector, or cloud service occurs asynchronously with durable retry semantics and never participates in the business transaction or a distributed transaction.
- Audit facts are append-only. Correction creates a new event linked to the original. Retention cleanup follows an explicit policy and is itself audited; reader and exporter identities use separate least-privilege access.
- Encryption-at-rest and key policy apply when classified attributes require them, without silently defeating required retention or export.
- Failed authentication, denied authorization, invalid credentials, and other attempts without a committed business change cannot share a business transaction. Where durable retention is required, they write directly through a defined availability and failure policy.
- Failure to capture a required privileged change rolls back. Failure to export is retried asynchronously. Failure to record an attack/denial event raises bounded operational signals but MUST be designed so an attacker cannot trivially turn audit-store unavailability into global authentication denial of service.
- Audit storage exhaustion or sustained unavailability affects readiness/degraded health and alerts according to explicit thresholds.
- A Generated Solution without capabilities or compliance needs requiring durable audit does not receive an audit database merely for future possibility.

### Native instrumentation and OpenTelemetry host collection

- Platform Libraries and Business Modules emit telemetry through native `ILogger<T>`, `ActivitySource`, and `IMeterFactory`. They MUST NOT depend on an APM vendor or OpenTelemetry SDK merely to instrument code.
- A generic `ITelemetryService` or pass-through tracking facade is prohibited. Each deep Capability MAY own a small typed instrumentation module with stable instruments and policy.
- Activity sources are long-lived, uniquely named for their owning assembly/Capability, and versioned. DI-created metrics use `IMeterFactory`; hot-path logs use source-generated `LoggerMessage` definitions where beneficial.
- The current broad `TelemetryContext` is a migration surface, not the target. Its manually constructed `Meter` instances, duplicated generic request/handler duration, and ineffective service metadata do not form a deep observability module.
- Production Generated Solution hosts include vendor-neutral OpenTelemetry collection for applicable ASP.NET Core, `HttpClient`, runtime/process, and declared MartiX sources/meters. OpenTelemetry SDK packages remain host dependencies outside Platform Kernel and Business Modules.
- Database instrumentation requires an explicit data-safety policy; SQL text and parameters are not enabled automatically.
- Export is a Capability Provider choice. OTLP and future verified vendor exporters plug into host collection; no remote exporter, collector, or distributed runtime is required for application startup or local operation.
- Configured exporters validate options at startup, use bounded asynchronous batching and bounded shutdown flush, and expose their own failures safely. Telemetry backend unavailability MUST NOT fail business requests or create recursive telemetry storms.
- Console logging and local .NET diagnostic tools remain usable without a remote exporter.

### Versioned Observability Contract and cardinality

- Every instrumented Platform Capability owns a documented, versioned, and tested Observability Contract covering source/meter names, activity/metric/log names, instrument types, UCUM units, meanings, required and optional dimensions, outcomes, sampling behavior, and data classification.
- Changing the meaning of an existing instrument is breaking. A materially new meaning receives a new name or contract version.
- Built-in ASP.NET Core, Kestrel, `HttpClient`, rate-limiting, runtime, and safely selected database telemetry is preferred over duplicate MartiX instrumentation. Custom signals represent MartiX Capability behavior rather than wrapping framework duration again.
- Metric dimensions MUST be bounded. Examples include module, operation, outcome, stable error type, provider, declared Subscription, and declared event name/version. Actor, tenant, resource, Message, Trace or Idempotency IDs; raw paths/URLs; email/IP; exception messages; SQL; and payload values are prohibited metric dimensions.
- W3C Trace Context is propagated over supported HTTP and messaging boundaries. Work uses the valid parent when present; bounded span links represent fan-in/batches. Span names are low-cardinality and IDs never appear in them.
- Custom spans MUST NOT merely wrap existing ASP.NET Core, `HttpClient`, or database spans. Error status and stable `error.type` are recorded without unrestricted exception payload attributes.
- Trace sampling MUST NOT remove required metrics, Security Audit Events, or durable failure/operator state. Baggage is empty by default or strictly allowlisted and never carries secrets, credentials, PII, or authorization data.
- Stable operational logs use event IDs/names and structured property names. The layer that handles a failure, retry, or terminal transition owns its primary log; duplicate exception logging across layers is prohibited.
- `Activity.Current.TraceId` is the technical correlation identifier. A separate correlation ID is introduced only for a defined business correlation concept, not as a duplicate trace identity.
- Expected validation and ordinary not-found outcomes are not automatically errors. Log levels reflect operational meaning rather than HTTP status alone.
- Tests verify names, units, allowed dimensions, context propagation, outcome/error semantics, absence of duplicate built-in signals, and measured disabled/enabled overhead.

### Data classification and default-deny redaction

- The Platform Baseline defines explicit Public/Operational, Internal, Personal, Confidential, and Secret/Credential classifications. Unknown classification is treated as sensitive rather than public.
- Secret/Credential values MUST NOT be passed to telemetry at all; masking is not considered safe logging. Redaction is defense in depth for other classified values, not permission to capture payloads.
- Generated hosts use first-party `Microsoft.Extensions.Compliance.Classification` and `Microsoft.Extensions.Compliance.Redaction` integration. The fallback behavior erases classified data unless an explicitly reviewed redactor and sink policy applies.
- Partial masking is not assumed anonymous. HMAC/pseudonymization requires a demonstrated correlation need plus protected, rotated, separately governed key material. Experimental redactors are excluded from Supported baseline until stable.
- Source-generated log parameters carrying classified values require classification annotations. Typed log methods are preferred over logging arbitrary objects.
- HTTP request/response body logging and whole query-string logging are disabled. Logs use route templates rather than raw identifier-bearing paths. Header values remain redacted by default and only an explicit safe-header allowlist can reveal a value; credential, cookie, antiforgery, API-key, and forwarded-identity headers are never allowlisted.
- Production Problem Details never exposes raw exception messages. Ordinary telemetry treats exception message/data as potentially classified, records safe type/code/stack policy, and prohibits `Exception.ToString()` in structured properties or trace tags. A richer diagnostic sink requires explicit access, retention, and classification policy.
- Logging redaction does not automatically protect metrics or traces. Metrics accept only known-safe bounded dimensions; trace tags/events use explicit allowlists/builders; exporter processors provide final defense-in-depth sanitization.
- Every exporter receives no more data than the canonical safe contract. Changing redaction policy is a security-sensitive reviewed change.
- Tests inject canary secrets and classified values through failure scenarios and prove absence from logs, spans, metrics, Problem Details, health output, and audit exports. Repository secret scanning remains a separate control.

### Liveness, readiness, and protected diagnostics

- Operational endpoints `/alive` and `/ready` are outside business API version routes and expose only a minimal anonymous status without dependency names, configuration, infrastructure details, exceptions, identifiers, or classified data.
- Liveness answers only whether the process is responsive. It performs no downstream I/O and does not fail for database, provider, broker, backlog, or exporter outages. A simple self check is acceptable when correctly mapped and tested.
- Readiness answers whether the instance can safely accept new work. It includes only hard dependencies and state whose absence makes the instance unable to fulfill its role safely, such as its primary database, schema compatibility, required durable audit storage, required cryptographic material, or exhausted correctness-critical work capacity.
- An external dependency affects global readiness only when nearly all relevant work requires it and removing the instance from routing can improve the situation. Optional provider and telemetry-exporter outages normally remain operational signals rather than global unready state.
- Healthy returns `200`; Degraded normally remains `200` plus metrics/alerts; Unhealthy readiness returns `503`. Dependency degradation never makes liveness degraded.
- A progressing warning-level backlog is Degraded; a sustained stalled or capacity-exhausting dispatcher MAY be Unhealthy when accepting more work threatens guarantees. Individual terminal work failures remain durable operator signals rather than automatically removing the whole host.
- Checks are bounded, cancellable, side-effect free, short-timeout operations and MUST NOT run migrations or recovery. Probe-result caching MAY prevent load storms. Threshold options validate on startup.
- Stable `live` and `ready` tags, orchestrator-specific timing/failure thresholds, dependency loss/recovery, startup, shutdown, and multi-instance behavior are tested.
- Invalid static startup configuration terminates the process rather than remaining unready forever.
- Detailed diagnostics are exposed only through a protected operator surface and/or telemetry. It requires explicit permission, safe output, and Security Audit Events for sensitive actions or exports.
- The current boolean delegate readiness helper is a primitive rather than the target Interface because it erases Degraded state, structured reason, timeout, duration, and Capability ownership. Capabilities SHOULD supply typed `IHealthCheck` implementations or direct standard registrations.

### Safe automatic telemetry context

- Automatic resource enrichment is limited to safe service name/version, instance, deployment environment, and host role. Operation enrichment is limited to trace/span identity, module, Application Operation, and outcome.
- Standard ASP.NET Core HTTP semantic attributes are consumed rather than duplicated under MartiX-specific names.
- Automatic Actor enrichment contains only bounded kind, authenticated state, and impersonation state. Actor ID, provider subject, presentation claims, claims/roles/permissions, and credentials are not global telemetry context.
- Actor ID appears only in a required Security Audit Event or an explicitly classified security/diagnostic signal sent to an approved sink.
- Tenant ID is not introduced before a multi-tenancy contract exists. Resource, Message, Subscription, and provider identifiers are explicit per-signal fields when needed and never metric dimensions.
- Background work propagates explicit allowed operation context rather than ambient HTTP scope. Integration Event processing follows its stored creation context and consumer span/link contract; Actor travels as the explicit `ActorSnapshot`, not baggage.
- W3C Trace ID is the technical correlation identifier. `HttpContext.TraceIdentifier` is a fallback only without an Activity. A generic duplicate Correlation ID is prohibited.
- Business correlation identifiers are explicitly named, validated, length-limited, classified contract values. An arbitrary client header MUST NOT replace server trace identity.
- Logging scopes remain small, structured, bounded to the async operation, and MUST NOT contain whole request DTOs, serialized Actors, or arbitrary metadata dictionaries. Hot-path scope allocation is measured.

### Rate limiting and overload protection

- Every production host has native ASP.NET Core process-local concurrency protection with a measured host-profile limit and no or small bounded queue. Unbounded request queues are prohibited.
- Overload rejection returns canonical `429` Problem Details with code `rate-limit.exceeded` and a suitable `Retry-After`.
- Security-sensitive or expensive surfaces use centrally defined named endpoint policies, including applicable identity/recovery/token, export/search, upload, webhook, operator replay, and external-side-effect operations. Endpoints MUST NOT invent arbitrary inline thresholds.
- Partition keys derive only from threat-modeled signals such as durable Actor, client application, or a remote address resolved through trusted proxy processing. Raw forwarded headers are prohibited.
- IP and account inputs are classified, excluded from metric dimensions and raw logs, and safely normalized/pseudonymized where used. Account-based limiting MUST NOT enable enumeration. Partition growth itself is bounded against memory exhaustion.
- Impersonation or operator status does not automatically bypass overload protection.
- The default limiter protects one process and its CPU, memory, thread, connection, and downstream capacity. It MUST NOT be represented as a cluster-wide quota, billing entitlement, authorization rule, edge/WAF replacement, or distributed abuse guarantee.
- Global multi-replica quotas require an explicitly selected and tested edge/distributed Capability Provider while retaining local protection as defense in depth.
- Built-in ASP.NET Core rate-limit metrics are consumed without duplication. Metrics are the primary attack-safe signal; individual `429` logs are aggregated/sampled to avoid attacker-controlled log storms, and Security Audit Events represent only meaningful abuse patterns.
- Load tests cover bursts, sustained load, queue bounds, cancellation, `Retry-After`, partition isolation/cardinality, forwarded-header spoofing, and explicit local-versus-global multi-instance semantics.

### Data Protection and cryptographic key lifecycle

- ASP.NET Core Data Protection is required only by profiles that use protected cookies, antiforgery, TempData, applicable identity/recovery tokens, or server-side protected UI state. An anonymous or bearer-only API does not receive it speculatively.
- A production profile declares an application discriminator, durable key-ring persistence, at-rest protection, lifetime/rotation, replica sharing, rollout compatibility, retention/revocation, and recovery behavior.
- Production MUST NOT rely on an ephemeral container/local key ring. Concurrent replicas of one application share a compatible ring, while applications and Development/Test/Production environments remain cryptographically isolated.
- Key material and storage credentials MUST NOT enter Git, ordinary application settings, container images, logs, telemetry, or release evidence. Deployment secrets configure the selected provider.
- Rotation retains decryptability for still-valid protected data. Key deletion is not a routine revocation mechanism; key loss, backup recovery, and rolling deployment effects on sessions/tokens are documented and tested.
- Provider choice belongs to deployment configuration using native Data Protection extension points. A pass-through MartiX key-store abstraction is prohibited.
- Invalid production key configuration fails startup. Required key-ring read failure makes the instance unready; it MUST NOT silently generate a private replacement ring. Rotation/retention failures emit safe operational signals and appropriate Security Audit Events.
- Operator key actions require least privilege and Durable Security Audit Trail. Key identifiers MAY be diagnostic; key material never leaves the cryptographic provider.
- Data Protection is not general business-data encryption, password hashing, TLS, a secret vault, or a universal signing/KMS abstraction. Authentication signing keys remain provider-specific; business-data encryption requires its own threat-modeled decision.
- Verification covers multi-replica interoperability, restart, rolling deployment, rotation, provider outage/recovery, read/write access failure, environment/application isolation, absence of ephemeral production fallback, and telemetry/artifact leakage.

### Native structured logging provider

- The default logging baseline uses `Microsoft.Extensions.Logging` with newline-delimited JSON Console in production and a readable console formatter in Development. Serilog is not a mandatory dependency.
- Platform and application code use `ILogger<T>` only, with stable categories, Event IDs/names, structured state, scopes, UTC timestamps, and trace/span correlation. Hot paths prefer source-generated `LoggerMessage` methods.
- Production stdout/stderr is the default log transport for platform collection. File logging is not a baseline because rotation, disk capacity, access, multi-instance collection, and retention are deployment concerns.
- Duplicate console/OTLP/vendor providers MUST NOT emit the same event multiple times. Global production Trace verbosity is prohibited without a bounded, controlled, audited diagnostic override.
- Logging export is asynchronous and bounded with an explicit loss/backpressure policy. Backend failure does not block request threads or alter business results; durable Security Audit Trail semantics remain separate.
- Serilog MAY become an explicit Logging Capability Provider only for a demonstrated sink/routing or organizational requirement that the native stack cannot meet cleanly. It remains behind `ILogger`, obeys the same classification/Observability Contract, and passes dependency, AOT, performance, duplicate-provider, and exit-cost review.
- FullStackHero's Serilog choice supports adopting structured centralized logging principles, not copying the dependency without a MartiX force.

### Required signals, alert templates, and application-owned SLOs

- Production hosts collect applicable built-in request, active-request, outcome, duration, unhandled-failure, rate-limit, Kestrel, `HttpClient`, process, runtime/GC, thread-pool, and health-transition signals rather than duplicating them.
- Application Operations emit `martix.application.operation.executions` and `martix.application.operation.duration` with bounded module, operation, invocation source, outcome, and stable error type. Duration uses seconds. This measures the use case across HTTP/background/message/migration entry points rather than duplicating HTTP semantics.
- Selected deep Capabilities define their own minimal contract. Reliable Events includes capture/delivery/retry/terminal/backlog-age/capacity signals; Idempotency includes execution/replay/conflict/wait/storage outcomes; Security includes bounded authentication/authorization/rate-limit/audit/key lifecycle outcomes.
- Security signals contain no Actor, account, IP, tenant, target, or resource identifiers. Error categories remain stable and bounded.
- Observable callbacks are cheap, side-effect free, exception safe, and MUST NOT scan unbounded storage per collection. Unselected Capabilities create neither instruments nor polling workers.
- The Platform supplies vendor-neutral alert conditions and runbook skeletons for SLO burn, error/latency change, saturation/starvation, readiness/restart, database outage, durable backlog age and terminal failure, audit/key failures, rate-limit anomalies, and exporter loss.
- Each template identifies signal meaning, suggested severity, evaluation window, likely causes, safe first checks, escalation, and runbook link without pretending one universal latency/error threshold fits every application.
- Every production Generated Solution declares its workload-specific availability, latency, throughput, error-budget, critical-operation, dependency, and measurement-window SLOs. Platform regression gates remain separate controlled release comparisons rather than production SLOs.
- Signal tests cover success/failure/cancellation, units/types/dimensions, data safety, disabled/failed exporters, callback cost, durable-state accuracy, selected-provider alert query validation, runbook links, and synthetic failures.

### Outbound HTTP and SSRF protection

- Long-lived integrations use named/typed `HttpClient` from `IHttpClientFactory` with explicit destination, timeout, maximum response size, media types, authentication, operation-aware resilience, telemetry name, and redaction policy.
- Cancellation and timeout outcomes remain distinguishable; large responses stream with bounded buffering; provider-specific failures map deliberately rather than relying on `EnsureSuccessStatusCode()` alone.
- Production validates TLS chains and hostnames. Accept-any-certificate callbacks are prohibited. Custom trust/pinning and client certificates require provider threat model, protected storage, and rotation; TLS validation failures are not ordinary retryable transients.
- User/tenant/external-influenced destinations pass a deep SSRF policy covering parsed URI scheme, host/port allowlist, credential rejection, private/loopback/link-local/metadata/management ranges, DNS resolution/rebinding, redirect revalidation, proxy trust, size/content/time bounds, and IPv4/IPv6 variants.
- Automatic redirects are disabled or strictly bounded/revalidated. Inbound authorization, cookies, API keys, and forwarding headers MUST NOT flow to outbound requests.
- Webhook Delivery and URL-fetching capabilities reuse the governed destination-validation module rather than duplicating string checks.
- Standard resilience is bounded, jittered, respects `Retry-After`, and applies only to transient and idempotent/transactionally safe requests. Unsafe methods require an idempotency contract; hedging is prohibited for side effects; nested retry layers MUST NOT multiply attempts.
- Circuit breaking is scoped to the actual dependency/destination. Total timeout includes all attempts; response disposal and cancellation are mandatory.
- Built-in `HttpClient` telemetry is used. Full URLs, query, headers, and bodies remain excluded; known provider and classified provider request ID may appear only under the safe signal rules. Retry attempts do not each become Error logs; terminal handling owns the failure log.
- Tests cover private-address/DNS/redirect bypasses, encoded IPv4/IPv6, credential forwarding, TLS, timeout/cancellation, response bounds/media type, safe retries, lifetime/concurrency, outage recovery, and redaction canaries.

### Ownership with minimum packages and projects

- No new mandatory Security, Observability, or ServiceDefaults package/project is introduced.
- The BCL-only `MartiX.Platform.Security` Kernel namespace contains the already admitted Actor values plus immutable validated `SecurityAuditEvent`, strongly typed UUIDv7 Event ID, bounded Outcome, optional composed Target, and optional composed Origin values.
- The event contains name/version/time, initiating Actor, optional effective Actor for impersonation/delegation, action, optional safe target, outcome, optional stable reason, source, optional trace identity, and optional classified origin. Factories validate names, lengths, and invariants using supplied time; arbitrary object metadata and audit inheritance are prohibited.
- `SecurityAuditOutcome` is the stable closed set Succeeded, Denied, and Failed. Tenant context is not added before a multi-tenancy decision.
- `MartiX.Platform.AspNetCore` retains its previously accepted narrow Problem Details, exception translation, error mapping, and OpenAPI role. It MUST NOT grow a broad `AddMartiXSecurityDefaults`, `AddMartiXObservabilityDefaults`, or hidden middleware installer.
- Visible generated `<name>.Api` source owns proxy/middleware/CORS, authentication/authorization composition, audit sink composition, Data Protection, rate limits, SSRF policy, OpenTelemetry/exporters, logging, health mapping, and startup validation under generated directories only when content exists.
- Business Modules own operation-specific authorization, audit-fact creation, and Capability instrumentation but do not configure host exporters/providers. Each deep Platform Capability keeps its instrumentation beside its implementation.
- Initial relational Durable Security Audit Trail code MAY live in existing generated infrastructure and use the existing Migrator. A package/project is admitted only for repeated deep implementation, real provider variability, or an independent deployment/privilege boundary.
- A public audit sink Interface is not added to the Kernel speculatively. The Generated Solution may use an internal composition seam; a future provider package promotes the smallest proven protocol over Kernel `SecurityAuditEvent`.
- Verification remains in the consolidated generated test project, partitioned by categories rather than creating test projects for security or observability.

### Executable enforcement and Threat Model triggers

- The Security and Observability Baseline is a release-blocking executable contract, not advisory guidance.
- A Threat Model is created or updated when assets, actors, trust boundaries, abuse cases, or mitigations change through authentication/authorization/impersonation, public exposure, proxy/origin topology, classified data, audit/key handling, URL/file/webhook/broker integrations, operator surfaces, tenant isolation, or deployment/privilege topology. Behavior-preserving internal refactoring does not require ceremonial updates.
- Host security tests cover direct/proxied HTTPS, forwarded spoofing, hosts, CORS/preflight, cookie antiforgery, profile-specific headers/CSP, request limits, exception leakage, and invalid production configuration.
- Authentication/authorization tests cover anonymous intent, credential failure/expiry, `401` versus `403`, permissions, resource/cross-resource ownership, absent Actor, background/service Actor, impersonation, and fail-closed resolution/provider behavior.
- Audit tests cover immutable schema/invariants, transaction commit/rollback, impersonation, data exclusion, append correction, exporter outage/retry, retention/access, and multi-instance concurrency.
- Observability tests cover names/units/dimensions, W3C propagation over HTTP/messaging, duplicate suppression, canary redaction, disabled/failed exporters, bounded buffers, shutdown flush, and measured disabled/enabled overhead.
- Operational tests cover alive/ready semantics, dependency loss/recovery, degraded/unhealthy transitions, startup/shutdown, probe bounds, backlog/audit thresholds, exporter independence, and multi-replica behavior.
- Abuse/outbound tests cover overload/cardinality, account enumeration, SSRF/DNS/redirect/private-address variants, TLS, credential forwarding, and prevention of unsafe retries.
- Static/artifact gates include warnings-as-errors, architecture rules, secret scanning, SAST, transitive NuGet audit, SBOM/provenance, OpenAPI security metadata, configuration schema checks, and documentation/runbook links according to the accepted Quality Gate profiles.
- Analyzers enforce only reliably decidable rules and MUST NOT infer security from naming/folder heuristics.
- Supported deployment profiles smoke-test the immutable release artifact for valid startup, invalid-config rejection, health, protected/anonymous requests, telemetry, exporter absence/presence, graceful shutdown, and absence of canary leakage.
- Missing or uncertain authorization, secret/classified leakage, broken audit atomicity, proxy/host/CORS/CSRF bypass, unsafe production fallback, unbounded queues/cardinality, false readiness, unreviewed Observability Contract drift, or failing security tests block release.
- Ticket **Define executable quality gates and template verification** owns exact CI lanes and commands while preserving every behavior resolved here.

## Resolution

Adopt a mandatory, vendor-neutral Host Security Baseline and a versioned Observability Contract for every production Preset without making Authentication, distributed infrastructure, a cloud vendor, or a remote telemetry backend mandatory. Security configuration remains explicit and fail-fast in generated host source; authorization remains fail-closed at both transport and Application Operation levels; privileged changes use atomic immutable Security Audit Events; and all telemetry is classified, bounded, and executable-test governed.

Platform Libraries instrument with native .NET `ILogger`, `ActivitySource`, and `IMeterFactory`. Generated hosts collect with OpenTelemetry and select exporters independently. Liveness, readiness, overload protection, Data Protection, outbound HTTP/SSRF controls, JSON Console logging, signal catalogs, alert/runbook templates, and threat-model triggers form one operational baseline while retaining the already accepted minimum package and project topology.

### Material alternatives rejected

- Optional secure hosting was rejected because anonymous applications still require trusted transport, proxy, host, origin, limit, and error behavior.
- Direct trust of `X-Forwarded-*`, trust-all proxies, silent security fallback, and warning-only invalid production configuration were rejected as spoofable or ambiguous.
- Endpoint-only authorization, ambient current-user access, provider claims/roles in Business Modules, and implicit authorization bypass for background work were rejected because non-HTTP invocations must preserve business authorization.
- Treating diagnostic logs as an audit trail was rejected because logs may be sampled, dropped, altered, or retained without the required atomicity/access/integrity policy.
- Synchronous SIEM/cloud export in a business transaction and distributed audit transactions were rejected; local durable capture and asynchronous export preserve atomicity without remote availability coupling.
- A custom `ITelemetryService`, broad `TelemetryContext`, duplicate request metrics, vendor APIs in libraries, and mandatory remote collector were rejected in favor of native instrumentation plus host collection.
- Actor/resource IDs and raw paths/messages as metric dimensions, payload logging, trace baggage identity, and unclassified metadata were rejected for cardinality, privacy, and security reasons.
- Serilog, file logging, a distributed rate limiter, Data Protection, durable audit storage, and detailed public diagnostics were rejected as universal defaults; each remains selected only where its real profile/capability requires it.
- New Security, Observability, ServiceDefaults, or test projects and speculative public sink/key-store wrappers were rejected because visible generated source and existing projects preserve policy with fewer shallow seams.

### Current implementation and migration direction

- Remove `SecurityOptions.TrustForwardedProtoHeader`, direct forwarded-proto evaluation, and the shallow `ISecurityRequestEvaluator`; generated host composition uses standard trusted Forwarded Headers Middleware and validated deployment topology.
- Replace the three-header helper with profile-specific generated host policy and tests. Do not hide middleware ordering or security configuration in a broad defaults installer.
- Replace the broad `TelemetryContext`; use ownership-specific ActivitySources and typed metric modules created through `IMeterFactory`, and consume built-in ASP.NET Core request telemetry rather than emitting duplicate millisecond histograms.
- Derive service resource name/version from the Generated Solution/release rather than hard-coded `MartiX.WebApi` and `0.2.0` options that are not attached to emitted telemetry.
- Keep the existing liveness self check only as a correctly mapped primitive. Replace boolean readiness delegates where a Capability requires Degraded state, typed reason, duration, timeout, or ownership.
- Change Problem Details correlation from the misleading `correlationId` duplicate to canonical `traceId` according to the accepted HTTP contract.
- Generate visible API-host configuration for JSON Console, classification/redaction, OpenTelemetry collection, health mapping, overload policies, Data Protection only for selected profiles, and capability-specific security/telemetry contributions.
- Introduce the exact immutable Kernel `SecurityAuditEvent` family already admitted by the package-topology decision; durable storage remains generated/selected rather than a broad in-memory fake or mandatory package.

### Consequences and extension triggers

- Generated `Program.cs` and host infrastructure are more explicit, but security-sensitive ordering and policy remain reviewable by humans and agents and fail deterministically when incomplete.
- Diagnostic exporters may lose data by bounded policy; a Capability needing guaranteed evidence must select Durable Security Audit Trail instead of strengthening every log path into storage.
- Concrete exporter, secret, key-ring, edge/distributed limiter, and durable-audit providers are chosen by **Select the initial infrastructure capability providers** and deployment profiles without changing Kernel or Business Module semantics.
- Multi-tenancy must define isolation and safe tenant telemetry before tenant context is admitted. Richer audit attributes require a typed versioned contract rather than generic metadata.
- A new package/project or public seam requires the previously accepted depth/provider/deployment forces; this ticket does not pre-authorize wrapper growth.
- Production SLO numbers remain application-owned. The Platform owns signal correctness, release baselines, templates, and deterministic verification.

### Evidence

- [ASP.NET Core security topics](https://learn.microsoft.com/en-us/aspnet/core/security/?view=aspnetcore-10.0)
- [Forwarded Headers hardening for unknown proxies](https://learn.microsoft.com/en-us/aspnet/core/breaking-changes/8/forwarded-headers-unknown-proxies?view=aspnetcore-10.0)
- [HTTPS and HSTS guidance](https://learn.microsoft.com/en-us/aspnet/core/security/enforcing-ssl?view=aspnetcore-10.0)
- [ASP.NET Core authorization](https://learn.microsoft.com/en-us/aspnet/core/security/authorization/introduction?view=aspnetcore-10.0)
- [ASP.NET Core Data Protection](https://learn.microsoft.com/en-us/aspnet/core/security/data-protection/introduction?view=aspnetcore-10.0)
- [ASP.NET Core health checks](https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/health-checks?view=aspnetcore-10.0)
- [ASP.NET Core rate limiting](https://learn.microsoft.com/en-us/aspnet/core/performance/rate-limit?view=aspnetcore-10.0)
- [.NET observability with OpenTelemetry](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/observability-with-otel)
- [.NET ActivitySource instrumentation](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/distributed-tracing-instrumentation-walkthroughs)
- [.NET metrics instrumentation and `IMeterFactory`](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/metrics-instrumentation)
- [.NET data redaction](https://learn.microsoft.com/en-us/dotnet/core/extensions/data-redaction)
- [.NET source-generated logging](https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/source-generation)
- [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OpenTelemetry semantic conventions](https://opentelemetry.io/docs/specs/semconv/)
