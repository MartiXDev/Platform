---
title: Separate transport validation from business rules
status: closed
type: wayfinder:grilling
parent: ../map.md
resolved: 2026-07-15
---

## Question

How should request shape validation and application or domain rules be divided?

## Resolution

Use a two-level native-first model. ASP.NET Core transport validation handles request shape, required values, ranges, and formats and returns standard validation problem details. Application and domain code enforce business invariants using structured MartiX validation errors. FluentValidation is optional for complex reusable, conditional, or localized rules.

Remove string-returning request validators and mediator-bound validation behaviors from the canonical path.

## Rationale

Transport shape and business validity change for different reasons and need different ownership. Keeping them separate avoids coupling domain rules to HTTP or a mediator pipeline. Structured errors preserve identifiers and codes across transports and tests.

Native validation covers common cases with fewer dependencies. FluentValidation remains valuable when rules exceed declarative attributes or must be composed across requests.

## Alternatives considered

- Put every rule in endpoint DTO attributes. Rejected because business invariants must hold outside HTTP.
- Require FluentValidation everywhere. Rejected because simple transport rules do not justify another dependency.
- Return strings from validators. Rejected because strings lose structured identifiers and stable error codes.

## Evidence

The current mediator validators return strings, and their conversion can produce validation errors without meaningful identifiers. Duplicate generic validation behaviors are not connected to a complete dispatch pipeline.
