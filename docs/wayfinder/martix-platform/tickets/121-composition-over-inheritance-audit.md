---
title: Audit accepted decisions for composition over inheritance
status: closed
type: wayfinder:grilling
parent: ../map.md
claimed_by:
resolved: 2026-07-17
blocked_by:
  - 107-persistence-and-migrations.md
---

## Question

Which accepted Platform and Generated Solution decisions still assume base classes, inheritance hierarchies, or bundled entity capabilities, and which should be revised to explicit composition or small capability Interfaces without replacing useful inheritance with shallow marker, pass-through, or interface-per-class abstractions?

## Resolution

This in-progress audit compares the accepted target decisions with the active `MartiX.WebApi` inheritance and Interface surface. It distinguishes application-owned composition from inheritance required by a selected .NET or third-party framework extension model.

### Already removed or corrected by accepted decisions

- The current `EntityBase<TId> : HasDomainEventsBase` and equality implementation are not migrated. [Specify persistence ownership and migration operations](107-persistence-and-migrations.md) makes identity an Entity-owned strongly typed property and composes each admitted orthogonal Entity Capability independently.
- The current `HasDomainEventsBase` is not the target event model. Domain Event collection must use application-owned composition; its exact event-consumption lifecycle remains with [Specify Integration Event, outbox, and inbox semantics](109-integration-event-delivery.md).
- The current abstract `ValueObject` equality hierarchy is not migrated. Generated Domains use explicit value types, normally records or readonly record structs when their equality and storage semantics fit.
- The current `Result<T> : Result` hierarchy is not migrated. [Design the exact Platform Library topology](105-platform-library-topology.md) already specifies separate immutable sealed `Result` and `Result<T>` types with no public constructors or inheritance.
- The current `AppException` status hierarchy is deleted as the expected-failure model. Expected rejection uses Application Results, while genuine exceptions inherit from `Exception` only when their distinct catch semantics are required.
- Application Operations are internal sealed concrete types registered directly. Business Modules use static explicit composition roots rather than `IModule`, registrar bases, scanning, or service location.
- Module Contracts retain small provider-owned Interfaces only at genuine synchronous seams; they do not generate one Interface per operation or wrap a single concrete class merely for tests.
- Entity timestamp, Actor-tracking, and concurrency policies use admitted `IHas<Capability>` Interfaces because multiple unrelated Entity types compose the capability and a real EF Core policy consumes it. They are behavioral capability selectors, not markers or base-entity substitutes.
- Module `DbContext` model composition uses explicit manifests and `IEntityTypeConfiguration<TEntity>` implementations rather than a MartiX base context or assembly discovery.

### Framework inheritance that remains legitimate

Inheritance required to participate in a selected framework lifecycle is not replaced with a MartiX wrapper. Concrete module contexts inherit EF Core `DbContext`; EF interception policy inherits the applicable EF Core interceptor; genuine exceptions inherit `Exception`; the optional FastEndpoints provider uses its endpoint base types; and selected FluentValidation validators use `AbstractValidator<T>`. These types remain internal or provider-contained wherever possible, and business behavior is composed behind them rather than moved into reusable MartiX base classes.

**Why:** replacing required framework inheritance with a forwarding Interface would add another shallow layer without removing the underlying framework contract. The architectural concern is inheritance controlled by MartiX that bundles unrelated behavior or creates a public extension commitment, not language inheritance as such.

### Material inconsistency requiring a decision

[Specify persistence ownership and migration operations](107-persistence-and-migrations.md) retained `ISpecification<TEntity>` and a constrained `Specification<TEntity>` builder based on the current abstract-base pattern. The active implementation has exactly one implementation family: an abstract `Specification<T>` exposes protected mutation methods and the evaluator consumes its nearly identical `ISpecification<T>` state surface. This is both inheritance for reuse and a one-adapter Interface whose separate seam has not yet earned its cost.

### Accepted correction: immutable composed Specifications

Retain the refined direct-EF Specification Pattern, but amend its representation to one immutable sealed `Specification<TEntity>` with no public `ISpecification<TEntity>`, abstract base class, protected mutation surface, or subclassing. The type owns validated filter, include, type-safe ordering, and optional paging policies. Each composition operation returns a new valid Specification rather than mutating construction state.

Reusable query intent is named through feature-local factory methods or, only after cross-operation reuse exists, a cohesive Entity- or Aggregate-specific catalog such as `OrderSpecifications.OpenForCustomer(customerId)`. Do not create one wrapper class per named Specification or a global Specifications dumping ground. The Application Operation retains projection, asynchronous materialization, and cancellation ownership as decided in [Specify persistence ownership and migration operations](107-persistence-and-migrations.md).

The evaluator accepts the concrete sealed Specification because there is one governed representation and one EF Core evaluation engine. A public Interface may be reconsidered only when a second real representation with the same stable semantics exists; mocking or permitting callers to bypass construction invariants is not sufficient. Internal typed clauses or delegates may preserve navigation and ordering expression types without `object` boxing, reflection, `dynamic`, or public implementation types.

Construction rejects invalid paging, paging without stable total ordering, `ThenBy` without initial ordering, conflicting query policies, and null expressions rather than silently normalizing them. `And` and `Or` compose only filter expressions with parameter rebinding and return new Specifications; they never merge ordering, paging, tracking, or loading policies implicitly. Instances are safe to share after construction, but parameterized factories create fresh values and must not capture scoped services in cached static state.

This preserves the useful Anton-style behavior—named reusable query intent, predicate composition, type-safe ordering, deliberate includes, paging, one evaluator, and direct EF Core use without repositories—while replacing its inheritance mechanism. Benchmark representative construction and evaluation before optimizing immutable-state allocations; do not weaken the Interface based on assumed hot-path cost.

The current `MartiX.WebApi.Specifications.ISpecification<T>`, abstract `Specification<T>`, protected builder calls, `Expression<Func<T, object?>>` ordering, silent paging normalization, and `Expression.Invoke` composition are replaced rather than copied into `MartiX.Platform.EntityFrameworkCore`. Migration rewrites derived Specification classes as named factories and adds real PostgreSQL and SQL Server translation evidence.

**Why:** inheritance exists only to reuse builder mechanics, while the separate Interface mirrors the same state and has no second governed Adapter. One sealed value provides stronger invariants, less public compatibility surface, and composition without losing the Specification Pattern. Named factories preserve semantic discoverability without turning every query into a subclass or shallow wrapper type.

### Accepted correction: composed Domain Event ownership

Do not migrate `EntityBase<TId> : HasDomainEventsBase` or replace it with another Entity or Aggregate Root base. Domain Events are internal application-owned concepts rather than Platform Kernel contracts. Only an Aggregate Root that can actually raise Domain Events owns a private `DomainEventCollection` and explicitly implements its module's internal behavioral `IHasDomainEvents` Interface.

`DomainEventCollection` owns non-null admission, recorded order, read-only observation, and the later accepted atomic take or drain lifecycle. Domain behavior raises an event through the composed collection; callers never receive a mutable list. Child Entities express an aggregate-significant change through their Aggregate Root rather than receiving event storage automatically. An Aggregate Root with no events has no Interface, collection, or allocation.

The Interface exists because multiple unrelated Aggregate Roots may compose the Capability and the module persistence/outbox implementation is a real consumer. It is not a public marker, does not contain default implementation, and does not move behavior back into an inheritance hierarchy. [Specify Integration Event, outbox, and inbox semantics](109-integration-event-delivery.md) owns the exact event snapshot, outbox insertion, clear, retry, failed-save, and dispatch lifecycle and may refine the collection Interface without reintroducing a base class.

The active `HasDomainEventsBase`, its protected `RegisterDomainEvent(...)`, public `ClearDomainEvents()`, and the forced event list inherited by every `EntityBase<TId>` are removed. Migration introduces the collection only into Aggregates proven to raise Domain Events and rewrites their Domain methods explicitly.

**Why:** event recording is orthogonal stateful behavior, not part of Entity identity. A composed collection provides locality and testable invariants, while the internal capability Interface lets infrastructure discover only real event sources. Restricting ownership to Aggregate Roots preserves the consistency boundary and avoids allocations, mutable infrastructure methods, and event behavior on every Entity.

### Accepted correction: Entity identity and Value Object equality

Generated Domain Entities are internal sealed classes with a Domain-specific immutable strongly typed identifier such as `OrderId` or `CustomerId`. Do not generate `EntityBase<TId>`, a generic `EntityId<T>`, `IEntity`, `IHasId`, `IStronglyTypedId`, a universal ID converter, or another abstraction merely because every Entity has identity. The underlying ID representation belongs to the Domain and persistence decision; new general-purpose applications may prefer application-assigned UUID v7 identifiers, but this audit does not force one primitive on every Domain.

Entity object equality remains reference equality by default. Code compares Domain identity explicitly through strongly typed `Id` values and keys identity-indexed collections by those values, such as `Dictionary<OrderId, Order>` or `HashSet<OrderId>`. A specific sealed Entity may locally implement `IEquatable<TEntity>` only when the Domain genuinely uses object equality to mean identical persistent identity, its non-default ID is immutable and assigned before hash-based use, and focused tests prove the equality contract. Do not generate that Interface mechanically for every Entity.

Strong ID construction validates invalid primitive values at Domain and transport boundaries. Entity creation prevents an unusable default ID, and explicit EF Core configuration owns conversion, generation behavior, key mapping, and both-provider round-trip evidence. Do not use reflection-based global ID discovery. DTO, HTTP, persistence, and Domain mappings remain explicit at their owning seams.

Value Objects use explicit structural equality, normally a sealed record or readonly record struct when its invariants, allocation profile, and members fit generated equality. A complex Value Object may implement local `IEquatable<T>` directly. Do not migrate the current abstract `ValueObject` component-enumeration base. Collections, floating-point values, normalization, and other non-trivial members require deliberate equality rather than assuming record-generated member equality is semantically sufficient.

Do not generate Domain Entities as records: synthesized structural equality and nondestructive mutation semantics do not represent mutable identity-bearing objects. Tests assert Entity identity and observable state deliberately rather than depending on whole-object equality.

The active `EntityBase<TId>` is removed rather than repaired. Its equality currently permits unrelated derived Entity types sharing the same primitive ID type to compare equal, treats multiple default IDs as equal, and can change hash behavior if an ID changes after insertion into a hash collection. Strongly typed IDs plus explicit identity comparison eliminate those hidden cross-Domain and lifecycle rules without replacing the base hierarchy with shallow Interfaces.

**Why:** Entity identity, .NET object identity, and Value Object structural equality are different concepts. Keeping them explicit avoids mutable hash codes and surprising cross-context equality, while strongly typed IDs provide compile-time Domain safety. Local opt-in equality remains possible where it carries real Domain meaning without imposing one inheritance or Interface policy on every Entity.

### Inheritance and Interface admission policy

Handwritten MartiX production classes and record classes are sealed by default. MartiX-authored inheritance is not a default implementation-reuse mechanism. Prefer concrete constructor composition, immutable values, focused policy objects, delegates, framework Interfaces, and admitted capability or provider seams. Composition does not imply one Interface per concrete class.

An Interface is admitted only for a real provider or transport seam, a provider-owned Module Contract, a policy consumed across multiple unrelated implementations, an accepted Entity Capability, or a framework contract. A single implementation, mocking convenience, naming symmetry, or hypothetical future replacement does not justify an Interface. In particular, do not generate `IService`, operation, mapper, repository, factory, validator, Entity, ID, or module Interfaces mechanically.

Inheritance directly required by an official selected framework lifecycle remains legitimate. Concrete `DbContext`, EF Core interceptor, `BackgroundService`, `Exception`, FastEndpoints endpoint, and FluentValidation validator types may inherit their framework bases, but the MartiX concrete type remains sealed, provider-contained, and thin. It composes business behavior through collaborators and never introduces another MartiX base layer between the framework and concrete Adapter. Framework types do not leak into the Platform Kernel, Domain, Application Operations, or Module Contracts.

An internal local closed hierarchy may be used without an ADR only when it expresses genuine stable substitutability or a cohesive closed polymorphic Domain model, composition would obscure that model, and focused tests cover the variants. It is not admitted merely to share implementation. Because this choice is local and reversible, Domain documentation or code rationale is sufficient unless its semantics qualify independently for an ADR.

A public or cross-package MartiX inheritance hierarchy requires an ADR because it creates a hard-to-reverse protected extension and compatibility contract. Admission requires at least two real derived implementations, substitutive callers, cohesive shared invariants that cannot be hidden more deeply through composition, a deliberately specified public/protected Interface, consumer-authored subclass tests, API compatibility evidence, supported AOT/trimming evidence, and an evolution strategy. It must not bundle orthogonal Capabilities. Without all evidence, keep the type sealed and compose behavior.

Generated framework artifacts such as EF migrations, source-generated JSON contexts or clients, and Razor partial types are evaluated under their generator contract rather than mechanically rewritten. Every exception is narrow, named, owned, and justified; never suppress an entire Infrastructure or generated directory without proving the generator boundary.

[Define executable quality gates and template verification](113-quality-gates.md) owns executable enforcement. The required evidence includes analyzers for handwritten non-sealed production types and unauthorized MartiX bases where reliable, architecture tests over compiled assemblies and dependency layers, explicit narrow framework/generated allowlists, generated-template verification, and APICompat/package validation for public and protected contracts. A suppression includes its reason and owner and cannot serve as an undocumented architecture escape hatch.

**Why:** public inheritance exposes constructor, protected state, override order, lifetime, and behavioral commitments that are expensive to evolve. Sealed concrete types make Interfaces intentional and keep invariants local. Framework inheritance is different: wrapping it would add a shallow MartiX layer without removing the framework contract. The admission policy therefore rejects dogmatic bans as well as speculative hierarchies and preserves the smallest truthful seam.

### Audit conclusion and migration impact

The accepted Platform and Generated Solution design was already predominantly compositional: sealed Result types, concrete Application Operations, explicit static composition roots, use-case-oriented Module Contracts, capability Interfaces with real policy consumers, module-owned EF contexts, and no endpoint, provider, repository, unit-of-work, or module base classes. This audit changes two material areas: the Specification representation and the Domain Entity/event/equality model.

Migration removes the active `EntityBase<TId>`, `HasDomainEventsBase`, abstract `ValueObject`, inherited `Specification<T>`, mirrored `ISpecification<T>`, and the current `Result<T> : Result` relationship. It does not wrap them with substitute Interfaces. Existing application types are migrated explicitly to strongly typed IDs, local value equality, opt-in `IHas<Capability>` composition, private Domain Event collections, immutable Specifications, and separate sealed Result types.

Retain required inheritance from `Exception`, EF Core, FastEndpoints, FluentValidation, hosting, and other selected framework extension contracts under the sealed Adapter rule. Future tickets for identity, outbox, HTTP, UI, infrastructure providers, and agent guidance must apply this admission policy as they introduce seams; they must not infer that composition requires provider-neutral wrappers around first-party APIs.
