# Naming and conventions map

## Purpose

Entry map for the naming workstream. Covers approved verb selection from typed
`Verbs*` constants, verb group semantics, paired inverse verb patterns, vendor
noun prefix conventions, the standard parameter name table, common parameter
injection rules, and the `[Credential]` attribute pattern. Cross-references
the foundation domain for `[Cmdlet]` attribute declaration and the parameters
domain for validation and binding.

---

## Approved verb groups quick reference

Select the verb that most closely matches the operation's semantic within the
correct group. Use typed `Verbs*` constants — never string literals.

| Group class | Representative verbs | Use for |
| --- | --- | --- |
| `VerbsCommon` | `Get`, `Set`, `New`, `Remove`, `Add`, `Clear`, `Copy`, `Format`, `Move`, `Rename`, `Search`, `Select`, `Split` | General cross-domain operations |
| `VerbsData` | `Backup`, `Compare`, `Compress`, `ConvertFrom`, `ConvertTo`, `Export`, `Import`, `Initialize`, `Merge`, `Restore`, `Save`, `Sync`, `Update` | Data manipulation and storage |
| `VerbsDiagnostic` | `Debug`, `Measure`, `Repair`, `Resolve`, `Test`, `Trace` | Diagnostics and validation |
| `VerbsLifecycle` | `Approve`, `Build`, `Complete`, `Deploy`, `Disable`, `Enable`, `Install`, `Invoke`, `Register`, `Restart`, `Resume`, `Start`, `Stop`, `Suspend`, `Uninstall`, `Unregister`, `Wait` | Lifecycle management |
| `VerbsCommunications` | `Connect`, `Disconnect`, `Read`, `Receive`, `Send`, `Write` | Communication operations |
| `VerbsSecurity` | `Block`, `Grant`, `Protect`, `Revoke`, `Unblock`, `Unprotect` | Security operations |
| `VerbsOther` | `Use` | Last resort — only when no specific group applies |

**Decision hierarchy:**

| Intent | Preferred verb |
| --- | --- |
| Read without side effects | `VerbsCommon.Get` |
| Overwrite existing state | `VerbsCommon.Set` |
| Create a new resource | `VerbsCommon.New` |
| Delete a resource | `VerbsCommon.Remove` |
| Execute an action or script | `VerbsLifecycle.Invoke` |
| Start a long-running process | `VerbsLifecycle.Start` |
| Stop a running process | `VerbsLifecycle.Stop` |
| Verify a condition | `VerbsDiagnostic.Test` |
| Convert format or type | `VerbsData.ConvertTo` / `VerbsData.ConvertFrom` |

Always use a typed constant (`VerbsCommon.Get`) — never a string literal.
String literals are not validated at compile time and pass non-approved verbs
silently through to a module-import warning.

---

## Standard parameter names (most common)

| Standard name | .NET type | Semantics |
| --- | --- | --- |
| `Path` | `string[]` | File-system path; supports wildcards |
| `LiteralPath` | `string[]` | File-system path; no wildcard expansion; alias `PSPath` |
| `Name` | `string` | Name of a resource or item |
| `InputObject` | `PSObject` (or concrete type) | Object accepted from the pipeline |
| `Force` | `SwitchParameter` | Override restrictions, prompts, or read-only checks |
| `PassThru` | `SwitchParameter` | Return the processed object; action cmdlets are quiet by default |
| `Credential` | `PSCredential` | Authentication credential; pair with `[Credential]` attribute |
| `Recurse` | `SwitchParameter` | Process child containers recursively |
| `Filter` | `string` | Provider-supplied wildcard filter |
| `Include` | `string[]` | Wildcard patterns specifying items to include |
| `Exclude` | `string[]` | Wildcard patterns specifying items to exclude |
| `ComputerName` | `string[]` | Remote target; aliases `CN`, `MachineName` |

Full list: [Standard cmdlet parameter names and types](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/standard-cmdlet-parameter-names-and-types).

---

## Common parameter injection list

PowerShell injects the following parameters automatically when the cmdlet
derives from `PSCmdlet` or carries `[CmdletBinding()]`. **Never declare these
as explicit properties** — doing so causes a runtime startup error.

`Verbose`, `Debug`, `ErrorAction`, `ErrorVariable`, `WarningAction`,
`WarningVariable`, `OutBuffer`, `OutVariable`, `PipelineVariable`,
`InformationAction`, `InformationVariable`, `WhatIf`, `Confirm`

---

## Rule coverage

| Rule file | Topics |
| --- | --- |
| [`rules/naming-approved-verbs-cmdlet-contract.md`](../rules/naming-approved-verbs-cmdlet-contract.md) | Approved verb group selection, typed `Verbs*` constants vs. string literals, paired inverse verbs (`Add`/`Remove`, `Start`/`Stop`), vendor noun prefix, `Get-Verb` verification |
| [`rules/naming-parameter-and-common-names.md`](../rules/naming-parameter-and-common-names.md) | Standard parameter name table, PascalCase naming, singular nouns, `[Credential]` attribute pattern, `LiteralPath`/`PSPath` alias convention, `HelpMessage` requirement, common parameter injection list |

---

## Related files

- [Naming — approved verbs and cmdlet name contract rule](../rules/naming-approved-verbs-cmdlet-contract.md)
- [Naming — parameter and common names rule](../rules/naming-parameter-and-common-names.md)
- [Foundation — base class and attribute rule](../rules/foundation-base-class-attribute.md) — `[Cmdlet]` attribute declaration
- [Parameters and validation map](./parameters-validation-map.md) — validation attribute selection and pipeline binding
- [Attributes and validators map](./attributes-validators-map.md) — `OutputType` and verb compliance
- [Source index and guardrails](./doc-source-index.md)

## Source anchors

- [Approved verbs for PowerShell commands](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/approved-verbs-for-windows-powershell-commands)
- [Standard cmdlet parameter names and types](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/standard-cmdlet-parameter-names-and-types)
- [Cmdlet class declaration](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/cmdlet-class-declaration)
- [Strongly encouraged development guidelines](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/strongly-encouraged-development-guidelines)
- [Advisory development guidelines](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/advisory-development-guidelines)
- [VerbsCommon class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.verbscommon)
- [VerbsData class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.verbsdata)
- [VerbsDiagnostic class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.verbsdiagnostic)
- [VerbsLifecycle class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.verbslifecycle)
- [VerbsCommunications class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.verbscommunications)
- [VerbsSecurity class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.verbssecurity)
- [CredentialAttribute class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.credentialattribute)
- [PSCredential class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.pscredential)
- [AliasAttribute class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.aliasattribute)
- [about_CommonParameters](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_commonparameters)
