---
title: Produce the prioritized migration roadmap
status: closed
type: wayfinder:grilling
parent: ../map.md
claimed_by:
resolved: 2026-07-21
blocked_by:
  - 117-platform-blueprint.md
---

## Question

In what dependency-aware tracer-bullet sequence should the greenfield
`MartiXDev/Platform` repository implement the approved Platform, selectively
reusing verified knowledge from MartiX.WebApi and MartiXDev/dotnet-templates
without modifying them, while preserving reviewability, tests, package
compatibility, usable intermediate releases, and an explicit archival cutover?

## Roadmap asset

[Prioritized implementation roadmap](../migration-roadmap.md) captures the
accepted sequence, milestone acceptance evidence, dependencies, and cutover
rules as this HITL decision progresses.

## Resolution

Construct the Platform in the new `MartiXDev/Platform` repository through a
prioritized dependency graph with one safe linear route. Do not migrate or
preserve compatibility with the unused legacy implementations. An explicit
bootstrap provenance commit copies durable Wayfinder and Canonical Knowledge;
trunk-based implementation then keeps `main` green through small reviewable
pull requests and publishes only complete tracer bullets.

Prove the complete distribution loop first with an internal Lean API preview,
then deliver the default Modular Monolith as the first Public Alpha. Complete
HTTP/client, secure/observable host, and identity contracts before branching
into equal UI, FastEndpoints, infrastructure-provider, and deployment lanes.
Blazor and React share one paired acceptance gate, Vue remains required before
Beta, providers proceed one Capability at a time behind selection/absence
tests, and Active24-specific Ubuntu attestation does not block `1.0.0`.

Introduce the exact-version Platform Tool before Beta and execute a real alpha-
to-Beta migration rehearsal without retroactively supporting prereleases.
Agent guidance begins at repository bootstrap, evolves with the synchronized
train, and gains full Agent Readiness evidence before RC. Beta freezes scope;
RC verifies signed build-once artifacts; stable `1.0.0` promotes those exact
bytes, publishes the Marketplace Skill copy, and only then archives both
predecessor repositories with explicit unsupported pointers.

Every maturity label, entry/exit gate, Supported claim, absence claim, and
intermediate release is executable rather than aspirational. The linked
[prioritized implementation roadmap](../migration-roadmap.md) owns the exact
28-step linear order, parallel entry gates, tracer acceptance contracts,
implementation work-item schema, alternatives, consequences, and cutover.

Rejected approaches are a long horizontal foundation phase, long-lived
milestone branches, publishing every pull request, partially admitted
Capabilities, one oversized production-baseline change, fake sample domains,
provider wrappers/packages without a proven seam, postponing migration or agent
tooling until after `1.0`, binding stable release to unavailable Active24
hardware, and leaving predecessor repositories apparently active after cutover.
