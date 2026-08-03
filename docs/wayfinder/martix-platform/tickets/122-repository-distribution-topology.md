---
title: Define repository ownership, branding, and public distribution topology
status: closed
type: wayfinder:grilling
parent: ../map.md
claimed_by: codex-root
blocked_by:
  - 105-platform-library-topology.md
  - 114-release-migration-policy.md
resolved: 2026-07-20
---

## Question

Which MartiXDev repositories and release destinations should own the Platform
Libraries, Template System, Platform Tool, Skills, documentation, schemas and
evidence, and what stable branding, licensing, package IDs, repository
boundaries, contribution model, and public/private distribution channels keep
discovery, signing, synchronized releases and future maintenance coherent?

## Resolution

### Establish a new canonical greenfield repository

- Create a new `MartiXDev/Platform` repository as the canonical source for the
  MartiX Platform. Do not rename or repurpose `MartiXDev/WebApi`.
- Keep the Platform Libraries, Template System, Platform Tool, Platform-owned
  Skills, documentation, schemas, tests, quality policy and release-evidence
  definitions in this one repository while they share the synchronized
  Platform release train and maintainers.
- Seed the new repository with the authoritative planning and decision
  documentation produced by this Wayfinder effort: the map, every ticket and
  resolution, the canonical glossary, linked research and durable supporting
  assets. Start implementation as greenfield work; do not copy the current
  `WebApi` implementation or its Git history as an implicit baseline.
- Import those authoritative artifacts in an explicit bootstrap commit that
  records the source repository and exact source revision. Do not import raw
  conversation transcripts, transient logs, generated outputs, obsolete
  drafts, local tool state or unrelated POC documentation. The durable
  Wayfinder artifacts are the complete decision history because they record
  the accepted WHAT, WHY, alternatives, consequences and evidence.
- Copy rather than move the authoritative artifacts. Preserve their original
  snapshot in `MartiXDev/WebApi` as historical provenance; after the bootstrap
  commit, `MartiXDev/Platform` becomes the only actively maintained canonical
  copy and the POC copy must link to it instead of evolving independently.
- Leave `MartiXDev/WebApi` unchanged as a legacy proof of concept and label it
  prominently as such. It creates no compatibility, migration, support or
  release obligation for the MartiX Platform.
- Archive `MartiXDev/dotnet-templates` only after useful mechanics and
  attribution have been captured in the new repository. It likewise remains
  historical input rather than a supported distribution channel.

This choice protects a genuinely clean implementation while retaining the
WHAT and WHY as explicit source material. A single canonical repository keeps
cross-artifact changes atomic, gives release provenance one source revision,
and avoids shallow repository seams between artifacts that do not have
independent ownership or release lifecycles. A future split requires evidence
of independent maintainers, permissions, cadence, compatibility contract, or
licensing and security constraints.

### Make the canonical repository public from its first meaningful commit

- Create `MartiXDev/Platform` as a public repository. Its source visibility is
  independent of its release maturity and support status.
- Mark the repository and all pre-stable artifacts explicitly as
  `Experimental / pre-release`; activate the stable compatibility and support
  contract only at `1.0.0`.
- Apply secret scanning, protected branches, required verification and release
  signing from repository bootstrap rather than attempting to sanitize a
  formerly private history later.

Public-by-default gives packages, documentation and provenance a durable,
discoverable source location and permits transparent review without pretending
that unfinished builds are production-ready. Private forks and private package
feeds remain consumer choices, not alternate MartiX release authorities.

### Separate the Platform license from generated-application freedom

- License the repository, Platform Libraries, Platform Tool, template engine,
  documentation, schemas and Platform-owned Skills under `Apache-2.0`.
- License original template payload under `0BSD`, with a directory-level
  license and generated-output notice that lets application owners remove the
  notice and choose any proprietary or open-source license for their generated
  solution.
- Keep `THIRD-PARTY-NOTICES.md` and machine-verifiable SPDX metadata. Do not
  relicense copied third-party material; either retain its compatible license
  and attribution or implement the MartiX design independently.
- Include both licenses in the bootstrap commit. Public visibility without an
  explicit license is not an open-source distribution policy.

`Apache-2.0` is commercially permissive while adding an explicit contributor
patent grant and patent-termination protection absent from MIT. `0BSD` prevents
the template's own copyright notice from leaking into every generated client
application. The split applies by directory and artifact, not by ambiguous
dual-licensing of the same file. A legal review remains an admission gate for
substantial third-party source reuse or unusually patent-sensitive use.

### Use one stable MartiX Platform identity

| Purpose | Canonical identity |
| --- | --- |
| Product | `MartiX Platform` |
| Owner or organization in product and copyright text | `MartiX` |
| GitHub organization | `MartiXDev` |
| Canonical repository | `MartiXDev/Platform` |
| NuGet family | `MartiX.Platform.*` |
| Kernel | `MartiX.Platform` |
| ASP.NET Core adapter | `MartiX.Platform.AspNetCore` |
| Analyzers | `MartiX.Platform.Analyzers` |
| FastEndpoints adapter | `MartiX.Platform.AspNetCore.FastEndpoints` |
| Template package | `MartiX.Platform.Templates` |
| Migration tool | `MartiX.Platform.Tool` |
| CLI command | `martix-platform` |
| Template short name | `martix-app` |
| Platform-owned Skill or plugin identity | `martix-platform` |
| Analyzer diagnostic prefix | `MXP` |
| Platform Migration step prefix | `MXM` |

`MartiXDev` is only the existing GitHub organization handle; public prose must
not treat it as the company or product name. Keep one composable template entry
point and select `api`, `modular`, or `fullstack` through `--preset`; select
`blazor`, `react`, or `vue` through `--ui` when Full Stack is chosen. Require an
explicit application name through standard template naming and never emit fake
company or product placeholders.

One vocabulary preserves discovery and prevents preset-specific template
packages from drifting into separate products. The explicit `martix-platform`
command leaves the shorter `martix` namespace available for a genuinely wider
future MartiX tool family. Names such as `WebApi`, `Core`, `Common`,
`Abstractions`, `MartiXDev.*`, and preset-specific package families are
rejected because they misstate scope or create shallow identities.

### Use one authoritative public distribution route per artifact kind

| Artifact | Canonical public destination |
| --- | --- |
| Runtime, adapter and provider packages | NuGet.org |
| `MartiX.Platform.Analyzers` | NuGet.org |
| `MartiX.Platform.Templates` | NuGet.org |
| `MartiX.Platform.Tool` | NuGet.org as a .NET Tool |
| Portable symbols | NuGet.org `.snupkg` service |
| Source | `MartiXDev/Platform` |
| Release notes, tag and evidence bundle | Immutable GitHub Release |
| Versioned documentation and JSON Schemas | GitHub Pages |
| Platform-owned Skill source | `MartiXDev/Platform` |
| MartiX Marketplace Skill distribution | `martix/skills` catalog repository |

- Publish stable versions and deliberately approved public previews to
  NuGet.org. Keep ordinary CI builds and candidates as access-controlled,
  retention-governed workflow artifacts until promotion.
- Do not operate or mirror to GitHub Packages as a second MartiX public feed.
  Client-owned mirrors and private feeds may proxy official packages, but are
  not release authorities and must verify the original signature and evidence.
- Publish Source Link, repository and exact commit metadata, package README,
  licenses, icon, XML documentation and portable symbols with every applicable
  NuGet package. Request a non-public `MartiX.Platform` NuGet ID-prefix
  reservation as soon as the NuGet owner has sufficient identity evidence.
- Use immutable versioned documentation and Schema URLs, initially under
  `https://martixdev.github.io/Platform/`. A `latest` alias may redirect for
  readers but never identifies a contract. A future custom domain must retain
  or permanently redirect published URLs.
- Do not initially publish npm packages, a Platform OCI image, VSIX, duplicate
  ZIP templates, or a permanent public feed for every CI build. Generated UI
  source belongs to the generated application; the Platform is not itself a
  deployable workload.
- Keep `skills/martix-platform/` as the only editable canonical Skill source so
  guidance can evolve atomically with Platform contracts, templates and
  migrations. Publish its exact released content to the separately managed
  `martix/skills` MartiX Marketplace repository; do not maintain an independent
  hand-edited fork there.
- Make Marketplace synchronization one-way and automated from an exact
  Platform tag or signed release asset. Verify the source revision, Platform
  Version and content digest before accepting the catalog copy. Marketplace-
  specific catalog metadata may wrap the payload but must not change its
  behavior. Fixes originate in `MartiXDev/Platform` and flow forward through a
  new synchronized Platform release.

This topology matches each ecosystem's normal discovery path while keeping one
release authority and one verifiable source revision. GitHub Releases carry
the human release surface and immutable evidence; they do not become a second
NuGet feed. A new channel requires a real consumer format that cannot use an
existing channel and must join the same signed promotion and evidence chain.

### Accept contributions through DCO-governed pull requests

- Accept public issues, Discussions and fork-based pull requests. Every commit
  contributed to the repository carries a `Signed-off-by` certification under
  Developer Certificate of Origin 1.1. Do not require a Contributor License
  Agreement initially.
- Adopt Contributor Covenant 3.0 only after replacing its placeholders with a
  real confidential reporting route, named enforcement responsibility and a
  reviewed enforcement process.
- Route every change to `main` through a pull request, required quality gates
  and relevant `CODEOWNERS`. Maintainers retain architecture, roadmap,
  compatibility and release authority; votes and issue popularity provide
  input rather than governance authority.
- In solo-maintainer mode, retain the PR audit trail, automated gates and a
  recorded self-review checklist without pretending an independent approval
  occurred. When a second eligible maintainer exists, require at least one
  current non-author approval and Code Owner approval for owned paths.
- A human contributor remains accountable for every AI-assisted change,
  reviews and tests it, certifies its provenance through DCO and identifies
  material AI assistance plus copied or adapted sources in the pull request.
  Agents receive no persistent ruleset bypass or release authority.
- Grant write or maintainer access only after repeated reviewed contributions
  and explicit least-privilege admission. A future CLA requires a concrete
  legal force such as copyright assignment, dual licensing, relicensing, or a
  material partner requirement.

This model keeps public contribution friction low while preserving provenance,
reviewability and a clear decision owner. It avoids a ceremonial second review
in a one-person project and has an explicit gate for becoming a multi-maintainer
project without redesigning the workflow.

### Keep release assets organization-owned with honest solo recovery

- `MartiXDev` owns the GitHub repository, Pages site, environments and
  releases. A NuGet organization named `MartiX`, subject to availability, owns
  every `MartiX.Platform.*` package and its Trusted Publishing policy; personal
  accounts are organization members rather than package co-owners.
- Bind NuGet Trusted Publishing to the exact `MartiXDev/Platform` repository,
  `release.yml` workflow and protected `release` environment. Use the OIDC
  exchange only; store no personal access token or long-lived NuGet publishing
  key in repository or organization secrets.
- Use a non-exportable MartiX release-signing identity as already required by
  the Release Trust Chain. Ordinary GitHub/NuGet administrators do not gain the
  signing key or ruleset bypass merely because they administer an account.
- Do not manufacture redundancy through a shared administrator or second
  account controlled through the same recovery path. In solo-maintainer mode,
  protect personal accounts with passkey or FIDO2, at least two independent
  hardware keys, separately stored offline recovery codes, documented recovery
  ownership and a quarterly non-destructive recovery review. Record the
  remaining single-human risk explicitly.
- When a second genuinely trusted person exists, admit them explicitly as a
  second GitHub organization owner, NuGet organization administrator and
  recovery contact. Do not automatically grant release signing or bypass.
- If `MartiX` is unavailable as a NuGet organization identifier, stop and
  approve an explicit technical fallback without changing the displayed
  `MartiX` product identity or silently publishing under a personal owner.

Organization ownership preserves continuity across maintainer changes, while
OIDC narrows publishing to one reviewed workflow and removes a reusable secret.
The recovery policy maximizes present resilience without claiming that two
credentials held by one person solve the bus-factor risk.

### Archive both predecessor repositories after verified cutover

- After this Wayfinder map is complete and its authoritative artifacts have
  been copied and verified in the `MartiXDev/Platform` bootstrap commit, tag
  the exact final `MartiXDev/WebApi` revision as a legacy POC snapshot and use
  GitHub's read-only repository archive setting. Do not rewrite its source,
  history or README and do not create a deprecation release or compatibility
  package.
- Preserve the copied source repository, revision and content digest in the
  new repository. Thereafter update the canonical planning documentation only
  in `MartiXDev/Platform`; the archived copy remains provenance, not authority.
- Archive `MartiXDev/dotnet-templates` only after useful mechanics, provenance
  and attribution are recorded and the new Template System evidence proves
  that the intended behavior has been captured. Give it an exact final
  snapshot tag as well.
- A GitHub description may point to `MartiXDev/Platform`, but no content change
  is required merely to label an archived repository.

Read-only archival prevents accidental parallel maintenance while keeping
every historical source and commit inspectable. The cutover is gated on a
complete, digest-verified copy so repository cleanup can never discard the
decision history or useful template evidence.

### Protect official identity without branding generated applications

- Add `TRADEMARKS.md` to distinguish the permissive code licenses from the
  right to present a distribution as official MartiX Platform. Apache-2.0
  permits forks, modification and commercial redistribution but does not grant
  rights to MartiX trade names, marks, product names or logos beyond customary
  factual description of origin.
- Only artifacts promoted through the approved MartiX Release Trust Chain may
  use the official product identity, package prefix, CLI command, template
  short name, logo and signing identity. A publicly redistributed modified fork
  must rename these identities and must not imply MartiX endorsement.
- Permit truthful wording such as “based on MartiX Platform 1.2.0” with the
  required license and attribution. Permit private internal rebuilds without
  forced renaming when they are not publicly distributed or represented as an
  official release.
- Emit no MartiX logo, marketing footer or product branding into Generated
  Solutions. Application owners choose their own brand and license. Technical
  provenance such as `martix.platform.json`, package references and generated
  documentation may identify the exact MartiX Platform version factually.
- Treat trademark registration as a future legal/business decision triggered
  by commercial value, meaningful public adoption or demonstrated confusion;
  do not claim that `TRADEMARKS.md` itself creates a registered mark.

This policy protects supply-chain identity and consumer trust without turning
generated applications into MartiX-branded products or restricting legitimate
Apache-licensed reuse.

### Align repository paths with released artifact ownership

Use this initial top-level ownership layout:

```text
src/           package-aligned Platform projects
tests/         package, architecture, template, tool and compatibility evidence
benchmarks/    decision-relevant Platform benchmarks
skills/        canonical Platform-owned Skill sources
schemas/       versioned authoritative machine-readable contracts
docs/          ADRs, architecture, guides, reference, changes and Wayfinder history
eng/           repository build, release and verification implementation
.github/       GitHub workflow, policy and community integration
```

- Place each distributed .NET artifact at
  `src/<PackageId>/<PackageId>.csproj`. The initial project set follows the
  already accepted package catalog and adds only the necessary
  `MartiX.Platform.Templates` and `MartiX.Platform.Tool` distribution projects.
- Place the single editable Skill source at `skills/martix-platform/`; it is not
  a .NET project. Let **Design the MartiX agent guidance package** define its
  internal adapter and instruction structure without moving its ownership.
- Keep mirrored focused tests where process or target isolation earns a project,
  cross-package constraints in `MartiX.Platform.ArchitectureTests`, executable
  consumers under `tests/Compatibility`, and decision-relevant measurements in
  `benchmarks/MartiX.Platform.Benchmarks`. Consolidate shallow test projects
  when isolation evidence does not justify them.
- Preserve `CONTEXT.md`, `CHANGELOG.md`, governance/security/contribution files,
  licenses and notices at repository root. Copy the current Wayfinder tree to
  `docs/wayfinder/martix-platform/` without breaking its relative links.
- Keep versioned source Schemas in `schemas/` and release/build policy in
  `eng/`. Generate candidate evidence only under ignored `artifacts/`; publish
  final immutable evidence with the GitHub Release rather than growing Git
  history with generated evidence copies.
- Do not add abstract directory layers named `Core`, `Common`, `Shared`,
  `Modules`, `Infrastructure`, `Adapters`, or `Capabilities` when package
  identity already communicates the seam.

These repository projects build and distribute the Platform itself; they do
not alter the previously accepted minimum project count of Generated
Solutions. Direct package-to-path alignment improves human and agent locality,
while the small number of non-project roots separates genuinely different
artifact formats without inventing code abstractions.
