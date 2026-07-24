---
title: Adopt an AOT-conscious compatibility policy
status: closed
type: wayfinder:grilling
parent: ../map.md
resolved: 2026-07-15
---

## Question

Should every generated application require Native AOT compatibility?

## Resolution

Be AOT-conscious rather than require Native AOT everywhere. Core Platform Libraries should be trimming-friendly and avoid unjustified reflection or runtime scanning. Supported compatible combinations receive Native AOT publish and smoke verification. The default Modular Monolith remains optimized for JIT unless its selected capabilities pass the AOT matrix.

## Rationale

Native AOT can improve startup time and memory use, but identity, EF Core behavior, UI technologies, serializers, and third-party integrations may constrain it. A universal requirement would exclude useful capabilities or encourage untruthful compatibility claims.

Keeping core surfaces AOT-friendly prevents avoidable lock-in. A tested capability matrix makes compatibility an executable promise rather than a project-wide property declaration.

## Alternatives considered

- Require Native AOT for every Preset. Rejected because it would distort architecture around capabilities that may not support it.
- Ignore AOT entirely. Rejected because reflection-heavy choices are hard to unwind and conflict with performance goals.
- Mark the complete package AOT-compatible without combination tests. Rejected because broad declarations can conceal incompatible code paths.

## Evidence

The current `MartiX.WebApi` project declares trimming and AOT compatibility while some client JSON methods declare dynamic-code and unreferenced-code requirements. The exact matrix remains an open ticket.
