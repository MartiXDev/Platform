---
title: Design the generated solution and Business Module topology
status: closed
type: wayfinder:prototype
parent: ../map.md
claimed_by:
resolved: 2026-07-17
blocked_by:
  - 101-compare-platform-sources.md
  - 104-capability-preset-matrix.md
---

## Question

What concrete project tree, reference graph, composition root, Module Contract shape, and vertical-slice layout best enforce the agreed Modular Monolith architecture without unnecessary projects or abstractions?

## Resolution

Generate a Modular Monolith as one deployable backend with one API host, one required one-shot migrator, and exactly one assembly per genuine Business Module. Organize each module by vertical use-case slices behind an internal Domain and deliberate public Contracts namespace. Do not turn architectural layers, slices, or Contracts into projects without a concrete compilation, executable, toolchain, dependency, or deployment force.

The disposable topology explorer was reviewed interactively with the user across Preset, module-count, communication, UI, naming, composition, testing, and documentation variations. Its accepted conclusions are absorbed below; the prototype implementation was not production scaffolding and was removed when this ticket closed.

### Canonical generated trees

For complete input `name=MartiX.Planner`, the default three-module `modular-monolith` shape is:

```text
MartiX.Planner.slnx
README.md
AGENTS.md
CONTEXT.md
martix.platform.json
global.json
Directory.Build.props
Directory.Packages.props
.editorconfig
docs/
  architecture/
    README.md
    decisions/
src/
  MartiX.Planner.Api/
    Program.cs
  MartiX.Planner.Migrator/
    Program.cs
  MartiX.Planner.Orders/
    Contracts/
      ModuleContracts/
      IntegrationEvents/
    Domain/
    Features/<Operation>/
    Infrastructure/
      Persistence/
      Integrations/
    OrdersModule.cs
  MartiX.Planner.Billing/
  MartiX.Planner.Notifications/
tests/
  MartiX.Planner.Tests/
```

This example has five production projects. The `full-stack` Preset adds exactly `src/MartiX.Planner.Web/` for the explicitly selected React, Blazor Web App, or Vue provider. The persistence-free `api` Preset instead has only `src/MartiX.Planner.Api/`, using `Features/<Operation>/` with optional `Domain/` and selected `Infrastructure/`; selecting relational persistence adds `MartiX.Planner.Migrator`. Generation omits directories whose selected solution has no contents.

### Minimum-project posture

Generate only projects that provide a necessary compilation, executable, dependency, toolchain, or deployment boundary. Do not translate architectural layers or directory names mechanically into projects. Begin consolidated and split only when a concrete force cannot be enforced cleanly inside the existing project.

The `api` Preset has one production project. The default modular Presets have one API host, one required one-shot migrator, and one production project per Business Module. A three-module Modular Monolith therefore has five production projects rather than eight or fourteen.

Each Business Module project owns a deliberately public `Contracts` namespace plus internal Domain, Features, and Infrastructure. Its public composition entry point allows the API host and migrator to register the module. Cross-module references may use only the owning module's Contracts namespace; `internal` visibility, analyzers, and architecture tests enforce the rule.

Do not generate a separate Contracts assembly for every Business Module. Introduce one only when a concrete module needs independently distributed or versioned contracts, an extraction boundary, or a consumer that must avoid the module runtime's provider dependencies.

**Why:** a separate runtime assembly per Business Module gives compiler-enforced protection for its internal model and infrastructure. A second assembly for its public contracts improves physical isolation but is not necessary for the default in-process modular monolith and would double project count. Evidence-driven extraction preserves KISS without reducing the required module boundary to folders inside one shared application assembly.

### Business Module internal layout

Each Business Module project is feature-first:

- `Contracts/ModuleContracts` owns small synchronous Interfaces and their DTOs;
- `Contracts/IntegrationEvents` owns versioned public event schemas;
- `Domain` owns the internal domain model and Domain Events shared across operations;
- `Features/<Operation>` owns endpoint, request/response contracts, Application Operation, explicit mapping, and feature-specific transport validation;
- `Infrastructure/Persistence` owns the module context, configurations, and migrations when persistence is selected;
- `Infrastructure/Integrations` owns selected external Adapters;
- `<ModuleName>Module.cs` is the module's public composition entry point.

Only deliberate Contracts types and the composition entry point are public. Domain, Features, Infrastructure, endpoints, operations, EF Core types, and Adapters are internal. Queries remain feature-local unless repeated complexity proves a deep reusable module. Do not generate `Application`, `Presentation`, `Services`, `Repositories`, `Common`, or `Shared` folders. Do not generate empty directories or placeholder files.

**Why:** vertical slices localize operation change, while a module-level Domain retains aggregate invariants shared across several operations and module-level Infrastructure owns real provider lifecycles. Folder structure communicates ownership without multiplying projects or inventing layers with no behavior.

### Endpoint and Application Operation seam

Every business use case, including initially simple CRUD behavior, has a thin HTTP endpoint and a separate internal sealed Application Operation in the same `Features/<Operation>` slice. The endpoint owns HTTP binding, authorization metadata, transport validation, typed success responses, and translation of expected Application Result failures to HTTP. The Application Operation owns use-case orchestration, Domain calls, persistence interaction, expected transport-independent Application Results, and cancellation.

Register the concrete Application Operation directly in dependency injection and inject its dependencies through its constructor. Do not generate an interface merely to wrap one implementation. Do not introduce mediator request/handler types, generic dispatch, pipeline behaviors, base endpoint or operation classes, or service-location. The consolidated `<name>.Tests` assembly receives deliberate internal visibility so tests can exercise operations directly; host tests verify the real HTTP contract. Platform and infrastructure-only endpoints such as health checks do not require an Application Operation because they are not business use cases.

**Why:** the explicit seam prevents HTTP concerns from becoming the application model and keeps each use case callable and testable independently of its current transport. One purposeful operation class adds no project or speculative polymorphism, while a uniform rule removes subjective "too simple to separate" decisions that humans and lower-cost implementation agents would otherwise apply inconsistently.

### Explicit composition roots

`<name>.Api/Program.cs` is the API composition root and explicitly names every selected Platform registration, middleware stage, Business Module registration, and module endpoint mapping in deterministic order. It does not call a broad `AddPlatformBaseline()`, `AddApplicationModules()`, or equivalent hidden-default method. The Capability Manifest and generated source agree exactly.

Each Business Module exposes one public static `<ModuleName>Module` composition type. `AddServices(...)` registers only that module and validates its configuration; `MapEndpoints(...)` creates its route group and maps its endpoints. Exact migration-focused composition is defined by the persistence ticket. These methods contain composition only, never business behavior. Duplicate or conflicting registration fails deterministically.

There is no `IModule`, assembly scanning, reflection discovery, marker interface, service locator, or ordering by convention. Module source and `Program.cs` use direct calls that a human or agent can find and trace.

**Why:** explicit composition is AOT-safe, debuggable, and faithful to the resolved Capability Manifest. It makes selected modules, security middleware, and ordering reviewable without requiring an implementation agent to infer runtime discovery behavior.

### Exact project-reference graph and test visibility

The API host directly references every selected Business Module project and `MartiX.Platform.AspNetCore`. Each Business Module references the framework-independent `MartiX.Platform` kernel and, because transport endpoints are colocated with their Application Operations, `MartiX.Platform.AspNetCore`. When the FastEndpoints provider is selected, only affected host and module projects additionally consume `MartiX.Platform.AspNetCore.FastEndpoints`; otherwise that adapter and its dependencies are absent.

The migrator directly references every selected persistent Business Module and only the framework-independent Platform primitives it needs. It never references the API host or UI. The UI has no .NET or package-level reference to a backend project and consumes only the published HTTP and OpenAPI contract. Cross-module project references follow the accepted Contracts-only acyclic rule.

The single `<name>.Tests` project references every .NET project it verifies. Each generated production assembly grants `InternalsVisibleTo` only to the exact `<name>.Tests` assembly. Production assemblies never grant internal visibility to another Business Module, the API host, the migrator, or a dynamic-proxy assembly. `MartiX.Platform.Analyzers` is supplied only as a build-time analyzer dependency and never as a runtime reference.

**Why:** explicit references make runtime composition and change impact inspectable, while the absence of `Api` and UI back-references preserves the serving and transport boundaries. A single exact test friend assembly permits direct TDD of internal operations and architecture without widening production APIs. Build-time analyzers enforce policy without contaminating the runtime graph.

### Synchronous Module Contracts

The providing Business Module owns small cohesive use-case-oriented Interfaces and immutable DTOs under its public `<name>.<ModuleName>.Contracts` namespace. Avoid broad `I<ModuleName>Module`, `IModuleClient`, generic `Send<TRequest,TResponse>()`, and mechanical one-method-interface generation. Group operations only when they form one deep contract with the same policy and lifecycle.

Contracts use `Task` by default, explicit `CancellationToken`, and transport-independent Application Results when expected rejection must cross the seam. They never expose entities, aggregates, EF Core, `IQueryable`, repositories, transactions, HTTP, or provider types. The module's implementation is internal and registered explicitly by its composition entry point. Architecture tests reject consumers referencing any non-Contracts namespace of another Business Module.

Use a synchronous Module Contract only when the consumer requires an immediate response or consistency decision. Independent reactions use Integration Events.

**Why:** provider-owned contracts keep meaning and change authority with the Business Module that supplies the behavior. Small cohesive Interfaces create a real test and substitution seam without a mediator, god facade, or leakage of internal persistence and domain models.

### Business Module reference graph

The API host and migrator reference every selected Business Module project directly. A Business Module may reference another Business Module project only when it consumes that provider's public Contracts namespace. Analyzers and architecture tests reject all access to another module's Domain, Features, Infrastructure, composition entry point, and other implementation namespaces.

Business Module dependencies must form a directed acyclic graph. Bidirectional synchronous dependencies are prohibited. Resolve pressure for a reverse edge by correcting capability and data ownership, replacing an independent reaction with an Integration Event, or extracting a genuinely independent domain concept with explicit ownership. Do not create a generic `Shared` project, move internals into common code, or add separate Contracts assemblies merely to make a circular design compile.

For example, `MartiX.Planner.Billing` may reference `MartiX.Planner.Orders` to consume `MartiX.Planner.Orders.Contracts`. If Orders would also need a synchronous Billing Contract, generation or architecture verification rejects the cycle and requires redesign.

**Why:** an acyclic graph keeps module initialization, testing, extraction, and change impact understandable. Contracts-only access protects semantic ownership even though the default minimum-project topology places public contracts and internal implementation in one assembly. A separate Contracts assembly can hide source-level cycles without removing the underlying coupled domain model, so it is not a valid cycle-breaking mechanism.

### Integration Event source topology

The publishing Business Module owns each immutable public event schema under `<name>.<Publisher>.Contracts.IntegrationEvents`. Integration Events describe completed facts and use past-tense domain names such as `OrderSubmitted`. A consumer references the publisher's Business Module project and consumes that exact schema; it does not copy, redefine, or take ownership of the publisher's fact. The consumer's handler and reaction logic are internal and live in its relevant feature slice.

The API composition root registers every selected subscription explicitly. Do not use assembly scanning or runtime discovery. Do not generate a global `IntegrationEvents`, `Messages`, `BuildingBlocks`, or `Shared.Contracts` project. An event-schema project reference is a Business Module dependency and must obey the accepted directed acyclic graph.

This topology decision does not prescribe the transport envelope, outbox and inbox algorithms, delivery guarantees, retry and poison-message policy, or schema-evolution rules; the dedicated Integration Events ticket owns those decisions.

**Why:** publisher ownership gives one authoritative meaning to a completed fact, while direct schema consumption preserves strong typing and discoverability. Explicit references and subscriptions expose architectural coupling for review. Asynchronous transport must not conceal a cyclic domain design, and a global contracts project would become an ownerless coupling surface.

### Test-project topology

Generate one consolidated .NET test project by default. Organize module unit tests, architecture rules, host tests, persistence/provider integration tests, migration tests, and compatibility checks by folder and TUnit category, with filtered commands providing fast feedback lanes.

Split testing into another project only for an incompatible toolchain or target framework, selected browser ecosystem, executable Native AOT/publish fixture, dependency conflict, or demonstrated CI-isolation benefit that filtering cannot provide. Do not create a test project per Business Module or architectural test layer by convention.

**Why:** TDD and layered verification are behavior and execution requirements, not project-count requirements. One project minimizes build graph and dependency maintenance while TUnit filtering preserves focused runs; a new project remains a cheap later change when a concrete isolation force appears.

### One-shot migrator boundary

Keep the project derived as `<name>.Migrator` as a separate executable whenever relational persistence is selected. For example, complete template input `name=MartiX.Planner` produces `MartiX.Planner.Migrator`; `<name>` is notation for the mandatory complete template input, not literal generated text. The API never applies schema changes during startup. Deployment runs the migrator before shifting traffic, may grant it DDL credentials while keeping API credentials least-privileged, and stops safely when migration fails. Business Modules own their migration code; the migrator owns only explicit composition and ordering. Local development, CI, optional orchestration, and production use the same lifecycle and same-commit immutable artifacts.

The persistence-free `api` Preset omits the migrator. Selecting relational persistence adds it; modular Presets require it.

**Why:** an `Api migrate` mode would save one project but place privileged operational behavior and conditional startup paths in the serving artifact. The separate executable is justified by a real deployment, process, and database-privilege boundary rather than by an architectural layer.

### Agent-explicit naming and examples

Normative documentation never uses an unexplained fictional company or product name as though it were a replacement token. The template requires the complete `name`, including its explicit company prefix; it never prepends or infers a company. The input must be a valid dot-separated .NET namespace whose segments are non-keyword C# identifiers. Invalid input fails instead of being silently normalized. The exact input becomes the solution filename, root namespace, and project prefix.

A normative example states complete input and exact output. Input `name=MartiX.Planner` produces `MartiX.Planner.slnx`, `MartiX.Planner.Api`, `MartiX.Planner.Migrator`, `MartiX.Planner.Orders`, and `MartiX.Planner.Tests` when those projects are selected. Business Module projects do not add a redundant `.Modules.` namespace segment. Template verification asserts that no source-name token or fixture identity remains in generated files.

Prototype and template-verification artifacts use the concrete fixture identity `MartiX.TemplateTestApp`, which is never a template default. Symbolic notation such as `<name>` may appear only when its source, validation, transformation, and literal-output prohibition are defined in the same section.

`MartiX` is the only company name used in canonical examples, fixtures, and generated-namespace demonstrations. Do not use personal names or fictional companies as alternative company prefixes.

Production projects are flat beneath `src/`, with directory, project, assembly, and root namespace names aligned. For `name=MartiX.Planner`, modules are `src/MartiX.Planner.Orders/` and `src/MartiX.Planner.Billing/`; there is no `src/Modules/` grouping and no `.Modules.` namespace segment.

**Why:** one deterministic path removes translation between folder, project, and namespace conventions. The project name already communicates solution and module ownership, so another grouping layer adds navigation but no enforceable boundary.

**Why:** implementation may be delegated to a less capable agent. It must never infer whether a sample name is literal, replaceable, branded, or copied into production. Exact inputs, outputs, manifests, and executable generation assertions turn naming prose into an unambiguous contract.

### Generated repository governance and decision history

Every Generated Solution contains these root artifacts:

- `<name>.slnx`;
- `README.md` as the human entry point for prerequisites, startup, migration, testing, and documentation links;
- `AGENTS.md` as concise authoritative instructions for humans and LLM agents, including commands, boundaries, conventions, quality gates, and links;
- `CONTEXT.md` for ubiquitous language, business concepts, actors, invariants, and unresolved domain ambiguity;
- `martix.platform.json` as the machine-readable resolved Preset, provider, Platform Contract Version, schema version, Capability Manifest, and applied Platform Migration ledger;
- `global.json`, `Directory.Build.props`, `Directory.Packages.props`, and `.editorconfig` for genuinely repository-wide SDK, build, package, analyzer, and formatting policy;
- `docs/architecture/README.md` for the current architecture and dependency rules;
- `docs/architecture/decisions/` for immutable Architecture Decision Records.

Each ADR records context, considered options, the chosen decision, reasons, consequences, status, and any later superseding ADR. ADRs are the canonical historical record of architectural WHAT and WHY. `AGENTS.md` links to them but must not become an architectural diary. `CONTEXT.md` contains domain language rather than implementation history. Generation and verification consume `martix.platform.json`; human prose is not a substitute for the exact resolved manifest.

Generate `eng/`, deployment directories, and provider-specific configuration only when a selected Capability needs them. Do not emit empty preparedness folders. Central build files contain only rules shared by all applicable .NET projects; provider- or project-specific settings remain with their owner.

**Why:** operational agent guidance, domain knowledge, current architecture, machine configuration, and historical rationale change for different reasons and require different authorities. Separating them gives lower-cost implementation agents explicit instructions without losing durable decision context or allowing prose and generated configuration to drift silently.

### Optional UI project boundary

UI remains an explicit optional capability. Selecting `react`, `blazor-webapp`, or `vue` generates exactly one UI project or package at `src/<name>.Web/`; omitting UI generates no UI directory, dependencies, tests, or configuration. React and Blazor Web App are equal first-class choices. Vue is a supported secondary choice. Do not generate separate `Client` and `Server` projects or a frontend monorepo by default.

Every UI communicates exclusively through the API's published HTTP and OpenAPI contract. It never references Business Module assemblies or their in-process Contracts, including when the selected UI is Blazor. UI-specific unit and component tests remain with the selected UI toolchain. A cross-system browser-test project is generated only when that explicit capability is selected. A separately deployed Blazor WebAssembly client or another additional runtime may add a project later because it introduces a concrete toolchain and deployment boundary.

For `name=MartiX.Planner`, each provider uses the stable path `src/MartiX.Planner.Web/`, while its files and project metadata identify the selected provider. The providers are mutually exclusive within one generated solution; changing provider is regeneration or an intentional migration, not a runtime toggle.

**Why:** one project is the minimum real boundary required by the selected UI toolchain. The API-only dependency direction keeps presentation replaceable, protects module internals, and prevents Blazor from becoming a privileged coupling path unavailable to React or Vue. A stable derived path also lets automation operate without interpreting provider-specific directory names.

### Lean `api` Preset topology

The `api` Preset keeps all production application code in `src/<name>.Api/`. Business slices live in `Features/<Operation>/` and use the same thin-endpoint/internal-Application-Operation seam as modular Presets. Create `Domain/` only when multiple operations share genuine domain behavior. Selected provider code lives under `Infrastructure/Persistence/` or `Infrastructure/Integrations/`; absent capabilities do not leave empty directories.

`Program.cs` explicitly composes selected Platform Capabilities and feature endpoints. Do not generate Business Module composition types, Module Contracts, Integration Events, simulated module folders, repositories, or provider-neutral persistence abstractions. Everything is internal except deliberately published HTTP schemas. The consolidated `<name>.Tests` project receives deliberate internal visibility.

Without persistence, `api` has one production project. Selecting relational persistence adds the separate `<name>.Migrator` executable. If the application requires multiple Business Modules or reliable Integration Events, it must migrate to `modular-monolith`; it must not grow nominal module layers inside `<name>.Api`.

**Why:** `api` is valuable only while it remains a genuinely lean vertical-slice host and strong Native AOT candidate. Pre-creating modular abstractions would impose complexity without a compilation boundary, while the explicit migration threshold prevents the simple Preset from becoming an ungoverned monolith.
