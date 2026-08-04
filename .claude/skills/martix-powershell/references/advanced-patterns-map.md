# Advanced patterns map

## Purpose

Entry map for the advanced patterns workstream. Covers `IDynamicParameters`
implementation patterns (separate class vs. `RuntimeDefinedParameterDictionary`),
fresh-return requirement, parameter aliases, `ScriptBlock` invocation via
`PSCmdlet.InvokeCommand.InvokeScript`, and transaction support with
`SupportsTransactions` / `TransactionAvailable()` / `CurrentPSTransaction`.

---

## Dynamic parameter implementation patterns

Two implementation patterns are available; choose based on scenario:

| Pattern | When to use | Key characteristic |
| --- | --- | --- |
| **Separate parameters class** | Preferred for compiled cmdlets; parameter names and types are fixed at compile time | Define a companion class with `[Parameter]`-decorated properties; PowerShell reflects it exactly as static parameters |
| **`RuntimeDefinedParameterDictionary`** | Required for advanced functions; optional for compiled when names/types must be determined at runtime from external data | Build parameter entries programmatically in `GetDynamicParameters()` |

### Critical constraint: fresh object on every call

`GetDynamicParameters()` must return a **fresh object on every call**. The
runtime evaluates this method multiple times during tab completion and parameter
binding. Returning a cached instance carries stale attribute state or previously
resolved values across invocations.

- Separate parameters class: construct a new instance on each call.
- `RuntimeDefinedParameterDictionary`: construct a new dictionary on each call.

### Reading dynamic parameter values in `ProcessRecord`

- **Separate class pattern:** Store the returned context in a field during
  `GetDynamicParameters()` and read from that field in `ProcessRecord`. Do not
  re-call `GetDynamicParameters()`.
- **Dictionary pattern:** Read from `MyInvocation.BoundParameters` or cast
  `RuntimeDefinedParameter.Value` in `ProcessRecord`.

### `[Parameter]` requirement

Every dynamic parameter entry must have `[Parameter]` (or `ParameterAttribute`)
in its attribute collection. A property without `[Parameter]` (separate class
pattern) is invisible to the binder. A `RuntimeDefinedParameter` without a
`ParameterAttribute` in its `Attributes` collection is silently ignored.

---

## Alias conventions (`[Alias]`)

- Use the **standard or generic name** as the primary parameter name and the
  **domain-specific name as the alias** — not the reverse. This keeps parameter
  names consistent across cmdlets while allowing shorthand.
- Limit to **one or two aliases per parameter**. Each alias occupies a slot
  in the runspace-wide alias table; a conflict with an existing parameter or
  provider alias causes a binding exception.
- A `[Alias("PSPath")]` on `LiteralPath` is the canonical example and is
  expected by pipeline providers.

---

## `ScriptBlock`-valued parameters

Invoke `ScriptBlock` parameters inside `ProcessRecord` using
`PSCmdlet.InvokeCommand.InvokeScript`. This runs the block in the caller's
session state and handles stream redirection correctly. **Do not call
`ScriptBlock.Invoke()` directly** — it bypasses stream handling and runs
outside the cmdlet's execution context, losing error and verbose stream
redirection.

```csharp
protected override void ProcessRecord()
{
    if (FilterScript != null)
    {
        var result = InvokeCommand.InvokeScript(
            false, FilterScript, null, InputObject);
    }
}
```

---

## Transaction support

**When to consider:** Only when the target resource supports atomic rollback
via the PowerShell transaction manager — primarily the PowerShell registry and
filesystem providers. Cmdlets targeting arbitrary external APIs are not
candidates because there is no transaction manager to enlist with.

**Declaration:** Set `SupportsTransactions = true` in `[Cmdlet]`. PowerShell
automatically adds a `-UseTransaction` switch.

**Critical guard:** Always call `TransactionAvailable()` before accessing
`CurrentPSTransaction`. When no transaction is active, `CurrentPSTransaction`
is `null`; a direct `using (CurrentPSTransaction)` throws
`NullReferenceException`.

```csharp
protected override void ProcessRecord()
{
    if (TransactionAvailable())
    {
        using (CurrentPSTransaction)
        {
            // enlist resource operations here
        }
    }
    else
    {
        // non-transacted path
    }
}
```

**Note — transactions vs. background jobs:** The transactions rule also covers
background job integration. Background jobs via the `Job` SDK surface are noted
for completeness only; no tier-1 source for the job framework is in the
approved source index. Author a research memo before implementing job-framework
integration.

---

## Dynamic parameters vs. static parameter sets

Prefer static parameter sets over dynamic parameters unless a compile-time
parameter list is genuinely impossible. Dynamic parameters are harder to
document, test, and discover. More than three or four static parameter sets
warrants a design review; refactor into multiple cmdlets or proxy commands
before exceeding this threshold.

---

## Rule coverage

| Rule file | Topics |
| --- | --- |
| [`rules/advanced-dynamic-parameters-alias.md`](../rules/advanced-dynamic-parameters-alias.md) | `IDynamicParameters`, separate class vs. `RuntimeDefinedParameterDictionary`, fresh-return requirement, `[Parameter]` requirement, alias conventions, `ScriptBlock` invocation via `InvokeCommand.InvokeScript` |
| [`rules/advanced-transactions-jobs.md`](../rules/advanced-transactions-jobs.md) | `SupportsTransactions`, `TransactionAvailable()` guard, `CurrentPSTransaction` usage, background job notes (optional/v1.1) |

---

## Related files

- [Advanced patterns — dynamic parameters and aliases rule](../rules/advanced-dynamic-parameters-alias.md)
- [Advanced patterns — transactions and jobs rule](../rules/advanced-transactions-jobs.md)
- [Parameters — sets and dynamic parameters rule](../rules/parameters-sets-dynamic.md) — `IDynamicParameters` from the parameters angle
- [Parameters and validation map](./parameters-validation-map.md)
- [Confirmation and safety map](./confirmation-safety-map.md) — `SupportsTransactions` alongside `SupportsShouldProcess`
- [Source index and guardrails](./doc-source-index.md)

## Source anchors

- [Dynamic parameters](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/cmdlet-dynamic-parameters)
- [How to declare dynamic parameters](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/how-to-declare-dynamic-parameters)
- [Supporting transactions](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/how-to-support-transactions)
- [Strongly encouraged development guidelines — aliases and standard parameter names](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/strongly-encouraged-development-guidelines)
- [IDynamicParameters interface](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.idynamicparameters)
- [RuntimeDefinedParameter class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.runtimedefinedparameter)
- [RuntimeDefinedParameterDictionary class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.runtimedefinedparameterdictionary)
- [PSCmdlet.TransactionAvailable method](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.pscmdlet.transactionavailable)
- [PSCmdlet.CurrentPSTransaction property](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.cmdlet.currentpstransaction)
- [about_Functions_Advanced_Parameters — DynamicParam block (tier-3 mirror)](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_functions_advanced_parameters)
