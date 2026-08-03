---
title: Make TDD and layered verification the quality standard
status: closed
type: wayfinder:grilling
parent: ../map.md
resolved: 2026-07-15
---

## Question

What testing philosophy and toolchain should govern Platform and Generated Solution development?

## Resolution

Use strict test-driven development and TUnit on Microsoft.Testing.Platform as the standard. Verify behavior at the narrowest meaningful seam and add architecture tests, `WebApplicationFactory` contract tests, Testcontainers with the selected relational provider, template-generation smoke tests, and measured performance or AOT gates where risk justifies them.

## Rationale

No single test layer can validate a template platform. Unit tests protect domain and application behavior; architecture tests protect dependency rules; host tests protect HTTP contracts; container tests protect actual provider translation and transactions; template tests ensure generated combinations compile and run.

TDD keeps interfaces driven by behavior and makes refactoring safer. Real-provider tests are necessary because in-memory substitutes cannot prove relational semantics.

## Alternatives considered

- Unit tests only. Rejected because they cannot validate hosting, generation, database, or architecture contracts.
- End-to-end tests only. Rejected because failures would be slow and poorly localized.
- Treat generated projects as untested examples. Rejected because template correctness is a primary Platform product.

## Evidence

The repository already uses TUnit. The detailed quality-gate matrix remains an open ticket.
