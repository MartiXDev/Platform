# Current architecture authority

This directory is the authority for the current Platform architecture. The
historical Wayfinder material under `docs/wayfinder/` supplies provenance and
decision evidence; it is not an editable implementation map.

Repository Bootstrap establishes the following minimum structure:

- `martix.platform.json` is the exact, secret-free composition manifest.
- `eng/quality-gates.json` is the machine-readable verification policy.
- `eng/verify.mjs` is the cross-platform verification entrypoint.
- `tests/fixtures/RepositoryBootstrapGeneratedSolution/` is the temporary named
  acceptance seam.

Architecture Decision Records are added under `docs/adr/` only when an
implementation decision is hard to reverse or surprising. This page does not
replace the manifest or quality policy.
