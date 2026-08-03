---
title: Specify persistence ownership and migration operations
status: closed
type: wayfinder:grilling
parent: ../map.md
claimed_by:
resolved: 2026-07-17
blocked_by:
  - 104-capability-preset-matrix.md
  - 106-generated-solution-topology.md
---

## Question

How should module-owned EF Core contexts, PostgreSQL and SQL Server providers, transactions, migrations, development data, deployment migration execution, and testing work across supported Presets?

## Research asset

[Anton Dev Tips: best-practice evidence catalog](../research/anton-dev-tips-best-practices.md) — supplementary survey of the user's preferred newsletter source, with article-level MartiX dispositions and primary Microsoft/.NET/EF Core validation. It is discovery evidence rather than architectural authority.

## Resolution

This in-progress record preserves accepted WHAT/WHY decisions during the human grilling. It becomes the canonical resolution when the ticket closes.

### Modular database and schema ownership

The `modular-monolith` and `full-stack` Presets use one relational database per Generated Solution. Every persistent Business Module owns one internal `DbContext`, one database schema, its tables, entity configurations, indexes, constraints, and EF Core migrations. For complete input `name=MartiX.Planner`, `OrdersDbContext` owns schema `orders` and `BillingDbContext` owns schema `billing`. Each module keeps its EF migrations history table in its own schema so migration state has the same owner as the schema it describes.

One Generated Solution selects one relational Capability Provider for all Business Modules: PostgreSQL is the default and SQL Server is an equally Supported choice. Mixed relational providers and a database per module are not default supported topologies.

A Business Module must not map another module's entities or tables, expose its `DbContext`, create EF navigations to another module, or create cross-module foreign keys. Another module's identifier may be stored only as an opaque value. Validate current cross-module facts through a Module Contract when immediate consistency is required and propagate independent changes through Integration Events. Architecture checks, migration inspection, and provider integration tests enforce schema ownership.

**Why:** one database retains the deployment, backup, connection, and transaction simplicity expected from a Modular Monolith. Separate schemas, contexts, histories, and migrations establish durable data ownership and make future extraction possible without imposing database-per-module operations today. Cross-module foreign keys and navigations would transfer invariants to the database and EF model, bypass deliberate Module Contracts, and turn module boundaries into namespaces only. Database-per-module would prematurely introduce distributed transactions, more credentials and pools, coordinated backup and restore, and additional failure modes.

The active `MartiX.WebApi.EFCore` implementation does not supply or enforce this ownership model. Its principal behavior is an `OutboxSaveChangesInterceptor` that enqueues a marker after successful `SaveChanges`, outside the business transaction. The target design therefore places contexts, schemas, migrations, and atomic persistence in application-owned Business Modules rather than hiding them in a generic Platform persistence library.

### Lean API Preset persistence

The `api` Preset does not add EF Core, a `DbContext`, migrations, or a Migrator when relational persistence is not selected. When relational persistence is selected, the Generated Solution has exactly one internal application-owned context in the API project. Naming is derived from the concrete product name: for `name=MartiX.Planner`, use `PlannerDbContext` under `MartiX.Planner.Api/Infrastructure/Persistence`, not a placeholder company or an artificial Business Module.

The context owns the explicit `app` database schema. Its entity configurations and migrations remain in the API project under `Infrastructure/Persistence`, including `Infrastructure/Persistence/Migrations`. A separate one-shot `MartiX.Planner.Migrator` is still the sole production migration host and uses the API project as the migrations assembly. The API process never applies migrations during startup.

The lean context follows the same accepted provider, naming, Specification, timestamp, concurrency, migration, and real-provider testing policies as a module-owned context. It does not introduce a generic repository, `IUnitOfWork`, fake module, or reduced persistence standard merely to keep the project count small.

Convert deliberately to the `modular-monolith` Preset when the application develops multiple genuine bounded business contexts, needs independently owned schemas and migrations, or introduces reliable inter-module communication. The `app` schema is intentionally application-owned; it must not be presented later as if it had always represented a Business Module.

**Why:** the smallest Preset should pay no persistence cost when persistence is absent and should add only one necessary runtime project when it is present. Keeping the context and migrations with the lean application preserves low project count, while the dedicated Migrator preserves safe production operations. The explicit transition trigger prevents premature modular ceremony without allowing a growing application to remain an accidental monolith.

### Direct EF Core use inside Application Operations

Application Operations inject and use their module's concrete internal `DbContext` directly. A command loads or creates its aggregate, invokes Domain behavior, and calls one explicit `SaveChangesAsync(cancellationToken)` at the operation's transaction boundary unless a later accepted transaction rule requires a wider unit. A query composes an EF Core query inside the module, projects only its response shape, and uses no tracking by default. `DbContext`, `DbSet`, entities, and `IQueryable` never cross a Business Module or Module Contract.

Do not generate `IUnitOfWork`, a generic repository, or repository interfaces that mirror `DbSet` and `DbContext`. Do not introduce a persistence port merely to mock EF Core. Test Domain invariants without EF Core, and test Application Operations, translations, transactions, constraints, and concurrency against the selected real relational provider. Extract a focused internal query or persistence Module only when repeated or materially complex behavior can be hidden behind a smaller, deeper Interface or when a second real Adapter exists.

This rule permits an internal `Features` to `Infrastructure/Persistence` dependency inside one Business Module. The enforceable architectural boundary is the Business Module, not a mechanical horizontal Clean Architecture layer.

**Why:** EF Core already supplies repository and unit-of-work semantics, optimized projection, change tracking, transactions, provider diagnostics, and cancellation-aware asynchronous operations. Wrapping the same surface adds shallow Interfaces, obstructs query optimization, and encourages mocks that cannot prove translation or relational behavior. Direct use is simpler and more testable with real infrastructure while Domain behavior remains persistence-independent.

The previous WebApi audit rejected its generic specification, repository, and `IUnitOfWork` surfaces because they duplicate EF Core rather than hide a deep policy. That decision does not by itself prohibit the narrower query Specification Pattern required by the user and defined below.

### EF Core query Specification Pattern

Retain a refined generic Specification Pattern based on the approach demonstrated in Anton Martyniuk's [Specification Pattern in EF Core](https://antondevtips.com/blog/specification-pattern-in-ef-core-flexible-data-access-without-repositories): reusable specifications are applied directly to EF Core queries without a repository or `IUnitOfWork` layer. As amended by the composition audit, the accepted model uses one immutable sealed `Specification<TEntity>` with validated value composition, named application-owned factories, predicate composition, and one evaluator over `DbSet<TEntity>` or `IQueryable<TEntity>`. It does not expose `ISpecification<TEntity>`, an abstract Specification base class, protected mutation, or subclassing.

Specifications are read-query descriptions. Evaluation uses no tracking by default and does not materialize results. The calling Application Operation owns asynchronous materialization, cancellation, and its final projection into the use-case response DTO. Projection queries do not add `Include` merely to traverse relationships in `Select`; an include is admitted only when the operation intentionally materializes an entity graph. Command operations that require tracked aggregates use explicit direct EF Core queries rather than accidentally applying a read specification.

The refined model supports filters, type-safe ordering, deterministic paging, and deliberate loading shape. It does not standardize ordering solely as `Expression<Func<TEntity, object>>`, which introduces boxing or conversion nodes. Paging is valid only with deterministic ordering. `And` and `Or` compose filter predicates through parameter rebinding; they do not silently merge loading, ordering, tracking, or paging policies whose conflicts would be ambiguous. `IQueryable`, specifications, and entity expressions remain internal to their owning Business Module.

Specifications and the evaluator require unit evidence for immutable construction and composition invariants plus integration evidence against every Supported PostgreSQL and SQL Server profile for translation, ordering, paging, and loading behavior. Do not claim correctness from LINQ-to-Objects or EF Core InMemory execution.

**Why:** named composable specifications preserve repeated query intent without accumulating repository methods and allow Application Operations to retain direct optimized EF Core projection. Strict query-shape invariants keep the common mechanism smaller and safer than an unrestricted query DSL. Provider tests prove the behavior that expression-only unit tests cannot.

This decision supersedes only the earlier audit's blanket removal disposition for the generic specification surface. Generic repositories and `IUnitOfWork` remain rejected, and the current `MartiX.WebApi` implementation is not copied unchanged. The following package-ownership decision places the refined engine in the dedicated EF Core Platform package.

### EF Core query execution contract

Lazy-loading proxies are not generated or registered. Every database access and loading decision must remain visible in an Application Operation or its Specification. Read queries and Specifications use `AsNoTracking` by default, while a command that changes an aggregate requests tracked entities explicitly. Prefer direct projection into the operation response so the provider selects only required columns. Use `Include` only when deliberately materializing an entity graph, never merely to enable a projection.

Do not select `SplitQuery` or `SingleQuery` globally. A complex graph query makes that choice explicitly and proves its behavior and performance against both Supported providers. Paging requires a stable, total ordering with a deterministic tie-breaker. Offset paging remains acceptable for bounded ordinary lists; use keyset or cursor paging for large, frequently changing, or deep result sets where offset cost or consistency is material.

All database I/O is asynchronous and propagates the operation's required `CancellationToken`. Compiled queries, `DbContext` pooling, raw SQL, and provider-specific optimizations are opt-in only after profiling or benchmarks identify a concrete hot path and provider tests preserve semantics. They are not template-wide claims of performance. CI and provider tests treat dangerous query diagnostics, including unintended multiple collection loading or an unsupported client-evaluation path, as failures where EF Core exposes the diagnostic.

Production telemetry records slow-query duration, timeout or cancellation outcome, provider, owning operation, and a safe query fingerprint. It must not record sensitive parameter values or credentials. Thresholds are deployment configuration rather than hard-coded business behavior.

The current `MartiX.WebApi` Specification evaluator can compose criteria, includes, ordering, and paging, but it does not enforce this complete contract. Migration to `MartiX.Platform.EntityFrameworkCore` therefore narrows and validates that surface rather than copying or merely renaming it.

**Why:** no-tracking projection and explicit loading are safe, simple defaults that prevent accidental graph retrieval and change-tracker cost. Per-query split behavior and measured hot-path optimizations avoid replacing evidence with global folklore. Stable paging, cancellation, real-provider diagnostics, and privacy-safe telemetry make both correctness and performance observable without hiding database behavior behind abstractions.

### EF Core package ownership and in-place migration

The refined Specification engine and accepted entity-timestamp lifecycle are centrally reusable EF Core infrastructure rather than duplicated generated source. Their target package, assembly, project, and root namespace are `MartiX.Platform.EntityFrameworkCore`. Relational Persistence selects this optional package automatically; persistence-free solutions do not reference it. The package depends on EF Core but not on ASP.NET Core, PostgreSQL, SQL Server, a Business Module, or the legacy `MartiX.WebApi` assembly.

Do not create this as an additional project beside the current EF Core project. Reuse `src/MartiX.WebApi.EFCore`, replace its implementation, remove the rejected non-transactional outbox interceptor and legacy root-package dependency, make it publishable, and rename the same physical project in place to `src/MartiX.Platform.EntityFrameworkCore`. Move and refine the current specification types from the broad legacy assembly into this project. The transition therefore adds no project relative to the current repository and no project to a Generated Solution.

The initially admitted public areas are `MartiX.Platform.EntityFrameworkCore.Specifications` for the approved specification contracts, immutable query-shape representation, composition, validation, and EF Core evaluation, plus `MartiX.Platform.EntityFrameworkCore.EntityTimestamps` for the timestamp contract, model policy, and save interceptor. The package does not own application specifications, application base entities, `DbContext` base types, repositories, `IUnitOfWork`, provider configuration, migrations, transactions, outbox behavior, or unrelated EF Core helpers. Business Modules define their concrete specifications and entity types internally and reference the package directly. It joins the synchronized Platform release train and must pass public API, package-content, EF Core compatibility, PostgreSQL, and SQL Server evidence.

These accepted requirements are the concrete evidence that amends the earlier initial package catalog's rejection of a general EF Core wrapper. They admit one strictly governed EF Core adapter project with an explicit namespace admission list; the broader project name does not permit a general dumping ground. A new public area still requires repeated policy, deep centrally fixable behavior, tests, and a later recorded decision. `MartiX.Platform.AspNetCore` remains free of EF Core and relational-persistence dependencies.

**Why:** several Business Modules need one specification Interface and evaluator with centrally fixable query invariants, while copying it into each module would violate DRY and produce distinct behavior and type identities. A shared generated project would increase application project count and create a `Shared` assembly. Reusing and renaming the existing EF Core project preserves the minimum physical topology, while its governed namespaces and dependency graph keep HTTP, persistence, and application policy correctly separated.

### Persistent Entity timestamps

Every persistent domain Entity has required `DateTimeOffset CreatedAt` and `DateTimeOffset UpdatedAt` properties. These are technical lifecycle metadata and never replace explicitly named business facts such as `SubmittedAt`, `ApprovedAt`, or `PaidAt`. Non-domain technical records, keyless read models, join rows, owned values, and EF migrations history are not classified as persistent domain Entities merely to inherit this policy.

Persistent domain Entities compose orthogonal capabilities instead of inheriting a generated `Entity<TId>` or `AggregateRoot<TId>` hierarchy. An Entity that receives this policy implements the public getter-only `IHasEntityTimestamps` Interface while retaining private setters for its concrete `CreatedAt` and `UpdatedAt` properties. Identity remains an ordinary strongly typed property unless shared behavior proves a separate Interface necessary. As resolved by [Audit accepted decisions for composition over inheritance](121-composition-over-inheritance-audit.md), only an Aggregate Root that actually raises Domain Events owns a private application-owned `DomainEventCollection` and explicitly implements the module-internal behavioral `IHasDomainEvents`; event lifecycle details remain with [Specify Integration Event, outbox, and inbox semantics](109-integration-event-delivery.md).

`MartiX.Platform.EntityFrameworkCore.EntityTimestamps` supplies the getter-only timestamp contract, an explicit `HasEntityTimestamps()` EF model configuration that validates and maps both required `DateTimeOffset` CLR properties, and a save-changes interceptor driven by injected `TimeProvider`. The interceptor selects only `ChangeTracker.Entries<IHasEntityTimestamps>()` and updates values through EF property metadata; no public setter, assembly scan, or reflection-based registration is required. Before insert it assigns one UTC value to both timestamps. Before a meaningful tracked update it preserves `CreatedAt` and assigns the current UTC value to `UpdatedAt`. Synchronous and asynchronous save paths behave consistently.

Set-based `ExecuteUpdate`, bulk provider APIs, and raw SQL bypass change-tracker save interceptors. Any admitted use must update `UpdatedAt` explicitly and pass provider integration tests; otherwise it is invalid. Tests use a controlled `TimeProvider` and prove insert, update, unchanged, tampering, failure, retry, and provider behavior. Concurrency tokens remain a separate per-aggregate policy rather than being inferred from timestamps.

**Why:** timestamps are repeated storage lifecycle behavior with one stable policy, so central EF adaptation provides real locality and deterministic repair. Interface composition lets each Entity opt into independently governed timestamp, actor, concurrency, Domain Event, or future soft-delete behavior without a deep inheritance hierarchy or god `BaseEntity`. Getter-only contracts preserve Domain encapsulation, while explicit configuration makes the persistence policy visible and agent-verifiable.

### Opt-in Actor tracking

`CreatedByActorId` and `UpdatedByActorId` are not universal Entity fields. An application-owned getter-only `IHasActorTracking` capability composes them only into persistent domain Entities for which attribution has an operational or business purpose. Timestamp tracking and Actor tracking remain separate Interfaces, configurations, and policies; selecting one never silently selects the other.

The stored identifier is the immutable provider-independent application Actor identifier and has no relational foreign key or EF navigation to Local Identity storage. Anonymous, human, service, background, import, and bootstrap contexts require explicit semantics; arbitrary `null` does not mean "system". The identity-provider matrix owns the exact `ActorId` representation and actor-resolution contract, while the security and observability baseline owns propagation and evidence requirements.

Actor tracking columns are convenient current-state metadata, not a history of changes and not proof of a security-sensitive action. They never replace Domain facts, Entity Change History, Security Audit Events, or a Durable Security Audit Trail.

**Why:** composition avoids columns and false attribution on Entities that do not need an actor, while a stable Actor identifier preserves provider independence and future identity changes. Separating current-row metadata from durable audit evidence prevents ordinary updates from overwriting the only record of who performed a sensitive operation.

### Opt-in optimistic concurrency

Every mutable Aggregate Root receives an explicit concurrency-policy assessment. An Aggregate Root exposed to competing writes composes the getter-only `IHasConcurrencyToken` capability; Entities without that force do not receive a token by convention. The default token is an application-managed `Guid` configured with EF Core `IsConcurrencyToken()`, remaining portable across the Supported PostgreSQL and SQL Server profiles.

The EF policy assigns an initial token and replaces it only for a relevant aggregate change. Timestamp updates alone must not create an endless concurrency-token change cycle. SQL Server `rowversion` and PostgreSQL `xmin` may be evaluated later as provider-specific optimizations but do not enter the common Domain, Application, Module, or transport contracts.

An expected `DbUpdateConcurrencyException` becomes an Application Error of kind `Conflict` at the owning Application Operation seam. A business command is not retried blindly. The caller reloads current state and makes a new decision; only a deliberately idempotent internal operation may reload, re-evaluate Domain rules, and retry within a bounded policy. The HTTP-contract ticket owns ETag and `If-Match` representation.

Provider integration tests execute real concurrent writes and prove that one competing commit succeeds, the other reports the expected conflict, no partial side effect or outbox record escapes, and a deliberate retry re-evaluates current state. LINQ-to-Objects, mocks, and EF Core InMemory do not provide this evidence.

**Why:** opt-in interface composition makes concurrency semantics visible without forcing a provider-specific column or behavior onto every Entity. An application-managed token gives both supported providers one Domain model, while rejecting blind retries prevents a technically repeatable database command from silently violating current business rules.

### Entity Capability Interface admission

Once an orthogonal Entity Capability and its semantics are accepted, use interface composition named `IHas<Capability>` automatically instead of reopening the interface-versus-inheritance choice. Examples already accepted are `IHasEntityTimestamps`, `IHasActorTracking`, and `IHasConcurrencyToken`; the same form is presumed for a later accepted Domain Event capability.

The naming convention does not admit a new Capability. Each proposed Capability still requires one cohesive responsibility, explicit state and lifecycle semantics, no hidden provider or transport leakage, a real framework or policy consumer, and behavior tests. Security-, isolation-, retention-, and deletion-sensitive proposals such as soft deletion, tenancy, audit history, permissions, or outbox ownership require their own decision even if named `IHas*`. Avoid marker Interfaces, interface-per-class translation, public mutation added only for infrastructure, and pass-through policies.

**Why:** this standing preference removes repetitive inheritance debates and keeps Entity capabilities independently composable, while an admission rule prevents `IHas*` from becoming the interface equivalent of a god `BaseEntity`.

### Local transaction boundary

One writing Application Operation normally uses one Business Module `DbContext` and one explicit `SaveChangesAsync(cancellationToken)`. EF Core's implicit transaction around that save is the default. Use an explicit transaction only when one operation demonstrably requires multiple saves, combines EF Core with a supported relational command, or must atomically persist a business change and its module-owned outbox records.

A transaction never crosses a Business Module or its `DbContext`. Do not use `TransactionScope`, ambient transactions, distributed transactions, shared connections to enlist several module contexts, or a transaction coordinator hidden in the API or migrator. A synchronous Module Contract may answer a query or immediate decision, but two module-owned writes do not pretend to be one atomic operation. If one invariant requires atomic changes to data attributed to two modules, correct the ownership boundary so one module owns the invariant and transaction. Independent reactions use Integration Events and eventual consistency.

Do not perform external HTTP, email, object-storage, broker, or other non-database effects inside a database transaction. Do not enable automatic retries around arbitrary Application Operations. Provider execution strategies may retry only a deliberately bounded database unit whose complete work is safe to repeat; idempotency and side-effect constraints must be explicit.

The module writes its Integration Event outbox records before commit through the same `DbContext` and transaction as the producing business changes. The existing legacy `OutboxSaveChangesInterceptor`, which enqueues a marker from `SavedChangesAsync` after the business transaction succeeded, is rejected and removed. The later Integration Event delivery ticket owns event capture timing, record schema, dispatch, inbox, leases, retries, and retention.

**Why:** the fact that a Modular Monolith currently shares one physical database must not create a hidden multi-module consistency boundary. Local transactions keep aggregate invariants and failure ownership clear, remain compatible with future module extraction, and allow the transactional outbox to bridge durable local commit to independent effects without holding locks across remote calls.

### Module-owned migration source and design-time creation

Each Business Module stores its EF Core migrations and model snapshot with its internal `DbContext` under `Infrastructure/Persistence/Migrations/`. Do not generate a separate migrations project. A Generated Solution contains migrations only for its selected relational provider; the Template System verifies separate PostgreSQL and SQL Server Generated Solutions rather than maintaining two migration sets inside one application. Changing an existing application's provider is an explicit data-migration project, not a configuration switch.

`<name>.Migrator` is the sole EF tools startup project and creates contexts through the same explicit Generic Host provider composition used by migration execution. Do not generate per-module `IDesignTimeDbContextFactory<TContext>` types. Contexts remain internal when verified tooling permits; a wider visibility is allowed only when an executable EF tooling compatibility test proves it necessary, and architecture tests restrict that tooling exception from becoming an application Interface.

For complete input `name=MartiX.Planner`, adding an Orders migration uses this exact generated command:

```powershell
dotnet ef migrations add AddOrderNumber `
  --project src/MartiX.Planner.Orders `
  --startup-project src/MartiX.Planner.Migrator `
  --context OrdersDbContext `
  --output-dir Infrastructure/Persistence/Migrations
```

Generated `AGENTS.md` and persistence guidance list exact commands for every selected module rather than placeholders. CI runs `dotnet ef migrations has-pending-model-changes` for every context and executes the add/remove workflow in a disposable generated verification fixture to prove context discovery, target paths, snapshot stability, internal visibility, and provider configuration. Migration source is committed and reviewed with the model change.

**Why:** migrations are part of the schema owned by their Business Module. Keeping them beside the context maximizes locality and avoids a project whose only purpose is moving generated files. Reusing the already required migrator as design-time startup provides one deterministic provider-aware composition path and prevents design-time factories from drifting from runtime configuration.

Official EF Core references: [Design-time DbContext creation](https://learn.microsoft.com/en-us/ef/core/cli/dbcontext-creation), [Managing migrations](https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations/managing), and [Using a separate migrations project](https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations/projects).

### Production migration executable and deployment profiles

The immutable `<name>.Migrator` artifact exposes exactly three production operations: `validate`, `script`, and `apply`. It shares explicit provider and module composition but never serves application traffic.

`validate` performs no mutation. It verifies provider identity, required configuration and connectivity, expected contexts, schemas and history tables, migration assembly/version alignment, pending migrations, pending model changes, and unexpected migration-history state. `script` produces deterministic ordered per-module and combined SQL artifacts plus a manifest containing source commit, provider, migration range, and hashes without embedding a connection string. `apply` migrates contexts sequentially in explicit order with DDL credentials, stops at the first failure, and runs validation again before reporting success.

Support two production profiles:

1. An automated pre-deployment job runs `validate`, `apply`, then `validate` before application traffic moves to the new release.
2. A controlled environment runs `script`; deployment or DBA tooling reviews and applies the immutable SQL artifact, then the same-version migrator runs `validate`.

The serving API never applies migrations and retains only least-privileged runtime credentials. Deployment permits only one solution-level migrator execution at a time even though current EF Core migration APIs also acquire a database-wide lock. Module order is deterministic but schema-isolated migrations must not depend on another module's tables or DDL ordering. Secrets come from approved configuration or secret injection and are never required as logged command-line values.

Do not use `EnsureCreated` for a database governed by migrations. Every potentially destructive migration receives explicit human review and uses expand/migrate/contract across compatible releases when zero- or low-downtime rollout requires it. `Down()` is development assistance, not a promise of safe production rollback after data loss. Prefer roll-forward; application rollback is supported only while the expand phase remains backward compatible. Migration source, executable, scripts, manifest, API, and provider versions originate from the same immutable release candidate.

**Why:** a separate executable enforces credential and process boundaries, while script and direct-apply profiles accommodate both small automated deployments and enterprise change control from one migration source. Pre/post validation, immutable evidence, and expand/contract address risks that merely calling `MigrateAsync` cannot. Keeping migration execution outside the API prevents startup races, elevated serving credentials, and partially available hosts.

Official EF Core reference: [Applying migrations](https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations/applying).

### Data initialization lifecycle

Classify initial data by ownership and lifecycle rather than treating every case as database seeding:

1. Small deterministic schema-required static data may be emitted explicitly by the owning migration, including `InsertData`, so both `script` and `apply` profiles review and execute the same change.
2. Production bootstrap such as an initial administrator, credentials, keys, provider configuration, or application business data uses a separately authorized Capability-specific operation with validation, safe secret handling, and required audit evidence. It is not a schema migration.
3. Development sample data uses explicit migrator commands `seed-development` and `reset-development` that are unavailable to production deployment profiles.
4. Test scenario data belongs to each test or fixture and never depends on a global development seed or test execution order.

Development commands hard-fail outside the `Development` environment, verify an expected safe database marker and name, require explicit confirmation for destructive reset, run after migrations, and invoke module-owned seed contributors explicitly. A contributor writes only through its module `DbContext` and schema. Seed values use stable identifiers, controlled `TimeProvider`, deterministic inputs, and no external services. Do not require Bogus or another random-data package.

Use EF model-managed `HasData` only for small static data truly governed with the model. Do not use it for users, password material, generated keys, large catalogs, mutable business records, database-state-dependent data, external calls, or time-dependent values. Do not register general production data initialization through `UseSeeding`/`UseAsyncSeeding`, because EF invokes those hooks during migration tooling and migration execution even when no model migration is applied; hidden execution would also diverge from the reviewed SQL-script profile.

The production migrator operations remain exactly `validate`, `script`, and `apply`. Development-only commands are a separately guarded command surface and never an API endpoint or deployment shortcut.

**Why:** schema evolution, privileged bootstrap, developer demonstration data, and isolated test arrangements have different owners, safety constraints, and reproducibility requirements. Separating them prevents production credentials or sample data from entering migrations, keeps reviewed script and direct-apply outcomes aligned, and makes destructive local convenience impossible against an unverified database.

Official EF Core reference: [Data seeding](https://learn.microsoft.com/en-us/ef/core/modeling/data-seeding).

### Runtime relational provider composition

The selected relational provider is resolved during generation and recorded in `martix.platform.json`. Generated source calls exactly one provider API, `UseNpgsql(...)` or `UseSqlServer(...)`, directly and visibly. Do not implement a runtime provider switch, reflection-based provider loading, a provider-neutral wrapper, or mixed providers. Startup validation fails when provider configuration and the Capability Manifest disagree.

All Business Module contexts use one logical runtime database connection configuration because they share one physical database. Serving hosts receive least-privileged DML credentials. The migrator receives separately injected DDL credentials. Manifests, repositories, command examples, process arguments, logs, traces, health output, and errors never contain credentials or complete connection strings.

Register each context scoped with `AddDbContext<TContext>` by default. Do not enable `AddDbContextPool` merely as a performance convention. Pooling is admitted only after representative benchmarks and tests prove benefit and prove that context, interceptor, Actor, tenant, request, and mutable service state cannot leak across scopes. Context constructors accept `DbContextOptions<TContext>` plus only context-local dependencies whose lifetime and reset semantics are verified; they never resolve a service locator.

Connection resiliency is an explicit bounded provider policy for documented transient database failures, not a retry around an arbitrary Application Operation. It must compose correctly with explicit transactions and must not repeat external effects, non-idempotent behavior, or unbounded work. Provider profiles declare retry count, backoff, timeout budget, observability, and tests rather than accepting opaque defaults.

**Why:** generation already knows the provider, so direct calls make dependencies, trimming, configuration, and diagnostics truthful. Scoped non-pooled contexts are the safest short-unit-of-work baseline. Pooling and retries can improve measured scenarios but alter state lifetime and repeat execution, so enabling them without evidence would trade small possible performance gains for data isolation and duplicate-effect risk.

The active `MartiX.WebApi.EFCore` project supplies neither provider composition nor host validation. The target keeps those application/provider choices visible in Generated Solution source while the reusable EF package owns only explicitly admitted cross-application policies.

### Explicit persistence-model composition

Every persistent Entity or aggregate mapping has an internal sealed `IEntityTypeConfiguration<TEntity>` implementation owned by its module. Owned Value Objects and relationships are configured with their owning Entity unless a separate internal configuration materially improves cohesion; they do not create public abstractions merely for structural symmetry.

Each persistent module exposes one internal model composition manifest, such as `OrdersPersistenceModel.Configure(ModelBuilder)`, which explicitly instantiates and applies every configuration. Its concrete `OrdersDbContext.OnModelCreating` invokes that manifest and then the explicit MartiX relational policy and validation pipeline. The lean `api` Preset follows the same rule with its application-owned context and persistence-model manifest.

Do not use `ApplyConfigurationsFromAssembly`, reflection-based assembly or DI discovery, or a common `MartiXDbContext` base class. `MartiX.Platform.EntityFrameworkCore` owns repeatable deep policy and validation behavior, but it never discovers or owns application Entities, module configurations, or a module model. This preserves composition over inheritance and keeps every persistence dependency visible at its owning composition root.

Architecture and provider model tests fail when a persistent Entity is not registered or lacks its explicit schema and table, key, portable database-object names, required timestamp mapping, selected concurrency behavior, or valid provider migrations. The manifest is therefore an auditable model inventory rather than an unchecked convenience list.

**Why:** explicit registration adds a small mechanical list but makes the model deterministic, reviewable, trimming/AOT-friendly, and resistant to accidental discovery caused by assembly contents. Separate configurations keep `DbContext` cohesive, while a module-local manifest provides one truthful composition root without creating an inheritance hierarchy or leaking module knowledge into the Platform package.

### Referential integrity and deletion

Every relationship configures `OnDelete` explicitly; no generated model relies on EF Core's inferred delete behavior. Independent Entities use portable `Restrict` or `NoAction` semantics by default. Database cascade delete is admitted only for exclusively owned dependents inside one Aggregate boundary whose existence is invalid without their root. `SetNull` is admitted only when the Domain explicitly permits the optional reference to become empty.

No foreign key or cascade crosses a Business Module boundary. Removing an Aggregate Root is an explicit authorized Application Operation that evaluates Domain invariants and proves the resulting relational behavior against both Supported providers. Do not generate a generic CRUD delete shortcut.

Soft deletion is not a universal baseline and is not hidden behind a global query filter. A future Domain that requires logical deletion must admit it as a separate Entity Capability, use the accepted compositional `IHas<Capability>` form, and resolve timestamp and Actor semantics, restoration, unique indexes, related records, privileged visibility, retention, and physical purge together. Audit history, an outbox, and backups do not substitute for a retention or erasure policy.

`ExecuteDelete`, raw SQL, and other set-based deletion paths are measured, explicit optimizations with their own authorization, invariant, timestamp, transaction, and provider evidence because they bypass normal change tracking and interceptors.

**Why:** a global cascade can delete more data than the use case intended, while a global soft-delete policy permanently complicates ordinary queries, uniqueness, referential integrity, retention, and privacy erasure. Restrictive explicit defaults preserve data; Aggregate ownership supplies the narrow case where cascading has unambiguous semantics.

### Portable database naming contract

PostgreSQL and SQL Server Generated Solutions share one portable physical naming contract. Database identifiers use lowercase ASCII `snake_case` without mixed-case quoting. A module schema is derived deterministically from its module name, such as `Orders` to `orders`. Every Entity configuration explicitly supplies its table name with `ToTable(...)`; do not infer English plurals or accept a CLR type name that may be a reserved SQL word.

`MartiX.Platform.EntityFrameworkCore.DatabaseNaming` is the third initially admitted public area of the existing in-place-renamed EF Core project. Its EF conventions derive column, primary-key, foreign-key, unique-constraint, index, and check-constraint names with stable semantic prefixes. The portable identifier limit is 63 ASCII characters. Longer names receive deterministic shortening with a stable hash suffix; silent provider truncation is invalid. Model validation rejects collisions and reserved identifiers across both Supported provider profiles.

Representative names are `pk_orders`, `fk_order_lines_orders_order_id`, `uq_orders_order_number`, `ix_orders_customer_id_created_at`, and `ck_orders_total_non_negative`. Each context configures its own lower-case history table within its schema, such as `orders.__ef_migrations_history` and `billing.__ef_migrations_history`.

The convention does not choose module schemas or table vocabulary for the application and does not hide Entity configuration. Business Modules explicitly own those names; the reusable policy normalizes repetitive member and database-object names and enforces portable constraints. Provider tests compare generated migrations and database metadata for both variants.

**Why:** PostgreSQL mixed-case identifiers require persistent quoting, while SQL Server's larger identifier allowance can conceal names that PostgreSQL truncates. One lower-case contract makes reviewed SQL, diagnostics, and provider parity predictable. Explicit table names avoid unsafe pluralization and reserved-word inference, while a central convention removes noisy manual naming and drift for every column and constraint without adding a project.

### TUnit relational-provider test lifecycle

The consolidated `<name>.Tests` project uses one PostgreSQL and one SQL Server Testcontainer fixture shared at `SharedType.PerTestSession`. Each fixture uses TUnit `IAsyncInitializer` and `IAsyncDisposable`. Only the expensive provider server process is shared; no test relies on shared mutable database state.

Every provider-sensitive test receives a uniquely named isolated database derived from `TestContext.Current.Isolation`, applies the relevant real migrations, runs independently, and drops the database during asynchronous cleanup. TUnit remains parallel by default. Provider-specific `[ParallelLimiter<T>]` policies cap concurrent databases and connections according to measured CI resources; do not use assembly-wide serialization, test ordering, or a global keyless `[NotInParallel]` workaround.

Persistence evidence includes:

1. Domain unit tests without EF Core;
2. Specification construction and composition unit tests;
3. Specification translation, ordering, paging, and loading tests against both providers;
4. Application Operation integration tests with the real module context;
5. transaction, constraint, failure-injection, and optimistic-concurrency tests;
6. migrations from empty and the previous Supported release, repeated `apply`, generated `script`, pending-model detection, mid-migration failure, and expand/contract compatibility;
7. host tests through the real application host; and
8. generated-template execution for PostgreSQL and SQL Server variants.

Do not use EF Core InMemory, SQLite, a mocked `DbContext`/`DbSet`, or LINQ-to-Objects as evidence for a Supported relational provider. Do not accept retry-to-green, quarantined tests, shared mutable seed state, or cleanup that requires a later test. On failure preserve sanitized migrator output, generated SQL where safe, provider diagnostics, and container logs without credentials.

If per-test database creation and migration becomes a measured bottleneck, evaluate a provider-specific template, snapshot, or restore optimization behind the same isolation Interface and prove identical migration and cleanup semantics. Do not weaken isolation preemptively.

**Why:** real providers are required to prove translation, transactions, indexes, constraints, migrations, concurrency, and provider-specific failures. Session-scoped containers amortize process startup, while per-test databases preserve deterministic TDD and parallel execution. TUnit limiters bound infrastructure pressure without serializing unrelated tests.

### Migration disposition and deferred scope

Implement this decision by renaming the existing `src/MartiX.WebApi.EFCore` project in place to `MartiX.Platform.EntityFrameworkCore`, removing its legacy `MartiX.WebApi` dependency and replacing rather than preserving its current non-transactional outbox interceptor. Replace the current inherited generic Specification surface from `MartiX.WebApi` with the sealed immutable composition model resolved by [Audit accepted decisions for composition over inheritance](121-composition-over-inheritance-audit.md); do not copy it unchanged. Generated applications own contexts, mappings, provider packages, migrations, and composition. The Platform package initially owns only the admitted `Specifications`, `EntityTimestamps`, and `DatabaseNaming` policy areas.

[Specify Integration Event, outbox, and inbox semantics](109-integration-event-delivery.md) owns transactional outbox, inbox, dispatch, and Integration Event delivery details. [Specify the identity provider capability matrix](108-identity-provider-matrix.md) owns Actor identity and provider resolution; [Define the security and observability baseline](111-security-observability-baseline.md) owns security evidence and Actor propagation. Soft deletion, multi-tenancy, mixed providers, database-per-module deployment, pooling, compiled queries, provider-specific concurrency tokens, and database snapshot test acceleration remain deferred until their stated forces and evidence exist.

This resolution amends [Design the exact Platform Library topology](105-platform-library-topology.md) only by admitting one deep optional EF Core package after concrete reusable behavior was established. It supersedes [Audit the current WebApi public surface and dependency graph](102-audit-current-webapi.md) only for the refined direct-EF Specification Pattern; its rejection of generic repositories, `IUnitOfWork`, and the unsafe outbox implementation remains in force. [Design the generated solution and Business Module topology](106-generated-solution-topology.md) remains unchanged: relational persistence uses the already required Migrator, while the EF Core Platform package is a library dependency rather than another Generated Solution project.
