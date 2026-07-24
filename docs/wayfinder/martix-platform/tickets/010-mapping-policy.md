---
title: Use explicit compile-time mapping
status: closed
type: wayfinder:grilling
parent: ../map.md
resolved: 2026-07-15
---

## Question

What mapping model should be canonical across vertical slices?

## Resolution

Mappings are explicit, compile-time, and owned by the vertical slice that needs them. Use direct constructors, factories, or projections by default. Offer Mapperly as an optional source-generated capability for repetitive mappings. Do not expose a global `IObjectMapper` or runtime mapping registry.

## Rationale

Mapping is part of a use case's contract and often controls EF Core projection and query cost. Slice-local code is visible, refactorable, and AOT-friendly. Repetition of a few assignments is preferable to hiding semantics behind runtime lookup; DRY applies when the same mapping knowledge genuinely changes together.

Mapperly can remove mechanical repetition while preserving build-time diagnostics and readable generated code.

## Alternatives considered

- A global runtime mapper. Rejected because failures move to runtime and mapping ownership becomes unclear.
- Mandatory Mapperly. Rejected because simple mappings do not need a generator.
- A provider-neutral object-mapping interface. Rejected because it hides different capabilities such as in-memory mapping and query projection.

## Evidence

The current `Integrations/Mapster` code does not use Mapster. It stores object-based delegates in a mutable singleton registry, uses exact runtime types, can overwrite registrations, cannot project EF queries, and fails only at runtime when a mapping is missing.
