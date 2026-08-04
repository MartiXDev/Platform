# Current architecture authority

`docs/architecture/` is the authority for the current MartiX Platform
architecture. The historical Wayfinder material under `docs/wayfinder/`
supplies provenance, rationale, alternatives, and research evidence. It is not
an editable implementation map.

The repository is currently in Repository Bootstrap at
`0.0.0-bootstrap`. The pages in this directory therefore use explicit maturity
labels: **Implemented** describes behavior that exists in this repository;
**Approved target** describes the architecture that implementation must reach;
and **Deferred** describes a deliberately unresolved or parked option. An
approved target is not a Supported Capability claim.

## Reading order

- [Platform target architecture](platform-target.md) summarizes the package
  family, Presets, Capability composition, ownership, and deferred scope.
- [Generated Solution topology](generated-solution-topology.md) describes the
  generated project graph and runtime boundaries.
- [Quality and release architecture](quality-and-release.md) describes
  verification, compatibility evidence, security gates, and release policy.
- [Platform Kernel Result/Error contract](kernel-result-error.md) records the
  implemented BCL-only Result and Error contract.

## Implemented bootstrap slice

Repository Bootstrap establishes this minimum structure:

- `martix.platform.json` is the exact, secret-free composition manifest.
- `eng/quality-gates.json` is the machine-readable verification policy.
- `eng/verify.mjs` is the cross-platform verification entrypoint.
- `tests/fixtures/RepositoryBootstrapGeneratedSolution/` is the temporary named
  Generated Solution acceptance seam.
- `MartiX.Platform` contains the implemented BCL-only Result/Error Kernel.
- `MartiX.Platform.Analyzers` contains the implemented compile-time
  error-code diagnostics.

The manifest has no Preset, Capability, provider, migration, or Supported
Capability claim. The empty arrays are intentional and remain authoritative
until a later tracer bullet supplies complete evidence.

## Authority boundaries

| Question | Authority |
| --- | --- |
| Exact repository composition and migration state | [`martix.platform.json`](../../martix.platform.json) and [`schemas/`](../../schemas/) |
| Quality Gate identities, policy, and cadences | [`eng/quality-gates.json`](../../eng/quality-gates.json) |
| Verification execution | [`eng/verify.mjs`](../../eng/verify.mjs) |
| Platform vocabulary | [`CONTEXT.md`](../../CONTEXT.md) |
| Current architecture and dependency rules | This directory |
| Hard-to-reverse implementation decisions | `docs/adr/` when present |
| Historical rationale and approved planning handoff | [`Wayfinder blueprint`](../wayfinder/martix-platform/platform-blueprint.md) and [`Wayfinder roadmap`](../wayfinder/martix-platform/migration-roadmap.md) |

Architecture Decision Records are added under `docs/adr/` only when an
implementation decision is hard to reverse or surprising. Existing Wayfinder
decisions remain the source for their original rationale; this directory
keeps the current structure concise and navigable.

## Review sources

The complete decision index is [the Wayfinder ticket index](../wayfinder/martix-platform/tickets/README.md).
The current approved synthesis is [the implementation blueprint](../wayfinder/martix-platform/platform-blueprint.md),
and the executable sequencing is [the migration roadmap](../wayfinder/martix-platform/migration-roadmap.md).
