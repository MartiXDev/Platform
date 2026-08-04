# PowerShell advanced patterns — transactions and jobs

> **Optional / v1.1** — This rule covers features that are rare in typical
> cmdlet development. Implement transaction support only when the operation is
> genuinely transactional; implement background job integration only when the
> workstream explicitly requires asynchronous output. Most cmdlets need neither.

## Purpose

Protect the `SupportsTransactions = true` wiring and the background job pattern
for compiled cmdlets that require atomic rollback semantics or deferred
asynchronous execution. Setting `SupportsTransactions = true` without properly
checking and enlisting in the active transaction silently ignores the user's
transaction; implementing background jobs when streaming `ProcessRecord` output
would suffice adds unnecessary complexity.

## Default guidance

### Transactions

**When to consider transaction support.** A cmdlet should set
`SupportsTransactions = true` only when the resource it operates on genuinely
supports atomic rollback — primarily the PowerShell registry and filesystem
providers. Cmdlets targeting arbitrary external APIs are not candidates because
there is no transaction manager to enlist with.

**Declaring transaction support.** Set the flag in the `[Cmdlet]` attribute.
PowerShell automatically adds a `-UseTransaction` switch parameter to the
cmdlet:

```csharp
[Cmdlet(VerbsCommunications.Send, "GreetingTx",
        SupportsTransactions = true)]
public class SendGreetingTxCommand : PSCmdlet
```

**Enlisting in the active transaction.** Inside the input processing methods
(`BeginProcessing`, `ProcessRecord`, `EndProcessing`), check
`TransactionAvailable()` before accessing `CurrentPSTransaction`. The check
returns `true` only when `SupportsTransactions = true` is set, an active
transaction exists in the session, and the caller specified `-UseTransaction`:

```csharp
protected override void ProcessRecord()
{
    if (TransactionAvailable())
    {
        using (CurrentPSTransaction)
        {
            WriteObject("Hello " + Name + " from within a transaction.");
        }
    }
    else
    {
        WriteObject("Hello " + Name);
    }
}
```

**Parity with advanced functions.** Advanced functions that set
`[CmdletBinding()]` gain access to `$PSCmdlet.TransactionAvailable()` and
`$PSCmdlet.CurrentPSTransaction`. The behavioral contract is the same:
`TransactionAvailable()` must be checked before accessing
`CurrentPSTransaction`, and the `using`-block (or `try / finally` pattern in
script) must bracket all resource enlistment. Because none of the approved
tier-3 `about_` topics document `[CmdletBinding(SupportsShouldProcess)]`-based
transaction opt-in for advanced functions, treat transaction support in scripts
as a compiled-cmdlet concern unless a specific tier-1 source confirms the
script equivalent.

### Background jobs

Background job integration is a lower-priority, optional feature. The
preferred approach for asynchronous or long-running cmdlet output is
**streaming via `ProcessRecord`**: write objects to the pipeline as they are
produced so that downstream cmdlets and scripts can process them without
buffering.

When the workstream explicitly requires deferred or asynchronous execution,
the compiled cmdlet option is to derive a custom job class from
`System.Management.Automation.Job` and initiate it from `BeginProcessing` or
`ProcessRecord`. This is a distinct SDK surface beyond `[Cmdlet]` and `PSCmdlet`
and is noted here for completeness only; no tier-1 source for the job framework
is included in the approved source index for this skill. Author a dedicated
research memo before implementing job-framework integration.

**Parity with advanced functions.** Advanced functions can call
`Start-Job` or `Start-ThreadJob` natively from within `process {}`. There is
no behavioral parity with compiled job classes; the script-side job wrappers
are user-space, not SDK-level. Do not conflate the two.

## Avoid

- **Setting `SupportsTransactions = true` without verifying that the target
  resource can be enlisted in a PowerShell transaction.** The flag adds
  `-UseTransaction` to the cmdlet, but if the resource ignores enlistment, the
  transaction cannot be rolled back and the flag is misleading.

- **Accessing `CurrentPSTransaction` without calling `TransactionAvailable()`
  first.** When no transaction is active, `CurrentPSTransaction` is `null`; a
  direct `using (CurrentPSTransaction)` will throw a `NullReferenceException`.

- **Setting `SupportsTransactions = true` purely for the `-UseTransaction`
  parameter appearance.** This is a semantic contract, not a cosmetic flag. If
  the cmdlet's side effects are not reversible within the transaction, the flag
  is incorrect.

- **Implementing a background job class when pipeline streaming suffices.**
  Streaming one object per `ProcessRecord` call is the idiomatic pattern for
  progressive output and is composable with all standard pipeline operators.
  Reserve background jobs for scenarios that require explicit detachment from
  the calling pipeline.

- **Relying on an `about_` topic outside the approved tier-3 list for
  transaction guidance.** `about_Transactions` is not in the approved source
  index for this skill. Use the tier-1 `how-to-support-transactions` page and
  the `PSCmdlet` API reference as the authority.

## Review checklist

- [ ] `SupportsTransactions = true` is set in `[Cmdlet]` only when the target
      resource supports atomic rollback via the PowerShell transaction manager.
- [ ] Every code path that accesses `CurrentPSTransaction` is guarded by a
      prior `TransactionAvailable()` check.
- [ ] The `using (CurrentPSTransaction)` block (or equivalent `try / finally`)
      brackets all resource operations that must be enrolled in the transaction.
- [ ] Background job integration is documented with a rationale; the simpler
      streaming alternative has been considered and rejected for a specific
      reason.
- [ ] No `about_Transactions` or other excluded sources are cited; transaction
      claims trace to the tier-1 `how-to-support-transactions` page or the
      `PSCmdlet` API reference.

## Related files

- [Foundation — base class and attribute](./foundation-base-class-attribute.md)
- [Confirmation — ShouldProcess and ShouldContinue](./confirmation-shouldprocess-shouldcontinue.md)
- [Advanced patterns map](../references/advanced-patterns-map.md)
- [Source index and guardrails](../references/doc-source-index.md)

## Source anchors

- [Supporting transactions](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/how-to-support-transactions)
- [PSCmdlet.TransactionAvailable method](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.pscmdlet.transactionavailable)
- [PSCmdlet.CurrentPSTransaction property](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.cmdlet.currentpstransaction)
- [CmdletAttribute.SupportsTransactions property](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.cmdletattribute.supportstransactions)
- [about_Functions_Advanced_Methods — process / begin / end in advanced functions (tier-3 mirror)](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_functions_advanced_methods)
