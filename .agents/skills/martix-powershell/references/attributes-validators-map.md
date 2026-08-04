# Attributes and validators map

## Purpose

Entry map for the attributes and validators workstream. Covers the full
validation attribute palette and selection guidance, `OutputType` declaration
patterns, and approved verb selection. Cross-references the parameters domain
for stacking order and the pipeline domain for `OutputType` accuracy.

## Validation attribute selection guide

Apply validation attributes **above** the `[Parameter]` block in the order
listed below (loosest to tightest). See the stacking order rule in
[`parameters-declaration-validation.md`](../rules/parameters-declaration-validation.md).

| Constraint type | Preferred attribute | Tab completion | Notes |
| --- | --- | --- | --- |
| Reject null only | `[ValidateNotNull]` | N/A | `null` invalid; empty string acceptable |
| Reject null and empty | `[ValidateNotNullOrEmpty]` | N/A | Default guard for strings and collections; always stack first |
| Numeric / date bounds | `[ValidateRange(min, max)]` | N/A | Covers `int`, `long`, `double`, `DateTime` |
| String length bounds | `[ValidateLength(min, max)]` | N/A | Bounds `string.Length` before other constraints run |
| Collection element count | `[ValidateCount(min, max)]` | N/A | Bounds array `Length` before processing |
| String format (regex) | `[ValidatePattern("regex")]` | N/A | Combine with `ValidateNotNullOrEmpty`; regex applied to the string value |
| Enumerated string values | `[ValidateSet("A", "B", "C")]` | ✅ Enables tab completion | Always prefer over `ValidateScript` for fixed value sets |
| Custom logic | `[ValidateScript({ ... })]` | ❌ No tab completion | Last resort only; slower than static attributes; use when no simpler attribute fits; comment the rationale |

**Antipatterns:**

- Using `[ValidateScript]` when `[ValidateSet]`, `[ValidateRange]`, or
  `[ValidatePattern]` fits — disables tab completion and runs slower.
- Stacking `[ValidateNotNullOrEmpty]` after a range or set constraint — the
  null guard must run first so later constraints receive a valid value.
- Stacking contradictory attributes (e.g., `[ValidateRange(1, 5)]` and
  `[ValidateRange(3, 10)]`) — both run independently; combine into a single
  attribute.

---

## `OutputType` declaration patterns

Always declare `[OutputType(typeof(T))]` on the cmdlet class. The declared type
must match the **concrete type** passed to `WriteObject`, not a base class or
interface. `object` and `PSObject` are antipatterns that erase tab completion
and IDE property inference.

```csharp
// Single output type
[Cmdlet(VerbsCommon.Get, "Widget")]
[OutputType(typeof(Widget))]
public sealed class GetWidgetCommand : PSCmdlet { ... }

// Multiple types by parameter set
[OutputType(typeof(Widget),        ParameterSetName = new[] { "ByName" })]
[OutputType(typeof(WidgetSummary), ParameterSetName = new[] { "Summarize" })]
public sealed class GetWidgetCommand : PSCmdlet { ... }

// Action cmdlet with no default output — PassThru emits the modified object
[Cmdlet(VerbsCommon.Set, "Widget", SupportsShouldProcess = true)]
[OutputType(typeof(Widget))]        // only emitted when -PassThru is present
public sealed class SetWidgetCommand : PSCmdlet { ... }
```

---

## Approved verb groups reference

Select the verb that most closely matches the operation's semantic within the
correct group before falling back to `VerbsOther`:

| Group class | Representative verbs | Use for |
| --- | --- | --- |
| `VerbsCommon` | `Get`, `Set`, `New`, `Remove`, `Add`, `Clear`, `Copy`, `Enter`, `Exit`, `Find`, `Format`, `Hide`, `Join`, `Lock`, `Move`, `Open`, `Optimize`, `Push`, `Pop`, `Redo`, `Rename`, `Reset`, `Resize`, `Search`, `Select`, `Show`, `Skip`, `Split`, `Step`, `Switch`, `Undo`, `Unlock`, `Watch` | General cross-domain operations |
| `VerbsData` | `Backup`, `Checkpoint`, `Compare`, `Compress`, `Convert`, `ConvertFrom`, `ConvertTo`, `Dismount`, `Edit`, `Expand`, `Export`, `Group`, `Import`, `Initialize`, `Limit`, `Merge`, `Mount`, `Out`, `Publish`, `Restore`, `Save`, `Sync`, `Unpublish`, `Update` | Data manipulation and storage |
| `VerbsDiagnostic` | `Debug`, `Measure`, `Ping`, `Repair`, `Resolve`, `Test`, `Trace` | Diagnostics and validation |
| `VerbsLifecycle` | `Approve`, `Assert`, `Build`, `Complete`, `Confirm`, `Deny`, `Deploy`, `Disable`, `Enable`, `Install`, `Invoke`, `Register`, `Request`, `Restart`, `Resume`, `Start`, `Stop`, `Submit`, `Suspend`, `Uninstall`, `Unregister`, `Wait` | Lifecycle management |
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
| Verify a condition | `VerbsDiagnostic.Test` |
| Convert format or type | `VerbsData.ConvertTo` / `VerbsData.ConvertFrom` |

Always use a typed constant (`VerbsCommon.Get`) — never a string literal.
String literals are not validated at compile time and pass non-approved verbs
silently through to a module-import warning.

---

## Rule coverage

| Rule file | Topics |
| --- | --- |
| [`rules/attributes-validators-outputtype.md`](../rules/attributes-validators-outputtype.md) | Full validation attribute palette with stacking order, `OutputType` declaration patterns, approved verb compliance check |
| [`rules/parameters-declaration-validation.md`](../rules/parameters-declaration-validation.md) | Validation attribute selection, stacking order, attribute-per-constraint table |
| [`rules/naming-approved-verbs-cmdlet-contract.md`](../rules/naming-approved-verbs-cmdlet-contract.md) | Approved verb groups, paired inverse verbs, vendor noun prefix, `Get-Verb` verification — see [Naming map](./naming-map.md) |
| [`rules/pipeline-output-streaming.md`](../rules/pipeline-output-streaming.md) | `OutputType` accuracy requirement, concrete vs. base class declaration |

---

## Related files

- [Attributes and validators rule](../rules/attributes-validators-outputtype.md)
- [Parameters — declaration and validation rule](../rules/parameters-declaration-validation.md)
- [Naming — approved verbs and cmdlet name contract rule](../rules/naming-approved-verbs-cmdlet-contract.md)
- [Pipeline — output and streaming rule](../rules/pipeline-output-streaming.md)
- [Parameters and validation map](./parameters-validation-map.md) — stacking order and standard names
- [Pipeline map](./pipeline-map.md) — `OutputType` and `WriteObject` relationship
- [Source index and guardrails](./doc-source-index.md)

## Source anchors

- [Validating parameter input](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/validating-parameter-input)
- [OutputType attribute declaration](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/outputtype-attribute-declaration)
- [Approved verbs for PowerShell commands](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/approved-verbs-for-windows-powershell-commands)
- [Strongly encouraged development guidelines](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/strongly-encouraged-development-guidelines)
- [ValidateSetAttribute class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.validatesetattribute)
- [ValidateRangeAttribute class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.validaterangeattribute)
- [ValidatePatternAttribute class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.validatepatternattribute)
- [ValidateScriptAttribute class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.validatescriptattribute)
- [ValidateLengthAttribute class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.validatelengthattribute)
- [ValidateCountAttribute class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.validatecountattribute)
- [ValidateNotNullAttribute class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.validatenotnullattribute)
- [ValidateNotNullOrEmptyAttribute class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.validatenotnulloremptyattribute)
- [OutputTypeAttribute class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.outputtypeattribute)
