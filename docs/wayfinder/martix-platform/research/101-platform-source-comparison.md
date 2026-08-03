# Platform source comparison at fixed revisions

## Research question

At fixed revisions, which architecture, capabilities, dependencies, quality
mechanisms, and maintenance trade-offs from MartiX WebApi, MartiX dotnet
templates, Ardalis MinimalClean, and FullStackHero should the MartiX Platform
adopt, adapt, or reject?

## Method and evaluation frame

This is a source-level comparison, not a feature-list comparison. The repositories
were inspected at the exact revisions below. Claims link to immutable GitHub
permalinks. Official documentation was not needed to establish the material
facts; the repositories themselves are the owning primary sources.

The recommendation is constrained by the accepted Wayfinder decisions. In
particular, the target is a modular-monolith default with an automatic baseline,
optional capabilities, native Minimal APIs, direct Application Operations by
default, explicit compile-time mapping, native-first validation, optional
Identity providers, module-owned EF Core contexts, a durable transactional
outbox, TUnit, and generated-source ownership. See the accepted decisions in the
[Wayfinder map](../map.md).

## Fixed revisions

| Source | Commit | Commit date | Scope inspected |
| --- | --- | --- | --- |
| MartiXDev/WebApi | [`c6bbd9d5`](https://github.com/MartiXDev/WebApi/commit/c6bbd9d5fcb3738ca05bce8ef88c72f35d918c82) | 2026-03-12 | Current workspace `HEAD`; active `src`, `tests`, and CI, excluding `archive` |
| MartiXDev/dotnet-templates | [`c08b93bc`](https://github.com/MartiXDev/dotnet-templates/commit/c08b93bc6e446e6e68559f64a5e0f7469200384e) | 2026-03-30 | Template pack, generated solution, tests, bootstrap scripts, and CI |
| ardalis/CleanArchitecture | [`a064d0b3`](https://github.com/ardalis/CleanArchitecture/commit/a064d0b369b719ba03da71da1560d208d7e02e03) | 2026-07-10 | `MinimalClean` only, plus repository workflows that build or publish it |
| fullstackhero/dotnet-starter-kit | [`6f381db4`](https://github.com/fullstackhero/dotnet-starter-kit/commit/6f381db433dbf317f5a1bdf993df3ffbc99768af) | 2026-07-13 | Backend, template, CLI/distribution model, tests, and CI; front-end internals sampled only for capability boundaries |

The WebApi revision is present on `origin/main`. The other three SHAs were
resolved from their public default-branch `HEAD` on 2026-07-15 and inspected from
shallow clones. The comparison is therefore reproducible but is not a statement
about later commits.

## Executive conclusion

No repository should be adopted wholesale.

- **WebApi is the product seed, not yet the target platform.** Keep its Result
  semantics, TUnit direction, analyzer/release groundwork, and selected HTTP
  conventions. Split the mixed package surface and replace the shallow or
  misleading mediator, mapping, outbox, and capability registrations.
- **dotnet-templates has the best immediately reusable template verification
  mechanism.** Adopt its cross-platform generated-variant matrix and release
  mechanics. Replace its single-project, FastEndpoints-first, SQL Server-only
  application shape and repair the divergence between copied library code and
  the stated WebApi dependency.
- **Ardalis MinimalClean is a useful teaching sample and historical input, not
  the enterprise-ready default.** Its single-project vertical slices and typed
  endpoint results are good examples, but its topology, mandatory third-party
  stack, missing generated test suite, and post-save event dispatch do not meet
  the accepted target.
- **FullStackHero is the richest pattern mine.** Adapt its runtime/contracts
  module split, architecture tests, one-shot migrator, template smoke tests,
  operational baseline, and explicit static mappings. Reject wholesale copying:
  it makes Identity, multitenancy, mediator, FluentValidation, extensive
  infrastructure, and two React clients part of a very large source-owned
  product. Its outbox also needs stronger transactional and multi-replica
  semantics before reuse.

The recommended strategy is therefore **MartiX-owned architecture with selective
pattern extraction**, not a fork of FullStackHero or Ardalis.

## Architecture and topology

### MartiXDev/WebApi

The active solution has a main runtime library, an analyzer, a non-packable EF
Core integration, a sample, benchmarks, and one test project
([solution](https://github.com/MartiXDev/WebApi/blob/c6bbd9d5fcb3738ca05bce8ef88c72f35d918c82/MartiX.WebApi.slnx)).
The main package targets `net10.0`, references `Microsoft.AspNetCore.App`, and
depends on `Microsoft.Extensions.Http.Resilience`; it also embeds the analyzer
([project file](https://github.com/MartiXDev/WebApi/blob/c6bbd9d5fcb3738ca05bce8ef88c72f35d918c82/src/MartiX.WebApi/MartiX.WebApi.csproj)).
The EF Core project depends back on that whole package and is not packable
([EF Core project](https://github.com/MartiXDev/WebApi/blob/c6bbd9d5fcb3738ca05bce8ef88c72f35d918c82/src/MartiX.WebApi.EFCore/MartiX.WebApi.EFCore.csproj)).

This topology is a library repository rather than an application template. Its
main weakness is responsibility density: domain primitives, Result, HTTP,
Blazor-client behavior, caching, resilience, idempotency, observability,
security, version metadata, and optional integrations all share one runtime
package. `AddMartiXWebApiDefaults` registers most of them together, including an
in-memory outbox and idempotency store
([registration source](https://github.com/MartiXDev/WebApi/blob/c6bbd9d5fcb3738ca05bce8ef88c72f35d918c82/src/MartiX.WebApi/DependencyInjection/ServiceCollectionExtensions.cs)).
That is inconsistent with the accepted automatic baseline plus explicit
capabilities.

### MartiXDev/dotnet-templates

At this revision, dotnet-templates is an expanded derivative of MinimalClean,
not an independent application architecture. The two `Program.cs` files and
most Domain/Features/Infrastructure source remain structurally equivalent
([MartiX startup](https://github.com/MartiXDev/dotnet-templates/blob/c08b93bc6e446e6e68559f64a5e0f7469200384e/templates/MartiX.WebApi.Template/src/MartiX.WebApi.Template.Web/Program.cs),
[Ardalis startup](https://github.com/ardalis/CleanArchitecture/blob/a064d0b369b719ba03da71da1560d208d7e02e03/MinimalClean/src/MinimalClean.Architecture.Web/Program.cs)).
Its independent value is chiefly template-product engineering: variants, UI,
tests, generated-repository assets, and delivery automation.

The template produces one Web application plus ServiceDefaults, optional Aspire
AppHost, optional Blazor UI, and one Web test project. The two options are
`frontend = blazor|none` and `orchestrator = aspire|none`, with both capabilities
enabled by default
([template definition](https://github.com/MartiXDev/dotnet-templates/blob/c08b93bc6e446e6e68559f64a5e0f7469200384e/templates/MartiX.WebApi.Template/.template.config/template.json)).
Its computed `UseBlazor` expression also requires Aspire, so Blazor cannot be
selected independently at this revision. That coupling conflicts with the
accepted composable-capability model.
The Web project contains domain, infrastructure, and feature slices in one
assembly. This is close to Ardalis MinimalClean, not the accepted modular
monolith with Business Module runtime/contracts projects.

There is also a material source-of-truth inconsistency. The repository README
says the template is built on and depends on MartiXDev/WebApi
([README](https://github.com/MartiXDev/dotnet-templates/blob/c08b93bc6e446e6e68559f64a5e0f7469200384e/README.md)),
but the generated Web project has no `MartiX.WebApi` package or project reference
([project file](https://github.com/MartiXDev/dotnet-templates/blob/c08b93bc6e446e6e68559f64a5e0f7469200384e/templates/MartiX.WebApi.Template/src/MartiX.WebApi.Template.Web/MartiX.WebApi.Template.Web.csproj)).
Instead, selected guards, Result, shared-kernel, repository, and specification
sources are copied under `MartiX/WebApi` in the template. This duplicates
maintenance and defeats the accepted package-update path.

### Ardalis MinimalClean

MinimalClean is deliberately a single Web project accompanied by an Aspire host
and ServiceDefaults
([solution](https://github.com/ardalis/CleanArchitecture/blob/a064d0b369b719ba03da71da1560d208d7e02e03/MinimalClean/MinimalClean.Architecture.slnx)).
Its own README positions the shape for smaller applications and explicitly says
larger enterprise applications should use the full template
([template README](https://github.com/ardalis/CleanArchitecture/blob/a064d0b369b719ba03da71da1560d208d7e02e03/MinimalClean/README.template.md)).
Namespace dependencies are partially enforced with NsDepCop
([rules](https://github.com/ardalis/CleanArchitecture/blob/a064d0b369b719ba03da71da1560d208d7e02e03/MinimalClean/src/MinimalClean.Architecture.Web/config.nsdepcop)).

This is an effective KISS reference, but it has no Business Module isolation,
contracts-only cross-module dependencies, module-owned contexts, or modular
composition root. It should inform the `api` preset, not define the default
`modular-monolith` preset.

### FullStackHero

FullStackHero is a large modular monolith: focused BuildingBlocks projects,
runtime plus `.Contracts` projects for ten Business Modules, API/AppHost/
DbMigrator/migrations hosts, twelve backend test projects, a CLI, two React
applications, and deployment assets
([solution](https://github.com/fullstackhero/dotnet-starter-kit/blob/6f381db433dbf317f5a1bdf993df3ffbc99768af/src/FSH.Starter.slnx)).
Runtime modules may reference other modules' contracts but architecture tests
forbid runtime-to-runtime references
([module test](https://github.com/fullstackhero/dotnet-starter-kit/blob/6f381db433dbf317f5a1bdf993df3ffbc99768af/src/Tests/Architecture.Tests/ModuleArchitectureTests.cs)).
Core isolation from ASP.NET Core and EF Core is also tested
([layer tests](https://github.com/fullstackhero/dotnet-starter-kit/blob/6f381db433dbf317f5a1bdf993df3ffbc99768af/src/Tests/Architecture.Tests/LayerDependencyTests.cs)).

This is the closest source topology to the accepted destination. However, all
runtime framework and module projects are generated source, not reusable NuGet
packages. The repository explicitly disables packing for them and ships only the
template and CLI
([build policy](https://github.com/fullstackhero/dotnet-starter-kit/blob/6f381db433dbf317f5a1bdf993df3ffbc99768af/src/Directory.Build.props)).
MartiX should adapt the boundaries while retaining its approved hybrid lifecycle:
stable Platform Library behavior updates through packages; application-specific
Business Modules remain generated, owned source.

## Cross-cutting implementation comparison

| Concern | WebApi | dotnet-templates | Ardalis MinimalClean | FullStackHero | MartiX disposition |
| --- | --- | --- | --- | --- | --- |
| Runtime | `net10.0`; no SDK pin; main package declares trimming/AOT compatibility | `net10.0`; no SDK pin | `net10.0`; SDK `10.0.100` rolls to latest major and permits preview | `net10.0`; SDK `10.0.100` rolls to latest feature | **Adapt:** pin a supported .NET 10 SDK, use C# 14 policy, and test declared AOT combinations rather than rely on metadata alone |
| HTTP | Native Result-to-Minimal-API mapper exists, but sample uses FastEndpoints | FastEndpoints is canonical | FastEndpoints is canonical | Native Minimal APIs | **Adopt:** FullStackHero's native route style; improve WebApi mapping with typed result unions; keep FastEndpoints optional |
| Dispatch | Custom handler/behavior interfaces; sample injects handler directly | Source-generated Mediator plus logging behavior | Source-generated Mediator plus logging behavior | Source-generated Mediator everywhere | **Reject as baseline:** use direct Application Operations; keep source-generated mediator optional |
| Validation | Custom string-returning mediator validators | FastEndpoints/FluentValidation request validators | FastEndpoints/FluentValidation request validators | FluentValidation in a mediator behavior | **Adapt:** native transport validation plus structured application/domain errors; FluentValidation only as an optional complex-rule capability |
| Mapping | Runtime object dictionary labelled Mapster | Explicit constructors and FastEndpoints mapper classes | Explicit constructors and FastEndpoints mapper classes | Explicit static mapping helpers | **Adopt:** explicit slice-owned mapping; optionally generate it with Mapperly; reject global runtime mapping |
| Data | Specifications and optional EF interceptor; no application context | One EF Core context, SQL Server, repository/specification | One EF Core context, SQL Server, repository/specification | Module-owned contexts, PostgreSQL migrations, separate migrator | **Adapt:** FullStackHero topology, but default to direct EF queries/projections and introduce repositories/specifications only when they hide real complexity |
| Identity | `ICurrentUser` seam only | None | None | Mandatory ASP.NET Core Identity, JWT, permissions, sessions, impersonation, multitenancy | **Adapt:** contracts, actor/permission seams, and tests; make provider implementation optional and isolated |
| Messaging | In-memory outbox plus post-save marker interceptor | Post-save in-process domain events; no integration outbox | Post-save in-process domain events; no integration outbox | In-memory/RabbitMQ event buses, inbox, relational outbox, hosted dispatcher | **Adapt after redesign:** separate domain and integration events; make the outbox atomic and concurrency-safe for PostgreSQL and SQL Server |
| Observability | `ActivitySource`/`Meter` helpers and health conventions, no exporter stack | Aspire ServiceDefaults, OpenTelemetry, Serilog, health | Aspire ServiceDefaults, OpenTelemetry, Serilog, health | OpenTelemetry, Serilog, dependency instrumentation, health, auditing | **Adapt:** baseline semantic conventions and health; provider/exporter wiring as host capability |
| Tests | TUnit on Microsoft.Testing.Platform; unit-heavy single project | TUnit, host/feature tests, EF InMemory | No test project in MinimalClean output | xUnit, architecture tests, WebApplicationFactory, Testcontainers | **Combine:** keep TUnit; adopt FullStackHero test layers and dotnet-templates' scaffold matrix |
| Template | None | One `dotnet new` template with two choices | One naming-only `dotnet new` template | CLI and template; only Aspire/front-end are removable | **Adapt:** one capability manifest with tested `api`, `modular-monolith`, and `full-stack` presets; generated source is owned after creation |

### Endpoint, dispatch, validation, and mapping details

WebApi already translates Result statuses to ASP.NET Core results, but the public
return type is broad `IResult` and a created generic result hard-codes `/` as the
location
([mapper](https://github.com/MartiXDev/WebApi/blob/c6bbd9d5fcb3738ca05bce8ef88c72f35d918c82/src/MartiX.WebApi/Results/AspNetCore/MinimalApiResultExtensions.cs)).
Its sample does not dispatch through a mediator: it injects
`IRequestHandler<,>` directly, then manually maps the result through a generic
FastEndpoints adapter
([sample](https://github.com/MartiXDev/WebApi/blob/c6bbd9d5fcb3738ca05bce8ef88c72f35d918c82/src/MartiX.WebApi.Sample/Program.cs)).
The runtime mapping registry keys exact runtime source/destination types and
throws at runtime for missing maps
([registry](https://github.com/MartiXDev/WebApi/blob/c6bbd9d5fcb3738ca05bce8ef88c72f35d918c82/src/MartiX.WebApi/Integrations/Mapster/InMemoryMapRegistry.cs)).
These are shallow seams that should be removed rather than made permanent.

The MartiX and Ardalis templates demonstrate explicit typed HTTP unions,
validators beside requests, and local mapping. Their create-product examples
return `Results<Created<...>, ValidationProblem, ProblemHttpResult>`
([MartiX example](https://github.com/MartiXDev/dotnet-templates/blob/c08b93bc6e446e6e68559f64a5e0f7469200384e/templates/MartiX.WebApi.Template/src/MartiX.WebApi.Template.Web/Feature/Product/Create/CreateEndpoint.cs),
[Ardalis example](https://github.com/ardalis/CleanArchitecture/blob/a064d0b369b719ba03da71da1560d208d7e02e03/MinimalClean/src/MinimalClean.Architecture.Web/ProductFeatures/Create/CreateEndpoint.cs)).
The useful ideas are contract visibility and slice locality; FastEndpoints and
FluentValidation themselves are not target defaults.

FullStackHero uses static Minimal API endpoint classes and enforces their shape
with architecture tests
([endpoint](https://github.com/fullstackhero/dotnet-starter-kit/blob/6f381db433dbf317f5a1bdf993df3ffbc99768af/src/Modules/Catalog/Modules.Catalog/Features/v1/Products/CreateProduct/CreateProductEndpoint.cs),
[convention tests](https://github.com/fullstackhero/dotnet-starter-kit/blob/6f381db433dbf317f5a1bdf993df3ffbc99768af/src/Tests/Architecture.Tests/EndpointConventionTests.cs)).
It also uses manual static mappers rather than a global mapping dependency
([mapping example](https://github.com/fullstackhero/dotnet-starter-kit/blob/6f381db433dbf317f5a1bdf993df3ffbc99768af/src/Modules/Chat/Modules.Chat/Features/v1/Internal/ChatMappers.cs)).
Adopt those two structural ideas. Do not adopt its universal mediator and
FluentValidation pipeline
([validation behavior](https://github.com/fullstackhero/dotnet-starter-kit/blob/6f381db433dbf317f5a1bdf993df3ffbc99768af/src/BuildingBlocks/Web/Mediator/Behaviors/ValidationBehavior.cs)).

### Persistence, events, and migrations

The current WebApi interceptor writes a constant `db.saved` marker only after
`SaveChanges` succeeds, into an in-memory store
([interceptor](https://github.com/MartiXDev/WebApi/blob/c6bbd9d5fcb3738ca05bce8ef88c72f35d918c82/src/MartiX.WebApi.EFCore/Outbox/OutboxSaveChangesInterceptor.cs),
[store](https://github.com/MartiXDev/WebApi/blob/c6bbd9d5fcb3738ca05bce8ef88c72f35d918c82/src/MartiX.WebApi/Outbox/InMemoryOutboxStore.cs)).
It is neither an integration-event outbox nor durable.

Both MinimalClean-derived templates dispatch domain events after persistence,
outside the committing transaction
([MartiX interceptor](https://github.com/MartiXDev/dotnet-templates/blob/c08b93bc6e446e6e68559f64a5e0f7469200384e/templates/MartiX.WebApi.Template/src/MartiX.WebApi.Template.Web/Infrastructure/Data/EventDispatcherInterceptor.cs),
[Ardalis interceptor](https://github.com/ardalis/CleanArchitecture/blob/a064d0b369b719ba03da71da1560d208d7e02e03/MinimalClean/src/MinimalClean.Architecture.Web/Infrastructure/Data/EventDispatcherInterceptor.cs)).
That may be acceptable for best-effort internal reactions, but it is not durable
cross-module delivery.

FullStackHero offers the most complete reference: integration-event records,
inbox deduplication, retry/dead-letter state, a hosted dispatcher, and RabbitMQ
or in-memory buses
([outbox store](https://github.com/fullstackhero/dotnet-starter-kit/blob/6f381db433dbf317f5a1bdf993df3ffbc99768af/src/BuildingBlocks/Eventing/Outbox/EfCoreOutboxStore.cs),
[dispatcher](https://github.com/fullstackhero/dotnet-starter-kit/blob/6f381db433dbf317f5a1bdf993df3ffbc99768af/src/BuildingBlocks/Eventing/Outbox/OutboxDispatcher.cs),
[inbox](https://github.com/fullstackhero/dotnet-starter-kit/blob/6f381db433dbf317f5a1bdf993df3ffbc99768af/src/BuildingBlocks/Eventing/Inbox/EfCoreInboxStore.cs)).
It should still be adapted, not copied. `AddAsync` calls `SaveChangesAsync`
itself, so atomicity depends on the caller sharing that context and not having
committed earlier. Batch selection has no visible claim token, row lock, lease,
or optimistic concurrency check; multiple application replicas can select the
same pending rows. At-least-once delivery tolerates duplicates, but the target
also requires explicit provider-specific concurrency-safe claiming.

FullStackHero's separate one-shot migrator is a strong pattern. It owns migration
ordering and avoids applying DDL from the API startup path
([migrator](https://github.com/fullstackhero/dotnet-starter-kit/blob/6f381db433dbf317f5a1bdf993df3ffbc99768af/src/Host/FSH.Starter.DbMigrator/Program.cs)).
Adopt the lifecycle and operational separation, then simplify it for the MartiX
capability set and support both PostgreSQL and SQL Server.

### Identity and security

WebApi has a small `ICurrentUser` seam but no adapter or authorization model
([interface](https://github.com/MartiXDev/WebApi/blob/c6bbd9d5fcb3738ca05bce8ef88c72f35d918c82/src/MartiX.WebApi/Abstractions/ICurrentUser.cs)).
This is directionally correct but too user/HTTP-oriented for background and
service actors.

FullStackHero supplies extensive ASP.NET Core Identity, JWT, role/permission,
session, impersonation, audit, and tenant integration. The Identity runtime is
an explicit module project with a contracts project, which is a valuable seam
([Identity project](https://github.com/fullstackhero/dotnet-starter-kit/blob/6f381db433dbf317f5a1bdf993df3ffbc99768af/src/Modules/Identity/Modules.Identity/Modules.Identity.csproj)).
Its host nevertheless wires Identity and requires a JWT signing key in
production
([host](https://github.com/fullstackhero/dotnet-starter-kit/blob/6f381db433dbf317f5a1bdf993df3ffbc99768af/src/Host/FSH.Starter.Api/Program.cs)).
MartiX should copy neither that mandatory choice nor Identity types into Business
Modules. Adapt its permission metadata and security architecture tests, including
the fail-open regression guard
([authorization test](https://github.com/fullstackhero/dotnet-starter-kit/blob/6f381db433dbf317f5a1bdf993df3ffbc99768af/src/Tests/Architecture.Tests/AuthorizationMetadataTests.cs)),
behind the already approved actor, authentication-provider, and authorization
seams.

## Quality automation and template mechanisms

### What to adopt

1. **Generated-output matrices from dotnet-templates.** Its CI packs and
   generates default, no-front-end, and API-only variants on Windows and Linux,
   then validates the output
   ([workflow](https://github.com/MartiXDev/dotnet-templates/blob/c08b93bc6e446e6e68559f64a5e0f7469200384e/.github/workflows/template-validation.yml)).
   Generalize this into the MartiX preset/capability matrix and add PostgreSQL,
   SQL Server, Identity-provider, AOT-compatible, and UI combinations according
   to risk rather than testing the full Cartesian product.
2. **Scaffold-the-shipped-artifact testing from FullStackHero.** Its smoke
   workflow packs the NuGet template, installs that package, generates full and
   backend-only outputs, builds them, and runs architecture tests
   ([workflow](https://github.com/fullstackhero/dotnet-starter-kit/blob/6f381db433dbf317f5a1bdf993df3ffbc99768af/.github/workflows/template-smoke.yml)).
3. **Layered quality gates from FullStackHero.** The backend workflow builds with
   warnings as errors, audits direct dependencies, separates unit and
   Testcontainers integration tests, enforces an 80% line-coverage floor, and
   smoke-tests the migrator container
   ([backend CI](https://github.com/fullstackhero/dotnet-starter-kit/blob/6f381db433dbf317f5a1bdf993df3ffbc99768af/.github/workflows/backend.yml)).
   Adopt the gate categories, not necessarily its exact threshold or scripts.
4. **MartiX TUnit and analyzer direction.** WebApi already uses TUnit on
   Microsoft.Testing.Platform
   ([test project](https://github.com/MartiXDev/WebApi/blob/c6bbd9d5fcb3738ca05bce8ef88c72f35d918c82/tests/MartiX.WebApi.Tests/MartiX.WebApi.Tests.csproj))
   and ships a focused analyzer that prevents detail-free Result errors
   ([analyzer](https://github.com/MartiXDev/WebApi/blob/c6bbd9d5fcb3738ca05bce8ef88c72f35d918c82/src/MartiX.WebApi.Analyzers/ResultErrorWithoutDetailsAnalyzer.cs)).
   Preserve this framework choice and expand analyzers only for high-value,
   mechanically enforceable platform invariants.
5. **Cross-platform and release mechanics.** WebApi already gates build/test and
   zero warnings and uses OIDC-based NuGet publishing
   ([quality](https://github.com/MartiXDev/WebApi/blob/c6bbd9d5fcb3738ca05bce8ef88c72f35d918c82/.github/workflows/quality-analysis.yml),
   [release](https://github.com/MartiXDev/WebApi/blob/c6bbd9d5fcb3738ca05bce8ef88c72f35d918c82/.github/workflows/release.yml)).
   dotnet-templates similarly validates generated variants and publishes through
   OIDC. Consolidate conventions so both repositories follow one release train
   and compatibility policy.

### What not to mistake for quality

- Ardalis builds MinimalClean on Windows, Linux, and macOS, but that workflow
  only restores and builds; MinimalClean contains no generated test project
  ([workflow](https://github.com/ardalis/CleanArchitecture/blob/a064d0b369b719ba03da71da1560d208d7e02e03/.github/workflows/cross-platform-build-test-minimal.yml)).
  Its publish workflow contains template-install tests only as commented-out
  commands
  ([publish workflow](https://github.com/ardalis/CleanArchitecture/blob/a064d0b369b719ba03da71da1560d208d7e02e03/.github/workflows/publish-templates.yml)).
- A large test count is not a substitute for capability-contract coverage. The
  MartiX target needs explicit preset, provider, migration, authorization,
  observability, and AOT assertions tied to its manifest.
- WebApi's `IsAotCompatible` and `IsTrimmable` properties are useful intent, but
  the same package exposes Blazor JSON methods marked `RequiresDynamicCode` and
  `RequiresUnreferencedCode`
  ([client helpers](https://github.com/MartiXDev/WebApi/blob/c6bbd9d5fcb3738ca05bce8ef88c72f35d918c82/src/MartiX.WebApi/Integrations/Blazor/BlazorHttpResponseMessageExtensions.cs)).
  This is not necessarily an invalid annotation, but it proves compatibility is
  API- and capability-specific. CI publish/smoke tests must define the truthful
  compatibility matrix.

## Maintenance burden

### Lowest burden: Ardalis MinimalClean

The single Web project minimizes project ceremony. The cost is weaker physical
isolation and a surprisingly broad mandatory third-party set: Ardalis Result,
SharedKernel, Specification, GuardClauses and SmartEnum; FastEndpoints; Mediator;
Vogen; NsDepCop; Serilog; MailKit; and Aspire/OpenTelemetry dependencies
([central packages](https://github.com/ardalis/CleanArchitecture/blob/a064d0b369b719ba03da71da1560d208d7e02e03/MinimalClean/Directory.Packages.props)).
It is small to navigate but not low-dependency or aligned with native-first
MartiX decisions.

### Moderate but duplicated burden: current MartiX repositories

WebApi is a compact repository, but its broad public package makes every change
a compatibility concern. dotnet-templates then duplicates parts of that public
library as source while independently carrying FastEndpoints, Mediator,
FluentValidation, EF Core, Aspire, Serilog, and UI dependencies. Maintaining both
without an executable capability manifest risks drift; the README/project
reference mismatch demonstrates that drift already. It also has a second
manifest-driven scaffold-asset lifecycle with `bootstrap` and `update` scripts
([boundary contract](https://github.com/MartiXDev/dotnet-templates/blob/c08b93bc6e446e6e68559f64a5e0f7469200384e/docs/generated-repo-boundary.md)).
The asset manifest is useful evidence for the future capability manifest, but
centrally re-materializing application-owned files conflicts with the accepted
explicit, reviewed migration model unless ownership and merge behavior are made
unambiguous.

### Highest burden: FullStackHero

FullStackHero offers the most production machinery, but it also makes the
consumer own all of it: many BuildingBlocks, ten runtime/contracts module pairs,
three hosts, database migrations, two front ends, deployment stacks, a CLI, and
large test suites. Its template only removes Aspire and front ends
([template](https://github.com/fullstackhero/dotnet-starter-kit/blob/6f381db433dbf317f5a1bdf993df3ffbc99768af/.template.config/template.json));
Identity, multitenancy, messaging, jobs, caching, storage, quotas, and the module
catalog remain. This is excellent if the generated product matches the target
SaaS, but expensive for every future MartiX application and incompatible with
the approved opt-in capability model.

## Adopt, adapt, reject

### Adopt substantially

- FullStackHero runtime/Contracts Business Module topology and architecture-test
  intent.
- FullStackHero one-shot migrator lifecycle and no API-startup migrations.
- FullStackHero native Minimal API and static endpoint conventions, while
  allowing simpler local functions where architecture tests do not need a type.
- FullStackHero and MinimalClean explicit mapping locality.
- dotnet-templates' cross-platform generated-variant validation.
- FullStackHero's pack-install-scaffold smoke testing and realistic integration
  infrastructure.
- WebApi's TUnit/Microsoft.Testing.Platform direction, structured Result model,
  focused analyzer precedent, central package management, and OIDC release lane.
- Aspire ServiceDefaults as an optional local-development/host capability, not
  as a dependency of core packages.

### Adapt behind MartiX-owned interfaces

- FullStackHero Identity contracts, actor context, permission metadata, audit
  seams, and security tests; offer ASP.NET Core Identity and external OIDC
  adapters independently.
- FullStackHero outbox/inbox/event-bus concepts; redesign transaction ownership,
  provider-specific claiming, leases/concurrency, cleanup, telemetry, and
  consumer idempotency.
- FullStackHero operational defaults: preserve secure configuration validation,
  ProblemDetails, health, logging, metrics, and tracing while keeping Redis,
  Hangfire, brokers, storage, quotas, and multitenancy optional.
- MinimalClean's single-project simplicity for the `api` preset, without making
  it the modular preset's architecture.
- Repository/specification patterns only where a Module needs a deep reusable
  query interface; default vertical slices should use explicit EF Core queries
  and projections.
- A source-generated mediator only when a selected capability or application
  has real pipeline/fan-out forces.

### Reject as platform defaults

- Forking or copying all of FullStackHero.
- Mandatory UI, Aspire, Identity provider, multitenancy, Redis, jobs, message
  broker, storage provider, or deployment target.
- FastEndpoints as the canonical endpoint model.
- Mandatory mediator/CQRS wrappers for every operation.
- Mandatory FluentValidation for ordinary request shape validation.
- Runtime global mapping and the current misleading `Integrations.Mapster`
  namespace.
- In-memory outbox/idempotency implementations presented as production defaults.
- Post-save domain-event dispatch as a substitute for transactional integration
  delivery.
- Template reapplication or hidden copied Platform Library code as an upgrade
  mechanism.
- One monolithic runtime package or, at the opposite extreme, a package per
  folder. Preserve the accepted automatic baseline with minimal physical
  packages where dependency direction or adoption varies.

## Uncertainties and limits

- The comparison establishes implementation shape, not production fitness. No
  repository was load-tested, threat-modelled, or deployed during this ticket.
- FullStackHero's front-end and Terraform implementations were not deeply
  reviewed because UI remains optional and deployment-provider selection is
  still Wayfinder fog. Their presence and template boundaries were verified.
- Package license compatibility was not re-audited beyond the repositories'
  declared MIT licenses. Transitive license and vulnerability policy belongs in
  the later quality-gate work.
- Absence claims are scoped to the inspected revisions and active source. A
  feature may exist in an issue, branch, historical archive, or external
  documentation without being implemented in the pinned code.
- The source comparison identifies outbox concurrency and transaction risks; a
  provider-specific correctness proof belongs in the integration-event-delivery
  ticket.

## Resulting guidance for the next Wayfinder decisions

This research clears several directions but does not replace their dedicated
design tickets:

1. Use the current WebApi audit to decide which public types earn a place in the
   automatic baseline and which should be deleted or moved.
2. Define a machine-readable capability/preset manifest before expanding the
   template. The manifest must drive generated topology and the smoke matrix.
3. Base the modular solution topology on runtime/contracts Business Modules and
   a separate migrator, but keep Platform Libraries package-owned.
4. Treat FullStackHero as evidence and a source of test scenarios, not as the
   MartiX base repository.
5. Prototype the PostgreSQL and SQL Server outbox claim algorithms before
   accepting any existing implementation.
