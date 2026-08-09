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

## Relationship to the current implementation

The `beta-integration` Quality Gate owns the
`BetaIntegrationGeneratedSolution` fixture, its versioned evidence schema, and
the release-candidate verification path. The fixture is repository-owned
release evidence, not a template source to reapply over application code.

## Alternatives considered

Keeping the matrix only in the quality policy would split the evidence across
machine policy and fixture data. A named, claim-free fixture keeps the
coordinates, evidence references, review inputs, and scope decision together
while leaving the application runtime unchanged.

## Verification evidence

The release-candidate gate is exposed through
`npm run verify:beta-integration`; the focused regression coverage is in
`tests/beta-integration.test.mjs`. The fixture records the matrix and evidence
digests checked by the verifier.

## Consequences and risks

Maintainers have one deterministic seam for Beta scope review, but evidence
references and their source files must remain synchronized. The gate records
metadata and references; it does not turn deferred Active24 or native-mobile
profiles into support claims.

## Deferred scope and extension triggers

Active24 and native-mobile remain deferred until their stated re-entry evidence
exists. Defects, evidence gaps, and release blockers may be repaired after the
freeze; a new feature or provider requires a later scope decision and
independent attestation.

## Supersession

No earlier repository-owned Beta integration decision is superseded by this
record.
