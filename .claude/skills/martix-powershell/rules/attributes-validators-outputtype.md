# PowerShell attributes and validators

## Purpose

Select the right validation attribute for each parameter constraint, declare
`OutputType` against the concrete emitted type, and confirm verb compliance
before shipping a cmdlet. Wrong attribute choices disable tab completion,
generate cryptic validation errors, or admit invalid input; an inaccurate
`OutputType` breaks IDE property inference and `Show-Command` output.

## Default guidance

### Validation attribute selection

Apply validation attributes **above** the `[Parameter]` block, ordered loosest
to tightest so reviewers scan from coarse to fine:

1. `[ValidateNotNull]` / `[ValidateNotNullOrEmpty]` — null guard runs first
2. `[ValidateRange]` / `[ValidateLength]` / `[ValidateCount]` — bounds checks
3. `[ValidatePattern]` — regex format check
4. `[ValidateSet]` — enumerated value check (also enables tab completion)
5. `[ValidateScript]` — custom logic; last resort only

| Constraint type | Preferred attribute | Tab completion | Notes |
| --- | --- | --- | --- |
| Reject null only | `[ValidateNotNull]` | N/A | `null` invalid; empty string acceptable |
| Reject null and empty | `[ValidateNotNullOrEmpty]` | N/A | Default null guard for strings and collections; always stack first |
| Numeric or date bounds | `[ValidateRange(min, max)]` | N/A | Accepts `int`, `long`, `double`, `DateTime` |
| String length bounds | `[ValidateLength(min, max)]` | N/A | Bounds `string.Length` before other constraints run |
| Collection element count | `[ValidateCount(min, max)]` | N/A | Bounds array `Length` before processing |
| String format (regex) | `[ValidatePattern("regex")]` | N/A | Combine with `[ValidateNotNullOrEmpty]`; regex applied to the string value |
| Enumerated string values | `[ValidateSet("A", "B", "C")]` | ✅ Enables tab completion | Always prefer over `[ValidateScript]` for fixed value sets |
| Custom logic | `[ValidateScript({ ... })]` | ❌ No tab completion | Last resort only; slower than static attributes; comment the rationale |

Canonical stacking examples:

```csharp
// String parameter: null guard first, then bounded set
[ValidateNotNullOrEmpty]
[ValidateSet("Fast", "Standard", "Thorough")]
[Parameter(Mandatory = true, HelpMessage = "Select the processing mode.")]
public string Mode { get; set; } = "Standard";

// Numeric parameter: range only (null guard not applicable)
[ValidateRange(1, 100)]
[Parameter(HelpMessage = "Enter a count between 1 and 100.")]
public int Count { get; set; } = 10;

// String with format constraint: null guard and pattern
[ValidateNotNullOrEmpty]
[ValidatePattern(@"^\d{3}-\d{4}$")]
[Parameter(Mandatory = true, HelpMessage = "Enter the code in NNN-NNNN format.")]
public string Code { get; set; } = string.Empty;
```

### `OutputType` declaration

Declare `[OutputType(typeof(T))]` on the cmdlet class. The declared type must
match the **concrete type** passed to `WriteObject`; using a base class,
interface, or `object` erases IDE property inference and `Show-Command` type
display.

```csharp
// Single output type
[Cmdlet(VerbsCommon.Get, "Widget")]
[OutputType(typeof(Widget))]
public sealed class GetWidgetCommand : PSCmdlet { ... }

// Multiple output types scoped to parameter sets
[Cmdlet(VerbsCommon.Get, "Widget", DefaultParameterSetName = "ByName")]
[OutputType(typeof(Widget),        ParameterSetName = new[] { "ByName" })]
[OutputType(typeof(WidgetSummary), ParameterSetName = new[] { "Summarize" })]
public sealed class GetWidgetCommand : PSCmdlet { ... }

// Action cmdlet — normally no output; emits object only when -PassThru is given
[Cmdlet(VerbsCommon.Set, "Widget", SupportsShouldProcess = true)]
[OutputType(typeof(Widget))]
public sealed class SetWidgetCommand : PSCmdlet { ... }
```

### Approved verb compliance

Use a typed constant from a `Verbs*` class in the `[Cmdlet]` attribute. String
literals bypass compile-time validation and silently allow non-approved verbs:

```csharp
// Correct — typed constant validated at compile time
[Cmdlet(VerbsCommon.Get, "AxWidget")]

// Wrong — string literal; non-approved verb passes silently
[Cmdlet("Get", "AxWidget")]
```

Full verb selection guidance — including group semantics, paired inverse verbs,
and `Get-Verb` verification — is in
[Naming — approved verbs and cmdlet name contract](./naming-approved-verbs-cmdlet-contract.md).

## Avoid

- **Using `[ValidateScript]` when a static attribute fits.** `[ValidateScript]`
  runs a script block on every bound value, disables tab completion, and is
  significantly slower than static attributes. Use it only when no combination
  of `[ValidateSet]`, `[ValidateRange]`, or `[ValidatePattern]` covers the
  constraint; annotate the block with the reason.

- **Stacking `[ValidateNotNullOrEmpty]` after a bounds or pattern attribute.**
  The null guard must execute first. Placing it below `[ValidateRange]` or
  `[ValidatePattern]` means the bounds check receives a potentially null value.

- **Stacking contradictory bounds attributes on the same parameter.** For
  example, `[ValidateRange(1, 5)]` and `[ValidateRange(3, 10)]` both run
  independently, producing conflicting errors. Combine into one attribute.

- **Declaring `[OutputType(typeof(object))]` or
  `[OutputType(typeof(PSObject))]`.** These erase IDE type inference and break
  `Show-Command` property display. Declare the concrete type; if multiple types
  are emitted across parameter sets, scope each `[OutputType]` to its set with
  `ParameterSetName`.

- **Omitting `[OutputType]` entirely.** PowerShell uses this attribute for
  pipeline type inference and help generation. A missing `[OutputType]`
  degrades discoverability even though the cmdlet runs correctly.

- **Using a string literal for the verb** in `[Cmdlet("Get", "Widget")]`.
  String literals are not validated at compile time; typos and non-approved
  verbs slip through silently and generate a warning on `Import-Module`.

## Review checklist

- [ ] `[ValidateNotNullOrEmpty]` or `[ValidateNotNull]` is stacked first (above
      range, length, pattern, set, or script attributes) on every validated
      parameter.
- [ ] `[ValidateSet]` is used for all fixed enumerated-value constraints; no
      `[ValidateScript]` duplicates a check that a static attribute handles.
- [ ] `[ValidateRange]` is used for numeric or date bounds; `[ValidateLength]`
      for string length; `[ValidateCount]` for array element count.
- [ ] `[ValidateScript]` blocks, if present, are annotated with a comment
      explaining why no simpler attribute suffices.
- [ ] `[OutputType(typeof(T))]` is declared with a concrete type (`T` is not
      `object` or `PSObject`).
- [ ] Cmdlets with multiple parameter sets scope each `[OutputType]` to the
      correct `ParameterSetName`.
- [ ] The verb in `[Cmdlet]` uses a typed `Verbs*` constant (no string
      literals).
- [ ] `Import-Module -Verbose` produces no non-approved-verb warning.

## Related files

- [Naming — approved verbs and cmdlet name contract](./naming-approved-verbs-cmdlet-contract.md)
- [Parameters — declaration and validation](./parameters-declaration-validation.md)
- [Pipeline — output and streaming](./pipeline-output-streaming.md)
- [Attributes and validators map](../references/attributes-validators-map.md)
- [Parameters and validation map](../references/parameters-validation-map.md)

## Source anchors

- [Validating parameter input](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/validating-parameter-input)
- [OutputType attribute declaration](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/outputtype-attribute-declaration)
- [Approved verbs for PowerShell commands](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/approved-verbs-for-windows-powershell-commands)
- [ValidateSet attribute](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.validatesetattribute)
- [ValidateRange attribute](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.validaterangeattribute)
- [ValidatePattern attribute](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.validatepatternattribute)
- [ValidateScript attribute](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.validatescriptattribute)
- [ValidateLength attribute](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.validatelengthattribute)
- [ValidateCount attribute](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.validatecountattribute)
- [ValidateNotNull attribute](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.validatenotnullattribute)
- [ValidateNotNullOrEmpty attribute](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.validatenotnulloremptyattribute)
- [OutputType attribute](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.outputtypeattribute)
