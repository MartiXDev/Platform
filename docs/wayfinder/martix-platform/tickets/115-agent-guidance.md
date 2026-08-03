---
title: Design the MartiX agent guidance package
status: closed
type: wayfinder:prototype
parent: ../map.md
claimed_by:
resolved: 2026-07-20
blocked_by:
  - 104-capability-preset-matrix.md
  - 106-generated-solution-topology.md
  - 114-release-migration-policy.md
  - 122-repository-distribution-topology.md
---

## Question

What compact `AGENTS.md`, Skills, machine-readable context, validation commands, migration workflows, and installation or plugin packaging let an LLM develop and maintain a Generated Solution without duplicating architectural authority, while requiring every change to preserve its WHAT, WHY, alternatives, relationship to current implementation, migration path, evidence, consequences, future extension triggers, deferred scope, and supersession history in the correct canonical artifact?

## Prototype outcome

The throwaway prototype compared repository-only, repository-plus-Skill, and
mandatory-plugin designs and contained a concrete `AGENTS.md`, `martix-platform`
Skill, workflow branches, release identity, and product metadata. The owner
accepted the repository-plus-Skill variant on 2026-07-20. The prototype was
removed after its validated behavior was absorbed below.

## Resolution

### Use a layered Agent Guidance Package

Every Generated Solution contains a compact, self-sufficient root `AGENTS.md`.
The canonical Platform repository additionally owns one model-invoked
`martix-platform` router Skill under `skills/martix-platform/`. The Skill
orchestrates workflows and progressively loads task-specific reference; it is
an Adapter over repository authority, never an architecture or decision store.

An agent without Skill support must still be able to complete ordinary work by
reading `AGENTS.md` and the linked authorities. A skill-aware agent gains
predictable task classification, version checks, focused workflow routing,
deterministic Tool invocation, and completion evidence without copying those
workflows into every Generated Solution.

**Why:** this preserves a universal low-friction fallback while concentrating
repeated procedural knowledge in one synchronized source. It minimizes both
context load and repository drift and gives inexpensive agents a small deep
Interface rather than a large architecture prompt.

### Keep each kind of truth in one authority

The guidance routes information according to the already accepted layered
documentation model:

- `CONTEXT.md` owns vocabulary only;
- `docs/architecture/README.md` owns the approved current structure;
- `docs/architecture/decisions/` owns hard-to-reverse, surprising trade-offs;
- `martix.platform.json` owns exact Preset, Capability/provider, Platform
  Contract Version, schema, origin, and applied-migration state;
- `eng/quality-gates.json` owns executable gate applicability and policy;
- `eng/verify.cs` owns the cross-platform verification command Interface;
- Platform `docs/changes/` fragments own observable release changes;
- issues and pull requests own the task completion record; and
- the Skill owns process and routing only.

`AGENTS.md` contains authority order, non-negotiable ownership and dependency
rules, exact verification and migration command shapes, change-to-document
routing, permission/generated-file guardrails, and a checkable completion
contract. It excludes framework tutorials, duplicated rationale, package
catalogs, historical diaries, prompt personas, and model-specific reasoning
advice.

**Why:** vocabulary, current architecture, historical rationale, exact machine
state, executable enforcement, and workflow change at different rates. A single
large instruction file would make stale duplication likely and hide the rules
an agent needs first.

### Generate machine context instead of committing another manifest

Do not add a committed `martix.agent.json`. The exact-version
`MartiX.Platform.Tool` exposes an `agent context --format json` operation that
projects the current repository state from existing authorities. The Skill
reads Installed Platform Version and Platform Contract Version first and invokes
the exact admitted Tool version; it never selects `latest`.

The ephemeral projection contains repository role, installed/contract/schema
and Skill versions, compatibility status, Preset, selected Capability/provider
IDs, repository-relative authority paths, applicable verification commands,
migration status, and safe Git state. It contains no copied document bodies,
secrets, environment values, access tokens, personal absolute paths, or
nondeterministic timestamps and is never committed.

**Why:** an on-demand projection creates one deep machine Interface without
duplicating the Capability Manifest or documentation index. Tool ownership also
makes parsing, compatibility checks, and diagnostics deterministic and testable.

### Make the Skill a concise model-invoked router

The `martix-platform` Skill description triggers on developing, reviewing,
migrating, or maintaining Platform repositories and Generated Solutions,
including vertical slices, Business Modules, Capabilities/providers, HTTP or
persistence behavior, quality failures, documentation decisions, and Platform
upgrades.

Its core workflow is:

1. establish repository, Platform, manifest-schema, and Skill identity;
2. select one primary workflow branch and load only relevant reference;
3. inspect vocabulary, ownership, current behavior, decisions, and gates;
4. plan the smallest reviewable change and documentation disposition;
5. implement through the owning vertical slice or deep seam, test-first for
   behavior changes;
6. execute applicable deterministic verification; and
7. reconcile each changed meaning once and emit the completion record.

Every step has a checkable completion criterion. Conditional reference belongs
one level below `SKILL.md` in focused files such as `references/workflows.md`.
Detailed .NET, FastEndpoints, TUnit, Markdown, or other framework rules remain
in their focused standalone Skills or versioned reference sources; the Platform
Skill routes to them and does not copy their contents. Do not add Skill scripts
while the existing .NET Tool and Verification Entrypoint already own the
deterministic operation.

Initial workflow branches are Application Behavior, Platform Library,
Capability or Provider, Platform Migration, Quality Failure, and Canonical
Knowledge. Add a branch only for a distinct invocation path with different
required context; add scripts only for repeated deterministic behavior not
already owned by Platform tooling.

### Require a structured completion and documentation disposition

Every agent completion records WHAT, WHY, material alternatives and rejection
reasons, relationship to current implementation, migration or rollout path,
verification evidence, consequences and risks, future extension triggers,
deferred scope, and superseded decisions. A reasoned `not-applicable` is valid;
silently omitting a field is not.

Durable meaning is promoted exactly once to its canonical owner. An
implementation-only edit may update only source, tests, and the task/pull-
request record. It must not create an empty ADR or touch unrelated documentation
to simulate diligence. A domain term updates the glossary; current structure or
operations update their architecture document or guide; a hard-to-reverse
surprising trade-off creates or supersedes an ADR; Capability and migration
state changes through the Platform Tool; an observable Platform release change
adds one change fragment.

**Why:** the completion record preserves review context for every task, while
selective promotion prevents documentation sediment and conflicting histories.

### Version, install, publish, and validate one Skill source

`MartiXDev/Platform/skills/martix-platform/` is the only editable canonical Skill
source. It contains `SKILL.md`, `agents/openai.yaml`, only required one-level
references, and a generated release-identity record. Its Platform Version,
content digest, validation, documentation, Tool behavior, and release evidence
are bound to the synchronized Platform candidate.

An exact digest-preserving copy is published one-way from an attested Platform
tag or release asset to the separately managed `martix/skills` Marketplace
repository. Marketplace metadata may wrap but cannot change behavior. Fixes
originate in `MartiXDev/Platform` and flow through a new synchronized release.
Exact tagged-source installation remains available; a mutable default branch or
unversioned `latest` is not a Supported installation contract.

On entry, the Skill compares its release with Installed Platform Version and
Platform Contract Version. It continues mutation only for a declared compatible
profile; otherwise it provides the exact Skill installation action or invokes a
read-only Platform Migration plan. Tool-specific instruction files are optional
thin bridges for clients that do not discover `AGENTS.md`; they contain only a
pointer to `AGENTS.md` and the Skill and repeat no behavioral rule.

The release validates Skill structure and product metadata, references and
digests, instruction links, exact-version compatibility, and representative
forward tests. Agent-readiness fixtures start independent inexpensive and
frontier model/tool profiles against raw Generated Solutions. They cover a
vertical slice, test-first repair, Deferred-provider refusal, migration planning
over application-owned changes, correct knowledge routing, hostile embedded
instructions, and complete diff explanation. Success requires applicable
repository Quality Gates, correct permissions and canonical updates; model
confidence is not evidence and no release claims support for every possible LLM.

### Defer a mandatory plugin or MCP layer

Do not require a MartiX plugin, MCP server, remote service, or product-specific
app initially. Local inspection, generation, migration, and verification already
have deeper repository and .NET Tool Interfaces. A plugin facade would be a
second installation and trust surface while excluding generic and offline
agents.

Reconsider a plugin only when at least two real agent hosts need a typed remote
or tool protocol the CLI cannot supply safely, or a future Marketplace requires
a wrapper. The canonical Skill remains the behavioral source within such a
plugin, and any remote mutation retains explicit permissions and deterministic
Tool ownership.

## Current implementation and migration direction

The current WebApi repository has accumulated planning artifacts but is not the
target guidance implementation. Copy this closed decision with the other
Wayfinder history into the greenfield `MartiXDev/Platform` bootstrap. Implement
the layered authorities and deterministic Tool/verification contracts before
publishing the Skill; then create it with the official Skill initializer,
validate it, and forward-test it against generated fixtures before Marketplace
publication.

Generated applications receive their compact `AGENTS.md`, `CONTEXT.md`,
architecture paths, Capability Manifest, Quality Gate Policy, and Verification
Entrypoint from the Template System. They do not receive a copied Skill folder,
plugin dependency, second agent manifest, or model-specific prompt collection.

## Material alternatives rejected

- Repository-only guidance remains the mandatory fallback but is insufficient
  as the only package because workflows would be repeated or rediscovered.
- One large `AGENTS.md` or Skill containing architecture and framework reference
  is rejected because it duplicates authority, consumes context, and sediments.
- A committed agent-context manifest is rejected because existing authorities
  can be projected deterministically.
- A Skill as architectural authority is rejected; it must remain replaceable.
- A mandatory plugin/MCP server is Deferred until a proven protocol seam exists.
- Copying the Skill into every Generated Solution is rejected because workflow
  fixes and release identity would fork.
- Claiming compatibility with every LLM is rejected; support claims name tested
  agent/tool profiles and executable evidence.

## Consequences and extension triggers

- **Synthesize the decision-ready platform blueprint** must include the layered
  guidance topology, Tool-generated context, and Deferred plugin status.
- **Produce the prioritized migration roadmap** must sequence authority files,
  Tool context projection, template `AGENTS.md`, Skill initialization,
  validation, forward tests, release binding, and Marketplace publication.
- The implementation must define the exact `agent context` JSON Schema and
  Skill compatibility rules without creating another source of truth.
- Add workflow reference or a focused Skill only when invocation, sequence, or
  specialized reference justifies its context/cognitive cost.
- Promote a plugin/MCP Adapter only after a real multi-host typed protocol and
  permission model pass the deletion test and quality gates.
