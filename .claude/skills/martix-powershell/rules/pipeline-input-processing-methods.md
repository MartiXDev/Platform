# PowerShell pipeline — input processing methods

## Purpose

Protect the `BeginProcessing`, `ProcessRecord`, `EndProcessing`, and
`StopProcessing` override contract for compiled cmdlets. Each method has a
single, non-overlapping responsibility in the cmdlet lifecycle. Placing output,
resource acquisition, or pipeline-bound reads in the wrong method breaks
streaming, wastes memory, misreads parameter values, and leaks resources on
cancellation.

## Default guidance

### BeginProcessing

Override `BeginProcessing` for one-time initialization that must complete before
any pipeline object arrives: open connections, allocate expensive shared
resources, validate non-pipeline parameters, and establish shared state used
across all `ProcessRecord` calls.

`ValueFromPipeline` and `ValueFromPipelineByPropertyName` parameters hold their
**default values** in `BeginProcessing`, not the piped objects. The runtime has
not yet started delivering pipeline input at this point.

Always call `base.BeginProcessing()` as the first statement unless the SDK
documents that the base implementation is a no-op for your base class.

```csharp
protected override void BeginProcessing()
{
    base.BeginProcessing();
    _connection = OpenConnection(Server);
}
```

### ProcessRecord

Override `ProcessRecord` for the per-object handler. Every object entering the
pipeline triggers exactly one call. Read pipeline-bound parameter values here,
apply the cmdlet's primary logic, and call `WriteObject` for each output object.
`ProcessRecord` is the only method where pipeline streaming is possible because
objects are emitted and consumed incrementally.

```csharp
protected override void ProcessRecord()
{
    base.ProcessRecord();
    var result = _connection.Query(InputObject);
    WriteObject(result);
}
```

### EndProcessing

Override `EndProcessing` for post-processing that genuinely requires all input
to have been seen: statistical aggregates, sorted summaries, batch writes that
depend on the complete input set. Avoid buffering objects in `ProcessRecord` and
then flushing them in `EndProcessing` unless aggregation is the explicit purpose.

Always call `base.EndProcessing()` as the first statement.

```csharp
protected override void EndProcessing()
{
    base.EndProcessing();
    if (_buffer.Count > 0)
        WriteObject(_buffer, enumerateCollection: true);
}
```

### StopProcessing

Override `StopProcessing` when the cmdlet holds open connections, streams,
threads, or other resources that should be released on pipeline interruption
(Ctrl+C, `Select-Object -First N` exhaustion, or downstream early-exit). The
runtime calls `StopProcessing` instead of `EndProcessing` when the pipeline is
cancelled. A cmdlet that does not override `StopProcessing` leaks those
resources when the pipeline is interrupted.

Always call `base.StopProcessing()`.

```csharp
protected override void StopProcessing()
{
    base.StopProcessing();
    _cancellationSource?.Cancel();
    _connection?.Dispose();
}
```

### IDisposable integration

Implement `IDisposable` on any cmdlet that holds managed or unmanaged resources.
The PowerShell runtime calls `Dispose()` after the cmdlet finishes, regardless
of whether `EndProcessing` or `StopProcessing` was the terminal method. Use
`IDisposable` together with `StopProcessing` — do not rely on `EndProcessing`
alone for cleanup because it is skipped on cancellation.

```csharp
public sealed class GetWidgetCmdlet : PSCmdlet, IDisposable
{
    private Connection? _connection;

    protected override void BeginProcessing()
    {
        base.BeginProcessing();
        _connection = OpenConnection(Server);
    }

    protected override void StopProcessing()
    {
        base.StopProcessing();
        _connection?.Dispose();
    }

    public void Dispose()
    {
        _connection?.Dispose();
    }
}
```

### Advanced-function parity (tier-3 mirror)

`[CmdletBinding()]` advanced functions use `begin`, `process`, and `end` blocks
as script-level mirrors of `BeginProcessing`, `ProcessRecord`, and
`EndProcessing`. PowerShell 7.3 added a `clean` block that executes on both
normal completion and pipeline interruption, providing cleanup semantics similar
to `StopProcessing` and `IDisposable.Dispose` combined. The parity is
behaviorally close but not identical: compiled cmdlets have strongly typed
override signatures, full `PSCmdlet` method access, and deterministic
`IDisposable` support. See `doc-source-index.md` tier-3 allow-list for the
approved `about_Functions_Advanced_Methods` reference.

## Avoid

- Reading `ValueFromPipeline` or `ValueFromPipelineByPropertyName` parameters in
  `BeginProcessing` — they hold default values there, not the piped objects.
- Calling `WriteObject` in `BeginProcessing` for items that logically belong to
  per-pipeline-item processing — use `ProcessRecord` for per-item output.
- Collecting all input into a `List<T>` in `ProcessRecord` and emitting the
  whole list from `EndProcessing` when per-object streaming is possible —
  defeats streaming, increases peak memory, and delays the first result.
- Omitting `StopProcessing` on cmdlets that hold open connections, streams, or
  background operations — leaks resources on Ctrl+C and downstream early-exit.
- Omitting the `base.*` call in any overridden lifecycle method — may skip SDK
  lifecycle actions and is brittle against future base-class changes.
- Initializing state inside `ProcessRecord` that is needed by `BeginProcessing`
  — execution order guarantees that state is not ready.
- Performing expensive one-time operations (connection open, file open) inside
  `ProcessRecord` — they run once per pipeline object, not once per invocation.

## Review checklist

- [ ] `BeginProcessing` initializes one-time resources and validates
      non-pipeline parameters; it does not read pipeline-bound parameter values
      or call `WriteObject`.
- [ ] `ProcessRecord` handles all per-object logic; pipeline-bound parameter
      values are consumed here, and `WriteObject` is called for each output
      object.
- [ ] `ProcessRecord` does not buffer output into a list for deferred emission
      unless aggregation is the explicit purpose of the cmdlet.
- [ ] `EndProcessing` is used only for post-processing that requires all input
      to have been seen; it does not re-read pipeline-bound parameters.
- [ ] `StopProcessing` is overridden when the cmdlet holds open streams,
      connections, threads, or other cancellable resources.
- [ ] Every overridden lifecycle method calls its corresponding `base.*` method.
- [ ] Cmdlets holding resources implement `IDisposable`; cleanup logic runs in
      both `StopProcessing` and `Dispose`.

## Related files

- [Parameters — pipeline binding](./parameters-pipeline-binding.md)
- [Pipeline — output and streaming](./pipeline-output-streaming.md)
- [Pipeline map](../references/pipeline-map.md)

## Source anchors

- [Input processing methods](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/input-processing-methods)
- [Strongly encouraged development guidelines](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/strongly-encouraged-development-guidelines)
- [BeginProcessing](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.cmdlet.beginprocessing)
- [ProcessRecord](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.cmdlet.processrecord)
- [EndProcessing](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.cmdlet.endprocessing)
- [StopProcessing](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.cmdlet.stopprocessing)
- [about_Functions_Advanced_Methods — tier-3 begin/process/end/clean parity](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_functions_advanced_methods)
