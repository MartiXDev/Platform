# PowerShell error handling — terminating and non-terminating

## Purpose

Protect the terminating vs. non-terminating error classification decision. The
classification determines whether the pipeline continues after an error and
whether `$?`, `$Error`, and error stream metadata reach callers correctly.
Using raw `throw` or the wrong method loses the `ErrorRecord` and breaks
pipeline behavior for both interactive sessions and automation callers.

## Default guidance

### Classification decision tree

Choose the error path based on whether the current record fails or the cmdlet
cannot continue at all:

- **Non-terminating** — one input record failed but the pipeline can continue
  with remaining records. Call `WriteError(errorRecord)`. Example: one file
  in a piped set does not exist.
- **Terminating** — the cmdlet cannot process any more records in this
  invocation (required resource unavailable, precondition check failed, fatal
  internal error). Call `ThrowTerminatingError(errorRecord)`.

### Idiomatic method call pattern — compiled cmdlets

Both methods are available on `Cmdlet` (the base class), so they are called
directly in a compiled cmdlet. Always pass a fully constructed `ErrorRecord`
to both:

```csharp
// Non-terminating: one record failed, pipeline continues
protected override void ProcessRecord()
{
    try
    {
        // ...
    }
    catch (FileNotFoundException ex)
    {
        WriteError(new ErrorRecord(
            ex,
            "Get-Resource.FileNotFound",
            ErrorCategory.ObjectNotFound,
            _path));
    }
}

// Terminating: cmdlet cannot continue
protected override void BeginProcessing()
{
    if (!_requiredService.IsAvailable)
    {
        ThrowTerminatingError(new ErrorRecord(
            new InvalidOperationException("Required service is unavailable."),
            "Connect-Service.ServiceUnavailable",
            ErrorCategory.ResourceUnavailable,
            _serviceEndpoint));
    }
}
```

### Advanced-function overlap (tier-3 mirror)

In a `[CmdletBinding()]` advanced function `$PSCmdlet` exposes the same two
methods. The call form changes but the classification rule is identical:

```powershell
# Non-terminating
$PSCmdlet.WriteError([System.Management.Automation.ErrorRecord]::new(
    [System.IO.FileNotFoundException]::new("File not found: $Path"),
    'Get-Resource.FileNotFound',
    [System.Management.Automation.ErrorCategory]::ObjectNotFound,
    $Path
))

# Terminating
$PSCmdlet.ThrowTerminatingError([System.Management.Automation.ErrorRecord]::new(
    [System.InvalidOperationException]::new('Required service is unavailable.'),
    'Connect-Service.ServiceUnavailable',
    [System.Management.Automation.ErrorCategory]::ResourceUnavailable,
    $ServiceEndpoint
))
```

Use `$PSCmdlet.WriteError()` / `$PSCmdlet.ThrowTerminatingError()` rather than
the `Write-Error` cmdlet inside advanced functions when constructing the full
`ErrorRecord` is required.

### `$?` and `$Error` propagation

- `WriteError` appends to `$Error`, sets `$?` to `$false` on the caller after
  the cmdlet completes, and writes the record to the error stream. The pipeline
  continues.
- `ThrowTerminatingError` appends to `$Error`, terminates the current cmdlet
  invocation immediately, and propagates an exception that stops the pipeline
  unless the caller wraps the call in a `try`/`catch` or sets
  `-ErrorAction Stop`.

### ErrorRecord minimum shape

Every `ErrorRecord` passed to either method must include:

| Argument | Requirement |
| --- | --- |
| `Exception` | Non-null; use the most specific exception type available |
| `errorId` | Dot-separated, stable string that identifies the failure site (e.g., `Get-Resource.FileNotFound`) |
| `ErrorCategory` | A specific `ErrorCategory` enum value — see [error-handling-errorrecord-construction.md](./error-handling-errorrecord-construction.md) |
| `targetObject` | The value or resource that caused the failure (not the cmdlet instance) |

## Avoid

- **Raw `throw` in `ProcessRecord`** — a raw exception bypasses the PowerShell
  error pipeline, skips `$Error` population with the `ErrorRecord` shape, and
  surfaced as an `ErrorRecord` with `ErrorCategory.NotSpecified` and a generic
  `errorId`. Always use `ThrowTerminatingError` when termination is required.
- **`ThrowTerminatingError` for record-level failures** — if only one item in a
  piped set fails, using a terminating error stops the entire pipeline. Use
  `WriteError` so subsequent records are still processed.
- **`Write-Error` (the PowerShell cmdlet)** inside a compiled cmdlet — calling
  the compiled `WriteError` method is correct. The `Write-Error` *cmdlet* is a
  script-level surface; in compiled code always call the instance method.
- **`Write-Error` in advanced functions without a full `ErrorRecord`** — the
  `-Message` string overload creates an `ErrorRecord` with
  `ErrorCategory.NotSpecified` and a synthetic `errorId`. Prefer
  `$PSCmdlet.WriteError()` with a hand-constructed `ErrorRecord` when precise
  metadata is needed.
- **Swallowing exceptions silently** — catching an exception and writing nothing
  to the error stream leaves `$?` as `$true` and gives callers no signal that
  something failed.
- **Using `WriteError` for authentication or permission errors that make all
  further processing pointless** — classify as terminating when no subsequent
  record can succeed.

## Review checklist

- [ ] Record-level failures (one item in a set) use `WriteError` so the
      pipeline continues for remaining records.
- [ ] Cmdlet-level failures (entire invocation cannot proceed) use
      `ThrowTerminatingError`.
- [ ] Raw `throw` is absent from `ProcessRecord`; `ThrowTerminatingError` is
      used instead when termination is required.
- [ ] Both `WriteError` and `ThrowTerminatingError` receive a fully constructed
      `ErrorRecord` with a non-null exception, a stable `errorId`, a specific
      `ErrorCategory`, and a meaningful target object.
- [ ] Advanced functions use `$PSCmdlet.WriteError()` /
      `$PSCmdlet.ThrowTerminatingError()` when constructing the full
      `ErrorRecord` shape is required.
- [ ] No exceptions are silently swallowed without a corresponding
      `WriteError` or `ThrowTerminatingError` call.

## Related files

- [Error handling — ErrorRecord construction](./error-handling-errorrecord-construction.md)
- [Error handling and categories map](../references/error-handling-categories-map.md)

## Source anchors

- [Cmdlet error reporting overview](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/cmdlet-error-reporting)
- [Terminating errors](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/terminating-errors)
- [Non-terminating errors](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/non-terminating-errors)
- [WriteError method](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.cmdlet.writeerror)
- [ThrowTerminatingError method](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.cmdlet.throwterminatingerror)
- [about_CommonParameters — ErrorAction](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_commonparameters)
