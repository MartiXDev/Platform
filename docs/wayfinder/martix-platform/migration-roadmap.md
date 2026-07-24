# MartiX Platform prioritized implementation roadmap

Status: approved implementation handoff for
[Produce the prioritized migration roadmap](tickets/116-migration-roadmap.md).

This roadmap constructs the approved Platform in the greenfield
`MartiXDev/Platform` repository. MartiX.WebApi and MartiXDev/dotnet-templates
remain unchanged legacy references; this is not an in-place migration or a
compatibility-preservation exercise.

## Accepted sequencing decisions

### Integrate through a permanently green main branch

Use trunk-based development without long-lived milestone or feature branches.
Every pull request is independently reviewable and passes every Quality Gate
that the current maturity level makes applicable. A tracer bullet may require
several pull requests, but incomplete behavior remains internal: it is absent
from the Supported Capability Manifest and public interface until its complete
acceptance contract passes.

Create one prerelease only when a complete tracer bullet passes. Do not publish
every merged pull request. The initial Lean API preview remains an access-
controlled candidate or validation-feed artifact. Deliberately approved public
NuGet previews begin only after Modular Monolith Development Baseline is
complete. This does not create GitHub Packages as a second public release
authority.

Build each candidate once from one identified clean commit. Verification,
signing, and eventual promotion consume the same digest-addressed bytes and
retain immutable evidence. Any byte change creates a new candidate. Ordinary
pull-request success is not release evidence.

The previously approved repository bootstrap is a provenance gate, not a
release milestone or horizontal implementation phase. Its explicit bootstrap
commit imports the complete durable Wayfinder and Canonical Knowledge snapshot,
records the exact source revision, and establishes the public repository's
identity, licenses, security, and governance controls. The first implementation
pull request then begins Lean API Release Loop.

### Prove the release loop before the default Preset

The first end-to-end tracer bullet is **Lean API Release Loop**, published only
as an internal `0.1.0-preview`. It establishes no stability promise. It proves
the smallest complete production line: build and pack the Kernel, ASP.NET Core
adapter, and Analyzers; consume the packed artifacts from an isolated local
feed; generate a real Lean API solution; compile, test, run, emit OpenAPI, and
publish the declared Native AOT artifact; and retain manifest, Quality Gate,
and reproducible release evidence.

Repository, governance, build, Template System, and release mechanics are
introduced only as required by that vertical slice. They are not delivered as
a long horizontal foundation phase with no exercising consumer.

The immediately following tracer bullet is **Modular Monolith Development
Baseline**. It proves the default Preset with a Business Module, module-owned EF
Core persistence, the one-shot Migrator, constrained Specifications, and
durable Outbox/Inbox behavior against a real database. This becomes the first
development-usable alpha of the default architecture.

This order detects packaging, generation, AOT, and release-loop failures at the
smallest scope while preserving Modular Monolith as the primary and default
product architecture. The Lean API preview must not claim to verify modularity,
persistence, reliable messaging, or enterprise workload readiness.

### Give every maturity label an executable meaning

Maturity is a machine-enforced contract rather than a marketing label:

1. **Internal Preview** artifacts exist only in the access-controlled candidate
   store or validation feed. They prove the Release Loop but establish no
   public support or compatibility promise.
2. **Public Alpha** begins only when Modular Monolith Development Baseline
   passes. Deliberately approved packages may be published to NuGet.org as
   Experimental. The Capability set may remain incomplete and documented
   breaking changes are permitted with an explicit migration path.
3. **Beta** freezes the intended `1.0` Capability scope. All three Presets,
   admitted initial providers, equal UI choices, security, observability, and
   deployment profiles pass their applicable conformance. No feature enters the
   `1.0` scope after this gate.
4. **Release Candidate** passes the complete `1.0` Quality Gate Profile,
   cumulative compatibility and Platform Migration evidence, supply-chain
   trust chain, documentation coherence, and agent readiness. Only fixes for
   identified release blockers may change a candidate; a fix produces a new RC
   and reruns affected gates.
5. **Stable `1.0.0`** promotes the exact accepted RC bytes without rebuilding.
   Marketplace publication and predecessor repository archival or final legacy
   labelling occur only after that verified promotion and cutover checks.

Every candidate records its applicable maturity contract and must fail closed
when required evidence is missing. Pre-stable freedom does not permit silent
breaking changes, undocumented decisions, or lower code-quality standards; it
only narrows compatibility and support promises.

### Execute a dependency graph with one obvious critical path

The roadmap is a prioritized dependency graph, not a mandatory serial queue:

```text
Repository Bootstrap
  -> Lean API Release Loop
  -> Modular Monolith Development Baseline
  -> Production Contract Baseline
  -> Beta Integration
  -> Release Candidate
  -> Stable 1.0.0
```

After the owning contracts and conformance harnesses stabilize, provider, UI,
deployment, compatibility/migration, and agent-guidance lanes may proceed in
parallel. Each lane declares an entry gate, produces independently reviewable
evidence, and rejoins at an explicit integration gate. Parallel execution is an
optimization, never a requirement: priority order within this document remains
a safe linear route for one human or inexpensive implementation agent.

The initial dependency rules are:

- infrastructure providers wait for stable Capability Interfaces and their
  provider-conformance harness;
- UI providers wait for authoritative OpenAPI, generated-client, HTTP, and
  identity contracts;
- deployment profiles wait for the Capability/Deployment Manifest and stable
  process and OCI artifact contracts;
- the Platform Migration lane waits for at least one immutable public-alpha
  historical baseline; and
- final Agent Guidance and agent-readiness evidence wait for stable Canonical
  Knowledge routing, manifests, Tool commands, and Quality Gate Interfaces.

No parallel lane may publish a Supported claim independently. Synchronized
candidate integration and the maturity gates remain the release authority.

## Tracer bullets

### Lean API Release Loop

**Maturity output:** internal `0.1.0-preview`; no public support or compatibility
promise.

**Scope:**

- implement the immutable `Result`, `Result<T>`, `Error`, and `ErrorKind`
  Kernel model with enforced invariants and an API compatibility baseline;
- implement safe ASP.NET Core RFC 9457 Problem Details translation, concrete
  typed failure results, and the OpenAPI metadata required by that contract;
- ship no empty analyzer package: the first documented and tested `MXP`
  diagnostics validate literal error codes and reject unauthorized use of the
  reserved `platform.*` prefix where compile-time analysis can prove it;
- introduce the minimum versioned Capability Manifest and JSON Schema;
- generate `martix-app --preset api` without persistence, fake Business
  Modules, `WeatherForecast`, or other sample product behavior;
- keep generated configuration, middleware ordering, options validation,
  endpoint registration, and health mapping visible in application-owned
  source; and
- introduce only the repository verification, packaging, documentation, and
  candidate-evidence machinery required to prove this complete slice.

The compatibility harness generates a temporary explicitly named MartiX
verification application, applies a test-owned conformance slice at a supported
extension seam, and exercises success and every error category. Test-only
behavior is never distributed as template product code.

**Acceptance path:** pack the synchronized Kernel, ASP.NET Core, Analyzers, and
Template artifacts; install and restore exclusively from an isolated local
feed; generate; build with warnings as errors; run TUnit and package-content
tests; start the JIT host; produce authoritative OpenAPI; publish the declared
Native AOT OS/RID artifacts; start and probe those artifacts; verify public API,
trim/AOT diagnostics, reproducibility, manifest/schema coherence, and a clean
working tree; then retain digest-bound candidate evidence.

Persistence, identity, UI, optional providers, Aspire, containers, and a claim
of complete production security/observability readiness remain outside this
tracer bullet. Their absence must be explicit in its manifest and evidence.

### Modular Monolith Development Baseline

**Maturity output:** first deliberately published Experimental Public Alpha and
first development-usable release of the default Preset. It is not yet declared
production-ready.

**Scope:**

- require an explicit application name and at least one explicit genuine
  Business Module name; never generate `Sample`, `Demo`, or a placeholder
  company/product/module;
- generate only the API, one one-shot Migrator, one assembly per named Business
  Module, and one consolidated TUnit project;
- establish each module's explicit composition root, deliberate Contracts seam,
  and internal Domain, vertical slices, persistence, and Integrations without
  separate mandatory layer projects;
- add `MartiX.Platform.EntityFrameworkCore` with its four admitted deep areas:
  immutable direct-EF Specifications, Entity Timestamps, Database Naming, and
  Reliable Events;
- use direct EF Core in Application Operations, composition-first `IHas*`
  Entity Capabilities, module-owned contexts/schemas/mappings/migrations, and no
  repository, `IUnitOfWork`, mediator, universal base entity, reflection
  discovery, or cross-module database relationship;
- support PostgreSQL as the default relational provider and SQL Server as an
  equally verified explicit choice through separate Generated Solutions;
- make the Migrator the only production migration host and expose exactly
  `validate`, `script`, and `apply`; the API never migrates on startup; and
- prove durable in-process At-Least-Once Integration Event delivery through
  atomic Outbox creation, per-Subscription fenced delivery, transactional Inbox
  deduplication, bounded retry, terminal failure, recovery, retention, and
  observability contracts.

The compatibility harness supplies explicit application/module names and adds a
test-owned business slice to temporary output. The distributed template owns
structure and extension seams, not invented product behavior.

**Acceptance path:** generate and execute PostgreSQL and SQL Server variants;
prove unit and compile-time architecture rules, host behavior, Specification
translation, timestamp and concurrency behavior, deterministic naming,
fresh/historical/idempotent migration operations, transaction rollback, and
provider-specific queue leasing. The mandatory crash scenario commits a
consumer effect, loses acknowledgement, redelivers after lease expiry, and
proves one durable effect through the Inbox Receipt. No EF Core InMemory result
may substitute for provider evidence.

This alpha remains Experimental because full HTTP lifecycle, production host
security/observability, identity-provider, UI, deployment, compatibility-
migration, and release-trust profiles follow in later tracer bullets.

### HTTP Contract and Generated Client

**Entry gate:** Modular Monolith Development Baseline.

Complete the shared transport Interface across the Lean API and Modular
Monolith Presets: explicit URL major versions; typed success/failure results;
RFC 9457 errors; build-time authoritative OpenAPI 3.1; deterministic generated
clients; idempotency, ETag/concurrency, pagination, cache and lifecycle
semantics; and executable compatibility checks. Minimal APIs remain canonical.

This tracer bullet deepens the partial Result/Problem Details path already
proved by Lean API Release Loop rather than introducing a second web
abstraction. It unlocks UI, mobile-client, and FastEndpoints Adapter work.

### Secure and Observable Host

**Entry gate:** HTTP Contract and Generated Client.

Complete the mandatory fail-fast host profile across every Preset: endpoint
classification, authorization seams, security audit, rate/overload policy,
forwarded headers and transport, CORS, antiforgery where applicable, Data
Protection rules, safe secret/configuration handling, privacy-classified native
telemetry, health, outbound resilience, Threat Model, and negative/failure
evidence. Application-owned composition remains explicit.

Security is ratcheted from repository bootstrap onward; no earlier milestone
may knowingly introduce an insecure default. This tracer bullet is the point at
which the complete production host baseline becomes a verifiable claim, not the
point at which security work first begins.

### Identity Profile Conformance

**Entry gate:** Secure and Observable Host.

Implement provider and flow as separate explicit choices: `none`, local ASP.NET
Core Identity interactive cookie, generic OIDC interactive BFF/cookie, and
Microsoft Entra interactive, delegated API, and application API profiles.
Complete the composed Actor model, optional Actor Registry, generated
application permission seam, fail-closed authorization, provider-specific
configuration, migrations where required, and protocol/browser/negative tests.
No provider adds a Generated Solution project.

Identity Profile Conformance unlocks authenticated UI provider verification. It
does not make advanced account, linking, passkey, multi-tenant Entra, or
Conditional Access features implicitly Supported.

### FastEndpoints Adapter Conformance

**Parallel lane entry gate:** HTTP Contract and Generated Client.

Implement `MartiX.Platform.AspNetCore.FastEndpoints` only as a real optional
Adapter over the identical HTTP behavioral contract. It must prove Result,
Problem Details, validation, OpenAPI, endpoint lifecycle, security, and
performance parity without changing the Kernel or canonical Minimal API model.
It may proceed in parallel and does not block later Minimal API work, but must
rejoin before Beta scope freeze for its Supported claim.

### Shared UI Behavioral Contract

**Linear-priority entry gate:** Identity Profile Conformance. Provider work may
proceed in parallel, but Full Stack is a principal Preset and therefore precedes
optional infrastructure on the safe single-agent route.

Establish one provider-neutral behavioral contract for generated OpenAPI client
use, Result/Problem Details handling, identity/session flows, authorization-
aware presentation, accessible loading/empty/error states, Fluent 2 design
tokens, semantic HTML, component-root clean CSS, responsive behavior, rendering
and SEO profiles, localization seams, supply-chain controls, and UI conformance
evidence. It adds no mandatory UI to non-Full-Stack Presets and admits no
Tailwind utility styling.

### Blazor and React Paired Conformance

Implement Blazor Web App and React in separate reviewable changes over the same
behavioral contract, but expose the first public UI alpha only when both pass.
Neither provider becomes the hidden primary choice. React uses Fluent UI React
and strict pnpm; Blazor uses its corresponding Microsoft Fluent approach and
the explicitly selected render profile. Both prove identity/session, generated
client, accessibility, semantic CSS, hybrid/public SEO where selected, browser,
build, and deployment-artifact behavior.

### Vue Conformance

Complete Vue as a separate subsequent tracer bullet with the same Supported
quality contract and before Beta scope freeze. Its lower expected selection
frequency affects implementation priority, not declared correctness,
accessibility, security, lifecycle, or compatibility quality.

All UI fixtures remain repository conformance assets rather than maintained
fake products. A Generated Solution selects at most one UI provider project.

### Provider Admission and Absence Harness

**Parallel entry gate:** stable Capability Manifest and the owning Capability
Interface. **Safe linear priority:** after Vue Conformance.

Before admitting a concrete provider, generate provider-independent conformance
fixtures and prove both selection and absence. An unselected Capability leaves
no package, configuration, registration, worker, health check, telemetry,
container, or deployment resource. A selected provider must pass its complete
Composed Quality Profile for exact release inputs; appearing in the catalog is
not a Supported claim.

Implement one reviewable provider tracer at a time in risk-first order:

1. **RabbitMQ Transport** proves the only initially admitted provider package
   and the second real reliable-events Adapter without weakening Outbox/Inbox.
2. **Quartz Durable Jobs** proves persistent scheduling, Migrator ownership,
   clustering/recovery, stable operation invocation, and operator controls.
3. **Valkey Distributed Cache** proves direct `IDistributedCache`/`HybridCache`
   use, expiry, serialization, reconnect, outage, and multi-instance behavior
   without a MartiX cache facade.
4. **Azure Blob Object Storage** proves streaming/conditional semantics against
   Azurite and required live-Azure parity before support.
5. **MailKit SMTP Delivery** proves durable intent adaptation, TLS/
   authentication, cancellation, and transient/permanent outcomes with Mailpit.
6. **Azure Key Vault Configuration** proves optional standard configuration
   composition, managed identity, rotation/restart, outage, and redaction.
7. **Microsoft Feature Management** proves direct framework Interface use and
   that flags cannot substitute for authorization or durable state.
8. **OTLP Export** proves optional direct host composition, Collector behavior,
   privacy/redaction, bounded failure, and no effect on business results or
   readiness when export fails.

Only RabbitMQ begins with a MartiX provider package. Quartz, Valkey, Blob, SMTP,
Key Vault, Feature Management, and OTLP remain explicit generated composition
over established framework seams unless implementation evidence passes the
package-admission test. Exact dependency/service versions are centrally pinned
release inputs, not timeless architecture.

### Portable Deployment and Local Orchestration

**Parallel entry gate:** stable Capability and Deployment Manifest plus stable
process and OCI artifact contracts. **Safe linear priority:** after provider
conformance.

Implement deployment as three reviewable slices:

1. **Artifact and Deployment Manifest** produces equally governed immutable
   `process` archives and OCI images from one validated topology model, with
   exact identity, external configuration schema, readiness/liveness, graceful
   shutdown, Migrator ordering, promotion, rollback, and drift evidence.
2. **Local Orchestration and Bounded Compose** keeps ordinary `dotnet run`
   universal, adds the optional file-based Aspire AppHost, and projects
   headless/single-host Compose from the same model without production `build:`,
   embedded secrets, or false high-availability claims.
3. **Portable Host Conformance** proves admitted Windows/Linux process and OCI
   variants plus a generic Ubuntu 26.04 nginx/systemd or container profile in a
   controlled environment. Target-owned overlays may add mechanics but never
   weaken manifest semantics or enter Business Modules.

The named Active24 Ubuntu VPS projection does not block `1.0.0`. It remains
**Planned / Not Attested** until a real VPS, exact contract, Ubuntu 26.04.1 or
newer image, and full provisioning, hardening, deployment, rollback, restart,
backup/restore, and host-loss rebuild evidence exist. It may be promoted in a
compatible `1.x` release without changing application contracts. Ubuntu 24.04
is the verified timing fallback for a deployment that must precede that gate;
an untested Ubuntu 26.04 or shared-hosting backend never receives a Supported
claim.

### Platform Tool and Migration Rehearsal

**Entry gate:** at least one immutable deliberately published Public Alpha
Generated Solution fixture. **Exit gate:** before Beta scope freeze.

Capture exact packages, manifests, contracts, clean template output, realistic
application-owned changes, and deliberate conflicts from each public alpha as
immutable rehearsal inputs. Prereleases remain unsupported and never become
stable Compatibility Baselines.

Introduce the synchronized exact-version `MartiX.Platform.Tool` with only:

- `migrate inspect` for non-mutating source/package/manifest inspection;
- `migrate plan --to <exact-version>` for deterministic recipe resolution,
  isolated simulation, target-gate execution, reviewable diff, and plan digest;
- `migrate apply --plan <file>` for explicit application of that unchanged
  accepted plan to the still-matching clean source; and
- `migrate verify` for target repository/manifest/quality coherence.

Before Beta, migrate the oldest retained Public Alpha fixture to the Beta/RC
contract, including representative owner changes and an ambiguity that must
stop safely. Planning and verification run in a tool-owned isolated Git
worktree; failure leaves the source repository untouched. Recipes use typed
compiled transformations rather than arbitrary shell, regex, dynamic plugins,
template reapplication, or free-form LLM output.

This alpha-to-Beta path is Migration Rehearsal Evidence, not retroactive alpha
support. Stable `1.0.0` creates the first Major Floor Compatibility Baseline;
later `1.x` releases prove cumulative same-major compatibility. The first
Supported cross-major Migrated Upgrade belongs to a future `2.0` target Tool.

### Progressive Agent Guidance and readiness

Agent guidance is part of each tracer bullet's interface, not end-of-project
documentation cleanup:

1. Repository Bootstrap adds a precise root `AGENTS.md` routing implementers to
   Canonical Knowledge, project/package rules, TDD, composition-first design,
   mandatory WHAT/WHY records, and exact verification commands.
2. Lean API Release Loop proves a compact self-sufficient `AGENTS.md` in every
   Generated Solution so an inexpensive LLM can work without hidden chat
   context.
3. Modular Monolith Development Baseline introduces the first synchronized
   `martix-platform` router Skill. It progressively loads exact Preset/
   Capability guidance but never duplicates architecture authority.
4. After Platform Tool and Migration Rehearsal, the exact Tool generates an
   ephemeral secret-free Agent Context Projection from manifests and other
   authorities; no second committed agent manifest is created.
5. Before RC, **Agent Readiness** proves raw Generated Solutions,
   representative maintenance/migration tasks, permissions, knowledge routing,
   hostile-instruction resistance, version alignment, and the same Quality
   Gates required of human changes.
6. Only after stable `1.0.0` promotion is the exact released Skill copied one-
   way to `martix/skills`. The Marketplace copy is never independently edited.

Pre-stable guidance may evolve only on the synchronized release train and must
truthfully match that version's current contracts. Final agent-readiness claims
wait for stable manifests, Tool commands, and Canonical Knowledge routing.

### Beta Integration and scope freeze

**Entry gate:** every intended `1.0` lane has rejoined with green evidence.

Generate the complete risk-based matrix from the Capability Matrix rather than
testing an impossible Cartesian product. Beta requires all three Presets,
Minimal APIs, the FastEndpoints Adapter, both relational providers, every
initial identity profile, Blazor/React/Vue, every initial infrastructure
provider, process/OCI/local/Compose profiles, Platform Tool rehearsal, current
documentation, and Agent Context generation to pass their applicable Composed
Quality Profiles. Unavailable Active24-specific and parked native-mobile
profiles remain explicitly not attested and add no Supported claim.

Freeze the `1.0` Capability and public-contract scope at this gate. Establish
versioned performance baselines and relative budgets on controlled runners,
complete threat-model and supply-chain review, reconcile every Change Fragment,
and remove or explicitly classify every temporary exception. No new feature or
provider enters the `1.0` train after Beta; only defects, evidence gaps, and
release blockers may change it.

### Release Candidate and stable promotion

Build an RC once from one clean reviewed commit. Sign and identify every
package, template, Tool, process archive, OCI image, schema, Skill, generated-
client artifact, SBOM, provenance statement, and evidence bundle by digest.
Run the complete release cadence against those exact bytes, including package/
API/client compatibility, Generated Solution matrices, real providers,
migrations and failure injection, security, performance, deployment, docs,
license/provenance, reproducibility, and agent readiness.

A release-blocking fix creates a new candidate and reruns every affected gate;
an RC is never patched in place. Stable `1.0.0` promotes the accepted RC bytes
without rebuild, publishes the synchronized artifact family atomically to its
authoritative destinations, creates immutable versioned documentation and
Release Evidence, and establishes the first Major Floor baseline.

### Canonical cutover and predecessor archival

After public package/template installation, generated-solution smoke tests,
documentation, evidence verification, and one-way Marketplace Skill copy pass:

- make `MartiXDev/Platform` the sole actively maintained Canonical Knowledge
  and distribution source;
- add one final archival banner to `MartiXDev/dotnet-templates` and
  `MartiXDev/WebApi` stating Archived/Unsupported status, the exact Platform
  cutover release/date, the canonical repository link, and the absence of a
  compatibility or migration contract;
- archive both predecessor repositories without renaming them, rewriting their
  Git histories, tags, issues, releases, source, or historical Wayfinder
  snapshot; and
- publish no bridge package and maintain no second editable documentation or
  Skill source.

Archival is post-promotion cleanup, never a prerequisite that can remove the
fallback evidence before the new distribution is proven.

## Safe linear implementation order

The dependency graph permits parallel work after its entry gates. An agent that
cannot coordinate parallel work follows this exact order:

1. **Repository Bootstrap** — provenance commit, Canonical Knowledge, identity,
   licenses, governance, security controls, root agent guidance, and the minimum
   build/verification skeleton.
2. **Lean API Release Loop** — complete internal `0.1.0-preview` vertical slice.
3. **Modular Monolith Development Baseline** — first Public Alpha.
4. **HTTP Contract and Generated Client**.
5. **Secure and Observable Host**.
6. **Identity Profile Conformance**.
7. **Shared UI Behavioral Contract**.
8. **Blazor and React Paired Conformance**.
9. **Vue Conformance**.
10. **FastEndpoints Adapter Conformance**.
11. **Provider Admission and Absence Harness**.
12. **RabbitMQ Transport**.
13. **Quartz Durable Jobs**.
14. **Valkey Distributed Cache**.
15. **Azure Blob Object Storage**.
16. **MailKit SMTP Delivery**.
17. **Azure Key Vault Configuration**.
18. **Microsoft Feature Management**.
19. **OTLP Export**.
20. **Artifact and Deployment Manifest**.
21. **Local Orchestration and Bounded Compose**.
22. **Portable Host Conformance**.
23. **Platform Tool and Migration Rehearsal**.
24. **Agent Readiness** — complete the guidance/evaluation path accumulated
    since Repository Bootstrap.
25. **Beta Integration and scope freeze**.
26. **Release Candidate verification**.
27. **Stable `1.0.0` promotion**.
28. **Canonical cutover and predecessor archival**.

Progressive responsibilities such as tests, security, performance,
documentation, change fragments, API baselines, generated fixtures, and agent
guidance start with the first applicable tracer and ratchet continuously. Their
named late gates complete a claim; they do not postpone the underlying quality
work.

## Implementation work-item contract

Derive implementation issues from the ordered tracer bullets, not from package
or folder inventories. Every issue and pull request states:

- the owning tracer, entry gate, exact dependency versions, and affected
  Preset/Capability/provider combinations;
- one observable end-to-end outcome and the deep Interface or generated seam it
  exercises;
- explicit non-goals, absence expectations, public-contract/SemVer impact,
  Change Fragment, and Canonical Knowledge updates;
- tests written or changed at the appropriate unit, architecture, host,
  real-provider, artifact, migration, security, performance, UI/browser, or
  agent layer;
- the smallest verification command for iteration and every pull-request/
  milestone gate required before merge or prerelease;
- failure, cancellation, concurrency, security/privacy, recovery, rollback or
  roll-forward behavior applicable to the change; and
- evidence paths plus WHAT, WHY, alternatives, consequences, extension
  triggers, Deferred scope, and superseded decisions.

One issue may require several small pull requests, but every merge keeps `main`
green. A complete tracer may create one synchronized prerelease; an intermediate
pull request never publishes a partially admitted Capability. Implementation
agents stop and request review when an approved contract is ambiguous rather
than inventing a placeholder, hidden default, package, project, abstraction,
provider, or support claim.

- exact content and acceptance evidence of every tracer bullet;
- dependency ordering of cross-cutting and optional Capabilities;
- compatibility-baseline, migration-tooling, UI, deployment, agent-readiness,
  promotion, Marketplace publication, and predecessor-archive gates.
