---
title: Define the AOT and performance compatibility matrix
status: closed
type: wayfinder:research
parent: ../map.md
claimed_by: codex-root
blocked_by:
  - 103-define-quality-attributes.md
  - 104-capability-preset-matrix.md
  - 105-platform-library-topology.md
  - 107-persistence-and-migrations.md
  - 108-identity-provider-matrix.md
  - 109-integration-event-delivery.md
  - 110-http-contract-policy.md
  - 111-security-observability-baseline.md
resolved: 2026-07-18
---

## Question

Which package and capability combinations must support trimming or Native AOT, what publish and smoke tests prove that support, and which measured performance budgets or benchmarks should block releases?

## Research asset

[AOT and performance compatibility research](../research/112-aot-performance-compatibility.md) records the .NET 10, ASP.NET Core, EF Core, FastEndpoints, TUnit, trimming, Native AOT, and performance evidence behind this resolution. It separates primary-source facts from MartiX recommendations and records the exact research date because framework and provider support can change without a MartiX API change.

## Resolution

### Compatibility is an exact executable claim

Trimming and Native AOT compatibility belong to an exact combination of Platform package version, generated source, Preset, selected Capabilities and providers, SDK/runtime patch, operating system, and RID. They are never repository-wide, TFM-wide, or inherited marketing labels. A BCL-only Kernel claim does not make an Adapter compatible, and an incompatible provider does not weaken a separately proven Kernel claim.

Keep the existing public Capability support vocabulary of **Supported** or **Experimental**. Record each deployment compatibility axis separately as **Declared**, **Not declared**, or **Not applicable**:

- **Declared** means every required release-blocking lane is green for every listed RID and combination.
- **Not declared** means the Capability may still be fully Supported under ordinary JIT, but MartiX makes no trimming or Native AOT promise for that combination.
- **Not applicable** is reserved for build-time artifacts that never enter the deployed runtime.

Do not introduce labels such as mostly compatible, expected compatible, or supported with warnings. A combination whose evidence is incomplete remains Experimental if generation exposes it specifically as a trim/AOT profile; it cannot enter a production Preset under that profile.

**Why:** Native AOT analyzes the entire executable dependency closure and changes runtime behavior. `net10.0`, an analyzer-clean library build, `IsAotCompatible`, or a successful compilation is useful evidence but cannot prove that the published application starts and preserves its contracts.

### Initial Platform package claims

| Artifact | Trimming | Native AOT | Release contract |
| --- | --- | --- | --- |
| `MartiX.Platform` | Declared | Declared | BCL-only graph, `IsAotCompatible`, reference-compatibility analysis, and rooted consumers that exercise every public Interface on Windows and Linux |
| `MartiX.Platform.AspNetCore` | Declared | Declared | Real generated Minimal API consumer with explicit endpoint composition, source-generated JSON, first-party OpenAPI, HTTP conformance, and black-box artifact tests |
| `MartiX.Platform.Analyzers` | Not applicable | Not applicable | Build and package as a Roslyn-compatible build-time asset; runtime publish properties must never flow into its `netstandard2.0` build |
| `MartiX.Platform.EntityFrameworkCore` | Not declared initially | Not declared initially | Remains production Supported under ordinary JIT; EF Core Native AOT is still explicitly experimental and the accepted composable Specifications are dynamic queries |
| `MartiX.Platform.AspNetCore.FastEndpoints` | Separately declarable | Separately declarable | May advertise either claim only for exact FastEndpoints and Generator versions with generated discovery, binding metadata and JSON contexts, no selected reflection fallback, and full Minimal API parity evidence |
| Any future provider package | Not declared by default | Not declared by default | Promote only its exact provider/profile after a rooted consumer, dependency-closure analysis, publish, smoke, failure, and upgrade matrix passes |

Set `IsTrimmable` or `IsAotCompatible` only after the corresponding consumer lanes exist. `IsAotCompatible` implies the trim and AOT analyzers but remains metadata backed by release evidence, not the evidence itself. Enable analyzers without compatibility metadata when investigating a future claim. A broad linker descriptor, blanket warning suppression, or undocumented `UnconditionalSuppressMessage` cannot create a Supported claim; a narrow unavoidable annotation requires an explicit invariant, source link, and black-box coverage.

**Why:** package-specific claims preserve the small truthful dependency graph accepted earlier. In particular, the production modular architecture must not be distorted or duplicated merely to obtain an AOT badge.

### Preset and Capability matrix

| Generated combination | Ordinary .NET 10 JIT | Trimmed self-contained | Native AOT | Initial decision |
| --- | --- | --- | --- | --- |
| Lean `api`, canonical Minimal APIs, Platform Baseline, `auth=none`, no persistence or UI | Supported | Declared | Declared | Primary MartiX trim/AOT reference profile |
| Above plus first-party OpenAPI 3.1 | Supported | Declared | Declared | Build-time and runtime documents plus endpoint parity are tested |
| Above plus exact JWT bearer `oidc:api`, `entra:api-delegated`, or `entra:api-application` profile | Supported when that provider profile passes ticket 108 evidence | Declared only after exact provider evidence | Declared only after exact provider evidence | JWT bearer is the only initially admissible AOT Authentication family |
| Lean `api` using FastEndpoints | Supported | Not declared until its generated profile passes | Not declared until its generated profile passes | Optional Adapter support under JIT does not depend on its AOT promotion |
| Local cache/output cache, configuration Feature Management, bounded hosted work, SSE, SignalR, static files, or other first-party-compatible host feature | Supported when selected | Per-Capability declaration | Per-Capability declaration | Each Capability and material interaction must earn the claim; ASP.NET framework support alone is insufficient |
| Any EF Core relational persistence with PostgreSQL or SQL Server | Supported | Not declared initially | Not declared initially | EF upstream production warning and provider/query constraints take precedence |
| Local ASP.NET Core Identity | Supported under its declared provider profile | Not declared | Not declared | Requires EF Core and non-JWT cookie/Identity behavior |
| Interactive OIDC, Entra interactive, cookie/BFF, or server session | Supported under its declared provider profile | Not declared | Not declared | Current ASP.NET Core AOT support covers JWT, not other Authentication families |
| Durable idempotency, Durable Jobs, Durable Audit, outbox/inbox, Notification Inbox, or webhook delivery | Supported in their accepted Presets | Not declared initially | Not declared initially | Initial correctness providers require relational persistence |
| Broker, distributed cache/backplane, Object Storage, exporter, Serilog, Aspire, or cloud provider | Only after provider selection | Provider-specific | Provider-specific | Ticket 119 must record exact evidence; no provider inherits a Platform claim |
| `modular-monolith` | Supported | Not declared initially | Not declared initially | Required EF Core and reliable-event persistence make JIT the honest production model |
| `full-stack` with React or Vue | Supported | Backend not declared initially | Backend not declared initially | The separately built frontend neither proves nor blocks server AOT; the backend inherits the modular persistence constraint |
| `full-stack` with Blazor Web App server interactivity | Supported | Provider-specific | Not declared | Blazor Server is not Native AOT compatible |
| Blazor WebAssembly client | Supported UI provider lane | Its own supported partial-trimming policy | Separate WebAssembly AOT lane | Never report client WebAssembly AOT as server Native AOT |

The primary AOT host uses `WebApplication.CreateSlimBuilder`, explicit Minimal API mapping, explicit DI registration, the configuration-binding and Request Delegate source generators, and module-local `JsonSerializerContext` composition. Set `JsonSerializerIsReflectionEnabledByDefault=false` in every configuration so missing JSON metadata fails during ordinary development rather than only after trimming. Exercise every request, response, Problem Details extension, Integration Event, cache value, and generated-client DTO that enters a declared profile.

Assembly scanning, plugin loading, convention-only discovery, runtime proxy generation, unbounded `Activator.CreateInstance`, `Assembly.GetTypes`, `Expression.Compile`, and reflection fallback are invalid inside a declared AOT profile. Source generation is a mechanism, not an automatic compatibility claim.

**Why:** this gives small and high-density API workloads a real production AOT option while retaining the superior EF Core modular architecture for applications whose value is not dominated by cold start or footprint. React, Vue, and Blazor remain equally Supported UI choices without conflating three different compilation models.

### Publish and compatibility evidence

The Release Evidence Manifest records the exact SDK/runtime patch, package lock, Platform version and commit, Capability Manifest, source-generated artifacts, OS image, RID, publish properties, warnings, artifact hashes, and smoke results. Initially declared runtime RIDs are `win-x64` on a native Windows runner and `linux-x64` on a pinned glibc Linux runner. ARM64 and musl/Alpine remain Not declared until a concrete deployment profile adds native runners and evidence; cross-compilation does not prove an OS claim.

Required lanes are:

1. **Package analysis on every pull request:** build each runtime package with its declared metadata and reference-compatibility checks; reject relevant IL2xxx, IL3xxx, IL5xxx, single-file, compiler, and analyzer warnings. Build Analyzers and source generators in a separate build-time lane.
2. **Rooted trim consumers on every relevant pull request:** self-contained consumers root every public member of each runtime package separately and the selected package set together. This catches dependency warnings invisible to a library-only build.
3. **Generated JIT matrix on Windows and Linux:** generate every Supported Preset/provider manifest, restore, build, run TUnit and architecture tests, generate and compare OpenAPI, start the real host, and smoke the immutable artifact.
4. **Trim and Native AOT matrix:** for every declared combination, publish natively on each claimed OS/RID with zero relevant warnings, launch the produced executable directly, and run the same black-box public conformance suite used against JIT. Never substitute `WebApplicationFactory` for the Native AOT process.
5. **Nightly and release interaction matrix:** run exact provider services, Authentication profiles, multi-instance behavior, exporter presence/absence, dependency loss/recovery, sustained load, shutdown, and failure injection for all declared high-risk combinations.
6. **Non-blocking EF AOT watch lane:** compile models and queries and record warnings, size, provider behavior, and MartiX Specification limitations. It informs a future decision but cannot weaken or delay the Supported JIT modular release.

TUnit remains source-generation mode on Microsoft.Testing.Platform and parallel by default. Use properties/categories and TUnit tree-node filters for fast lanes, unique per-test resources, and measured `ParallelLimiter<T>` constraints for native publish or provider capacity. Do not use reflection mode in an AOT test project, assembly-wide serialization as a shortcut, retries to turn red evidence green, or skipped tests in a Supported release profile. Product compatibility is proved by the product executable; Native-AOT-publishing the TUnit runner is useful secondary framework evidence only.

### Black-box artifact contract

The same public suite must establish semantic equivalence across JIT, trimmed, and AOT artifacts:

- bounded process startup and truthful `/alive` and `/ready` behavior, including dependency recovery;
- representative success, not-found, binding, validation, authorization, conflict, rate-limit, and unexpected-failure paths with exact typed JSON and RFC 9457 Problem Details;
- all registered JSON shapes, nullability, collections, string enums, date/time, streaming and SSE forms selected by the profile;
- every major-version OpenAPI document, operation, schema, security declaration, and lifecycle header with no endpoint lost during generation or trimming;
- valid, missing, malformed, expired and wrong-issuer/audience JWT behavior and correct `401` versus `403` semantics where selected;
- identical Minimal API and FastEndpoints public behavior when the Adapter profile is under test;
- health, caching, bounded background work, rate limiting, telemetry enabled/disabled, exporter loss, and security redaction behavior selected by the Capability Manifest;
- invalid production configuration failing startup without unsafe fallback;
- no missing type/member, reflection-disabled serialization failure, unexpected warning, secret/canary leakage, false readiness, or Observability Contract drift; and
- graceful process termination within the deployment profile's bounded shutdown budget.

Compilation alone, a package property, or one happy-path request never satisfies this contract.

### Performance measurement model

Use four complementary evidence layers:

1. **Library microbenchmarks:** BenchmarkDotNet out-of-process Release jobs with `MemoryDiagnoser` for Result/error creation, HTTP translation, Specification composition overhead independent of database I/O, audit construction, idempotency fingerprints, serialization helpers, and named zero-allocation paths.
2. **Controlled generated-host scenarios:** no-op typed endpoint, representative JSON round trip, validation and authorization failures, Problem Details, OpenAPI generation, telemetry disabled/enabled, output-cache hit/miss, and selected Capability interactions.
3. **Cold-path and artifact measurements:** publish duration as workflow evidence, artifact size, start-to-alive, start-to-ready, first request, steady working set, and shutdown. JIT, trimmed, and AOT profiles have independent baselines because AOT does not guarantee superior steady-state throughput.
4. **Sustained load and recovery:** throughput, p50/p95/p99 latency, error rate, CPU, working set, allocations/GC, thread-pool queue/starvation, connection pools, Capability queue/backlog depth, boundedness, and post-load recovery.

Run performance gates only on a dedicated pinned runner pool with fixed CPU, power plan, OS image, SDK/runtime and tool versions and no concurrent jobs. Candidate and last accepted baseline run from the same image, preferably interleaved. Store raw BenchmarkDotNet JSON/CSV, load histograms, counters, environment identity, and both commits. Establish the noise floor from at least five unchanged clean historical runs. One repeat on a fresh isolated runner confirms a suspected regression; it does not erase the original result. Retry-to-green is prohibited.

**Why:** a highly precise but unstable benchmark gate is lower quality than a statistically and operationally repeatable one. Measurement must detect Platform damage without confusing shared-runner noise with product behavior.

### Release-blocking performance budgets

Preserve the accepted quality thresholds and apply them only after the result exceeds the validated noise floor and practical effect threshold:

| Signal | Release-blocking rule |
| --- | --- |
| Microbenchmark execution time or throughput | Repeatable candidate regression of at least 5% and statistical/equivalence classification beyond the validated noise floor |
| Microbenchmark allocation | Repeatable increase of at least 5% where material; any new allocation on a deliberately named zero-allocation path |
| Controlled-host p50 or p95 latency | Repeatable regression greater than 5% |
| Controlled-host p99 latency | Repeatable regression greater than 10% |
| Controlled-host throughput | Repeatable regression greater than 5% |
| Startup, steady working set, or published artifact size | Repeatable regression greater than 10% within the same profile |
| Reliability under load | Any unexpected failure, sustained leak, thread-pool starvation, false readiness, or unbounded queue, regardless of percentage |
| Declared trim/AOT correctness | Any relevant warning, smoke failure, or public-behavior difference from JIT |

For tiny measurements, every benchmark also records a reviewed absolute practical-effect threshold derived from the measured baseline and consumer impact. A stable Platform release cannot be cut until every decision-relevant scenario has a stored baseline and budget in its Release Evidence Manifest. Intentional regression requires profiling evidence, an ADR describing the trade-off, and a prospective baseline change; never rewrite historical evidence to make the candidate pass.

Do not publish one universal absolute latency, throughput, working-set, startup, or artifact-size promise for arbitrary Generated Solutions. Those values depend on workload, DTOs, providers, security, topology, hardware, and UI. Each production application owns its SLOs and load profile. Platform-wide absolute gates are limited to zero warnings/failures, zero new allocation on named zero-allocation paths, zero unboundedness/leaks/starvation, and the already accepted five-minute generation-to-healthy-host budget on the controlled reference environment. Ticket 120 owns numeric deployment startup, readiness, shutdown, and doctor-command timeouts after it defines the reference profiles.

**Why:** regression-relative budgets are strict and actionable without making dishonest application-level promises. Application SLOs remain mandatory, but they measure a concrete workload rather than a template abstraction.

### Current implementation and migration direction

The existing repository is only migration input and does not constrain the clean target. Its current `IsAotCompatible`/`IsTrimmable` declarations, FastEndpoints sample, reflection-based Blazor JSON helpers, analyzer project-reference publish behavior, and illustrative benchmarks are not compatibility evidence and must not be copied merely for continuity.

Implement the target by first establishing the accepted package graph, then adding rooted consumers before metadata, canonical generated `api` fixtures with reflection-disabled JSON and explicit composition, native Windows/Linux publish and black-box lanes, and finally provider-specific profiles. Replace illustrative benchmark numbers with stored decision-relevant baselines before enabling release gates. Keep EF AOT non-blocking and Experimental until upstream and both Supported providers satisfy the promotion contract.

### Alternatives rejected

- **Require Native AOT for every Preset:** rejected because it would discard or distort the accepted EF Core Modular Monolith, Local Identity, and Blazor architecture while upstream production support is absent.
- **Ignore AOT until every dependency supports it:** rejected because the lean API and foundational packages can earn a real claim now, and explicit composition/source generation prevent future lock-in.
- **Treat `net10.0`, clean analyzers, or `IsAotCompatible` as proof:** rejected because the executable dependency closure and published behavior are the compatibility unit.
- **Create a parallel AOT architecture or persistence abstraction:** rejected as DRY/KISS and minimum-project violations without a workload force.
- **Test the Cartesian product of every Capability:** rejected in favor of baseline, each provider individually, and risk-based pairwise/interaction profiles recorded in the Capability Matrix.
- **Use universal absolute API performance promises:** rejected because the Platform cannot control application workload or deployment hardware.
- **Run release performance gates on shared CI:** rejected because noise would create flaky governance and normalize retries.

### Consequences and promotion triggers

- Native AOT is a strong production option for the lean API, not the organizing principle for every application.
- Provider selection must include exact trim/AOT status and evidence; dependency upgrades retrigger the applicable matrix even without an API change.
- Ticket 113 must encode package metadata, rooted consumers, generated profiles, OS-native publishes, artifact smoke suites, raw performance retention, thresholds, and failure semantics.
- Ticket 119 must select only provider/profile claims it can verify and may leave a Supported JIT provider without an AOT declaration.
- Ticket 120 must pin OS/container/runtime profiles and deployment timeout budgets.
- Ticket 118 owns UI render modes and any separate Blazor WebAssembly AOT lane.
- Add ARM64 or musl only after a real deployment profile and native runner exist.
- Reconsider EF Core Native AOT only when Microsoft removes the production warning and PostgreSQL plus SQL Server pass Specifications, migrations, concurrency, failure, and artifact parity evidence.
- Reconsider the FastEndpoints claim on every framework/generator update and whenever a selected DTO shape invokes reflection fallback.
- Add an absolute deployment budget only after stable measurements and a profile-specific ADR establish a defensible reference.
