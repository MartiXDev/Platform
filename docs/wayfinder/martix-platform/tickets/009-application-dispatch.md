---
title: Use direct application operations by default
status: closed
type: wayfinder:grilling
parent: ../map.md
resolved: 2026-07-15
---

## Question

Should every application operation be dispatched through a mediator abstraction?

## Resolution

Invoke concrete Application Operations directly by default. Remove the current pseudo-mediator contracts. A source-generated mediator may be selected as an optional capability when generic pipelines, request fan-out, or other demonstrated forces justify it; when selected, use its native contracts instead of MartiX wrappers.

Keep a real Domain Event and Integration Event publication seam independent of request dispatch.

## Rationale

Direct invocation is explicit, easy to navigate, easy to test, and has minimal runtime machinery. A mediator provides leverage only when multiple operations consistently need generic behaviors or dispatch semantics. Wrapping another mediator preserves its complexity while adding a second contract to learn.

Request dispatch and event publication have different semantics and should not be conflated.

## Alternatives considered

- Require a mediator in every Preset. Rejected because most initial use cases do not need runtime dispatch.
- Maintain MartiX request and pipeline interfaces over another mediator. Rejected as a shallow abstraction.
- Remove all event publication seams. Rejected because Domain Events and Integration Events represent real behavior variation.

## Evidence

The current repository defines request handlers, validators, and pipeline behaviors but no complete sender or composition path. The sample injects handlers directly, so the validation behavior is not automatically executed.
