## Entity Framework Core

### Purpose

Set the default rules for `DbContext` lifetime, migrations, querying, saving,
and reliability in EF Core-based applications.

### Default guidance

- Use a short-lived `DbContext` per unit of work, usually scoped per request in
  ASP.NET Core apps.
- Keep entity modeling, migrations, and schema evolution deliberate and
  reviewable.
- Prefer projection, filtered includes, indexes, and batching-aware save
  patterns before reaching for premature caching or raw SQL.
- Use provider-supported execution strategies, optimistic concurrency handling,
  and transaction boundaries intentionally.

### Avoid

- Do not keep a `DbContext` alive across unrelated operations or background
  lifetimes.
- Do not assume the in-memory provider proves relational behavior, translation,
  or concurrency correctness.
- Do not mix raw SQL, retries, and custom transactions casually; understand the
  provider semantics first.

### Review checklist

- Context lifetime and ownership are clear.
- Queries project only needed data and account for loading strategy.
- Tests use realistic providers for behavior that depends on translation,
  transactions, or concurrency.

### Related files

- [Serialization guidance](./data-serialization.md)
- [Testing guidance](./testing-unit-integration.md)
- [Data stack source map](../references/data-stack-map.md)

### Source anchors

- [EF Core documentation hub](https://learn.microsoft.com/en-us/ef/core/)
- [Efficient querying](https://learn.microsoft.com/en-us/ef/core/performance/efficient-querying)
- [Handling concurrency conflicts](https://learn.microsoft.com/en-us/ef/core/saving/concurrency)
- [Connection resiliency](https://learn.microsoft.com/en-us/ef/core/miscellaneous/connection-resiliency)
