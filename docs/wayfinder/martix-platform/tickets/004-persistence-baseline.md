---
title: Standardize persistence without hiding EF Core
status: closed
type: wayfinder:grilling
parent: ../map.md
resolved: 2026-07-15
---

## Question

What persistence model and provider policy should the default platform use?

## Resolution

Use EF Core as the standard application data layer. Business Modules own their `DbContext` types and migrations. PostgreSQL is the default provider, while SQL Server is an equally verified supported choice. Generated solutions include an explicit one-shot migration operation.

Do not place a provider-neutral repository abstraction over every query. Use EF Core directly in Infrastructure and project only the data each use case needs.

## Rationale

EF Core already supplies unit-of-work, change tracking, transactions, query translation, and migrations. A generic repository commonly hides useful features while leaking `IQueryable` or accumulating special methods. Module-owned contexts preserve data ownership and create clearer future decomposition seams.

An explicit provider choice prevents false portability. Testing both PostgreSQL and SQL Server protects the supported contract without pretending their SQL, concurrency, or migration behavior is identical.

## Alternatives considered

- A single application-wide `DbContext`. Rejected as the modular default because it weakens Business Module ownership.
- Mandatory generic repositories and unit-of-work wrappers. Rejected because they duplicate EF Core and tend to become shallow interfaces.
- Provider-neutral behavior without provider-specific verification. Rejected as misleading.

## Evidence

Accepted during the Wayfinder charting interview; detailed provider and migration behavior remains an open ticket.
