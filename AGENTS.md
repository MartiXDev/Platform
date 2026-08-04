## Agent skills

### Issue tracker

Issues and PRDs are tracked in GitHub Issues for this repository. See `docs/agents/issue-tracker.md`.

### Triage labels

Triage uses the canonical five-label vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Domain docs use a single-context layout (`CONTEXT.md` + `docs/adr/` at repo root). See `docs/agents/domain.md`.

### Wayfinder

The active planning map is [Reconcile the MartiX Platform canonical planning handoff](https://github.com/MartiXDev/Platform/issues/3), and the active implementation handoff is [Implement the reconciled MartiX Platform blueprint](https://github.com/MartiXDev/Platform/issues/7). GitHub Issues are the active Wayfinder decision and ticket surface.

The `docs/wayfinder/` tree is a historical provenance snapshot generated in `MartiX.WebApi`; its exact source revision was not captured, and it was imported into Platform in commit `1f4d2c89ba9e00b784215c0e4a6d34244b1fb092`. Use it for historical decisions and evidence only; do not treat its local map or ticket files as the active tracker or rewrite the snapshot.

## Repository bootstrap routing

The canonical repository identity and provenance are in `PROVENANCE.md`;
licensing is in `LICENSE`; contribution rules are in `CONTRIBUTING.md`; and
vulnerability reporting is in `SECURITY.md`.

Machine-readable composition belongs in `martix.platform.json` and
`schemas/martix.platform.schema.json`. Quality-gate policy belongs in
`eng/quality-gates.json`; run it through `eng/verify.mjs` rather than
reimplementing policy in CI or shell scripts.

Use these repository-owned commands:

- `npm run verify:fast` for local work;
- `npm run verify:pr` for pull-request validation;
- `npm run test` and `npm run typecheck` for the package/build skeleton.

Do not add secrets, credentials, private keys, or Supported Capability claims to
the bootstrap manifests. The explicitly named acceptance seams are
`tests/fixtures/RepositoryBootstrapGeneratedSolution/` and
`tests/fixtures/ModularMonolithGeneratedSolution/`.
