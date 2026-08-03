---
title: Use one composable template system with tested presets
status: closed
type: wayfinder:grilling
parent: ../map.md
resolved: 2026-07-15
---

## Question

Should MartiX maintain independent templates or one composable Template System?

## Resolution

Maintain one composable Template System with shared building blocks and three supported, tested Presets: `api`, `modular-monolith`, and `full-stack`. The `modular-monolith` Preset is the default.

## Rationale

Independent templates would drift in security defaults, package versions, module conventions, testing, and fixes. A single composition model makes each capability selectable while preserving one source of truth. Named Presets reduce decision fatigue and provide stable combinations for CI, documentation, and support.

The Modular Monolith default fits the primary consumer: it provides explicit Business Module ownership and future decomposition seams while retaining one deployable application and ordinary in-process calls.

## Alternatives considered

- Separate unrelated template repositories or code copies. Rejected because drift and duplicated maintenance would be inevitable.
- A single minimal API template with no Presets. Rejected because it would not provide a sufficiently prepared starting point for the expected applications.
- Full Stack as the default. Rejected because UI is not universal.

## Evidence

Accepted during the Wayfinder charting interview on 2026-07-15.
