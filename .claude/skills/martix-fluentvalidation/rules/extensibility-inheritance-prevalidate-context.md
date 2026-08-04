# FluentValidation inheritance, pre-validation, and context hooks

## Purpose

Define how FluentValidation validators should handle runtime subtype dispatch,
whole-validation interception, per-call context data, and custom exception
behavior without making validators unpredictable.

## Default guidance

- Use `SetInheritanceValidator(...)` when a property or collection element is
  declared as a base class or interface and validation must switch on the
  runtime concrete type.
- Explicitly map every supported subtype with `v.Add<TSubtype>(...)`. FluentValidation
  does not automatically reuse a base-interface validator for derived runtime
  instances.
- Use the callback overloads of `Add(...)` when validator construction should be
  deferred or aligned with lazy creation patterns.
- Keep `SetValidator(...)` for fixed validator composition where the target
  validator is already known at rule-definition time. Use
  `SetInheritanceValidator(...)` only for runtime polymorphic dispatch.
- Override `PreValidate(...)` only for logic that must run before FluentValidation’s
  standard null check or when the validator needs to short-circuit the entire
  pipeline and return a prepared `ValidationResult`.
- Use `PreValidate(...)` to turn a null root model into a deliberate validation
  failure when throwing the default exception would be less useful to callers.
- Use `RootContextData` to pass per-validation ambient data into `Must`,
  `Custom`, or custom property validators without storing mutable request state
  on validator instances.
- Check `RootContextData` keys defensively and keep the expected keys stable and
  documented at the call sites that populate them.
- Override `RaiseValidationException(...)` only when every `ValidateAndThrow`
  call for that validator should consistently throw a different exception type.
- Prefer a separate extension method or helper wrapper when only some callers
  need alternate exception behavior, because that keeps the default validator
  contract unsurprising.

## Avoid

- Do not register only the base interface or base class in
  `SetInheritanceValidator(...)` and expect derived validators to run
  automatically.
- Do not use `PreValidate(...)` for ordinary property rules that belong in
  `RuleFor(...)` definitions.
- Do not return `false` from `PreValidate(...)` without adding the failures that
  explain why validation was aborted.
- Do not use `RootContextData` as a hidden service locator or shared mutable
  state bag.
- Do not globally customize validation exceptions when only one workflow needs a
  custom throw shape.

## Review checklist

- Every supported runtime subtype is explicitly mapped in
  `SetInheritanceValidator(...)`, including collection element subtypes when
  relevant.
- `SetValidator(...)` and `SetInheritanceValidator(...)` are used for different
  responsibilities and are not interchangeable in the rule design.
- `PreValidate(...)` short-circuits only intentionally and returns useful
  failures when it stops validation.
- `RootContextData` usage is deliberate, documented by stable keys, and does not
  make validators stateful.
- Any `RaiseValidationException(...)` override is justified as validator-wide
  behavior rather than a one-off caller preference.

## Related files

- [Custom validator selection rule](./extensibility-custom-validators.md)
- [Reusable property validators rule](./extensibility-property-validators.md)
- [FluentValidation extensibility map](../references/extensibility-map.md)

## Source anchors

- [Inheritance validation](https://docs.fluentvalidation.net/en/latest/inheritance.html)
- [PreValidate](https://docs.fluentvalidation.net/en/latest/advanced.html#prevalidate)
- [Root Context Data](https://docs.fluentvalidation.net/en/latest/advanced.html#root-context-data)
- [Customizing the validation exception](https://docs.fluentvalidation.net/en/latest/advanced.html#customizing-the-validation-exception)
