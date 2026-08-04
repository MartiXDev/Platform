# PowerShell cmdlet foundation — base class and attribute

## Purpose

Protect the base class choice and `[Cmdlet]` attribute declaration for every
compiled PowerShell cmdlet. Wrong base class or a missing/invalid attribute
causes discovery failures, missing common parameters, and broken runtime
behavior.

## Default guidance

- **Prefer `PSCmdlet` as the base class.** `PSCmdlet` exposes `ShouldProcess`,
  `ShouldContinue`, `SessionState`, `InvokeCommand`, `Host`, `WriteProgress`,
  and `TransactionContext`. Derive from `Cmdlet` only when none of these are
  needed and the cmdlet will never be extended to need them; document the
  reason in a code comment when you choose `Cmdlet`.

- **Declare the `[Cmdlet]` attribute with a typed verb constant and a
  PascalCase singular noun.** Use the constant from the appropriate `Verbs*`
  static class (`VerbsCommon`, `VerbsData`, `VerbsDiagnostic`,
  `VerbsLifecycle`, `VerbsCommunications`, `VerbsSecurity`, `VerbsOther`),
  never a string literal. The noun must be PascalCase and singular.

  ```csharp
  [Cmdlet(VerbsCommon.Get, "Widget")]
  [OutputType(typeof(Widget))]
  public sealed class GetWidgetCommand : PSCmdlet { ... }
  ```

- **Set `SupportsShouldProcess = true` when and only when `ProcessRecord`
  calls `ShouldProcess` or `ShouldContinue`.** The flag and the call must
  agree: the flag enables the automatic `-WhatIf` and `-Confirm` parameters;
  calling `ShouldProcess` without the flag throws at runtime.

- **Set `SupportsTransactions = true` only when the cmdlet participates in
  PowerShell transactions** via `this.TransactionContext.CurrentPSTransaction`.
  The flag is false by default; setting it unnecessarily injects `-UseTransaction`
  and misleads callers.

- **Declare `[OutputType]` above the class for every concrete type emitted by
  `WriteObject`.** Point it to the most specific concrete type, not a base
  class or interface. When output varies by parameter set, use the overload
  that accepts a `ParameterSetName` array.

  ```csharp
  [OutputType(typeof(Widget), ParameterSetName = new[] { "ByName" })]
  [OutputType(typeof(WidgetSummary), ParameterSetName = new[] { "Summary" })]
  ```

- **Name the class `{Verb}{Noun}Command`.** PowerShell discovers cmdlets
  through the `[Cmdlet]` attribute, not by class name, but the
  `{Verb}{Noun}Command` convention is the strongly encouraged naming pattern
  and is used throughout the SDK documentation.

## Avoid

- **Deriving from `Cmdlet` when the cmdlet calls `ShouldProcess`.** The
  PowerShell SDK documentation requires `PSCmdlet` as the base class for any
  cmdlet that needs access to the Windows PowerShell runtime—including
  `ShouldProcess` and `ShouldContinue`. While both base classes declare the
  `ShouldProcess` method signature, only `PSCmdlet` provides the full runtime
  context those calls require at execution time. Derive from `Cmdlet` only
  when the cmdlet performs no runtime interaction and will never call
  `ShouldProcess`, `ShouldContinue`, `SessionState`, or any other runtime
  context member.

- **Using a raw `throw` inside `ProcessRecord`.** Raw exceptions bypass the
  PowerShell error pipeline, lose `ErrorRecord` metadata, and produce
  unstructured output. Use `ThrowTerminatingError(new ErrorRecord(...))` for
  pipeline-stopping conditions and `WriteError(new ErrorRecord(...))` for
  record-level failures. See
  [error-handling-terminating-nonterminating.md](./error-handling-terminating-nonterminating.md).

- **Using a string literal as the verb in `[Cmdlet]`.** String literals are
  not validated at compile time. Use the typed `VerbsCommon.Get` form; it
  catches typos and enforces the approved verb list.

- **Using a non-approved verb.** PowerShell writes a module-import warning for
  every cmdlet whose verb does not appear in `Get-Verb`. Pick the closest
  approved verb; if no exact match exists, use `Invoke` rather than invent a
  new verb.

- **Declaring a plural noun.** Use `Get-Item`, not `Get-Items`. The singular
  convention is a documented SDK requirement.

- **Omitting `[OutputType]` when `WriteObject` emits a known type.** Without
  it, `Get-Command -ShowCommandInfo` and PSES-based IntelliSense cannot infer
  downstream types, degrading the tooling experience for cmdlet users.

- **Marking the cmdlet class `public` but not `sealed`.** Compiled cmdlets
  should be `sealed` unless explicitly designed for inheritance.

## Review checklist

- [ ] Cmdlet class derives from `PSCmdlet` (or `Cmdlet` with a documented
      reason in a code comment).
- [ ] `[Cmdlet]` attribute uses a typed verb constant (`VerbsCommon.Get`, etc.)
      and a PascalCase singular noun.
- [ ] Verb is from the approved list returned by `Get-Verb`; string literals
      are absent.
- [ ] `SupportsShouldProcess` is `true` if and only if `ProcessRecord` calls
      `ShouldProcess` or `ShouldContinue`.
- [ ] `SupportsTransactions` is set only when the cmdlet actively uses
      `TransactionContext.CurrentPSTransaction`.
- [ ] `[OutputType]` is present and points to the concrete type emitted by
      `WriteObject`, not a base class or interface.
- [ ] Class is named `{Verb}{Noun}Command` and is `sealed`.
- [ ] No raw `throw` inside `ProcessRecord`; terminating errors use
      `ThrowTerminatingError`.

## Related files

- [Foundation — project and module shape](./foundation-project-module-shape.md)
- [Foundation map](../references/foundation-map.md)
- [Confirmation — ShouldProcess and ShouldContinue](./confirmation-shouldprocess-shouldcontinue.md)

## Source anchors

- [Cmdlet overview](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/cmdlet-overview)
- [Cmdlet class declaration](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/cmdlet-class-declaration)
- [Writing a simple cmdlet](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/how-to-write-a-simple-cmdlet)
- [Approved verbs](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/approved-verbs-for-windows-powershell-commands)
- [Strongly encouraged development guidelines](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/strongly-encouraged-development-guidelines)
- [OutputType attribute declaration](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/outputtype-attribute-declaration)
- [PSCmdlet class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.pscmdlet)
- [Cmdlet class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.cmdlet)
- [CmdletAttribute class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.cmdletattribute)
- [VerbsCommon class](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.verbscommon)
