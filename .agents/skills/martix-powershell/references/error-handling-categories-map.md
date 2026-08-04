# Error handling and categories map

## Purpose

Entry map for the error handling workstream. Covers the terminating vs.
non-terminating error classification decision, `ErrorRecord` anatomy and
construction, `ErrorCategory` enum selection, `WriteError`,
`ThrowTerminatingError`, `$Error` / `$?` propagation, and the advanced-function
mirror using `$PSCmdlet` methods.

---

## Terminating vs. non-terminating decision

| Scenario | Correct method |
| --- | --- |
| One input record failed; pipeline can continue with remaining records | `WriteError(errorRecord)` |
| The cmdlet cannot process any more records (required resource unavailable, connection lost, precondition failed) | `ThrowTerminatingError(errorRecord)` |

**Never use raw `throw` in `ProcessRecord`.** A raw exception bypasses
`$Error` population with the full `ErrorRecord` shape and surfaces as an
`ErrorRecord` with `ErrorCategory.NotSpecified` and a synthetic `errorId`.

---

## `ErrorRecord` constructor

```csharp
new ErrorRecord(
    Exception exception,     // non-null; most specific type available
    string    errorId,       // dot-separated stable identifier: "CmdletName.ConditionName"
    ErrorCategory errorCategory, // enum value — never hardcode the integer
    object    targetObject)  // the value/resource that caused the failure
```

### `errorId` convention

- Format: `CmdletName.ConditionName` — e.g., `Get-Resource.NotFound`,
  `Remove-Item.PermissionDenied`, `Set-Config.InvalidValue`
- Must be **stable across versions** — scripts match against
  `$_.FullyQualifiedErrorId` which includes this string
- Never generic: `"Error"`, `"Exception"`, `"Failure"` are antipatterns

### Exception selection

| Failure kind | Preferred exception type |
| --- | --- |
| Resource or item does not exist | `FileNotFoundException`, `DirectoryNotFoundException`, `ItemNotFoundException` |
| Invalid parameter value (semantics) | `ArgumentException`, `ArgumentOutOfRangeException` |
| Null argument | `ArgumentNullException` |
| Object state invalid for operation | `InvalidOperationException` |
| Access or permissions | `UnauthorizedAccessException` |
| Network or connection | `SocketException`, `HttpRequestException` |
| Timeout | `TimeoutException` |
| Not implemented | `NotImplementedException` |
| General SDK wrapping (last resort) | `RuntimeException` |

When re-throwing from a `catch` block, pass the caught exception directly to
preserve stack trace. When adding context, wrap it and preserve the original
as `InnerException`.

---

## `ErrorCategory` enum reference

Use the enum value that most closely describes the nature of the failure.
`NotSpecified` is a last resort; document why no other category fits when
it is used.

| Category | When to use |
| --- | --- |
| `ObjectNotFound` | A required item, resource, or path does not exist |
| `InvalidArgument` | A parameter value is semantically invalid |
| `InvalidData` | Input data is malformed or cannot be parsed |
| `InvalidOperation` | The operation is not valid for the current object state |
| `InvalidResult` | The operation produced an unexpected or unacceptable result |
| `InvalidType` | An object of the wrong type was supplied |
| `PermissionDenied` | Caller lacks the required access right |
| `ResourceExists` | The target already exists (e.g., `New-*` when item is present) |
| `ResourceUnavailable` | The resource is known but currently unavailable |
| `ResourceBusy` | The resource exists but is in use |
| `ConnectionError` | A network or transport connection failure |
| `AuthenticationError` | Credential or token verification failed |
| `SecurityError` | A security or trust violation |
| `OperationTimeout` | The operation exceeded its time limit |
| `ReadError` | A read operation failed |
| `WriteError` | A write operation failed (category — not the method) |
| `OpenError` | Failed to open a resource (file, connection, handle) |
| `CloseError` | Failed to close or release a resource |
| `NotInstalled` | A required component is absent from the system |
| `NotImplemented` | The feature or operation is not implemented |
| `LimitsExceeded` | A quota or capacity limit was hit |
| `SyntaxError` | Input violates an expected syntax or format |
| `ParserError` | A parsing stage failed |
| `MetadataError` | Metadata about a resource is missing or corrupt |
| `OperationStopped` | The operation was deliberately halted |
| `DeviceError` | A hardware device produced an error |
| `DeadlockDetected` | A deadlock condition was detected |
| `ProtocolError` | A protocol-level violation |
| `FromStdErr` | Error originated from a standard error stream (interop) |
| `NotSpecified` | **Last resort only** — use when no other category fits; comment why |

Full enum definition: [ErrorCategory enum](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.errorcategory)

---

## `$?` and `$Error` propagation

| Method | Effect on `$?` | Effect on `$Error` | Pipeline |
| --- | --- | --- | --- |
| `WriteError` | Sets `$?` to `$false` after cmdlet completes | Appends `ErrorRecord` | Continues |
| `ThrowTerminatingError` | Sets `$?` to `$false` | Appends `ErrorRecord` | Stops current cmdlet invocation |
| Raw `throw` | Propagates as unhandled exception | No structured `ErrorRecord` | Unpredictable |

---

## Advanced-function mirror (tier-3)

In `[CmdletBinding()]` advanced functions, use `$PSCmdlet` methods:

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
    [System.InvalidOperationException]::new('Service unavailable.'),
    'Connect-Service.ServiceUnavailable',
    [System.Management.Automation.ErrorCategory]::ResourceUnavailable,
    $ServiceEndpoint
))
```

Prefer `$PSCmdlet.WriteError()` over the `Write-Error` cmdlet when constructing
a full `ErrorRecord` is required — the `-Message` string overload on
`Write-Error` produces `ErrorCategory.NotSpecified` and a synthetic `errorId`.

---

## Rule coverage

| Rule file | Topics |
| --- | --- |
| [`rules/error-handling-terminating-nonterminating.md`](../rules/error-handling-terminating-nonterminating.md) | Terminating vs. non-terminating decision tree, idiomatic call patterns, `$?` / `$Error` propagation, `ErrorRecord` minimum shape, advanced-function mirror |
| [`rules/error-handling-errorrecord-construction.md`](../rules/error-handling-errorrecord-construction.md) | `ErrorRecord` constructor, exception selection, `errorId` convention, full `ErrorCategory` table, target object guidance, re-throw with `InnerException` |

---

## Related files

- [Error handling — terminating and non-terminating rule](../rules/error-handling-terminating-nonterminating.md)
- [Error handling — ErrorRecord construction rule](../rules/error-handling-errorrecord-construction.md)
- [Foundation — base class and attribute rule](../rules/foundation-base-class-attribute.md) — raw `throw` avoidance
- [Source index and guardrails](./doc-source-index.md)

## Source anchors

- [Cmdlet error reporting](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/cmdlet-error-reporting)
- [Terminating errors](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/terminating-errors)
- [Non-terminating errors](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/non-terminating-errors)
- [Creating an ErrorRecord object](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/creating-an-errorrecord-object)
- [ErrorRecord class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.errorrecord)
- [ErrorCategory enum](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.errorcategory)
- [WriteError method](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.cmdlet.writeerror)
- [ThrowTerminatingError method](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.cmdlet.throwterminatingerror)
- [about_CommonParameters — ErrorAction (tier-3 mirror)](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_commonparameters)
