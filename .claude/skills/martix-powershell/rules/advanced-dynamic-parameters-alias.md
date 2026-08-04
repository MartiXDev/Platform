# PowerShell advanced patterns — dynamic parameters and aliases

## Purpose

Protect the `IDynamicParameters` implementation contract and the `[Alias]`
attribute usage pattern for compiled cmdlets and advanced functions. Dynamic
parameters that share a stale dictionary across calls produce binding failures
that are silent at authoring time; overused or conflicting aliases erode tab
completion and discoverability.

## Default guidance

### Dynamic parameters

Compiled cmdlets declare dynamic parameters by implementing
`System.Management.Automation.IDynamicParameters` alongside the base class
declaration, then overriding `GetDynamicParameters()`:

```csharp
public class GetItemExCommand : PSCmdlet, IDynamicParameters
{
    [Parameter] public SwitchParameter IncludeHidden { get; set; }

    public object GetDynamicParameters()
    {
        if (IncludeHidden)
        {
            _dynamicParams = new HiddenItemDynamicParameters();
            return _dynamicParams;
        }
        return null;
    }

    private HiddenItemDynamicParameters _dynamicParams;
}

public class HiddenItemDynamicParameters
{
    [Parameter]
    [ValidateSet("All", "System", "Hidden")]
    public string Filter { get; set; }
}
```

Two implementation patterns are available; choose based on the scenario:

- **Separate parameters class** (preferred for compiled cmdlets): define a
  companion class with public properties decorated with `[Parameter]` and any
  validation attributes. The PowerShell runtime reflects this class exactly as
  it reflects static parameter properties. This is the pattern shown in the
  Microsoft docs and is idiomatic for compiled cmdlets.

- **`RuntimeDefinedParameterDictionary`** (required for advanced functions,
  optional for compiled): build parameter entries programmatically. Use when
  parameter names, types, or attribute values must be determined at runtime
  from external data rather than fixed at compile time.

Advanced functions use the `DynamicParam {}` block and must use
`RuntimeDefinedParameterDictionary`. The runtime behavior is equivalent:
PowerShell calls `GetDynamicParameters()` (compiled) or evaluates the
`DynamicParam {}` block (script) each time the command is parsed, so neither
may return a cached object.

**`GetDynamicParameters()` must return a fresh object on every call.** The
runtime evaluates this method during parameter binding; returning a previously
constructed instance can cause stale attribute state or previously resolved
values to persist across invocations.

**Dynamic parameters require `[Parameter]` in their attribute collection.**
A property on a dynamic parameters class without `[Parameter]` is invisible
to the PowerShell runtime; a `RuntimeDefinedParameter` without a
`ParameterAttribute` in its `Attributes` collection is ignored.

**Access dynamic parameter values by casting the stored context field**, not
by re-calling `GetDynamicParameters()`. Store the returned context in a
field during `GetDynamicParameters()` and read from that field in
`ProcessRecord`.

### Aliases

The `[Alias]` attribute on a parameter property adds alternative names that
the runtime treats as equivalent to the primary name:

```csharp
[Parameter(Mandatory = true)]
[Alias("ServiceName")]
public string Name { get; set; }
```

Follow the strongly-encouraged guideline: use the **standard or generic name**
as the primary parameter name and the **more specific name as the alias**. The
example above uses the standard `Name` as the primary and the specific
`ServiceName` as the alias — not the reverse. This keeps parameter names
consistent across cmdlets while allowing domain-specific shorthand.

Limit aliases to **one or two per parameter**. Aliases participate in the
runspace-wide alias table; a conflict with an existing alias on a different
parameter (or on a provider cmdlet's dynamic parameter) causes binding errors
that are difficult to diagnose.

### ScriptBlock-valued parameters

When a parameter accepts a `ScriptBlock`, invoke it inside `ProcessRecord`
using `PSCmdlet.InvokeCommand.InvokeScript`. This runs the block in the
caller's session state and handles stream redirection correctly:

```csharp
protected override void ProcessRecord()
{
    if (FilterScript != null)
    {
        var result = InvokeCommand.InvokeScript(
            false,
            FilterScript,
            null,
            InputObject);
    }
}
```

This is a compiled-only concern; advanced functions invoke scriptblocks with
the call operator (`& $FilterScript $InputObject`) in `process {}`, which uses
the function's own scope rather than an explicit context.

## Avoid

- **Caching and returning the same dynamic parameter object across calls.**
  The PowerShell runtime may call `GetDynamicParameters()` multiple times per
  command parse. A shared instance carries state from a previous parse cycle,
  causing incorrect binding or tab completion.

- **Omitting `[Parameter]` from dynamic parameter properties or
  `RuntimeDefinedParameter` attribute collections.** The property or entry is
  silently ignored by the runtime.

- **Adding more than one or two `[Alias]` values per parameter.** Each alias
  occupies a slot in the runspace alias table. An alias that duplicates a
  cmdlet name, parameter name, or provider-added alias causes a binding
  exception at runtime.

- **Using an alias as a substitute for a properly named parameter.** If the
  parameter concept maps to a standard name (`Name`, `Path`, `InputObject`,
  `Credential`), use the standard name directly without an alias. Aliases are
  for domain-specific shorthand on top of an already-correct primary name.

- **Invoking `ScriptBlock.Invoke()` directly inside compiled cmdlets.** This
  bypasses stream handling and runs outside the cmdlet's execution context,
  losing error and verbose stream redirection.

- **Using dynamic parameters when static parameter sets suffice.** Dynamic
  parameters are harder to document, test, and discover. Prefer parameter sets
  unless the parameter's existence must be conditional on another parameter's
  value.

## Review checklist

- [ ] `GetDynamicParameters()` returns a fresh object on every call; no
      instance is stored and re-returned.
- [ ] Every dynamic parameter property (separate class pattern) carries a
      `[Parameter]` attribute; every `RuntimeDefinedParameter` entry carries a
      `ParameterAttribute` in its `Attributes` collection.
- [ ] The dynamic parameter context field is stored during
      `GetDynamicParameters()` and read in `ProcessRecord`, not re-fetched.
- [ ] Each parameter carries at most one or two `[Alias]` values; aliases
      are widely understood shorthand, not replacements for proper parameter
      naming.
- [ ] `ScriptBlock`-valued parameters are invoked via
      `PSCmdlet.InvokeCommand.InvokeScript` in `ProcessRecord`, not via
      `ScriptBlock.Invoke()` or in `BeginProcessing`.
- [ ] Dynamic parameters are used only where a static parameter set is
      insufficient; rationale is commented when dynamic parameters are chosen.

## Related files

- [Parameters — sets and dynamic parameters](./parameters-sets-dynamic.md)
- [Parameters — declaration and validation](./parameters-declaration-validation.md)
- [Advanced patterns map](../references/advanced-patterns-map.md)
- [Source index and guardrails](../references/doc-source-index.md)

## Source anchors

- [Dynamic parameters](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/cmdlet-dynamic-parameters)
- [How to declare dynamic parameters](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/how-to-declare-dynamic-parameters)
- [RuntimeDefinedParameter class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.runtimedefinedparameter)
- [RuntimeDefinedParameterDictionary class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.runtimedefinedparameterdictionary)
- [IDynamicParameters interface](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.idynamicparameters)
- [Strongly encouraged development guidelines — aliases and standard parameter names](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/strongly-encouraged-development-guidelines)
- [about_Functions_Advanced_Parameters — DynamicParam block (tier-3 mirror)](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_functions_advanced_parameters)
