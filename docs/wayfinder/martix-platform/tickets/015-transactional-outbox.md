---
title: Include a durable transactional outbox in the modular preset
status: closed
type: wayfinder:grilling
parent: ../map.md
resolved: 2026-07-15
---

## Question

Should reliable Integration Event delivery be built into the default Modular Monolith or added only later?

## Resolution

Include a production-grade relational Transactional Outbox by default in the `modular-monolith` Preset and keep it optional for `api`. Persist Integration Events in the same transaction as business changes, then dispatch after commit. Initial delivery can remain in process; broker adapters are optional.

The design must state at-least-once semantics and address concurrency-safe claiming, retries, failure states, idempotency or inbox handling, retention, health, metrics, logs, and traces.

## Rationale

Reliable publication is invasive to retrofit after applications already assume best-effort in-process delivery. A relational outbox uses the database already present in the modular Preset and does not require distributed infrastructure. When no Integration Events exist, its operational activity is minimal.

The outbox is not an exactly-once guarantee. Explicit at-least-once semantics make consumer idempotency and operational recovery part of the contract.

## Alternatives considered

- Best-effort in-memory delivery. Rejected because committed business changes can outlive lost events.
- Add an outbox only when a broker is introduced. Rejected because reliable local cross-module reactions have the same commit gap.
- Require a broker in the default Preset. Rejected because durable storage and external transport are separate concerns.

## Evidence

The current interceptor creates a fixed `db.saved` marker after `SaveChanges`, outside the original transaction. Its singleton in-memory store loses messages on restart and the repository shows no complete dispatcher, leasing, retry, or recovery path.
