---
title: Define release, compatibility, and Platform Migration policy
status: closed
type: wayfinder:grilling
parent: ../map.md
claimed_by: codex-root
blocked_by:
  - 104-capability-preset-matrix.md
  - 105-platform-library-topology.md
  - 113-quality-gates.md
resolved: 2026-07-20
---

## Question

How should synchronized package releases, semantic compatibility, template versions, Capability Manifests, migration recipes, analyzers or code fixes, support windows, and rollback guidance evolve existing Generated Solutions safely?

## Resolution

### Give the complete release train one SemVer identity

Every Supported Platform Release has one SemVer 2.0 **Platform Version**. All
published first-party `MartiX.Platform.*` runtime, analyzer, provider and
Template System NuGet packages in that release carry exactly that version and
originate from the same source revision and candidate. Their internal Platform
package dependencies require the exact matching version through the generated
`MartiXPlatformVersion` property.

Artifacts that are not NuGet packages—including Platform Migrations,
Capability Matrix, documentation, Skills and Release Evidence—declare the same
Platform Version and are bound to the same release digest. The shared identity
does not require bundling unrelated artifacts into another package or adding a
Generated Solution project.

The highest-impact change anywhere in the synchronized release determines the
version increment:

| Increment | Platform contract |
| --- | --- |
| `major` | An intentional incompatible change to any Supported public library, analyzer/code-fix behavior, Template System interface, manifest or migration protocol, generated extension seam, or removal of a Supported Capability/provider/target |
| `minor` | A backward-compatible Capability, provider, feature, contract addition or migration path that preserves every Supported contract of the previous minor release |
| `patch` | A backward-compatible defect, security, documentation or artifact correction that adds no new Supported feature contract |

The change classification is based on observable consumer and operator
contracts, not only binary API comparison. A source- or binary-compatible
change that breaks documented behavior, configuration, generated ownership,
analyzer diagnostics, data, operations or deployment compatibility requires
the corresponding higher increment. A security fix does not gain permission to
break a Supported contract under a patch number; an emergency incompatible fix
uses a major release and the security-response policy.

The first production Supported release of the redesigned Platform is `1.0.0`.
Before it, the train may publish `1.0.0-alpha.N` for incomplete exploration,
`1.0.0-beta.N` for feature-complete stabilization and `1.0.0-rc.N` when the
prerelease contract is expected to become stable. Prereleases are opt-in,
unsupported for production by default and never satisfy a stable support claim.
The numeric dot-separated suffix provides deterministic SemVer ordering.

An `rc` package is not relabelled or promoted as a stable package because its
version is part of its bytes and identity. The final stable version is built
once with its stable version into a private immutable staging repository, runs
the full release-candidate profile, and is then promoted to public repositories
without rebuilding or modifying any byte. A failed candidate is retained as
evidence and its package identity is never reused; a corrected candidate uses a
new version according to the candidate/publication policy resolved later in
this ticket.

Commit identity, artifact digests and build provenance belong in the Release
Evidence Manifest rather than SemVer build metadata. NuGet normalizes build
metadata during matching and public repositories do not allow an existing
package ID/version to be overwritten. The release process follows the official
[NuGet package-version semantics](https://learn.microsoft.com/en-us/nuget/concepts/package-versioning)
and [immutable publication guidance](https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/publish-nuget-package).

**Why:** one Platform Version makes the exact verified set discoverable and
keeps package restore, generated manifests, migration selection, documentation,
support and audit aligned. SemVer communicates compatibility while the release
digest proves exact bytes. Starting Supported production at `1.0.0` establishes
a real stability promise instead of using `0.x` as an indefinite escape hatch.

**Alternatives rejected:** independently versioned first-party artifacts create
an unbounded compatibility matrix and ambiguous upgrade target; CalVer exposes
age rather than contract compatibility; permanent `0.x` weakens the Supported
promise; version ranges between synchronized Platform packages allow untested
graphs; and rebuilding or renaming an `rc` tests bytes different from those
published as stable.

### Keep every same-major upgrade compatible without mandatory source migration

A `patch` or `minor` release provides a **Compatible Upgrade** from every
applicable Supported release in the same major. Updating the complete exact
`MartiX.Platform.*` package set cannot require an existing Generated Solution
to change application-owned source, configuration, secrets contract, database
schema or deployment topology merely to restore, build, test and retain its
previously Supported behavior.

Compatibility covers the complete observable Platform contract rather than
only CLR signatures:

- source and binary public library contracts, package contents, target
  frameworks, trimming and declared Native AOT combinations;
- runtime behavior, failure semantics, performance budgets and security
  guarantees;
- analyzer diagnostic IDs, default severities, code-fix transformations and
  generated-source behavior;
- Template System command/options, Capability Manifest and other persisted
  schema/protocol readers;
- HTTP/OpenAPI and serialization behavior owned by Platform code;
- documented configuration, deployment, provider and operational contracts;
  and
- Generated Solution extension seams and ownership rules.

A new template version may generate improved source for new applications
without changing existing application-owned repositories. A same-major
Platform Migration may offer an optional modernization, adoption of a new
Capability or provider, or preparation for a future major, but declining that
migration cannot immediately invalidate the previous Supported contract.

New analyzer diagnostics ship disabled, informational or explicitly opt-in
when previously valid Supported code would otherwise fail warnings-as-errors.
Changing such a diagnostic to a build-breaking default, removing a Supported
target/provider/configuration, or requiring source, schema, configuration or
deployment edits for the package set to work is a major change. Adding a new
Supported Capability, provider, TFM or deployment profile without weakening
existing claims may be minor.

A **Migrated Upgrade** is an upgrade whose target contract requires an explicit
Platform Migration, normally across a major boundary. It remains Supported only
for declared source versions, combinations and migration paths with complete
historical-fixture evidence. Providing a migration does not make an otherwise
breaking change suitable for a minor or patch version.

Security urgency does not silently relax this rule. Ship a compatible security
patch where possible; otherwise publish a new major with a prioritized tested
migration and apply the separately defined vulnerability/support response to
affected older lines.

The official .NET package baseline validator is one required source/binary API
layer, not the complete compatibility oracle. Candidate packages use
[`PackageValidationBaselineVersion`](https://learn.microsoft.com/en-us/dotnet/fundamentals/apicompat/package-validation/baseline-version-validator)
alongside the behavioral, generated-solution, provider, migration and artifact
Quality Gates defined by the Platform.

**Why:** Generated Solutions own their source after generation. Calling a minor
release backward-compatible while requiring maintainers to rewrite that source
would make SemVer unreliable and turn Platform Migrations into hidden upgrade
coupling. The strict rule lets teams take compatible fixes and features without
accepting unrelated repository transformation.

**Alternatives rejected:** allowing every minor release to require a migration
makes compatibility mean only that a repair tool exists; treating analyzers or
configuration as outside SemVer breaks warnings-as-errors and operations;
limiting compatibility to CLR API misses behavior and artifacts; and granting
security changes an unspecified exception makes consumers unable to assess
upgrade impact.

### Support the current major and one maintenance major

The Platform normally has at most two **Supported Lines**:

| Phase | Servicing contract |
| --- | --- |
| `Active` | The current major receives backward-compatible features, fixes, security updates, new Capabilities/providers and Platform Migrations |
| `Maintenance` | The previous major receives security, data-loss, critical correctness, compatibility and migration fixes, but no new features |
| `End of Support` | No new fixes or migration guarantees are produced; immutable documentation, artifacts and historical Release Evidence remain available |

Within each Supported Line, only its latest stable minor and patch receives
servicing and support diagnosis. A report against an older minor/patch must be
reproduced on that latest release before a fix is produced. Same-major upgrade
to it remains a Compatible Upgrade, so this servicing policy does not impose a
mandatory source migration.

When a successor major reaches stable availability, its predecessor enters
Maintenance for 12 months. A planned End of Support receives at least six
months' public notice. Planned majors ship no more frequently than once per 12
months; only an unavoidable security or integrity break may create an emergency
major sooner, with an advisory and prioritized migration path.

A Platform line cannot remain Supported after the end of support of its
declared .NET runtime, operating system or another indispensable upstream
foundation. Release planning must introduce and prove a successor early enough
to preserve the intended migration overlap without relying on unsupported
infrastructure. An unexpected upstream truncation may shorten the window only
through an explicit security advisory, revised End-of-Support date and
accelerated Platform Migration; it cannot be hidden as normal policy.

The initial .NET 10-based line is therefore externally bounded by Microsoft's
current 14 November 2028 end-of-support date. Consumers must use the latest
applicable .NET servicing patch just as they must use the latest Platform patch
in their Supported Line. Dates and status are generated from versioned policy
into documentation and machine-readable manifests rather than duplicated by
hand. The authoritative upstream dates are checked against the
[official .NET support policy](https://dotnet.microsoft.com/en-us/platform/support/policy)
for every release candidate.

Prereleases have no production support window. A client-specific extended
support agreement may later own another maintained branch and evidence matrix,
but it is neither implied by the public Platform policy nor pre-created without
a concrete funded need.

**Why:** current plus previous major gives production users a predictable year
for a Migrated Upgrade while keeping backports, security response and quality
evidence feasible for a small maintainer team. Requiring the latest compatible
patch follows the upstream .NET servicing model and avoids multiplying support
across known-defective cumulative states.

**Alternatives rejected:** latest-major-only support provides no safe migration
overlap; servicing every minor and patch multiplies branches and compatibility
matrices; indefinite LTS is not a credible commitment for the initial team;
support beyond upstream EOL is unsafe; and silently shortening a window for an
upstream event gives operators no actionable migration contract.

### Prove cumulative same-major compatibility against immutable cohorts

Every stable candidate derives a machine-readable compatibility plan from
three complementary baseline classes:

1. The **Immediate Baseline** is the immediately preceding stable release and
   isolates compatibility impact introduced by the candidate.
2. The **Major Floor Baseline** is the first stable `N.0.0` release of the
   candidate's major and detects cumulative drift hidden by adjacent-only
   comparisons.
3. **Minor Cohort Baselines** contain the latest released patch of every earlier
   minor in that major. Each cohort represents the supported prerequisite of
   updating to the latest patch in its minor before diagnosis or upgrade.

Duplicate coordinates are executed once. Prereleases never become stable
compatibility baselines. A new major establishes its own floor; the previous
major ceases to be a Compatible Upgrade baseline and instead supplies declared
source fixtures to the Migrated Upgrade policy.

Each baseline is an immutable digest-addressed set linked to its original
Release Evidence. It includes actual packed first-party artifacts, contract
snapshots and representative historical Generated Solutions for applicable
Presets, Capabilities, providers, operating systems and deployment profiles.
Repository fixtures cover both clean generated output and realistic
application-owned changes at supported extension seams.

The candidate proves at least packed source/binary API compatibility, consumer
restore/build/test/runtime behavior, failure and performance contracts,
analyzer diagnostics and fixes, persisted manifest/schema readers,
configuration and operations, provider behavior and every declared trimming or
Native AOT combination. The Compatibility Coverage Plan selects risk-based
compositions without weakening direct proof of critical invariants.

The full historical repository fixture need not be duplicated for every patch.
The Immediate Baseline proves patch-to-patch evolution; the latest patch of each
minor owns its cohort fixture. Every compatibility defect that escaped these
layers adds a minimized immutable fixture at the exact affected source version
and remains a permanent regression case while the contract is Supported.

Baselines cannot be edited to accommodate a candidate. Adding, replacing or
retiring one is an explicit policy change tied to a published release, major
boundary or End of Support and appears in release review and evidence. Tooling
generates the plan and fails on a missing digest, unexplained source release or
coverage gap.

**Why:** adjacent compatibility is not necessarily cumulative: several locally
safe behavior, analyzer or configuration changes can collectively break the
major's earliest consumers. Floor and cohort fixtures prove the actual SemVer
promise, while patch deduplication keeps the evidence matrix proportional to
meaningful consumer states.

**Alternatives rejected:** previous-release-only comparison misses cumulative
drift; testing every historical patch duplicates states consumers must first
update; API-only comparison ignores runtime, analyzer, configuration and
generated ownership; mutable baselines can be rewritten to make a candidate
pass; and prereleases do not carry a stable compatibility promise.

### Separate installed, source-contract and manifest-schema versions

Every Generated Solution owns one root `martix.platform.json` **Capability
Manifest**. It is the single machine-readable composition and Platform-history
interface for maintainers, agents, migration tooling and Quality Gates. It does
not create another project or transfer application-source ownership back to the
Template System.

The manifest keeps three identities deliberately distinct:

| Identity | Authority and meaning |
| --- | --- |
| Installed Platform Version | `MartiXPlatformVersion` in central package management identifies the exact first-party package set currently restored |
| Platform Contract Version | `contractVersion` identifies the Platform contract to which application-owned source, configuration and repository structure were last explicitly aligned |
| Manifest Schema Version | `schemaVersion` identifies the data contract used to parse and migrate `martix.platform.json` |

A Compatible Upgrade updates `MartiXPlatformVersion` without requiring
`contractVersion` to change. A Platform Migration changes `contractVersion`
only after its complete source/configuration transformation and target quality
profile succeeds. Manifest schema evolution does not consume a separate
Platform SemVer number, but an incompatible schema/protocol change still makes
the containing Platform Release major.

The manifest contains:

- an immutable `origin` with the generating Platform Version, Template System
  identity and original Preset;
- current `contractVersion`, Preset, stable Capability and provider IDs plus
  their admitted configuration profile selections;
- an append-only `appliedMigrations` ledger containing stable migration ID,
  declared source/target contract versions and exact recipe digest; and
- `schemaVersion` plus a repository-relative `$schema` reference to
  `eng/schemas/martix.platform.schema.json`.

It does not contain secrets, machine-specific paths, timestamps, environment-
dependent values, third-party dependency locks or a duplicated complete file
inventory. Those concerns retain their existing authorities. Stable IDs are
separate from human display names and cannot be silently recycled after a
Capability, provider or migration is retired.

Manifest writes are deterministic and atomic. A migration/capability command
first validates the current schema and repository, resolves the transition,
shows the exact plan, performs changes on a recoverable working state, executes
the required target gates and only then commits the new current state and
append-only ledger entry. A failed run leaves neither a claimed migration nor a
partially updated manifest.

The manifest remains human-readable and application-owned, so manual review and
editing are possible. Editing selection alone does not perform the corresponding
repository transition: Quality Gates compare the declaration with actual
projects, package references, composition, provider registrations and
Deployment Manifest and reject drift.

Readers fail closed when `schemaVersion` is newer than their declared range and
never rewrite an unknown schema. Additive schema evolution is minor only when
all Supported readers safely preserve and interpret it. An incompatible schema
change requires a major Platform release and a verified manifest migration.
Schema fixtures prove reads, writes, round trips, unknown-field handling and
failure diagnostics across the complete Supported window.

**Why:** Installed packages, application-owned source alignment and serialized
manifest format evolve at different times. Collapsing them into one version
would make a compatible package update appear to require source migration or
would hide that old source had never adopted a newer Platform contract. One
manifest keeps the external interface small while explicit sections and
authorities prevent ambiguous state.

**Alternatives rejected:** separate origin/current/history files permit
inconsistent combinations and multiply authority; treating the manifest as a
package lock duplicates central package management; updating contract identity
on every package patch creates false migrations; a remote-only schema makes
offline generation and verification fragile; silently ignoring a newer schema
risks destructive rewrites; and template reapplication violates Generated
Solution ownership.

### Run migrations through one exact-version Platform Tool

Publish one `MartiX.Platform.Tool` .NET tool package as the sole orchestration
interface for Platform inspection and migration. It is a synchronized tooling
artifact with the same Platform Version, source candidate, provenance and
Release Evidence as the target packages, templates, migration recipes,
documentation and Skills.

Invoke the exact target version through the .NET 10 one-shot tool mechanism:

```powershell
dotnet tool exec MartiX.Platform.Tool@2.0.0 -- migrate plan --to 2.0.0
```

The package version is never omitted or expressed as a range in a documented,
CI or agent migration workflow. `dotnet tool exec` downloads and caches the
exact package without global installation, a modified `PATH` or a committed
local tool manifest, as defined by the official
[`dotnet tool exec` contract](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-tool-exec).
Private/offline use supplies the admitted package source and verifies the same
signed package/digest rather than rebuilding the tool locally.

The initial external command interface is deliberately small:

- `migrate inspect` reads and validates repository state, installed Platform
  packages, Capability Manifest and Platform Contract Version without mutation;
- `migrate plan --to <exact-platform-version>` resolves the complete recipe
  path and emits a deterministic machine/human-readable Migration Plan and
  digest without changing the repository;
- `migrate apply --plan <exact-plan-file>` accepts only that unchanged plan,
  exact source state and explicit digest acceptance; and
- `migrate verify` proves manifest/repository coherence and the target Composed
  Quality Profile after application.

The angle-bracketed command values above are documented metavariables, not
generated names or content placeholders. User-facing output always prints the
next command with exact resolved values.

The tool defaults to read-only behavior. It fails closed for a dirty or changed
source tree, unsupported/newer manifest schema, unverified package/recipe,
missing migration edge, stale plan, unmet prerequisite, ambiguity or conflict.
It never chooses a `latest` target, infers destructive intent, silently repairs
unrelated files, invokes template reapplication or reports partial mutation as
success.

Roslyn analyzers and code fixes may be signed, versioned transformation
components selected by a recipe for precise C# edits. They do not orchestrate
package, project, JSON, documentation, UI, database-sequencing or verification
changes independently. MSBuild, restore and ordinary build remain non-mutating;
they may diagnose a required migration but cannot run one.

The application `<name>.Migrator` retains ownership of application/database
schema execution. Platform Tool can plan source changes, generate or validate
database migration prerequisites and coordinate the documented sequence, but it
does not acquire production credentials or execute production DDL. An LLM may
explain a plan or help a human prepare a reviewed conflict resolution; free-form
model output is never an attested recipe or automatic authority to mutate.

This decision adds exactly one executable project/package to the Platform
repository and none to Generated Solutions. It is a tooling exception adjacent
to the Template System, not a runtime/analyzer library consumed by application
projects; the three-package baseline application catalog and its dependency
graph remain unchanged. The project is justified by deep reusable planning,
precondition, transformation, conflict, evidence and recovery behavior that
would otherwise be duplicated in every migration.

**Why:** the target release is the only party that can reliably understand its
new contract, while the historical repository owns the state being transformed.
An exact one-shot target tool joins those responsibilities without leaving a
stale helper installed in the application or increasing its project/runtime
graph.

**Alternatives rejected:** a global tool can execute the wrong version; a local
manifest becomes additional state requiring its own upgrade; repository scripts
age with the source contract rather than the target; template reapplication
overwrites application ownership; analyzers alone cannot coordinate repository-
wide transitions; build-time mutation is surprising and unsafe; and free-form
LLM migration is not deterministic or attestable.

### Embed a typed compositional Migration Catalog in the target tool

Every stable `MartiX.Platform.Tool` contains the complete immutable **Migration
Catalog** required to reach its exact target Platform Contract Version from all
source contract cohorts in the Supported migration window. Catalog data and
transformation implementations are built, signed, scanned, tested and attested
inside the exact tool package; execution neither downloads recipes nor discovers
plugins at runtime.

The catalog is a deterministic directed graph of small **Migration Steps**.
Every step declares:

- a globally stable `MXM` diagnostic/migration ID, exact source and target
  contract applicability, manifest schema range and applicable Presets,
  Capabilities and providers;
- prerequisites, conflicts, ordering constraints and reasons for selection or
  non-applicability;
- owned `add`, `edit`, `move` and `remove` operations with path plus syntactic,
  semantic and content preconditions;
- a typed C#, MSBuild/XML, JSON, Markdown or UI-metadata transformation,
  expected normalized diff and postconditions;
- required Quality Gates, recovery classification, documentation and exact
  recipe digest.

The target tool resolves manifest-schema, package/build, source/configuration,
Capability/provider and documentation transitions into one ordered Migration
Plan followed by target verification. It deduplicates shared steps and applies
only predicates selected by the authoritative Capability Manifest. Repository
inspection verifies preconditions and detects drift; heuristic scanning never
silently invents the source composition or interprets application code as proof
that an undeclared Capability is selected.

One target tool supports every legitimate Platform Contract Version cohort in
the previous Supported major, even when installed packages are newer. For
example, a solution may correctly run the latest `1.x` Compatible Upgrade while
remaining on the source contract generated by `1.0.0`; optional same-major
modernizations cannot become undocumented prerequisites for its `2.0.0`
Migrated Upgrade. Consumers do not install or execute a chain of historical
tool versions.

Recipes use only transformation primitives compiled into the tool. They cannot
contain arbitrary PowerShell, Bash, shell evaluation, remote executable
downloads or runtime reflection/plugin discovery. C# modifications use Roslyn
syntax and semantic models; regex is not an accepted C# transformation engine.
External restore/build/test operations are allowlisted Verification Entrypoint
invocations owned by the plan, not arbitrary recipe commands.

A destructive step proceeds only when ownership and all exact preconditions
match. User-modified content is never removed merely because its path resembles
old generated output. Each step and the complete plan are idempotent: repeating
against the successfully migrated state yields an exact `already-applied` or
safe no-op result rather than duplicated edits.

Published catalogs and recipes are immutable. A defect produces a new Platform
candidate and recipe version plus a permanent minimized source fixture; it does
not rewrite a previously published tool package or evidence. The Migration Plan
records the exact ordered IDs/digests, selection reasons, skipped/non-applicable
steps, touched paths, expected content identities and required gates.

**Why:** small typed steps localize transformation knowledge and compose across
Presets and Capabilities without exposing a migration framework to applications.
Embedding the closed catalog in the exact target tool preserves provenance,
offline reproducibility and deterministic planning while still allowing the
implementation to reuse deep transformation primitives.

**Alternatives rejected:** monolithic scripts per source/target/Preset pair grow
combinatorially; dynamic recipe plugins add an unattested extension and supply-
chain surface; regex can corrupt valid C#; heuristic selection can overwrite
application intent; arbitrary shell steps are non-portable and unsafe; and
requiring historical tool chains complicates security, evidence and support.

### Simulate and verify before materializing a reviewable diff

Platform Migration uses a review-first `plan`, isolated `verify`, `apply`, final
`verify` workflow. Planning requires a clean Git working tree at a concrete
commit. The tool creates a temporary isolated Git worktree, applies every
selected typed step there, computes the complete normalized diff and executes
the required target gates without modifying the user's original worktree.

A plan reaches `ready` only when all transformations and isolated target gates
pass with no unresolved conflict. Failure produces `blocked` evidence and
discards only tool-owned temporary state. The source repository remains exactly
at its original commit; the tool never uses destructive reset to reconstruct it.

`migrate apply` accepts only the exact digest of a still-current `ready` plan.
It revalidates source commit, relevant file hashes, manifest, installed Platform
version, recipe/tool identity and working-tree cleanliness, then materializes
the already verified diff into the original worktree using staged temporary
files and rollback-on-I/O-failure semantics. It neither creates a permanent
branch nor commits, pushes or opens a pull request.

The resulting ordinary Git diff is the human and agent review surface. Users
may adjust application-owned code after materialization, but any adjustment
invalidates the prior result and requires `migrate verify` against the actual
tree. The Capability Manifest records the successful migration only after final
verification; a merely applied or partially reviewed diff cannot claim the
target Platform Contract Version.

When safe intent cannot be inferred, planning emits a structured **Migration
Conflict Report** containing stable `MXM` identity, affected path and semantic
node, expected and actual state, failed precondition, target invariant,
supported resolution choices, relevant Canonical Knowledge and required gates.
There is no `--force`, `--ours`, `--theirs`, best-effort result or suppression
that converts ambiguity into success.

A human or authorized agent resolves the application decision as a normal
reviewed source change in the original repository, commits that decision and
runs planning again. The new source state produces a new plan and digest. No
persistent override file may waive the failed precondition.

An LLM/Skill may explain the report, locate Canonical Knowledge, propose and
test an application-owned resolution and prepare it for review. Its free-form
interpretation cannot alter recipe applicability, sign intent, suppress a
conflict or serve as migration evidence. Executable source, explicit review and
the complete target Quality Gates remain authoritative.

**Why:** applying and testing in an isolated real repository proves the same
multi-file state later offered for review while keeping the user's source safe
on failure. Leaving an uncommitted diff makes every transformation visible and
keeps the tool independent of team-specific branch/PR policy. Replanning after
a conflict binds the decision to reviewed source rather than an opaque waiver.

**Alternatives rejected:** direct incremental mutation can strand a partial
migration; destructive Git reset is unnecessary recovery risk; automatic branch,
commit or push exceeds tool authority; conflict override files preserve
ambiguity rather than resolve it; force/merge heuristics can destroy ownership;
and LLM-only approval is neither deterministic nor attestable.

### Classify recovery instead of promising universal rollback

Every Migration Step and complete Migration Plan declares exactly one primary
recovery strategy from this closed vocabulary:

| Strategy | Contract |
| --- | --- |
| `source-revert` | Repository-only changes not yet deployed return through an ordinary reviewed Git revert |
| `artifact-rollback` | The exact previous immutable artifact can be redeployed because source, configuration and data remain backward-compatible |
| `expand-contract` | Old and new artifacts coexist over an additive transition; destructive contraction waits until the tested rollback window closes |
| `backup-restore` | Information-losing change returns only through a verified backup and restore of all coupled state |
| `roll-forward-only` | Safe reversal is not available; recovery uses a corrective release or compensating migration |
| `manual-recovery` | A declared exceptional transition follows a precise approved and rehearsed runbook rather than an automatic claim |

The composed plan inherits the strictest applicable strategy and explains any
mixed source, configuration, artifact and database sequence. A recipe never
generates an inverse transformation automatically. EF Core `Down()`, package
downgrade or source revert is not called production rollback unless the complete
post-deployment state is proven compatible with that path.

Before apply, the plan identifies irreversible steps, the recovery owner,
required checkpoints, point of no return, operational sequence and evidence.
Destructive database/data work additionally requires data classification,
affected-scope and retention/data-loss approval, a fresh backup, isolated restore
test, measured recovery duration and target-profile verification after restore.
“A backup exists” without a successful restore is not evidence.

Use expand/contract only when the Deployment Profile needs an old/new overlap
or rolling cutover and both published artifacts are tested against every
intermediate schema state. A single-VPS/process deployment may instead use an
explicit measured maintenance window when it is simpler and safer; enterprise
readiness does not fabricate high-availability topology.

Capability Manifest recovery follows the actual state authority. Before
deployment it returns with ordinary source revert. A roll-forward keeps the
target contract and appends the corrective migration. A genuine source plus
data restore returns the exact corresponding historical manifest as part of the
restored repository/artifact state. The tool does not independently decrement a
manifest while production state remains on the target contract.

Documentation may claim `artifact-rollback`, `expand-contract` or
`backup-restore` only when the exact path has executed over historical fixtures
and the recovered system passes its applicable Composed Quality Profile.
Otherwise it states `roll-forward-only` or `manual-recovery` explicitly, with
the tested runbook and limitations.

**Why:** cancelling an unreviewed source diff and recovering a deployed system
that changed code, configuration and data are fundamentally different actions.
Explicit strategies make information loss, compatibility windows and operator
responsibilities visible and testable without imposing distributed deployment
complexity on simple applications.

**Alternatives rejected:** automatic inverse recipes cannot recreate lost
information; mandatory EF `Down()` provides false assurance; package downgrade
may target incompatible source/data; expand/contract everywhere violates KISS;
an untested backup is not recovery; and undocumented roll-forward leaves an
incident team without a safe decision path.

### Promote one reserved candidate without rebuilding or reusing its version

Stable release follows a fail-closed `preflight`, `reserve`, `build once`,
`finalize`, `approve`, `promote` state machine:

1. A concrete source commit passes the complete main/nightly preflight using
   non-releasable artifacts before consuming a stable version.
2. A reviewed release change reserves the exact Platform Version and creates an
   immutable **Candidate ID** binding version, source commit and attempt identity.
   Neither source nor version can change afterward.
3. A clean trusted ephemeral runner builds the stable-versioned package,
   template, tool, documentation and other releasable bytes exactly once into
   private immutable quarantine storage and emits SBOM/provenance inputs.
4. NuGet packages are signed; the signed final bytes and all other final
   artifacts pass signature/content verification plus the complete
   `release-candidate` profile by digest. No later stage rebuilds them.
5. A complete signed Release Evidence Manifest and an explicit authenticated
   human approval authorize publication. A solo maintainer may approve, but the
   approval remains a distinct recorded action rather than an automatic effect
   of green CI.
6. Promotion copies only those exact digests to public destinations, verifies
   their presence and content, and then publishes the immutable signed source
   tag, release notes, support dates and evidence index for that same set.

A transient publication retry may resend the same bytes and digest. It cannot
rebuild from the same source. A stable version is burned as soon as it is
reserved: if any final gate, approval, integrity check or unrecoverable
publication step fails, corrected source receives the next SemVer version. The
failed Candidate ID and evidence remain immutable; the version is neither
relabelled nor reused for different bytes. Consequently, a failed reserved
`1.0.0` can make `1.0.1` the first public stable version—SemVer continuity is
less important than unambiguous identity.

Prerelease and main/nightly preflight absorb ordinary iteration before stable
reservation. They do not weaken final verification or get promoted by renaming:
the stable candidate contains its final version from its single build.

Cross-repository publication provides policy-level rather than fictitious
transactional atomicity. Foundational packages publish first, followed by
adapters/providers/analyzers/tooling; the Template System entry package publishes
last so it cannot generate a dependency graph whose required packages are
absent. The release remains unavailable and unannounced until every required
destination contains the verified digest set.

An unrecoverable partial publish triggers unlisting of every published member
where supported, incident evidence and a new patch candidate; it never fills the
same version with corrected bytes. A public artifact is never overwritten.
Unlisting/withdrawal after successful release is exceptional, limited to
security, legal or integrity necessity, and always accompanied by an advisory,
replacement guidance and migration/support disposition.

**Why:** build-once promotion proves that consumers receive the bytes that were
tested, while version burning prevents caches, logs, feeds and human discussion
from observing two meanings for one package ID/version. A separate approval and
complete-set publication state keep automation useful without granting it
implicit release authority or claiming impossible multi-registry transactions.

**Alternatives rejected:** rebuilding between test and publish changes the
candidate; reusing an unpublished stable version leaves ambiguous cached/evidence
identities; relabelling `rc` changes artifact bytes; CI success alone is not
release authorization; publishing the template first can generate unrestorable
solutions; and pretending several registries commit atomically hides partial-
publication recovery.

### Deprecate only after the Supported replacement is ready

`Deprecated` is a Supported lifecycle state, not permission to reduce quality.
A deprecated public API, analyzer behavior, Template System option, manifest
field, Capability, provider, target framework, operating system or Deployment
Profile continues to pass every applicable Quality Gate and receive fixes until
its declared removal major or Supported Line End of Support.

The default lifecycle is:

1. The replacement first becomes fully Supported, documented and evidenced,
   including a Platform Migration when existing solutions must change.
2. A minor release marks the old contract deprecated. Code uses non-error
   `[Obsolete]` plus a stable `MXP` diagnostic where useful; manifests/matrices
   retain the stable ID and lifecycle state. Documentation records rationale,
   exact replacement, behavioral differences, migration path and earliest
   removal major/date.
3. The migration period lasts at least one subsequent stable minor and at least
   six calendar months. New Template System output stops selecting the old
   contract by default once the replacement is Supported. Safe analyzer/code
   fixes and recipes assist adoption without claiming false behavioral
   equivalence.
4. Removal occurs only in a major release with explicit SemVer classification,
   release notes, compatibility/migration fixtures and recovery guidance. The
   previous Maintenance major continues its declared support. Retired IDs remain
   permanently reserved and cannot acquire another meaning.

A deprecation warning never becomes a warnings-as-errors failure merely because
time elapsed; making a previously non-breaking diagnostic an error is itself a
major contract change. Provider removal requires a Supported alternative or an
explicit decision that the new major no longer supplies that Capability. Target
framework, OS, deployment and manifest-reader retirement follow the same rule.

Experimental contracts carry no production compatibility promise and may
change or disappear in a minor release, but the change remains documented and
cannot break a Supported Preset or masquerade as Supported deprecation.

A demonstrated security, legal or supply-chain emergency may shorten the normal
period. It does not change SemVer: an incompatible removal still requires an
emergency major, advisory, evidence explaining why delay is unsafe, replacement
or containment guidance and the fastest viable migration path.

Removal decisions use issue/customer reports, opt-in evidence and compatibility
fixtures. The Platform collects no mandatory phone-home usage telemetry. Stable
release documentation generates the lifecycle table from machine-readable
policy so status, earliest removal and End-of-Support dates cannot drift between
the Capability Matrix, analyzers, template help and human guidance.

**Why:** requiring both elapsed time and a subsequent stable minor ensures users
receive a usable replacement period rather than merely a warning. Keeping
deprecated contracts Supported preserves trust while major-only removal keeps
same-major compatibility meaningful and the permanent ID history makes old
manifests and diagnostics interpretable.

**Alternatives rejected:** minor removal violates compatibility; obsolete-as-
error breaks existing warnings-as-errors builds; deprecation before replacement
only transfers design cost to consumers; time-only automatic removal ignores
migration readiness; indefinite deprecation accumulates permanent surface;
hidden telemetry violates trust; and ID recycling corrupts historical meaning.

### Create no legacy contract for the unused MartiX.WebApi source

`MartiX.WebApi` has not been used by any application and is not a released
Platform predecessor. Treat its repository content only as audited design and
implementation input for the new `MartiX.Platform.*` family. It creates no
source/binary compatibility promise, Supported Line, maintenance period,
deprecation release, NuGet adoption campaign or legacy Platform Migration.

Implementation may replace, rename or archive the current projects in place
according to the later prioritized roadmap while Git history preserves their
provenance. New Platform packages never reference legacy assemblies, no facade
or type forwarding is created, and `MartiX.Platform.Tool` contains no
`legacy-webapi` adoption mode or special Capability Manifest origin variant.
The general migration policy begins with actual Supported Platform contracts
and Generated Solutions.

If evidence of a previously unknown external consumer appears later, assess its
exact package/source version and requirements as new explicit migration scope.
Do not retroactively broaden the initial compatibility matrix or contaminate the
new Kernel for a hypothetical consumer.

**Why:** support and migration exist to preserve real consumer-owned value.
Building and testing a legacy lifecycle with no consumer would consume quality
capacity, increase tool/package surface and constrain the redesign without
reducing any actual adoption risk.

**Alternatives rejected:** a precautionary compatibility facade preserves the
wrong architecture; a final deprecation package can break builds or imply a
support promise; a 12-month empty maintenance line spends capacity without a
consumer; and a speculative adoption mode expands the migration attack and test
surface before any source state requires it.

### Derive release intent from durable change fragments and one version source

Every consumer-, operator- or agent-observable change adds a repository-owned
Markdown **Change Fragment** under `docs/changes/`. Use a unique descriptive
date-prefixed filename such as `20260720-add-platform-tool.md`; names identify
the actual change and never use sample company, product or feature placeholders.

Each fragment has validated YAML front matter with one `patch`, `minor` or
`major` impact plus affected areas, audiences and `none`, `optional` or
`required` migration disposition. Its body records `What changed`, `Why`,
`Consumer action`, `Compatibility and migration`, and applicable replacement or
alternatives. Internal refactoring with no observable contract change needs no
fragment; changing a public, generated, serialized, operational, support or
tooling contract without one fails repository-integrity verification.

The highest fragment impact is the minimum SemVer increment for the complete
synchronized train. Release review may raise but never lower it. Quality Gates
cross-check fragments against package/API compatibility, analyzer diagnostics,
Template System interface, Capability Manifest schema, Capability/provider/TFM/
OS catalogs, migration requirements and behavioral contract fixtures. A detected
breaking change marked `patch` or `minor`, an undeclared observable change, or
conflicting migration disposition blocks release.

Conventional Commit text, pull-request labels, branch names and hosted issue
metadata may aid navigation but are not versioning authority. Coordinated
security work may keep sensitive details in the private advisory until disclosure,
then publishes a safe Change Fragment linked to the advisory and evidence.

Release tooling deterministically composes accepted fragments into human release
notes, the Release Evidence change set, deprecation/removal tables and migration
index. It moves rather than deletes them into the immutable release directory,
for example `docs/releases/1.2.0/changes/`, preserving local WHAT/WHY after hosted
pull requests or services disappear.

`eng/PlatformVersion.props` is the single repository source for the candidate
Platform Version. Build orchestration supplies that exact value to every runtime,
analyzer, provider, Template System and .NET tool package and generates the
matching documentation/manifest/evidence values. Verification rejects any
independent hard-coded or divergent first-party version. No third-party Git
versioning library, commit count or tag inference determines production identity.

**Why:** small reviewable fragments capture intent when knowledge is fresh and
let tools compare human compatibility claims with executable evidence. One
version source prevents a synchronized train from producing mixed identities,
while retaining fragments under the release keeps rationale available to humans
and lower-cost implementation agents without relying on conversation or hosting
history.

**Alternatives rejected:** commit messages are mutable and too shallow; a manual
changelog can omit migration or deprecation facts; API diff alone misses
behavioral and operational breaks; deleting fragments discards canonical
history; multiple version files permit split releases; and automatic commit-
derived versions obscure intentional SemVer classification.

### Match trunk and one maintenance branch to the support model

Use trunk-based development with `main` for the current Active line, short-lived
review branches and at most one long-lived `release/N.x` branch for the previous
line. There is no permanent `develop`, per-minor, per-patch or generic hotfix
branch.

`main` remains releasable. When breaking development for the next major begins,
cut `release/N.x` from the last Supported state that must continue receiving
compatible servicing. It remains the old major's servicing branch and enters
the 12-month Maintenance phase when its stable successor is released. This
keeps at most two supported code lines, matching the public support promise.

Stable tags are immutable and created only for successfully promoted Candidate
IDs. Branch or tag names do not calculate package versions;
`eng/PlatformVersion.props` remains authoritative on each line. Branch
protections require the same repository-owned Verification Entrypoint and do not
duplicate policy in hosting-specific rules.

A fix is designed against the oldest Supported Line demonstrably affected and
then forward-ported to newer lines. Cherry-pick can transport text but does not
prove semantic equivalence: every line has its own Change Fragment, Candidate
ID, packed artifacts and applicable Composed Quality Profile. One security
advisory may relate the branch-specific fixes while their evidence remains exact.
No hotfix bypasses release-candidate gates, signing, evidence or approval.

Stable releases are on demand when a meaningful change and complete evidence
exist; the Platform does not publish empty calendar versions. At least quarterly,
a release-readiness review checks runtime/dependency patches, vulnerabilities,
pending Change Fragments, deprecations/support dates, migration fixtures and
upstream lifecycle changes. A required security release proceeds immediately
outside that rhythm under the same release state machine. Alpha, beta and RC
cadence remains demand-driven and unsupported for production; nightly success
never publishes stable bytes automatically.

**Why:** one maintenance branch directly implements current-plus-previous-major
support and concentrates limited backport capacity. On-demand releases avoid
meaningless churn, while scheduled readiness review prevents quiet security,
dependency and lifecycle debt when no product feature happens to trigger a
release.

**Alternatives rejected:** GitFlow adds integration and merge queues without a
distinct contract; branch-per-minor implies unsupported servicing; release-per-
merge creates migration/version noise; fixed monthly publication can ship no
value; purely ad-hoc release review neglects upstream maintenance; and a hotfix
bypass trades incident urgency for unverifiable artifacts.

### Measure vulnerability response by verified protection, not acknowledgement

Retain the approved published-vulnerability targets: 24 hours for actively
exploited/critical, seven calendar days for high, 30 days for moderate and 90
days for low. The target measures time from confirmed applicability to a
verified protective outcome for every affected Supported Line, not merely an
acknowledgement and not an unconditional promise that a complete patch is always
possible within 24 hours.

A qualifying protective outcome is exactly one of:

1. a promoted fixed Supported Release;
2. a tested temporary mitigation plus coordinated advisory and owned fix plan;
   or
3. withdrawal/deactivation of the affected release, Capability or provider when
   safe operation cannot be demonstrated.

`SECURITY.md` publishes a private reporting channel, Supported Lines and process.
Receipt is acknowledged within two business days, while suspected active
exploitation or critical impact receives immediate triage. Applicability and
severity timestamps, evidence and decisions remain in the confidential incident
record; maintainers cannot delay confirmation to stop the response clock.

Severity combines the applicable scoring standard with reachability in
Supported Presets, required privileges, confidentiality/integrity/availability
impact, observed exploitation, affected Capabilities/providers and available
mitigation. A raw CVSS score neither proves nor dismisses Platform risk.
Confirmed critical/high and reachable moderate findings remain release-blocking
under the existing Risk Exception policy.

Every affected Supported Line receives its own exact candidate, gates and
evidence even when one advisory coordinates disclosure. Security urgency never
permits gate bypass, test/publish byte drift or version reuse. When upstream has
no safe fix, use a proven safe pin, isolate/disable the affected Capability, or
withdraw the release with exact operational constraints rather than claiming a
patch that does not remove exposure.

Disclosure is coordinated so users receive actionable mitigation without
premature exploit detail. After containment, every confirmed defect receives
root-cause analysis, permanent regression evidence, applicable Threat Model and
Security Control Manifest updates, a strengthened gate where detection failed,
Change Fragment and migration/recovery guidance.

**Why:** an acknowledgement provides no protection, while insisting that every
upstream-dependent critical defect has a complete patch in 24 hours can reward
unsafe hurried changes. A fixed release, verified mitigation or withdrawal is a
measurable fail-closed outcome that protects consumers and preserves the full
release integrity contract.

**Alternatives rejected:** acknowledgement-only targets are security theatre;
patch-only clocks can force unverified fixes; CVSS-only triage ignores actual
reachability and business impact; delaying applicability classification games
the SLA; and emergency gate bypass can replace one vulnerability with an
unattested release.

### Require publishing identity, author signature and build provenance

Every public RC and stable release establishes a three-layer **Release Trust
Chain**:

1. **Publishing identity:** NuGet.org Trusted Publishing exchanges an OIDC token
   bound to the exact repository, release workflow and protected environment for
   a short-lived credential. No long-lived NuGet API key is stored. The publish
   job receives minimal `id-token: write` permission only after gates and human
   approval, following the official
   [NuGet Trusted Publishing model](https://learn.microsoft.com/en-us/nuget/nuget-org/trusted-publishing).
2. **Artifact authorship:** every first-party runtime, analyzer, provider,
   Template System and Tool NuGet package is author-signed with a publicly
   trusted X.509 code-signing certificate and RFC 3161 timestamp. NuGet.org
   requires the registered MartiX signer and final packages pass
   `dotnet nuget verify`. Author signing supplies end-to-end origin/integrity
   independently of transport, unlike repository-only signing, as described by
   [NuGet signed packages](https://learn.microsoft.com/en-us/nuget/reference/signed-packages-reference).
3. **Build provenance:** every releasable digest, SPDX SBOM and Release Evidence
   Manifest receives an OIDC-backed artifact attestation binding repository,
   workflow identity, protected environment, source commit and bytes. GitHub
   Artifact Attestations are the initial hosting Adapter while the evidence
   contract remains provider-neutral, following the
   [GitHub provenance model](https://docs.github.com/en/enterprise-cloud@latest/actions/concepts/security/artifact-attestations).

The production signing private key is non-exportable in a hardware token, HSM
or managed signing service. A PFX/private key and password never reside in the
repository or CI secret store. The concrete provider is replaceable and selected
at implementation time from services that meet these controls; provider cost is
not permission to weaken the stable-release contract.

Release workflows and external actions are pinned to immutable commit SHAs.
Build has no publication credential; signing/publication cannot modify source or
rebuild. Signing forms part of final artifact identity, so signed bytes rerun
signature, content and complete release-candidate verification before promotion.
The signed source commit/tag is immutable and maps to the same evidence digest
set.

Evidence archives certificate chains, timestamps, thumbprints, attestation
verification material and offline commands. Key rotation has a tested overlap,
new-signer registration, cutoff and historical-verification runbook. Suspected
compromise blocks publication, triggers advisory/revocation analysis and moves
future candidates to a new signer without rewriting historical evidence.

Before first stable publication, protect eligible MartiX package IDs/prefixes
against impersonation through registry ownership/reservation. Public prereleases
use the production trust chain. Private development builds may use a clearly
separate test signer/feed and carry no public production support claim.

Author-signing infrastructure is an admission requirement for the first stable
release. If it is not ready, continue private builds or unsupported prereleases
rather than publishing stable with a weaker chain.

**Why:** OIDC proves who may publish, author signing proves package origin after
transport, and provenance proves which trusted build produced the exact bytes.
No one layer substitutes for the others. Non-exportable keys and separated build
and publish authority reduce credential theft and post-test artifact replacement.

**Alternatives rejected:** long-lived API keys increase leak/rotation risk;
repository signature alone does not provide transport-independent author proof;
provenance without package signature does not directly sign the NuGet content;
exportable PFX secrets weaken the signing root; mutable action tags change build
implementation; and deferring signing until after public stable publication
creates an avoidable trust discontinuity.

### Separate candidate evidence, publication receipts and the final evidence root

One document cannot be both approved immutably before publication and contain
facts observed only after publication. Use three signed, content-addressed
schemas:

1. **Candidate Evidence Manifest** is completed after final candidate gates and
   before approval. It binds Candidate ID, Platform/source/toolchain/workflow
   identities, Quality Gate Policy and Compatibility Coverage Plan, all Gate Run
   Manifests, artifact digests, SBOM/provenance/signatures, compatibility and
   migration evidence, security/performance dispositions, Change Fragments,
   deprecations/support dates and intended destinations. Human approval signs or
   references its exact digest.
2. One **Promotion Receipt** per destination records that Candidate Evidence
   digest, registry identity, published artifact IDs/versions/digests, observed
   timestamps, OIDC publisher/workflow identity, retries and `published`,
   `verified`, `partial` or `failed` outcome. Receipts are append-only and signed;
   retry cannot replace history.
3. The final **Release Evidence Manifest** exists only after every required
   destination verifies the complete digest set. It is the small signed root
   linking Candidate Evidence, all successful Promotion Receipts, stable
   tag/release identity, final Supported Line dates and offline verification
   instructions without duplicating the evidence graph.

The portable archive has this logical layout:

```text
release-evidence/
  release-evidence.json
  candidate-evidence.json
  promotion-receipts/
  gate-runs/
  sbom/
  provenance/
  signatures/
  reports/
```

Repository-owned JSON Schema Draft 2020-12 contracts live at:

```text
eng/schemas/candidate-evidence.schema.json
eng/schemas/promotion-receipt.schema.json
eng/schemas/release-evidence.schema.json
```

Each document contains integer `schemaVersion`. Adding safely ignorable optional
data is compatible; removing/changing meaning or adding an unconditionally
required field is schema-breaking and occurs only with a Platform major release.
Readers support every schema in the Supported Lines and fail closed without
rewriting a newer unknown schema.

Digests cover exact stored bytes rather than a reserialization. Every relative
or external reference includes SHA-256 digest, byte length and media type. Large
reports may use immutable external storage only with stable location, retention
deadline and digest. Credentials, tokens, personal data and embargoed
vulnerability detail are prohibited; the complete graph passes schema,
signature, digest traversal and canary leakage verification offline.

A failed candidate retains Candidate Evidence and failed/partial receipts for
audit but cannot produce a successful final Release Evidence Manifest. That
manifest's existence is therefore a machine-verifiable Supported promotion fact,
not a generic folder name or CI conclusion.

**Why:** immutable candidate approval and post-publication truth occur at
different times. Separating them preserves both, exposes retries/partial failure
and keeps the final trust root compact and provider-neutral while allowing every
underlying proof to be retrieved and verified by content identity.

**Alternatives rejected:** rewriting approved evidence invalidates its signature;
omitting receipts cannot prove registry bytes; a monolithic embedded-log JSON is
large and leakage-prone; CI links are mutable; and issuing a final manifest for
partial publication falsely claims a complete Supported Release.
