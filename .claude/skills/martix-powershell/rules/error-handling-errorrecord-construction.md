# PowerShell error handling — ErrorRecord construction

## Purpose

Protect the `ErrorRecord` construction contract. Every `ErrorRecord` must carry
a non-null exception, a stable `errorId` string, a meaningful `ErrorCategory`
enum value, and a target object that identifies the failing resource. Missing
or generic values make errors hard to diagnose, break tooling that filters
`$Error` by category or identifier, and frustrate callers who write error
handlers around specific `FullyQualifiedErrorId` values.

## Default guidance

### Constructor signature

```csharp
new ErrorRecord(
    Exception exception,
    string    errorId,
    ErrorCategory errorCategory,
    object    targetObject)
```

All four arguments are required. None should be `null` except `targetObject`
when there is genuinely no identifiable target (rare).

### Exception selection

Use the most specific .NET exception type available for the failure:

| Failure kind | Preferred exception type |
| --- | --- |
| Resource / item does not exist | `System.IO.FileNotFoundException`, `System.IO.DirectoryNotFoundException`, or `System.Management.Automation.ItemNotFoundException` |
| Invalid parameter value (semantics) | `System.ArgumentException` or `System.ArgumentOutOfRangeException` |
| Null argument | `System.ArgumentNullException` |
| Object state invalid for operation | `System.InvalidOperationException` |
| Access / permissions | `System.UnauthorizedAccessException` |
| Network / connection | `System.Net.Sockets.SocketException`, `System.Net.Http.HttpRequestException` |
| Timeout | `System.TimeoutException` |
| Not implemented | `System.NotImplementedException` |
| General SDK wrapping | `System.Management.Automation.RuntimeException` (last resort) |

When re-throwing from a `catch` block, pass the caught exception directly to
preserve the original stack trace. Do not wrap it in a new exception unless
adding context; when you do wrap, use the original as `InnerException`:

```csharp
catch (HttpRequestException ex)
{
    WriteError(new ErrorRecord(
        new InvalidOperationException($"API call failed for '{_endpoint}'.", ex),
        "Invoke-ApiCall.HttpError",
        ErrorCategory.ConnectionError,
        _endpoint));
}
```

### `errorId` design convention

- Use a dot-separated string: `CmdletName.ConditionName`
  — for example: `Get-Resource.NotFound`, `Set-Config.InvalidValue`,
  `Remove-Item.PermissionDenied`.
- Keep it stable across versions. Scripts and error handlers match against
  `$_.FullyQualifiedErrorId`, which includes the `errorId`. A rename breaks
  those handlers.
- Be specific: `Get-Resource.FileNotFound` is better than `Error` or
  `GetResourceFailed`. Specific ids are greppable in scripts and test output.
- Never use generic values: `"Error"`, `"Exception"`, `"Failure"`.

### `ErrorCategory` selection

Use the enum value that most closely describes the nature of the failure. Never
hardcode the underlying integer. The table below lists the most commonly used
values:

| Enum value | When to use |
| --- | --- |
| `ObjectNotFound` | A required item, resource, or path does not exist |
| `InvalidArgument` | A parameter value is semantically invalid |
| `InvalidData` | Input data is malformed or cannot be parsed |
| `InvalidOperation` | The operation is not valid for the current state |
| `InvalidResult` | The operation produced an unexpected or unacceptable result |
| `InvalidType` | An object of the wrong type was supplied |
| `PermissionDenied` | Caller lacks the required access right |
| `ResourceExists` | The target already exists (e.g., `New-*` where item is present) |
| `ResourceUnavailable` | The resource is known but currently unavailable |
| `ResourceBusy` | The resource exists but is in use |
| `ConnectionError` | A network or transport connection failure |
| `AuthenticationError` | Credential or token verification failed |
| `SecurityError` | A security / trust violation |
| `OperationTimeout` | The operation exceeded its time limit |
| `ReadError` | A read operation failed |
| `WriteError` | A write operation failed |
| `OpenError` | Failed to open a resource (file, connection, handle) |
| `CloseError` | Failed to close or release a resource |
| `NotInstalled` | A required component is absent from the system |
| `NotImplemented` | The feature or operation is not implemented |
| `LimitsExceeded` | A quota or capacity limit was hit |
| `SyntaxError` | Input violates an expected syntax or format |
| `ParserError` | A parsing stage failed |
| `MetadataError` | Metadata about a resource is missing or corrupt |
| `OperationStopped` | The operation was deliberately halted |
| `NotSpecified` | **Last resort only** — use when no other category fits |

### Target object

The `targetObject` argument should be the specific value or resource that
caused the failure:

- A file path (`string`), a `FileInfo`, a URI, or a connection endpoint.
- A parameter value that was invalid.
- An item identifier (`string id`) when deleting or looking up a record.
- Do **not** pass `this` (the cmdlet instance itself).
- Do **not** pass `null` unless there is genuinely no identifiable target.

### Full construction pattern from a `catch` block

```csharp
protected override void ProcessRecord()
{
    try
    {
        // Operation that may fail per record
        _service.Delete(_resourceId);
    }
    catch (UnauthorizedAccessException ex)
    {
        WriteError(new ErrorRecord(
            ex,
            "Remove-Resource.PermissionDenied",
            ErrorCategory.PermissionDenied,
            _resourceId));
    }
    catch (InvalidOperationException ex)
    {
        // Terminating: this record state failure makes all further
        // processing impossible (e.g., connection is gone).
        ThrowTerminatingError(new ErrorRecord(
            ex,
            "Remove-Resource.ConnectionLost",
            ErrorCategory.ConnectionError,
            _serviceEndpoint));
    }
}
```

## Avoid

- **`ErrorCategory.NotSpecified`** when a better category exists. Inspect the
  enum table above; `NotSpecified` should appear rarely and only with a
  comment explaining why no category fits.
- **Generic `errorId` values** — `"Error"`, `"Exception"`, `"Failure"` — they
  make `$_.FullyQualifiedErrorId` useless for scripted error handlers.
- **`null` target object** when there is an identifiable target. `null` forces
  callers into string parsing on the exception message to identify the failing
  item.
- **`new Exception("message")`** as the base type when a specific subtype
  applies. Generic `Exception` carries no semantic information beyond the
  message string and makes PowerShell's error category inference less
  accurate.
- **Wrapping the original exception without preserving it as `InnerException`**
  — callers and logging tools that inspect the exception chain need the
  original to diagnose root cause.
- **Constructing an `ErrorRecord` and then discarding it** — any caught
  exception that produces an `ErrorRecord` must be passed to `WriteError` or
  `ThrowTerminatingError`. Constructing the record without emitting it has no
  effect on `$Error` or `$?`.

## Review checklist

- [ ] `ErrorRecord` constructor receives a non-null, specific exception type.
- [ ] `errorId` is dot-separated (`CmdletName.ConditionName`), specific, and
      stable across versions.
- [ ] `ErrorCategory` is an enum value — never a hardcoded integer — and
      matches the nature of the failure. `NotSpecified` has a documented reason
      if present.
- [ ] `targetObject` is the value or resource that failed, not the cmdlet
      instance, and not `null` when a target is identifiable.
- [ ] When re-wrapping a caught exception, the original is preserved as
      `InnerException`.
- [ ] Every `ErrorRecord` constructed in a `catch` block is passed to
      `WriteError` or `ThrowTerminatingError`.

## Related files

- [Error handling — terminating and non-terminating](./error-handling-terminating-nonterminating.md)
- [Error handling and categories map](../references/error-handling-categories-map.md)

## Source anchors

- [Creating an ErrorRecord object](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/creating-an-errorrecord-object)
- [ErrorRecord class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.errorrecord)
- [ErrorCategory enum](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.errorcategory)
- [Cmdlet error reporting](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/cmdlet-error-reporting)
- [WriteError method](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.cmdlet.writeerror)
- [ThrowTerminatingError method](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.cmdlet.throwterminatingerror)
