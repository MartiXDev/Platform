# MartiX .NET/C# skill improvement analysis

## Decision summary

The package has implemented most of the first-pass comparison backlog. The
initial implementation of this analysis repaired the source-traceability
contract, added an eval protocol, and simplified the router. The next change
should **not** be another broad content expansion: use recorded eval results
to decide whether any remaining narrow reference gap is real.

The package is a strong layered library: 19 compact rules, maps, recipes,
templates, taxonomy data, an anti-pattern guide, and package documentation.
That architecture agrees with the historical comparison documents. The main
risk is now that its entrypoints repeat a large amount of navigation and
default guidance, while the planned evidence loop has not yet been captured.

## Scope and method

This review used the `writing-great-skills` principles of predictability,
information hierarchy, progressive disclosure, single source of truth,
completion criteria, and pruning. It reviewed:

- repository-level Markdown that affects package construction, routing,
  packaging, and evaluation;
- `docs/martix-csharp/*` as requested, treating it as historical inspiration
  rather than an approved content source; and
- every Markdown document in `docs/martix-dotnet-csharp`, together with the
  package entrypoints, rule/reference inventory, metadata, and existing eval
  manifest.

No external documentation or source material was used for new technical
guidance. This is therefore an architecture and maintenance analysis, not a
fresh .NET research pass.

## What is already complete

The older plans remain useful as traceability records, but many of their
proposed deliverables are already present and should be removed from the
active backlog:

| Earlier recommendation | Current evidence | Disposition |
| --- | --- | --- |
| Quick-start defaults and a web bootstrap | The code and middleware patterns now live in `references/web-bootstrap-recipes.md`; `SKILL.md` routes to them. | Maintain; do not expand by default. |
| Anti-pattern consolidation | `references/anti-patterns-quick-reference.md` is linked from both entrypoints. | Maintain and curate. |
| Web and testing recipes | `web-bootstrap-recipes.md` and `testing-bootstrap-recipes.md` exist. | Use as disclosed reference, not more top-level content. |
| Navigation maps | Domain maps plus `AGENTS.md` routes are present. | Tune from eval evidence. |
| Cross-skill boundaries | `SKILL.md` explicitly hands off FastEndpoints and FluentValidation work. | Add boundary evals before altering. |
| Comparison-driven growth scaffolding | Templates, taxonomy, section ordering, metadata, and five eval cases exist. | Make the evidence loop operational. |

## Findings and recommended improvements

### P0 — repair the declared source trail

`references/doc-source-index.md` names three approved local files under
`research/`, but the package contains no `research/` directory. This is a
broken source-of-truth contract: the file says the rule library is grounded in
artifacts that a future maintainer cannot inspect. It also makes the opening
instruction in `SKILL.md` (read the source boundary first) less useful than it
appears.

Choose one explicit resolution:

1. Restore the three research artifacts from their authoritative location,
   record their provenance and review date, and link them from the source
   index; or
2. Remove them from the approved-local-artifacts table and state that the
   current rule set is traceable through the official source maps only.

The second option is better if those artifacts were only temporary research
notes. Do not leave dangling names as a historical hint. Completion criterion:
every local artifact listed in the source index exists in the package, and
every rule/reference source claim can be followed by a maintainer.

### P1 — turn the planned evals into a repeatable decision gate

`evals/evals.json` is a useful prompt inventory, but it is not evidence of
activation or usefulness by itself. The phase-two plan correctly prioritizes
evaluation, yet the package has no recorded run results, baseline comparison,
scoring rubric, or acceptance thresholds.

Create `evals/README.md` (or a concise `evals/results.md` after the first
run) that defines:

- how to run each case with and without this skill;
- a four-value score for activation, first-file routing, technical guidance,
  and correct handoff;
- acceptance thresholds, for example: all positive cases activate; both
  negative cases avoid package-specific implementation detail; and each case
  reaches its required files without irrelevant rules; and
- a dated results table that links an observed failure to one proposed change.

Extend the case set before changing trigger wording:

| Missing case | What it validates |
| --- | --- |
| Options/DI-specific prompt | Whether configuration and DI terms need trigger expansion. |
| EF Core query/performance prompt | First-file routing to data versus generic performance guidance. |
| Serialization compatibility prompt | Whether contracts, source generation, polymorphism, and tolerant-reader gaps are material. |
| Plain C# type-design prompt | That the broad .NET skill activates for public API/type design, not only web work. |
| Unrelated non-.NET prompt | False-positive activation. |
| FastEndpoints plus generic HTTP concern | The boundary: shared host guidance remains available without duplicating endpoint implementation. |

Completion criterion: every claimed lane and handoff has at least one positive
or boundary test, one unrelated negative test exists, and the next content
change cites a reproducible result.

### P1 — reduce entrypoint duplication and strengthen progressive disclosure

`SKILL.md` is both a router and a mini field guide. Its compatibility stance,
quick-start code, middleware list, defaults table, source-boundary sequence,
reference list, domain table, install note, and handoff table compete for the
reader's first action. `AGENTS.md` then repeats compatibility guidance,
domain routing, review questions, reference indexes, and maintenance notes.
The package is not severely long, but this is emerging **sprawl** and
duplication at the highest information tier.

Make `SKILL.md` a sharper router:

- Keep the trigger/compatibility boundary, a compact "inspect baseline first"
  action, the eight-domain routing table, and the two handoff rows.
- Move the `.csproj`, `Program.cs`, middleware reminder, and default-pattern
  table behind one context pointer such as `references/greenfield-bootstrap.md`
  (or fold them into the existing web recipes if it can remain easy to scan).
- Remove installation guidance from `SKILL.md`; it is package-user reference
  material and already belongs in `README.md`.
- Replace repeated prose such as "read only the linked rules" with one
  **narrow route** leading word: select one domain map, open its linked rule,
  and expand only when the change crosses a named boundary.

Make `AGENTS.md` the deep cross-domain companion, not a second router. Keep
the decision tables and review routes there, but point back to `SKILL.md` for
activation rather than restating it. Completion criterion: each concept has
one authoritative home, and a user can identify the first file to open from
`SKILL.md` without reading code examples or maintainer material.

### P1 — normalize the actual supported baseline

The package consistently says ".NET 10+ and C# 14+" while claiming
incremental modernization support for older SDK-style projects. That is a
good boundary, but it is repeated across `SKILL.md`, `AGENTS.md`, `README.md`,
and `metadata.json`; the sample itself also makes the web stack look like the
default for every .NET task.

Create a single compatibility statement, ideally in `SKILL.md`, with a short
pointer from the other package metadata/docs. Make its decision explicit:

- **greenfield or explicit upgrade:** use released .NET 10/C# 14 defaults;
- **existing SDK-style repository:** inspect `TargetFramework`, `LangVersion`,
  `global.json`, and shared build files; recommend only compatible changes;
- **non-SDK-style or pre-.NET-Core work:** do not imply support—route to a
  migration assessment first.

Then make the bootstrap snippet visibly an ASP.NET Core example, rather than
an apparent universal default. Completion criterion: all four package-facing
files point to the same compatibility contract and no entrypoint suggests
net10-only APIs for an unchanged older baseline.

### P2 — defer unproven reference expansion, but prepare narrow landing zones

The comparison documents propose six useful references: type/language,
concurrency, API compatibility, configuration, DI, EF Core, and serialization.
The current phase-two plan correctly says not to broaden content without
evidence. Preserve that choice. The files named below should be added only if
the eval gate identifies a concrete routing or answer-quality failure:

| Observed failure | Narrow landing zone | Keep it to |
| --- | --- | --- |
| Choosing `Task.WhenAll`, `Parallel.ForEachAsync`, channels, locks, or concurrent collections is slow or inconsistent | Extend `references/async-map.md` | One decision matrix plus links; no tutorial. |
| Public-contract changes omit compatibility/deprecation checks | `references/api-compatibility-checklist.md` | Surface changes, deprecation path, and test/CI checks. |
| Options and DI answers miss named options, validation dependencies, keyed services, or test overrides | `references/configuration-and-di-map.md` | A joined map; split only if it outgrows one screen. |
| EF Core answers miss tracking, projection, query shape, bulk operations, or concurrency | `references/efcore-recipes.md` | A scenario selector, not a database-performance course. |
| Serialization answers miss source generation, polymorphism, or wire compatibility | `references/serialization-contracts.md` | Contract decision aids and safe escalation paths. |
| Type choices lack fast heuristics | Extend `references/design-map.md` or `csharp-language-map.md` | `class`/`record`/`struct`, null contracts, and public API checks. |

This retains the unified package rather than mirroring many narrow third-party
skills. It also corrects an inconsistency in the older plan: it proposes
separate configuration and DI files before demonstrating that the two are
independent invocation branches.

### P2 — make documentation status and metadata honest

The docs mix an original construction brief, two historical comparison plans,
and a current phase-two plan. This makes it easy to mistake superseded backlog
items for open work. `metadata.json` also says `maturity: "authoring"`, while
the package is implemented enough to contain release documentation and eval
cases; only evidence about its effectiveness is missing.

Recommended cleanup:

- Add a one-line status banner to each historical comparison and first-pass
  plan: "Historical; implementation status superseded by
  `martix-dotnet-csharp-improvement-plan.md`."
- In the current plan, link to this analysis and maintain one active backlog
  table, instead of duplicating P1/P2 candidates across multiple plans.
- After the first eval pass, change the maturity value only to a defined state
  such as `evaluating` or `validated`; document the allowed values near the
  field. Do not rename it merely because the package is large.
- Remove `futureSkillEntry` and `futureCompiledGuide` from metadata if they no
  longer describe a future build product. Replace them with `entrypoint` and
  `companionGuide`, or omit them if metadata consumers do not use the fields.

Completion criterion: one document contains the active plan, every older plan
declares its status, and metadata labels describe the package as it exists.

### P3 — apply a lightweight pruning cadence

The 301-line anti-pattern reference and 225–276-line recipe files are allowed
to be longer because they are disclosed reference. Their growth still needs a
rule: they should remain scenario selectors, not become duplicate tutorials of
the rules.

For each package release, review only changed Markdown for:

- a single source of truth for each decision;
- a direct route from each recipe back to its governing rule;
- source anchors that support the exact claim;
- examples that compile in their stated context or are explicitly schematic;
- dead references, stale version wording, and obsolete install commands.

Add this small review checklist to the maintainer documentation instead of
creating another skill.

## Recommended sequence

1. Repair the missing-local-artifact source index and mark historical plans.
2. Run the existing evals plus the six missing cases against a no-skill
   baseline; record results and failures.
3. Tighten `SKILL.md` into a router and disclose web bootstrap material.
4. Normalize the compatibility statement and metadata terms.
5. Add at most one narrow reference/map for the highest-confidence eval gap.
6. Repeat the focused eval cases and retain only changes that improve their
   score without worsening negative activation or handoff behavior.

## Definition of done

The next improvement cycle is complete when all of the following are true:

- all declared local sources are present and traceable;
- one active plan and one compatibility statement are authoritative;
- eval results show reliable activation, narrow first-file routing, correct
  FastEndpoints/FluentValidation handoffs, and no unrelated activation;
- `SKILL.md` functions as a compact router while recipes and maintenance
  material remain behind explicit context pointers;
- every added reference is tied to an observed failure and is linked from its
  owning rule/map; and
- no broad framework, tool workflow, or third-party ecosystem content has
  entered the core package without an independently justified branch.
