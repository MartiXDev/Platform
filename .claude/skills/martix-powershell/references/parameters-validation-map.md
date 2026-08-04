# Parameters and validation map

## Purpose

Entry map for the parameters workstream. Covers `[Parameter]` attribute
options, validation attribute selection and stacking order, standard parameter
names, parameter set design, pipeline binding flags, wildcard support, and
dynamic parameter patterns.

---

## `[Parameter]` attribute options quick reference

| Option | Type | Effect |
| --- | --- | --- |
| `Mandatory = true` | `bool` | Runtime prompts if not supplied; binder passes `null`/default without it |
| `Position` | `int` | Enables positional (unnamed) binding; omit for named-only |
| `HelpMessage` | `string` | Shown in interactive mandatory-prompt; required on every `Mandatory = true` parameter |
| `ParameterSetName` | `string` | Assigns parameter to a named set; stack multiple `[Parameter]` blocks for shared parameters |
| `ValueFromPipeline` | `bool` | Binds each pipeline object to this parameter in `ProcessRecord` |
| `ValueFromPipelineByPropertyName` | `bool` | Binds a matching named property from the pipeline object per record |
| `ValueFromRemainingArguments` | `bool` | Collects unbound positional arguments into this parameter |

---

## Validation attribute selection and stacking order

Apply validation attributes **above** the `[Parameter]` block, ordered loosest
to tightest so reviewers can scan from coarse to fine:

1. `[ValidateNotNull]` / `[ValidateNotNullOrEmpty]` — null guard runs first
2. `[ValidateRange]` / `[ValidateLength]` / `[ValidateCount]` — bounds checks
3. `[ValidatePattern]` — regex format check
4. `[ValidateSet]` — enumerated value check (also enables tab completion)
5. `[ValidateScript]` — custom logic; last resort only

| Constraint type | Preferred attribute | Notes |
| --- | --- | --- |
| Enumerated string values | `[ValidateSet]` | Enables tab completion; prefer over `ValidateScript` always |
| Numeric / date bounds | `[ValidateRange]` | Covers `int`, `long`, `double`, `DateTime` |
| String format (regex) | `[ValidatePattern]` | Combine with `ValidateNotNullOrEmpty` |
| Collection element count | `[ValidateCount]` | Bounds array `Length` before processing |
| String length | `[ValidateLength]` | Bounds `string.Length` before processing |
| Reject null only | `[ValidateNotNull]` | When `null` invalid but empty string is acceptable |
| Reject null and empty | `[ValidateNotNullOrEmpty]` | Default guard for string and collection parameters |
| Custom logic | `[ValidateScript]` | Last resort; no tab completion; slower than static attributes |

---

## Standard parameter names (most common)

| Standard name | .NET type | Semantics |
| --- | --- | --- |
| `Path` | `string[]` | File-system path; supports wildcards |
| `LiteralPath` | `string[]` | File-system path; no wildcard expansion; alias `PSPath` |
| `Name` | `string` / `string[]` | Identity or display name of a resource |
| `InputObject` | `PSObject` or concrete type | Object accepted directly from pipeline |
| `Force` | `SwitchParameter` | Override restrictions or confirmation prompts |
| `PassThru` | `SwitchParameter` | Return processed object; action cmdlets are quiet by default |
| `Credential` | `PSCredential` | Authentication credential; pair with `[Credential]` attribute |
| `ComputerName` | `string[]` | Remote target; aliases `CN`, `MachineName` |
| `Recurse` | `SwitchParameter` | Process child containers recursively |
| `Filter` | `string` | Provider-supplied wildcard filter |
| `Include` | `string[]` | Wildcard patterns to include |
| `Exclude` | `string[]` | Wildcard patterns to exclude |

Full list: [Standard cmdlet parameter names and types](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/standard-cmdlet-parameter-names-and-types).

---

## Parameter set design rules

- Every set must have at least one `Mandatory = true` parameter that appears in
  that set only (the "discriminator"). Without a unique discriminator,
  `AmbiguousParameterSetException` is thrown at bind time.
- Declare `DefaultParameterSetName` in `[Cmdlet]`; the name must exactly match
  one declared set.
- Parameters shared across sets: stack one `[Parameter(ParameterSetName = "...")]`
  attribute per set; or omit `ParameterSetName` to appear in all sets.
- Read the active set at runtime via `ParameterSetName` (PSCmdlet property)
  inside `ProcessRecord`.
- Validate with `Get-Command -Name <Cmdlet> -Syntax` after loading the module.

---

## Pipeline binding precedence

| Flag combination on a parameter | What the binder does |
| --- | --- |
| `ValueFromPipeline = true` only | Binds the whole pipeline object to this parameter |
| `ValueFromPipelineByPropertyName = true` only | Binds a matching named property from the pipeline object |
| Both flags on the same parameter | Property-name match first; falls back to whole-object binding |
| Neither flag | Never bound from pipeline; must be explicitly supplied |

**Key constraint:** At most one parameter per parameter set may carry
`ValueFromPipeline = true`. Two in the same set causes a metadata exception
at module load.

**Wildcard parameters:** Declare `[SupportsWildcards]` on any `string`
parameter that accepts wildcard patterns and evaluate with `WildcardPattern`
in `ProcessRecord`.

---

## Dynamic parameters (`IDynamicParameters`)

Prefer **separate parameters class** for compiled cmdlets (reflects as static
parameters do). Use **`RuntimeDefinedParameterDictionary`** when parameter
names or types cannot be fixed at compile time.

**Critical constraint:** `GetDynamicParameters()` must return a **fresh object
on every call** — never cache and return the same instance. The runtime calls
this method multiple times during tab completion and binding.

---

## Rule coverage

| Rule file | Topics |
| --- | --- |
| [`rules/parameters-declaration-validation.md`](../rules/parameters-declaration-validation.md) | `[Parameter]` options, validation attribute selection and stacking, standard names, `[Alias]` usage |
| [`rules/parameters-sets-dynamic.md`](../rules/parameters-sets-dynamic.md) | Parameter set design, discriminator requirements, `DefaultParameterSetName`, `IDynamicParameters`, `RuntimeDefinedParameterDictionary` |
| [`rules/parameters-pipeline-binding.md`](../rules/parameters-pipeline-binding.md) | `ValueFromPipeline`, `ValueFromPipelineByPropertyName`, binding precedence, `[SupportsWildcards]`, `WildcardPattern` |
| [`rules/naming-parameter-and-common-names.md`](../rules/naming-parameter-and-common-names.md) | Full standard parameter name table, common parameter injection list, `[Credential]` attribute, `LiteralPath`/`PSPath` pattern |
| [`rules/naming-approved-verbs-cmdlet-contract.md`](../rules/naming-approved-verbs-cmdlet-contract.md) | Approved verb selection, verb group semantics, paired inverse verbs, vendor noun prefix |

---

## Related files

- [Parameters — declaration and validation rule](../rules/parameters-declaration-validation.md)
- [Parameters — sets and dynamic parameters rule](../rules/parameters-sets-dynamic.md)
- [Parameters — pipeline binding rule](../rules/parameters-pipeline-binding.md)
- [Pipeline map](./pipeline-map.md) — pipeline method placement for bound parameters
- [Advanced patterns map](./advanced-patterns-map.md) — `IDynamicParameters` deep dive
- [Attributes and validators map](./attributes-validators-map.md) — validation attribute API reference
- [Source index and guardrails](./doc-source-index.md)

## Source anchors

- [Parameter attribute declaration](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/parameter-attribute-declaration)
- [Validating parameter input](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/validating-parameter-input)
- [Standard cmdlet parameter names and types](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/standard-cmdlet-parameter-names-and-types)
- [Cmdlet parameter sets](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/cmdlet-parameter-sets)
- [Types of cmdlet parameters](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/types-of-cmdlet-parameters)
- [Dynamic parameters](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/cmdlet-dynamic-parameters)
- [Strongly encouraged development guidelines](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/strongly-encouraged-development-guidelines)
- [ParameterAttribute class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.parameterattribute)
- [IDynamicParameters interface](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.idynamicparameters)
- [about_Functions_Advanced_Parameters (tier-3 mirror)](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_functions_advanced_parameters)
