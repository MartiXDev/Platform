---
title: Define an automatic baseline with minimal layered packages
status: closed
type: wayfinder:grilling
parent: ../map.md
resolved: 2026-07-15
---

## Question

How should commonly used behavior be packaged without creating either a monolith or package fragmentation?

## Resolution

Define one automatic Platform Baseline included by supported Presets, while physically implementing it through the minimum dependency-layered Platform Libraries needed to preserve architecture. Templates compose those references automatically, so package boundaries do not become user decisions.

Create a package only when it owns cohesive reusable behavior, hides meaningful complexity, and has a distinct dependency, provider, runtime, or distribution boundary. Keep application-specific architecture as generated source. Use a synchronized release train initially and no mandatory convenience metapackage.

## Rationale

Many concerns are present in even small MartiX applications, so exposing each as a user-selected library would add noise. However, placing core application types, ASP.NET Core, and EF Core in one assembly would force lower layers to reference infrastructure frameworks and weaken dependency rules.

The practical compromise is an automatic baseline that feels cohesive to users but retains a small physical layering such as core behavior, ASP.NET Core integration, EF Core integration, and analyzers. Optional providers remain isolated.

## Alternatives considered

- Preserve one all-inclusive `MartiX.WebApi` package. Rejected because all consumers inherit unrelated dependencies and compatibility constraints.
- Turn every existing folder into a package. Rejected because it creates shallow packages, release overhead, and discovery burden.
- Require users to assemble focused packages manually. Rejected because the Template System should own supported composition.

## Evidence

The current `MartiX.WebApi` package requires `Microsoft.AspNetCore.App` and HTTP resilience while containing results, domain primitives, Blazor client code, caching, outbox, security, versioning, and multiple pseudo-integrations. The non-packable EF Core project depends back on that complete package.
