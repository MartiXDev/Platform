---
title: Define HTTP contracts, OpenAPI, and versioning
status: closed
type: wayfinder:grilling
parent: ../map.md
claimed_by:
blocked_by:
  - 101-compare-platform-sources.md
  - 106-generated-solution-topology.md
---

## Question

What endpoint interface, typed result model, problem-details contract, OpenAPI policy, versioning and deprecation strategy, idempotency behavior, and Minimal API conventions should every supported HTTP surface follow?

## Decisions

### Business API version selection

- Business HTTP APIs MUST use an explicit URL-segment major version from their first release, for example `/api/v1/orders`.
- Minor and patch versions MUST NOT appear in routes. Compatible changes evolve the existing major version; a new URL version is introduced only for a breaking contract change.
- Infrastructure and operational endpoints such as `/health`, `/alive`, and OpenAPI document endpoints remain outside the business API version namespace.
- URL-segment versioning is preferred over query-string, custom-header, or media-type version selection because the selected contract remains visible to clients, logs, gateways, caches, diagnostics, and generated client tooling.
- The small amount of route verbosity in an initial `v1` API is accepted to avoid retrofitting versioning after consumers exist and to support side-by-side major versions during migrations.

### Endpoint and application result boundary

- ASP.NET Core is the required backend runtime. HTTP endpoint projects and `MartiX.WebApi` HTTP integrations SHOULD use its native types directly, including `TypedResults`, `Results<T1, ...>`, `ProblemDetails`, `HttpContext`, and endpoint metadata. A framework-neutral duplicate HTTP abstraction MUST NOT be introduced.
- Application Operations MUST return the transport-neutral MartiX `Result`/`Result<T>` model rather than `IResult`, ASP.NET Core `Results<...>`, or FastEndpoints response types.
- The separation is retained so an Application Operation can be invoked consistently from HTTP, tests, background work, or message consumers and so transport decisions such as status code, `Location`, headers, cache policy, and representation remain owned by the HTTP adapter.
- Each endpoint MUST declare the concrete responses it can produce. Minimal API handlers SHOULD return `TypedResults` through an exact `Results<T1, ...>` union instead of a general `IResult`.
- FastEndpoints endpoints MUST follow the same public contract by preferring `Endpoint<TRequest, Results<T1, ...>>` with `ExecuteAsync(...)` and `TypedResults`. Imperative `HandleAsync(...)` plus `Send.*Async()` is reserved for cases that cannot be expressed suitably as typed results, such as specialized streaming behavior.
- FastEndpoints remains an optional endpoint-authoring adapter; it MUST NOT define a different response contract from the canonical Minimal API surface.
- Mapping from an Application Result to an HTTP result is an endpoint-adapter responsibility. Small shared factories MAY remove mechanical Problem Details construction, but MUST NOT widen every endpoint to all possible result statuses or hide its exact success and failure contract.
- The current general `ToMinimalApiResult(): IResult`, `IFastEndpointResultMapper`, and `FastEndpointResult` APIs are migration inputs rather than the target contract. In particular, a created resource URI MUST be supplied by the endpoint; a placeholder `Location: /` is not valid target behavior.

### Problem Details error contract

- Every HTTP error response produced by the platform, including validation failures, authentication and authorization failures, expected Application failures, and unexpected server failures, MUST use RFC 9457 Problem Details with content type `application/problem+json`.
- The canonical contract uses the standard `ProblemDetails` members `type`, `title`, `status`, `detail`, and `instance`, plus these extensions:
  - `code`: the stable, machine-readable primary error code.
  - `traceId`: the distributed-trace identifier used to locate server-side diagnostics.
  - `errors`: an array of structured subordinate errors containing a stable `code`, a safe `message`, and an optional `target` identifying a request field or logical input.
- `type` MUST be a stable URI reference for the problem category, such as `/problems/validation-failed` or `/problems/order-not-found`. It MUST NOT use a fictitious organization or placeholder hostname.
- Error codes are API contracts. They MUST be namespaced where domain-specific, remain stable within an API major version, and be documented in OpenAPI.
- Arbitrary internal metadata MUST NOT be serialized. Additional error metadata requires an explicit, reviewed allowlist and a documented client need.
- Public details MUST be safe. Stack traces, SQL, infrastructure names, secrets, internal object representations, and raw unexpected exception messages MUST NOT be returned.
- Unexpected failures return a generic `500` problem and retain diagnostic detail only in telemetry correlated by `traceId`.
- Authentication failures MUST NOT disclose account existence or authentication internals. Authorization failures MUST NOT disclose private policy details.
- A single composition-based Problem Details factory over ASP.NET Core `ProblemDetails` MUST implement this contract for Minimal APIs, FastEndpoints, exception handling, status-code handling, and validation. A custom inheritance hierarchy such as `ApiProblemDetails : ProblemDetails` SHOULD NOT be introduced.
- Endpoint OpenAPI metadata MUST still enumerate the exact possible error status codes even when those responses share the same Problem Details representation.
- The current exception-handler, Minimal API mapper, and validation response differences are defects to converge: `errorCode` versus missing codes, `correlationId` versus trace identity, dictionary-only validation messages, empty `401`/`403` responses, and exposure of `exception.Message` MUST NOT remain separate public contracts.

### OpenAPI as an authoritative contract

- OpenAPI is a versioned, generated, and CI-verified public contract, not merely input for an interactive development UI.
- The canonical Minimal API implementation MUST use the first-party .NET 10 `Microsoft.AspNetCore.OpenApi` support and emit OpenAPI 3.1.
- OpenAPI documents MUST be generated during the build. A separate document MUST exist for every concurrently supported business API major version, for example `openapi-v1.json` and `openapi-v2.json`.
- Each business endpoint MUST provide a stable operation ID, module tag, summary, request description, media types, exact success and error responses, Problem Details schemas, and applicable security metadata.
- Specifications MUST be generated from endpoint contracts and centralized OpenAPI transformers. A manually maintained duplicate specification MUST NOT become a second source of truth.
- CI MUST verify successful document generation and specification validity and MUST detect unapproved contract drift. A breaking change to a released major-version document MUST fail the quality gate unless introduced as a new major version or covered by an explicit reviewed exception.
- Generated contracts are intended for React, Blazor, and Vue clients, contract testing, integration documentation, future LLM skills, and API gateway inputs.
- Runtime OpenAPI JSON and interactive API explorers are enabled by default only in Development. Production exposure requires explicit configuration and appropriate protection.
- Operational endpoints such as health checks MUST be excluded from business API documents.
- A separate internal-audience document MUST be introduced only when an actual internal API audience exists; empty speculative documents are prohibited.
- The optional FastEndpoints adapter MAY use the FastEndpoints-supported OpenAPI registration required to collect its metadata, but its emitted contract MUST satisfy the same OpenAPI 3.1 structure, naming conventions, Problem Details definitions, version documents, and CI checks. It MUST NOT establish a parallel API standard.

### Deprecation and sunset lifecycle

- API lifecycle states are supported, announced for future deprecation, deprecated but operational, scheduled for sunset, and removed. Deprecation is informational and MUST NOT itself change resource behavior.
- Deprecated resources MUST emit the RFC 9745 `Deprecation` response header as a Structured Field Date, for example `Deprecation: @1782864000`. The current non-standard `Deprecation: true` behavior MUST be removed.
- A deprecated resource MUST emit a `Link` with `rel="deprecation"` pointing to concrete migration documentation. Its OpenAPI operation MUST set `deprecated: true`.
- `Sunset` according to RFC 8594 MUST be emitted only after an actual removal date has been approved. Sunset MUST occur after deprecation and use an HTTP date.
- A supported replacement and its migration documentation MUST be available before deprecation takes effect. Breaking replacement behavior belongs to a new major API version.
- Removal of a released API version requires an explicit ADR or equivalent recorded architecture decision and usage telemetry sufficient to assess remaining consumers.
- The default minimum interval from effective deprecation to sunset is twelve months. Products MAY establish a longer support window.
- A shorter interval requires a documented exception justified by a serious security, legal, or operational need. An API proven to have no external consumers MAY also receive a shorter reviewed interval based on usage telemetry.
- Telemetry MUST make deprecated endpoint usage observable throughout the migration window.

### Native URL version routing

- The default platform MUST implement URL major versions with native ASP.NET Core route groups and OpenAPI group names, for example `/api/v1`, without taking a default dependency on `Asp.Versioning.Http`.
- Actually mapped routes and generated OpenAPI documents are the version authority. A parallel mutable `CurrentVersion` or `SupportedVersions` options list MUST NOT become another source of truth.
- The custom non-standard `api-current-version` response header MUST be removed. Supported-version lists need not be emitted on every successful response; lifecycle headers are emitted for deprecated resources according to the deprecation policy.
- Minimal APIs and the optional FastEndpoints adapter MUST expose the same literal versioned route shape.
- `Asp.Versioning.Http` remains an approved future escalation point, requiring a recorded decision, if requirements introduce query/header/media-type negotiation, overlapping routes disambiguated by version, version-neutral endpoints within a version set, one implementation mapped to multiple versions, complex version sets, or controller/API Explorer integration that native groups cannot express cleanly.

### HTTP idempotency contract

- Idempotency is an explicit endpoint capability, not global middleware applied indiscriminately. Endpoints use metadata equivalent to `RequireIdempotency()` when a key is mandatory or `SupportIdempotency()` when clients may opt in.
- Operations whose retry could duplicate a business or external side effect, such as an order, payment, notification, export, or external command, SHOULD require idempotency. Safe methods and operations already idempotent by HTTP semantics do not require a key by default.
- The request header is the widely adopted `Idempotency-Key`. It is currently based on an IETF Internet-Draft rather than a completed RFC; the platform MUST describe it as a convention and encapsulate parsing so a later standard can be adopted without changing Application Operations.
- Keys are client-generated opaque identifiers. UUIDv7 is recommended and can be generated with native .NET APIs. The server MUST NOT infer business meaning from a key.
- The effective scope combines operation identity, authenticated actor, future tenant identity, client key, and canonical request fingerprint, consistent with the durable protocol defined in ticket 104.
- A completed retry with the same effective key and fingerprint replays the stored status, body, and explicitly allowed relevant headers. It MAY emit `Idempotency-Replayed: true` for diagnostics.
- Reusing a key with a different fingerprint returns RFC 9457 `409 Conflict` with code `idempotency.key-reused`.
- A missing required key returns `400` with code `idempotency.key-required`; an invalid key returns `400` with `idempotency.key-invalid`.
- A concurrent duplicate first follows the bounded wait/replay behavior defined by the durable protocol. If the wait limit expires, it returns `409`, a suitable `Retry-After`, and code `idempotency.operation-in-progress`.
- Binding failures and invalid idempotency protocol requests MUST NOT be stored as completed business executions. Storage and replay of unexpected failures, transient failures, or sensitive responses require explicit policy and MUST NOT occur blindly.
- OpenAPI MUST describe whether the header is required, replay semantics, and all associated Problem Details responses.
- Minimal API filters and FastEndpoints processors MUST apply the same metadata and behavior over the same durable correctness capability.

### Success representations and HTTP DTOs

- Successful responses MUST return endpoint-specific DTOs directly. A universal success envelope such as `ApiResponse<T>` containing `success`, `data`, `message`, and `errors` MUST NOT be introduced.
- HTTP status codes communicate success or failure, and all error bodies use the canonical Problem Details contract. Application `Result`/`Result<T>` types MUST NOT be serialized as public HTTP DTOs.
- Request and response DTOs belong to their vertical slice. Domain entities, EF Core persistence models, and internal operation results MUST NOT be serialized directly.
- DTOs SHOULD be immutable records or otherwise clearly immutable contracts and MUST use explicit compile-time mapping.
- Shared base DTOs and speculative fields are prohibited. Reuse requires proven identical semantics and SHOULD favor composition.
- Representations with real aggregate semantics, such as a page, batch outcome, or asynchronous-operation status, define explicit named DTOs rather than using a generic success wrapper.
- Each contract MUST intentionally define the meaning of a missing property, `null`, and an empty collection. OpenAPI schemas and examples MUST reflect that meaning.

### Resource routes, HTTP methods, and status semantics

- Business routes MUST be resource-oriented under `/api/v{major}`. Segments use lowercase kebab-case, collections use plural nouns, and implementation terms or CRUD verbs such as `handler`, `service`, `getOrders`, and `createOrder` are prohibited.
- Nested routes SHOULD remain shallow and MUST represent genuine ownership or containment.
- Domain commands that are not naturally CRUD MAY use an action subresource with `POST`, for example `/orders/{orderId}/cancel`; the action name describes ubiquitous domain behavior rather than a technical handler.
- `GET` of one resource returns `200` or `404`. `GET` of a collection returns `200`, including for an empty collection.
- Resource creation uses `POST` and returns `201`, the response DTO, and a real `Location` URI. Placeholder locations are prohibited.
- `PUT` represents a complete idempotent replacement and returns `200` with a representation or `204` without one. It MUST NOT represent a non-idempotent command.
- `PATCH` represents an explicitly defined partial-change media contract, never arbitrary object mutation, and returns `200` or `204`.
- Successful `DELETE` returns `204` with no body; the endpoint contract explicitly defines absent-resource behavior, normally `404` when absence is meaningful.
- Accepted asynchronous work returns `202` and MUST provide a way to locate or poll the operation status. It MUST NOT imply completed work.
- `204` responses MUST NOT contain a JSON body. Errors MUST NOT be hidden inside `200` responses.
- Standard failure meanings are: binding or transport validation `400`, unauthenticated `401`, unauthorized `403`, absent resource `404`, business-state conflict `409`, failed HTTP concurrency precondition `412`, rate limit `429` with suitable `Retry-After`, and safe unexpected failure `500`.

### Optimistic HTTP concurrency

- Optimistic concurrency is a standard optional endpoint capability for mutable resources where lost updates matter, expressed with metadata equivalent to `RequireConcurrencyPrecondition()`.
- A concurrency-protected resource representation MUST emit an opaque `ETag`. Its mutating `PUT`, `PATCH`, and, where appropriate, `DELETE` endpoints MUST require `If-Match`.
- Missing required `If-Match` returns RFC 9457 `428 Precondition Required` with code `concurrency.precondition-required`.
- A stale or non-matching entity tag returns `412 Precondition Failed` with code `concurrency.precondition-failed`. `409` remains reserved for a business-state conflict rather than an HTTP precondition failure.
- Entity tags are transport representations of concurrency state. Clients MUST treat them as opaque. Provider details such as EF Core `rowversion` or PostgreSQL `xmin` MUST NOT be exposed thoughtlessly in their internal form.
- Entity-tag syntax and comparison MUST follow HTTP semantics rather than approximate string comparison. Hashing the complete serialized response body is not the default implementation.
- OpenAPI MUST document response `ETag`, required request `If-Match`, `412`, and `428` wherever this capability applies.
- The same metadata and behavior apply to Minimal APIs and FastEndpoints. The capability MUST NOT be applied automatically to immutable, naturally commutative, or otherwise explicitly coordinated resources.

### JSON wire format and serialization

- Public JSON uses native `System.Text.Json` with centrally controlled options shared by Minimal APIs and FastEndpoints.
- Property names and textual enum values use `camelCase`. Numeric enum serialization is prohibited for public contracts. Renaming an enum member is breaking, and adding one requires compatibility review because generated clients can model enums as closed sets.
- Identifiers serialize as JSON strings. Instants use `DateTimeOffset`, are normalized to UTC, and use ISO 8601. Date-only and time-only domain values use `DateOnly` and `TimeOnly` respectively.
- Money MUST NOT use binary floating point; contracts use an explicit decimal amount and currency. Numbers MUST NOT be encoded as JSON strings without a documented contract reason.
- Collections serialize as arrays and SHOULD be empty rather than `null` unless null has a distinct documented domain meaning.
- Polymorphism requires an explicit discriminator contract. C# nullability and required members MUST agree with the generated OpenAPI schema.
- Command/request bodies reject unknown members by default so misspelled input is not silently discarded. Duplicate or ambiguous members and invalid enum, date, identifier, or number formats are transport validation failures. A tolerant-reader exception requires an explicit integration contract decision.
- Safe JSON depth and request-size limits MUST be configured. Specialized formats, uploads, and streams require explicit endpoint contracts.
- Public DTO metadata SHOULD be source-generated in module-specific `JsonSerializerContext` types composed with `TypeInfoResolverChain`. One speculative monolithic context is prohibited. Reflection fallback is not the target hot-path behavior and custom converters require a real contract need.
- Ordinary JSON uses `application/json; charset=utf-8`; errors use `application/problem+json`; unsupported request media types return `415 Unsupported Media Type`.

### Binding and transport validation

- The previously approved validation decision applies: native .NET 10 validation is the default; FluentValidation is an optional adapter for rules whose complexity materially benefits from it. FastEndpoints MUST adapt to this MartiX policy rather than making its FluentValidation default the platform contract.
- Route, query, header, and body binding failures and transport/request validation failures return `400` through the canonical Problem Details factory with stable error codes and targets.
- Application invariants and business-state conflicts remain owned by Application Operations and map according to their semantics; `409` is used for a state conflict, not as a generic validation response.
- Validation behavior and payload shape MUST be identical across Minimal APIs and FastEndpoints and MUST be described accurately in OpenAPI.

### Collection pagination, filtering, and sorting

- Cursor pagination is the default for growing collections. Its representation contains explicit `items`, `pageSize`, `nextCursor`, and `hasMore` members rather than using the prohibited generic success envelope.
- Cursors are opaque, integrity-protected or server-bound, and scoped to the applicable filter and sort context. They MUST NOT expose unprotected sensitive data, and clients MUST NOT construct or interpret them.
- Cursor queries require stable deterministic ordering with a unique tie-breaker, such as `createdAt` followed by `id`. Contract tests MUST check traversal for duplicates and omissions.
- Page size has documented safe default and maximum values. An invalid or incompatible cursor returns `400` Problem Details.
- Exact total counts are not calculated by default because they can dominate query cost.
- Offset/page-number pagination is an explicit alternative for bounded datasets and UX that genuinely requires page jumps or totals, such as an administrative data grid. Its use and any `totalCount` query are conscious endpoint decisions.
- Filter and sort fields are endpoint-specific allowlists. Clients MUST NOT submit arbitrary entity property names or EF expressions. Default ordering, limits, values, and cursor semantics MUST be present in OpenAPI.
- The EF Core Specification capability composes permitted filtering, sorting, and pagination; this policy does not reintroduce a generic repository.

### HTTP caching

- HTTP caching is an explicit endpoint capability with secure defaults. A `GET` method alone MUST NOT imply a cache policy.
- Sensitive, identity-specific, tenant-specific, authentication, and authorization-related responses MUST use `Cache-Control: no-store` unless a stricter reviewed design proves otherwise.
- Public and private caching require explicit metadata with a documented lifetime. Shared/public caching MUST NOT apply to representations dependent on identity, tenant, authorization, or personal data.
- `Vary` MUST include every request header that changes the representation; `Vary: Authorization` is not a substitute for a correct private or no-store policy.
- Cache revalidation MAY use `ETag` with `If-None-Match` and `304 Not Modified`; a `304` has no body. This is distinct from optimistic concurrency using `If-Match`.
- ASP.NET Core Output Caching is a server optimization, not the public caching contract, and MUST be enabled per endpoint with a complete cache key including every applicable route, query, tenant, identity, and representation dimension.
- Output caching, durable idempotency replay, authentication responses, and error handling are separate mechanisms and MUST NOT share semantics accidentally.
- A safe invalidation strategy is required before a long cache lifetime is enabled. Minimal APIs and FastEndpoints use the same central metadata policy, and client-relevant cache behavior is documented.

### Minimal API organization and registration

- Canonical Minimal API endpoints use one explicit static endpoint class per HTTP operation, composed by an explicit module endpoint mapper and then by the application composition root.
- Assembly scanning, reflection-discovered endpoint registries, global mutable registries, and an empty marker `IEndpoint` abstraction are prohibited by default.
- A `static abstract` endpoint interface is also deferred because it currently adds generic ceremony without a real polymorphic operation. It MAY be reconsidered when a concrete compile-time consumer justifies it.
- Explicit mapping is preferred for compile-time visibility, startup performance, trimming and Native AOT compatibility, deterministic grouping, straightforward review, and reliable implementation by lower-cost agents.
- A module mapper owns the module prefix, OpenAPI tag, and inherited version group. Each endpoint owns its route suffix, binding, authorization metadata, response metadata, Application Operation invocation, and HTTP mapping.
- Handlers use parameter injection, request only the `HttpContext` capabilities they need, remain thin transport adapters, and propagate `CancellationToken` through all asynchronous work.
- The optional FastEndpoints adapter necessarily uses the framework's `Endpoint<TRequest, TResponse>` inheritance model as a contained framework exception to the composition preference. It MUST NOT dictate canonical Minimal API organization.
- Generated OpenAPI contract tests MUST detect endpoints omitted accidentally from explicit registration.

### Automated contract enforcement

- HTTP policy is executable governance, not documentation-only guidance. New endpoints start with a failing contract or integration test and the smallest vertical-slice implementation that makes it pass.
- Endpoint contract tests inspect route, method, operation ID, version group, authorization, media types, status codes, Problem Details, and applicable idempotency, concurrency, and caching metadata.
- Full-pipeline integration tests cover binding, validation, JSON rules, `401` versus `403`, Problem Details, `Location`, conditional requests, idempotency, lifecycle headers, and observable cancellation where reliable.
- Build-time OpenAPI tests generate and validate every supported major-version document and perform semantic compatibility comparison against the reviewed baseline. Baselines MUST NOT be regenerated blindly.
- A shared conformance suite MUST verify equivalent public behavior for canonical Minimal APIs and the optional FastEndpoints adapter.
- Focused unit tests cover deep reusable mechanics such as Problem Details construction, Result mapping, cursor protection, entity-tag handling, idempotency fingerprints, and lifecycle header formatting.
- An analyzer or architecture test is appropriate only when the rule can be determined reliably. Heuristic enforcement based merely on naming is prohibited. CI failures SHOULD identify the violated rule and link this decision.

## Resolution

MartiX business APIs use explicit `/api/v{major}` URL groups from their first release, exact ASP.NET Core typed results, endpoint-specific immutable DTOs, one safe RFC 9457 Problem Details contract, and build-generated OpenAPI 3.1 as the authoritative client contract. Minimal APIs are mapped explicitly by static per-operation classes and module composition; FastEndpoints remains a conforming optional adapter over the same HTTP semantics.

The policy is enterprise-ready through opt-in durable idempotency, ETag preconditions, secure caching, cursor-first pagination, standards-based deprecation and sunset, strict source-generated `System.Text.Json`, and automated contract enforcement. Capabilities remain explicit so small applications pay only for behavior they select.

### Material alternatives rejected

- A universal serialized `ApiResponse<T>` or public Application `Result<T>` was rejected because HTTP and Problem Details already express outcome semantics and endpoint-specific schemas generate better clients.
- General `IResult` mappers were rejected as the target because they erase exact compile-time response contracts and OpenAPI metadata.
- A FastEndpoints-specific response contract was rejected; its typed union support can use the same ASP.NET Core results.
- `Asp.Versioning.Http` was rejected as a default dependency because literal URL groups satisfy the accepted versioning strategy more transparently. It remains an escalation option for genuinely more complex negotiation.
- Problem Details inheritance, endpoint marker interfaces, assembly scanning, speculative shared DTO bases, global caching, and global idempotency were rejected in favor of composition and explicit capability metadata.
- Query/header/media-type version selection and implicit default versions were rejected because they hide the selected contract from routes and operations.

### Current implementation and migration direction

- Replace divergent exception, Minimal API, FastEndpoints, and validation error payloads with one Problem Details factory. Never expose raw unexpected exception messages.
- Replace placeholder `Created` locations with endpoint-generated resource URIs.
- Treat `ToMinimalApiResult(): IResult`, `IFastEndpointResultMapper`, and `FastEndpointResult` as migration surfaces, then move endpoints to exact typed unions.
- Replace the options-only current-version model and custom `api-current-version` header with explicit route/OpenAPI groups.
- Replace `Deprecation: true` with RFC 9745 date syntax and require migration links; retain RFC 8594 `Sunset` only for an approved removal date.
- Add first-party .NET 10 OpenAPI 3.1 build generation, reviewed semantic baselines, and adapter conformance tests.
- Rework the sample from an implicitly discovered FastEndpoints-only surface to demonstrate the canonical Minimal API conventions, with the FastEndpoints form tested as the optional equivalent.
- Evolve the current in-memory idempotency store only as a development/test adapter; production correctness follows the durable relational protocol already accepted in ticket 104.

### Consequences and extension triggers

- Endpoint code is slightly more explicit, but contracts are visible to the compiler, OpenAPI, tests, reviewers, clients, and implementation agents.
- A breaking public contract requires a new major route and OpenAPI document; compatible changes remain within the current major version after semantic review.
- OpenAPI diff tooling, generated-client verification, security transforms, and performance thresholds are selected by their downstream quality, UI, security, and performance tickets rather than hard-coded here.
- Reconsider the versioning package only when negotiation or route-collation requirements exceed literal groups; reconsider an endpoint interface only when a real compile-time consumer exists.

### Evidence

- [ASP.NET Core 10 Minimal API responses and typed result unions](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis/responses?view=aspnetcore-10.0)
- [ASP.NET Core 10 OpenAPI generation](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/openapi/aspnetcore-openapi?view=aspnetcore-10.0)
- [ASP.NET Core API error handling and Problem Details](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/error-handling-api?view=aspnetcore-10.0)
- [FastEndpoints typed union endpoint support](https://fast-endpoints.com/docs)
- [FastEndpoints OpenAPI documents](https://fast-endpoints.com/docs/openapi-documents)
- [RFC 9457 Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457.html)
- [RFC 9745 Deprecation header](https://www.rfc-editor.org/rfc/rfc9745.html)
- [RFC 8594 Sunset header](https://www.rfc-editor.org/rfc/rfc8594.html)
- [`Idempotency-Key` IETF work in progress](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/07/)
