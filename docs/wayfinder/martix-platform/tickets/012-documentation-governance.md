---
title: Establish layered documentation authority
status: closed
type: wayfinder:grilling
parent: ../map.md
resolved: 2026-07-15
---

## Question

Where should terminology, decisions, current architecture, agent rules, and workflows live?

## Resolution

Use a layered authority model:

1. `CONTEXT.md` defines canonical Platform vocabulary only.
2. Wayfinder tickets hold complete decision rationale and evidence.
3. ADRs record only hard-to-reverse, surprising decisions with real trade-offs.
4. Architecture documents describe the current approved target without repeating full historical rationale.
5. A machine-readable Capability Manifest and executable tests enforce supported combinations.
6. `AGENTS.md` provides compact mandatory routing, invariants, and commands.
7. Skills provide implementation and maintenance workflows that consume the authoritative documents.
8. Tool-specific instruction files remain thin bridges to the same authority.

## Rationale

Each document type serves a different reader and change rate. Combining all content in `AGENTS.md`, a Skill, or one context file would make instructions large, contradictory, and stale. Separating vocabulary, rationale, current state, enforcement, and workflow provides traceability without duplication.

## Alternatives considered

- Store everything in `CONTEXT.md`. Rejected because a glossary should not become an architecture specification.
- Store rationale in `AGENTS.md` or Copilot instructions. Rejected because agents need concise operational guidance.
- Make a Skill the source of truth. Rejected because skills should implement workflows and remain replaceable.
- Create an ADR for every choice. Rejected because routine or reversible decisions would bury important records.

## Evidence

Explicitly required and accepted during the Wayfinder charting interview. `CONTEXT.md` was created as the first governance artifact.
