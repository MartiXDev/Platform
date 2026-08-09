# Canonical Cutover and Predecessor Archival

- **What:** Added the closed canonical cutover evidence contract, the
  `CanonicalCutoverGeneratedSolution` fixture, immutable cutover documentation,
  and the `canonical.cutover` release-candidate gate.
- **SemVer impact:** Records post-promotion Stable `1.0.0` cutover evidence; it
  adds no Supported Capability claims or compatibility promises.
- **Affected audiences:** Consumers installing public packages or templates,
  release operators, documentation readers, and Marketplace Skill consumers.
- **Why:** Platform needs one digest-bound canonical source and distribution
  route before predecessor repositories become read-only archival provenance.
- **Decisions:** Bind installation, Generated Solution smoke, documentation,
  evidence, and one-way Marketplace Skill checks to the promoted Stable bytes;
  identify `MartiXDev/Platform` as the sole actively maintained source; record
  exact `1.0.0` / `2026-08-09` archival banners; preserve predecessor history;
  reject bridge packages and duplicate editable documentation or Skill sources.
- **Current implementation:** `eng/canonical-cutover.mjs`,
  `schemas/canonical-cutover.schema.json`, the
  `CanonicalCutoverGeneratedSolution` fixture, the canonical quality profile
  and gate in `eng/quality-gates.json`, and `tests/canonical-cutover.test.mjs`
  are wired through `eng/verify.mjs`.
- **Rejected alternatives:** No mutable cutover manifest, rebuild during
  cutover, compatibility package, migration contract, bridge package,
  Marketplace reverse sync, or second editable source.
- **Migration path:** The accepted Stable `1.0.0` evidence remains the input to
  the cutover seam. Predecessors remain preserved read-only provenance; future
  releases extend the same digest-bound chain rather than editing this record.
- **Migration disposition:** No predecessor migration contract is provided.
  The cutover is an archival and authority transition, not an application
  migration.
- **Required consumer action:** Consumers must install and verify the promoted
  Stable `1.0.0` bytes from the canonical Platform route and must not infer a
  compatibility or migration contract from either predecessor.
- **Verification:** The focused canonical cutover test, standalone
  `npm run verify:canonical-cutover`, `npm run typecheck`, `npm run test`, and
  the release-candidate verification surface are applicable. Existing
  line-ending and unrelated evidence-digest failures in the dirty baseline
  remain outside this change.
- **Consequences and extension triggers:** Platform is the only editable
  authority for current documentation and Skill behavior. A new distribution
  route, compatibility claim, migration contract, or predecessor change
  requires new evidence and an explicit policy decision.
- **Deferred scope:** Performing external GitHub repository archival and
  authenticated registry attestations remains operational follow-up; this
  repository records the immutable cutover contract and exact banner payload.
- **Superseded decisions:** Not applicable; this fragment extends Stable
  promotion and completes its post-promotion cutover seam.
