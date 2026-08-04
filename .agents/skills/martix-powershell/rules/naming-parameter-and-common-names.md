# PowerShell naming — parameter and common names

## Purpose

Protect parameter naming choices for compiled PowerShell cmdlets. Using a
non-standard name for a well-known concept breaks user expectations and
discoverability; reusing a standard name for a different concept is a confusing
contract violation. This rule covers the standard parameter name table, the
parameter naming conventions that apply across all cmdlets, and the common
parameters that PowerShell injects automatically.

## Default guidance

- **Prefer the standard parameter name when the semantic matches exactly.**
  The standard parameter name table in the Microsoft docs defines names,
  types, and semantics for common parameter concepts. Deviating from a
  standard name forces users to learn a module-specific vocabulary for a
  universal concept.

  | Standard name | .NET type | Semantics |
  | --- | --- | --- |
  | `Path` | `string[]` | File-system path; supports wildcards |
  | `LiteralPath` | `string[]` | File-system path; no wildcard expansion; alias `PSPath` |
  | `Name` | `string` | Name of a resource or item |
  | `InputObject` | `PSObject` (or specific type) | Object accepted from the pipeline |
  | `Force` | `SwitchParameter` | Override restrictions, prompts, or read-only checks |
  | `PassThru` | `SwitchParameter` | Return the processed object; cmdlets that do not return a value by default use this |
  | `Credential` | `PSCredential` | Authentication credential; pair with `[Credential]` attribute |
  | `Recurse` | `SwitchParameter` | Process child containers recursively |
  | `Filter` | `string` | Provider-supplied wildcard filter |
  | `Include` | `string[]` | Wildcard patterns specifying items to include |
  | `Exclude` | `string[]` | Wildcard patterns specifying items to exclude |
  | `ComputerName` | `string[]` | Target computer(s) for remote operations; alias `CN`, `MachineName` |

- **Use PascalCase for all parameter property names.** PowerShell is
  case-insensitive at the command line, but the property definition in C#
  must be PascalCase to match the SDK documentation and naming guidance.

  ```csharp
  [Parameter(Mandatory = true)]
  public string Name { get; set; } = string.Empty;
  ```

- **Use singular names unless the parameter always and exclusively accepts
  multiple values.** Prefer `Name` over `Names` even when the type is
  `string[]`; the standard table uses singular names for array parameters.
  Use `InputObject` (singular) for pipeline input even when processing multiple
  objects via `ValueFromPipeline`.

- **Apply `[Credential]` attribute alongside the `PSCredential` type** to
  enable the `[PSCredential]` type transformer. This allows users to pass a
  plain string (username) that PowerShell converts into a `PSCredential` by
  prompting for the password interactively.

  ```csharp
  [Parameter]
  [Credential]
  public PSCredential? Credential { get; set; }
  ```

- **Never declare any of the common parameters as explicit parameters.**
  PowerShell injects the following automatically when the cmdlet derives from
  `PSCmdlet` or declares `[CmdletBinding()]`:

  `Verbose`, `Debug`, `ErrorAction`, `ErrorVariable`, `WarningAction`,
  `WarningVariable`, `OutBuffer`, `OutVariable`, `PipelineVariable`,
  `InformationAction`, `InformationVariable`, `WhatIf`, `Confirm`

  Declaring any of these as an explicit parameter causes a runtime error
  ("The member already exists in the class").

- **Use `LiteralPath` with alias `PSPath` and bind it
  `ValueFromPipelineByPropertyName`** whenever a path parameter must not
  expand wildcards. Pair `LiteralPath` with a wildcard-enabled `Path`
  parameter in the same cmdlet using separate parameter sets:

  ```csharp
  [Parameter(Mandatory = true, ParameterSetName = "Path",
             ValueFromPipelineByPropertyName = true)]
  public string[] Path { get; set; } = Array.Empty<string>();

  [Parameter(Mandatory = true, ParameterSetName = "LiteralPath",
             ValueFromPipelineByPropertyName = true)]
  [Alias("PSPath")]
  public string[] LiteralPath { get; set; } = Array.Empty<string>();
  ```

- **Add `HelpMessage` to all mandatory parameters.** The message is shown
  when a user runs the cmdlet without providing the required value and
  PowerShell prompts interactively. Keep it a single, actionable sentence.

  ```csharp
  [Parameter(Mandatory = true, HelpMessage = "Enter the widget name.")]
  public string Name { get; set; } = string.Empty;
  ```

## Avoid

- **Using a non-standard name for a concept that has a standard name.**
  For example, use `Force` not `Override`, `PassThru` not `ReturnObject`,
  and `Credential` not `UserCredential`.

- **Using a standard name for a concept that does not match its documented
  semantics.** Using `Force` to mean "faster, less thorough processing"
  rather than "override a restriction or prompt" violates the cross-module
  contract that users build on.

- **Declaring `Verbose`, `Debug`, `WhatIf`, `Confirm`, or any other
  common parameter.** These are injected by the runtime; declaring them
  causes a startup error.

- **Using abbreviations or acronyms in parameter names.** `ComputerName`
  not `CN` as the primary name (but `CN` is a documented alias for
  `ComputerName`). Abbreviations become unique knowledge burdens.

- **Using plural property names for standard-table parameters that are
  defined as singular.** `Name` not `Names`; `ComputerName` not
  `ComputerNames` (even though the type is `string[]`).

- **Accepting a credential as a `string` username/password pair instead of
  `PSCredential`.** Pass `PSCredential` to keep credentials out of command
  history and enable secure-string prompting. Never accept a plaintext
  password parameter.

- **Omitting `HelpMessage` on mandatory parameters.** Without it,
  interactive prompts show only "Enter value for parameter" with no
  context for the user.

## Review checklist

- [ ] Every parameter whose concept appears in the standard parameter name
      table uses the exact standard name and declared type.
- [ ] No common parameter (`Verbose`, `Debug`, `WhatIf`, `Confirm`, etc.)
      is declared as an explicit property.
- [ ] `PSCredential` parameters carry the `[Credential]` attribute.
- [ ] `LiteralPath` parameters carry an `[Alias("PSPath")]` attribute and
      use `ValueFromPipelineByPropertyName`.
- [ ] All mandatory parameters have a non-empty `HelpMessage`.
- [ ] Parameter property names are PascalCase and singular (unless the
      parameter is inherently always plural).
- [ ] Non-standard parameter names do not shadow or conflict with standard
      names from other modules already loaded in common sessions.

## Related files

- [Naming — approved verbs and cmdlet name contract](./naming-approved-verbs-cmdlet-contract.md)
- [Parameters — declaration and validation](./parameters-declaration-validation.md)
- [Parameters — pipeline binding](./parameters-pipeline-binding.md)
- [Parameters and validation map](../references/parameters-validation-map.md)
- [Source index and guardrails](../references/doc-source-index.md)

## Source anchors

- [Standard cmdlet parameter names and types](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/standard-cmdlet-parameter-names-and-types)
- [Strongly encouraged development guidelines](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/strongly-encouraged-development-guidelines)
- [Parameter attribute declaration](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/parameter-attribute-declaration)
- [Types of cmdlet parameters](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/types-of-cmdlet-parameters)
- [about_CommonParameters](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_commonparameters)
- [CredentialAttribute class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.credentialattribute)
- [PSCredential class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.pscredential)
- [AliasAttribute class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.aliasattribute)
