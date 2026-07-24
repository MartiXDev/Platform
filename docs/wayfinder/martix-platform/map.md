---
title: Chart the MartiX .NET application platform
status: open
label: wayfinder:map
tracker: local-markdown
created: 2026-07-15
---

## Destination

Produce an evidence-backed target architecture and prioritized migration roadmap for the .NET 10+ MartiX Platform, covering its Platform Libraries, composable Template System, optional native Android/iOS application support, quality governance, and future agent guidance.

## Notes

- Planning is the scope of this map. Implementing packages, templates, or migrations begins only after the route is decision-ready.
- The primary consumers are MartiX greenfield production applications and small teams; public reuse remains a design quality bar.
- Enterprise readiness means strong structural seams and operational readiness without mandatory distributed infrastructure.
- Prefer composition over inheritance across Platform and Generated Solution design. Once an orthogonal Entity Capability and its semantics are accepted, prefer an `IHas<Capability>` Interface automatically instead of reopening the inheritance choice. A prefix never admits a new Capability by itself. Admit inheritance only when one stable substitutable abstraction genuinely shares behavior and invariants; do not replace inheritance with shallow marker interfaces or pass-through abstractions.
- Preserve decision history continuously so the user never has to request it again. Every ticket resolution and later implementation handoff records the accepted WHAT, WHY, material alternatives and rejection reasons, relationship to the current implementation and migration path, evidence, consequences, extension triggers, deferred scope, and any superseded decision. Conversation history is never the only authority; link canonical artifacts and keep terminology-only content in `CONTEXT.md`.
- Keep client-driven substitution paths explicit. Every provider, framework, deployment, or architecture decision documents credible alternatives, the concrete client or workload forces that could justify each alternative, compatibility and migration consequences, and the evidence required for admission. An alternative is guidance for reassessment, not a pre-approved Supported option or a reason to add its dependency before it is selected.
- Use [the platform glossary](../../../CONTEXT.md) as the canonical vocabulary.
- Use [the local ticket index](tickets/README.md) to query the frontier and blocked work. Ticket front matter is authoritative.
- Every investigation should consult `wayfinder`, `research` or `grilling` as appropriate, `domain-modeling`, `codebase-design`, and `martix-dotnet-csharp`. Add focused skills such as `martix-fastendpoints`, `martix-tunit`, and `martix-markdown` when the ticket requires them.
- External comparisons must identify exact repository commits and prefer primary documentation.
- Treat native Android/iOS applications as a first-class optional consumer and Generated Solution concern. A PWA remains a distinct future browser Capability and is not accepted as a substitute for native-mobile support.
- Keep the native-mobile decision branch visible but parked while the owner has an Android device but no Mac or iPhone and mobile is not a current priority. The core Platform blueprint records native mobile as a Deferred Capability and does not wait for provider conformance; resume the branch through [Provision the native mobile conformance lab](tickets/132-native-mobile-conformance-lab.md) when Apple hardware and priority are available.

## Decisions so far

- [Set the platform destination and enterprise posture](tickets/001-platform-destination.md) — Build a decision-ready Platform for greenfield applications, structurally prepared for enterprise growth without mandatory operational complexity.
- [Use one composable template system with tested presets](tickets/002-template-system-and-presets.md) — Maintain one source of truth with API, Modular Monolith, and Full Stack presets; Modular Monolith is the default.
- [Keep UI an explicit optional capability](tickets/003-optional-ui-capability.md) — Generate no UI unless a supported UI capability is selected.
- [Standardize persistence without hiding EF Core](tickets/004-persistence-baseline.md) — Use module-owned EF Core contexts, explicit providers, PostgreSQL by default, and equal SQL Server verification.
- [Prepare stable identity seams and selectable providers](tickets/005-identity-seams-and-providers.md) — Keep business code independent of identity storage and authentication providers while offering optional adapters.
- [Adopt an AOT-conscious compatibility policy](tickets/006-aot-policy.md) — Keep core surfaces trimming-friendly and test compatible Native AOT combinations without requiring AOT for every preset.
- [Make TDD and layered verification the quality standard](tickets/007-testing-strategy.md) — Use TUnit on Microsoft.Testing.Platform with unit, architecture, host, container, template, and performance verification.
- [Use Minimal APIs as the canonical HTTP model](tickets/008-http-endpoint-model.md) — Lead with first-party Minimal APIs and keep FastEndpoints as a separately versioned optional adapter.
- [Use direct application operations by default](tickets/009-application-dispatch.md) — Remove pseudo-mediator contracts; add a source-generated mediator only when real pipeline or fan-out forces exist.
- [Use explicit compile-time mapping](tickets/010-mapping-policy.md) — Own mappings in vertical slices, with Mapperly optional and no global runtime registry.
- [Separate transport validation from business rules](tickets/011-validation-policy.md) — Use native transport validation and structured application/domain errors, with FluentValidation optional for complex rules.
- [Establish layered documentation authority](tickets/012-documentation-governance.md) — Separate vocabulary, rationale, current architecture, executable manifests, agent rules, and workflow skills.
- [Define an automatic baseline with minimal layered packages](tickets/013-package-baseline.md) — Present a cohesive baseline while preserving physical dependency direction and isolating optional providers.
- [Use hybrid communication between business modules](tickets/014-module-communication.md) — Allow synchronous Module Contracts and asynchronous Integration Events according to consistency needs.
- [Include a durable transactional outbox in the modular preset](tickets/015-transactional-outbox.md) — Persist Integration Events atomically and dispatch them reliably without requiring a broker.
- [Give generated solutions ownership of their source](tickets/016-generated-solution-lifecycle.md) — Evolve applications through package updates and explicit agent-assisted migrations, not template reapplication.
- [Compare the platform sources at fixed revisions](tickets/101-compare-platform-sources.md) — Keep the architecture MartiX-owned; selectively adopt FullStackHero boundaries and quality patterns, dotnet-templates verification mechanics, and proven WebApi primitives without copying any source wholesale.
- [Audit the current WebApi public surface and dependency graph](tickets/102-audit-current-webapi.md) — Deepen the Result/error concept and quality mechanics; move application semantics, split real Adapters, prefer .NET 10 capabilities, and replace misleading or unsafe defaults.
- [Define measurable platform quality attributes](tickets/103-define-quality-attributes.md) — Require strict composable Quality Gate Profiles with measurable correctness, security, performance, reliability, simplicity, operability, agent-readiness, and immutable release-evidence thresholds; failed Supported gates cannot be waived.
- [Design the supported capability and preset matrix](tickets/104-capability-preset-matrix.md) — Keep a small universal baseline; make Modular Monolith the persistence and reliable-event default and Full Stack its explicit Blazor, React, or Vue UI extension; compose optional providers through a verified manifest without hidden infrastructure.
- [Design the exact Platform Library topology](tickets/105-platform-library-topology.md) — Replace the broad WebApi package with a BCL-only Kernel, a narrow ASP.NET Core adapter, separate analyzers, and one real FastEndpoints adapter; admit future packages only for deep behavior or verified provider seams on an exact synchronized release train.
- [Design the generated solution and Business Module topology](tickets/106-generated-solution-topology.md) — Generate one API host, one one-shot migrator, one assembly per genuine Business Module, one consolidated test project, and at most one selected UI project; organize internal behavior by vertical slices with explicit composition and acyclic Contracts-only dependencies.
- [Specify persistence ownership and migration operations](tickets/107-persistence-and-migrations.md) — Use application-owned EF Core contexts and migrations, direct EF Core with constrained Specifications, one explicit provider, safe one-shot migration operations, compositional Entity Capabilities, portable database policy, and isolated real-provider TUnit verification.
- [Audit accepted decisions for composition over inheritance](tickets/121-composition-over-inheritance-audit.md) — Replace inherited Specifications and Entity bases with immutable values and admitted capabilities; keep MartiX types sealed by default while allowing evidence-backed local polymorphism and sealed framework Adapters.
- [Specify the identity provider capability matrix](tickets/108-identity-provider-matrix.md) — Separate provider choice from interactive, bearer, and machine-to-machine profiles; use explicit composed Actor values and an optional durable Actor Registry; keep provider implementation in the existing API host until extraction has a real force; and require fail-closed authorization plus provider-specific security evidence.
- [Specify Integration Event, outbox, and inbox semantics](tickets/109-integration-event-delivery.md) — Use module-owned immutable Outbox Messages, per-Subscription fenced Delivery Attempts, atomic consumer Inbox Receipts, serialized in-process delivery, bounded retries and a deep EF Core reliable-events module to provide observable at-least-once delivery without another project or exactly-once claims.
- [Define HTTP contracts, OpenAPI, and versioning](tickets/110-http-contract-policy.md) — Use explicit URL major versions, exact ASP.NET Core typed results, one RFC 9457 error contract, authoritative build-time OpenAPI 3.1, standards-based lifecycle headers, and explicit high-performance HTTP capabilities enforced in CI across Minimal APIs and FastEndpoints.
- [Define the security and observability baseline](tickets/111-security-observability-baseline.md) — Require explicit fail-fast host security, two-layer authorization, atomic security audit facts, classified vendor-neutral telemetry, precise health/overload/key/outbound policies, and executable threat-model-driven verification without new default projects or distributed infrastructure.
- [Define the AOT and performance compatibility matrix](tickets/112-aot-performance-matrix.md) — Declare trim and Native AOT only for exact warning-free package, Preset, Capability, provider, OS and RID combinations; make the lean Minimal API the production AOT profile, keep EF-based Presets JIT, and block repeatable regressions with measured relative budgets and artifact parity tests.
- [Define executable quality gates and template verification](tickets/113-quality-gates.md) — Execute one fail-closed policy through four verification cadences, risk-based compatibility coverage, real providers and packed artifacts, deterministic migration/reliability/security/performance profiles, and immutable build-once release evidence.
- [Define release, compatibility, and Platform Migration policy](tickets/114-release-migration-policy.md) — Version one synchronized train with strict same-major compatibility, current-plus-previous support, typed review-first Platform Migrations, build-once signed promotion, and content-addressed release evidence.
- [Design the supported UI provider architectures](tickets/118-ui-provider-architecture.md) — Support Blazor Web App, React, and Vue as equal one-project provider choices over one OpenAPI and behavioral UI contract, with Fluent 2 semantic CSS, explicit application/hybrid rendering profiles, generated-client conformance, strict pnpm governance, and repository-only reference fixtures instead of fake product samples.
- [Select the initial infrastructure capability providers](tickets/119-infrastructure-provider-catalog.md) — Start with one rigorously attested provider per optional infrastructure capability, prefer standard .NET seams, add no generated projects, and isolate only the proven RabbitMQ transport in an optional provider package while preserving explicit promotion paths.
- [Design local development and deployment profiles](tickets/120-development-deployment-profiles.md) — Support direct and Aspire local workflows, immutable process and OCI artifacts, bounded Compose, one Deployment Manifest, portable secret delivery, and an admission-gated Ubuntu 26.04 Active24 VPS target without imposing a cloud or orchestrator.
- [Define repository ownership, branding, and public distribution topology](tickets/122-repository-distribution-topology.md) — Build the public greenfield Platform in one canonical MartiX repository with explicit licensing, identity, organization ownership, authoritative distribution channels, governed contributions, archival cutover, and a one-way Marketplace Skill publication.
- [Research native Android and iOS client technology options](tickets/123-native-mobile-technology-research.md) — Advance .NET MAUI and React Native to one measured conformance prototype; retain platform-native implementations as the fidelity reference and keep Flutter/Kotlin Multiplatform as explicit Deferred alternatives.
- [Design the MartiX agent guidance package](tickets/115-agent-guidance.md) — Combine compact self-sufficient repository guidance with one synchronized router Skill, ephemeral Tool-generated context, canonical knowledge routing, exact Marketplace publication, and conformance-tested agent profiles without a mandatory plugin.
- [Synthesize the decision-ready platform blueprint](tickets/117-platform-blueprint.md) — Consolidate all approved architecture, topology, capability, provider, quality, release, guidance, and Deferred-scope contracts into one linked current-target implementation handoff.
- [Produce the prioritized migration roadmap](tickets/116-migration-roadmap.md) — Build greenfield through a gated tracer-bullet dependency graph with a 28-step safe linear route from repository provenance to verified `1.0.0` promotion and predecessor archival.

## Not yet specified

- Multi-tenancy requirements and isolation models should remain fog until a concrete consumer scenario establishes their forces.

## Out of scope

- Implementing the target packages, templates, or application migrations during this planning map.
- Selecting business domains or Business Modules for a particular future application.
- Requiring microservices, Kubernetes, a message broker, a distributed cache, or a cloud vendor in every Generated Solution.
- Building a UI while UI remains an unselected optional capability.
