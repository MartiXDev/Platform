# PowerShell confirmation — ShouldProcess and ShouldContinue

## Purpose

Protect the `ShouldProcess` / `ShouldContinue` confirmation contract for
mutating and side-effecting cmdlets. Declaring `SupportsShouldProcess = true`
without calling `ShouldProcess` before every mutation means `-WhatIf` has no
effect, `-Confirm` never triggers, and auditing tools receive no signal that
the operation ran.

## Default guidance

### Attribute declaration

Set `SupportsShouldProcess = true` on the `[Cmdlet]` attribute for every
cmdlet that creates, modifies, or deletes state. Set `ConfirmImpact` to the
level that matches the risk of the operation:

```csharp
[Cmdlet(VerbsCommon.Remove, "Resource",
    SupportsShouldProcess = true,
    ConfirmImpact = ConfirmImpact.High)]
[OutputType(typeof(void))]
public sealed class RemoveResourceCmdlet : PSCmdlet { }
```

Setting `SupportsShouldProcess = true` adds the automatic `-WhatIf` and
`-Confirm` common parameters to the cmdlet. They appear in tab-completion and
`Get-Help` output automatically; no additional parameter properties are needed.

### `ShouldProcess` call pattern

Call `ShouldProcess` inside `ProcessRecord` before any mutation. Always
respect its return value — the entire mutation block runs only when
`ShouldProcess` returns `true`:

```csharp
protected override void ProcessRecord()
{
    if (ShouldProcess(_resourceId, "Remove"))
    {
        _service.Delete(_resourceId);
        WriteVerbose($"Removed resource '{_resourceId}'.");
    }
}
```

Two-argument overload `ShouldProcess(target, action)` is the standard choice.
The `target` argument names the resource being affected; the `action` argument
names the operation (typically the cmdlet verb). PowerShell formats these into
the confirmation prompt and `-WhatIf` message automatically.

### `ShouldContinue` — secondary guard for high-risk sub-operations

`ShouldContinue` is an additional, unfiltered prompt for operations that are
**irreversible or data-destroying** within an already-confirmed flow.
It is always nested inside a `ShouldProcess` block:

```csharp
protected override void ProcessRecord()
{
    if (ShouldProcess(_resourceId, "Remove"))
    {
        if (ShouldContinue(
                $"Permanently delete '{_resourceId}' and all its children?",
                "Confirm permanent deletion"))
        {
            _service.DeletePermanently(_resourceId);
        }
    }
}
```

`ShouldContinue` bypasses the `$ConfirmPreference` shell variable — it always
prompts unless suppressed by the `Force` parameter (see
[confirmation-force-parameter.md](./confirmation-force-parameter.md)) or by
the non-interactive session flag. Use it sparingly; reserve it for operations
where accidental confirmation would cause irreversible data loss.

### `ConfirmImpact` level selection

| Level | When to use | Prompts automatically when |
| --- | --- | --- |
| `ConfirmImpact.None` | Read-only or purely informational side effects | Never (WhatIf and Confirm still honored if caller requests) |
| `ConfirmImpact.Low` | Small, easily reversible writes (e.g., adding a tag) | `$ConfirmPreference` is `Low` |
| `ConfirmImpact.Medium` | Standard mutating operations — the default for most `Set-` and `New-` cmdlets | `$ConfirmPreference` is `Medium` (the shell default for most hosts) |
| `ConfirmImpact.High` | Destructive or hard-to-reverse operations (delete, format, wipe) | `$ConfirmPreference` is `High` or lower — effectively always in interactive sessions |

`ConfirmImpact.High` triggers a prompt in every interactive session because
the shell default `$ConfirmPreference` is `High`. Do not assign `High` to
low-risk operations or users will be prompted on routine commands.

### `-WhatIf` behavior

When the caller passes `-WhatIf`, `ShouldProcess` returns `false` and writes a
`"What if: Performing the operation…"` message to the host. The code inside
`if (ShouldProcess(...))` is skipped entirely. No mutation occurs and no error
is raised. This behavior is automatic when `SupportsShouldProcess = true` is
set.

### Advanced-function overlap (tier-3 mirror)

The same contract applies in `[CmdletBinding(SupportsShouldProcess = $true)]`
advanced functions. `$PSCmdlet.ShouldProcess()` and
`$PSCmdlet.ShouldContinue()` are the method names; the nesting and logic are
identical:

```powershell
function Remove-Resource {
    [CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
    param([string]$ResourceId)

    process {
        if ($PSCmdlet.ShouldProcess($ResourceId, 'Remove')) {
            if ($PSCmdlet.ShouldContinue(
                    "Permanently delete '$ResourceId'?",
                    'Confirm permanent deletion')) {
                Remove-ResourceInternal -Id $ResourceId
            }
        }
    }
}
```

## Avoid

- **Calling `ShouldProcess` outside `ProcessRecord`** — calling it in
  `BeginProcessing` or `EndProcessing` breaks the per-record confirmation
  model. Confirmation prompts apply to individual pipeline records; confirm
  each record in `ProcessRecord`.
- **`ShouldContinue` without an outer `ShouldProcess` guard** — without the
  `ShouldProcess` wrapper, `-WhatIf` has no effect on the nested operation
  because `ShouldContinue` does not honor `-WhatIf`.
- **`ConfirmImpact.High` on low-risk operations** — assigning `High` to an
  operation that is safely reversible forces an interactive prompt on every
  invocation, frustrating users and automation callers alike.
- **Ignoring the return value of `ShouldProcess`** — calling `ShouldProcess`
  and then mutating unconditionally defeats the confirmation guard. The
  mutation must be inside `if (ShouldProcess(...))`.
- **Omitting `SupportsShouldProcess = true` on mutating cmdlets** — without
  this flag, `-WhatIf` and `-Confirm` are not added to the cmdlet, and calling
  `ShouldProcess` throws `InvalidOperationException` at runtime.
- **Setting `SupportsShouldProcess = true` on read-only cmdlets** — read-only
  cmdlets (`Get-`, `Find-`, `Search-`) should not prompt for confirmation.
  Adding `SupportsShouldProcess` is misleading and adds unnecessary parameters.

## Review checklist

- [ ] Every cmdlet that creates, modifies, or deletes state has
      `SupportsShouldProcess = true` in its `[Cmdlet]` attribute.
- [ ] `ShouldProcess(target, action)` is called in `ProcessRecord` before
      every mutation, and the mutation is guarded by the return value.
- [ ] When `ShouldContinue` is used, it is nested inside a `ShouldProcess`
      block.
- [ ] `ConfirmImpact` level matches the actual risk; `High` is reserved for
      irreversible destructive operations.
- [ ] Running with `-WhatIf` produces no side effects — the mutation block is
      skipped entirely.
- [ ] Read-only cmdlets do not declare `SupportsShouldProcess = true`.

## Related files

- [Confirmation — Force parameter and non-interactive safety](./confirmation-force-parameter.md)
- [Foundation — base class and attribute](./foundation-base-class-attribute.md)
- [Confirmation and safety map](../references/confirmation-safety-map.md)

## Source anchors

- [Requesting confirmation](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/requesting-confirmation)
- [Users requesting confirmation](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/users-requesting-confirmation)
- [How to request confirmations](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/how-to-request-confirmations)
- [ShouldProcess method](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.cmdlet.shouldprocess)
- [ShouldContinue method](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.cmdlet.shouldcontinue)
- [about_CommonParameters — WhatIf and Confirm](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_commonparameters)
