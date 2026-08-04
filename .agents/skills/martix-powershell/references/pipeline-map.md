# Pipeline map

## Purpose

Entry map for the pipeline workstream. Covers `BeginProcessing`,
`ProcessRecord`, `EndProcessing`, and `StopProcessing` override contract,
`IDisposable` integration, `WriteObject` streaming semantics, null handling,
output stream selection, `OutputType` declaration, and the `PassThru` pattern
for action cmdlets.

---

## Lifecycle method decision table

| Method | Override when | Key constraint |
| --- | --- | --- |
| `BeginProcessing` | Opening connections, allocating shared resources, validating non-pipeline parameters | `ValueFromPipeline` parameters hold **default values** here — piped objects have not arrived |
| `ProcessRecord` | Always when any parameter carries `ValueFromPipeline` or `ValueFromPipelineByPropertyName`; for all per-object logic | Pipeline streaming happens here; `WriteObject` emits individual results |
| `EndProcessing` | Post-processing that genuinely requires all input (aggregates, sorts, batch writes) | Do not buffer `ProcessRecord` output here unless aggregation is the explicit purpose |
| `StopProcessing` | When the cmdlet holds open connections, streams, threads, or other cancellable resources | Called instead of `EndProcessing` on pipeline cancellation (Ctrl+C, downstream early-exit) |

**Always call `base.*()` as the first statement** in every overridden lifecycle
method.

---

## `IDisposable` integration

Implement `IDisposable` on any cmdlet that holds managed or unmanaged
resources. The runtime calls `Dispose()` after the cmdlet finishes, regardless
of whether `EndProcessing` or `StopProcessing` was the terminal method. Use
`IDisposable` together with `StopProcessing` — `EndProcessing` alone is
insufficient because it is skipped on cancellation.

---

## `WriteObject` usage

| Call form | Effect |
| --- | --- |
| `WriteObject(obj)` | Emits one object to the pipeline |
| `WriteObject(collection, enumerateCollection: true)` | Unwraps the collection; each element arrives as a separate pipeline object — use this to support `Where-Object`, `Select-Object`, etc. |
| `WriteObject(collection)` (**without** `enumerateCollection: true`) | Emits the entire collection as one opaque object — downstream operators cannot iterate it |

**Never pass `null` to `WriteObject`.** Guard with a null check before calling.
Emitting `$null` propagates into the pipeline where compiled downstream cmdlets
may dereference it without a guard.

---

## Output stream selection

| Purpose | Method | Stream number |
| --- | --- | --- |
| Structured output (captured by `$x = ...`, redirection, `Export-Csv`, etc.) | `WriteObject` | 1 (Success) |
| Non-fatal advisory | `WriteWarning(string)` | 3 |
| Detailed operational progress | `WriteVerbose(string)` | 4 |
| Diagnostic internals | `WriteDebug(string)` | 5 |
| Structured operational events | `WriteInformation(object, string[])` | 6 |

**Never use `Console.WriteLine`, `Console.Write`, or `[Console]::WriteLine`
inside a cmdlet.** These calls bypass all PowerShell streams, cannot be
redirected or captured, and break non-interactive execution.

---

## `OutputType` declaration

Declare `[OutputType(typeof(T))]` on the cmdlet class. The declared type must
match the **concrete type** passed to `WriteObject` — not a base class or
interface. `object` or `PSObject` erases tab completion and IDE property
inference.

When a cmdlet emits different types across parameter sets:

```csharp
[OutputType(typeof(Widget), ParameterSetName = new[] { "ByName" })]
[OutputType(typeof(WidgetSummary), ParameterSetName = new[] { "Summarize" })]
```

---

## `PassThru` pattern for action cmdlets

Action cmdlets (`Set-*`, `Remove-*`, `Add-*`, `Update-*`, `Enable-*`,
`Disable-*`) produce **no output by default**. Implement `PassThru` as a
`[switch]` parameter:

```csharp
[Parameter]
public SwitchParameter PassThru { get; set; }

protected override void ProcessRecord()
{
    base.ProcessRecord();
    _service.Update(InputObject);
    if (PassThru.IsPresent)
        WriteObject(InputObject);
}
```

The parameter name `PassThru` is reserved by the standard parameter name list.
Do not rename it or add hyphens.

---

## Streaming discipline

Emit objects from `ProcessRecord` as they are produced. Buffering into a
`List<T>` in `ProcessRecord` and emitting from `EndProcessing` is acceptable
only when the algorithm genuinely requires all records (sorting, grouping,
statistical reduction). Premature buffering defeats streaming, increases peak
memory, and delays the first result visible to downstream operators.

---

## Advanced-function parity (tier-3 mirror)

`begin`, `process`, `end` in `[CmdletBinding()]` scripts mirror
`BeginProcessing`, `ProcessRecord`, `EndProcessing`. PowerShell 7.3 added
`clean` for cleanup on both normal and cancelled completion (analogous to
`StopProcessing` + `IDisposable.Dispose` combined). Compiled cmdlets have
strongly typed overrides, full `PSCmdlet` method access, and deterministic
`IDisposable` support. See
[`doc-source-index.md` tier-3 allow-list](./doc-source-index.md#approved-advanced-function-topics-tier-3)
for the approved `about_Functions_Advanced_Methods` reference.

---

## Rule coverage

| Rule file | Topics |
| --- | --- |
| [`rules/pipeline-input-processing-methods.md`](../rules/pipeline-input-processing-methods.md) | `BeginProcessing` / `ProcessRecord` / `EndProcessing` / `StopProcessing` override contract, `IDisposable`, base call requirement |
| [`rules/pipeline-output-streaming.md`](../rules/pipeline-output-streaming.md) | `WriteObject` single vs. enumerated, null guard, typed objects vs. strings, output stream selection, `OutputType`, `PassThru` pattern, streaming discipline |

---

## Related files

- [Pipeline — input processing methods rule](../rules/pipeline-input-processing-methods.md)
- [Pipeline — output and streaming rule](../rules/pipeline-output-streaming.md)
- [Parameters — pipeline binding rule](../rules/parameters-pipeline-binding.md) — binding flags that feed into pipeline methods
- [Parameters and validation map](./parameters-validation-map.md)
- [Attributes and validators map](./attributes-validators-map.md) — `[OutputType]` declaration
- [Source index and guardrails](./doc-source-index.md)

## Source anchors

- [Input processing methods](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/input-processing-methods)
- [Strongly encouraged development guidelines](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/strongly-encouraged-development-guidelines)
- [Advisory development guidelines](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/advisory-development-guidelines)
- [OutputType attribute declaration](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/outputtype-attribute-declaration)
- [WriteObject method](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.cmdlet.writeobject)
- [BeginProcessing](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.cmdlet.beginprocessing)
- [ProcessRecord](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.cmdlet.processrecord)
- [EndProcessing](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.cmdlet.endprocessing)
- [StopProcessing](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.cmdlet.stopprocessing)
- [about_Functions_Advanced_Methods (tier-3 mirror)](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_functions_advanced_methods)
