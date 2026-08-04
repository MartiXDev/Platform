## Source index and guardrails

### Purpose

This index locks the approved documentation sources for the `martix-powershell`
standalone skill library and records which source families are intentionally
excluded from rule authoring. Consult this file before writing or revising any
rule, reference map, or research memo in this package.

Every claim in a rule must trace to an approved source listed here. If a source
you need is absent, add it to this file and document the reason before using it.

---

### Source priority

When sources conflict, the following precedence applies. Lower-numbered tiers
win unconditionally over higher-numbered ones.

1. **Microsoft Learn — cmdlet developer docs** (`developer/cmdlet/` and
   `developer/module/`).
   `https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/`
   and `https://learn.microsoft.com/en-us/powershell/scripting/developer/module/`.
   These are the canonical, version-tracked records of how the PowerShell SDK
   behaves. The System.Management.Automation API reference
   (`https://learn.microsoft.com/en-us/dotnet/api/system.management.automation`)
   is a tier-1 supplement: use it when a docs page is ambiguous about method
   signatures, attribute constructors, or class hierarchies. Both win over all
   lower-tier sources unconditionally.

2. **MicrosoftDocs PowerShell-Docs GitHub repository** —
   `https://github.com/MicrosoftDocs/PowerShell-Docs`.
   Raw source for the learn.microsoft.com pages above. Use when a published
   page is missing, ambiguous, or under active revision; never use in
   preference to the rendered site for a stable page.

3. **Advanced-function `about_` topics — user-approved dual-scope layer** —
   `https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/`
   These reference pages describe how `[CmdletBinding()]`-decorated advanced
   functions mirror compiled cmdlet behaviour. They are a secondary mirror
   only: use them to validate that a compiled-cmdlet pattern also applies in
   script, or to surface a behavioural gap. See
   [Approved advanced-function topics (tier 3)](#approved-advanced-function-topics-tier-3)
   for the explicit allow-list.

4. **Approved local package artifacts** — the package files listed in the
   [Approved local artifacts](#approved-local-artifacts) section below. These
   drive structural decisions (domains, section contract, ordering) but carry
   no authority over PowerShell SDK semantics.

5. **Repo PowerShell style overlay** —
   `.github/instructions/powershell.instructions.md` in this repository.
   Applies naming conventions, formatting rules, and idiomatic style choices
   that are specific to this project. Style overlays refine generated code but
   never override tier-1 through tier-4 SDK facts. See
   [Repo style overlay (tier 5)](#repo-style-overlay-tier-5) for scope.

---

### Approved local artifacts

These files are part of the `martix-powershell` package. They are approved as
structural inputs to rule authoring (domain layout, section shape, ordering,
taxonomy) but are **not** sources of PowerShell SDK API facts.

| Artifact | Role | Notes |
| --- | --- | --- |
| `skills/martix-powershell/SKILL.md` | Discovery router; defines workstream scope | Highest-priority package-structural file; governs what belongs in this skill |
| `skills/martix-powershell/AGENTS.md` | Cross-workstream companion guide | Defines review routes and maintenance contract |
| `skills/martix-powershell/metadata.json` | Package metadata; domain plan, rule prefixes, tags | Authoritative list of the 8 domains and their canonical prefix names |
| `skills/martix-powershell/rules/_sections.md` | Rule section contract | Every rule must follow this 6-section shape exactly |
| `skills/martix-powershell/assets/taxonomy.json` | Machine-readable domain taxonomy | Drives domain ordering and prefix assignment |
| `skills/martix-powershell/assets/section-order.json` | Stable section and domain ordering | Drives `ruleSectionOrder` and `plannedDomainOrder` |
| `skills/martix-powershell/references/documentation-style-map.md` | Entry map for the documentation, help, and style domain | Help section requirements, `.OUTPUTS`/`[OutputType]` alignment, alias avoidance, stream guidance, Tier-5 overlay pointer |
| `skills/martix-powershell/templates/rule-template.md` | Rule authoring scaffold | Starting point for new rule files |
| `skills/martix-powershell/templates/research-pack-template.md` | Research memo scaffold | Use when scoping sources for a new rule domain |
| `skills/martix-powershell/templates/comparison-matrix-template.md` | Comparison scaffold | Use when benchmarking cmdlet patterns against advanced functions |
| *(future)* `skills/martix-powershell/research/*.md` | Scoped research memos | Must be explicitly approved and listed here before use in rules |

---

### Approved external sources

The table below maps official Microsoft PowerShell-Docs sections to the package
workstreams they primarily inform.

| Documentation section | learn.microsoft.com path | Primary workstream(s) | Notes |
| --- | --- | --- | --- |
| Cmdlet overview | `/powershell/scripting/developer/cmdlet/cmdlet-overview` | Foundation | Framework overview, Cmdlet vs PSCmdlet positioning |
| Cmdlet class declaration | `/powershell/scripting/developer/cmdlet/cmdlet-class-declaration` | Foundation | `[Cmdlet]` attribute, verb/noun, flags |
| Writing a simple cmdlet | `/powershell/scripting/developer/cmdlet/how-to-write-a-simple-cmdlet` | Foundation | Minimal cmdlet shape |
| Writing a binary module | `/powershell/scripting/developer/module/how-to-write-a-powershell-binary-module` | Foundation | Assembly and module packaging |
| Module manifest | `/powershell/scripting/developer/module/how-to-write-a-powershell-module-manifest` | Foundation | `.psd1` structure and required fields |
| Parameter attribute declaration | `/powershell/scripting/developer/cmdlet/parameter-attribute-declaration` | Parameters | `[Parameter]` options |
| Types of cmdlet parameters | `/powershell/scripting/developer/cmdlet/types-of-cmdlet-parameters` | Parameters, Pipeline | Pipeline binding, switch, credential, dynamic |
| Cmdlet parameter sets | `/powershell/scripting/developer/cmdlet/cmdlet-parameter-sets` | Parameters | Set design, uniqueness, default set |
| Validating parameter input | `/powershell/scripting/developer/cmdlet/validating-parameter-input` | Parameters, Attributes | Validation attribute overview |
| Standard cmdlet parameter names | `/powershell/scripting/developer/cmdlet/standard-cmdlet-parameter-names-and-types` | Naming, Parameters | `Path`, `Name`, `Force`, `PassThru`, `InputObject`, `Credential` |
| Dynamic parameters | `/powershell/scripting/developer/cmdlet/cmdlet-dynamic-parameters` | Advanced patterns | `IDynamicParameters`, `RuntimeDefinedParameter` |
| Input processing methods | `/powershell/scripting/developer/cmdlet/input-processing-methods` | Pipeline | BeginProcessing / ProcessRecord / EndProcessing |
| Strongly encouraged guidelines | `/powershell/scripting/developer/cmdlet/strongly-encouraged-development-guidelines` | All | Output, Force, PassThru, aliases, naming |
| Advisory guidelines | `/powershell/scripting/developer/cmdlet/advisory-development-guidelines` | All | Secondary best practices |
| Cmdlet error reporting | `/powershell/scripting/developer/cmdlet/cmdlet-error-reporting` | Error handling | Overview of error model |
| Terminating errors | `/powershell/scripting/developer/cmdlet/terminating-errors` | Error handling | `ThrowTerminatingError` usage |
| Non-terminating errors | `/powershell/scripting/developer/cmdlet/non-terminating-errors` | Error handling | `WriteError` usage |
| Creating an ErrorRecord object | `/powershell/scripting/developer/cmdlet/creating-an-errorrecord-object` | Error handling | Constructor pattern and field requirements |
| Requesting confirmation | `/powershell/scripting/developer/cmdlet/requesting-confirmation` | Confirmation | `ShouldProcess`, `ShouldContinue`, and `ConfirmImpact` |
| Users requesting confirmation | `/powershell/scripting/developer/cmdlet/users-requesting-confirmation` | Confirmation | WhatIf / Confirm user experience |
| How to request confirmations | `/powershell/scripting/developer/cmdlet/how-to-request-confirmations` | Confirmation | Code patterns for confirmation |
| Supporting transactions | `/powershell/scripting/developer/cmdlet/how-to-support-transactions` | Advanced patterns | `SupportsTransactions`, `CurrentPSTransaction` |
| OutputType attribute | `/powershell/scripting/developer/cmdlet/outputtype-attribute-declaration` | Attributes | `[OutputType]` declaration |
| Writing help for cmdlets | `/powershell/scripting/developer/help/writing-help-for-windows-powershell-cmdlets` | Documentation | Comment-based help block structure, required sections, MAML overview |
| Approved verbs | `/powershell/scripting/developer/cmdlet/approved-verbs-for-windows-powershell-commands` | Naming, Attributes | Full approved verb table |

#### Additional tier-1 supplements

| Source | URL | Notes |
| --- | --- | --- |
| System.Management.Automation namespace | `https://learn.microsoft.com/en-us/dotnet/api/system.management.automation` | API reference for `Cmdlet`, `PSCmdlet`, `ErrorRecord`, `ErrorCategory`, and all SDK types; use when learn.microsoft.com docs pages are ambiguous on signatures |
| PowerShell-Docs GitHub repository | `https://github.com/MicrosoftDocs/PowerShell-Docs` | Source of truth for raw doc files and changelog; tier 2 per this index |

---

### Approved advanced-function topics (tier 3)

The following `about_` pages are explicitly approved as dual-scope mirrors.
Use them only to confirm that a compiled-cmdlet pattern also applies in
script, or to surface a behavioural gap, not as primary authorities.

| `about_` topic | URL path | Approved for |
| --- | --- | --- |
| `about_Functions_Advanced` | `/powershell/module/microsoft.powershell.core/about/about_functions_advanced` | `[CmdletBinding()]` semantics; PSCmdlet availability in scripts |
| `about_Functions_Advanced_Parameters` | `/powershell/module/microsoft.powershell.core/about/about_functions_advanced_parameters` | `[Parameter]` and validation attributes as they apply in script form |
| `about_Functions_Advanced_Methods` | `/powershell/module/microsoft.powershell.core/about/about_functions_advanced_methods` | Begin / Process / End / Clean in advanced functions; comparison with compiled overrides |
| `about_CommonParameters` | `/powershell/module/microsoft.powershell.core/about/about_commonparameters` | WhatIf, Confirm, ErrorAction, Verbose, Debug, and other common parameter semantics |

**Constraint:** All four pages must be read against their compiled-cmdlet
counterparts in tier 1. If tier-1 and tier-3 pages conflict on SDK behaviour,
tier 1 wins. Do not mine the tier-3 pages for new rules not already
substantiated in tier 1.

No other `about_` pages, scripting guides, or advanced-function
tutorials are approved in this tier.

---

### Repo style overlay (tier 5)

| File | Scope | Usage |
| --- | --- | --- |
| `.github/instructions/powershell.instructions.md` | Applies to `**/*.ps1`, `**/*.psm1` | Naming conventions (Verb-Noun PascalCase, singular nouns, no aliases), variable casing, `[CmdletBinding()]` structural layout, and `ShouldProcess` call style for scripts in this repo |

**Constraint:** The style overlay governs generated `.ps1` / `.psm1` code in
this repository. It does not override tier-1 SDK behaviour, binary module
C# patterns, or the section contract in `rules/_sections.md`. When the overlay
conflicts with tier-1 docs, document the discrepancy in the relevant rule's
`Source anchors` section and follow tier 1.

---

### Excluded sources

The following are out of scope for this skill and must not be used as primary
PowerShell cmdlet knowledge sources:

- **Generic PowerShell scripting docs** — `scripting/learn/`, `scripting/gallery/`,
  and tutorial content not under `developer/cmdlet/` or `developer/module/`.
  These address script authoring and end-user usage, not compiled cmdlet SDK.
- **Provider SDK** — `provider/` docs tree. PowerShell provider SDK is a
  separate surface; 10+ files, distinct API contract.
- **Extended Type System (ETS)** — `types.ps1xml`, script methods, format
  type data. Platform level, not cmdlet authoring.
- **Deep-dive help tooling** — PlatyPS generation workflows, MAML XML schema
  authoring, and `Update-Help` infrastructure. These are separate concerns.
  Basic help-block required sections (`.SYNOPSIS`, `.DESCRIPTION`, `.PARAMETER`,
  `.EXAMPLE`, `.OUTPUTS`, `.NOTES`) and `.OUTPUTS`/`[OutputType]` alignment ARE
  in scope via the documentation domain and the approved help docs source above;
  toolchain deep-dives and MAML file format details remain excluded.
- **Formatting** — `Format.ps1xml`, custom formatters, `Get-FormatData`. Platform
  feature, not part of the cmdlet authoring contract.
- **Hosting** — `InitialSessionState`, `Runspace` APIs, `PowerShell` class
  embedding. Distinct surface; embedding PowerShell is not compiled cmdlet work.
- **Advanced-function `.ps1` script patterns** — Any scripting tutorials,
  best-practice blog posts, or module-authoring guides focused on `.ps1`
  advanced functions are not primary sources. Only the four `about_` pages
  in the [tier-3 allow-list](#approved-advanced-function-topics-tier-3) are
  approved; all other script-oriented content is excluded.
- Any AI-generated summaries not grounded in the approved sources above.

---

### Maintenance notes

- **Add before using.** If a rule cites a source not in this file, add it here
  first with a rationale. No rule should be the first place a source appears.
- **Five-tier hierarchy.** Tier 1 (Microsoft Learn cmdlet/module docs + SMA API
  reference) wins over all others. Tier 2 (GitHub raw source) supplements tier 1
  only. Tier 3 (four approved `about_` pages) is a read-only dual-scope mirror.
  Tier 4 (local artifacts) drives structure, not SDK facts. Tier 5 (repo style
  overlay) refines code style and never overrides SDK behaviour.
- **Official docs win.** When learn.microsoft.com contradicts any local artifact,
  tier-3 mirror, or style overlay, the official page is correct.
- **Tier-3 additions are gated.** To approve additional `about_` pages, they must
  be added to the allow-list in this file with a documented rationale. Unlisted
  `about_` pages remain excluded.
- **No cross-skill contamination.** Keep compiled cmdlet decisions in this
  package. Pull broader C# or .NET guidance from `martix-dotnet-csharp` only
  when a rule explicitly annotates the cross-link.
- **Research memos.** When scoping a new rule domain, author a research memo
  using `templates/research-pack-template.md` and add it to the approved local
  artifacts table above before writing the rule.
- **Scaffold-only flag.** `metadata.json` carries `"scaffoldOnly": false` and
  `"scaffoldPhase": false` in `assets/taxonomy.json`. All 17 rule files are
  authored and all 11 reference maps are complete.
