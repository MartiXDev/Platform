# Anton Dev Tips: best-practice evidence catalog

Research date: 2026-07-17

## Purpose and authority

This note is a supplementary discovery and validation source for the MartiX
.NET 10+ Platform planning branch. It surveys selected newsletter articles
published under `https://antondevtips.com/blog/*` that are relevant to the
accepted modular-monolith, Vertical Slice, EF Core, testing, performance, and
security direction.

Anton Dev Tips is a preferred **secondary source** for examples, heuristics,
trade-offs, and topics worth investigating. It is not the authority for .NET or
ASP.NET Core behavior. Framework claims below are checked against Microsoft
documentation. Product recommendations, architecture preferences, performance
percentages, and “best” claims remain hypotheses until evaluated against the
MartiX quality attributes and representative workloads.

The dispositions in this note are research recommendations, not accepted
Architecture Decision Records and not changes to any Wayfinder ticket.

## Executive synthesis

The strongest guidance to carry into MartiX is:

- keep one deployable backend while enforcing Business Module data and code
  ownership;
- organize use cases as Vertical Slices, tolerate harmless duplication, and
  extract only stable, cohesive capabilities;
- use explicit Application Operations/manual handlers rather than mediator
  indirection;
- use each module's EF Core `DbContext` directly as its unit-of-work boundary,
  with reusable read specifications but no generic repository;
- project read models, bound result sizes, use no-tracking deliberately, and
  inspect generated SQL and query plans before optimizing;
- test domain logic quickly and exercise provider behavior, migrations, HTTP
  contracts, and integrations against real implementations;
- encode module and slice dependency rules as architecture tests and analyzers;
- use the transactional outbox for reliable Integration Event publication;
- use policy-based authorization, safe secret/key handling, stable Problem
  Details, structured telemetry, and negative security tests; and
- apply resilience, caching, rate limiting, and bulk operations only through
  explicit policies backed by measurements and failure semantics.

Several blog defaults should **not** become MartiX defaults: MediatR,
repository/UoW wrappers, Serilog, MassTransit, RabbitMQ, xUnit,
FluentAssertions, Bogus, global JWT authentication, indiscriminate retries,
IP-only rate limits, or commercial bulk libraries. They may be useful provider
choices, examples, or comparison inputs, but MartiX already favors BCL and
first-party capabilities where they are sufficient.

## Article-by-article assessment

### Architecture and feature design

| Article | Recommendation and applicability | Caveats | MartiX disposition |
| --- | --- | --- | --- |
| [Building a Modular Monolith With Vertical Slice Architecture in .NET](https://antondevtips.com/blog/building-a-modular-monolith-with-vertical-slice-architecture-in-dotnet), 2025-04-15 | Keep a single deployable backend, define Business Modules around capabilities, give each module its own `DbContext` and database schema, prevent direct access to another module's data, and place feature slices inside each module. Directly applicable to generated modular-monolith and full-stack presets. | “Easy extraction to microservices” is conditional, not guaranteed. Runtime, data, event, deployment, and team coupling still determine extraction cost. Do not reproduce a four-project Clean Architecture stack per module. | **Adopt** module ownership and Vertical Slices; **adapt** to one project per Business Module and explicit Contracts-only communication. |
| [Vertical Slice Architecture: The Best Ways to Structure Your Project](https://antondevtips.com/blog/vertical-slice-architecture-the-best-ways-to-structure-your-project), 2024-08-09 | Keep endpoint, request/response, validation, orchestration, and feature-specific mapping close to the use case. Choose file granularity according to slice complexity rather than enforcing one class/file layout universally. | The examples frequently use MediatR. File count is an ergonomics concern, not an architectural boundary. Putting all logic in an endpoint harms transport independence for nontrivial business behavior. | **Adapt** to the accepted thin endpoint plus internal sealed Application Operation; allow concern extraction when a slice becomes deep. |
| [Refactoring A Modular Monolith Without MediatR in .NET](https://antondevtips.com/blog/refactoring-a-modular-monolith-without-mediatr-in-dotnet), 2025-08-12 | Prefer directly injected, explicitly invoked manual handlers/operations for navigation, debugging, and transparent dependencies. Directly applicable to MartiX Application Operations. | The article also demonstrates automatic registration and replacement notification machinery. Scanning or recreating a mediator framework would defeat MartiX's explicit-composition rule. Cross-cutting behavior belongs at the narrowest real pipeline seam. | **Adopt** manual operations; **reject** mediator-shaped dispatch and reflection/scanning as defaults. |
| [How to Avoid Code Duplication in Vertical Slice Architecture in .NET](https://antondevtips.com/blog/how-to-avoid-code-duplication-in-vertical-slice-architecture-in-dotnet), 2026-02-24 | Optimize for changeability rather than visual DRY: feature DTOs remain feature-owned, composition is preferred over inheritance, workflows remain in slices, and only stable technical/domain capabilities are extracted. Enforce independence with architecture tests. | “Slices must not reference one another” needs nuance inside one Business Module: shared aggregate behavior belongs in `Domain`, and stable internal capabilities may be intentionally shared. Architecture tests must encode MartiX's actual rules, not naming fashion. | **Adopt** the decision framework and composition; **adapt** dependency rules to module-owned Domain and internal deep modules. |
| [Why Do You Need To Write Architecture Tests in .NET](https://antondevtips.com/blog/why-do-you-need-to-write-architecture-tests-in-dotnet), 2025-11-25 | Turn important boundaries into executable checks: module consumers may access only public Contracts, modules cannot use another module's persistence types, internal feature DTOs do not leak, and the module graph remains acyclic. | NetArchTest and ArchUnitNET are implementation choices, not requirements. Project references and C# accessibility should enforce rules first; tests/analyzers cover rules the compiler cannot express. A separate architecture-test project is unnecessary under the accepted consolidated test topology. | **Adopt** executable architecture rules; **adapt** into `<name>.Tests` and `MartiX.Platform.Analyzers`. |

Architecture here is deliberate policy rather than framework fact. Primary
validation supports the concrete runtime mechanics: ASP.NET Core DI creates a
scope per request by default, while EF Core documents `DbContext` as a short
unit-of-work and prohibits parallel operations on the same instance
([DbContext lifetime and configuration](https://learn.microsoft.com/en-us/ef/core/dbcontext-configuration/)).

### EF Core and persistence

| Article | Recommendation and applicability | Caveats | MartiX disposition |
| --- | --- | --- | --- |
| [Specification Pattern in EF Core: Flexible Data Access Without Repositories](https://antondevtips.com/blog/specification-pattern-in-ef-core-flexible-data-access-without-repositories), 2025-08-26 | Use composable read specifications for reusable query intent and apply them directly to `IQueryable<TEntity>`/`DbSet<TEntity>`. Keep materialization and use-case projection at the caller. Do not introduce a repository merely to hide EF Core. This directly supports the approved refined Specification Pattern. | A specification framework must define unambiguous filter, include, ordering, paging, tracking, and composition semantics. Combining arbitrary query shapes is unsafe. Expression translation is provider-dependent, so specification tests must use supported relational providers, not only LINQ-to-Objects. | **Adopt** the pattern; **adapt** with typed ordering, deterministic paging, explicit tracking, caller-owned projection, bounded composition, and PostgreSQL plus SQL Server integration tests. |
| [How To Increase EF Core Performance for Read Queries in .NET](https://antondevtips.com/blog/how-to-increase-ef-core-performance-for-read-queries-in-dotnet), 2024-10-30 | Index for observed query patterns, project only required columns, use no-tracking for read-only entity materialization, limit result sets, avoid N+1 access, and evaluate single versus split query shapes. Applicable to query operations and specifications. | EF Core can create convention indexes for foreign keys; application-specific indexes still require deliberate design. `AsNoTracking()` is not universally faster when identity resolution matters. Compiled queries and raw SQL should be evidence-driven. | **Adopt** query-shape discipline; **adapt** every optimization to generated SQL, query plans, provider tests, and benchmarks. |
| [Use MassTransit To Implement OutBox Pattern with EF Core and MongoDB](https://antondevtips.com/blog/use-masstransit-to-implement-outbox-pattern-with-ef-core-and-mongodb/), 2024-07-26 | Persist business changes and the outgoing event record atomically, then publish asynchronously with retry. Applicable to reliable inter-module and external Integration Events. | MassTransit, RabbitMQ, and MongoDB are provider examples, not baseline dependencies. An outbox gives at-least-once publication, not exactly-once end-to-end processing; consumers need idempotency/inbox strategy. Event ordering, leasing, poison handling, retention, and observability remain explicit decisions. | **Adopt** transactional semantics; **defer/adapt** transport and implementation to the Integration Event delivery decision. |
| [Why Every EF Core Developer Needs to Try Entity Framework Extensions](https://antondevtips.com/blog/why-every-ef-core-developer-needs-to-try-entity-framework-extensions), 2026-01-27 | Treat large-set writes as a distinct workload and benchmark bulk techniques when normal tracked `SaveChanges` no longer meets a measured service objective. | Sponsored/commercial product guidance is not neutral evidence. EF Core provides `ExecuteUpdate` and `ExecuteDelete` for set-based operations; provider-native copy/bulk APIs may be appropriate. Bulk paths can bypass change tracking, domain events, interceptors, concurrency handling, and audit behavior. | **Reject** a commercial bulk dependency as a default; **defer** a bulk provider capability until benchmarks and semantics justify it. |

EF Core's primary documentation confirms that a `DbContext` is designed for a
single unit of work and that change tracking drives `SaveChanges`
([change tracking](https://learn.microsoft.com/en-us/ef/core/change-tracking/)).
It recommends projections, bounded result sets, deliberate index use, and
careful related-entity loading
([efficient querying](https://learn.microsoft.com/en-us/ef/core/performance/efficient-querying/)).
No-tracking is generally useful for read-only entity queries, but tracking can
be more efficient when identity resolution prevents duplicate materialization
([tracking versus no-tracking](https://learn.microsoft.com/en-us/ef/core/querying/tracking)).
Single and split queries have different consistency, round-trip, and cartesian
explosion trade-offs
([single versus split queries](https://learn.microsoft.com/en-us/ef/core/querying/single-split-queries)).
Optimistic concurrency needs an explicit token and conflict policy
([handling concurrency conflicts](https://learn.microsoft.com/en-us/ef/core/saving/concurrency)).

### Testing and quality gates

| Article | Recommendation and applicability | Caveats | MartiX disposition |
| --- | --- | --- | --- |
| [ASP.NET Core Integration Testing Best Practises](https://antondevtips.com/blog/asp-net-core-integration-testing-best-practises), 2024-08-06 | Run the real application with `WebApplicationFactory`, replace only genuine external boundaries, exercise the actual relational provider and message infrastructure in disposable containers, and test success, validation, error, and event-schema behavior. | xUnit, FluentAssertions, Bogus, MassTransit, and RabbitMQ are article choices. MartiX has selected TUnit. Not every integration warrants a container in every test, and end-to-end suites must remain bounded and diagnosable. “No mocks” is too absolute: controlled fakes are valid at external failure boundaries when the real dependency cannot produce deterministic scenarios. | **Adopt** real-provider and HTTP-contract testing; **adapt** to TUnit, selected providers, reusable fixtures, and a testing pyramid based on risk. |
| [Why Do You Need To Write Architecture Tests in .NET](https://antondevtips.com/blog/why-do-you-need-to-write-architecture-tests-in-dotnet), 2025-11-25 | Add fast structural tests for dependency direction, Contracts-only access, visibility, naming only where semantic, and forbidden persistence access. Run them in every build. | Reflection-based architecture libraries may not see all source-level dependencies or generated code. They complement compiler references, analyzers, and end-to-end verification rather than replace them. | **Adopt** as one category in the consolidated TUnit project. |

Microsoft documents `Microsoft.AspNetCore.Mvc.Testing` and
`WebApplicationFactory<TEntryPoint>` as the infrastructure for functional
integration tests, while cautioning that integration tests should focus on
important infrastructure scenarios because they are slower than unit tests
([ASP.NET Core integration tests](https://learn.microsoft.com/en-us/aspnet/core/test/integration-tests?view=aspnetcore-10.0)).
Therefore MartiX should test domain invariants without infrastructure, operation
and query behavior against real providers, and a representative HTTP contract
set through the host.

### HTTP, performance, resilience, and observability

| Article | Recommendation and applicability | Caveats | MartiX disposition |
| --- | --- | --- | --- |
| [How To Increase Performance of Web APIs in .NET](https://antondevtips.com/blog/how-to-increase-performance-of-web-apis-in-dotnet), 2025-01-21 | Use asynchronous I/O, pagination, response compression/caching where appropriate, efficient serialization/data access, and rate limiting for resource protection. Establish performance tests around representative endpoints. | This is a checklist, not proof that every switch improves a workload. Compression costs CPU and can create security risks for secret-reflecting responses. Cache correctness, invalidation, authenticated content, and multi-node storage require explicit policies. IP-only limiting is unreliable behind proxies/NAT and can punish shared clients. | **Adapt** into opt-in, endpoint-specific policies with load tests and security review. |
| [How To Implement Retries and Resilience Patterns With Polly and Microsoft Resilience](https://antondevtips.com/blog/how-to-implement-retries-and-resilience-patterns-with-polly-and-microsoft-resilience), 2025-04-29 | Use `HttpClientFactory` resilience pipelines for transient outbound HTTP failures; combine bounded timeout, jittered retry, circuit breaker, and concurrency/rate controls according to the dependency contract. | Never retry non-idempotent work blindly. Retry budgets must respect request deadlines and server hints. Fallbacks must not disguise incorrect or stale business results. Hedging duplicates load and is unsafe for side effects. `Microsoft.Extensions.Http.Resilience` already integrates Polly; do not layer duplicate policies. | **Adopt** first-party HTTP resilience as an optional outbound-integration baseline; **adapt** per operation and idempotency. |
| [Logging Best Practices in ASP.NET Core](https://antondevtips.com/blog/logging-best-practices-in-asp-net-core), 2024-09-03 | Use structured message templates, meaningful levels, correlation/trace context, centralized exception handling, and never expose stack traces to clients. Keep sensitive information out of logs. | Serilog is a provider choice, not required for structured logging. File logging is usually unsuitable for ephemeral/container workloads. Request/response body logging can leak credentials, tokens, personal data, and large payloads. Logs alone do not provide metrics or distributed traces. | **Adopt** semantic practices; **reject** Serilog as a mandatory baseline; **adapt** to `Microsoft.Extensions.Logging` plus OpenTelemetry-first export seams. |
| [Getting Started with Middlewares in ASP.NET Core](https://antondevtips.com/blog/getting-started-with-middlewares-in-aspnet-core/), 2024-03-30 | Make middleware ordering explicit and test it: exception handling must wrap downstream failures; authentication precedes authorization; caching, CORS, static files, and rate limiting must be placed according to their documented semantics. | There is no universal ordering list for every selected capability. Endpoint routing and framework versions affect constraints. Avoid custom middleware when built-in middleware or endpoint filters provide the narrower seam. | **Adopt** explicit composition and ordering tests; **adapt** exact order per selected capabilities and official docs. |

ASP.NET Core supplies first-party rate limiting, but Microsoft requires careful
load testing and review before deployment
([rate limiting](https://learn.microsoft.com/en-us/aspnet/core/performance/rate-limit?view=aspnetcore-10.0)).
Output caching is opt-in per policy; defaults exclude authenticated requests and
cookie-setting responses, and multi-node deployments require an appropriate
store
([output caching](https://learn.microsoft.com/en-us/aspnet/core/performance/caching/output?view=aspnetcore-10.0)).
The platform provides `IExceptionHandler` and Problem Details services for
centralized API failures
([error handling](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/error-handling?view=aspnetcore-10.0),
[API Problem Details](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/error-handling-api?view=aspnetcore-9.0)).
These primary contracts should drive MartiX adapters rather than a blog's sample
middleware.

### Security and framework evolution

| Article | Recommendation and applicability | Caveats | MartiX disposition |
| --- | --- | --- | --- |
| [Authentication and Authorization Best Practices in ASP.NET Core](https://antondevtips.com/blog/authentication-and-authorization-best-practices-in-aspnetcore), 2025-03-25 | Separate authentication from authorization, validate token issuer/audience/lifetime/signature, hash passwords with a maintained implementation, and prefer policy/claim/resource-based authorization over scattered role checks. Test 401 and 403 paths. | JWT is not universally the right browser-session model. Never commit signing secrets as shown in simplified examples. Token issuance, refresh/revocation, key rotation, phishing-resistant MFA, cookies/BFF, external OIDC, service identities, and authorization ownership need provider-specific threat models. | **Adapt** security principles; **reject** a single home-grown JWT flow as the default; retain the approved optional identity-provider matrix. |
| [New Features in .NET 10 and C# 14](https://antondevtips.com/blog/new-features-in-dotnet-10-and-csharp-14), 2025-11-11 | Target supported .NET 10/C# 14 deliberately and evaluate first-party Minimal API validation, OpenAPI 3.1, SSE, JSON/EF improvements, and language features before introducing third-party equivalents. | “New” does not mean mandatory or appropriate. Public API language features affect compatibility and analyzers. Native AOT, trimming, OpenAPI, and provider behavior require matrix validation. File-based apps are useful tooling/prototype surfaces, not a replacement for generated production projects. | **Adopt** .NET 10 LTS baseline and first-party-first evaluation; **defer** each feature to its owning capability ticket and tests. |

ASP.NET Core authentication is scheme-based and distinct from authorization
([authentication overview](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/?view=aspnetcore-10.0)).
Microsoft recommends keeping secrets out of source and production configuration
files, and points to managed identity and external secret stores for deployed
systems
([ASP.NET Core security](https://learn.microsoft.com/en-us/aspnet/core/security/?view=aspnetcore-10.0)).
A fallback authorization policy can make authentication required by default,
reducing the chance that a new endpoint is accidentally anonymous
([secure data with authorization](https://learn.microsoft.com/en-us/aspnet/core/security/authorization/secure-data?view=aspnetcore-10.0)).

.NET 10 is an LTS release supported for three years, and its official overview
links the authoritative ASP.NET Core, EF Core, SDK, runtime, and C# 14 changes
([what's new in .NET 10](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10/overview),
[.NET releases and support](https://learn.microsoft.com/en-us/dotnet/core/releases-and-support)).
Templates should pin a supported SDK feature band, consume servicing updates,
and validate breaking changes rather than copying transient newsletter code.

## MartiX validation checklist derived from the survey

Use this checklist when an Anton Dev Tips article inspires a later design:

1. Identify whether the claim is framework behavior, measured behavior, or an
   opinion/pattern recommendation.
2. Verify framework behavior against current Microsoft documentation, source,
   or specification for the exact target version.
3. State the capability and quality attribute being improved; do not add a
   package merely because it appears in the sample.
4. Prefer compiler visibility, project references, built-in ASP.NET Core/.NET
   functionality, and explicit composition before runtime conventions.
5. Record provider and deployment assumptions, including PostgreSQL versus SQL
   Server and single-node versus multi-node behavior.
6. Test translations, migrations, concurrency, failure paths, retries, and
   security against real selected providers.
7. Benchmark performance changes with representative data and concurrency;
   retain the baseline and regression threshold.
8. Threat-model authentication, caching, logging, rate limiting, file access,
   and event delivery rather than accepting sample defaults.
9. Record the final WHAT/WHY in an ADR or owning Wayfinder ticket; link this note
   only as discovery evidence.
10. Revisit articles when dependencies or the target .NET version change; the
    article publication date is part of the evidence.

## Follow-up topics worth researching from the site

The following subjects are useful discovery inputs for dedicated tickets, but
this survey does not accept their implementation:

- transactional outbox/inbox, idempotent consumers, ordering, and event schema
  evolution for Integration Event delivery;
- EF Core migration bundles, separate migrator execution, concurrent rollout,
  retries, concurrency tokens, and provider parity;
- Minimal API versus FastEndpoints validation and Problem Details behavior;
- OpenTelemetry logs, metrics, traces, health checks, and redaction;
- cookie/BFF, external OIDC, ASP.NET Core Identity, service actors, passkeys, and
  policy/resource-based authorization;
- Testcontainers lifecycle and parallel isolation under TUnit;
- HybridCache/output cache correctness, stampede protection, and invalidation;
- Native AOT/trimming compatibility and measured API startup/throughput; and
- React, Blazor Web App, and Vue security/accessibility/contract parity.

## Scope limitations

This was a targeted survey, not a crawl or endorsement of the entire site.
Sponsored passages and vendor performance claims were excluded as primary
evidence. Article samples may target older framework/package versions and may
omit production concerns for brevity. Primary-source validation here establishes
documented platform behavior, not that a MartiX implementation has passed its
future compatibility, security, or performance gates.
