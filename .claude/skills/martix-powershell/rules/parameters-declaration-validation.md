# PowerShell parameters — declaration and validation

## Purpose

Protect the `[Parameter]` attribute declaration, validation attribute
selection and stacking order, standard parameter names, and alias usage. A
wrong attribute option silently accepts invalid input; a non-standard name
breaks discoverability and tab-completion that callers expect.

## Default guidance

### `[Parameter]` attribute options

Declare each cmdlet parameter as a public property of the cmdlet class and
apply `[Parameter]` to every property that must be visible to the parameter
binder.

- Set `Mandatory = true` on every parameter the cmdlet cannot function
  without. Omitting it makes the parameter optional by default; PowerShell
  prompts interactively for any mandatory parameter that is not supplied.
- Set `HelpMessage` on every `Mandatory = true` parameter. The runtime
  displays this string in the interactive prompt; without it, the prompt
  shows a blank message.
- Assign `Position` only to the one or two parameters most naturally
  supplied positionally. Parameters without an explicit `Position` are
  named-only. Positional parameters improve interactive usability but must
  not conflict within the same parameter set.
- `ValueFromPipeline` and `ValueFromPipelineByPropertyName` are covered in
  [Parameters — pipeline binding](./parameters-pipeline-binding.md); declare
  them here in the `[Parameter]` block and consume them in `ProcessRecord`.

```csharp
[Parameter(Mandatory = true, Position = 0, HelpMessage = "Name of the target resource.")]
[ValidateNotNullOrEmpty]
public string Name { get; set; }
```

### Validation attribute stacking order

Apply validation attributes directly above the `[Parameter]` block in this
order so reviewers can scan from loosest constraint to tightest:

1. `[ValidateNotNull]` or `[ValidateNotNullOrEmpty]` — reject null / empty
   before any other constraint runs.
2. Range or length constraints — `[ValidateRange]`, `[ValidateLength]`,
   `[ValidateCount]`.
3. Format constraints — `[ValidatePattern]`.
4. Enumerated value constraints — `[ValidateSet]`.
5. Custom logic last — `[ValidateScript]` only when no simpler attribute fits.

```csharp
[Parameter(Mandatory = true, HelpMessage = "Maximum retry count (1–10).")]
[ValidateRange(1, 10)]
public int MaxRetry { get; set; }
```

Validation attribute selection rules:

| Constraint type | Preferred attribute | Notes |
| --- | --- | --- |
| Enumerated string values | `[ValidateSet]` | Enables tab completion; prefer over `ValidateScript` |
| Numeric bounds | `[ValidateRange]` | Covers `int`, `long`, `double`, `DateTime` |
| String format | `[ValidatePattern]` | Regex-based; combine with `ValidateNotNullOrEmpty` |
| Collection count | `[ValidateCount]` | Bounds array `Length` before processing |
| String length | `[ValidateLength]` | Bounds `string.Length` before processing |
| Non-null | `[ValidateNotNull]` | Use when `null` is invalid but empty string is acceptable |
| Non-null and non-empty | `[ValidateNotNullOrEmpty]` | Default guard for string and collection parameters |
| Custom logic | `[ValidateScript]` | Last resort; no tab completion; slower than static attributes |

### Standard parameter names

Use the Microsoft-defined standard names for concepts that appear across
cmdlets. This table lists the most common; the full list is in the source
anchor below.

| Concept | Standard name | .NET type |
| --- | --- | --- |
| File system path (supports wildcard) | `Path` | `string[]` |
| Literal file system path (no wildcard) | `LiteralPath` | `string[]` |
| Object identity or display name | `Name` | `string[]` |
| Pipeline pass-through input | `InputObject` | `PSObject` or concrete type |
| Suppress confirmation prompts | `Force` | `SwitchParameter` |
| Return the processed object | `PassThru` | `SwitchParameter` |
| Authentication credentials | `Credential` | `PSCredential` |
| Remote machine target | `ComputerName` | `string[]` |

### Switch parameters — binary flags

Declare any parameter that represents a binary on/off flag as `SwitchParameter`
in compiled cmdlets, or `[switch]` in advanced functions. Never use `bool` or
`[bool]` for this purpose.

`SwitchParameter` has three advantages over `bool`: it defaults to `$false` when
omitted (no explicit value required), it participates in standard PowerShell
`-ParameterName` syntax without requiring `-Flag:$true` on the command line, and
it exposes `.IsPresent` for unambiguous presence checking.

```csharp
// Compiled — correct
[Parameter]
public SwitchParameter DryRun { get; set; }

// Compiled — wrong: caller must supply -DryRun:$true
[Parameter]
public bool DryRun { get; set; }
```

```powershell
# Advanced function — correct
param([switch]$DryRun)

# Advanced function — wrong: caller must supply -DryRun $true
param([bool]$DryRun)
```

### Aliases

Apply `[Alias]` sparingly.One or two short, widely understood aliases per
parameter are acceptable. Aliases must not conflict with other parameters in
the same cmdlet or with established PowerShell conventions.

```csharp
[Parameter(Mandatory = true, ValueFromPipelineByPropertyName = true)]
[Alias("PSPath")]
public string[] LiteralPath { get; set; }
```

## Avoid

- Using `[ValidateScript]` when `[ValidateSet]`, `[ValidateRange]`, or
  `[ValidatePattern]` fits the constraint — `[ValidateScript]` disables tab
  completion for `[ValidateSet]` candidates and runs slower.
- Omitting `Mandatory = true` on parameters the cmdlet cannot work without —
  the binder silently passes `null` or the default value, producing misleading
  runtime failures.
- Positional conflicts within a parameter set — two parameters sharing the
  same `Position` value cause a `MetadataException` at cmdlet load time.
- Non-standard names for common concepts (e.g., `FilePath` instead of `Path`,
  `Computer` instead of `ComputerName`) — callers cannot predict parameter
  names across cmdlets.
- Stacking `[ValidateNotNullOrEmpty]` after a range or set constraint — the
  null guard must run first so later constraints receive a valid value.
- Declaring `[Parameter(Mandatory = false)]` explicitly — `false` is the
  default and adds noise without value.
- Omitting `HelpMessage` on `Mandatory = true` parameters — the interactive
  prompt appears with a blank message, giving callers no guidance.
- Adding more than two aliases per parameter — multiple aliases reduce
  discoverability and create maintenance burden.
- Declaring binary flag parameters as `bool` or `[bool]` — callers must supply
  `-Flag:$true` (compiled) or `-Flag $true` (advanced function) instead of just
  `-Flag`, breaking PowerShell's standard switch-flag convention and forcing
  unnecessary argument passing.

## Review checklist

- [ ] Every required parameter carries `Mandatory = true`.
- [ ] `HelpMessage` is present on every `Mandatory = true` parameter.
- [ ] Standard parameter names are used for all common concepts.
- [ ] Validation attributes follow the prescribed stacking order (null guard
      → range/length/count → format → set → script).
- [ ] The validation attribute chosen is the simplest correct fit for the
      constraint.
- [ ] No two parameters in the same parameter set share a `Position` value.
- [ ] Aliases are minimal (≤ 2 per parameter) and do not conflict.
- [ ] `[ValidateScript]` is absent unless no simpler attribute fits and the
      rationale is commented.
- [ ] Binary flag parameters are declared as `SwitchParameter` (compiled) or
      `[switch]` (advanced functions), not `bool`.

## Related files

- [Parameters — sets and dynamic parameters](./parameters-sets-dynamic.md)
- [Parameters — pipeline binding](./parameters-pipeline-binding.md)
- [Attributes and validators](./attributes-validators-outputtype.md)
- [Parameters and validation map](../references/parameters-validation-map.md)
- [Attributes and validators map](../references/attributes-validators-map.md)

## Source anchors

- [Parameter attribute declaration](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/parameter-attribute-declaration)
- [Validating parameter input](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/validating-parameter-input)
- [Standard cmdlet parameter names and types](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/standard-cmdlet-parameter-names-and-types)
- [Types of cmdlet parameters](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/types-of-cmdlet-parameters)
- [Strongly encouraged development guidelines](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/strongly-encouraged-development-guidelines)
- [ParameterAttribute class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.parameterattribute)
- [ValidateSetAttribute class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.validatesetattribute)
- [ValidateRangeAttribute class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.validaterangeattribute)
- [ValidatePatternAttribute class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.validatepatternattribute)
- [ValidateScriptAttribute class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.validatescriptattribute)
- [AliasAttribute class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.aliasattribute)
- [about_Functions_Advanced_Parameters (tier-3 mirror)](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_functions_advanced_parameters)
