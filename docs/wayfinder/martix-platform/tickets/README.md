# MartiX platform ticket index

This is the local Markdown tracker's query surface. Front matter in each ticket is authoritative; the map remains the low-resolution decision index.

## Frontier

No ticket is currently unblocked and unclaimed.

## Claimed

- [Provision the native mobile conformance lab](132-native-mobile-conformance-lab.md) — parked with `martix-owner` until Apple hardware is available and native mobile becomes a current priority

## Blocked

- [Prototype the native mobile provider finalists](131-native-mobile-provider-conformance-prototype.md)
- [Define the native mobile capability and generated-client topology](124-native-mobile-capability-topology.md)
- [Research native mobile authentication and device-security profiles](125-native-mobile-identity-research.md)
- [Specify native mobile authentication, session, and device trust](126-native-mobile-authentication-contract.md)
- [Specify mobile API resilience, offline data, and synchronization semantics](127-mobile-api-sync-semantics.md)
- [Specify mobile push notifications and device registration](128-mobile-push-device-registration.md)
- [Research native mobile build, store, privacy, security, and quality obligations](129-native-mobile-delivery-research.md)
- [Define the native mobile quality, release, and operational profile](130-native-mobile-quality-release-profile.md)

## Closed historical decisions

Accepted decisions from the charting interview are indexed under **Decisions so far** in [the Wayfinder map](../map.md).

## Resolved map tickets

- [Compare the platform sources at fixed revisions](101-compare-platform-sources.md) — source comparison and adopt/adapt/reject guidance complete
- [Audit the current WebApi public surface and dependency graph](102-audit-current-webapi.md) — public surface classified and migration dispositions recorded
- [Define measurable platform quality attributes](103-define-quality-attributes.md) — strict composable quality profiles and release thresholds accepted
- [Design the supported capability and preset matrix](104-capability-preset-matrix.md) — deterministic Preset composition, prerequisites, invalid combinations, and provider boundaries accepted
- [Design the exact Platform Library topology](105-platform-library-topology.md) — minimal package family, Kernel contracts, adapter boundaries, dependency graph, and synchronized release relationships accepted
- [Design the generated solution and Business Module topology](106-generated-solution-topology.md) — minimum project tree, vertical-slice module internals, reference graph, composition, UI boundary, and generated documentation governance accepted
- [Specify persistence ownership and migration operations](107-persistence-and-migrations.md) — module and lean-API ownership, direct EF Core Specifications, transactional and migration operations, portable provider policy, compositional Entity Capabilities, and real-provider TUnit evidence accepted
- [Audit accepted decisions for composition over inheritance](121-composition-over-inheritance-audit.md) — immutable Specifications, composed Domain Events, explicit Entity identity and Value Object equality, and evidence-based inheritance and Interface admission accepted
- [Specify the identity provider capability matrix](108-identity-provider-matrix.md) — explicit provider/flow profiles, composed Actor contracts, optional Actor Registry, minimum-project provider ownership, fail-closed authorization, and provider-specific verification accepted
- [Specify Integration Event, outbox, and inbox semantics](109-integration-event-delivery.md) — immutable Messages, fenced per-Subscription delivery, atomic Inbox deduplication, bounded recovery, versioned contracts, deep EF Core ownership, and real-provider evidence accepted
- [Define HTTP contracts, OpenAPI, and versioning](110-http-contract-policy.md) — explicit URL major versions, typed endpoint results, RFC 9457 errors, authoritative OpenAPI 3.1, lifecycle headers, HTTP capabilities, and automated conformance policy accepted
- [Define the security and observability baseline](111-security-observability-baseline.md) — mandatory fail-fast host security, two-layer authorization, atomic audit, classified vendor-neutral telemetry, operational policies, minimum-project ownership, and executable security evidence accepted
- [Define the AOT and performance compatibility matrix](112-aot-performance-matrix.md) — exact package/Capability/RID claims, lean Minimal API production AOT, JIT-first EF Presets, OS-native artifact parity, and measured regression gates accepted
- [Define executable quality gates and template verification](113-quality-gates.md) — four verification cadences, fail-closed quality policy, risk-based compatibility coverage, real providers and packed artifacts, historical migration fixtures, and immutable build-once release evidence accepted
- [Define release, compatibility, and Platform Migration policy](114-release-migration-policy.md) — synchronized SemVer train, strict cumulative compatibility, supported-line lifecycle, typed review-first migration tooling, signed build-once promotion, and content-addressed evidence accepted
- [Design the supported UI provider architectures](118-ui-provider-architecture.md) — equal Blazor/React/Vue provider profiles, Fluent semantic UI contract, generated clients, rendering and identity boundaries, strict pnpm supply chain, and non-product conformance fixtures accepted
- [Select the initial infrastructure capability providers](119-infrastructure-provider-catalog.md) — one rigorously attested initial provider per optional capability, standard .NET seams, zero added generated projects, and a narrowly isolated RabbitMQ provider accepted
- [Design local development and deployment profiles](120-development-deployment-profiles.md) — direct and Aspire local workflows, equal immutable process and OCI artifacts, bounded Compose, portable secrets, one Deployment Manifest, cloud-neutral promotion paths, and an admission-gated Ubuntu 26.04 Active24 target accepted
- [Define repository ownership, branding, and public distribution topology](122-repository-distribution-topology.md) — public greenfield monorepo, Apache/0BSD licensing, stable MartiX identity, organization-owned release channels, DCO governance, archival cutover, and one-way Marketplace Skill publication accepted
- [Research native Android and iOS client technology options](123-native-mobile-technology-research.md) — MAUI and React Native advanced to one conformance prototype; platform-native retained as the reference and other credible providers Deferred behind explicit triggers
- [Design the MartiX agent guidance package](115-agent-guidance.md) — compact self-sufficient AGENTS guidance, one versioned router Skill, Tool-generated machine context, exact Marketplace publication, and evidence-based agent readiness accepted
- [Synthesize the decision-ready platform blueprint](117-platform-blueprint.md) — one implementation handoff now integrates approved packages, Presets, Generated Solution topology, contracts, providers, quality, lifecycle, agent guidance, and Deferred scope
- [Produce the prioritized migration roadmap](116-migration-roadmap.md) — dependency graph, 28-step safe linear route, maturity gates, tracer evidence, migration rehearsal, agent-readiness path, and verified cutover accepted
