# Release Candidate Verification

- **What:** Added a closed, digest-bound Release Candidate evidence contract,
  named Generated Solution fixture, complete release gate coverage, and the
  `npm run verify:release-candidate` verification path.
- **Why:** Release promotion must prove the exact bytes, retained attempts, and
  cross-cadence evidence that produced one immutable candidate instead of
  treating a retry-to-green result or in-place patch as release evidence.
- **Decisions:** Keep the candidate claim-free; require all artifact kinds,
  compatibility/reproducibility/licensing, provider/migration/security/
  performance/deployment, documentation, and agent-readiness evidence; require
  build-once and promotion-without-rebuild; create a new candidate and rerun
  affected gates for blocking fixes.
- **Current implementation:** `eng/release-candidate.mjs`,
  `schemas/release-candidate.schema.json`, the
  `ReleaseCandidateGeneratedSolution` fixture, and the release-candidate
  profile in `eng/quality-gates.json` are wired through `eng/verify.mjs`.
- **Rejected alternatives:** No mutable release manifest, hidden failed
  attempts, rebuild during promotion, or new Supported Capability claim.
- **Migration path:** Existing bootstrap, Modular Monolith alpha, and Beta
  evidence remain valid inputs to the Release Candidate cadence. Future
  promotion receipts and external attestations extend this contract without
  changing the claim-free fixture.
- **Risks:** The evidence contract depends on synchronized artifact, gate, and
  schema identities; drift in any input must fail verification rather than
  silently producing a different candidate.
- **Verification:** The focused Release Candidate evidence test and the
  repository typecheck/test/PR gates are the applicable verification surfaces;
  existing unrelated baseline failures remain recorded by the repository's
  current verification output.
- **Consequences and extension triggers:** Release-blocking changes must
  invalidate the prior candidate and produce new digest-bound evidence.
  Promotion receipts and external signing/attestation integration remain
  deferred until their authorities and executable inputs exist.
- **Superseded decisions:** Not applicable; this fragment extends the existing
  bootstrap, alpha, and Beta cadence contracts.
