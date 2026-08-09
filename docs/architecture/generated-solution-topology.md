# Generated Solution topology

> Status: **Approved target with Implemented Lean API and Modular Monolith
> composition slices**. The two named fixtures remain acceptance seams; neither
> is a Supported Capability claim.

## Canonical generated shape

For complete template input `name=MartiX.Planner`, the default three-module
`modular-monolith` shape is:

```text
MartiX.Planner.slnx
README.md
AGENTS.md
CONTEXT.md
martix.platform.json
contracts/openapi-v1.json
global.json
Directory.Build.props
Directory.Packages.props
.editorconfig
docs/architecture/README.md
docs/architecture/decisions/
src/
  MartiX.Planner.Api/
  MartiX.Planner.Client/
  MartiX.Planner.Migrator/
  MartiX.Planner.Orders/
  MartiX.Planner.Billing/
  MartiX.Planner.Notifications/
tests/MartiX.Planner.Tests/
```

This is six production projects: one API host, one standalone generated client,
one required one-shot Migrator, and one project per genuine Business Module.
`full-stack` adds
exactly `src/MartiX.Planner.Web/` for the selected UI provider. A persistence-
free `api` has only `src/MartiX.Planner.Api/`; relational persistence adds the
Migrator. Empty directories and placeholder projects are not generated.

The implemented Lean API slice generates the smaller shape below:

```text
<name>.slnx
README.md
AGENTS.md
CONTEXT.md
martix.platform.json
contracts/openapi-v1.json
src/
  <name>.Api/
  <name>.Client/
tests/
  <name>.Tests/
```

Its manifest records the `api` Preset, the fourteen Platform baseline Capabilities,
the canonical origin, and the Platform and manifest contract versions. The API
composition root explicitly registers the Kernel adapter, OpenAPI contract,
exception handling, and health endpoint. The generated test-owned conformance
slice exercises typed Kernel results, every expected failure category, safe
unexpected-failure redaction, and OpenAPI metadata.

The implemented Modular Monolith composition slice is generated with:

```text
node eng/generate-modular-monolith.mjs \
  --name MartiX.Planner \
  --module Orders \
  --module Billing \
  --module-dependency Billing:Orders \
  --output ./generated
```

It requires at least one genuine Business Module and emits one API host, one
one-shot Migrator, one project per module, and one consolidated TUnit project.
The API calls every module's `AddServices` and `MapEndpoints` entry point
directly. A module-to-module edge is a project reference consumed through the
provider's `Contracts.ModuleContracts` namespace; the generator rejects cycles
before writing.

## Project boundaries

| Project | Owns | Must not own |
| --- | --- | --- |
| `<name>.Api` | Host composition, middleware, HTTP endpoints, selected module registration, and transport policy | Database migration execution or hidden module discovery |
| `<name>.Migrator` | Explicit provider/module composition and `validate`, `script`, and `apply` migration operations | HTTP traffic, business serving, or application startup migration |
| `<name>.<Module>` | Module Contracts, Domain, feature slices, persistence, integrations, and composition entry point | Another module's internals, global shared business state, or transport-independent provider leakage |
| `<name>.Web` | One selected Application UI provider and generated HTTP client usage | Any backend project or in-process Module Contract |
| `<name>.Tests` | Consolidated TUnit, architecture, host, provider, migration, compatibility, and conformance evidence | Shared mutable fixture state or test-only production abstractions |

Split a project only for a real compilation, executable, dependency,
toolchain, versioning, or deployment boundary. Architectural layers, feature
slices, and test categories remain directories or test filters by default.

## Business Module shape

Each Business Module is feature-first and owns one assembly:

```text
Contracts/
  ModuleContracts/
  IntegrationEvents/
Domain/
Features/<Operation>/
Infrastructure/
  Persistence/
  Integrations/
<ModuleName>Module.cs
```

Only deliberate Contracts and the static composition entry point are public.
Domain, Features, endpoints, Application Operations, contexts, migrations,
and Adapters are internal. A module owns its aggregates, invariants, Domain
Events, persistence model, migrations, public synchronous contracts, and
published Integration Event facts.

Cross-module synchronous dependencies consume only the provider-owned cohesive
Module Contracts and immutable DTOs. The project graph is acyclic. Do not add a
global `Shared.Contracts` project or copy a publisher's Integration Event
schema into a consumer.

## Application Operation and composition seams

Every business use case has a thin endpoint and an internal sealed Application
Operation in the same feature slice. The endpoint owns binding, transport
validation, authorization metadata, typed success responses, and adaptation of
expected failures. The Application Operation owns use-case orchestration,
Domain calls, persistence, cancellation, and transport-independent Application
Results.

The API composition root explicitly calls every selected Platform registration,
middleware stage, module `AddServices`, module `MapEndpoints`, and provider
registration in deterministic order. There is no module scanning, reflection
discovery, generic `IModule`, mediator request/handler, service locator, or
one-implementation interface.

## Persistence and migration boundary

The `modular-monolith` and `full-stack` Presets use one relational database per
Generated Solution. Each persistent Business Module owns one internal
`DbContext`, schema, tables, configurations, indexes, constraints, and EF Core
migrations. One selected provider is used throughout a solution; PostgreSQL is
the default and SQL Server is an equally verified choice.

Application Operations use their module's concrete `DbContext` directly. The
EF Core Platform package supplies only deep reusable policy such as immutable
query Specifications, UTC entity timestamps, concurrency tokens, and portable
database naming. The generated module owns an internal context, explicit model,
lowercase
`snake_case` schema/table identifiers, migration, and model snapshot under
`Infrastructure/Persistence`. It does not own application Entities in the
Platform package, repositories, units of work, module migrations, or provider
selection. Specifications are sealed read-query descriptions; applying one
returns `IQueryable` and leaves asynchronous materialization to the operation.

The Migrator is the only production schema-change path and runs before traffic.
It composes each module sequentially with separate `MigrationDatabase`
configuration and exposes exactly `validate`, `script`, and `apply`. The API
uses its normal `Database` configuration for runtime access but never calls
`Migrate`, `EnsureCreated`, or implicit startup seeding.
The lean `api` Preset keeps its optional context and migrations in the API
project while still using a separate Migrator when persistence is selected.

## Reliable event boundary

Modular Presets use durable in-process Integration Event delivery by default:

1. Business changes and the immutable Outbox Message commit atomically.
2. A per-Subscription Delivery Attempt is leased and fenced.
3. A versioned envelope crosses the selected transport seam.
4. The consumer Inbox Receipt and its database effects commit atomically.
5. Acknowledgement follows consumer commit.

The contract is observable at-least-once delivery with exactly-once Business
Effect only where Inbox or idempotency transactions prove it. It does not
promise exactly-once transport, global ordering, or duplicate-free delivery.
RabbitMQ is an optional transport and never replaces Outbox/Inbox. Webhooks,
Durable Jobs, notifications, and real-time delivery remain separate protocols.

## HTTP, identity, security, and UI

Minimal APIs are canonical. An optional FastEndpoints provider must preserve
black-box behavioral parity. Endpoints use explicit URL major versions, typed
success DTOs, OpenAPI 3.1, and one RFC 9457 Problem Details contract with stable
Application Error codes. The generated OpenAPI document is authoritative and
the standalone client project consumes only that document; neither may become a
second backend or Module Contract seam. Kernel Result types never become wire
payloads.

Authentication is optional and separate from authorization. The API and Modular
Monolith generators record an explicit, secret-free Authentication Profile:
`none`, local `identity:interactive`, generic OIDC interactive or bearer, and
Microsoft Entra interactive, delegated, or application flows. `none` remains
the default; ambiguous provider-only selections are rejected. Local Identity
is available only in the relational Modular Monolith and its ASP.NET Identity
schema is executed through the API-owned boundary by the one-shot Migrator.

Business code consumes an immutable provider-independent Actor snapshot and
stable Permission values, not `ClaimsPrincipal`, provider user types, email, or
subject identifiers. Generated authorization maps issuer-plus-subject
coordinates and permission claims into the Kernel `ActorContext`; transport
policies and application permission checks both fail closed. The optional
`IActorRegistry` contract can replace deterministic resolution when durable
local attribution is required. Audit events are distinct from logs and Entity
Change History.

`full-stack` selects exactly one UI provider: Blazor Web App, React, or Vue.
The UI consumes only HTTP/OpenAPI through deterministic generated clients and
has no reference to backend assemblies, even when the UI is Blazor. Provider
implementations share one behavioral UI contract for accessibility,
localization readiness, theme readiness, identity/session behavior, and
browser evidence.

### Shared UI Capability Contract

The Full Stack Preset records one `ui` manifest object and exactly one selected
`application-ui` provider. The provider-neutral contract is emitted as
`contracts/ui-capability-v1.json`; it does not contain product journeys or
business-module DTOs. Every provider exposes the same seams:

- checked-in OpenAPI clients and RFC 9457 Problem Details;
- server-owned BFF sessions with anonymous, authenticated, denied, and expired
  states, without browser access or refresh-token persistence;
- authorization state mapping and explicit loading, empty, validation, error,
  offline, reconnecting, and stale-data states;
- semantic HTML, keyboard and focus behavior, reduced motion, forced colors,
  RTL, and responsive accessibility evidence;
- invariant localization keys and semantic Fluent-style design tokens for
  light, dark, and system themes.

`evidence/ui/` records browser, build, client, security, deployment, and
observability checks for the selected provider. React and Vue use the isolated
TypeScript client profile; Blazor uses the isolated C# client profile. The UI
project has no backend project reference or in-process Business Module access.
API and Modular Monolith Presets remain UI-free.

## Deployment boundary

Process and OCI artifacts are equal immutable Deployment Profiles built from
the same source and contracts. A versioned Deployment Manifest describes
logical resources, readiness, persistence, migration order, ports, topology,
and external secret delivery. Process execution, optional local orchestration,
bounded single-host Compose, and future cloud promotion are projections of
that manifest rather than separate architecture sources.

The named `DeploymentManifestGeneratedSolution` acceptance fixture records this
topology in `deployment-manifest.json` and immutable lifecycle evidence in
`deployment-evidence.json`. Its process/archive and container/OCI artifacts
share source revision, Platform Contract Version, runtime, operating system,
topology, and configuration-schema identity. Promotion and rollback consume
those digests without rebuilding; unsupported topology, embedded build steps,
secret values, and projection drift fail closed.

Direct local execution remains universal. Aspire, containers, Compose, and
cloud-specific infrastructure are explicit capabilities. Secrets enter through
deployment-specific adapters and never appear in source, manifests, logs, or
command-line examples.

## Decision sources

- [Generated Solution topology](../wayfinder/martix-platform/tickets/106-generated-solution-topology.md)
- [Persistence and migrations](../wayfinder/martix-platform/tickets/107-persistence-and-migrations.md)
- [Integration Event delivery](../wayfinder/martix-platform/tickets/109-integration-event-delivery.md)
- [HTTP contract policy](../wayfinder/martix-platform/tickets/110-http-contract-policy.md)
- [Identity provider matrix](../wayfinder/martix-platform/tickets/108-identity-provider-matrix.md)
- [Security and observability baseline](../wayfinder/martix-platform/tickets/111-security-observability-baseline.md)
- [UI provider architecture](../wayfinder/martix-platform/tickets/118-ui-provider-architecture.md)
- [Development and deployment profiles](../wayfinder/martix-platform/tickets/120-development-deployment-profiles.md)
