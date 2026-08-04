# PowerShell naming — approved verbs and cmdlet name contract

## Purpose

Protect the verb-noun naming contract for every compiled PowerShell cmdlet.
Non-approved verbs generate module-import warnings that surface to every user
of the module; incorrect nouns break discoverability, tab completion, and the
`Verb-Noun` mental model users rely on.

## Default guidance

- **Always select a verb from the approved `Verbs*` static classes.** The
  classes are: `VerbsCommon`, `VerbsData`, `VerbsDiagnostic`, `VerbsLifecycle`,
  `VerbsCommunications`, `VerbsSecurity`, and `VerbsOther`. Use the typed
  constant in the `[Cmdlet]` attribute constructor; never use a string literal.

  ```csharp
  // Correct — typed constant
  [Cmdlet(VerbsCommon.Get, "Widget")]

  // Wrong — string literal, not validated at compile time
  [Cmdlet("Get", "Widget")]
  ```

- **Use the verb group that most closely matches the operation's semantic.**
  The approved-verbs reference page groups verbs by category with guidance on
  when to use each. Apply the decision hierarchy below before falling back to
  `VerbsOther`:

  | Intent | Preferred verb(s) |
  | --- | --- |
  | Read without side effects | `VerbsCommon.Get` |
  | Overwrite existing state | `VerbsCommon.Set` |
  | Create a new resource | `VerbsCommon.New` |
  | Delete a resource | `VerbsCommon.Remove` |
  | Execute an action or script | `VerbsLifecycle.Invoke` |
  | Start a long-running process | `VerbsLifecycle.Start` |
  | Stop a running process | `VerbsLifecycle.Stop` |
  | Convert format or type | `VerbsData.ConvertTo` / `VerbsData.ConvertFrom` |
  | Import from an external source | `VerbsData.Import` |
  | Export to an external destination | `VerbsData.Export` |
  | Verify a condition | `VerbsDiagnostic.Test` |
  | Emit structured diagnostic output | `VerbsDiagnostic.Measure` |

  When no specific group fits and a reasonable user would expect `Invoke`, use
  `VerbsLifecycle.Invoke` rather than creating a semantic near-miss with a
  verb from `VerbsOther`.

- **Use a PascalCase, singular noun.** Pluralize only when the cmdlet always
  processes a fixed multi-item unit (rare). `Get-Item` is the canonical
  pattern; `Get-Items` is a naming violation even if the cmdlet returns
  multiple items.

- **Prefix the noun with a short vendor or module identifier in shared
  modules.** This prevents name collisions when multiple modules are loaded.
  Use a consistent prefix across all cmdlets in the same module.

  ```csharp
  // Module prefix "Ax" prevents collision with platform Get-Item
  [Cmdlet(VerbsCommon.Get, "AxWidget")]
  [Cmdlet(VerbsCommon.New, "AxWidget")]
  [Cmdlet(VerbsCommon.Remove, "AxWidget")]
  ```

- **Verify the full verb list with `Get-Verb` before introducing a new
  cmdlet.** The approved verb table on learn.microsoft.com is the reference,
  but `Get-Verb` in the target PowerShell version is the runtime authority.
  A verb may appear in docs but not yet be available in older PS versions
  where typed constants are absent; in that case, target the lowest common
  version that includes the constant.

- **Use the same verb form for inverse operations.** If a cmdlet adds
  something with `VerbsCommon.Add`, the inverse should use
  `VerbsCommon.Remove`. If a cmdlet registers with `VerbsLifecycle.Register`,
  deregistration uses `VerbsLifecycle.Unregister`. Paired verbs are documented
  in the approved-verbs reference.

## Avoid

- **Using a string literal for the verb.** String literals allow any value
  including typos and non-approved verbs, with no compile-time check.

- **Using `VerbsOther.Use` or any `VerbsOther` member when a more specific
  group applies.** `VerbsOther` verbs lack semantic precision; they are
  approved but should be a last resort.

- **Plural nouns.** `Get-Items` violates the naming convention documented in
  both the cmdlet-class-declaration and strongly-encouraged-development-guidelines
  pages.

- **Omitting a vendor prefix in shared modules.** Generic nouns like
  `Widget`, `Item`, or `Config` are high-collision risks when many modules
  are loaded in the same session.

- **Reusing a noun from a different module for a different concept.** A noun
  should map to one logical resource type within a module. `Get-AxWidget` and
  `Set-AxWidget` must operate on the same resource; if they operate on
  different resources, the noun must be different.

- **Using `VerbsCommon.Invoke` as a generic fallback for well-known operations.**
  `Invoke` is appropriate for executing a delegate, script block, or remote
  command. Using it for operations with a more specific verb (e.g., using
  `Invoke-AxWidget` instead of `Start-AxWidget` for starting a process) reduces
  discoverability.

## Review checklist

- [ ] Verb is a typed constant from a `Verbs*` class (no string literals).
- [ ] Verb is from the approved list; `Get-Verb` returns the verb in the target
      PowerShell version.
- [ ] Noun is PascalCase and singular.
- [ ] Noun carries a consistent vendor or module prefix.
- [ ] Inverse-operation verb pairs (`Add`/`Remove`, `Register`/`Unregister`,
      `Start`/`Stop`) are used symmetrically across related cmdlets.
- [ ] No `VerbsOther` member is used unless no specific group applies and the
      choice is documented.
- [ ] Module import does not produce a non-approved-verb warning
      (`Import-Module -Verbose` confirms).

## Related files

- [Foundation — base class and attribute](./foundation-base-class-attribute.md)
- [Naming — parameter and common names](./naming-parameter-and-common-names.md)
- [Attributes and validators](./attributes-validators-outputtype.md)
- [Attributes and validators map](../references/attributes-validators-map.md)
- [Source index and guardrails](../references/doc-source-index.md)

## Source anchors

- [Approved verbs for PowerShell commands](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/approved-verbs-for-windows-powershell-commands)
- [Cmdlet class declaration](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/cmdlet-class-declaration)
- [Strongly encouraged development guidelines](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/strongly-encouraged-development-guidelines)
- [Advisory development guidelines](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/advisory-development-guidelines)
- [VerbsCommon class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.verbscommon)
- [VerbsData class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.verbsdata)
- [VerbsDiagnostic class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.verbsdiagnostic)
- [VerbsLifecycle class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.verbslifecycle)
- [VerbsCommunications class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.verbscommunications)
- [VerbsSecurity class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.verbssecurity)
- [VerbsOther class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.verbsother)
