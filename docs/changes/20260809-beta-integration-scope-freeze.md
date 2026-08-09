---
impact: minor
areas:
  - compatibility
  - quality-gates
  - release-evidence
audiences:
  - platform-maintainers
  - generated-solution-teams
migration: none
---

# Beta integration and scope freeze

## What changed

The repository now records a deterministic, risk-based Beta integration matrix
and freezes the initial 1.0 Capability and public-contract scope. The matrix
covers the three Presets, endpoint models, relational providers, authentication
profiles, UI providers, admitted infrastructure providers, deployment profiles,
Platform Migration rehearsal, documentation, and Agent Context evidence.

## Why

Beta needs one claim-free evidence seam so that provider and feature scope
cannot grow while the release train is being prepared.

## Consumer action

No application changes are required. Maintainers must use the Beta gate for
scope decisions and may add only defects, evidence gaps, or release blockers
after the freeze.

## Compatibility and migration

This is a release-policy and evidence change. It does not change Generated
Solution runtime behavior or require a migration.

Active24-specific deployment and parked native-mobile profiles remain
explicitly Not Attested and have no Supported claim.
