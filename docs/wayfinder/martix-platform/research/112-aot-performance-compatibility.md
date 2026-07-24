# AOT and performance compatibility research

Research date: 2026-07-18  
Scope: evidence for Wayfinder ticket 112; no product implementation or tracker changes

## Executive conclusion

MartiX should make trimming and Native AOT compatibility precise properties of a
**package plus generated-host capability/provider combination**, never labels applied
to the repository, Preset name, or .NET target framework alone.

The initial release can honestly support both trimming and Native AOT for the lean
`api` Preset when it uses canonical Minimal APIs, first-party OpenAPI, source-generated
`System.Text.Json`, explicit DI registration, no relational persistence, and only
capabilities/providers that pass the executable matrix below. The default
`modular-monolith` and `full-stack` Presets remain Supported on ordinary .NET 10 JIT,
but must not claim production Native AOT support: both require EF Core, whose current
Native AOT/query-precompilation support is explicitly experimental and not recommended
for production. Blazor Server is also explicitly unsupported by ASP.NET Core Native
AOT. [ASP.NET Core Native AOT compatibility](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/native-aot?view=aspnetcore-10.0)
[EF Core NativeAOT and precompiled queries](https://learn.microsoft.com/en-us/ef/core/performance/nativeaot-and-precompiled-queries)

`MartiX.Platform` and `MartiX.Platform.AspNetCore` should earn package-level trimming
and AOT metadata. `MartiX.Platform.AspNetCore.FastEndpoints` may earn the same claim
only through a real consuming host using FastEndpoints' generated discovery, binding
metadata, and JSON contexts. Analyzer/source-generator projects are build-time assets;
AOT and trimming are not applicable to them and publish properties must not be allowed
to flow into their `netstandard2.0` builds.

Performance release gates should primarily compare a candidate to the last accepted
release on a pinned, isolated environment. Universal absolute request-latency or
throughput promises are not defensible. Absolute gates are appropriate for correctness
(zero warnings/failures), deliberately zero-allocation paths, boundedness/leak tests,
and the already accepted five-minute generation-to-health developer-experience budget.

## Fact and recommendation vocabulary

- **Fact** means a behavior stated by the owning project's documentation, source, or
  specification, or directly observed in this repository.
- **Recommendation** is a MartiX policy inferred from those facts and the accepted
  decisions in tickets 103-111.
- **Supported** means release-blocking evidence is required for every declared RID and
  selected capability/provider combination.
- **Experimental** means generation may expose the combination for evaluation, but it
  is excluded from production Presets and carries no compatibility guarantee.
- **Not applicable** means the artifact is not deployed in that compilation model.

## Primary-source facts

### Native AOT and trimming fundamentals

1. **Fact:** Native AOT is RID-specific, self-contained, implies trimming, prohibits
   dynamic assembly loading and runtime code generation, and has limited reflection
   behavior. A binary is built for a concrete runtime environment. Cross-OS Native AOT
   compilation isn't supported, so Windows and Linux claims require native runners for
   those operating systems. [Native AOT deployment](https://learn.microsoft.com/en-us/dotnet/core/deploying/native-aot/)
   [Native AOT cross-compilation](https://learn.microsoft.com/en-us/dotnet/core/deploying/native-aot/cross-compile)
2. **Fact:** `<IsAotCompatible>true</IsAotCompatible>` enables AOT, trimming, and
   single-file analyzers and implies `IsTrimmable`; it is analyzer evidence, not proof
   that a consuming application works after publish. Microsoft recommends both
   library-level analysis and a self-contained trimming test application that roots
   the complete library and dependencies. Dependency updates can introduce trim
   warnings without an API change. [Prepare libraries for trimming](https://learn.microsoft.com/en-us/dotnet/core/deploying/trimming/prepare-libraries-for-trimming)
3. **Fact:** a warning-free Native AOT publish is necessary but Microsoft also requires
   testing the actual AOT-deployed app for behavioral equivalence with untrimmed JIT.
   [Verify an ASP.NET Core Native AOT app](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/native-aot?view=aspnetcore-10.0#verify-app-on-the-native-aot-deployment-model)
4. **Fact:** trimming is available only for self-contained applications. Reflection,
   runtime-discovered dependencies, and serializers are common incompatibility sources.
   [Trim self-contained applications](https://learn.microsoft.com/en-us/dotnet/core/deploying/trimming/trim-self-contained)

**Recommendation:** MartiX must not accept a package property, analyzer-only build, or
successful compilation as compatibility evidence. Each claim requires a rooted
consumer publish plus black-box behavior tests for every declared supported combination.

### ASP.NET Core, endpoints, OpenAPI, authentication, and UI

1. **Fact:** the current ASP.NET Core 10 compatibility table lists Minimal APIs, CORS,
   health checks, JWT authentication, rate limiting, output caching, SignalR, static
   files, and WebSockets as Native AOT supported. It lists MVC, Blazor Server, non-JWT
   authentication, session, OData, and the SPA feature as unsupported. The Native AOT
   template uses `CreateSlimBuilder`, Minimal APIs, and generated JSON metadata.
   [ASP.NET Core Native AOT support](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/native-aot?view=aspnetcore-10.0)
2. **Fact:** first-party `Microsoft.AspNetCore.OpenApi` supports trimming and Native AOT,
   including the `webapiaot` template. Build-time OpenAPI generation launches the app's
   entry point with a mock server, so startup behavior and configuration access must be
   safe in that mode. [ASP.NET Core OpenAPI generation](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/openapi/aspnetcore-openapi?view=aspnetcore-10.0)
3. **Fact:** Minimal APIs support ASP.NET Core authentication/authorization generally,
   but that does not override the Native AOT feature table: JWT bearer is supported and
   other authentication mechanisms are not. [Minimal API security](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis/security?view=aspnetcore-10.0)
4. **Fact:** local ASP.NET Core Identity API endpoints use Identity stores, normally EF
   Core, and cookie/proprietary-token authentication. This combines two current AOT
   blockers: EF Core's experimental status and non-JWT authentication.
   [Identity API endpoints](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/identity-api-authorization?view=aspnetcore-10.0)
5. **Fact:** Blazor WebAssembly has a distinct WebAssembly AOT mode. It increases
   download size to improve runtime performance and isn't the server-side Native AOT
   model. Blazor WebAssembly publishing uses partial trimming by default; full trimming
   isn't supported. [Blazor WebAssembly AOT](https://learn.microsoft.com/en-us/aspnet/core/blazor/webassembly-build-tools-and-aot?view=aspnetcore-10.0)
   [Configure the Blazor trimmer](https://learn.microsoft.com/en-us/aspnet/core/blazor/host-and-deploy/configure-trimmer?view=aspnetcore-10.0)

**Recommendation:** the MartiX Native AOT profile uses explicit Minimal API endpoint
mapping and first-party OpenAPI. It may support JWT bearer. It must reject MVC,
Blazor Server, local Identity, cookies/OIDC handlers, session, and any other
non-JWT authentication in a production Native AOT combination. React and Vue build
artifacts are tested separately from the server; they neither prove nor inherently
prevent server Native AOT. Blazor WebAssembly AOT receives separate UI evidence and
must never be represented as the server's Native AOT status.

### JSON, reflection, and dependency injection

1. **Fact:** Native AOT Minimal APIs require every HTTP body and returned payload type
   to be represented by registered `JsonSerializerContext` metadata. Reflection-based
   `System.Text.Json` can fail under AOT. Enabling `PublishTrimmed` disables reflection
   serialization by default; `JsonSerializerIsReflectionEnabledByDefault=false` makes
   that failure deterministic under ordinary JIT too. [ASP.NET Core Native AOT JSON](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/native-aot?view=aspnetcore-10.0#work-with-minimal-apis-and-json-payloads)
   [System.Text.Json source generation](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/source-generation)
2. **Fact:** source-generated serialization's fast path isn't used for asynchronous
   streaming in all cases; metadata generation remains the general compatible mode.
   [System.Text.Json generation modes](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/source-generation#serialization-optimization-mode-fast-path)
3. **Fact:** the .NET trimming guidance recommends eliminating reflection first, then
   using analyzable annotations. Suppression and `DynamicDependency` are last resorts
   that require maintained invariants and runtime testing. [Fix trimming warnings](https://learn.microsoft.com/en-us/dotnet/core/deploying/trimming/fixing-warnings)

**Recommendation:** generated hosts set
`JsonSerializerIsReflectionEnabledByDefault=false` in all configurations, compose
source-generated metadata contexts explicitly, and contract-test every DTO, Problem
Details extension, event envelope, cache value, and client payload. Explicit generic
or generated DI registrations are allowed. Assembly scanning, `Assembly.GetTypes`,
unbounded `Activator.CreateInstance`, `Expression.Compile`, runtime proxy generation,
plugin loading, and convention-only type discovery are prohibited in AOT profiles.
No trim/AOT warning suppression is accepted merely to pass CI.

### EF Core and relational providers

1. **Fact:** EF Core's Native AOT and query precompilation remain explicitly
   **highly experimental and not suited for production**. The documented flow uses
   compiled models, experimental C# interceptors, and `Microsoft.EntityFrameworkCore.Tasks`.
   Publishing may still produce trimming/AOT warnings.
   [EF Core NativeAOT overview](https://learn.microsoft.com/en-us/ef/core/performance/nativeaot-and-precompiled-queries)
2. **Fact:** current limitations include unsupported dynamically composed queries,
   unsupported LINQ query syntax, potentially large/slow generated output, provider
   participation requirements, and unsupported state-capturing value converters.
   [EF Core NativeAOT limitations](https://learn.microsoft.com/en-us/ef/core/performance/nativeaot-and-precompiled-queries#limitations)
3. **Fact:** Npgsql documents Native AOT/trimming work in its driver but explicitly
   distinguishes that from EF Core: Npgsql can be used under Native AOT without EF,
   while EF itself remains the constraint. [Npgsql 8 EF provider notes](https://www.npgsql.org/efcore/release-notes/8.0.html)

**Recommendation:** no relational EF Core combination—PostgreSQL or SQL Server—is
production Native AOT Supported in the initial matrix. `modular-monolith` and
`full-stack` therefore remain JIT deployments. EF Native AOT may be an Experimental
lane that never blocks a Supported JIT release. A future promotion requires upstream
production support, warning-free publishes for each provider, all MartiX specification
queries/precompiled models, migration and concurrency behavior, and the full black-box
database scenario suite. A separate non-EF provider must not be introduced solely to
win an AOT label; that would violate KISS and the accepted persistence decision.

### FastEndpoints

1. **Fact:** FastEndpoints officially documents Native AOT publishing using
   `FastEndpoints.Generator`, generated endpoint discovery, generated JSON contexts,
   generated binding reflection metadata, and `CreateSlimBuilder`. Generated serializer
   files must be committed because one incremental generator can't consume another's
   output. [FastEndpoints Native AOT](https://fast-endpoints.com/docs/native-aot)
2. **Fact:** default FastEndpoints startup uses reflection scanning. Its source generator
   replaces discovery and much reflection work, but documented fallbacks still exist for
   cases such as record properties and init-only properties.
   [FastEndpoints generated startup and reflection](https://fast-endpoints.com/docs/configuration-settings#source-generator-based-startup)
3. **Fact:** FastEndpoints recommends black-box tests for the Native AOT executable;
   `WebApplicationFactory` isn't the AOT process. Its testing package can run one test
   suite against JIT/WAF and an external Native AOT process.
   [FastEndpoints AOT testing](https://fast-endpoints.com/docs/native-aot#testing-native-aot-builds)

**Recommendation:** `MartiX.Platform.AspNetCore.FastEndpoints` is conditionally
Supported for trimming/AOT only with the exact release-gated FastEndpoints and
Generator versions, generated artifacts for every endpoint assembly, no documented
reflection fallback in the selected DTO model, first-party-compatible OpenAPI output,
and the same conformance suite as Minimal APIs. Ordinary reflection discovery is
invalid in the AOT profile. The canonical Minimal API profile remains the simpler and
lower-risk AOT path.

### Telemetry, exporters, tests, and generated solutions

1. **Fact:** native `ILogger`, `ActivitySource`, `Meter`/`IMeterFactory`, and ASP.NET Core
   instrumentation don't inherently require a MartiX reflection abstraction. Native AOT
   nevertheless analyzes the full dependency closure, so every OpenTelemetry SDK,
   instrumentation, exporter, logging provider, and cloud agent combination needs a
   consuming publish test. [OpenTelemetry .NET repository](https://github.com/open-telemetry/opentelemetry-dotnet)
2. **Fact:** OpenTelemetry automatic instrumentation can include bytecode/profiler-based
   behavior. Native AOT prohibits runtime code generation and dynamic loading.
   [OpenTelemetry automatic instrumentation configuration](https://github.com/open-telemetry/opentelemetry-dotnet-instrumentation/blob/main/docs/config.md)
   [Native AOT limitations](https://learn.microsoft.com/en-us/dotnet/core/deploying/native-aot/#limitations-of-native-aot-deployment)
3. **Fact:** Microsoft.Testing.Platform is designed to support Native AOT, and .NET 10
   selects it through `global.json`. TUnit's default source-generation engine documents
   Native AOT support; its reflection engine is not the AOT lane.
   [Microsoft.Testing.Platform overview](https://learn.microsoft.com/en-us/dotnet/core/testing/microsoft-testing-platform-intro)
   [MTP mode in .NET 10](https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-with-dotnet-test#mtp-mode-of-dotnet-test)
   [TUnit engine modes](https://tunit.dev/docs/execution/engine-modes/)

**Recommendation:** Platform Libraries emit only native instrumentation. Every exporter
or instrumentation package selected later by ticket 119 starts as unverified for AOT
until its exact package closure passes the host matrix. Profiler/bytecode automatic
instrumentation is invalid for the AOT profile; use explicit SDK registration.
TUnit remains the test framework, but product AOT compatibility is proved by publishing
and launching generated product hosts. Publishing the test runner itself under AOT is a
secondary framework smoke lane, not a substitute for testing the product executable.

## Recommended compatibility matrix

### Package artifacts

| Artifact | Trimming | Native AOT | Required evidence and boundary |
| --- | --- | --- | --- |
| `MartiX.Platform` | Supported | Supported | Analyzer-clean library plus rooted all-members consumers on Windows and Linux; BCL-only dependency graph |
| `MartiX.Platform.AspNetCore` | Supported | Supported | Real Minimal API host, generated JSON metadata, built-in OpenAPI, HTTP conformance and black-box AOT smoke tests |
| `MartiX.Platform.Analyzers` | Not applicable | Not applicable | Build-time `netstandard2.0` analyzer packaging/tests; never receive `PublishAot`/`PublishTrimmed` |
| `MartiX.Platform.AspNetCore.FastEndpoints` | Conditional Supported | Conditional Supported | Exact FE/Generator versions, all generated metadata, no fallback discovery, Minimal API parity suite |
| Future capability/provider package | Unverified by default | Unverified by default | Promote independently only after rooted consumer plus every provider/profile smoke lane |

Package metadata is permitted only after these lanes exist and are green. An incompatible
provider doesn't weaken the Kernel's claim and a compatible Kernel doesn't upgrade a
provider's status.

### Presets and major combinations

| Generated combination | JIT | Trimmed self-contained | Native AOT | Decision |
| --- | --- | --- | --- | --- |
| `api`, canonical Minimal APIs, baseline only | Supported | Supported | Supported | Primary AOT reference profile |
| Above plus built-in OpenAPI 3.1 | Supported | Supported | Supported | First-party support; document generation and runtime document both tested |
| Above plus JWT bearer authentication | Supported | Supported | Supported | JWT is the only initially accepted AOT auth profile |
| Above plus FastEndpoints | Supported | Conditional Supported | Conditional Supported | Requires the complete generated FE profile and parity suite |
| Above plus local-only cache/output cache, config feature flags, explicit hosted work, SSE | Supported | Candidate | Candidate | Promote per capability after interaction tests; no persistence/provider dependency |
| Any EF Core relational persistence/provider | Supported | Experimental/unclaimed | Experimental, not production | EF upstream status blocks a production AOT promise |
| Local ASP.NET Core Identity | Supported | Unclaimed | Not Supported | EF plus cookie/proprietary-token/non-JWT auth constraints |
| External browser OIDC/cookie/BFF auth | Supported | Unclaimed | Not Supported | Current table supports JWT, not other authentication |
| Durable idempotency, jobs, audit, inbox/outbox, webhook delivery | Supported in declared Presets | Experimental/unclaimed | Not Supported initially | Accepted providers require relational persistence |
| Broker, Redis/backplane, cloud object storage, exporter, Serilog, Aspire integration | Supported only after ticket 119 selection | Provider-specific | Provider-specific | No marketing-level inheritance of AOT status |
| `modular-monolith` | Supported | Experimental/unclaimed | Not Supported initially | Required EF Core/outbox/inbox |
| `full-stack` + React or Vue | Supported | Experimental/unclaimed | Not Supported initially | Backend inherits modular EF constraint; frontend built separately |
| `full-stack` + Blazor Web App server/interactivity | Supported | Provider-specific | Not Supported | Blazor Server isn't Native AOT compatible |
| Blazor WebAssembly client build | Supported UI lane | Partial trimming | Separate WASM AOT lane | Never merge this status with server Native AOT |

`Candidate` is not a new public support label. It means the combination should be tested
for promotion by ticket 113; until then it is Experimental in generated output.

## Publish and smoke-test matrix

### Controlled dimensions

- SDK/runtime: exact supported .NET 10 SDK feature band and latest approved runtime patch,
  recorded in Release Evidence; dependency lock and Capability Manifest recorded.
- Build: `Release`, warnings as errors, no broad IL/AOT suppression, clean restore.
- OS/RID: native `windows-latest`/`win-x64` and pinned supported Linux distribution/
  `linux-x64`. Add ARM64 only when MartiX declares it Supported; don't emulate an OS
  claim through cross-compilation.
- Deployment models: ordinary framework-dependent JIT reference; self-contained trimmed;
  self-contained Native AOT for eligible profiles.
- HTTP model: canonical Minimal API always; FastEndpoints as a separate adapter profile.
- Capability combinations: baseline plus each capability individually, each provider,
  and risk-based interaction sets. Do not take an infeasible Cartesian product.

### Required lanes

1. **Library analysis lane (PR):** build each runtime package with its declared
   `IsTrimmable`/`IsAotCompatible`; reject IL2xxx, IL3xxx, IL5xxx, and relevant
   single-file warnings. Build analyzer/source-generator assets separately.
2. **Rooted trim consumers (PR):** a tiny self-contained app roots every public member
   of one runtime package at a time, then all baseline packages together. This detects
   dependency implementation warnings that a library-only build can't see.
3. **Generated JIT matrix (PR):** generate every Supported Preset/provider manifest on
   Windows and Linux; restore, build, test, generate/compare OpenAPI, start, and smoke.
4. **Eligible trimmed/AOT profiles (PR for affected changes; always before release):**
   publish on the target OS, assert zero relevant warnings, launch the produced artifact
   directly, and run the black-box suite. Compilation alone fails the evidence contract.
5. **Extended provider/interaction matrix (nightly and release):** exact provider
   containers/services, authentication, persistence, exporter, multi-instance, shutdown,
   and failure scenarios for every declared combination.
6. **Experimental EF AOT lane (nightly, non-blocking):** compile models/precompile
   queries, record upstream warnings and artifact size, and run specifications against
   real PostgreSQL and SQL Server. It informs future promotion but doesn't weaken a
   Supported JIT release.

### Black-box artifact assertions

The same public conformance suite runs against JIT, trimmed, and AOT artifacts:

- process starts and `/alive` becomes healthy within its profile timeout;
- `/ready` accurately reflects dependency state and later recovers;
- representative anonymous success, not-found, validation, conflict, and unexpected
  failure paths return the exact typed JSON/Problem Details contract;
- every source-generated JSON input/output shape is exercised, including nullability,
  collections, Problem Details extensions, enums, and streaming/SSE where selected;
- every OpenAPI major-version document is present and semantically equal across JIT and
  AOT; no endpoint disappears through source generation/trimming;
- JWT profiles prove valid, invalid, expired, missing, `401`, and `403` behavior;
- FastEndpoints profiles run the identical behavior suite and verify generated discovery;
- selected health, rate-limit, caching, background-work, telemetry, and graceful-shutdown
  behavior is exercised rather than merely registered;
- no unexpected reflection-disabled `InvalidOperationException`, missing method/type,
  startup warning, secret leakage, or telemetry contract drift occurs;
- SIGTERM/process-stop completes within the declared bounded shutdown budget.

## Performance methodology and gates

### What to measure

1. **Library microbenchmarks:** Result/error creation and mapping, Problem Details
   translation, specification composition/evaluation overhead independent of database
   I/O, audit-event construction, idempotency fingerprinting, and any deliberately
   allocation-free hot path. Use BenchmarkDotNet out-of-process Release jobs and
   `MemoryDiagnoser`.
2. **Generated-host controlled scenarios:** no-op typed endpoint, representative JSON
   request/response, validation failure, authorization failure, Problem Details,
   OpenAPI generation, output cache hit/miss, telemetry disabled/enabled, and selected
   capability interactions. Run Release/Production with fixed logging and resource limits.
3. **Cold path:** publish duration (informational except developer workflow), executable/
   artifact size, process-start-to-alive, process-start-to-ready, first request, steady
   working set, and shutdown.
4. **Sustained/load path:** throughput, p50/p95/p99 latency, error rate, CPU, working set,
   allocation/GC, thread-pool queue/starvation, connection pool behavior, bounded queue
   depth, and post-load recovery. ASP.NET Core explicitly recommends Release and
   Production mode for load/stress testing. [ASP.NET Core load and stress testing](https://learn.microsoft.com/en-us/aspnet/core/test/load-tests?view=aspnetcore-10.0)

BenchmarkDotNet runs measurements in a separate process and emits artifacts. Its
statistical-test columns support equivalence thresholds such as percentages; use them
to avoid treating normal noise as a regression.
[BenchmarkDotNet statistical testing](https://benchmarkdotnet.org/articles/samples/IntroStatisticalTesting.html)
Runtime working set and GC metrics can be captured from process startup with
`dotnet-counters`. [dotnet-counters](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/dotnet-counters)

### Environment discipline

- Use a dedicated, pinned runner pool with fixed CPU model/count, power plan, OS image,
  SDK/runtime patch, container/runtime versions, and no concurrent jobs.
- Compare candidate and baseline from the same run image and, preferably, interleave
  repeated candidate/baseline executions to control drift.
- Store raw BenchmarkDotNet JSON/CSV, load-generator histograms, environment metadata,
  commit/package identities, and counters—not only a Markdown summary.
- Establish the environment's noise floor with repeated unchanged-baseline runs before
  enabling a gate. Require at least five clean historical runs to establish a baseline.
- Rerun a suspected regression once on a fresh isolated runner; a repeatable failure
  blocks. A rerun doesn't erase the first result and both artifacts remain evidence.
- Profile a regression before accepting it. Intentional performance trade-offs require
  an ADR and prospective baseline update; never rewrite a baseline to make a candidate pass.

### Release-blocking thresholds

These preserve ticket 103 while making noise handling explicit:

| Signal | Blocking rule |
| --- | --- |
| Microbenchmark time/throughput | Candidate is at least 5% worse **and** the configured statistical/equivalence comparison classifies it as slower beyond the validated noise floor |
| Microbenchmark allocations | At least 5% worse where allocations are material; any new allocation on a declared zero-allocation path blocks |
| Host p50/p95 latency | Repeatable regression greater than 5% |
| Host p99 latency | Repeatable regression greater than 10% |
| Host throughput | Repeatable regression greater than 5% |
| Startup, steady working set, published artifact size | Repeatable regression greater than 10% for the same profile |
| Reliability under load | Any unexpected failure, sustained resource leak, thread-pool starvation, false readiness, or unbounded queue blocks regardless of percentage |
| AOT/trim correctness | Any relevant warning or JIT/AOT public-behavior difference blocks the declared combination |

For tiny measurements, a percentage alone can be meaningless. Each benchmark therefore
also declares a reviewed practical absolute effect threshold derived from its baseline
and consumer impact. Both practical significance and repeatability are required for a
time gate; correctness/allocation invariants remain absolute.

### Defensible absolute budgets

MartiX should **not** publish one absolute request-latency, throughput, startup-memory,
or binary-size promise for all applications. Those depend on workload, DTO size,
database, network, hardware, UI, security, and selected providers. Each production
Generated Solution owns its SLOs and load profile.

The initial cross-platform absolute release gates are limited to:

- zero relevant trim/AOT/compiler warnings and zero smoke-test failures;
- zero new allocations on explicitly named zero-allocation paths;
- zero unexpected errors, unbounded queues, starvation, or sustained resource leaks;
- the accepted default `api` generation-to-successful-health budget of five minutes on
  the controlled reference environment, including restore/build;
- capability-specific bounded timeouts where correctness requires them (startup health,
  graceful shutdown, retry/queue drain), with the numeric values owned by ticket 120's
  deployment profiles rather than invented globally here.

Startup time, working set, and artifact size still block **relative regressions**. After
stable measurements exist, a specific deployment profile may add an absolute guardrail
through an ADR. AOT isn't automatically faster at steady state: it loses JIT/runtime
optimization opportunities, so JIT and AOT baselines are separate and neither is used
as the other's release threshold. [Native AOT deployment trade-offs](https://learn.microsoft.com/en-us/dotnet/core/deploying/native-aot/)

## Current repository observations and migration notes

These are local facts, not claims about the future topology:

1. `src/MartiX.WebApi/MartiX.WebApi.csproj` currently declares both
   `IsAotCompatible` and `IsTrimmable`, but no rooted trimming consumer or AOT host lane
   exists. The declaration is therefore ahead of executable evidence.
2. `BlazorHttpResponseMessageExtensions` uses reflection-based generic JSON APIs and
   explicitly carries `RequiresUnreferencedCode` and `RequiresDynamicCode` on four
   public paths. These APIs must not migrate into `MartiX.Platform`; generated clients
   should accept generated `JsonTypeInfo<T>`/contexts or use generated OpenAPI clients.
3. The current sample directly references FastEndpoints 6.2.0 but doesn't reference
   `FastEndpoints.Generator` or configure generated discovery/JSON/binding metadata. It
   cannot serve as FastEndpoints AOT evidence.
4. A local attempt on 2026-07-18 with .NET SDK 10.0.110 to publish the current sample as
   `win-x64` Native AOT failed before application analysis with `NETSDK1207`: the global
   `PublishAot=true` flowed into the `netstandard2.0` analyzer project reference. Future
   compatibility fixtures must consume packed analyzers or isolate build-only project
   references so runtime publish properties don't target analyzer projects.
5. The current BenchmarkDotNet project measures Result construction and an in-memory
   specification over 1,000 items. It has `MemoryDiagnoser` but no stored baselines,
   candidate/baseline job, statistical gate, pinned environment, or generated-host
   scenarios. The specification case also includes LINQ-to-Objects materialization, so
   it doesn't isolate MartiX evaluator overhead or represent EF provider behavior.
6. `global.json` already selects Microsoft.Testing.Platform, matching the accepted
   .NET 10/TUnit direction. The compatibility suite should remain in the minimal project
   topology accepted by ticket 106; categories and fixtures don't require a new test
   project per capability.

Migration sequence:

1. Move to the accepted package graph and remove client/reflection/EF/third-party
   surfaces from the future Kernel.
2. Add rooted trim consumers before setting package metadata.
3. Add canonical generated `api` fixtures with reflection-disabled JSON and explicit DI.
4. Add native Windows/Linux trimmed and AOT publish plus black-box smoke lanes.
5. Add the generated FastEndpoints profile only after upgrading to a release selected
   and verified by ticket 119, with its generator and committed generated JSON artifacts.
6. Keep EF AOT experimental. Do not delay the high-quality JIT modular architecture or
   add a second persistence abstraction to force AOT.
7. Replace illustrative benchmarks with decision-relevant isolated cases and stored
   baselines before any benchmark number blocks a release.

## Alternatives considered

- **Require Native AOT for every Preset.** Rejected because it would exclude the already
  chosen EF Core modular architecture, local Identity, and Blazor Server, or encourage
  false compatibility claims.
- **Ignore Native AOT until all dependencies support it.** Rejected because the lean API
  and foundational packages can be AOT-safe now, and early source-generation/explicit
  composition choices avoid expensive later rewrites.
- **Treat all `net10.0` or analyzer-clean packages as AOT-compatible.** Rejected because
  Native AOT analyzes and changes the entire executable dependency closure.
- **Create a separate AOT architecture/persistence abstraction.** Rejected because it
  duplicates architecture, violates KISS/minimal-project goals, and optimizes a label
  rather than a demonstrated workload need.
- **Use one giant Cartesian capability matrix.** Rejected as unaffordable and low-signal.
  Baseline, one-at-a-time provider, and risk-based interaction profiles make every claim
  explicit without combinatorial theater.
- **Use universal absolute latency/throughput limits.** Rejected because applications own
  workload SLOs. Stable regression-relative gates detect Platform damage without making
  promises the Platform can't control.
- **Run performance gates on ordinary shared PR runners.** Rejected because environment
  noise would create unreliable blocks and retry-to-green behavior.

## Consequences

- The default high-quality architecture remains JIT-first; AOT becomes a strong,
  executable option rather than a design distortion.
- Provider selection in ticket 119 must record trim/AOT status and its exact evidence.
- Ticket 113 must encode package metadata checks, rooted consumers, generated host
  profiles, OS-native publish, black-box smoke tests, benchmark artifact retention, and
  failure semantics.
- Ticket 120 must define pinned runtime/OS/container profiles and numeric startup,
  readiness, shutdown, and doctor-command timeouts.
- Release evidence must identify the exact package/capability/provider/RID combination;
  a single `aotCompatible: true` boolean is insufficient.
- Dependencies or provider upgrades can change compatibility without API changes and
  therefore trigger the relevant publish/smoke matrix.

## Deferred questions and promotion triggers

1. Exact PostgreSQL, SQL Server, Redis/Valkey, broker, object-storage, OpenTelemetry,
   Serilog, identity, and cloud-provider package versions await ticket 119.
2. Exact UI render/hosting modes and whether a Blazor WebAssembly provider enables its
   separate WASM AOT release lane await ticket 118.
3. ARM64 and Alpine/musl support remain undeclared until a real deployment profile and
   native runner are selected; no implicit support follows from .NET capability.
4. EF Core Native AOT is reconsidered when Microsoft removes its production warning and
   both selected providers pass the full MartiX specification/migration/failure matrix.
5. FastEndpoints compatibility is reconsidered on every dependency/generator update and
   whenever a selected DTO shape invokes its documented reflection fallback.
6. Absolute deployment budgets may be added only after ticket 120 defines a reference
   profile and sufficient historical evidence exists.

## Primary source index

- [.NET Native AOT deployment](https://learn.microsoft.com/en-us/dotnet/core/deploying/native-aot/)
- [.NET trimming deployment](https://learn.microsoft.com/en-us/dotnet/core/deploying/trimming/trim-self-contained)
- [Prepare .NET libraries for trimming](https://learn.microsoft.com/en-us/dotnet/core/deploying/trimming/prepare-libraries-for-trimming)
- [ASP.NET Core 10 Native AOT support](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/native-aot?view=aspnetcore-10.0)
- [ASP.NET Core 10 OpenAPI](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/openapi/aspnetcore-openapi?view=aspnetcore-10.0)
- [System.Text.Json source generation](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/source-generation)
- [EF Core NativeAOT/query precompilation](https://learn.microsoft.com/en-us/ef/core/performance/nativeaot-and-precompiled-queries)
- [FastEndpoints Native AOT](https://fast-endpoints.com/docs/native-aot)
- [Microsoft.Testing.Platform](https://learn.microsoft.com/en-us/dotnet/core/testing/microsoft-testing-platform-intro)
- [TUnit source-generation/AOT engine](https://tunit.dev/docs/execution/engine-modes/)
- [BenchmarkDotNet statistical testing](https://benchmarkdotnet.org/articles/samples/IntroStatisticalTesting.html)
- [ASP.NET Core load/stress testing](https://learn.microsoft.com/en-us/aspnet/core/test/load-tests?view=aspnetcore-10.0)
