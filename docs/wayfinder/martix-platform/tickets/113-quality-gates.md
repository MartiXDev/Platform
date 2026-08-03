---
title: Define executable quality gates and template verification
status: closed
type: wayfinder:grilling
parent: ../map.md
claimed_by: codex-root
blocked_by:
  - 103-define-quality-attributes.md
  - 104-capability-preset-matrix.md
  - 106-generated-solution-topology.md
  - 107-persistence-and-migrations.md
  - 108-identity-provider-matrix.md
  - 109-integration-event-delivery.md
  - 110-http-contract-policy.md
  - 111-security-observability-baseline.md
  - 112-aot-performance-matrix.md
  - 118-ui-provider-architecture.md
  - 119-infrastructure-provider-catalog.md
  - 120-development-deployment-profiles.md
resolved: 2026-07-19
---

## Question

What unit, architecture, HTTP contract, Testcontainers, generated-template, package-compatibility, security, performance, and migration verification must pass for each supported Preset and Platform release?

## Resolution

### Separate feedback cadence from release strictness

Quality Gates use four **Verification Cadences**. Cadence determines when and
where a gate runs; it never lowers the Composed Quality Profile required for a
Supported Release.

1. The `fast` local cadence runs formatting, compilation, analyzers, focused
   unit and architecture tests, and generated-file drift checks. It is the
   normal red-green-refactor loop and must remain runnable without production
   infrastructure.
2. The required `pull-request` cadence runs `fast` plus every conservatively
   affected host, HTTP contract, template-generation, package and integration
   profile on the required Windows and Linux runners. A shared build,
   generator, manifest, dependency, public contract or gate-policy change
   expands rather than narrows the affected set.
3. The `main-nightly` cadence runs the complete declared Supported
   Preset/Capability/provider matrix and the expensive Testcontainers,
   security, mutation, determinism, failure-injection, concurrency and stress
   profiles at their accepted frequencies. A failure marks `main`
   unreleasable immediately; it is not deferred debt and receives priority
   over feature work.
4. The `release-candidate` cadence performs a clean, immutable evidence run for
   the exact candidate. It includes every required Quality Gate, publish/AOT
   and performance profiles, Platform Migration fixtures, package-content and
   compatibility verification, SBOM, provenance and the Release Evidence
   Manifest. Release consumes these exact attested artifacts rather than
   rebuilding them.

Developers can invoke any broader cadence locally or in an isolated CI run.
The repository exposes stable orchestration entry points for the four cadences;
CI workflows call those entry points instead of reimplementing policy in YAML.
Every gate reports a stable identity, Quality Gate Profile, tested matrix
coordinates, tool version, duration, outcome and evidence location.

Pull-request impact selection is fail-closed. Missing, ambiguous or stale
ownership metadata selects the broader applicable profile. The pull request
records the selected and omitted coordinates plus the reason so reviewers can
detect an incorrect impact decision. Changes to selection logic run mutation-
style fixtures proving that representative file changes trigger every required
profile.

Required gates have zero skip, quarantine, allowed-failure or retry-to-green
semantics. A retry may diagnose an infrastructure incident, but it does not
erase the original result; the evidence retains both attempts and requires an
owned disposition. Nightly success cannot retroactively validate a pull request
that missed a required profile. Conversely, an expensive gate may run nightly
rather than on every pull request only when the accepted cadence explicitly
places it there and release remains blocked until current evidence is green.

**Why:** fast deterministic feedback supports TDD, while provider, OS,
performance, mutation and failure matrices are too costly to run after every
edit. Separating schedule from acceptance preserves developer flow without
turning delayed execution into relaxed quality. Repository-owned entry points
also keep local, CI and agent verification aligned and prevent workflow YAML
from becoming a second policy source.

**Alternatives rejected:** running the complete release suite on every edit
destroys the useful feedback loop; postponing all integration to release time
lets incompatibilities accumulate; CI-only commands prevent local reproduction;
and change-based selection that silently defaults to fewer tests makes skipped
evidence indistinguishable from confidence.

### Prove composition without a naive Cartesian product

The Supported verification matrix is compositional and risk-based. It does not
claim that independently passing parts prove every possible composition, and it
does not execute the unbounded Cartesian product of every Preset, Capability,
provider, UI, runtime, operating system and Deployment Profile.

Every release proves compatibility through six complementary layers:

1. Each Preset passes its complete canonical generated configuration on every
   declared operating system, runtime and artifact profile. The canonical Full
   Stack configurations include each equal Supported UI provider rather than
   treating one UI as representative of the others.
2. Each Capability Provider passes the Capability's common conformance suite in
   the smallest real generated host that exercises its framework, protocol,
   persistence, security and operational behavior. A fake or emulator may
   accelerate earlier feedback but cannot replace required real-provider
   evidence.
3. Every interaction that shares persistent state, transaction scope, identity
   or authorization policy, trust boundary, HTTP/middleware ordering, schema,
   serializer contract, background-delivery lifecycle, port, volume, process,
   or deployment resource receives an explicitly named combination profile.
4. Security, authorization, migration, transaction, outbox/inbox, idempotency,
   concurrency, recovery and destructive-removal guarantees always use direct
   scenario tests. Statistical or pairwise coverage cannot stand in for an
   invariant or failure guarantee.
5. Remaining dimensions that have documented independence use a deterministic
   covering array, normally pairwise and increased to higher interaction
   strength when defect history or coupling justifies it. The exact algorithm,
   seed, input dimensions, exclusions and generated coordinates are versioned
   and recorded in release evidence.
6. The generator exhaustively verifies the finite Capability Matrix rules:
   required dependencies, conflicts, invalid combinations, missing providers
   and unsupported coordinates must fail before generation with stable
   diagnostics. Valid selections used by the coverage plan must generate
   deterministic, token-free output.

A Supported claim therefore names its evidence model. A newly selectable
Capability or provider supplies its conformance profile, interaction inventory
and covering-array dimensions before admission. If reviewers cannot justify
independence or identify adequate interaction evidence, the combination gains
an explicit profile or remains Invalid/Experimental; it is never assumed
Supported by omission.

The matrix generator produces a reviewable manifest before execution. It lists
all declared Supported dimensions, canonical coordinates, direct interaction
profiles, covering-array coordinates, invalid-rule cases and uncovered
coordinates with explanations. A release fails if the generated plan differs
from the attested plan unexpectedly, contains an unexplained gap, or references
a skipped result.

Failures are localized by layer: Preset failures implicate generated topology;
conformance failures implicate a Capability Provider; interaction failures
implicate a declared seam; and covering-array failures are promoted into a
permanent regression and may reveal a new direct interaction profile. Escaped
composition defects likewise update the interaction inventory rather than only
adding one opaque end-to-end test.

**Why:** explicit contracts and high-risk interaction profiles provide stronger
evidence than brute-force sampling, while deterministic covering arrays detect
unexpected lower-risk interactions at bounded cost. The reviewable plan makes
support scope auditable and keeps future Capability growth from multiplying CI
cost invisibly.

**Alternatives rejected:** a full Cartesian product becomes operationally
unbounded; testing only canonical Presets misses selectable provider and
Capability behavior; isolated conformance alone misses interactions; pairwise-
only testing cannot prove critical invariants; and a hand-curated opaque sample
cannot demonstrate what was omitted or reproduce the release evidence.

### Keep Generated Solution verification consolidated

Every Generated Solution has one `<name>.Tests` .NET test project by default,
as accepted by the generated topology. It is a TUnit executable on
Microsoft.Testing.Platform and contains the solution-owned unit, architecture,
host/HTTP contract, persistence and real-provider integration, migration,
Playwright, operational and application-compatibility evidence. Folders,
namespaces, stable TUnit properties and Verification Cadence filters organize
these profiles; architectural layering does not create a project per test type
or Business Module.

TUnit source-generated discovery and parallel-by-default execution are the
standard. The canonical direct execution surface is `dotnet run` for the test
project; `dotnet test` is a compatibility surface only when an external CI tool
requires it, with runner arguments passed after `--`. The project is an
executable, does not reference `Microsoft.NET.Test.Sdk` or Coverlet packages,
uses TUnit's compatible coverage/reporting extensions, and fails verification
when an assertion is not awaited.

Tests remain independently executable and own isolated data. Shared setup uses
composed fixtures, factories, explicit host builders, Testcontainers resources
and TUnit data/lifecycle sources. Do not create inherited `BaseTest`,
`IntegrationTestBase`, or module-test hierarchies that hide setup, mutable state,
ordering, assertions or disposal. A fixture exposes a small test Interface and
owns its lifecycle; tests request only the fixtures they use.

Parallelism is constrained at the narrowest real resource. Unique databases,
schemas, users, keys, ports and browser contexts are preferred. Keyed mutual
exclusion or a typed concurrency limiter is admitted only for an actually
shared bounded resource. Global non-parallel execution, ordered test chains and
mutable static state are rejected unless an unavoidable external system is
documented and isolated. Retries never convert nondeterministic application
tests into passing evidence.

React and Vue keep fast unit/component tests in their selected UI package using
the accepted Vitest and Testing Library toolchain. Blazor component tests use
bUnit with TUnit in `<name>.Tests`. Provider-neutral Playwright journeys against
real UI and API artifacts also remain in `<name>.Tests`; selecting a UI does not
automatically create another cross-system browser-test project.

A second Generated Solution test project is admitted only for an evidenced
incompatible toolchain or target framework, an executable Native AOT/publish
fixture, a dependency conflict that cannot be isolated safely, a separately
selected browser ecosystem, or measured CI isolation that filtering and
fixtures cannot provide. The decision records its independent lifecycle and
demonstrates that the added project removes rather than redistributes
complexity.

Platform-product verification remains owned by the Platform repository and is
not copied into Generated Solutions. Its dedicated harnesses may include the
template-generation corpus, package-content and public-API compatibility,
analyzer tests, historical Platform Migration fixtures, Capability Provider and
UI conformance applications, benchmarks, Native AOT/publish fixtures, security
tooling and Release Evidence Manifest validation. Generated applications
consume the resulting Platform contracts and retain their application-owned
regression tests; they do not retest the MartiX generator or every provider in
the catalog.

**Why:** one application test project minimizes the project and dependency
graph while TUnit filtering retains fast, layered feedback. Keeping Platform-
product evidence at its owner prevents every application from paying for the
generator's compatibility matrix. Composed fixtures make state and lifecycle
visible and preserve the accepted preference for composition over inheritance.

**Alternatives rejected:** a project per test layer or Business Module adds
build and package maintenance without creating a real seam; one enormous
end-to-end suite loses localization and TDD speed; generating the complete
Platform harness into applications transfers the wrong ownership; inherited
test bases hide dependencies; and unconditional serialization conceals test
isolation defects while slowing the suite.

### Use a .NET 10 file-based Verification Entrypoint

Every Platform repository and Generated Solution exposes one canonical cross-
platform **Verification Entrypoint** at `eng/verify.cs`. It is a BCL-only .NET
10 file-based application with no `.csproj`, build-framework package or shell-
specific implementation. Its stable command surface is:

```text
dotnet run --file eng/verify.cs -- fast
dotnet run --file eng/verify.cs -- pull-request
dotnet run --file eng/verify.cs -- main-nightly
dotnet run --file eng/verify.cs -- release-candidate
```

The repository pins the required SDK in `global.json`. File-based applications
are an official .NET 10 SDK feature supported from SDK 10.0.100; they respect
the repository's `global.json`, `Directory.Build.*`, `Directory.Packages.props`
and NuGet configuration. The exact SDK patch and workload state are captured in
release evidence. See
[Microsoft's file-based app documentation](https://learn.microsoft.com/en-us/dotnet/core/sdk/file-based-apps)
and
[the `dotnet run` command](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-run).

`eng/quality-gates.json` is the versioned machine-readable **Quality Gate
Policy**. It declares schema/policy version, gate identities, owners,
Verification Cadences, prerequisites, supported matrix selectors, commands,
timeouts, required evidence and failure semantics. Thresholds that already
belong to another canonical manifest are referenced rather than copied. The
orchestrator validates this policy before executing any gate and fails closed
on unknown versions, duplicate gate identities, invalid dependencies, missing
commands or evidence, cycles and unexplained matrix exclusions.

`verify.cs` supplies the small amount of behavior the policy needs: repository-
root and toolchain discovery, safe argument construction, subprocess execution,
bounded parallelism, cancellation and timeout propagation, sanitized output,
stable exit codes, deterministic evidence paths and final result aggregation.
It invokes the repository's exact `dotnet`, TUnit, pnpm, container, security,
artifact and documentation commands; it does not reimplement those tools or
hide their original diagnostics.

CI workflows own runner provisioning, operating-system matrix, protected
credentials, caches and artifact upload. They call the same Verification
Entrypoint and do not reproduce gate selection, commands or acceptance policy
in YAML. Humans and agents use that identical entrypoint locally. Optional
thin convenience wrappers may forward arguments but contain no policy and are
not authoritative.

Each execution emits a structured Gate Run Manifest containing the policy
identity, source revision and dirty-state rule, toolchain, requested cadence,
selected and omitted matrix coordinates with reasons, start/end time, command
identity, sanitized log/report locations, outcome and artifact hashes. A
subprocess retry creates another recorded attempt; it cannot replace or erase a
failed required result.

The orchestrator remains a small deep Module. It does not acquire business
rules, implement its own general pipeline language, download unpinned tools or
contain provider-specific test logic. If its behavior can no longer fit in one
reviewable file with focused black-box tests, or requires multiple source files,
reusable libraries or independent packaging, it is promoted deliberately into
a separately tested build project. That growth is evidence that a real Module
boundary exists, not permission to keep expanding an opaque script.

**Why:** the .NET SDK is already the universal prerequisite, so a file-based C#
entrypoint provides one typed implementation on Windows and Linux without
adding a Generated Solution project. Separating declarative policy from the
small executor keeps changes reviewable, lets CI remain infrastructure glue and
gives developers and agents exact local parity.

**Alternatives rejected:** separate PowerShell and Bash implementations drift;
PowerShell-only orchestration adds a Linux prerequisite; Make or Just adds
another toolchain; a NUKE/build project increases the initial project graph
before its depth is demonstrated; embedding policy in CI YAML prevents local
parity; and an unstructured shell script cannot reliably produce attested
machine-readable evidence.

### Use a stable Quality Gate Family taxonomy

Every executable Quality Gate has exactly one primary **Quality Gate Family**.
The family vocabulary is stable across Platform repositories, Generated
Solutions, agents, CI summaries and Release Evidence. A gate may reference
evidence from another family, but it cannot be duplicated under several names
or hidden in a miscellaneous bucket.

| Family ID | Owned proof |
| --- | --- |
| `repository-integrity` | Deterministic restore and Release build, zero-warning analyzer/style policy, formatting, Markdown/link validation, generated-file drift, source hygiene and repository determinism |
| `unit-invariants` | Focused unit behavior, Critical Module invariants and failure paths, coverage and mutation thresholds |
| `architecture` | Project/package dependency direction, cycles, visibility, Business Module ownership, forbidden references/APIs and composition rules |
| `http-contract` | OpenAPI, serialization, typed results, RFC 9457 errors, versioning/lifecycle, binding/validation, authentication/authorization and supported HTTP protocol behavior |
| `provider-integration` | Real provider translation, protocol, transactions, persistence and lifecycle through Testcontainers or an admitted external environment |
| `reliability-operations` | Failure injection, concurrency, outbox/inbox, idempotency, retry bounds, health, shutdown, multi-instance behavior and the Observability Contract |
| `template-generation` | Canonical Presets and selections, Capability Manifest, invalid combinations, deterministic/token-free output, restore/build/start on Supported operating systems |
| `package-compatibility` | Packed contents, public API baseline, consumer compilation, dependency exposure, trimming and exact Supported Native AOT/publish profiles |
| `security-supply-chain` | ASVS scenarios, threat-model controls, SAST, secrets, dependency/license audit, authorization denial, SBOM and provenance inputs |
| `ui-conformance` | Selected provider type/lint/component/browser behavior, accessibility, localization, theming, SEO profile, CSP/identity safety and UI performance |
| `performance` | BenchmarkDotNet hot paths, controlled host load, latency/throughput, startup, allocations, working set, artifact size and noise-qualified regression budgets |
| `migration` | Database migrations and Platform Migrations over versioned historical fixtures, data preservation/transformation, compatibility, rollback or roll-forward recovery |
| `release-evidence` | Completeness and consistency of Gate Run Manifests, hashes, attestations, packages, deployment artifacts, documentation and the final Release Evidence Manifest |

Every gate definition has a globally stable ID, family, owner, purpose,
applicable Composed Quality Profiles, Verification Cadences, matrix selector,
prerequisites, executable command, timeout, required evidence schema and exact
pass/failure threshold. Renaming or splitting a gate preserves an alias/history
mapping so trends and release comparisons remain intelligible.

The common baseline selects the families relevant to all artifacts; artifact,
Preset, Capability and provider profiles add gates rather than redefining family
semantics. A family absent from one artifact is `not-applicable` only through an
explicit profile rule—for example, `ui-conformance` when no UI Capability was
selected—not because a workflow forgot to execute it. Selecting a family does
not imply another project; gate placement follows the previously accepted
ownership and test-harness rules.

Cross-family scenarios retain one primary outcome and link supporting evidence.
For example, an authorization HTTP test is primarily `http-contract` when it
proves status/error semantics, while the security profile references it as
evidence for an ASVS control. Copying the same test into
`security-supply-chain` would create divergent proof. A database deadlock retry
scenario belongs to `reliability-operations` and consumes real-provider setup
from `provider-integration` without reporting two independent passes.

The Verification Entrypoint renders results by family, owner and matrix
coordinate and fails policy validation for unknown families, ownerless gates,
duplicate evidence claims or catch-all identities such as `misc`, `other` or
`tests`. New families require a hard-to-reverse semantic gap, updated policy
schema, glossary and migration guidance; adding a tool does not by itself create
a family.

**Why:** stable semantic identities let reviewers locate a failure, allow
change-impact selection without filename folklore and make evidence comparable
across releases. A single primary owner prevents double counting while linked
evidence supports standards and profiles that cut across technical layers.

**Alternatives rejected:** one generic test family cannot express ownership or
risk; tool-named families change whenever tooling changes; duplicating cross-
cutting tests inflates confidence and permits drift; a project-per-family
violates the minimum-project posture; and allowing arbitrary repository-local
family names breaks Platform-wide evidence and agent guidance.

### Make every Gate Outcome fail-closed

Each selected Quality Gate produces exactly one terminal **Gate Outcome** from
the following closed vocabulary:

| Outcome | Meaning | Supported Release disposition |
| --- | --- | --- |
| `passed` | The gate executed against its declared inputs and proved its threshold with complete valid evidence | Acceptable |
| `failed` | Product behavior, artifact, policy or evidence violated the declared threshold | Blocking |
| `unstable` | Equivalent attempts produced inconsistent pass/fail behavior | Blocking |
| `infrastructure-error` | Runner, network, registry or test infrastructure prevented a trustworthy product result | Blocking |
| `cancelled` | Execution stopped before producing complete evidence, including fail-fast cancellation | Blocking |
| `not-applicable` | A versioned Composed Quality Profile rule proved before execution that the gate does not apply to this coordinate | Acceptable only for that explicit non-applicable coordinate |

`skipped`, `quarantined`, `allowed-failure`, `warning` and `best-effort` are not
valid terminal outcomes for a required gate. A test-runner skip is a policy
violation in required suites and becomes `failed`; it cannot manufacture
`not-applicable`. Conditional applicability is evaluated by the Quality Gate
Policy before scheduling and records the exact profile rule and inputs that
made the gate inapplicable.

A gate omitted by a narrower Verification Cadence has no Gate Outcome. The Gate
Run Manifest records it separately as `not-selected` with the cadence rule and
reason. This does not satisfy release evidence. The `release-candidate` cadence
must select every applicable required gate, and any selected gate that never
starts makes the run incomplete and blocking.

Timeout is a `failed` attempt with timeout as its reason unless the runner itself
could not enforce or observe the timeout, which is an `infrastructure-error`.
Fail-fast cancellation accelerates feedback but does not yield a complete green
run. An operator cancellation is likewise recorded rather than interpreted as
absence of a defect.

Every attempt is immutable evidence. A failing attempt followed by a passing
equivalent attempt yields `unstable`, not `passed`; rerunning cannot erase the
original failure. An `infrastructure-error` may trigger a clean replacement-
runner attempt according to policy, but the original incident remains linked
and the Supported Release waits for a new complete result. Classification as
infrastructure requires machine evidence and an owner, not a maintainer label
chosen to bypass a product failure.

Only applicable required gates whose final outcome is `passed`, together with
explicit policy-derived `not-applicable` coordinates, can form a green Composed
Quality Profile. Aggregation is monotonic and fail-closed: an unknown outcome,
missing result, schema mismatch, duplicate gate result, incomplete matrix or
invalid signature blocks the containing family, cadence and release.

**Why:** CI systems commonly present skipped, cancelled or retried work in ways
that look neutral or green. A small closed vocabulary makes lack of evidence
visibly different from proof, retains flakiness and infrastructure incidents as
actionable facts and lets agents evaluate release state without interpreting
provider-specific CI conventions.

**Alternatives rejected:** treating infrastructure failures as passes releases
without evidence; allowing retry-to-green hides nondeterminism; representing
cadence omission as `not-applicable` confuses schedule with support scope; and
free-form result strings make deterministic aggregation impossible.

### Measure coverage per production assembly and prove mutations directly

The `unit-invariants` family evaluates each non-generated production assembly
independently. Platform Libraries and application-owned backend assemblies in a
Generated Solution must each reach at least 90% line coverage, 85% branch
coverage and 95% changed-line coverage. A repository-wide aggregate is retained
for trend reporting only; it cannot let a well-covered Module hide an
under-tested one.

Thresholds are floors rather than targets. When a Supported baseline has a
materially higher stable value, policy may ratchet its assembly threshold upward
with an explicit noise allowance. A reduction requires a prospective documented
quality-policy decision with evidence; it cannot be committed in the same
change merely to make a failing gate pass. Moving code between assemblies,
splitting a Module or renaming files preserves historical lineage where feasible
and cannot reset changed-line responsibility silently.

Coverage measures production behavior but does not define completeness.
Critical Modules directly enumerate and test every documented invariant,
category/error outcome, failure path, boundary value, cancellation/timeout,
concurrency guarantee and safe recovery state. The gate validates a versioned
invariant-to-test evidence map for those Modules. A high percentage with a
missing invariant fails; unreachable defensive code is redesigned or narrowly
justified rather than covered through meaningless calls.

The denominator excludes test assemblies, compiler-generated artifacts,
mechanical EF Core migration designer output and deterministic Template System
output whose generator and black-box behavior have their own gates. Handwritten
application code, custom migration operations and handwritten portions adjacent
to generated output remain included. New path, attribute or source-level
coverage exclusions require an allowlisted stable identity, owner, exact reason
and review; broad globs and casual `ExcludeFromCodeCoverage` use fail policy.

Changed-line coverage is computed from the reviewed merge base and the final
candidate source mapping, not from a developer-selected diff. Renames and
generated/manual boundaries are normalized deterministically. Missing or
unmappable coverage data is blocking rather than treated as uncovered code that
can be averaged away or as an empty successful report.

Mutation testing runs at `main-nightly` and `release-candidate` cadence over
deterministic domain/application logic and every Critical Module for which
mutation is technically meaningful. The minimum mutation score is 80%. The
evidence separately records killed, survived, no-coverage, timeout, build-error
and explicitly equivalent mutations by assembly, operator and source location.
Equivalent-mutant classification is narrow, reviewed and versioned; it is not a
generic exclusion bucket.

Every surviving non-equivalent mutation receives a test, a justified design
change or a blocking tracked disposition before release. No-coverage mutations
must agree with the accepted coverage exclusion model; timeouts or mutation-
runner failures cannot improve the score and produce a blocking Gate Outcome
when they prevent trustworthy measurement. The exact mutation tool and version
are pinned, but the evidence contract is tool-neutral.

React, Vue and Blazor component-code coverage receives provider-specific gates
only where the tool can map executable source reliably. Provider-native unit
and component tests own those thresholds. Playwright journeys, accessibility
checks and SSR/SEO assertions remain behavioral evidence and are not converted
into artificial line-coverage goals.

**Why:** assembly-level thresholds preserve Business Module and Platform Library
ownership, while changed-line and ratcheting rules prevent new debt. Mutation
testing checks assertion strength that execution coverage cannot reveal.
Explicit invariant mapping ensures percentage improvements do not replace the
security, data-integrity and concurrency guarantees the Platform actually
promises.

**Alternatives rejected:** one repository percentage hides weak assemblies;
universal 100% coverage rewards incidental tests; unrestricted exclusions make
the threshold optional; mutation score without outcome categories can hide
timeouts and unexecuted code; and applying backend coverage mechanics to browser
journeys produces numbers without behavioral meaning.

### Enforce architecture primarily at compile time

The `architecture` family uses MartiX Roslyn analyzers plus a deterministic
MSBuild/project/package graph validator as its primary enforcement. Rules fail
in the IDE and ordinary Release build at the source location where the
violation is introduced. Runtime or compiled-assembly architecture tests are a
defense-in-depth layer only for relationships that cannot be proved reliably by
one semantic analyzer or graph rule.

The graph validator composes `.slnx`, project evaluation, `ProjectReference`,
central and direct `PackageReference`, target frameworks, assembly identity,
Capability Manifest and the accepted generated topology. It proves allowed
edges, absence of cycles, no undeclared package/provider dependency, no
unintended transitive public exposure and exact project presence for the
selected Preset. Evaluation failure, conditional ambiguity or a graph that
differs by undeclared build properties is blocking rather than silently
approximated.

The initial analyzer/graph rule set includes direct executable enforcement for:

- Business Modules exposing cross-module usage only through their deliberate
  Contracts surface and never through another module's internals, EF model,
  tables or implementation namespaces;
- the accepted acyclic Business Module contract graph and explicit integration
  subscription/composition roots;
- Domain and application behavior remaining independent of ASP.NET Core,
  EF Core infrastructure, Aspire, Docker, cloud SDKs and provider adapters;
- the Platform Kernel remaining BCL-only and every Platform Library respecting
  its accepted dependency direction;
- endpoint, composition-root, persistence and provider code residing only in
  the owner accepted by the topology;
- explicit registration instead of assembly scanning or runtime infrastructure
  discovery where the accepted design forbids it;
- sealed-by-default MartiX-owned types and the documented, evidence-based
  exceptions for real polymorphism;
- rejection of `BaseEntity`, inherited Specifications, `BaseTest` and similar
  convenience hierarchies that violate accepted composition decisions;
- `IHas*` Interfaces referring only to admitted orthogonal Entity Capabilities
  with their required mapping, lifecycle and verification contract; and
- prohibited package/API usage and local settings that weaken repository-wide
  language, nullable, analyzer, warning or dependency policy.

Every diagnostic has a stable MartiX ID, category, default error severity,
precise location, deterministic message, rationale/documentation link, compliant
and noncompliant examples and version-introduction metadata. A code fix is
supplied only when it can preserve semantics predictably; architecture changes
requiring ownership judgment produce guidance rather than a dangerous automatic
rewrite.

The analyzer package owns compiler-based positive, negative, edge-case and code-
fix fixtures for every diagnostic across the supported language/SDK matrix.
Fixtures verify diagnostic ID, severity, source span, arguments, generated-code
behavior and fixed source. The actual generated canonical Presets then compile
with the packed analyzer artifact, proving that template wiring activates the
rules rather than only testing analyzer source in isolation.

Analyzer policy is non-optional in Supported profiles. A gate compares effective
MSBuild/editorconfig severity and suppressions against policy. Global or project
`NoWarn`, blanket `pragma`, global analyzer suppression, package removal,
severity demotion, generated-code misclassification or an unapproved
`SuppressMessage` fails. A necessary exception names one diagnostic, smallest
scope, owner, exact rationale and expiry/review trigger in the versioned
allowlist; security, ownership and dependency-direction rules cannot be waived
merely for convenience.

Runtime architecture tests inspect the compiled output and application behavior
only where valuable—for example, public surface shape, final DI registrations,
endpoint authorization metadata or accidental loaded dependencies. They link to
the same architectural rule identity and do not restate a divergent convention.
NetArchTest, ArchUnitNET or another architecture library is not a default
Generated Solution dependency; one may be admitted later only when measured
depth and maintenance benefit exceed the analyzer/metadata implementation.

**Why:** compile-time semantic diagnostics give the shortest and most precise
feedback to developers and agents, while graph validation sees evaluated build
relationships that source inspection alone misses. A narrow compiled/runtime
backstop covers emergent behavior without forcing every architecture rule into
slow reflection tests or another third-party abstraction.

**Alternatives rejected:** runtime tests as the primary mechanism detect errors
late and often only by naming convention; package-reference inspection without
MSBuild evaluation misses conditional graphs; documentation-only rules drift;
an external library by default adds a dependency without a demonstrated missing
capability; and unrestricted suppressions turn mandatory architecture into
advice.

### Prove HTTP contracts at metadata, host, specification and artifact layers

The `http-contract` family composes four distinct evidence layers. Passing one
does not substitute for the others because endpoint metadata, generated
specification, ASP.NET Core pipeline behavior and the published deployment
artifact have different failure modes.

#### Endpoint metadata inspection

Every mapped business endpoint is inspected from the actual application data
sources and must have one stable route/method pair, operation ID, major-version
group, module tag, authorization or explicit anonymous intent, request/media
contract, exact success and Problem Details responses, and metadata for every
selected HTTP Capability such as idempotency, concurrency, caching or lifecycle
headers. A source/architecture rule detects an endpoint implementation omitted
from explicit registration and duplicate or ambiguous routes before runtime.

Metadata inspection verifies declarations, not only observed happy-path
responses. A broad `IResult`, undocumented status, missing error response,
placeholder `Location`, operational endpoint in a business document or policy
inferred only from naming fails the gate. Minimal APIs and the FastEndpoints
adapter map into the same provider-neutral metadata assertions.

#### Authoritative build-time OpenAPI 3.1

The real generated host emits one OpenAPI 3.1 document per supported business
major version during build using the accepted first-party ASP.NET Core OpenAPI
foundation. A separately version-pinned parser/validator reparses the serialized
artifact, validates references and schema/operation consistency, and rejects
warnings selected by policy. Generation succeeds in a production-equivalent
configuration without requiring a live production secret or starting traffic.

The document is normalized only for specified non-semantic ordering or volatile
build metadata and compared semantically with the reviewed Supported baseline.
Baseline update and baseline verification are separate commands; a failing diff
cannot regenerate its own expected output. The diff classifies source and binary
client impact, links the affected operation/schema and requires a new major API
version or an explicit prospective compatibility decision for a breaking change.

Additive syntax is not automatically compatible. New closed-enum members,
new required response properties, changed nullability/defaults, narrower ranges,
format changes, discriminator changes, security requirements and status/media
changes receive client-semantic analysis. Every approved baseline change is a
reviewable source diff and becomes release evidence.

#### Full-pipeline host scenario corpus

`WebApplicationFactory` runs the real routing, binding, native validation,
middleware ordering, exception/status handling, authorization,
`System.Text.Json`, Problem Details and endpoint filters/processors. Tests replace
only an external dependency that the scenario does not intend to prove; they do
not mock ASP.NET Core routing, serialization, validation or authorization
metadata.

The shared behavior corpus covers every declared response and representative
boundary/malformed input, unknown/duplicate JSON members, invalid identifiers,
dates, enums and media types, authentication versus authorization denial,
resource absence and business conflict, safe unexpected failures, `Location`,
empty `204`, pagination traversal, idempotency replay/conflict, ETag
preconditions, cache/conditional requests, rate limits and `Retry-After`,
deprecation/sunset headers, request bounds and observable cancellation where
deterministic. It asserts the complete RFC 9457 shape, stable codes, safe detail,
content type and trace correlation for every error path.

The canonical Minimal API implementation and optional FastEndpoints Adapter run
the same black-box scenario contract. Adapter-specific unit tests may explain
registration mechanics but cannot replace public equivalence. A difference is
either an explicit unsupported combination or a failure; it does not create a
second HTTP policy.

#### Published-artifact black-box proof

The Release Candidate starts the actual immutable `process` archive and OCI
image in their Supported profiles without `WebApplicationFactory`, test-only DI
overrides or source execution. External probes verify startup/readiness, the
published OpenAPI identity, public HTTP behavior, forwarded-header/trust policy,
supported HTTP versions and streaming behavior, graceful shutdown and absence
of development-only endpoints. The exact artifact digest is recorded.

Every Supported C# or TypeScript client profile is regenerated deterministically
from the authoritative OpenAPI artifact, checked for drift, strict-compiled
under its pinned toolchain and run against a semantic fixture for Problem
Details, nullability, enums, dates/identifiers, pagination, binary transfers,
SSE and selected authentication behavior. Successful code generation without
compilation and runtime semantics is not sufficient evidence.

**Why:** metadata catches declaration omissions, OpenAPI provides the reviewed
public schema, the full host proves framework behavior and the published probe
detects deployment-only differences. Sharing the same behavior corpus across
endpoint adapters and generated clients makes the canonical contract executable
without forcing their internal implementations to match.

**Alternatives rejected:** snapshot-only testing approves semantically breaking
changes blindly; OpenAPI generation alone cannot prove runtime behavior;
`WebApplicationFactory` alone cannot prove the packaged process/container;
end-to-end-only tests localize failures poorly; and separate Minimal API,
FastEndpoints or UI client expectations allow public contracts to drift.

### Require real-provider integration evidence

The `provider-integration` family tests every Supported persistence or
infrastructure Capability Provider against the actual product and exact version
claimed by the Capability Matrix. Testcontainers is the preferred repeatable
adapter for providers with a faithful OCI distribution; an admitted external
environment supplies evidence when a real provider cannot run locally.

Provider container images are pinned by immutable digest with human-readable
version, registry, architecture, license/usage basis and vulnerability evidence.
Floating tags such as `latest`, an unrecorded local image or an implicit
Testcontainers default cannot support a release. The tested version range and
upgrade direction are explicit; passing one image does not claim compatibility
with every older or newer provider release.

Relational test state is created by the actual immutable `<name>.Migrator`
artifact and application migrations. `EnsureCreated`, EF Core InMemory, SQLite
or hand-created test schemas cannot stand in for PostgreSQL or SQL Server
evidence. Lightweight fakes remain acceptable for focused application unit
tests only where provider behavior is not the subject.

Each Capability defines a common conformance scenario corpus and provider-
specific additions. Relational evidence includes type mappings, nullability,
constraints, indexes and uniqueness, generated values, SQL translation,
Specifications, projection, pagination and deterministic ordering, UTC/date/
time, decimal and JSON behavior, transaction commit/rollback, execution-
strategy interaction, optimistic concurrency, cancellation, command timeout,
connection recovery and migration lifecycle. Selected reliability Capabilities
add idempotency, outbox/inbox, leases/fencing, duplicate delivery and multi-
instance claims. Backup/restore or upgrade behavior is included only when the
provider Support claim promises it.

The corpus is composed from immutable scenario data, expected behavior and a
small provider fixture Interface. It does not use inherited provider test bases
or conditionals scattered through generic tests. A semantic provider difference
is an explicit named profile with its own expectation; it is not hidden by
weakening the common contract to the lowest denominator.

Tests run parallel by default with uniquely owned database, schema, queue,
bucket, key prefix, actor and other resource identities. A typed concurrency
limiter reflects an actual provider/license/capacity constraint. Global
serialization is admitted only with evidence that isolation cannot remove the
shared resource, and ordered tests never substitute for independent setup.
Cleanup is bounded, observed and idempotent; a failed test retains enough
sanitized diagnostics for reproduction without leaking secrets.

Container startup and dependency recovery use the provider's real readiness
condition with bounded timeouts and diagnostics. Fixed sleeps are prohibited.
An unavailable container runtime, image registry or admission environment
produces `infrastructure-error`, never a conditional skip. Failures retain
container logs, health state, image identity and relevant network diagnostics.

An emulator or fake may provide faster pull-request feedback only when its known
semantic differences are documented. It cannot by itself produce a Supported
provider result. A cloud or external provider without a faithful container must
pass the same conformance contract in a short-lived admission environment using
least-privilege workload credentials, isolated resource naming, cost/time bounds
and verified cleanup before release.

Testcontainers, provider test SDKs and emulator packages are test-only
dependencies in `<name>.Tests` or Platform-owned conformance harnesses. They do
not leak into production assemblies. Aspire topology tests separately prove the
composed Local Development Profile; Aspire orchestration does not replace
direct provider semantics or make a provider Supported automatically.

**Why:** translation, transactions, concurrency, protocol and lifecycle
behavior are properties of the real provider, not of an in-memory substitute.
Pinned ephemeral infrastructure gives reproducibility while composition-based
scenarios expose genuine provider variation without inherited test machinery or
production dependency leakage.

**Alternatives rejected:** EF InMemory/SQLite substitutes cannot prove target
database behavior; `EnsureCreated` bypasses migration correctness; emulator-only
testing overstates cloud compatibility; shared mutable test resources create
order dependence; fixed sleeps confuse delay with readiness; and floating
images make past release evidence irreproducible.

### Verify the packed template through a running Generated Solution

The `template-generation` family begins with the actual candidate Template
System package. CI packs once, records its hash, installs that exact `.nupkg`
through the supported `dotnet new install` path in an isolated template hive and
generates into a clean workspace. Direct invocation of internal generator code
or generation from the source directory is useful for unit feedback but cannot
produce release evidence.

The Compatibility Coverage Plan generates every canonical Preset, every equal
Supported UI Capability Provider, each independently selectable Capability
Provider in its conformance host, every named high-risk interaction, the
deterministic covering array and the complete finite set of declared Invalid
Combination rules. Each coordinate records the exact command input, resolved
selection, SDK, operating system, architecture, package hash and Capability
Manifest.

Every valid coordinate must:

- produce the exact accepted project, directory, assembly and namespace names
  and no additional preparedness project;
- contain a valid resolved Capability Manifest, Configuration Contract and
  Deployment Manifest consistent with the input;
- contain every selected Capability registration, package, configuration,
  resource, documentation and test—and no unselected provider, UI, database,
  identity, broker, container, cloud or other residue;
- contain no unresolved template symbol, source identity, `Acme`,
  `MartinMikes`, fictional company, placeholder, manual search/replace marker,
  untracked production TODO/FIXME or literal `<name>` token;
- restore deterministically, build Release with the full analyzer policy and
  execute the applicable test profiles;
- create/update relational state only through the same-commit immutable
  Migrator when persistence is selected, then start the direct profile and
  pass readiness plus HTTP smoke behavior;
- generate and validate authoritative OpenAPI, then regenerate/strict-compile
  every selected client profile without unexplained drift; and
- for React or Vue, perform frozen pnpm resolution, strict type checking,
  linting, provider-native component tests and production build; apply the
  corresponding Blazor build/component profile when Blazor is selected.

The same normalized input is generated at least twice per operating system and
compared by a deterministic file manifest containing relative path, content
hash, file kind and relevant executable/permission bits. Windows and Linux
outputs must also agree after only the explicitly declared normalization for
line endings or platform launch metadata. `.gitattributes` and generator policy
own line endings; current clock, machine path, user, random ordering or template
cache state must not leak into output.

The corpus includes the canonical `MartiX.TemplateTestApp` fixture plus valid
edge cases for the complete namespace input, paths containing spaces, a deeper
workspace, existing target directory/file conflicts, read-only/conflict
behavior and platform path semantics. It does not introduce additional company
names. Invalid name, missing required selection, conflict, unsupported provider
or incompatible Capability input returns a stable diagnostic identity and
nonzero exit without leaving a partially usable solution or silently
normalizing user intent.

Presence and absence have equal weight. A machine-readable expected-output
inventory derives from the Capability Matrix and checks projects, package
graphs, services, endpoints, files, manifests, configuration keys, deployment
resources and documentation. A selected feature missing its ownership or an
unselected feature leaving a transitive dependency both fail.

The default API Preset must reach a successful health request within the
accepted five-minute reference budget, including isolated install, generation,
restore and Release build on the controlled runner. Other Presets record and
gate their accepted reference budgets after measurement; the API number is not
silently reused for UI or infrastructure-heavy profiles.

Release evidence retains the packed template and hash, install/uninstall log,
toolchain and runner image, exact inputs and resolved manifests, generated file
manifests, restore lock evidence, build/test/start commands, sanitized logs,
OpenAPI/client hashes, timing and all Gate Outcomes. It proves that the same
package later published is the package verified.

**Why:** the Template System is a distributed product whose consumer uses the
packed `dotnet new` surface, not its internal classes. Package-to-running-host
verification catches packaging, conditional output, dependency, OS, naming,
registration, migration and startup failures while deterministic presence and
absence inventories prevent optional Capabilities from polluting small apps.

**Alternatives rejected:** testing internal generation alone misses packaging;
compiling one sample misses invalid and optional composition; snapshot-only
output misses runtime behavior; presence-only checks allow hidden dependencies;
same-machine repetition misses cross-platform drift; and successful generation
with partial output turns invalid input into delayed failure.

### Validate packed libraries against real baselines and consumers

The `package-compatibility` family runs against the exact candidate `.nupkg`
artifacts produced once by the release build. Every packable Platform Library
enables the .NET SDK's first-party Package Validation and declares the latest
applicable Supported stable package as its baseline through
`PackageValidationBaselineVersion`. Compatible-framework and TFM validation use
strict mode where the accepted package contract requires identical surfaces.

The SDK validator is the primary binary/API/package applicability check. It
detects breaking changes against the baseline, incompatible assets across
compatible target frameworks and missing applicability. The policy and behavior
are documented by
[Microsoft's baseline package validator](https://learn.microsoft.com/en-us/dotnet/fundamentals/apicompat/package-validation/baseline-version-validator)
and
[NuGet package compatibility rules](https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/nuget-package-compatibility-rules).
An independently pinned `Microsoft.DotNet.ApiCompat.Tool` invocation may provide
reporting or out-of-build package comparison, but it does not establish a
different compatibility policy.

The candidate package content is expanded and compared with a versioned
per-package allowlist. Evidence covers assemblies and TFMs/RIDs, analyzer and
code-fix assets, build props/targets, XML documentation, package dependencies,
license/readme/icon/repository metadata and expected symbols/source artifacts.
Unexpected binaries, configuration, secrets, internal test assets, environment-
specific files, duplicate assemblies, missing documentation or undeclared
dependency assets fail. Package metadata and dependency ranges must match the
synchronized release contract.

Clean consumer fixtures install only the candidate packages from an isolated
local feed and prove three views:

1. representative Supported source consumers restore and compile against the
   new package for every declared TFM and relevant package combination;
2. binaries compiled against the prior Supported package run with the candidate
   replacement to detect runtime load, missing member/type and behavioral
   compatibility failures; and
3. exact public behavior/contract fixtures run against the candidate rather
   than relying only on surface comparison.

Fixtures cover the accepted synchronized package set, not just each package in
isolation. They detect unintended transitive public exposure, package-version
skew, conflicting build assets and a package reference that exists in the
project but is absent or different in the packed artifact. A graph gate rejects
new direct/transitive production dependencies without the accepted dependency
review and rejects unused references.

An intentional breaking public API change requires the accepted major-version
path, reviewed exact ApiCompat suppression, migration guide/recipe, source and
binary impact fixtures and corresponding Platform Migration evidence. Blanket
or wildcard suppressions are invalid. Suppression files are checked for stale
or unnecessary entries and advance with the baseline after the major release;
they cannot become a permanent archive of ignored differences.

Analyzer packages additionally preserve stable diagnostic IDs, categories,
default severities, configuration keys, source locations where semantically
possible and safe code-fix behavior. Analyzer compiler fixtures run using the
packed analyzer asset, while consumer builds prove it is discovered and cannot
be disabled by accidental packaging. A diagnostic removal or severity
weakening is a compatibility/policy change even when CLR API compatibility
passes.

A second controlled pack checks normalized content and expected byte/hash
reproducibility under the pinned environment, while all validation, signing and
publication continue to consume the original candidate bytes. Repacking after
validation is forbidden. The final signed NuGet package is checked with
[`dotnet nuget verify`](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-nuget-verify),
including its .NET 10 content-hash evidence, and remains linked to SBOM and
provenance.

**Why:** SDK Package Validation provides the closest first-party check to the
actual NuGet compatibility model, while clean source/binary/runtime consumers
catch packaging, resolution and semantic failures a surface diff cannot.
Inspecting the actual package and promoting the same bytes prevents a green
source build from certifying a different published artifact.

**Alternatives rejected:** source API snapshots alone miss package and runtime
behavior; compiling only against the new package misses binary substitution;
validating loose assemblies misses NuGet asset selection; wildcard suppressions
hide breaks; repacking after validation destroys artifact identity; and a custom
compatibility engine duplicates the .NET SDK without a demonstrated gap.

### Compose security evidence from controls, behavior and artifacts

The `security-supply-chain` family is a defense-in-depth profile; no single
scanner or clean vulnerability count proves it. A versioned **Security Control
Manifest** maps every applicable OWASP ASVS 5.0 Level 2 control, selected Level
3 control, Threat Model asset/trust-boundary mitigation and secure-development
requirement to an owner, executable gate, evidence artifact and documented
non-applicability rule. A material trust-boundary change without a corresponding
manifest/threat-model change fails policy validation.

Static and supply-chain gates include warnings and security analyzers as errors,
SAST for C# and the selected UI language/toolchain, local plus hosted secret
scanning over the change and relevant history, locked deterministic restore,
`NuGetAuditMode=all` for direct/transitive packages, frozen pnpm resolution,
dependency/malicious-package and license policy, dependency-review evidence for
updates, and checks for prohibited crypto/TLS, HTML/DOM sinks, unsafe
deserialization, credential handling and platform bypass APIs.

Behavioral security scenarios execute the contracts accepted by the security
baseline: positive/negative/missing-context and cross-resource authorization;
authentication expiry/failure and safe disclosure; proxy, forwarded-header,
host, CORS and antiforgery attacks; profile-specific CSP/browser controls;
request/response limits, overload/rate limiting and enumeration resistance;
SSRF through redirects, DNS rebinding, credential-bearing URLs, private,
loopback, link-local and metadata IPv4/IPv6 forms; Data Protection restart,
rotation, isolation and multi-instance behavior; durable audit atomicity; and
fail-closed production configuration.

Every applicable host/profile injects unique synthetic Secret/Credential,
Personal, Confidential and Internal canaries through representative success and
failure paths. The gate searches structured logs, console output, traces,
metrics, Problem Details, health, audit/export output, test/TRX/coverage reports,
Playwright screenshots/traces/DOM/network artifacts, OpenAPI, generated clients,
UI bundles/source maps, `.nupkg`, process archives, OCI layers, SBOM/provenance
and Release Evidence. Any value appearing outside its explicit safe sink fails;
redaction-looking output is not accepted for Secret/Credential values that must
never have been captured.

The exact candidate NuGet/template/UI/process/OCI artifacts receive filesystem,
package and container/OS vulnerability scanning, license verification, SBOM,
provenance and signature checks. Dynamic application security testing targets
the real published artifact with safe bounded configuration rather than a test-
only host. An independent penetration test is required before the first stable
Platform release, after material trust-boundary changes and periodically for
production-critical use as already accepted; its scope and remediation status
join release evidence without exposing sensitive exploit details publicly.

Findings have identity, source/tool database version, affected artifact,
severity, confidence, reachability/exploitability, owner, disposition and
deadline. Confirmed critical/high findings, any reachable/exploitable moderate,
committed or artifact secret, unreviewed authorization change, RCE, tenant/data-
integrity defect or failing security scenario block. An untriaged critical/high
finding also blocks; absence of analysis is not evidence of safety.

A Risk Exception applies only to a demonstrated non-reachable moderate or low
finding and records owner, rationale, evidence, compensating controls, expiry
and revalidation trigger. Scanner suppression is merely a narrow false-positive
or duplicate classification linked to evidence and cannot act as a Risk
Exception. Authentication, authorization, tenant isolation, data integrity,
RCE and secret exposure remain non-waivable under the accepted policy.

GitHub Actions, CodeQL, dependency review and hosted secret scanning are the
initial repository-host adapters where available. The Quality Gate Policy and
Security Control Manifest remain CI-provider-neutral; locally reproducible
commands and raw standard reports are retained. Every tool, rule set, advisory
database/snapshot and container definition is pinned and recorded. Replacing a
tool requires equal or stronger control/evidence coverage, not merely a green
new dashboard.

**Why:** security emerges from design controls, negative runtime behavior,
supply-chain integrity and artifact inspection. Traceability exposes missing
controls, canaries prove data safety across otherwise overlooked evidence files,
and a strict finding state model prevents scanner noise or CI-provider status
from weakening the release contract.

**Alternatives rejected:** scan-only security misses runtime authorization and
configuration; hosted-only gates cannot be reproduced or migrated; a zero-
finding vanity target encourages broad suppressions; audit by severity without
reachability mishandles risk; and DAST or penetration testing alone finds defects
too late and cannot prove package provenance.

### Prove reliability through deterministic state transitions

The `reliability-operations` family models every Critical Operation as explicit
durable states, transition preconditions, transaction/commit point, externally
visible effects, retry/idempotency contract, terminal outcomes and recovery
invariants. Its evidence asserts state and effects after failure; merely not
throwing an exception or eventually returning healthy is insufficient.

Each applicable operation defines a deterministic failure matrix at every
semantically distinct boundary, including before transaction/start, during
state mutation, immediately before and after commit, after commit before durable
publication becomes observable, during lease/claim, before and after a consumer
or external side effect, before acknowledgement, during process shutdown or
restart, and on cancellation, timeout, dependency outage and recovery. The
fault seam lives at the real boundary and records one stable failure-point ID;
tests do not scatter arbitrary debug exceptions through business code.

Reliable Event, Inbox and Idempotent Execution profiles prove after every
applicable failure point:

- no committed Outbox Message or required Security Audit Event is lost;
- at-least-once delivery may repeat and the duplicate is observable;
- exactly one intended durable business effect occurs where idempotency claims
  it, without claiming exactly-once transport;
- a stale or expired worker cannot commit through fencing;
- retries, waits, leases, buffers and queues remain bounded;
- poison/terminal work enters a durable operator-visible state; and
- restart/recovery uses authoritative durable input rather than process memory.

Provider integration tests assert the exact database/broker state, delivery
attempts, receipts, version/concurrency tokens and external test-adapter calls,
not only API output. Atomicity cases inject failure before commit, after commit
and before acknowledgement. The expected operation result, durable state,
readiness/degradation and Observability Contract signals are checked together
so diagnostics cannot contradict correctness.

Multi-instance evidence starts at least two real published host processes or
containers against the same provider resources. It exercises simultaneous
requests/dispatchers, leases and renewals, optimistic concurrency, idempotency
claims, process-local cache assumptions, shared Data Protection where selected,
rolling stop/start and one-instance loss. It does not simulate concurrency by
calling the same in-memory object twice.

Operational scenarios separately prove startup, dependency loss and recovery,
Degraded versus Unhealthy readiness, liveness independence, false-ready
prevention, bounded probes, backlog/capacity transitions and invalid-
configuration termination. Graceful shutdown stops new work, allows only the
declared bounded drain, propagates cancellation, flushes bounded telemetry and
leaves every interrupted durable operation recoverable by another instance or
the next start.

Virtual/fake time drives deterministic expiration, retry, lease and scheduling
logic at narrow seams. A bounded set of provider/host scenarios also uses real
time to verify timer integration, cancellation and timeout propagation. Fixed
sleeps and timing races are prohibited as assertions; tests wait on observable
conditions with explicit budgets.

TUnit parallel execution and `[Repeat]` provide contention/stress evidence with
recorded seed, iteration count, concurrency and environment. `[Repeat]` runs all
iterations and never means retry-to-green. Randomized or chaos scenarios run as
supplemental `main-nightly` evidence under recorded seeds and bounded blast
radius. Every defect they find becomes a minimized deterministic regression and,
where appropriate, a new permanent failure point or interaction profile.

Claims remain topology-specific. A single process, single Active24 VPS or
single-host Compose profile proves restart and host-replacement procedures only;
it cannot pass or advertise high availability, rolling continuity or host-
failure tolerance. Those claims require a separately admitted multi-host
Deployment Profile and its own traffic/data failure evidence.

**Why:** durable guarantees are properties of state transitions under failure
and concurrency, not of successful retries. Deterministic boundary injection
localizes defects and makes them reproducible, while real multi-process evidence
exposes process-local assumptions that unit concurrency cannot see. Explicit
topology limits keep recovery evidence honest.

**Alternatives rejected:** happy-path integration cannot prove atomicity;
random chaos alone is irreproducible; sleeps hide readiness races; in-memory
multi-instance simulation misses process/runtime boundaries; retry-to-green
conceals nondeterminism; and treating restart policies on one host as HA
misrepresents the failure domain.

### Apply one behavioral UI contract through provider-native tests

The `ui-conformance` family applies only when an Application UI Capability
Provider is selected. Blazor Web App, React and Vue prove the same provider-
neutral UI Capability Contract while retaining their idiomatic unit/component
toolchains and implementations; they do not share a lowest-common-denominator
component abstraction or source test framework.

React and Vue execute frozen pnpm resolution, strict TypeScript, provider lint,
semantic CSS/design-token policy, Vitest and the appropriate Testing Library.
Tests locate and exercise roles, accessible names, labels, visible text and
public state rather than implementation classes, hook internals or whole-tree
snapshots. Blazor executes the strict .NET/analyzer profile and bUnit component
tests under TUnit in the consolidated `<name>.Tests` project.

The same provider-neutral Playwright journey corpus runs against real published
UI and API artifacts for all providers. It covers anonymous and selected
Authentication Profiles, Application/Admin roles, denial and validation,
Problem Details, navigation/forms, loading/empty/error/offline or reconnect,
culture/theme, session expiry/logout, responsive behavior and applicable SEO,
real-time and failure contracts. Each test owns an isolated BrowserContext,
Actor and data. Fixed sleeps, order dependence, shared mutable accounts,
quarantine and retry-to-green are invalid; web-first observable conditions use
bounded timeouts.

Chromium runs on every relevant pull request. Chromium, Firefox, WebKit and
Microsoft Edge run at `main-nightly` and `release-candidate`; browser/runtime,
CSS, authentication, rendering or generated-client changes expand the pull-
request selection. Exact browser builds, OS image, locale, viewport and feature
profile enter evidence.

Accessibility gates combine automation with human-verifiable interaction
evidence. Automated accessibility analysis is a fast detector, not the WCAG
claim. Critical journeys additionally prove keyboard-only operation, logical
focus order/visibility/restoration, accessible names/relationships/status,
zoom/text reflow, high contrast, reduced motion and the declared screen-reader/
assistive-technology profile. Supported output has no known WCAG 2.2 AA defect;
an automated clean scan cannot overrule a behavioral failure.

Fluent 2 providers retain semantic HTML and component-root-scoped semantic CSS.
Policy rejects Tailwind/utility-class authoring, raw palette/spacing/typography/
motion/z-index values outside tokens where mechanically reliable, invalid
interactive markup and selectors that leak global styling. Targeted visual
comparisons cover only stable critical layouts, breakpoints, themes and high-
value components under pinned fonts/rendering; they supplement semantics and
behavior rather than approve broad screenshot churn.

Localization evidence includes pseudolocalization, expansion/clipping, culture-
specific formatting, fallback and missing-resource behavior plus at least one
RTL layout profile. Selectors remain locale-independent except when the
localized accessible name/text is the behavior asserted. Business,
authorization and machine-error behavior never branches on presentation
culture.

Only the selected `hybrid-web` profile makes a Supported SEO rendering claim.
It proves server/prerendered HTML without JavaScript, title/canonical metadata,
robots and sitemap inclusion/exclusion, structured data when selected, public
`200`, genuine `404`, redirect status, cache variation/invalidation, hydration
without duplicate mutation and exclusion/leak prevention for authenticated
content. Application-only UI profiles report SEO as `not-applicable` through
policy rather than passing an empty test.

Security/UI gates fail on unexpected CSP reports, console/page errors, unhandled
promise rejection, Blazor circuit-fatal errors, unsafe HTML sinks, raw token or
credential persistence, authenticated cache leakage, secret runtime config or
client/server authorization disagreement. Generated client drift, strict build
and semantic runtime corpus are mandatory for the selected provider.

UI performance uses stored relative provider/profile baselines for meaningful
bundle/download/build/render/hydration or Blazor circuit/server resource
measurements. Universal bundle or circuit numbers are not invented before a
controlled baseline. Targeted regression budgets compose with the accepted
performance family and application-owned SLOs.

Failures retain sanitized Playwright trace, screenshot, DOM snapshot,
console/page errors and relevant network diagnostics. All retained artifacts
pass the security canary-leakage gate before upload; diagnostic usefulness never
permits storing credentials or private payloads.

**Why:** provider-native component tests preserve fast TDD and idiomatic depth,
while one real-browser behavior corpus proves equivalent user-facing contracts.
Combining semantic, accessibility, security, localization, SEO and measured
performance evidence avoids overclaiming from DOM emulators, scanners or visual
snapshots alone.

**Alternatives rejected:** end-to-end-only UI testing is slow and opaque;
component-only testing misses browser/deployment behavior; one shared component
framework erases provider strengths; Chromium-only release evidence misses
declared browser support; automated accessibility-only gates cannot prove WCAG;
and broad screenshots encourage unreviewed baseline regeneration.

### Compare performance only on versioned reference profiles

The `performance` family compares one immutable candidate with the latest
Supported baseline on the same versioned **Performance Runner Profile**. The
profile records runner image, physical/virtual hardware identity, CPU
architecture and allocated cores, memory, operating system/kernel, .NET SDK and
runtime, power/governor policy, container mode, relevant dependency topology,
network placement, test tool versions and noise qualification. Results from
different profiles are not combined into a release decision.

Pull requests run short smoke measurements to catch catastrophic allocation,
startup, artifact-size or throughput changes. Stable isolated measurements run
at `main-nightly` and `release-candidate`. The release result uses the exact
candidate artifact and production-equivalent security, validation, telemetry
and middleware configuration; disabling real behavior to improve a number
invalidates the evidence.

BenchmarkDotNet owns declared Platform Library/Capability hot paths. Candidate
and baseline run in an interleaved or otherwise noise-controlled comparison with
warmup, sufficient iterations and retained raw results. A repeatable regression
of at least 5% in execution time/throughput or allocations blocks, as does any
new allocation on a deliberately zero-allocation path. Evidence includes
statistics, distribution/outliers, GC, allocation, environment and disassembly/
profiling links where needed; one mean number is not sufficient.

Controlled generated-host scenarios use a versioned request/data corpus,
dependency state, concurrency or arrival model, duration and warmup. They retain
p50/p95/p99 latency, throughput, unexpected failures, CPU, working set, GC,
thread pool, connection pressure and bounded queue/backlog behavior. A
repeatable regression greater than 5% for p50/p95 or throughput, greater than
10% for p99, any unexpected request failure, starvation, sustained resource
leak or unbounded queue blocks under the thresholds already accepted.

Cold-start/publish scenarios measure process start to declared readiness,
working set and immutable artifact size and block regressions above 10% unless
an explicitly selected Capability has an approved profile/baseline consequence.
Each trimming/Native AOT Supported coordinate publishes without relevant
warnings, starts the real artifact, passes black-box HTTP/operational behavior
and proves semantic parity with its JIT reference. Successful compilation alone
is not performance or AOT evidence.

The policy records expected measurement variance and minimum confidence. When a
threshold is crossed, a clean equivalent runner may repeat the experiment for
diagnosis. All attempts remain evidence; incompatible or inconsistent results
produce `unstable` rather than selecting the favorable run. Environment drift,
thermal/noisy-neighbor violation or incomplete telemetry produces
`infrastructure-error`, not an adjusted product result.

Baseline generation and comparison are separate commands and permissions. A
failing candidate cannot update its own expected baseline. An intentional
regression requires profiling, alternative analysis, user-visible/operational
consequences and a prospective architecture/quality-policy decision; it never
rewrites historical evidence or makes the already failing candidate green by
maintainer override.

Platform thresholds govern controlled relative regressions. A Generated
Solution declares its own absolute Application SLOs for its workload,
infrastructure and users. Platform hooks may execute those application-owned
load profiles, but no generic Platform number is advertised as universal
latency, throughput, availability or scaling capacity.

**Why:** performance numbers are meaningful only relative to controlled
workload and environment. Storing the runner, raw distributions and exact
artifact makes regression decisions reproducible, while separating Platform
regressions from application SLOs avoids false universal promises.

**Alternatives rejected:** shared noisy runners without qualification create
arbitrary pass/fail; one-shot means hide distributions; automatic baseline
updates approve regressions; compiling AOT without executing it proves nothing;
and absolute generic web latency targets ignore workload and topology.

### Verify database and Platform Migrations against historical fixtures

The `migration` family has separate Database Migration and Platform Migration
profiles. They share immutable historical inputs, exact candidate tooling,
reviewable changes, target-profile validation and tested recovery, but they do
not conflate schema/data evolution with application-owned source evolution.

#### Database Migration Profile

Every database source version within the Supported upgrade window has a
versioned real-provider fixture for each applicable PostgreSQL/SQL Server
profile. Fixtures contain realistic relationships plus null, boundary, legacy,
concurrency and provider-specific values, representative data volume and the
exact prior schema/migration history; an empty database is only one scenario.

The actual immutable `<name>.Migrator` candidate upgrades the fixture using its
deployment command and DDL identity. Evidence compares resulting schema,
constraints, indexes, provider types, migration history and every declared data
preservation/transformation and business invariant. The API identity is proved
unable to perform schema modification. Generated reviewed SQL scripts/bundles
are tied by source/model/migration and artifact hashes to the same candidate.

The profile executes a second invocation and expects the declared safe no-op or
stable `already-applied` result, races two Migrator instances to prove exclusive
coordination, and injects failure before, during and after each destructive or
multi-stage transition. Expand/contract profiles run old and new published
application versions across the declared overlap and cutover sequence; schema
compilation alone cannot claim rolling compatibility.

Destructive operations require explicit classification, owner, affected data,
usage evidence, approved data-loss/retention decision, verified backup and
isolated restore plus a timed recovery runbook. EF Core `Down()` is not assumed
to be a production-safe rollback. The accepted roll-forward, compensating
migration or backup-restore strategy is the strategy executed by the gate.

#### Platform Migration Profile

Every source Platform/template version in the Supported migration window owns
complete repository fixtures for the relevant Preset, Capability Provider and
high-risk combination profiles. A fixture includes the original Capability
Manifest and release identity, exact dependency state and both clean template
output and representative application-owned Business Module, vertical-slice,
configuration, documentation and decision changes at supported extension seams.
Separate fixtures deliberately create ambiguous/conflicting edits.

The candidate Platform Migration operates on a copy of the historical
Generated Solution. It never re-runs the template over application source. It
must produce the reviewed package/source/manifest/configuration/documentation
changes, preserve application-owned behavior and history, update migration and
Capability identity, and stop before partial mutation with a stable diagnostic
when safe intent cannot be inferred.

A versioned expected-diff manifest lists every owned add, edit, move and removal
plus permitted content transformations. Any unexplained file, deletion, token,
format churn or change outside migration ownership fails. After migration the
repository passes the complete target Composed Quality Profile, including real
provider schema migration when the Platform change requires it.

Reapplying the Platform Migration yields a safe no-op or stable
`already-applied`; it cannot repeat edits. Recovery is exercised through the
declared Git revert/backup branch and compatible database strategy. A rollback
claim exists only when that combined path passes; otherwise documentation
truthfully specifies roll-forward and cutover constraints.

Historical fixtures are immutable inputs linked to their original Supported
Release evidence. Adding support for another source version adds fixtures before
the claim; retiring a source version follows the support policy rather than
deleting evidence. Every escaped migration defect adds the minimized historical
fixture, conflict/data case and permanent regression profile.

**Why:** schema migration and Platform source migration can both destroy user-
owned state, yet fail in different media and ownership boundaries. Realistic
historical repositories/databases and exact expected transformations prove that
the supported path preserves those assets; repeat/recovery tests prevent a
one-way happy-path script from being called a migration strategy.

**Alternatives rejected:** empty-database migration misses legacy data; compile-
only checks miss provider/runtime effects; `Down()` alone is not recovery;
template reapplication overwrites application ownership; clean fixtures miss
real conflicts; and manually inspected diffs without executable ownership
manifests cannot scale across supported source versions.

### Keep repository verification strict, deterministic and non-mutating

The `repository-integrity` family is the first executable boundary for every
repository and Generated Solution. It verifies at least:

- a clean, reproducible locked restore using the declared SDK, workloads,
  package sources, central package versions and committed lock state;
- a Release build with warnings treated as errors, the approved compiler and
  analyzer configuration, and no implicit environment-dependent behavior;
- formatting, source analyzers, Markdown linting and resolvable internal links;
- synchronization of generated sources, manifests, baselines and documentation
  with their authoritative inputs;
- absence of prohibited placeholders, unresolved release-blocking `TODO`
  markers, forbidden names and undeclared generated files;
- consistent SDK, tool, workload and package identities across solution,
  JavaScript workspace, container and CI declarations;
- required license metadata, file policy and the allowlisted contents of every
  packed NuGet, npm and distributable archive;
- deterministic normalized outputs wherever the toolchain supports that claim;
- no secrets, credentials, canary values or sensitive environment-derived data
  in tracked files or produced artifacts; and
- an unchanged clean Git working tree after verification.

Every check has a stable Gate ID and an actionable diagnostic containing the
affected path, violated policy and canonical repair command. The policy may
declare narrowly scoped generated or external-content exclusions, but each is
owned, documented and reviewable; a broad directory or warning suppression is
not a substitute for classification.

Verification commands are read-only with respect to repository content. Format,
regeneration, lock refresh and other repair commands are separate explicit
operations. A gate fails when a repair would change content; it never silently
repairs the candidate and then reports success. Temporary build and test output
uses declared ignored locations and is cleaned or normalized before the final
working-tree assertion.

The `fast` cadence may select a documented subset and reuse valid local caches,
but selected gates retain the same semantics. Pull-request and release profiles
perform clean-environment restore and drift checks. An auto-fixed difference,
warning, newly generated uncommitted file or dirty working tree is a failure,
not a warning or successful result.

**Why:** a candidate cannot be trusted when its committed sources do not
describe the bytes that were verified. Separating diagnosis from mutation makes
local and CI results repeatable, prevents hidden generator drift, and ensures a
reviewer sees every source, dependency and policy change that affects the
candidate.

**Alternatives rejected:** allowing verification to auto-format or regenerate
can validate bytes that were never reviewed; aggregate warning counts hide new
violations; unlocked restore permits dependency drift; checking only compiled
code omits documentation, packaging and generated contracts; and accepting a
dirty tree makes reproducibility unverifiable.

### Produce immutable, content-addressed Release Evidence

Every gate execution emits a machine-readable `Gate Run Manifest` containing
the stable Gate ID and policy version, source and input identities, selected
profile, execution environment, timestamps, outcome, every attempt and the
digests and media types of its evidence. A retry remains visible and cannot
replace the earlier outcome. Required evidence that is missing, modified,
expired or cannot be verified makes the gate fail closed.

The `release-evidence` family aggregates those records into a versioned
`Release Evidence Manifest`. It proves at least:

- the source revision, clean repository state and applicable decision/policy
  versions;
- exact SDK, workload, tool, runner image and dependency identities;
- the complete Compatibility Coverage Plan and the combinations actually run;
- all required outcomes, attempts and evidence, plus the policy reason for each
  `not-applicable` result and a transparent list of `not-selected` gates;
- authoritative OpenAPI/client compatibility and package compatibility results;
- Database Migration and Platform Migration evidence for the Supported windows;
- security findings, time-bounded exceptions and required penetration-test or
  human approval identities;
- performance baselines, runner profiles, measurements and dispositions;
- SBOM, build provenance, signatures and content digests for every releasable
  NuGet package, OCI image, UI asset, Migrator and supporting archive; and
- documentation coherence and the retention policy applying to the release.

Release candidates are built once. Verification, signing and publication
consume the same immutable bytes identified by digest; no stage rebuilds an
equivalent-looking artifact from source. A change to any releasable byte creates
a new candidate and invalidates evidence for the previous candidate.

The manifest and compact critical evidence form a self-describing archive that
can be integrity-checked without a live CI service. Large logs, traces, videos,
screenshots and load-test data may reside in immutable external storage, but
the manifest records their digest, size, media type, stable location, retention
deadline and owning gate. A mutable CI URL or successful job badge is not
release evidence by itself.

Evidence is retained for at least the complete support lifetime of the release.
Before archival, artifacts and reports are sanitized and the resulting bundle
passes the canary leakage gate. Redaction is explicit and cannot remove data
needed to reproduce or interpret the result.

Ticket 114 defines the concrete release, signing, trust and compatibility
policy. This ticket requires the evidence schema and gates to preserve all
inputs needed by that policy without binding the Platform to a single CI or
artifact-hosting provider.

**Why:** a green pipeline is transient state, while a supported release needs
durable proof of which exact bytes were built, tested, approved and published.
Content-addressed evidence exposes omissions and retries, prevents rebuild drift
and keeps later audit, support and incident analysis independent of the original
CI service.

**Alternatives rejected:** CI job status cannot prove artifact identity;
mutable links can expire or change; rebuilding per stage tests different bytes;
storing only summaries prevents diagnosis; retaining unclassified raw output can
leak secrets; and hiding `not-selected`, retries or exceptions makes a complete
release claim unverifiable.
