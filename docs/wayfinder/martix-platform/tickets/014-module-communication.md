---
title: Use hybrid communication between business modules
status: closed
type: wayfinder:grilling
parent: ../map.md
resolved: 2026-07-15
---

## Question

Should Business Modules communicate synchronously, asynchronously, or through one mandatory mechanism?

## Resolution

Use a deliberate hybrid model. A Business Module can call another through a small Module Contract when it needs an immediate response or consistency decision. Use Integration Events for independent reactions where eventual consistency is accepted. Domain Events remain internal to their owning Business Module.

No Business Module may access another module's internal entities, `DbContext`, or Infrastructure. A message broker is not mandatory for the Modular Monolith.

## Rationale

Forcing events into synchronous decision flows hides control flow and complicates error handling. Direct calls everywhere, however, couple modules and make independent reactions harder. Selecting the mechanism from consistency and ownership requirements keeps behavior explicit.

Separating Domain Events from Integration Events prevents internal model facts from becoming accidental public contracts.

## Alternatives considered

- Events for all module communication. Rejected because request-response and immediate consistency become unnecessarily indirect.
- Direct project references to module internals. Rejected because they erase module ownership.
- Require an external broker. Rejected because the modular monolith should remain operationally simple until external delivery is needed.

## Evidence

Accepted during the Wayfinder charting interview. The exact contract and delivery semantics remain open tickets.
