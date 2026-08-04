# PowerShell parameters — sets and dynamic parameters

## Purpose

Protect the parameter set design contract and the `IDynamicParameters`
implementation pattern. Parameter sets that share all their parameters
produce an `AmbiguousParameterSetException` at bind time; dynamic parameters
wired without a fresh `RuntimeDefinedParameterDictionary` on each call
cause stale or duplicate parameter entries visible to callers.

## Default guidance

### Parameter set design

Declare parameter sets when a cmdlet must support mutually exclusive input
shapes (e.g., resolve by name versus resolve by identifier). Assign a set to
a parameter by setting `ParameterSetName` in the `[Parameter]` attribute.

- **Uniqueness rule.** Every parameter set must contain at least one
  `Mandatory = true` parameter that belongs exclusively to that set (the
  "discriminator"). Without a unique discriminator, PowerShell cannot
  determine which set the caller intended and raises
  `AmbiguousParameterSetException`.
- **Default set.** Declare the default set in the `[Cmdlet]` attribute so
  PowerShell knows which set to use when no discriminator is supplied. The
  name must exactly match one of the declared `ParameterSetName` values.

  ```csharp
  [Cmdlet(VerbsCommon.Get, "Widget", DefaultParameterSetName = "ByName")]
  public sealed class GetWidgetCommand : PSCmdlet
  ```

- **Shared parameters.** Parameters that appear in multiple sets require one
  `[Parameter(ParameterSetName = "...")]` stacked per set. Omit
  `ParameterSetName` entirely (or use `ParameterAttribute.AllParameterSets`)
  for parameters that apply to every set.

  ```csharp
  // Appears in both ByName and ById sets
  [Parameter(Mandatory = false, ParameterSetName = "ByName")]
  [Parameter(Mandatory = false, ParameterSetName = "ById")]
  public SwitchParameter Recurse { get; set; }
  ```

- **Active set at runtime.** Read `ParameterSetName` from `PSCmdlet` inside
  `ProcessRecord` to branch behavior per set.

  ```csharp
  protected override void ProcessRecord()
  {
      if (ParameterSetName == "ByName")
      {
          // ...
      }
      else
      {
          // ById path
      }
  }
  ```

- **Verify with `Get-Command -Syntax`.** After implementing the sets, run
  `Get-Command -Name Get-Widget -Syntax` against the loaded module to confirm
  the binder resolves all expected combinations.

### Dynamic parameters via `IDynamicParameters`

Add dynamic parameters when the parameter list itself must change based on
runtime state (e.g., the available parameters depend on the value of another
parameter or on provider capabilities). Implement `IDynamicParameters` on
the cmdlet class and return the dynamic parameter dictionary from
`GetDynamicParameters`.

- **Return a new dictionary on every call.** PowerShell may call
  `GetDynamicParameters` multiple times during tab completion and binding.
  Each call must return a freshly constructed
  `RuntimeDefinedParameterDictionary`; returning a cached instance causes
  stale entries or duplicate parameters.

  ```csharp
  public object GetDynamicParameters()
  {
      var dict = new RuntimeDefinedParameterDictionary();

      var attribs = new Collection<Attribute>
      {
          new ParameterAttribute
          {
              Mandatory = true,
              HelpMessage = "Specify the format when -Extended is set."
          },
          new ValidateSetAttribute("Json", "Xml", "Csv")
      };

      dict["Format"] = new RuntimeDefinedParameter("Format", typeof(string), attribs);
      return dict;
  }
  ```

- **Include `ParameterAttribute` in every dynamic parameter.** Every
  `RuntimeDefinedParameter` must have at least one `ParameterAttribute` in
  its `Attributes` collection. Omitting it makes the parameter invisible to
  the binder.
- **Stack validation attributes in the same order as static parameters.**
  Apply `ValidateNotNullOrEmpty` before range/pattern/set constraints, then
  `ValidateScript` last. See
  [Parameters — declaration and validation](./parameters-declaration-validation.md)
  for the prescribed order.
- **Retrieve dynamic parameter values in `ProcessRecord`.** Read the value
  from the `RuntimeDefinedParameter.Value` property after casting it to the
  declared type.

  ```csharp
  protected override void ProcessRecord()
  {
      if (MyInvocation.BoundParameters.TryGetValue("Format", out var raw))
      {
          string format = (string)raw;
          // ...
      }
  }
  ```

## Avoid

- **Parameter sets that share all parameters.** If every parameter in set A
  also appears in set B with no unique mandatory discriminator, the binder
  cannot resolve the set and throws `AmbiguousParameterSetException`.
- **Caching `RuntimeDefinedParameterDictionary` across calls.** Store the
  dictionary in a field and return it from `GetDynamicParameters` only once
  to cause stale entries. Always construct and return a new instance.
- **Returning `null` from `GetDynamicParameters`.** Return an empty
  `RuntimeDefinedParameterDictionary` when no dynamic parameters apply for
  the current context; returning `null` can produce unexpected bind errors.
- **Overusing dynamic parameters when static sets suffice.** Dynamic
  parameters increase implementation and testing complexity. Prefer additional
  static parameter sets unless the parameter list genuinely cannot be
  determined at compile time.
- **More than three or four parameter sets without a design review.** Each
  additional set multiplies the combinatoric test space. Refactor into
  multiple cmdlets or proxy commands before exceeding this threshold.
- **`DefaultParameterSetName` pointing to a non-existent set name.** A typo
  silently degrades tab completion and set resolution without a runtime error
  until binding fails.
- **Mixing `IDynamicParameters` with complex static set logic without
  documentation.** Note in the XML doc comment which static sets trigger which
  dynamic parameters and why.

## Review checklist

- [ ] Every parameter set has at least one `Mandatory = true` discriminator
      parameter that is unique to that set.
- [ ] `DefaultParameterSetName` in `[Cmdlet]` matches an existing set name
      exactly (case-sensitive).
- [ ] `GetDynamicParameters()` constructs and returns a new
      `RuntimeDefinedParameterDictionary` on every call.
- [ ] Every `RuntimeDefinedParameter` has a `ParameterAttribute` in its
      `Attributes` collection.
- [ ] Dynamic parameter values are read from
      `MyInvocation.BoundParameters` or `RuntimeDefinedParameter.Value`
      inside `ProcessRecord`, not `BeginProcessing`.
- [ ] `Get-Command -Name <Cmdlet> -Syntax` displays the expected syntax
      for all declared parameter sets.
- [ ] Static parameter sets are preferred over dynamic parameters unless a
      compile-time parameter list is genuinely impossible.

## Related files

- [Parameters — declaration and validation](./parameters-declaration-validation.md)
- [Parameters — pipeline binding](./parameters-pipeline-binding.md)
- [Advanced patterns — dynamic parameters and aliases](./advanced-dynamic-parameters-alias.md)
- [Parameters and validation map](../references/parameters-validation-map.md)

## Source anchors

- [Cmdlet parameter sets](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/cmdlet-parameter-sets)
- [Dynamic parameters](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/cmdlet-dynamic-parameters)
- [Parameter attribute declaration](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/parameter-attribute-declaration)
- [Types of cmdlet parameters](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/types-of-cmdlet-parameters)
- [IDynamicParameters interface](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.idynamicparameters)
- [RuntimeDefinedParameter class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.runtimedefinedparameter)
- [RuntimeDefinedParameterDictionary class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.runtimedefinedparameterdictionary)
- [ParameterAttribute class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.parameterattribute)
- [about_Functions_Advanced_Parameters (tier-3 mirror)](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_functions_advanced_parameters)
