---
title: Give generated solutions ownership of their source
status: closed
type: wayfinder:grilling
parent: ../map.md
resolved: 2026-07-15
---

## Question

How should Generated Solutions receive future Platform improvements after application teams modify them?

## Resolution

A Generated Solution owns its source immediately after creation. Do not reapply templates over modified applications. Deliver stable reusable behavior through Platform Library updates and deliver source-shape changes through explicit, versioned, reviewable Platform Migrations.

Every solution carries a Capability Manifest describing its origin. Migration support can include documentation, analyzers, code fixes, validation tests, and an Agent Skill that inspects the actual repository before changing it.

## Rationale

Generated code quickly acquires business-specific modules, authentication policy, migrations, deployment settings, and other intentional changes. A template reapplication engine would need to infer ownership and merge semantics and could silently overwrite application decisions.

Package updates handle centrally owned behavior well. Explicit migrations handle application-owned source honestly and create an auditable review point. The manifest lets tools reason about the expected starting contract without pretending the generated tree is unchanged.

## Alternatives considered

- Re-run templates over existing applications. Rejected because conflict and ownership behavior would be fragile.
- Never support existing applications after generation. Rejected because it undermines long-term maintainability.
- Put all architecture into binary packages to make upgrades automatic. Rejected because application-specific source must remain understandable and adaptable.

## Evidence

Accepted during the Wayfinder charting interview; the release and migration policy remains an open ticket.
