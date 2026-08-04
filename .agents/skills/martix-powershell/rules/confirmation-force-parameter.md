# PowerShell confirmation — Force parameter and non-interactive safety

## Purpose

Protect the `Force` parameter semantics. `Force` must bypass only
`ShouldContinue` (the secondary prompt), never `ShouldProcess` (the outer
guard that drives `-WhatIf`). Incorrect `Force` wiring silences `-WhatIf`,
breaks automation auditing, and can execute destructive operations without any
signal to the caller.

## Default guidance

### `Force` parameter declaration

Declare `Force` as a `SwitchParameter` property using the standard parameter
name. No `Mandatory`, no `Position`, no pipeline binding:

```csharp
[Parameter]
public SwitchParameter Force { get; set; }
```

The name `Force` is a standard cmdlet parameter name per the PowerShell SDK
strongly encouraged guidelines. Use this exact casing. Do not rename it
`Overwrite`, `SkipConfirmation`, or similar — callers rely on the conventional
name in scripts and `-WhatIf` documentation.

### Correct nesting pattern

`Force` bypasses `ShouldContinue` by short-circuiting the inner guard. The
outer `ShouldProcess` block is **always** evaluated, regardless of `Force`:

```csharp
protected override void ProcessRecord()
{
    if (ShouldProcess(_resourceId, "Remove"))
    {
        if (Force || ShouldContinue(
                $"Permanently delete '{_resourceId}' and all its children?",
                "Confirm permanent deletion"))
        {
            _service.DeletePermanently(_resourceId);
        }
    }
}
```

The `Force || ShouldContinue(...)` short-circuit is intentional: when `Force`
is `true`, `ShouldContinue` is never called, so no interactive prompt is
shown. The outer `ShouldProcess` still runs, which means `-WhatIf` still
suppresses the operation and writes the `"What if:"` message.

### Why `Force` must not bypass `ShouldProcess`

`ShouldProcess` is the hook that drives `-WhatIf`. If `Force` skips the
`ShouldProcess` check entirely, then passing both `-Force` and `-WhatIf`
would execute the destructive operation instead of simulating it — silently
breaking automation test runs and pre-flight checks that rely on `-WhatIf`.

The invariant is:

- `Force` = suppress secondary confirmation prompts (`ShouldContinue`)
- `-WhatIf` = suppress the operation entirely (`ShouldProcess` returns `false`)

These two concerns are orthogonal. Code that conflates them breaks one or both.

### Non-interactive automation scenarios

Non-interactive sessions (CI pipelines, Azure Automation, unattended scripts)
cannot respond to `ShouldContinue` prompts. A cmdlet that calls
`ShouldContinue` without offering a `Force` escape will block indefinitely or
throw in non-interactive mode.

- Always provide `Force` on any cmdlet that calls `ShouldContinue`.
- Document in cmdlet help that automation callers should pass `-Force` to
  prevent prompt blocking.
- Do not rely on `$env:CI` or host detection to suppress prompts internally;
  leave that decision to the caller via `-Force`.
- Never call `Read-Host` inside a cmdlet or advanced function. `Read-Host`
  blocks indefinitely in non-interactive sessions and bypasses the standard
  `-Force` / `-Confirm` / `-WhatIf` parameter contract. All input must flow
  through declared parameters.

### Advanced-function overlap (tier-3 mirror)

The same pattern applies in `[CmdletBinding(SupportsShouldProcess = $true)]`
advanced functions. The property access changes but the nesting is identical:

```powershell
function Remove-Resource {
    [CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
    param(
        [string]$ResourceId,
        [switch]$Force
    )

    process {
        if ($PSCmdlet.ShouldProcess($ResourceId, 'Remove')) {
            if ($Force -or $PSCmdlet.ShouldContinue(
                    "Permanently delete '$ResourceId'?",
                    'Confirm permanent deletion')) {
                Remove-ResourceInternal -Id $ResourceId
            }
        }
    }
}
```

## Avoid

- **`Force` bypassing `ShouldProcess`** — patterns like
  `if (Force) { DoIt(); } else { if (ShouldProcess(...)) { DoIt(); } }`
  execute the mutation even when `-WhatIf` is active, breaking pre-flight
  simulation.
- **Omitting `Force` on a cmdlet that calls `ShouldContinue`** — non-interactive
  callers have no way to suppress the prompt and will get either a blocked
  process or a `HostException` in non-interactive mode.
- **Using `Force` to bypass parameter validation attributes** — `Force` is
  strictly a confirmation-prompt bypass. Validation attributes (`ValidateSet`,
  `ValidateRange`, `ValidateNotNullOrEmpty`) must still be enforced
  unconditionally.
- **Using `Force` to suppress `WriteError` calls** — `Force` does not mean
  "ignore all errors silently." Error reporting is independent of confirmation
  suppression.
- **Misreading `-Confirm` interaction** — `Force` does not suppress `-Confirm`.
  When the caller explicitly passes `-Confirm`, `ShouldProcess` will still
  prompt regardless of `Force`. Only `ShouldContinue` is bypassed by `Force`.
- **Declaring `Force` as `Mandatory = true`** — `Force` is always optional.
  Making it mandatory breaks the standard cmdlet contract and user expectations.
- **Using `Read-Host` for confirmation or input inside a cmdlet or advanced
  function** — `Read-Host` blocks non-interactive sessions and bypasses the
  standard `-Force`/`-WhatIf` contract. All input must come through declared
  parameters.

## Review checklist

- [ ] `Force` is declared as `[Parameter] public SwitchParameter Force`.
- [ ] `Force` bypasses `ShouldContinue` only — the pattern is
      `if (Force || ShouldContinue(...))` nested inside `if (ShouldProcess(...))`.
- [ ] `ShouldProcess` is called unconditionally, regardless of the `Force`
      value.
- [ ] Every cmdlet that calls `ShouldContinue` exposes a `Force` parameter so
      automation callers can suppress the prompt.
- [ ] `Force` does not suppress validation attributes or `WriteError` calls.
- [ ] Running with `-Force -WhatIf` produces no side effects (the
      `ShouldProcess` guard still returns `false`).
- [ ] `Read-Host` is absent; all input flows through declared parameters.

## Related files

- [Confirmation — ShouldProcess and ShouldContinue](./confirmation-shouldprocess-shouldcontinue.md)
- [Confirmation and safety map](../references/confirmation-safety-map.md)

## Source anchors

- [Strongly encouraged development guidelines — Force parameter](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/strongly-encouraged-development-guidelines)
- [Users requesting confirmation](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/users-requesting-confirmation)
- [ShouldProcess method](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.cmdlet.shouldprocess)
- [ShouldContinue method](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.cmdlet.shouldcontinue)
- [Standard cmdlet parameter names and types — Force](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/standard-cmdlet-parameter-names-and-types)
- [about_CommonParameters — WhatIf and Confirm](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_commonparameters)
