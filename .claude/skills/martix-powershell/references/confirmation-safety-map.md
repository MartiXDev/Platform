# Confirmation and safety map

## Purpose

Entry map for the confirmation and safety workstream. Covers
`SupportsShouldProcess`, `ShouldProcess`, `ShouldContinue`, `ConfirmImpact`
level selection, `-WhatIf` / `-Confirm` automatic parameters, the `Force`
parameter bypass semantics, and non-interactive automation safety.

---

## Confirmation contract invariants

1. Set `SupportsShouldProcess = true` in `[Cmdlet]` for every cmdlet that
   creates, modifies, or deletes state.
2. Call `ShouldProcess(target, action)` inside `ProcessRecord` before every
   mutation. Guard the entire mutation block on its return value.
3. When a secondary irreversible sub-operation requires additional protection,
   nest `ShouldContinue` **inside** the `ShouldProcess` block.
4. When `ShouldContinue` is present, expose a `Force` switch that short-circuits
   `ShouldContinue` only — never `ShouldProcess`.

---

## `ShouldProcess` / `ShouldContinue` / `Force` nesting pattern

```csharp
protected override void ProcessRecord()
{
    if (ShouldProcess(_resourceId, "Remove"))          // outer guard — always evaluated
    {
        if (Force || ShouldContinue(                   // inner guard — Force short-circuits this
                $"Permanently delete '{_resourceId}' and all its children?",
                "Confirm permanent deletion"))
        {
            _service.DeletePermanently(_resourceId);
        }
    }
}
```

**Why `Force` must not bypass `ShouldProcess`:** `ShouldProcess` is the hook
that drives `-WhatIf`. If `Force` skips it, `-Force -WhatIf` executes the
destructive operation instead of simulating it, silently breaking pre-flight
checks and automation test runs.

| Concern | Handled by |
| --- | --- |
| Suppress secondary confirmation prompts | `Force` bypasses `ShouldContinue` |
| Suppress the operation entirely (dry-run) | `-WhatIf` causes `ShouldProcess` to return `false` |
| Explicit user confirmation in interactive session | `-Confirm` causes `ShouldProcess` to always prompt |

These concerns are orthogonal. Code that conflates them breaks one or both.

---

## `ConfirmImpact` level selection

| Level | When to use | Prompts automatically when |
| --- | --- | --- |
| `ConfirmImpact.None` | Read-only or purely informational side effects | Never (WhatIf and Confirm still honored if caller requests) |
| `ConfirmImpact.Low` | Small, easily reversible writes (e.g., adding a tag) | `$ConfirmPreference` is `Low` |
| `ConfirmImpact.Medium` | Standard mutating operations — default for most `Set-` and `New-` cmdlets | `$ConfirmPreference` is `Medium` (shell default for most hosts) |
| `ConfirmImpact.High` | Destructive or hard-to-reverse operations (delete, format, wipe) | `$ConfirmPreference` is `High` or lower — prompts in every interactive session |

**Do not assign `High` to low-risk operations.** `$ConfirmPreference` defaults
to `High` in most interactive hosts, so `ConfirmImpact.High` prompts on every
interactive invocation.

**Read-only cmdlets (`Get-*`, `Find-*`, `Search-*`) must not declare
`SupportsShouldProcess = true`** — they do not mutate state and should never
present a confirmation prompt.

---

## `Force` parameter declaration

```csharp
[Parameter]
public SwitchParameter Force { get; set; }
```

- No `Mandatory`, no `Position`, no pipeline binding.
- Exactly the name `Force` — the standard parameter name. Do not rename it
  `Overwrite`, `SkipConfirmation`, or similar.
- Required on any cmdlet that calls `ShouldContinue`; automation callers in
  non-interactive environments (CI pipelines, Azure Automation, unattended
  scripts) have no other way to suppress the prompt.

---

## `-WhatIf` behavior

When the caller passes `-WhatIf`, `ShouldProcess` returns `false` and writes
a `"What if: Performing the operation…"` message to the host. The mutation
block inside `if (ShouldProcess(...))` is skipped entirely; no side effects
occur. This behavior is automatic when `SupportsShouldProcess = true` is set.

---

## Advanced-function overlap (tier-3 mirror)

The same contract applies in `[CmdletBinding(SupportsShouldProcess = $true)]`
advanced functions using `$PSCmdlet.ShouldProcess()` and
`$PSCmdlet.ShouldContinue()`. The nesting pattern and logic are identical.
See the rule file for the script-form example.

---

## Rule coverage

| Rule file | Topics |
| --- | --- |
| [`rules/confirmation-shouldprocess-shouldcontinue.md`](../rules/confirmation-shouldprocess-shouldcontinue.md) | `SupportsShouldProcess` attribute flag, `ShouldProcess(target, action)` call pattern, `ShouldContinue` nesting, `ConfirmImpact` selection, `-WhatIf` behavior, advanced-function mirror |
| [`rules/confirmation-force-parameter.md`](../rules/confirmation-force-parameter.md) | `Force` declaration, correct `Force \|\| ShouldContinue(...)` nesting, why `Force` must not bypass `ShouldProcess`, non-interactive automation safety |

---

## Related files

- [Confirmation — ShouldProcess and ShouldContinue rule](../rules/confirmation-shouldprocess-shouldcontinue.md)
- [Confirmation — Force parameter rule](../rules/confirmation-force-parameter.md)
- [Foundation — base class and attribute rule](../rules/foundation-base-class-attribute.md) — `SupportsShouldProcess` flag on `[Cmdlet]`
- [Foundation map](./foundation-map.md)
- [Source index and guardrails](./doc-source-index.md)

## Source anchors

- [Requesting confirmation](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/requesting-confirmation)
- [Users requesting confirmation](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/users-requesting-confirmation)
- [How to request confirmations](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/how-to-request-confirmations)
- [Strongly encouraged development guidelines — Force parameter](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/strongly-encouraged-development-guidelines)
- [Standard cmdlet parameter names and types — Force](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/standard-cmdlet-parameter-names-and-types)
- [ShouldProcess method](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.cmdlet.shouldprocess)
- [ShouldContinue method](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.cmdlet.shouldcontinue)
- [about_CommonParameters — WhatIf and Confirm (tier-3 mirror)](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_commonparameters)
