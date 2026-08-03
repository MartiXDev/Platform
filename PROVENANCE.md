# Platform provenance

`MartiXDev/Platform` is the canonical greenfield source for the MartiX Platform.
The repository is owned and distributed by MartiXDev under the Apache License
2.0 in `LICENSE`.

The `docs/wayfinder/` tree is a historical provenance snapshot imported from
`MartiX.WebApi`. The import was recorded in commit
`1f4d2c89ba9e00b784215c0e4a6d34244b1fb092`; the exact upstream source revision
was not captured. That limitation is recorded in `martix.platform.json` rather
than being replaced with an invented revision.

Current architecture, machine-readable composition, verification policy, and
agent routing have one authority each:

- `CONTEXT.md` owns vocabulary.
- `docs/architecture/` owns current architecture.
- `martix.platform.json` owns repository or Generated Solution composition.
- `eng/quality-gates.json` owns executable gate policy.
- `AGENTS.md` routes contributors and agents to those authorities.

Repository Bootstrap establishes identity and provenance only. Its manifest
contains no secrets, and its empty `supportClaims` array deliberately makes no
Supported Capability claim.
