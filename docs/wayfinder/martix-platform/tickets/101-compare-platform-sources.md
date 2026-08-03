---
title: Compare the platform sources at fixed revisions
status: closed
type: wayfinder:research
parent: ../map.md
claimed_by: codex-root
blocked_by: []
resolved: 2026-07-15
---

## Question

At explicitly recorded commits, what architecture, capabilities, dependencies, quality mechanisms, and maintenance trade-offs in MartiXDev/WebApi, MartiXDev/dotnet-templates, Ardalis MinimalClean, and fullstackhero/dotnet-starter-kit should MartiX adopt, adapt, or reject?

## Resolution

Do not adopt any compared repository wholesale. Build a MartiX-owned architecture and selectively extract proven patterns:

- Keep WebApi's structured Result model, TUnit direction, analyzer precedent, central dependency management, and secure release lane, but split its broad runtime surface and remove misleading or shallow mediator, mapping, outbox, and capability registrations.
- Reuse dotnet-templates' cross-platform generated-variant verification and template delivery mechanics, but replace its inherited single-project, FastEndpoints-first, SQL Server-only shape and eliminate copied Platform Library code.
- Use Ardalis MinimalClean only as a compact reference for the API preset and vertical-slice locality; its maintainers do not position that topology as the enterprise target.
- Treat FullStackHero as the richest pattern source. Adapt its runtime/contracts Business Module boundaries, architecture tests, one-shot migrator, template smoke tests, native Minimal API conventions, and operational checks. Do not fork it or make its mandatory Identity, multitenancy, mediator, FluentValidation, infrastructure, and UI stack the MartiX baseline.

The accepted modular-monolith, native-first, opt-in-capability direction remains valid. FullStackHero's outbox and other infrastructure are design inputs, not production-ready implementations to copy without provider-specific correctness work.

## Research asset

The source-level comparison, fixed revisions, evidence, limitations, and adopt/adapt/reject matrix are recorded in [Platform source comparison at fixed revisions](../research/101-platform-source-comparison.md).
