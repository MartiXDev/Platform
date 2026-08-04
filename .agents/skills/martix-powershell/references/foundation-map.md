# Foundation map

## Purpose

Entry map for the foundation workstream. Foundation covers base class selection
(`Cmdlet` vs `PSCmdlet`), `[Cmdlet]` attribute declaration, `OutputType`,
`SupportsShouldProcess` / `SupportsTransactions` flags, assembly structure,
project file configuration, `.psd1` module manifest, and `Import-Module`
wiring for binary cmdlet modules.

---

## Base class selection

| Choose | When |
| --- | --- |
| `PSCmdlet` (default) | Always, unless the cmdlet is intentionally stripped of confirmation, session state, progress, and host access |
| `Cmdlet` | Only when none of `ShouldProcess`, `ShouldContinue`, `SessionState`, `InvokeCommand`, `Host`, `WriteProgress`, or `TransactionContext` are needed, and the cmdlet will never be extended to use them; document the reason in a code comment |

**Why:** `Cmdlet` does not expose `ShouldProcess`; calling it on a `Cmdlet`
subclass fails to compile. Deriving from `PSCmdlet` is zero-cost and protects
against future requirements.

---

## `[Cmdlet]` attribute flags

| Flag | When to set |
| --- | --- |
| `SupportsShouldProcess = true` | When and only when `ProcessRecord` calls `ShouldProcess` or `ShouldContinue`. The flag must agree with the call; the flag without a call wastes `-WhatIf` and `-Confirm` parameters; the call without the flag throws at runtime. |
| `SupportsTransactions = true` | Only when the cmdlet enlists in a PowerShell transaction via `TransactionContext.CurrentPSTransaction`. Sets are rare; the flag adds `-UseTransaction` to the cmdlet. |
| `DefaultParameterSetName` | Required when the cmdlet declares multiple parameter sets; value must exactly match one declared `ParameterSetName`. |
| `ConfirmImpact` | Set alongside `SupportsShouldProcess = true` to control automatic prompt thresholds. |

---

## Minimum cmdlet declaration pattern

```csharp
[Cmdlet(VerbsCommon.Get, "Widget")]          // typed verb constant, PascalCase singular noun
[OutputType(typeof(Widget))]                  // concrete type, not base class/interface
public sealed class GetWidgetCommand : PSCmdlet
{
    protected override void ProcessRecord()
    {
        base.ProcessRecord();
        WriteObject(new Widget(Name));
    }
}
```

Rules enforced by this pattern:

- Verb is a typed constant from `VerbsCommon` (or another `Verbs*` class) —
  validated at compile time, produces no module-import warning.
- Noun is PascalCase and singular.
- Class name follows `{Verb}{Noun}Command` convention.
- Class is `sealed`.
- `[OutputType]` declares the concrete type.

---

## TargetFramework selection

| Minimum PowerShell version | Recommended `TargetFramework` |
| --- | --- |
| PowerShell 7.4+ | `net8.0` |
| PowerShell 7.2 | `net6.0` |
| Windows PowerShell 5.1 only | `net472` or `net48` |
| Both Windows PowerShell and PS 7+ | `<TargetFrameworks>net8.0;net472</TargetFrameworks>` |

**SMA reference strategy** — Never bundle `System.Management.Automation.dll`
in publish output. Use one of:

- `PowerShellStandard.Library` (cross-version compile target): `PrivateAssets="all"`
- `Microsoft.PowerShell.SDK` (full SDK for a specific version): `PrivateAssets="all"`

---

## `.psd1` manifest required fields

| Field | Requirement |
| --- | --- |
| `RootModule` | Path to the compiled DLL (e.g., `'MyModule.dll'`); relative to the manifest |
| `ModuleVersion` | Semantic version string (e.g., `'1.0.0'`) |
| `GUID` | A unique module GUID; generate once and do not change |
| `Author` | Module author name |
| `Description` | Human-readable module description |
| `PowerShellVersion` | Minimum compatible PS version (e.g., `'7.2'`) |
| `CmdletsToExport` | Explicit array of exported cmdlet names — never `'*'` in production |
| `FunctionsToExport` | Set to `@()` (empty) for binary-only modules |
| `AliasesToExport` | Set to `@()` unless aliases are exported |
| `VariablesToExport` | Set to `@()` unless variables are exported |

---

## Rule coverage

| Rule file | Topics |
| --- | --- |
| [`rules/foundation-base-class-attribute.md`](../rules/foundation-base-class-attribute.md) | `Cmdlet` vs `PSCmdlet`, `[Cmdlet]` attribute, verb constants, `SupportsShouldProcess`, `SupportsTransactions`, `[OutputType]`, class naming and `sealed` modifier |
| [`rules/foundation-project-module-shape.md`](../rules/foundation-project-module-shape.md) | `TargetFramework`, SMA reference strategy (`PrivateAssets="all"`), DLL naming, `.psd1` manifest fields, `Import-Module` testing pattern |

---

## Related files

- [Foundation — base class and attribute rule](../rules/foundation-base-class-attribute.md)
- [Foundation — project and module shape rule](../rules/foundation-project-module-shape.md)
- [Confirmation and safety map](./confirmation-safety-map.md) — `SupportsShouldProcess` flag wiring
- [Attributes and validators map](./attributes-validators-map.md) — `[OutputType]` patterns and approved verbs
- [Source index and guardrails](./doc-source-index.md)

## Source anchors

- [Cmdlet overview](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/cmdlet-overview)
- [Cmdlet class declaration](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/cmdlet-class-declaration)
- [Writing a simple cmdlet](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/how-to-write-a-simple-cmdlet)
- [Writing a binary module](https://learn.microsoft.com/en-us/powershell/scripting/developer/module/how-to-write-a-powershell-binary-module)
- [Module manifest overview](https://learn.microsoft.com/en-us/powershell/scripting/developer/module/how-to-write-a-powershell-module-manifest)
- [Strongly encouraged development guidelines](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/strongly-encouraged-development-guidelines)
- [OutputType attribute declaration](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/outputtype-attribute-declaration)
- [PSCmdlet class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.pscmdlet)
- [Cmdlet class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.cmdlet)
- [CmdletAttribute class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.cmdletattribute)
