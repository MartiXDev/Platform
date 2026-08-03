---
title: Use Minimal APIs as the canonical HTTP model
status: closed
type: wayfinder:grilling
parent: ../map.md
resolved: 2026-07-15
---

## Question

Should the Platform standardize on native Minimal APIs or FastEndpoints?

## Resolution

Use native ASP.NET Core Minimal APIs as the canonical and default HTTP model. Offer FastEndpoints later as a separately versioned optional adapter after the native path is complete. Initial feature parity is not required.

## Rationale

Minimal APIs are first-party, integrate directly with typed results, problem details, OpenAPI, validation, and AOT improvements, and avoid making a third-party framework part of the Platform Baseline. FastEndpoints provides a strong request-endpoint-response organization, secure defaults, validation, and test helpers, but it introduces another lifecycle and generator surface.

Performance differences are too small and context-dependent to decide the architecture. Interface clarity, support burden, and compatibility are more important.

## Alternatives considered

- Make FastEndpoints mandatory. Rejected because the Platform can provide vertical-slice organization without requiring a third-party endpoint framework.
- Maintain full parity from the beginning. Rejected because it would split effort before the canonical contract is stable.
- Use controllers as the canonical model. Deferred because focused vertical slices map naturally to Minimal APIs; controllers remain a possible future capability if concrete needs appear.

## Evidence

The current Minimal API mapper returns broad `IResult` and creates resources at `/`; the current FastEndpoints mapper manually carries numeric statuses. Both need redesign, so existing code does not justify preserving either interface unchanged.
