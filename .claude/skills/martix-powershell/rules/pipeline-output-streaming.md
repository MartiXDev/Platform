# PowerShell pipeline — output and streaming

## Purpose

Protect `WriteObject` usage, object vs. text output decisions, null handling,
`OutputType` declaration accuracy, the `PassThru` pattern, and the separation of
the output pipeline from informational streams. Emitting formatted strings
instead of objects, writing `null`, or bypassing PowerShell streams with
`Console.WriteLine` breaks downstream pipeline consumers and prevents output
capture.

## Default guidance

### WriteObject — single object vs. collection enumeration

Use `WriteObject(obj)` to emit a single strongly typed object.

Use `WriteObject(collection, enumerateCollection: true)` to unwrap a collection
into individual pipeline objects. Each element is delivered to the pipeline
separately so that downstream `Where-Object`, `ForEach-Object`, `Select-Object`,
and assignment all receive individual items.

```csharp
// Single object
WriteObject(result);

// Unwrap collection — each element becomes a separate pipeline object
WriteObject(results, enumerateCollection: true);
```

Calling `WriteObject(collection)` **without** `enumerateCollection: true` emits
the entire collection as one opaque pipeline object. Downstream consumers cannot
iterate it with standard pipeline operators.

### Typed objects, not formatted strings

Always emit the object itself, not a pre-formatted string representation.
Downstream cmdlets, scripts, and operators (`Where-Object`, `Select-Object`,
`Export-Csv`, `ConvertTo-Json`) depend on property access on the emitted type.
Pre-formatted strings discard all structure.

```csharp
// Correct — emit the object
WriteObject(widget);

// Wrong — discards all properties
WriteObject($"Widget: {widget.Name}, Status: {widget.Status}");
```

### Null handling

Never pass `null` to `WriteObject`. Guard with a null check before emitting.
Emitting `$null` propagates a null into the pipeline where compiled downstream
cmdlets may dereference it without a guard, causing `NullReferenceException`.

```csharp
var result = Fetch(Id);
if (result is not null)
    WriteObject(result);
```

### OutputType declaration

Declare `[OutputType(typeof(T))]` on the cmdlet class. The declared type must
match the concrete type passed to `WriteObject`, not a base class or interface.
`OutputType` drives `Get-Command -OutputType` filtering, property tab-completion
in the shell, and IDE tooling. Declaring `object` or `PSObject` when the
concrete type is known eliminates all of these benefits.

```csharp
[Cmdlet(VerbsCommon.Get, "Widget")]
[OutputType(typeof(Widget))]
public sealed class GetWidgetCmdlet : PSCmdlet
{
    protected override void ProcessRecord()
    {
        base.ProcessRecord();
        WriteObject(new Widget(Name));   // matches [OutputType(typeof(Widget))]
    }
}
```

When a cmdlet emits multiple distinct types across parameter sets, declare one
`[OutputType]` per parameter set:

```csharp
[OutputType(typeof(Widget), ParameterSetName = new[] { "ByName" })]
[OutputType(typeof(WidgetSummary), ParameterSetName = new[] { "Summarize" })]
```

### Informational streams vs. the output pipeline

The PowerShell success stream (stream 1) is the only stream captured by
assignment (`$x = Get-Widget`) or redirection (`Get-Widget > file.txt`). Use
the named informational streams for all operational messages:

| Purpose | Method | Stream |
| --- | --- | --- |
| Detailed operational progress | `WriteVerbose(string)` | Verbose (stream 4) |
| Diagnostic internals | `WriteDebug(string)` | Debug (stream 5) |
| Non-fatal advisory | `WriteWarning(string)` | Warning (stream 3) |
| Structured operational events | `WriteInformation(object, string[])` | Information (stream 6) |

Never use `Console.WriteLine`, `Console.Write`, or
`[Console]::WriteLine` from within a cmdlet. These calls bypass all PowerShell
streams, cannot be redirected or captured, and break non-interactive execution.

### PassThru pattern

Action cmdlets — verbs such as `Set`, `Remove`, `Add`, `Update`, `Enable`,
`Disable` — must produce **no output by default**. This is the standard
PowerShell contract: action cmdlets are quiet unless `-PassThru` is specified.

Implement `PassThru` as a `[switch]` parameter. When present, emit the processed
object via `WriteObject`. When absent, produce no output.

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

The `PassThru` parameter name is reserved by the standard cmdlet parameter name
list. Use exactly `PassThru` (no hyphen, no alternative spelling).

### Streaming discipline

Emit objects from `ProcessRecord` as they are produced. Avoid buffering all
results into a `List<T>` in `ProcessRecord` and emitting from `EndProcessing`
unless the aggregation is the explicit purpose of the cmdlet (e.g., sorting,
grouping, statistical reduction). Streaming from `ProcessRecord` keeps pipeline
memory usage bounded and delivers the first result without waiting for all input.

## Avoid

- Passing `null` to `WriteObject` — guard with a null check before emitting.
- Calling `WriteObject(collection)` without `enumerateCollection: true` when
  individual items are expected downstream — emits the collection as a single
  opaque object.
- Emitting formatted strings (e.g., `$"Name: {obj.Name}, Id: {obj.Id}"`)
  instead of the typed object — discards all properties and breaks downstream
  processing.
- Using `Console.WriteLine`, `Console.Write`, `[Console]::Write`, or
  `System.Console` methods inside a cmdlet — bypasses all PowerShell streams,
  cannot be captured or redirected, and fails in non-interactive execution.
- Using `Write-Host` in an advanced function to emit data — `Write-Host` writes
  to the Information stream and is not captured by variable assignment or
  pipeline redirection; emit data with `Write-Output` or implicit output so
  callers can capture, pipe, and filter it.
- Declaring `[OutputType(typeof(object))]` or `[OutputType(typeof(PSObject))]`
  when a concrete type is known — erases tab-completion and IDE help.
- Emitting output from `Set-*`, `Remove-*`, `Add-*`, or other action cmdlets
  without a `-PassThru` switch — violates the quiet-by-default contract.
- Returning objects from `BeginProcessing` that belong to per-item processing —
  use `ProcessRecord` for per-item output.
- Buffering all input into a list in `ProcessRecord` and flushing in
  `EndProcessing` when per-object streaming is possible — defeats streaming and
  increases peak memory usage.

## Review checklist

- [ ] `WriteObject` emits a strongly typed object, not a pre-formatted string.
- [ ] `WriteObject(collection, enumerateCollection: true)` is used when a
      collection should be unwrapped into individual pipeline objects.
- [ ] `null` is never passed to `WriteObject`; a null guard is present before
      the call.
- [ ] `[OutputType(typeof(T))]` is declared and matches the concrete type
      emitted by `WriteObject`.
- [ ] Multiple-output-type cmdlets declare one `[OutputType]` per parameter set.
- [ ] Operational messages use `WriteVerbose`, `WriteDebug`, `WriteWarning`, or
      `WriteInformation` — `Console.WriteLine` and equivalent calls are absent.
- [ ] Action cmdlets (`Set-*`, `Remove-*`, `Add-*`, etc.) implement `PassThru`
      and produce no output by default.
- [ ] Objects are emitted from `ProcessRecord` per item; buffering into
      `EndProcessing` is justified only when aggregation is the explicit purpose.

## Related files

- [Pipeline — input processing methods](./pipeline-input-processing-methods.md)
- [Attributes and validators — OutputType](./attributes-validators-outputtype.md)
- [Pipeline map](../references/pipeline-map.md)

## Source anchors

- [Strongly encouraged development guidelines](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/strongly-encouraged-development-guidelines)
- [Advisory development guidelines](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/advisory-development-guidelines)
- [OutputType attribute declaration](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/outputtype-attribute-declaration)
- [Standard cmdlet parameter names and types](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/standard-cmdlet-parameter-names-and-types)
- [WriteObject method](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.cmdlet.writeobject)
- [WriteVerbose method](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.cmdlet.writeverbose)
- [WriteWarning method](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.cmdlet.writewarning)
- [OutputType attribute](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.outputtypeattribute)
