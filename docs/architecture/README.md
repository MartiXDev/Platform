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
- [ASP.NET Core Failure Adapter](aspnetcore-failure-adapter.md) records the
  implemented RFC 9457 translation seam.

## Implemented bootstrap slice

Repository Bootstrap establishes this minimum structure:

- `martix.platform.json` is the exact, secret-free composition manifest.
- `node eng/platform-migration.mjs agent context --format json` projects
  deterministic, secret-free context without a committed agent manifest.
- `eng/quality-gates.json` is the machine-readable verification policy.
- `eng/verify.mjs` is the cross-platform verification entrypoint.
- `skills/martix-platform/` is the canonical replaceable workflow router; it
  does not own architecture or composition decisions.
- `eng/generate-api.mjs` exposes the deterministic `martix-app --preset api`
  generation seam, and `eng/verify-api.mjs` verifies its packed consumer.
- `tests/fixtures/RepositoryBootstrapGeneratedSolution/` is the temporary named
  Generated Solution acceptance seam.
- `tests/fixtures/FullStackGeneratedSolution/` is the named, non-product
  conformance seam for the provider-neutral UI Capability Contract; the
  `bootstrap.full-stack` gate verifies its selected provider, isolated client,
  accessibility states, localization/theme seams, and UI evidence.
- The API Preset generator emits an application-owned solution with an explicit
  composition root, baseline Capability Manifest, and no persistence or
  unselected provider residue.
- `MartiX.Platform` contains the implemented BCL-only Result/Error Kernel.
- `MartiX.Platform.AspNetCore` contains the implemented safe HTTP failure
  adapter and OpenAPI contract seam.
- `MartiX.Platform.Analyzers` contains the implemented compile-time
  error-code diagnostics.

The repository manifest has no Preset, Capability, provider, migration, or
Supported Capability claim. The empty arrays are intentional and remain
authoritative for the repository until a later tracer bullet supplies complete
evidence. Generated API solutions carry their own resolved `api` manifest.

## Authority boundaries

| Question | Authority |
| --- | --- |
| Exact repository composition and migration state | [`martix.platform.json`](../../martix.platform.json) and [`schemas/`](../../schemas/) |
| Ephemeral agent context contract | [`schemas/agent-context.schema.json`](../../schemas/agent-context.schema.json) and the exact Platform Tool |
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
