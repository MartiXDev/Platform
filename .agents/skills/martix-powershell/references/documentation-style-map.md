# Documentation and style map

## Purpose

Entry map for the documentation, help, and style workstream. Covers
comment-based help block structure and required sections for advanced
functions, MAML help for compiled cmdlets, `.OUTPUTS`/`[OutputType]`
alignment, script-body alias avoidance, `Read-Host` prohibition, `Write-Host`
stream semantics, and the Tier-5 repo style overlay pointer.

---

## Help block required sections

Both advanced functions and compiled cmdlets must expose the following help
sections. For advanced functions these live in the `<# ... #>` comment block;
for compiled cmdlets they are authored in the PlatyPS Markdown source that
generates the companion MAML file.

| Section | Required | Content |
| --- | --- | --- |
| `.SYNOPSIS` | Yes | Single-line description |
| `.DESCRIPTION` | Yes | Full explanation; multi-line encouraged |
| `.PARAMETER <Name>` | One per public parameter | Per-parameter description; valid values and defaults |
| `.EXAMPLE` | At least one | Working command with expected output |
| `.OUTPUTS` | Yes | Concrete type name and brief description |
| `.NOTES` | Yes | Author, version, change history |
| `.INPUTS` | Optional | Pipeline-accepted type |
| `.LINK` | Optional | Related topic URLs |

---

## `.OUTPUTS` and `[OutputType]` alignment

The `.OUTPUTS` help-block text and the `[OutputType]` attribute must declare
the same concrete type. Mismatches between the two break IDE property
inference and `Get-Help -Full` output.

| Surface | Attribute form | Help section |
| --- | --- | --- |
| Compiled cmdlet (C#) | `[OutputType(typeof(Widget))]` on the class | `.OUTPUTS` in MAML/PlatyPS Markdown |
| Advanced function (PS) | `[OutputType([Widget])]` in the function header | `.OUTPUTS` in the `<# ... #>` block |

**Antipatterns:**

- `[OutputType([object])]` or `[OutputType([PSObject])]` — erases IDE
  inference; declare the concrete type.
- Omitting `[OutputType]` entirely — degrades pipeline discoverability even
  when the function runs correctly.
- `.OUTPUTS` listing a different type than `[OutputType]` — misleads
  `Get-Help` and IDE tooling.

See
[attributes-validators-outputtype.md](../rules/attributes-validators-outputtype.md)
for the full `[OutputType]` declaration guidance.

---

## Script-body alias quick reference

Use full cmdlet names in all `.ps1` and `.psm1` file bodies. Interactive-shell
short forms are not acceptable in script files.

| Alias / short form | Required script-body form |
| --- | --- |
| `?`, `where` | `Where-Object` |
| `%`, `foreach` | `ForEach-Object` |
| `ls`, `dir`, `gci` | `Get-ChildItem` |
| `select` | `Select-Object` |
| `sort` | `Sort-Object` |
| `ft` | `Format-Table` |
| `fl` | `Format-List` |
| `echo` | `Write-Output` |
| `cat` | `Get-Content` |

Also use explicit named parameters (`-Name value`) throughout; avoid
positional argument shorthand.

---

## Output stream guidance

| What to emit | Script mechanism | Compiled mechanism |
| --- | --- | --- |
| Pipeline data (objects) | `Write-Output` | `WriteObject` |
| Diagnostic trace | `Write-Verbose` | `WriteVerbose` |
| Status information | `Write-Information` | `WriteInformation` |
| Recoverable condition | `Write-Warning` | `WriteWarning` |
| Non-terminating error | `Write-Error` | `WriteError` |
| Terminating error | `$PSCmdlet.ThrowTerminatingError` | `$PSCmdlet.ThrowTerminatingError` |
| Direct UI text only | `Write-Host` | `Host.UI.Write*` |

`Write-Host` bypasses all streams; downstream `Out-File`, assignment, and
`Tee-Object` receive nothing. Use it only for console decoration that
automation is not expected to capture.

`Read-Host` is prohibited in all function and script bodies — it blocks
non-interactive consumers. All required input must arrive through declared
parameters.

---

## Tier-5 repo style overlay

For `.ps1` / `.psm1` files generated or maintained in this repository, apply
the project-specific conventions defined in the Tier-5 style overlay:

| File | Scope | Governs |
| --- | --- | --- |
| `.github/instructions/powershell.instructions.md` | `**/*.ps1`, `**/*.psm1` | Naming (Verb-Noun PascalCase, singular nouns, no aliases), variable casing, `[CmdletBinding()]` structural layout, `ShouldProcess` call style |

The overlay refines generated script-body code but never overrides tier-1
through tier-4 SDK facts. See
[Source index and guardrails](./doc-source-index.md) for the full tier
hierarchy.

---

## Rule coverage

| Rule file | Topics |
| --- | --- |
| [`rules/documentation-help-style.md`](../rules/documentation-help-style.md) | Comment-based help required sections, `.OUTPUTS`/`[OutputType]` alignment, alias avoidance, `Read-Host` prohibition, `Write-Host` scope, Tier-5 style overlay pointer |

---

## Related files

- [Documentation, help, and style rule](../rules/documentation-help-style.md)
- [Attributes and validators map](./attributes-validators-map.md) — `[OutputType]` patterns and validation
- [Pipeline map](./pipeline-map.md) — `WriteObject` and output stream selection
- [Error handling and categories map](./error-handling-categories-map.md) — error stream routing
- [Cookbook index — comment-based help section](./cookbook-index.md)
- [Source index and guardrails](./doc-source-index.md) — source tier hierarchy and Tier-5 overlay scope

## Source anchors

- [Writing help for Windows PowerShell cmdlets](https://learn.microsoft.com/en-us/powershell/scripting/developer/help/writing-help-for-windows-powershell-cmdlets)
- [OutputType attribute declaration](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/outputtype-attribute-declaration)
- [Strongly encouraged development guidelines](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/strongly-encouraged-development-guidelines)
- [Advisory development guidelines](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/advisory-development-guidelines)
- [about_Functions_Advanced](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_functions_advanced)
- [OutputType attribute (.NET API reference)](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.outputtypeattribute)
- [PlatyPS help authoring tool](https://github.com/PowerShell/platyPS)
