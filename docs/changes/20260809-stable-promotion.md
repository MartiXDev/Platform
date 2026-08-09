# Stable 1.0.0 Promotion

- **What:** Added the closed Stable promotion evidence contract, the
  `StablePromotionGeneratedSolution` fixture, immutable `1.0.0` release
  documentation, and the `stable.promotion` release-candidate gate.
- **SemVer impact:** Establishes the first stable major-floor baseline at
  `1.0.0`; it adds no Supported Capability claims.
- **Affected audiences:** Release operators and consumers of the synchronized
  packages, template, Tool, documentation, Skills, schemas, and evidence.
- **Why:** Stable publication must copy the accepted Release Candidate bytes
  without rebuilding, cover the synchronized artifact family and authoritative
  destinations, and establish the first `1.0.0` Major Floor baseline.
- **Decisions:** Bind every Stable artifact to its accepted RC artifact and
  identical digest; require the complete publication receipt set, explicit
  build-once promotion state machine, immutable versioned documentation, and
  empty provider/deployment/migration/predecessor/support claims. Keep the
  existing four cadence model and run Stable promotion as the final
  release-candidate-only gate.
- **Current implementation:** `eng/stable-promotion.mjs`,
  `schemas/stable-promotion.schema.json`,
  `tests/fixtures/StablePromotionGeneratedSolution`, the stable policy profile
  and gate in `eng/quality-gates.json`, and `tests/stable-promotion.test.mjs`
  are wired through `eng/verify.mjs`.
- **Rejected alternatives:** Rebuilding stable bytes, relabeling an RC,
  patching a published version in place, publishing partial destinations, or
  adding unsupported provider/deployment/migration claims.
- **Migration path:** The accepted RC remains the source of truth for the
  initial promotion. A future publication run may attach signed receipts and
  authenticated approvals to this evidence without changing the exact-byte
  contract.
- **Migration disposition:** There is no predecessor stable release to migrate
  from; the `1.0.0` baseline is established as a new major floor.
- **Required consumer action:** Consumers adopting Stable `1.0.0` must verify
  the promotion evidence and use the synchronized `1.0.0` artifact set.
- **Verification:** The focused stable promotion tests, standalone
  `npm run verify:stable-promotion`, repository typecheck, and existing
  release-candidate verification surface are the applicable checks. The
  release-candidate command still reports the pre-existing Local Orchestration
  projection digest failure after the stable gate wiring is reached.
- **Consequences and extension triggers:** A failed final gate or publication
  burns the reserved version and requires a new candidate; any new destination,
  provider, deployment, migration, or predecessor claim requires independent
  evidence and a policy decision.
- **Deferred scope:** External registry publication, authenticated human
  approval transport, and predecessor archival remain operational follow-up
  work; this repository records and verifies the immutable evidence contract.
- **Superseded decisions:** Not applicable; this record extends the accepted
  Release Candidate verification decision.
