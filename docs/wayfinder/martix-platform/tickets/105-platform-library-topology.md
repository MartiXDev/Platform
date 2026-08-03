---
title: Design the exact Platform Library topology
status: closed
type: wayfinder:grilling
parent: ../map.md
claimed_by:
resolved: 2026-07-16
blocked_by:
  - 101-compare-platform-sources.md
  - 102-audit-current-webapi.md
  - 104-capability-preset-matrix.md
---

## Question

What exact assemblies, NuGet packages, public interfaces, dependency directions, namespaces, and release relationships should implement the automatic Platform Baseline and optional adapters?

## Resolution

Adopt a small `MartiX.Platform.*` package family whose physical graph preserves dependency direction and whose public surface contains only deep, stable contracts. The Template System automatically composes the required references while generated application source retains visible ownership of host and business policy.

### Package identity

Adopt `MartiX.Platform.*` as the target package family and retire `MartiX.WebApi` as the future root identity. The framework-independent root package is `MartiX.Platform`.

The root package is the deliberately small Platform Kernel, not a general `Core`, `Common`, or `Abstractions` package. A public type may enter it only when its semantics are stable, framework-independent, shared across layers, and sufficiently deep to justify a permanent compatibility commitment. ASP.NET Core, EF Core, identity, UI, and provider types are prohibited dependencies.

**Why:** the Platform extends beyond HTTP, and retaining `WebApi` would misrepresent Result/error semantics, workers, migrations, UI, analyzers, and other capabilities. A focused Kernel gives shared contracts one natural home without creating a catch-all library. A separately named `MartiX.Results` package would be cohesive but would fragment the tiny universal surface and leave no governed home for future contracts that meet the same strict admission rule.

### Package and generated-source ownership

The automatic Platform Baseline is composed from three explicit package roles plus generated application-owned source:

| Package | Ownership |
| --- | --- |
| `MartiX.Platform` | Deep, framework-independent Platform semantics; initially the redesigned Application Result and Application Error model |
| `MartiX.Platform.AspNetCore` | Reusable ASP.NET Core adaptation, safe Problem Details behavior, and safe exception translation |
| `MartiX.Platform.Analyzers` | Compile-time architecture and contract enforcement that cannot be expressed by the type system |

Generated source owns `Program.cs` composition, middleware ordering, endpoint registration, authorization policies, proxy configuration, health endpoint mapping, options binding, Application Operations, actor contracts, and other application policy. It calls explicit Platform and first-party .NET registration methods; there is no `AddMartiXPlatformDefaults()` equivalent.

**Why:** reusable invariants must be centrally fixable, while security-sensitive and application-specific host policy must remain visible and application-owned. This avoids both source duplication of deep behavior and opaque package methods that silently enable infrastructure or middleware.

### Application Result and Application Error

The Platform Kernel Result model is transport-independent:

- `Result` represents success without a value or failure with one or more Application Errors.
- `Result<T>` represents success with a non-null value or failure with one or more Application Errors.
- Failure always contains at least one valid error; success exposes no errors and failure exposes no value.
- An Application Error has a stable machine-readable code, a semantic kind, a safe description, and an optional validation target or member.
- Business Modules own their stable error codes but do not create transport-specific Result types.
- HTTP `Ok`, `Created`, status codes, Problem Details, response locations, and `IResult` do not enter the Kernel.
- The ASP.NET Core adapter supplies default failure mapping; endpoints explicitly choose typed success results and resource locations.
- Expected business rejection uses Result. Caller misuse, violated internal invariants, cancellation, and unhandled infrastructure failures remain exceptions unless deliberately translated at an application seam.

The concrete Kernel family is `Result`, `Result<T>`, `Error`, and `ErrorKind`. These are immutable sealed reference types with non-public constructors and validated factories. Success values reject null, failure factories require at least one error, and errors are exposed through a read-only immutable view. Inheritance, arbitrary `object` metadata, mutable dictionaries, embedded exceptions, and HTTP metadata are excluded.

**Why:** transport-independent semantics allow the same Application Operation to be invoked through HTTP, a job, a CLI, or a Module Contract. Sealed factory-created reference types avoid invalid default struct values, inheritance commitments, mutable state, null ambiguity, and AOT-unsafe metadata while preserving validation errors and stable machine handling.

### Packages and namespaces

Use concern-oriented public namespaces:

| Package or assembly | Primary public namespace |
| --- | --- |
| `MartiX.Platform` | `MartiX.Platform.Results` |
| `MartiX.Platform.AspNetCore` | `MartiX.Platform.AspNetCore`, with `MartiX.Platform.AspNetCore.Results` only if necessary |
| `MartiX.Platform.Analyzers` | No runtime namespace; diagnostics use the `MXP` prefix |

Keep the root `MartiX.Platform` namespace empty or nearly empty. Do not publish namespace buckets named `Abstractions`, `Common`, `Core`, `Extensions`, `DependencyInjection`, `Internal`, or application layers. Registration methods live in the relevant capability namespace. Implementation folders do not create public namespaces.

Optional capability packages use `MartiX.Platform.<Capability>` and concrete provider packages use `MartiX.Platform.<Capability>.<Provider>`. A third-party framework name appears only in the adapter or provider package that actually depends on it.

**Why:** namespaces should communicate stable ownership in IntelliSense rather than mirror source folders. This prevents root pollution, abstraction dumping grounds, and third-party types leaking into the Platform Kernel.

### ASP.NET Core adapter surface

`MartiX.Platform.AspNetCore` exposes only:

- an explicit registration entry point for MartiX Problem Details and safe exception handling;
- conversion of Result failures to concrete ASP.NET Core typed-result types;
- the stable default mapping from `ErrorKind` to HTTP failure semantics;
- OpenAPI metadata support required by those failure contracts.

The concrete `IExceptionHandler` implementation remains internal. The package exposes no `IResultMapper`, response envelope, endpoint base class, custom pipeline framework, MartiX copies of ASP.NET Core types, broad defaults registration, or automatic success mapping. Customization uses standard ASP.NET Core hooks where possible. The exact Problem Details and validation signatures remain the responsibility of **Define HTTP contracts, OpenAPI, and versioning**.

**Why:** the adapter should hide meaningful safe translation behavior without becoming a second web framework. First-party types preserve typed-result and OpenAPI compatibility, while endpoint-owned success responses retain correct status and resource-location semantics.

### Analyzer delivery

`MartiX.Platform.Analyzers` is a separate package referenced directly and privately from generated repository-wide build configuration. It is neither embedded in nor transitively delivered by a runtime package. Generated `.editorconfig` or build configuration owns diagnostic severity: mandatory Platform invariants are errors, while advisory modernization guidance remains non-error until deliberately promoted.

Analyzers enforce only constraints that cannot be made impossible through the type system, project references, or architecture tests. Every diagnostic has a stable `MXP` identifier, documented remediation, tests, and compatibility treatment. The analyzer package participates in the synchronized Platform release train without acquiring a runtime dependency on Platform runtime packages.

**Why:** an analyzer update can break compilation without changing runtime behavior. A direct private reference makes the build-time dependency and version visible, prevents propagation to downstream consumers, supports targeted rollback, and avoids silently changing compilation policy whenever a runtime package is updated.

### Capability and provider package admission

A Platform Capability does not correspond one-to-one with a NuGet package. Use these admission rules:

1. Capabilities implemented by visible first-party or generated configuration receive no MartiX runtime package unless reusable behavior later proves sufficiently deep.
2. A deep provider-independent protocol receives `MartiX.Platform.<Capability>` only when it owns substantial shared semantics, invariants, state transitions, or observability.
3. A concrete provider uses `MartiX.Platform.<Capability>.<Provider>`, depends inward on the capability protocol and its actual external framework, and is never referenced by the protocol package.
4. Transport adaptation remains in a separate outward adapter rather than contaminating a framework-independent capability package.
5. One implementation without a useful production/test or provider seam is generated source or one concrete package, not an empty `*.Abstractions` package.
6. Templates compose the selected packages; users select Capabilities and providers rather than manually constructing raw package graphs.

The dependency direction is Generated Solution to selected adapter/provider to capability protocol, with a dependency on `MartiX.Platform` only when the protocol actually uses Kernel contracts. `MartiX.Platform.AspNetCore` depends on `MartiX.Platform`. The Kernel never depends on ASP.NET Core, EF Core, providers, or optional capabilities, and unrelated capabilities do not reference one another for convenience.

**Why:** package boundaries should represent deep behavior, external dependency differences, or real variability. Guaranteeing a package for every Capability would manufacture shallow interfaces, increase release and discovery cost, and confuse the executable Capability Matrix with the physical NuGet graph.

### Assembly and package granularity

Each runtime `MartiX.Platform.*` NuGet package contains exactly one correspondingly named runtime assembly. Provider assemblies ship only in their provider packages. `MartiX.Platform.Analyzers` and future source-generator packages are deliberate build-time exceptions and contain no runtime `lib` assembly.

There is no initial metapackage, multi-assembly baseline package, or bundling of optional assemblies into `MartiX.Platform.AspNetCore`. The Template System writes the small explicit reference set required by the resolved Capability Manifest. Package-content tests verify the placement of runtime, analyzer, build, symbol, documentation, and dependency assets.

**Why:** one runtime assembly per package keeps dependency direction visible, excludes unselected provider dependencies, and allows trimming, Native AOT, API compatibility, vulnerability, license, and retirement evidence to be attributed to the correct artifact. The Template System already removes manual composition burden, so a convenience bundle adds coupling without meaningful user value.

### Release relationship

All first-party `MartiX.Platform.*` packages initially move on one synchronized release train. Every package in a Supported Platform Release shares the same SemVer version and source commit, and the applicable package family is published atomically. Internal package dependencies require the exact matching Platform version. Generated central package management uses one `MartiXPlatformVersion` property.

`MartiX.Platform.Analyzers` shares the release version without acquiring a runtime dependency. Third-party dependencies retain independent centrally managed versions. One Release Evidence Manifest binds the packages, templates, Platform Migrations, documentation, analyzers, and quality evidence from the same candidate. Independent Platform-package versioning requires demonstrated consumer need, an expanded compatibility matrix, and a later ADR.

**Why:** independently versioning a young, tightly verified package family would primarily create unsupported combinations, upgrade ambiguity, and CI multiplication. A synchronized exact-version train makes a Platform release reproducible and auditable while the physical package boundaries continue to preserve dependency isolation. The later release-policy decision owns SemVer rules, support windows, prereleases, and obsoletion.

### Target frameworks and compatibility claims

Runtime, ASP.NET Core, and provider packages initially target only `net10.0`. Analyzer and source-generator packages target the Roslyn-compatible build-time framework, normally `netstandard2.0`. Supported releases do not target preview frameworks and do not multi-target older .NET versions for hypothetical consumers. When a newer stable .NET ships, verify the existing packages against it before adding a target framework, and add one only for a concrete API or compatibility requirement.

Trimming and Native AOT metadata is package-specific release evidence rather than a repository-wide default. `MartiX.Platform` must earn trimming and Native AOT compatibility. Every adapter and provider declares only the compatibility its executable matrix proves; an incompatible provider neither weakens nor overstates the Kernel claim.

**Why:** older or speculative target frameworks would constrain .NET 10 usage and multiply verification without serving the stated greenfield audience. Conversely, copying `IsAotCompatible` onto every project would repeat the current package's analyzer-conscious but unverified compatibility claim.

### Initial package catalog

The initial baseline contains exactly:

- `MartiX.Platform`;
- `MartiX.Platform.AspNetCore`;
- `MartiX.Platform.Analyzers`.

The later release-policy decision admits one synchronized
`MartiX.Platform.Tool` executable package for one-shot template/migration
orchestration. It is a Platform repository tooling artifact, not an
application-consumed runtime/analyzer package or Generated Solution project, so
it does not widen this three-package baseline dependency graph.

The one currently admitted optional adapter is `MartiX.Platform.AspNetCore.FastEndpoints`. It is selected only when FastEndpoints replaces the canonical Minimal API endpoint model, depends on the real FastEndpoints framework and the smallest required Platform assemblies, and owns genuine Result, Problem Details, validation, OpenAPI, and endpoint-lifecycle integration. FastEndpoints types may appear publicly only from this adapter.

Do not initially create separate Minimal API, general EF Core, FluentValidation, Mapperly, mediator, cache, resilience, health, telemetry, Aspire, Docker, Blazor, React, or Vue wrapper packages. Do not reserve empty identity, eventing, outbox, idempotency, storage, jobs, messaging, notification, or other future packages. Direct framework use and generated source remain direct until a later capability decision proves deep reusable behavior or a real provider seam.

**Why:** FastEndpoints is a genuine alternative endpoint framework with its own dependency and response lifecycle. The other named technologies are currently first-party configuration, generated implementation, build-time aids, or unresolved protocols. Wrapping them now would recreate the shallow and misleading integration namespaces found in `MartiX.WebApi`.

### Public visibility and cross-assembly access

Types and members are internal by default. Public exposure requires a documented consumer scenario and compatibility evidence. Public runtime types are sealed unless inheritance is an intentional tested extension model. Provider implementations remain internal when consumers need only registration and standard configuration; options are public only when they form a genuine validated consumer contract. Interfaces are not published merely to enable mocking.

Production Platform assemblies never use `InternalsVisibleTo` to couple adapters or providers to another package's implementation. They cross only approved public Interfaces. Tests exercise the consumer Interface by default. A package may grant its own test assembly narrow internal access only when a critical algorithm cannot receive sufficient deterministic evidence through that Interface; analyzer tests may use internal access under their separate build-time model.

Do not publish base endpoints, base providers, service locators, generic repositories, or general inheritance-based extensibility hierarchies. Public API baselines and architecture tests enforce visibility and cross-assembly rules.

**Why:** the current library's broad public surface creates a large compatibility burden without corresponding depth. Internal-by-default design preserves evolution, while prohibiting production friend assemblies ensures the published dependency graph is truthful even on a synchronized release train.

### Composition Interface

Generated Solutions compose Platform Libraries through explicit compile-time calls in a visible deterministic order. A package exposes a small conventional extension method only when registration is necessary and uses standard .NET host Interfaces such as `IServiceCollection`, `IHostApplicationBuilder`, `WebApplication`, or `IEndpointRouteBuilder`.

There are no installer or registrar interfaces, marker types, assembly scanning, reflection discovery, service locators, or automatic startup hooks. Registrations tolerate accidental duplicate invocation where safe, while mutually exclusive providers fail generation or startup validation rather than silently replacing one another. Generated composition performs visible standard options binding and `ValidateOnStart()`. Provider packages register only their own behavior and health or observability contributions; endpoint mapping remains separate from service registration where the framework lifecycle requires it.

Registration names describe exact behavior, such as a future `AddMartiXProblemDetails()`, rather than `AddPlatform()`, `AddDefaults()`, or other broad composition methods.

**Why:** direct generated calls are AOT-safe, fast, searchable, agent-readable, and make order and selected infrastructure reviewable. Reflection-based discovery or broad defaults would hide composition and recreate the accidental enabling behavior being removed from `MartiX.WebApi`.

### Initial dependency graph

The initial assembly graph is:

```text
MartiX.Platform.Analyzers
    -> Roslyn build-time dependencies only

MartiX.Platform
    -> .NET 10 BCL only

MartiX.Platform.AspNetCore
    -> MartiX.Platform
    -> Microsoft.AspNetCore.App

MartiX.Platform.AspNetCore.FastEndpoints
    -> MartiX.Platform
    -> MartiX.Platform.AspNetCore
    -> Microsoft.AspNetCore.App
    -> FastEndpoints
```

The Kernel has no `Microsoft.Extensions.*`, DI, hosting, logging, JSON, EF Core, ASP.NET Core, or third-party dependency unless a future Kernel contract proves one unavoidable. Projects declare every dependency whose types or behavior they directly use instead of relying on accidental transitive availability. Analyzers inspect source and symbols without referencing runtime Platform assemblies.

Generated application projects reference only their selected outward packages. Business Module Domain projects may reference only the Kernel, and only when they genuinely use its contracts. Architecture tests reject reverse references, cycles, undeclared provider coupling, third-party namespaces in inward contracts, and dependencies that bypass a declared capability protocol.

**Why:** this is the smallest truthful graph for the admitted catalog. Keeping even hosting abstractions out of the Kernel preserves its use in domain/application code, clients, jobs, and Native AOT scenarios without importing composition semantics.

### Repository project layout

Use a flat package-aligned source layout: `src/<PackageId>/<PackageId>.csproj`, mirrored by `tests/<PackageId>.Tests`. Project directory, project name, assembly name, root namespace, and package ID match. Do not add `Core`, `Adapters`, `Infrastructure`, or `Capabilities` directory levels when the package identity already communicates ownership.

Keep cross-package graph tests in `tests/MartiX.Platform.ArchitectureTests` and small real consuming, package, trimming, and Native AOT applications under `tests/Compatibility`. Keep decision-relevant benchmarks in `benchmarks/MartiX.Platform.Benchmarks`. Samples are generated and verified from the Template System rather than maintained as a second hand-written architecture. Directory grouping may change later without changing public assembly or namespace contracts if the catalog genuinely outgrows the flat layout.

**Why:** direct name alignment maximizes discoverability for humans and agents and makes the published artifact obvious from its source path. Compatibility must be proved through consumers, while adding abstract directory layers to four initial projects would create navigation rather than an enforceable boundary.

### Security audit contract ownership

`SecurityAuditEvent` is the second admitted Kernel concern. It lives in the `MartiX.Platform` assembly under `MartiX.Platform.Security`; **Define the security and observability baseline** owns its exact fields, privacy rules, and emission semantics. Future Durable Security Audit Trail implementations depend inward on this event instead of redefining it.

Actor identifiers, current-actor access, permission models, and authorization policies remain generated application contracts because their identity types and business semantics vary by solution. Identity providers adapt to those generated seams at the composition edge. The Kernel admission does not permit generic security helpers, claims wrappers, authorization abstractions, or audit storage.

**Why:** Security Audit Event is baseline-required, framework- and storage-independent, and shared by several privileged capabilities. Generating a different version per solution would undermine provider interoperability, while creating a fourth package for one foundational contract would be shallow fragmentation.

### Error categories

The initial public `ErrorKind` enum uses explicit numeric values:

| Value | Member | Meaning |
| --- | --- | --- |
| 1 | `Validation` | Submitted data is structurally or semantically invalid and may identify a target member |
| 2 | `RuleViolation` | The understood request violates an application or domain rule |
| 3 | `NotFound` | A requested business resource does not exist or must not be disclosed |
| 4 | `Conflict` | Durable state conflicts with the transition, concurrency expectation, or idempotency fingerprint |
| 5 | `AuthenticationRequired` | No acceptable authenticated principal is present |
| 6 | `Forbidden` | The actor is known but not authorized |
| 7 | `RateLimited` | An explicit rate policy rejected the operation |
| 8 | `Unavailable` | A required capability or dependency cannot currently complete expected work |
| 9 | `Unexpected` | A safely translated failure outside the expected business contract |

Do not use HTTP-derived names. Cancellation remains `OperationCanceledException`. Timeouts and transient infrastructure exceptions remain exceptions unless deliberately translated at an application seam. Stable business meaning belongs primarily to `Error.Code`; `ErrorKind` supplies coarse handling and default transport mapping. Consumers tolerate future unknown values, and a new category requires compatibility and HTTP-contract review. `Unexpected` never permits disclosure of exception messages or sensitive details.

**Why:** the categories must work consistently across HTTP, jobs, CLI, and Module Contracts. `RuleViolation` prevents expected business rejection from being misclassified as validation or conflict, while `AuthenticationRequired` avoids the transport-specific ambiguity of “unauthorized.”

### Error code representation and ownership

`Error.Code` is a validated non-empty immutable string using lowercase dot-separated segments, such as `orders.not-found`, `orders.number-conflict`, `identity.authentication-required`, or `platform.unexpected`. Segments contain lowercase ASCII letters, digits, or hyphens. The first segment identifies the owning Business Module or Platform Capability. The Platform reserves `platform.*`; each Business Module owns its prefix.

Codes describe stable meaning rather than type names, method names, HTTP statuses, or display text. Published code removal or semantic renaming is a contract-breaking change. Generated modules centralize codes in constants or error factory methods; analyzers can detect invalid or duplicated literals. UI clients localize by code rather than treating the server description as primary localized copy.

Do not initially add an `ErrorCode` wrapper, application enum, numeric scheme, or arbitrary URI codes. The `Error` factory validates syntax and reserved-prefix rules where enforceable.

**Why:** a value struct would retain an invalid default, while a class would add an allocation and permanent public type without hiding significant behavior. Codes ultimately cross JSON, OpenAPI, logs, events, and clients as strings; generated ownership and analyzers provide typo resistance without complicating every signature.

### Minimum Result Interface

The initial callable surface is:

- `Error`: `Code`, `Kind`, `Description`, optional `Target`, and one validated `Create(...)` factory;
- `Result`: `IsSuccess`, complementary `IsFailure`, `Errors`, `Success()`, and `Failure(firstError, additionalErrors...)`;
- `Result<T>`: `IsSuccess`, complementary `IsFailure`, `Value`, `Errors`, `Success(value)`, and `Failure(firstError, additionalErrors...)`.

`Target` is valid only for validation errors and identifies an application-contract member rather than UI text. Factories reject null success values, null errors, empty failure sets, undefined kinds, invalid codes, and unsafe empty descriptions. They defensively copy failures into an immutable collection exposed as `IReadOnlyList<Error>`; success exposes an empty collection. `Result<T>.Value` throws `InvalidOperationException` when accessed on failure. Generic and non-generic factories normalize identically.

There are no public constructors, inheritance, implicit conversions, deconstruction, mutable collections, or serialization setters. Do not initially add `Match`, `Map`, `Bind`, `Tap`, `Ensure`, async combinators, exception-capture helpers, or fluent pipelines. A convenience operation is admitted only after repeated generated/application code proves leverage and its exception and cancellation behavior is specified.

**Why:** depth comes first from strong invariants, not from a large functional vocabulary. Explicit branching is familiar, allocation-predictable, debugger-friendly, and straightforward for generated code and agents. Convenience can be added compatibly after evidence; premature public surface cannot be removed cheaply.

### Transport and serialization ownership

Kernel `Result`, `Result<T>`, and `Error` types are in-process semantic contracts, not JSON or wire contracts. The ASP.NET Core adapter translates failures into the separately versioned HTTP Problem Details contract, and endpoint successes use explicit DTOs. Generated UI clients consume OpenAPI contracts rather than referencing Kernel runtime types. Jobs, CLI adapters, Module Contracts, and message transports adapt deliberately at their own seams.

The Kernel contains no JSON converter, serialization constructor, mutable setter, `JsonExtensionData`, or transport annotation. Stable `Error.Code` meaning survives adaptation, while each transport owns its payload and optional metadata. An adapter may omit `ErrorKind` from a public wire shape when stable code and transport semantics suffice. Source-generated serialization belongs only to the outward adapter that owns the format.

**Why:** directly serializing Result would permanently couple Kernel object layout to HTTP and client compatibility, recreate a custom response envelope, and turn internal invariant improvements into wire breaks. Explicit adaptation preserves one semantic model without imposing one payload model.

### Legacy package relationship

There is no dependency relationship between legacy `MartiX.WebApi` and new `MartiX.Platform.*` packages. New packages never reference the legacy assembly, the legacy package does not become a permanent facade or metapackage, and new templates reference only the Platform family. Redesigned types use new namespaces and are not constrained by old inheritance, factories, enums, or payloads.

Do not use type forwarding where semantics changed and do not copy deprecated pseudo-mediator, mapping, specification, unit-of-work, defaults, cache, idempotency, or outbox surfaces into a compatibility assembly. `MartiX.WebApi` has no known application consumer, so implementation may replace or archive it in place without a legacy deprecation release, maintenance line, adoption mode, or Platform Migration. Git history retains provenance. If a previously unknown consumer later appears, assess it as explicit new migration scope rather than retroactively weakening the Platform design.

**Why:** a compatibility facade would preserve the broad public surface and ASP.NET Core coupling being removed. With no consumer, any facade or legacy lifecycle would be speculative cost. The Result redesign is intentionally not semantically compatible, so a clean replacement keeps the target architecture honest.

### FastEndpoints adapter boundary

`MartiX.Platform.AspNetCore.FastEndpoints` is a narrow interoperability adapter rather than a wrapper framework. It owns Application Result failure conversion inside the FastEndpoints response lifecycle, central adaptation of FastEndpoints request-validation failures into the common HTTP contract, matching response/OpenAPI metadata, and only the processor or configuration hooks required for that integration.

Generated host and endpoint source calls FastEndpoints registration and middleware directly and visibly, including `AddFastEndpoints(...)`, `UseFastEndpoints(...)`, source-generated discovery, serializer and Native AOT helpers, OpenAPI registration/export, endpoint `Configure()` methods, validators, and endpoint metadata.

The adapter exposes no MartiX endpoint base class or DTO mapper, hides no discovery or middleware order, and does not enable FastEndpoints commands, events, jobs, caching, rate limiting, idempotency, or exception middleware as substitutes for separately selected Capabilities. It does not create a second exception handler or duplicate diagnostics. FastEndpoints and FluentValidation types stay inside the endpoint adapter/project and never enter the Kernel, Application Operations, Domain projects, or Module Contracts.

When FastEndpoints is selected, its validator mechanism may perform transport request validation while business-rule failures remain Application Results. **Define HTTP contracts, OpenAPI, and versioning** owns the final validation payload and OpenAPI integration.

**Why:** FastEndpoints' discovery, validation, OpenAPI, serializer, and AOT behavior is an application lifecycle concern that must remain visible. The package earns its place by integrating a real alternative endpoint framework with the common Platform failure contract, not by re-exporting or concealing the framework.

### Testing package policy

Do not initially publish `MartiX.Platform.Testing`. Each Platform Library owns focused TUnit tests; Generated Solutions own application fixtures, test actors, database fixtures, factories, and scenario builders. Use first-party time testing, `WebApplicationFactory`, provider containers or documented stand-ins, cross-package architecture tests, consuming compatibility applications, and generated-template test execution directly.

Do not publish mocks of Platform internals, generic fake repositories, test service locators, or broad fixture bases. A future testing package is admitted only when several Generated Solutions repeat a stable helper that crosses a public Platform Interface, hides meaningful setup complexity, remains domain-independent, and cannot be replaced cleanly by standard framework or provider test tools. If admitted, it is test-only, direct/private, synchronized with the Platform release, and never a runtime dependency.

**Why:** TDD requires testable Interfaces and executable evidence rather than a testing abstraction. Premature shared fixtures would couple consumer tests to Platform internals and encourage testing beneath the public seam.
