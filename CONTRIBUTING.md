# Contributing to MartiX Platform

`MartiXDev/Platform` is the canonical source for the MartiX Platform. Make
changes here rather than editing the historical `docs/wayfinder` snapshot or
the legacy `MartiX.WebApi` source.

## Before opening a pull request

1. Read `AGENTS.md`, `CONTEXT.md`, and the relevant authority documents.
2. Keep the change on a focused issue branch and record the observable outcome
   in the pull request.
3. Run `npm run typecheck`, `npm run test`, and `npm run verify:pr`.
4. Do not commit credentials, tokens, private keys, local environment files, or
   generated output that is not owned by the change.

The root manifest and quality-gate policy are machine-readable authorities.
Update them deliberately when their contract changes; do not duplicate their
state in CI-specific scripts.
