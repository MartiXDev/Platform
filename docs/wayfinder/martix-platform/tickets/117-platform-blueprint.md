---
title: Synthesize the decision-ready platform blueprint
status: closed
type: wayfinder:task
parent: ../map.md
claimed_by:
resolved: 2026-07-20
blocked_by:
  - 104-capability-preset-matrix.md
  - 105-platform-library-topology.md
  - 106-generated-solution-topology.md
  - 107-persistence-and-migrations.md
  - 108-identity-provider-matrix.md
  - 109-integration-event-delivery.md
  - 110-http-contract-policy.md
  - 111-security-observability-baseline.md
  - 112-aot-performance-matrix.md
  - 113-quality-gates.md
  - 114-release-migration-policy.md
  - 115-agent-guidance.md
---

## Question

What concise approved architecture, capability model, package and project topology, quality strategy, compatibility contract, and migration sequence should be handed to implementation after all prerequisite decisions are resolved?

## Blueprint asset

[MartiX Platform implementation blueprint](../platform-blueprint.md) is the
concise current-target handoff. It links every major section to the canonical
Wayfinder decision that owns rationale, alternatives, evidence, migration
details, and extension triggers.

## Resolution

The approved target is a public greenfield `MartiXDev/Platform` repository for
one synchronized .NET 10+ Platform release train. It contains a small deep
package family, one deterministic composable Template System, exact
Capabilities/providers, executable quality and migration tooling, layered
Canonical Knowledge, and one versioned Agent Guidance Package. The legacy
`MartiX.WebApi` remains an unused POC and gains no compatibility contract.

The automatic package baseline is `MartiX.Platform`,
`MartiX.Platform.AspNetCore`, and `MartiX.Platform.Analyzers`. Relational
persistence admits `MartiX.Platform.EntityFrameworkCore`; FastEndpoints and
RabbitMQ remain optional real Adapters; Templates and the exact-version Tool are
separate distribution artifacts. Additional packages require proven depth or a
real distribution/provider seam.

One `martix-app` Template System generates `api`, default
`modular-monolith`, or `full-stack`. Generated Solutions minimize projects:
one API host, one Migrator when persistence is present, one assembly per genuine
Business Module, one consolidated .NET test project, and at most one selected
UI project. Modules own internal Domain, vertical slices, persistence and
Integrations plus deliberate public Contracts. Composition is explicit;
dependencies are acyclic and Contracts-only across modules.

Application behavior uses thin Minimal API endpoints and direct internal sealed
Application Operations, immutable Results/Errors, explicit mapping and
transport validation, composition-first Entity Capabilities, direct EF Core,
and constrained immutable Specifications. The modular Presets require
module-owned relational persistence, a privileged one-shot Migrator, and durable
Outbox/Inbox At-Least-Once Integration Event delivery with in-process transport
by default. PostgreSQL is the default provider and SQL Server receives equal
verification.

HTTP uses explicit URL major versions, typed results, RFC 9457 Problem Details,
authoritative build-time OpenAPI 3.1, explicit idempotency/ETag/cache/pagination
semantics, and deterministic generated clients. Authentication is optional and
profile/provider-specific; business code consumes composed Actor and permission
semantics. Host security, audit, native telemetry, health, overload, key,
outbound, privacy and Threat Model contracts are mandatory and fail closed.

Full Stack selects exactly one equally governed Blazor Web App, React, or Vue
provider. All use one behavioral UI contract, Fluent 2, semantic HTML and clean
component-root CSS; Tailwind is excluded. React/Vue use strict pnpm supply-chain
governance. Public SEO uses the explicit `hybrid-web` profile. PWA/offline,
advanced widgets and real-time behavior remain separate capabilities.

Optional infrastructure begins with one attested provider per Capability—Valkey,
Quartz, RabbitMQ, Azure Blob, MailKit SMTP, standard configuration/optional Key
Vault, Microsoft Feature Management, and OTLP—without adding Generated Solution
projects. Client-driven alternatives require explicit admission evidence.
Direct development is universal; Aspire, containers and Compose are optional.
Process and OCI deployment artifacts derive from one Deployment Manifest. The
future Active24 target is admission-gated Ubuntu 26.04 LTS Minimal with explicit
fallbacks, not a baseline assumption.

All Supported combinations are proven by TUnit, compile-time architecture,
real-provider and artifact tests through one `.NET 10` file-based Verification
Entrypoint and fail-closed Quality Gate Policy. Native AOT is a declared exact
profile for the lean Minimal API, not a universal constraint; EF modular and
Full Stack Presets remain JIT-first. Performance uses versioned reference
runners and relative budgets, while applications own workload SLOs.

Every release shares one SemVer Platform Version, build-once promotion, signed
provenance and content-addressed evidence. Same-major updates cannot require
application-source migration. Installed, contract and manifest-schema versions
remain distinct. Exact-version `MartiX.Platform.Tool` plans and verifies typed
Platform Migrations without template reapplication. Current plus previous major
are the normal support window.

Every Generated Solution contains a compact self-sufficient `AGENTS.md`; the
Platform owns one synchronized model-invoked router Skill and Tool-generated
ephemeral Agent Context Projection. Canonical Knowledge remains layered and all
agent work passes the same gates as human work. A mandatory plugin/MCP layer is
Deferred.

Native Android/iOS remains a first-class but Deferred Capability. MAUI and React
Native are future conformance finalists; the branch resumes only when Apple and
Android physical-device/toolchain prerequisites and priority exist. PWA is not a
substitute. Multi-tenancy likewise remains fog until a concrete isolation model
establishes its forces.

## Implementation and migration consequence

The blueprint is decision-ready but does not authorize implementation inside
the legacy repository. **Produce the prioritized migration roadmap** must now
turn its dependency constraints into reviewable tracer bullets for the new
repository, each with explicit acceptance evidence and usable intermediate
state. It must copy all Wayfinder history and Canonical Knowledge, establish
foundational contracts before optional providers, and archive predecessor
repositories only after verified cutover.

## Material synthesis guardrails

- The blueprint summarizes current target behavior; closed tickets remain the
  single source for historical WHY and rejected alternatives.
- Minimum-project goals apply to Generated Solutions and do not collapse real
  Platform package, executable, toolchain, or provider seams.
- Enterprise readiness means promotable seams and evidence, not preinstalled
  enterprise infrastructure.
- Deferred alternatives retain explicit admission triggers but add no package,
  project, source, or support claim.
- Exact versions in research are release inputs, not timeless architecture.
