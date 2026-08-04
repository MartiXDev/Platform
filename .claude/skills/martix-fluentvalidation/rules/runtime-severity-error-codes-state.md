# FluentValidation severity, error codes, and custom state

## Purpose

Guide review of how FluentValidation validators attach machine-readable runtime
metadata to `ValidationFailure` instances.

## Default guidance

- Treat FluentValidation failures as `Error` by default. That is the built-in
  severity for validation rules, and it matches the expectation that a failed
  rule makes the `ValidationResult` invalid.
- Use `WithSeverity(...)` only when the consumer has an intentional policy for
  warnings or informational failures. A `Warning` or `Info` failure still
  appears in `ValidationResult.Errors`, and the docs show `IsValid` remains
  `false`.
- If the application sets `ValidatorOptions.Global.Severity`, keep that choice
  explicit in startup code and document why a non-default global severity is
  safe. Rule-level `WithSeverity(...)` should override the global default only
  for clearly justified exceptions.
- Use `WithErrorCode(...)` for stable, machine-readable identifiers that
  downstream code can log, map, or serialize. Do not rely on localized error
  messages as identifiers.
- Review custom error codes together with message lookup behavior. FluentValidation
  uses the error code as the lookup key for the default message through the
  language manager.
- If a rule sets a custom error code without a custom localized message for
  that code, FluentValidation falls back to the validator's default message.
- Reuse built-in validator messages intentionally. If a custom validator should
  reuse the default text of another validator, set `WithErrorCode(...)` to that
  validator's built-in code only when the semantic fit is deliberate.
- Use `WithState(...)` for contextual metadata that callers may need at runtime,
  such as internal categories, remediation hints, or downstream mapping keys.
  Keep the state compact and structured enough that consumers do not need to
  parse message text.
- When metadata itself is part of the contract, keep the code stable, the
  severity deliberate, and the state structured:

```csharp
public sealed record ValidationMetadata(
    string Category,
    string RemediationCode);

RuleFor(x => x.ExternalId)
    .NotEmpty()
    .WithMessage("ExternalId is required before submission.")
    .WithErrorCode("Orders.ExternalId.Missing")
    .WithSeverity(x => x.IsDraft ? Severity.Warning : Severity.Error)
    .WithState(x => new ValidationMetadata(
        "Orders",
        x.IsDraft ? "CollectBeforeSubmit" : "BlockSubmission"));
```

- This still produces a `ValidationFailure`; consumers can inspect
  `ErrorCode`, `Severity`, and `CustomState` directly instead of parsing the
  message text.
- Assume `ValidationFailure.CustomState` is `null` unless the rule explicitly
  calls `WithState(...)`. Consumers should handle the absence of custom state
  safely.

## Avoid

- Do not downgrade failures to `Warning` or `Info` just to suppress operational
  impact. If the application should accept a value, prefer changing the rule
  rather than relabeling the failure.
- Do not set a global severity without confirming how API responses, logging,
  UI messaging, or batch-processing gates interpret non-error failures.
- Do not treat `ErrorCode` as display text. It is an identifier and a lookup key,
  not a user-facing sentence.
- Do not generate unstable error codes from localized text, property display
  names, or ad-hoc string concatenation that may drift between releases.
- Do not use `WithState(...)` to attach large object graphs, secrets, or data
  that cannot be safely serialized or logged.
- Do not force downstream consumers to infer severity, category, or remediation
  from the human-readable message when FluentValidation metadata can carry it
  explicitly.

## Review checklist

- [ ] Validators rely on `Error` severity by default unless a specific warning or
      info contract is documented.
- [ ] Any `ValidatorOptions.Global.Severity` override is explicit, justified, and
      understood by downstream consumers.
- [ ] Custom `WithErrorCode(...)` values are stable identifiers and are not used
      as user-facing copy.
- [ ] Error-code usage accounts for FluentValidation's message lookup behavior,
      including fallback to the validator's default message when needed.
- [ ] `WithState(...)` is used only for intentional runtime metadata, and callers
      can tolerate `CustomState == null`.

## Related files

- [FluentValidation runtime metadata and localization map](../references/runtime-metadata-map.md)
- [FluentValidation localization and language manager](./runtime-localization-language-manager.md)

## Source anchors

- [FluentValidation severity](https://docs.fluentvalidation.net/en/latest/severity.html)
  - Default severity is `Error`, available severities are `Error`, `Warning`,
    and `Info`, `WithSeverity(...)` supports callbacks, rule failures remain in
    `ValidationResult.Errors`, and global severity can be set through
    `ValidatorOptions.Global.Severity`.
- [FluentValidation custom error codes](https://docs.fluentvalidation.net/en/latest/error-codes.html)
  - `WithErrorCode(...)` populates `ValidationFailure.ErrorCode`.
- [FluentValidation error code and message lookup](https://docs.fluentvalidation.net/en/latest/error-codes.html#errorcode-and-error-messages)
  - Error codes act as language-manager lookup keys, can back custom localized
    messages, and fall back to the validator's default message when no custom
    message exists.
- [FluentValidation custom state](https://docs.fluentvalidation.net/en/latest/custom-state.html)
  - `WithState(...)` stores custom data on `ValidationFailure.CustomState`, and
    `CustomState` is `null` unless explicitly assigned.
