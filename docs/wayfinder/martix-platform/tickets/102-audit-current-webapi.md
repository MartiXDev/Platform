---
title: Audit the current WebApi public surface and dependency graph
status: closed
type: wayfinder:research
parent: ../map.md
claimed_by: codex-root
blocked_by: []
resolved: 2026-07-15
---

## Question

Which current MartiX.WebApi interfaces and implementations are deep reusable Platform behavior, generated application concerns, redundant wrappers over .NET 10, misleading integrations, or unsafe production defaults?

## Resolution

Treat the current unused `MartiX.WebApi` as design and implementation input, not as the target Platform Library topology or a consumer migration baseline. It has no known application consumer and therefore creates no compatibility, support-window, deprecation-release, or Platform Migration obligation. It is a broad convenience assembly with an unusually large public surface relative to its implementation and makes optional, shallow, or unsafe behavior appear to be a cohesive production baseline.

- Keep and deepen the Result/error concept as a small framework-independent Module, but redesign its invariants, error metadata, factory consistency, and separation from HTTP semantics before treating the current Interface as stable.
- Keep the TUnit/Microsoft.Testing.Platform direction, analyzer-project precedent, zero-warning checks, central dependency management, and trusted publishing mechanics. Replace the current analyzer rule after the Result Interface makes parameterless errors impossible.
- Move Business Module semantics—domain bases and events, application operations, mapping, validation, persistence abstractions, pagination, current-actor contracts, and host policy—to generated, application-owned source unless later evidence establishes a genuinely deep reusable Module.
- Split real ASP.NET Core, FastEndpoints, client/UI, identity, persistence, and infrastructure implementations into independently selectable Adapters that depend on their actual frameworks and the smallest stable Platform Interface.
- Replace `IClock`/`SystemClock`, guards, cache wrapper, resilience profiles, raw forwarded-header security evaluation, most health wrappers, and telemetry wrapper with first-party .NET 10 capabilities and explicit host configuration.
- Delete or completely replace the pseudo-Mapster and pseudo-mediator surfaces, current FastEndpoints DTO mapper, generic specification framework, `IUnitOfWork`, status exceptions, non-transactional outbox/EF marker interceptor, incomplete idempotency store, and `AddMartiXWebApiDefaults()`.

The current assembly is AOT-analyzer-conscious, not an AOT-verified Platform. Passing 244 unit/component tests establishes fidelity to current behavior, but production claims require host, relational-provider, package compatibility, trimming, Native AOT, architecture, and concurrency verification.

## Research asset

The complete public-area classification, dependency graph, evidence, migration sequence, uncertainties, and keep/move/split/replace/delete matrix are recorded in [Current WebApi public-surface and dependency audit](../research/102-current-webapi-surface-audit.md).
