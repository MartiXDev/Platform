# MartiX Platform

`MartiXDev/Platform` is the canonical greenfield source for the MartiX Platform.
It is currently in Repository Bootstrap: identity, provenance, governance, and
the cross-platform verification contract are established before runtime
capabilities are admitted.

## Verify the repository

```text
npm ci
npm run verify:fast
npm run verify:pr
```

The local `fast` cadence is the normal feedback loop. The `pull-request`
cadence is the required CI entry point; both invoke the same
`eng/verify.mjs` entrypoint and `eng/quality-gates.json` policy.

## Authorities

- `martix.platform.json` and `schemas/` define machine-readable identity and
  composition.
- `eng/generate-api.mjs` generates the deterministic Lean API Preset; use
  `npm run verify:api` for the packed, isolated-feed release loop and its
  immutable candidate evidence under `artifacts/api-release/`.
- `AGENTS.md` routes contributors and agents.
- `CONTEXT.md` defines Platform vocabulary.
- `PROVENANCE.md`, `CONTRIBUTING.md`, `SECURITY.md`, and `LICENSE` define
  repository governance.
- `tests/fixtures/RepositoryBootstrapGeneratedSolution/` is the temporary,
  explicitly named Generated Solution acceptance seam.

Repository Bootstrap makes no Supported Capability claim. The empty
`supportClaims` arrays are intentional and must remain empty until a later
tracer bullet supplies complete evidence.
