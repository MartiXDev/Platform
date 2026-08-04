# MartiX Platform target architecture

> Status: **Approved target**. This page describes intended composition and
> ownership. It does not change the bootstrap manifest or make a Supported
> Capability claim.

## Scope

MartiX Platform is the .NET 10+ foundation for greenfield MartiX
applications. It combines reusable Platform Libraries, one composable Template
System, Generated Solution governance, executable quality policy, Platform
Migrations, and agent guidance.

Generated Solutions own their source after generation. The Template System is
not reapplied over application code. The Platform stays small by admitting
deep, verified contracts and explicit providers instead of bundling every
possible infrastructure concern.

## Governing rules

- Prefer composition over inheritance and direct calls over discovery.
- Keep public APIs small, stable, sealed by default, and owned by the package
  or Business Module that gives them meaning.
- Make dependency direction and selected infrastructure visible in generated
  source.
- Reject Invalid Combinations before generation and emit no unselected
  packages, projects, configuration, registrations, or deployment resources.
- Treat security, performance, accessibility, operability, and compatibility
  as executable contracts rather than informal guidance.

## Platform Library topology

The target package family uses `MartiX.Platform.*` identities and keeps each
runtime package aligned with one runtime assembly.

| Artifact | Target responsibility | Target admission |
| --- | --- | --- |
| `MartiX.Platform` | BCL-only Kernel, including Application Result/Error and baseline Security Audit Event semantics | Platform Baseline; Result/Error is Implemented |
| `MartiX.Platform.AspNetCore` | ASP.NET Core adaptation, safe Problem Details, and exception translation | Platform Baseline; failure adapter implemented |
| `MartiX.Platform.Analyzers` | Compile-time architecture and contract enforcement | Platform Baseline build asset; Implemented |
| `MartiX.Platform.EntityFrameworkCore` | Deep EF Core Specifications, Entity Capabilities, naming, and reliable persistence policy | Relational Persistence capability; Approved target |
| `MartiX.Platform.AspNetCore.FastEndpoints` | Alternative endpoint-framework Adapter with behavioral parity | Optional provider; Approved target, not the canonical endpoint model |
| `MartiX.Platform.IntegrationEvents.RabbitMq` | RabbitMQ transport over the Outbox/Inbox protocol | Optional provider; admission requires provider evidence |
| `MartiX.Platform.Templates` | Composable `martix-app` template distribution | Tooling distribution; Approved target |
| `MartiX.Platform.Tool` | Exact-version generation, inspection, migration, and agent-context operations | Tooling distribution; Approved target |

The Kernel has no hosting, dependency injection, JSON, ASP.NET Core, EF Core,
or third-party dependency. Generated application source owns composition,
middleware order, endpoints, options, actor policy, and application behavior.
No broad `AddDefaults` method, assembly scan, service locator, or hidden startup
hook is part of the target.

## Presets

One Template System exposes `martix-app` and three named Presets:

| Preset | Shape | Primary posture |
| --- | --- | --- |
| `api` | One lean ASP.NET Core host; persistence is absent by default | Focused HTTP workloads and the primary Native AOT candidate |
| `modular-monolith` | API, one-shot Migrator, Business Modules, relational persistence, and durable Outbox/Inbox | Default production starting point |
| `full-stack` | `modular-monolith` plus exactly one Application UI provider | Web products with Blazor Web App, React, or Vue |

The Platform Baseline is present in every Preset. It supplies the Kernel
semantics, direct Application Operations, cancellation and time seams, actor
and authorization seams, Minimal API foundation, OpenAPI, safe failure
handling, startup validation, host security, vendor-neutral telemetry,
health/readiness, analyzers, documentation, TUnit, and the Capability Manifest.

The Baseline does not silently select EF Core, a database, authentication, UI,
cache, broker, jobs, Aspire, containers, exporters, FastEndpoints, or cloud
services. `full-stack` requires one explicit UI provider; `api` remains lean
and does not simulate Business Modules or reliable Integration Events.

## Capability composition

The Capability Matrix is the source of truth for generation. A selection records
its Preset, Capabilities, providers, prerequisites, conflicts, package effects,
deployment effects, compatibility axes, and verification evidence in the
Generated Solution's `martix.platform.json`.

Capabilities are classified as Required, Required with a default provider,
Required with an explicit provider, Optional Supported, Experimental, Deferred,
or Invalid. Presence and absence are both tested. A provider appearing in a
catalog is not a Supported claim until its complete Composed Quality Profile
passes for the declared matrix.

The initial target keeps these boundaries explicit:

- relational persistence is one selected provider per solution, with
  PostgreSQL as the default and SQL Server as an equally verified choice;
- Business Modules own their contexts, schemas, migrations, Domain Events, and
  Integration Event facts;
- durable Integration Event delivery uses transactional Outbox/Inbox semantics
  and at-least-once delivery, even when the transport is in-process;
- authentication is optional and separate from authorization, with business
  code consuming a provider-independent Actor and permission policy;
- Application UI is a single provider project that consumes HTTP/OpenAPI only;
  and
- provider configuration, deployment, and observability remain explicit rather
  than becoming hidden Platform infrastructure.

## Ownership and dependency direction

The target dependency direction is outward from generated application code to
selected Platform adapters and providers:

```text
Generated Solution
  -> selected Platform adapter/provider
  -> capability protocol, when one exists
  -> MartiX.Platform Kernel, when the protocol uses Kernel contracts

MartiX.Platform.AspNetCore -> MartiX.Platform
MartiX.Platform.EntityFrameworkCore -> EF Core
Business Module -> its own infrastructure and selected Platform contracts
UI -> HTTP/OpenAPI only
```

The Kernel never depends on ASP.NET Core, EF Core, identity, UI, or a provider.
Business Modules expose only deliberate Module Contracts and versioned
Integration Event schemas. Cross-module synchronous references are
Contracts-only and acyclic; independent reactions use Integration Events.

## Deferred and invalid scope

Native mobile is a future optional consumer, not a browser UI substitute. Its
provider topology, authentication, offline/synchronization, push, device
trust, store delivery, and physical-device quality profile remain unresolved
and parked. See [the native mobile conformance lab](../wayfinder/martix-platform/tickets/132-native-mobile-conformance-lab.md).

The target also defers multi-tenancy, microservices extraction,
Kubernetes/Helm, cloud-specific infrastructure as code, event sourcing,
sagas, workflows, streaming platforms, GraphQL, gRPC, non-relational primary
storage, production SQLite, and a mandatory plugin or MCP layer.

Invalid defaults include hidden infrastructure, universal repositories or
units of work, universal base entities, mandatory mediator or validation
frameworks, bundled Business Modules, template reapplication, process-local
correctness state, and secrets in source or manifests.

## Decision sources

- [Capability and Preset matrix](../wayfinder/martix-platform/tickets/104-capability-preset-matrix.md)
- [Platform Library topology](../wayfinder/martix-platform/tickets/105-platform-library-topology.md)
- [Approved implementation blueprint](../wayfinder/martix-platform/platform-blueprint.md)
- [Prioritized implementation roadmap](../wayfinder/martix-platform/migration-roadmap.md)
