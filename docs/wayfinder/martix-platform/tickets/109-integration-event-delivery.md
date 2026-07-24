---
title: Specify Integration Event, outbox, and inbox semantics
status: closed
type: wayfinder:prototype
parent: ../map.md
claimed_by:
resolved: 2026-07-18
blocked_by:
  - 106-generated-solution-topology.md
  - 107-persistence-and-migrations.md
---

## Question

What event contracts, serialization and versioning rules, transactional persistence, leasing, retries, idempotency or inbox behavior, dispatch adapters, retention, and operational signals make the modular preset's at-least-once delivery contract production-ready?

## Prototype asset

[Integration Event delivery state model](../prototypes/109-integration-event-delivery/README.md) was a throwaway interactive model of atomic Outbox Message creation, leased Delivery Attempts, dispatcher crash/redelivery, retry exhaustion, operator requeue, and atomic consumer Inbox Receipt deduplication. Its critical scenario produced two transport deliveries but one committed consumer effect. The user accepted this behavior on 2026-07-18; the executable prototype was then removed and its durable result absorbed into this resolution.

## Resolution

### Delivery guarantee and non-guarantees

The Modular Monolith and Full Stack Presets include reliable Integration Event delivery. The `api` Preset keeps it invalid until deliberately converted to a modular topology, as accepted by the Capability Matrix. A producer atomically commits its business changes and immutable Outbox Message in one module-owned relational transaction. A durable dispatcher subsequently offers the Message to every captured Subscription using at-least-once delivery.

At-least-once means a committed Message is retried until each Delivery Attempt is acknowledged or reaches an observable terminal failure. The transport may deliver the same Message more than once, particularly when a process fails after the consumer commits but before the dispatcher records acknowledgement. The Platform never claims exactly-once transport, duplicate-free delivery, global ordering, or immediate delivery.

An Inbox Receipt provides an application-level guarantee narrower than exactly-once messaging: for one Subscription and Message ID, a consumer can commit its database effects at most once when the Receipt and those effects share one transaction. A handler that needs HTTP, email, object storage, another broker, or any non-database effect records a new intent in its own outbox transaction. It does not perform that effect inside the Inbox transaction.

**Why:** no relational record can atomically commit with an independent process or broker without a distributed protocol. Exposing the duplicate window makes idempotency and recovery testable. Chaining transactional outboxes preserves module-local transactions and future extraction without pretending that distributed effects are one commit.

### Domain Event lifecycle and Integration Event creation

Domain Events remain immutable application-owned facts internal to one Business Module. They are not Platform Kernel contracts. Every Domain Event has an application-assigned UUID v7 Event ID and UTC `DateTimeOffset` occurrence time. Only an Aggregate Root that raises events composes the module-internal behavioral `IHasDomainEvents` Interface and its private `DomainEventCollection`; no Entity or Aggregate Root base class is introduced.

`DomainEventCollection` admits non-null immutable events, preserves their raised order, exposes a read-only snapshot to the module persistence pipeline, and acknowledges exactly that snapshot only after `SaveChangesAsync` succeeds. A failed or cancelled save leaves the events available for the same unit of work. Staging is idempotent within one `DbContext`, so an EF execution-strategy retry does not attach duplicate Outbox records. Application Operations do not call a public `ClearDomainEvents()` method.

Each module explicitly registers compile-time mappings from selected Domain Event types to versioned Integration Event contracts. There is no assembly scan, reflection-based registry, runtime CLR-name lookup, or convention that publishes every Domain Event. One Domain Event maps to at most one Integration Event and uses the same Event ID as its Message ID. When one domain action needs to publish two distinct facts, the Aggregate raises two Domain Events. This constraint gives retries a stable idempotency key and avoids ambiguous one-to-many mapping identity.

A module-scoped SaveChanges interceptor or equivalent explicit context pipeline snapshots events before persistence, invokes the registered mapper and source-generated serializer, adds Outbox records to the same module `DbContext`, and lets the business changes plus messages commit in the same `SaveChanges` transaction. Only after success does it acknowledge the snapshot. Unlike the current implementation, it performs no in-memory enqueue after commit. Serialization or mapping failure aborts the business save rather than committing an unpublished fact.

**Why:** explicit mappings keep public facts deliberate and module-owned while the context pipeline prevents an Application Operation from accidentally forgetting atomic capture. Stable IDs and snapshot acknowledgement handle save retries without inheritance or mutable infrastructure methods on Domain objects.

### Integration Event contract and envelope

The publishing Business Module owns each immutable public payload in its existing `Contracts/IntegrationEvents` namespace. A type uses the past-tense fact name plus major schema version, such as `OrderSubmittedV1`. The persisted and transported envelope contains only stable protocol metadata:

- UUID v7 `MessageId` inherited from the Domain Event ID;
- canonical event name such as `orders.order-submitted` and positive major `SchemaVersion`;
- publisher/module identity;
- `OccurredAtUtc` and `CapturedAtUtc` as UTC `DateTimeOffset` values;
- optional correlation, causation, Actor ID and bounded trace-propagation context;
- content type, payload byte length, SHA-256 payload fingerprint; and
- UTF-8 JSON payload.

The envelope never contains an assembly-qualified name, arbitrary CLR type discriminator, provider SDK type, exception, access token, credential, or unbounded caller-defined header dictionary. Message ID plus publisher, event name, schema version and payload fingerprint form the integrity identity. Seeing the same Message ID with different identity metadata or payload is a terminal integrity failure, not a duplicate to ignore.

Use `System.Text.Json` with an explicit per-module source-generated `JsonSerializerContext`; reflection fallback is disabled for event contracts. Generated options define camel-case properties, case-sensitive reading, UTC timestamp representation, maximum depth and payload size. Payloads contain the minimum durable facts and identifiers required by consumers, not Entity graphs or secrets. The initial hard payload limit is 256 KiB and can only be lowered by a selected transport profile; larger data uses an explicitly designed claim-check/object-storage capability rather than silently expanding the row and broker contract.

Within one major schema version, evolution is additive and backward compatible: existing property names, meanings and types remain stable; new properties are optional to older readers; removal, rename, type/meaning change, newly required data, and incompatible enum behavior require a new major version and CLR contract. Consumers must understand the current and previous Supported major versions for at least the maximum pending-message and rolling-deployment window. Unknown event names or versions become terminal failed deliveries; they are never silently discarded. Contract golden files and producer/consumer compatibility tests are release evidence.

**Why:** semantic names and explicit versions survive assembly refactoring. Source generation makes serialization fast, reviewable, trimming-friendly and fail-fast. A fingerprint distinguishes a safe duplicate from corrupted or conflicting reuse of an idempotency key.

### Module-owned relational model

Every publishing module owns two technical tables in its existing schema and migrations:

1. `outbox_messages` stores the immutable envelope and payload once; and
2. `outbox_deliveries` stores one Delivery Attempt per captured Subscription or transport destination.

Separating Message from Delivery avoids copying payloads for fan-out and permits every Subscription to retry, fail, complete and retain independently. A Delivery Attempt has the composite identity `(message_id, subscription_id)`, status `pending`, `leased`, `delivered`, or `failed`, attempt count, next-attempt time, optional opaque Lease ID, lease expiry, delivered time and bounded last-failure classification. The payload row is immutable after insert.

Every consuming module owns `inbox_receipts` in its own schema and migrations. Its unique identity is `(subscription_id, message_id)` and it records event name/version, payload fingerprint and completion time. It is an Integration Event Inbox, not the user-facing Notification Inbox Capability. No Outbox or Inbox FK crosses a Business Module schema.

Subscriptions are explicit stable application identifiers registered at the API composition root through each module's existing composition entry point. The producer snapshots the active delivery destinations when it captures a Message. A newly added Subscription receives new Messages by default; historical backfill is a deliberate replay operation. Removing or renaming a Subscription with pending or failed deliveries is an invalid deployment until a reviewed Platform Migration resolves those rows. No runtime assembly discovery creates or changes delivery ownership.

**Why:** a Message represents one immutable fact, while each Delivery Attempt represents independent operational state. Module-owned tables preserve ownership and future extraction. Stable Subscription IDs make deployments and retained Inbox Receipts meaningful when handler class names change.

### Concurrency-safe leasing and dispatch

One bounded `BackgroundService` dispatcher runs in the serving host. A durable database poll is the recovery mechanism. An in-memory bounded Channel may wake the poller after a local commit to reduce latency, but it carries no correctness state; restart or another instance always recovers from the tables.

Each module exposes its Outbox partition to the dispatcher through a narrow reliable-events seam. Claiming selects a deterministic due batch ordered by `next_attempt_at`, capture time and Message ID, atomically changes each row to `leased`, increments its attempt count, and assigns a new opaque Lease ID plus expiry. PostgreSQL and SQL Server use separately implemented and tested provider algorithms suitable for queue tables; no provider-neutral LINQ query is assumed concurrency-safe. PostgreSQL may use `FOR UPDATE SKIP LOCKED`; SQL Server may use a tested `READPAST`/update-lock pattern that accounts for `READ_COMMITTED_SNAPSHOT` behavior.

Completion and failure updates include the Lease ID as a fencing token. A worker whose lease expired cannot acknowledge or reschedule work subsequently claimed by another instance. Expired leases become due again. Multiple host instances can claim different rows without a distributed lock, singleton host, or leader election.

The initial validated defaults are batch size 50, maximum four concurrent deliveries per host, one-second idle poll, 30-second per-attempt timeout, 60-second lease, ten automatic attempts, full-jitter exponential delay beginning at one second and capped at five minutes. Options validation requires a positive batch/concurrency, lease longer than attempt timeout plus shutdown margin, bounded payload and error fields, and retention consistent with the replay horizon. Applications may tune these values only with load, failure and database evidence; they are not Application SLOs.

Shutdown stops new claims, propagates cancellation and waits only for the host's bounded shutdown budget. A delivery without confirmed acknowledgement remains leased and is later recovered. The dispatcher uses scoped module contexts per batch/operation, `TimeProvider`, asynchronous I/O, bounded concurrency and structured task ownership; it never holds one `DbContext` for the worker lifetime, uses fire-and-forget tasks, or relies on an unbounded Channel.

**Why:** database leasing makes multi-instance ownership durable and recoverable. Fencing prevents a slow or partitioned worker from overwriting newer state. Conservative bounded defaults create a safe starting point without claiming universal optimal throughput.

### Dispatch outcomes, retry and operator recovery

The transport Adapter returns or maps one of four semantic outcomes: acknowledged, transient failure, permanent failure, or cancellation. Acknowledged means the selected transport accepted responsibility according to its profile: for in-process delivery it means the consumer transaction committed or a duplicate Receipt was verified; for a broker it means the broker durably acknowledged publication, not that every remote consumer completed.

Timeouts, transient connection/provider failures and explicitly retryable consumer failures schedule jittered retry. Invalid serialization, unknown event/version, changed fingerprint, missing Subscription, rejected configuration and explicitly non-retryable consumer failures enter `failed` immediately. Unknown exceptions are transient until the automatic budget is exhausted. Cancellation during host shutdown does not consume a new retry decision after the existing claim and does not acknowledge delivery.

After the retry budget, the Delivery Attempt remains durably `failed`; there is no lossy dead-letter queue hidden in memory. Operator actions can inspect safe metadata and sanitized failure details, requeue with an explicit reason, or exceptionally mark a delivery abandoned according to a future authorized operations surface. Every action is audited. Requeue retains cumulative attempt history and does not mutate the Message. Payload editing, silent deletion, automatic infinite retry, reset-on-restart and manual `processed=true` database edits are invalid.

The Platform supplies the management operation contracts and diagnostics but does not generate a public anonymous endpoint or mandatory Admin UI. Ticket **Define the security and observability baseline** owns authorization, audit fields and exposure of any operator surface.

### Consumer transaction and Inbox semantics

The in-process Adapter transports the persisted envelope, not the original CLR object, and resolves the exact event-name/version registration. This deliberately exercises the same serialized contract that a future broker uses. A concrete consumer reaction is an internal Application Operation registered explicitly; a mandatory public `IIntegrationEventHandler<T>` or mediator pipeline is not generated.

For a database-writing consumer, a deep Inbox executor uses one short-lived consumer `DbContext` and an explicit local transaction:

1. validate the envelope identity and supported schema;
2. insert the Inbox Receipt and flush it inside the uncommitted transaction so its unique constraint claims `(subscription_id, message_id)`;
3. if an existing Receipt has the same event identity and fingerprint, roll back the attempted insert and acknowledge the delivery as a duplicate without invoking the operation;
4. if the same key has different metadata or fingerprint, fail permanently;
5. invoke the consumer Application Operation using the same scoped context;
6. save its business changes and any newly produced Outbox Messages; and
7. commit the Receipt, consumer changes and chained messages together.

A handler failure rolls back all of these changes and lets the producer Delivery Attempt retry. Concurrent duplicates are serialized by the unique constraint: one transaction can commit, and the loser observes the matching Receipt. The consumer operation must be deterministic with respect to its durable inputs, honor cancellation and avoid non-database effects. Provider execution strategies may retry the complete transaction only through the verified EF execution-strategy pattern; arbitrary operation retries remain prohibited.

For read-only or intentionally idempotent consumers that select no Inbox persistence, the Capability Manifest must say so and the consumer must prove its duplicate semantics. The default modular Subscription uses the Inbox. A broker transport never weakens this rule; each consuming application owns its own Receipt and commits before broker acknowledgement.

**Why:** inserting the Receipt before executing the operation makes the database uniqueness constraint the concurrency arbiter, while committing it last with all effects prevents both false completion and duplicate durable changes. Avoiding a handler Interface keeps the seam at reliable execution instead of recreating a mediator abstraction around every operation.

### Transport seam, package ownership and project count

The default transport is in-process and durable: the dispatcher reads the producer's persisted JSON envelope, invokes the explicitly registered consumer through its Inbox executor, then acknowledges the producer Delivery Attempt. A selected broker Adapter replaces only transport between producer dispatch and consumer receipt. It does not replace the producer Outbox, consumer Inbox, event compatibility policy or application authorization/audit obligations. One Generated Solution initially selects at most one broker provider.

Admit `ReliableEvents` as the fourth governed public area of the already accepted `MartiX.Platform.EntityFrameworkCore` package, alongside Specifications, Entity Timestamps and Database Naming. It owns the reusable record configurations, SaveChanges capture lifecycle, provider-specific claim/fencing algorithms, Inbox executor, bounded dispatch engine, option validation and their provider tests. The module supplies its `DbContext`, schema, mapping/serialization manifest, Subscriptions and event contracts explicitly.

Stable framework-independent envelope value semantics may live under `MartiX.Platform.IntegrationEvents`; Domain Events, concrete Integration Events, mappings, permission decisions and Subscription registrations remain Generated Solution contracts. Keep the transport seam internal while only the in-process Adapter exists. Promote its smallest proven Interface for provider packages only when **Select the initial infrastructure capability providers** admits a real second broker Adapter. Do not create a new Platform package, Generated Solution project, generic `IOutboxStore`, repository, unit of work, event bus facade, global `Shared.Contracts`, or mandatory mediator.

**Why:** reliable capture, leasing, deduplication and recovery are deep repeated behavior whose defects must be fixed once. The existing EF Core package is the correct dependency seam and avoids another project. Waiting for a second transport Adapter prevents a speculative public Interface while retaining a clear extraction point.

### Ordering, fan-out and replay

The baseline guarantees no global, cross-module, per-aggregate or completion ordering. Deterministic claim order aids operations but concurrent execution, retries and independent Subscriptions can reorder delivery. A consumer that cares about stale state includes and validates an aggregate/business version or queries the authoritative Module Contract. An ordered-stream/partition capability is deferred until a concrete domain establishes throughput, partition and head-of-line-blocking requirements.

Each Subscription completes independently. One failed consumer does not cause an already completed consumer to repeat, although the failed Delivery remains visible. Adding a new Subscription does not silently replay retained history. Operator replay either creates a new Delivery Attempt for a new Subscription using the original immutable Message and Message ID, or creates a deliberately new business Message when reprocessing is intended; those meanings must not be conflated.

### Retention and cleanup

Delivered Outbox Messages and Delivery Attempts default to seven days of retention. Inbox Receipts default to 30 days and must always outlive the maximum automatic retry, broker retention, deployment rollback and same-ID replay horizon. A broker profile whose redelivery horizon exceeds Inbox retention is invalid. If the maximum horizon is unbounded or unknown, Inbox Receipts are not automatically deleted.

Failed Deliveries are retained until an audited operator resolution and never disappear through ordinary cleanup. An Outbox Message remains while any related Delivery is pending, leased or failed. Cleanup uses a separate low-priority bounded batch, deletes only eligible terminal data, exposes lag/failure signals and is tested for races with claim, retry, replay and rolling deployment. Retention is configurable for compliance and volume, but startup validation rejects internally inconsistent values.

### Observability and operational health

The reliable-events module emits vendor-neutral structured signals without payloads or high-cardinality metric labels:

- counters for captured, attempted, acknowledged, retried, permanently failed, duplicate-suppressed, lease-expired, replayed and cleaned records;
- histograms for capture-to-delivery latency, attempt duration and retry delay;
- gauges or observable measurements for pending/failed counts and oldest pending age per bounded module/Subscription dimension;
- structured logs with stable event IDs and Message ID, event name/version, Subscription, attempt, Lease ID and sanitized failure category; and
- producer/send and consumer/process Activities linked through bounded trace context according to the pinned OpenTelemetry messaging convention.

Message IDs may appear in logs and traces for diagnosis but never as metric dimensions. Payload, sensitive headers and exception dumps are excluded. Trace sampling never removes required failure metrics or durable operator state. Liveness does not fail because a downstream dependency is unavailable. Readiness/degraded status distinguishes database unavailability, stalled dispatcher, excessive oldest-message age and terminal failures according to thresholds resolved by **Define the security and observability baseline**.

### Verification matrix

The consolidated TUnit project proves the following against both PostgreSQL and SQL Server Generated Solutions rather than EF Core InMemory:

1. business change and Outbox Message commit or roll back together;
2. event snapshot acknowledgement on success and preservation on failure/cancellation/retry;
3. serialization golden files, payload limits, fingerprint conflicts and current/previous schema compatibility;
4. deterministic due selection, atomic multi-instance claim, Lease ID fencing, expiry and stale-worker rejection;
5. retry classification, jitter bounds, timeout, budget exhaustion, operator requeue and shutdown recovery under controlled `TimeProvider` and randomness;
6. crash injection before capture, before/after producer commit, after claim, before send, after consumer commit but before producer acknowledgement, and before broker acknowledgement;
7. concurrent duplicate delivery with one committed Inbox Receipt and consumer effect;
8. consumer rollback, chained consumer Outbox creation and duplicate fingerprint mismatch;
9. fan-out independence, Subscription add/remove migration rules, no-ordering behavior and replay semantics;
10. retention race safety, failed-record preservation and bounded cleanup;
11. two host instances, restart, rolling deployment and real pending old-version payloads; and
12. generated-template execution, warning-free normal publish, declared AOT profile publish, backlog throughput, capture overhead and backlog-drain benchmarks.

The critical prototype scenario is a mandatory regression test in the production TDD implementation: the consumer commits, the dispatcher crashes before acknowledgement, the lease expires, the Message is delivered again, the Inbox recognizes the same fingerprint, and the durable consumer effect remains singular.

### Evidence and current implementation migration

EF Core documents that one `SaveChanges` call is transactional and exposes before/success/failure SaveChanges interception points, supporting same-context Outbox capture and snapshot acknowledgement ([transactions](https://learn.microsoft.com/en-us/ef/core/saving/transactions), [interceptors](https://learn.microsoft.com/en-us/ef/core/logging-events-diagnostics/interceptors)). PostgreSQL documents `SKIP LOCKED` specifically as suitable for multiple consumers of a queue-like table, while SQL Server documents `READPAST` for work queues and its isolation-level constraints ([PostgreSQL locking clause](https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE), [SQL Server table hints](https://learn.microsoft.com/en-us/sql/t-sql/queries/hints-transact-sql-table?view=sql-server-ver17)). .NET provides hosted worker lifecycle and source-generated JSON metadata, and OpenTelemetry defines producer/consumer messaging correlation through message creation context and span links ([Worker Services](https://learn.microsoft.com/en-us/dotnet/core/extensions/workers), [System.Text.Json source generation](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/source-generation), [OpenTelemetry messaging spans](https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/)). Exact SQL, package versions and still-evolving telemetry convention versions remain pinned and tested release inputs rather than copied snippets.

Remove the active `IOutboxStore`, `OutboxMessage`, `InMemoryOutboxStore`, broad singleton registration and `OutboxSaveChangesInterceptor`. The current interceptor emits a fixed `db.saved` marker only after the business transaction succeeds and writes it to volatile memory, so it proves none of the accepted atomicity, contract, fan-out, lease, Inbox, retry, restart or observability semantics. Do not preserve it behind a compatibility Adapter.

This decision amends **Specify persistence ownership and migration operations** and **Design the exact Platform Library topology** only by admitting the evidenced `MartiX.Platform.EntityFrameworkCore.ReliableEvents` deep module without adding a project. It completes the Domain Event collection lifecycle deferred by **Audit accepted decisions for composition over inheritance**. **Select the initial infrastructure capability providers** owns concrete broker choices and provider packages; **Define the security and observability baseline** owns final operator authorization, audit, health and telemetry contracts; **Define executable quality gates and template verification** owns executable release lanes and thresholds.

### Adopt, adapt, reject and defer

Adopt transactional module-owned Outbox capture, immutable Messages, per-Subscription Delivery Attempts, atomic Inbox Receipts, at-least-once delivery, durable polling, fenced leases, bounded jittered retries, explicit terminal failures, source-generated versioned JSON, in-process serialized delivery, chained outboxes and real-provider failure evidence.

Adapt the prototype's single Outbox status into separate immutable Message and fan-out Delivery records; adapt the current EF Core package by adding one governed deep `ReliableEvents` area; adapt transport into a public provider seam only after a second real Adapter exists.

Reject exactly-once transport claims, best-effort in-memory dispatch, after-commit enqueue, mutable payloads, CLR type names on the wire, automatic event discovery, generic repositories/event buses, public handler-per-class Interfaces, unbounded Channels/concurrency/retry, cross-module transactions, external effects inside Inbox transactions, silent unknown-version discard, email-style dead-letter loss, and another default project.

Defer ordered streams/partitions, event sourcing, Kafka-style streaming, multi-broker routing, historical Subscription backfill automation, claim-check payloads, concrete broker providers and operator UI until their owning tickets or concrete domain forces resolve them.
