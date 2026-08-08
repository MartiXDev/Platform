# MartiX.Platform.EntityFrameworkCore

EF Core persistence primitives used by generated MartiX Platform solutions.

The package provides deterministic database naming, UTC entity timestamp
interception, application-managed concurrency tokens, immutable,
non-materializing query specifications, and the `ReliableEvents` deep module.
Specifications support composition, includes, type-safe ordering, deterministic
paging, projection, and optional no-tracking execution. Database contexts,
mappings, migrations, subscriptions, event contracts, and provider selection
remain owned by each generated Business Module.

Reliable Events persist immutable Outbox Messages, separately leased and fenced
Delivery Attempts, and consumer-owned Inbox Receipts. The module supplies
explicit event mappings and serialized envelopes; the package does not scan
assemblies, expose a generic event bus, or claim exactly-once transport.
