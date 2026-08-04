# PowerShell parameters — pipeline binding

## Purpose

Protect the `ValueFromPipeline` and `ValueFromPipelineByPropertyName` binding
contract, wildcard support declaration, and the correct processing-method
placement for pipeline-bound values. A parameter declared with
`ValueFromPipeline = true` but consumed only in `BeginProcessing` silently
receives its default value, not the piped object; the pipeline appears to work
but processes nothing.

## Default guidance

### `ValueFromPipeline`

Declare `ValueFromPipeline = true` on the parameter that accepts each
pipeline object as it arrives. The parameter receives one object per
`ProcessRecord` invocation.

- **Override `ProcessRecord`.** This is the only method where a
  `ValueFromPipeline` parameter holds the piped value. Override it
  unconditionally whenever any parameter carries this flag.
- **One per parameter set.** At most one parameter per parameter set may
  carry `ValueFromPipeline = true`. PowerShell raises a metadata exception at
  cmdlet load time if two parameters in the same set both declare it.
- **Standard name.** Name the pass-through pipeline parameter `InputObject`
  when it accepts the full incoming object without property-based matching.
  Use the concrete type when the cmdlet expects a specific object shape.

  ```csharp
  [Parameter(Mandatory = true, ValueFromPipeline = true,
      HelpMessage = "Widget objects to process.")]
  public Widget[] InputObject { get; set; }

  protected override void ProcessRecord()
  {
      foreach (var item in InputObject)
      {
          // process item
      }
  }
  ```

### `ValueFromPipelineByPropertyName`

Declare `ValueFromPipelineByPropertyName = true` on parameters whose names
(or aliases) match properties on expected pipeline objects. Multiple
parameters in the same set may carry this flag simultaneously; each binds
independently by name match.

- **Align names with expected object shapes.** The parameter name (or one of
  its `[Alias]` values) must match a property name on the pipeline object for
  binding to occur. Add an `[Alias]` to the parameter when the object
  property name differs from the standard parameter name.

  ```csharp
  // Binds to objects that have a "PSPath" or "LiteralPath" property
  [Parameter(Mandatory = true, ValueFromPipelineByPropertyName = true,
      HelpMessage = "Literal path to the file; wildcards not accepted.")]
  [Alias("PSPath")]
  public string[] LiteralPath { get; set; }
  ```

- **Still consume in `ProcessRecord`.** `ValueFromPipelineByPropertyName`
  parameters are populated per-record, exactly like `ValueFromPipeline`
  parameters. Always override `ProcessRecord`.

### Combining both flags

A single parameter may declare both `ValueFromPipeline = true` and
`ValueFromPipelineByPropertyName = true`. When both are set:

- The binder tries property-name matching first.
- If no property matches, the binder falls back to binding the whole object
  to the parameter (value binding).

Use this combination only when both behaviours are intentionally supported
and document the intent in a comment on the parameter property.

### Wildcard support

Declare `[SupportsWildcards]` on any `string` parameter that accepts wildcard
patterns. The attribute has no runtime effect on its own — it signals intent
to callers and tools — but the cmdlet is responsible for evaluating the
pattern using `WildcardPattern`.

```csharp
[Parameter(Mandatory = true, Position = 0,
    HelpMessage = "Name of the resource; wildcards accepted.")]
[SupportsWildcards]
[ValidateNotNullOrEmpty]
public string Name { get; set; }

protected override void ProcessRecord()
{
    var pattern = WildcardPattern.Get(Name, WildcardOptions.IgnoreCase);
    foreach (var resource in GetAllResources())
    {
        if (pattern.IsMatch(resource.Name))
        {
            WriteObject(resource);
        }
    }
}
```

Use `WildcardPattern.ContainsWildcardCharacters(Name)` to short-circuit the
pattern evaluation when callers supply a literal name without wildcard
characters.

### Binding precedence summary

| Flag combination | What the binder does |
| --- | --- |
| `ValueFromPipeline = true` only | Binds the whole pipeline object to the parameter |
| `ValueFromPipelineByPropertyName = true` only | Binds a matching named property from the pipeline object |
| Both flags on the same parameter | Tries property-name match first; falls back to whole-object binding |
| Neither flag | Parameter is never bound from the pipeline; must be supplied explicitly |

## Avoid

- **Reading `ValueFromPipeline` parameters in `BeginProcessing`.** At
  `BeginProcessing` time, these parameters hold only their default value or
  an explicitly passed value — not any piped value. Piped objects have not
  yet arrived. Always consume them in `ProcessRecord`.
- **More than one `ValueFromPipeline = true` parameter per parameter set.**
  PowerShell enforces one-per-set at metadata validation time and raises an
  error at module load.
- **Buffering piped objects into a list in `ProcessRecord` and processing in
  `EndProcessing` without documented intent.** This breaks streaming and
  increases memory pressure. Use `EndProcessing` for deferred batch work only
  when the algorithm genuinely requires all records (e.g., sorting, grouping),
  and comment why.
- **Wildcard-capable parameters without `[SupportsWildcards]`.** Tab
  completion and callers cannot discover that the parameter accepts wildcard
  patterns. Always declare the attribute even though it is advisory.
- **Declaring `[SupportsWildcards]` without implementing `WildcardPattern`
  evaluation.** The attribute is a promise; honour it in `ProcessRecord`.
- **`ValueFromPipelineByPropertyName` with no `[Alias]` when the expected
  object property name differs from the parameter name.** Binding will silently
  fail because no property matches.
- **`ValueFromPipeline = true` on a non-array parameter when multiple objects
  may arrive.** Declare the parameter as an array type (`string[]`,
  `Widget[]`) or process each call in `ProcessRecord` knowing one object
  arrives per call. Mismatches cause type coercion errors.

## Review checklist

- [ ] Every `ValueFromPipeline = true` parameter is consumed in `ProcessRecord`,
      not in `BeginProcessing` or `EndProcessing`.
- [ ] `ProcessRecord` is overridden whenever any parameter carries
      `ValueFromPipeline = true` or `ValueFromPipelineByPropertyName = true`.
- [ ] At most one parameter per parameter set carries `ValueFromPipeline = true`.
- [ ] `ValueFromPipelineByPropertyName` parameter names (or their `[Alias]`
      values) align with expected pipeline object property names.
- [ ] Wildcard-accepting string parameters declare `[SupportsWildcards]`.
- [ ] Parameters that declare `[SupportsWildcards]` evaluate the pattern with
      `WildcardPattern` in `ProcessRecord`.
- [ ] Combining both `ValueFromPipeline` and `ValueFromPipelineByPropertyName`
      on the same parameter is intentional and documented.
- [ ] `EndProcessing` batch buffering is documented and justified.

## Related files

- [Parameters — declaration and validation](./parameters-declaration-validation.md)
- [Parameters — sets and dynamic parameters](./parameters-sets-dynamic.md)
- [Pipeline — input processing methods](./pipeline-input-processing-methods.md)
- [Parameters and validation map](../references/parameters-validation-map.md)

## Source anchors

- [Types of cmdlet parameters](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/types-of-cmdlet-parameters)
- [Strongly encouraged development guidelines](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/strongly-encouraged-development-guidelines)
- [Input processing methods](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/input-processing-methods)
- [Parameter attribute declaration](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/parameter-attribute-declaration)
- [Standard cmdlet parameter names and types](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/standard-cmdlet-parameter-names-and-types)
- [ParameterAttribute class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.parameterattribute)
- [SupportsWildcardsAttribute class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.supportswildcardsattribute)
- [WildcardPattern class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.wildcardpattern)
- [about_Functions_Advanced_Parameters (tier-3 mirror)](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_functions_advanced_parameters)
- [about_Functions_Advanced_Methods (tier-3 mirror)](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_functions_advanced_methods)
