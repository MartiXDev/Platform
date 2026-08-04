# FluentValidation reusable property validators and SetValidator

## Purpose

Define when a FluentValidation rule should graduate from inline custom logic to
a named reusable `PropertyValidator<T, TProperty>` and how to attach it
correctly with `SetValidator`.

## Default guidance

- Stay with `Must`, `Custom`, or a reusable extension method unless the rule is
  complex enough, reused enough, or important enough to justify a dedicated
  validator type.
- Use `PropertyValidator<T, TProperty>` when you need a named, testable,
  class-based validator with its own `IsValid(...)` implementation and default
  message template.
- In a custom `PropertyValidator<T, TProperty>`, implement `IsValid(...)`,
  override `Name`, and provide `GetDefaultMessageTemplate(...)` so the validator
  has a stable identity and self-contained error text.
- Use `ValidationContext<T>` inside `IsValid(...)` to add message formatter
  arguments when the message needs dynamic details such as limits or counts.
- Attach a reusable property validator with `SetValidator(...)` when the rule
  already knows the concrete validator to run for that property.
- Prefer exposing a dedicated extension method that internally calls
  `SetValidator(new YourValidator<...>(...))` so consuming validators stay
  fluent and do not repeat generic type noise.
- Treat `SetValidator` as fixed validator composition. If the property is
  polymorphic and the validator depends on the runtime subtype, switch to
  `SetInheritanceValidator` instead.

## Avoid

- Do not create a custom `PropertyValidator<T, TProperty>` just to wrap one
  short predicate or one manual failure.
- Do not use `SetValidator` as a substitute for runtime inheritance mapping.
- Do not omit the validator `Name` or default message template when creating a
  reusable validator class.
- Do not keep mutable per-validation state on the validator instance; pass
  configuration through the constructor and use the validation context for
  per-run data.
- Do not expose awkward generic construction at every call site when an
  extension method can provide a stable rule name.

## Review checklist

- The dedicated validator class is justified by complexity, reuse, or the need
  for a named validator type.
- `PropertyValidator<T, TProperty>` implementations provide `Name`,
  `IsValid(...)`, and a default message template.
- `SetValidator(...)` is used for a known validator binding, not for runtime
  subtype dispatch.
- Reusable property validators are surfaced through clear extension methods when
  that improves readability.

## Related files

- [Custom validator selection rule](./extensibility-custom-validators.md)
- [Inheritance, pre-validation, and context rule](./extensibility-inheritance-prevalidate-context.md)
- [FluentValidation extensibility map](../references/extensibility-map.md)

## Source anchors

- [Reusable property validators](https://docs.fluentvalidation.net/en/latest/custom-validators.html#reusable-property-validators)
- [Custom validators overview](https://docs.fluentvalidation.net/en/latest/custom-validators.html)
