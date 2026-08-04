---
description: 'Long-form companion guide for the martix-dotnet-csharp standalone skill package'
---

## MartiX .NET 10 and C# 14 companion

- This file is the long-form companion to [SKILL.md](./SKILL.md).
- The package follows a layered, standalone-first split:
  `SKILL.md` routes activation, `AGENTS.md` explains how to apply the library,
  `rules\*.md` holds atomic guidance, `references\*.md` maps guidance to
  approved sources and compact decision aids, and `templates\*.md` plus
  `assets\*.json` keep the package maintainable.
- Start with the
  [source index and guardrails](./references/doc-source-index.md) whenever a
  task might widen beyond the approved scope.

## Package inventory

| Layer | Purpose | Key files |
| --- | --- | --- |
| Discovery | Quick activation and domain routing | [SKILL.md](./SKILL.md) |
| Companion | Cross-domain guidance and review routes | [AGENTS.md](./AGENTS.md) |
| Rules | 19 atomic decision guides grouped by domain | [Rule section contract](./rules/_sections.md) |
| References | 13 reference docs: 9 Microsoft-backed source maps plus 4 quick-reference and recipe guides | [Source index](./references/doc-source-index.md) |
| Templates | Authoring, research, and comparison scaffolds | [Rule template](./templates/rule-template.md) |
| Assets | Preferred taxonomy and ordering | [taxonomy.json](./assets/taxonomy.json) and [section-order.json](./assets/section-order.json) |

## Working stance

- Treat
  [docs\martix-dotnet-csharp\martix-dotnet-csharp.md](../../docs/martix-dotnet-csharp/martix-dotnet-csharp.md)
  as the highest-priority local brief.
- Stay inside the source boundary recorded in
  [doc-source-index.md](./references/doc-source-index.md).
- Prefer shipped .NET 10+ and C# 14+ defaults over preview syntax or speculative
  upgrades.
- Read project and build settings before changing code, packages, or framework
  assumptions.
- Measure hot paths before adding spans, pooling, `ValueTask`, or extra
  concurrency primitives.
- Review testing, diagnostics, and security alongside functional changes instead
  of treating them as cleanup work.

## Start here for common decisions

- Use a map first when the question is "which path fits?" and a rule first when
  the question is "what exactly should I do?"
- The map layer stays compact on purpose: make the first choice there, then open
  the linked rule for the full checklist.

| If you need to choose... | Start here | Then add |
| --- | --- | --- |
| Skill scope or source boundary | [Source index and guardrails](./references/doc-source-index.md) | [Common review routes](#common-review-routes) |
| `Task` vs `ValueTask` | [Async and concurrency map](./references/async-map.md) | [Tasks, ValueTasks, async streams, and API shape](./rules/async-tasks-valuetasks.md) |
| bounded vs unbounded channels | [Async and concurrency map](./references/async-map.md) | [Concurrency, synchronization, and channels](./rules/async-concurrency-channels.md) |
| result type vs exception | [Design map](./references/design-map.md) | [Exceptions, validation, and failure contracts](./rules/design-exceptions-validation.md) |
| `IOptions<T>` vs `IOptionsSnapshot<T>` vs `IOptionsMonitor<T>` | [Web stack map](./references/web-stack-map.md) | [ASP.NET Core application shape](./rules/web-aspnet-core.md) |
| Minimal APIs vs controllers or middleware route | [Web stack map](./references/web-stack-map.md) | [ASP.NET Core application shape](./rules/web-aspnet-core.md) |
| new public API surface or DI boundary | [Design map](./references/design-map.md) | [API and type design](./rules/design-api-type-design.md) |

## Domain playbook

### Language

- Open this cluster when the change modernizes syntax, adjusts branch shape, or
  changes nullability contracts.
- Start with [Modern C# features](./rules/lang-modern-features.md), then add
  [Pattern matching](./rules/lang-pattern-matching.md) and
  [Nullability and contracts](./rules/lang-nullability.md) as needed.
- Pair with the [C# language map](./references/csharp-language-map.md) when you
  need the official source trail.
- Review questions:
  - Does the current SDK and target framework actually support the chosen
    syntax?
  - Does the new syntax clarify intent, or only compress the code?
  - Will nullability annotations still match public and serialized contracts?

### SDK and build

- Open this cluster before editing `.csproj`, `global.json`,
  `Directory.Build.*`, `Directory.Packages.props`, or validation commands.
- Start with
  [SDK-style projects and repository build structure](./rules/sdk-project-system.md)
  and
  [Build, test, pack, and publish](./rules/sdk-build-test-pack-publish.md).
- Pair with the [Dotnet SDK and build map](./references/dotnet-sdk-map.md) when
  repo-wide settings or CLI behavior matter.
- Review questions:
  - Which values already come from repo-level props, targets, or package
    management?
  - Is the chosen validation command the smallest one that still proves the
    change?
  - Did the change widen SDK or framework requirements without a stated need?

### Runtime and performance

- Open this cluster for hot paths, large buffers, parser code, thread-safe
  collections, or immutable data-shape choices.
- Start with
  [Memory, spans, and hot-path performance](./rules/runtime-memory-spans.md)
  and add
  [Collections, concurrency, and immutability](./rules/runtime-collections-immutability.md)
  when container or mutation choices matter.
- Pair with the [Runtime and BCL map](./references/runtime-bcl-map.md) for the
  source trail behind span, memory, and collection guidance.
- Review questions:
  - Is the optimization target measured or otherwise high confidence?
  - Are memory ownership and lifetime rules explicit?
  - Would simpler array, stream, or collection code be enough here?

### Async and concurrency

- Open this cluster for async APIs, background work, streaming, cancellation,
  contention, coordination, or backpressure.
- If the first hesitation is `Task` vs `ValueTask` or bounded vs unbounded
  channels, scan the [Async and concurrency map](./references/async-map.md)
  before opening the matching rule.
- Start with
  [Tasks, ValueTasks, async streams, and API shape](./rules/async-tasks-valuetasks.md),
  then add
  [Cancellation and timeouts](./rules/async-cancellation-timeouts.md)
  and
  [Concurrency, synchronization, and channels](./rules/async-concurrency-channels.md).
- Pair with the [Async and concurrency map](./references/async-map.md) when you
  need to justify the primitive choice.
- Review questions:
  - Does cancellation flow end to end across calls and dependencies?
  - Are sync-over-async bridges removed?
  - Is the chosen primitive the right one for throughput, sequencing, and
    backpressure?

### Design

- Open this cluster for new public APIs, abstractions, DI boundaries, overload
  sets, validation, or exception behavior.
- If the first hesitation is result shape versus exception semantics, scan the
  [Design map](./references/design-map.md) before opening the rule pair.
- Start with [API and type design](./rules/design-api-type-design.md) and pair
  it with
  [Exceptions, validation, and failure contracts](./rules/design-exceptions-validation.md).
- Pair with the [Design map](./references/design-map.md) when you need the
  framework-design or DI references.
- Review questions:
  - Is the new public surface the smallest one that solves the scenario?
  - Are validation and exception semantics explicit and consistent?
  - Does the design introduce abstractions because they are needed, or only
    because they are fashionable?

### Web

- Open this cluster for ASP.NET Core app shape, Minimal APIs, controllers,
  middleware ordering, or outbound HTTP dependencies.
- If the first hesitation is endpoint style, options lifetime, or where the
  pipeline decision lives, scan the
  [Web stack map](./references/web-stack-map.md) before opening the rule.
- Start with
  [ASP.NET Core application shape](./rules/web-aspnet-core.md) for inbound app
  structure and
  [HTTP clients and resilience](./rules/web-http-resilience.md) for outbound
  calls.
- Pair with the [Web stack map](./references/web-stack-map.md), then cross into
  security, diagnostics, testing, or serialization when the change reaches
  contracts or operations.
- Review questions:
  - Is middleware ordering explicit and reviewable?
  - Does endpoint style match the surface area and complexity?
  - Are retries, timeouts, and client lifetime decisions measurable and safe?

### Data

- Open this cluster for JSON contracts, `System.Text.Json` behavior, EF Core
  modeling, querying, saving, migrations, or reliability.
- Start with
  [Serialization and payload contracts](./rules/data-serialization.md)
  for wire formats and
  [Entity Framework Core](./rules/data-efcore.md) for persistence behavior.
- Pair with the [Data and serialization map](./references/data-stack-map.md),
  then add testing and async rules when provider behavior or cancellation is
  involved.
- Review questions:
  - Are payload contracts stable, version-tolerant, and explicit?
  - Is `DbContext` lifetime short-lived and easy to reason about?
  - Do queries project only what the scenario needs?

### Quality, diagnostics, and security

- Open this cluster for test strategy, observability, health signals, auth,
  authz, secrets, transport defaults, or review hardening.
- Start with
  [Unit and integration testing](./rules/testing-unit-integration.md),
  [Logging, metrics, tracing, and health signals](./rules/diagnostics-logging-tracing.md),
  and
  [Authentication, authorization, and secure defaults](./rules/security-auth-authz.md)
  based on the concern in front of you.
- Pair with the
  [Quality, diagnostics, and security map](./references/quality-security-map.md)
  and cross back into the web or data rules when contracts, hosts, or storage
  are affected.
- Review questions:
  - Does the change have focused tests at the right layer?
  - Are logs, traces, and metrics structured, safe, and operationally useful?
  - Are authentication, authorization, anonymous access, and secret handling
    explicit?

## Common review routes

| Scenario | Start with | Then add |
| --- | --- | --- |
| SDK or repository setup change | [SDK-style projects](./rules/sdk-project-system.md) | [Build, test, pack, and publish](./rules/sdk-build-test-pack-publish.md), [Modern C# features](./rules/lang-modern-features.md) |
| C# modernization pass | [Modern C# features](./rules/lang-modern-features.md) | [Pattern matching](./rules/lang-pattern-matching.md), [Nullability and contracts](./rules/lang-nullability.md), [SDK map](./references/dotnet-sdk-map.md) |
| New public library API | [API and type design](./rules/design-api-type-design.md) | [Exceptions and validation](./rules/design-exceptions-validation.md), [Unit and integration testing](./rules/testing-unit-integration.md), [Nullability and contracts](./rules/lang-nullability.md) |
| ASP.NET Core endpoint or Minimal API | [ASP.NET Core app shape](./rules/web-aspnet-core.md) | [Serialization guidance](./rules/data-serialization.md), [Security defaults](./rules/security-auth-authz.md), [Diagnostics guidance](./rules/diagnostics-logging-tracing.md), [Testing guidance](./rules/testing-unit-integration.md) |
| Outbound HTTP integration | [HTTP clients and resilience](./rules/web-http-resilience.md) | [Cancellation and timeouts](./rules/async-cancellation-timeouts.md), [Logging, metrics, tracing, and health signals](./rules/diagnostics-logging-tracing.md), [Unit and integration testing](./rules/testing-unit-integration.md) |
| EF Core change or query review | [Entity Framework Core](./rules/data-efcore.md) | [Serialization and payload contracts](./rules/data-serialization.md), [Unit and integration testing](./rules/testing-unit-integration.md), [Cancellation and timeouts](./rules/async-cancellation-timeouts.md) |
| Hot-path optimization | [Memory, spans, and hot-path performance](./rules/runtime-memory-spans.md) | [Collections, concurrency, and immutability](./rules/runtime-collections-immutability.md), [Tasks, ValueTasks, async streams, and API shape](./rules/async-tasks-valuetasks.md) |
| Background worker or fan-out flow | [Concurrency, synchronization, and channels](./rules/async-concurrency-channels.md) | [Cancellation and timeouts](./rules/async-cancellation-timeouts.md), [Logging, metrics, tracing, and health signals](./rules/diagnostics-logging-tracing.md), [Authentication, authorization, and secure defaults](./rules/security-auth-authz.md) |
| Choosing `Task` vs `ValueTask` | [Async and concurrency map](./references/async-map.md) | [Tasks, ValueTasks, async streams, and API shape](./rules/async-tasks-valuetasks.md), [Cancellation and timeouts](./rules/async-cancellation-timeouts.md) |
| Choosing bounded vs unbounded channels | [Async and concurrency map](./references/async-map.md) | [Concurrency, synchronization, and channels](./rules/async-concurrency-channels.md), [Cancellation and timeouts](./rules/async-cancellation-timeouts.md) |
| Choosing result type vs exception | [Design map](./references/design-map.md) | [Exceptions, validation, and failure contracts](./rules/design-exceptions-validation.md), [API and type design](./rules/design-api-type-design.md) |
| Choosing an options interface | [Web stack map](./references/web-stack-map.md) | [ASP.NET Core application shape](./rules/web-aspnet-core.md), [Design map](./references/design-map.md) |

## Reference index

- [Source index and guardrails](./references/doc-source-index.md)
- [Anti-patterns quick reference](./references/anti-patterns-quick-reference.md)
- [Web bootstrap recipes](./references/web-bootstrap-recipes.md)
- [Testing bootstrap recipes](./references/testing-bootstrap-recipes.md)
- [Libraries catalog](./references/libraries-catalog.md)
- [C# language map](./references/csharp-language-map.md)
- [Dotnet SDK and build map](./references/dotnet-sdk-map.md)
- [Runtime and BCL map](./references/runtime-bcl-map.md)
- [Async and concurrency map](./references/async-map.md)
- [Design map](./references/design-map.md)
- [Web stack map](./references/web-stack-map.md)
- [Data and serialization map](./references/data-stack-map.md)
- [Quality, diagnostics, and security map](./references/quality-security-map.md)

## Maintenance and package growth

### Authoring contract

- Keep every rule aligned with
  [rules/_sections.md](./rules/_sections.md).
- Use [the rule template](./templates/rule-template.md) when adding or revising
  rule files.
- Keep new guidance small, decision-oriented, and cross-linked rather than
  turning one rule into a tutorial dump.

### Research and comparison

- Use [the research pack template](./templates/research-pack-template.md) when a
  future expansion needs a scoped source inventory before new rules are added.
- Use
  [the comparison matrix template](./templates/comparison-matrix-template.md)
  when comparing this package with external .NET or C# skills.
- Treat [taxonomy.json](./assets/taxonomy.json) and
  [section-order.json](./assets/section-order.json) as the stable navigation
  contract for future reordering.

### Standalone packaging note

- This package is the canonical standalone skill under `skills`.
- If you document or install it directly, use `npx skills add <source>`.
- Do not document direct installation as `npx skill add`.

## Source boundaries

- Approved local direction begins with
  [docs\martix-dotnet-csharp\martix-dotnet-csharp.md](../../docs/martix-dotnet-csharp/martix-dotnet-csharp.md).
- Approved and excluded sources are recorded in
  [doc-source-index.md](./references/doc-source-index.md).
- Do not pull guidance from `docs\martix-csharp`,
  `src\plugins\martix-dotnet-library`, `src\plugins\martix-webapi`, or other
  unrelated repo content unless a later task explicitly approves it.
