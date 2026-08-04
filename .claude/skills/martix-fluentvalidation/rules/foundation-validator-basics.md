# FluentValidation validator basics

## Purpose

Define the default shape for authoring and executing a FluentValidation
validator for a single model, including property rules, chained rules, and
complex-property reuse.

## Default guidance

- Model each validator as a class that inherits from `AbstractValidator<T>`,
  where `T` is the type being validated.
- Define validation rules in the validator constructor. This is the shape the
  getting-started docs establish for FluentValidation validators.
- Use `RuleFor(x => x.Property)` to attach rules to a specific property and keep
  the lambda focused on the property being validated.
- Chain validators on the same rule when multiple checks belong to the same
  property path, for example `RuleFor(x => x.Surname).NotNull().NotEqual("foo")`.
- Run validation with `Validate(...)` when the caller needs a
  `ValidationResult` and should inspect `IsValid` plus the `Errors` collection.
- Use `ValidateAndThrow(...)` when failure should immediately raise a
  `ValidationException`. The docs describe it as a wrapper around
  `Validate(..., options => options.ThrowOnFailures())`.
- Reuse validators for nested complex properties with `SetValidator(...)` when a
  child object has its own validator, for example validating `Address` with an
  `AddressValidator`.
- Rely on the documented `SetValidator(...)` behavior for null child properties:
  if the child property is null, the child validator is not executed.
- If you validate a nested property inline, such as
  `RuleFor(x => x.Address.Postcode)`, add an explicit condition when the parent
  can be null. The docs call out that an inline nested-property rule does not
  automatically null-check the parent object.

## Avoid

- Do not skip `AbstractValidator<T>` and still describe the class as a standard
  FluentValidation validator.
- Do not scatter core rule declarations outside the validator's constructor when
  documenting the default validator shape.
- Do not assume `Validate(...)` throws on failure; it returns a
  `ValidationResult`.
- Do not assume `ValidateAndThrow(...)` is always in scope without the
  `FluentValidation` namespace imported.
- Do not inline nested property paths and assume FluentValidation will
  automatically null-check each intermediate object.
- Do not replace a reusable child validator with duplicated inline rules when
  the nested object already has a coherent validator of its own.

## Review checklist

- [ ] Validators inherit from `AbstractValidator<T>` for the correct root type.
- [ ] Rules are defined in the constructor and use `RuleFor(...)` for the
      intended property path.
- [ ] Chained rules stay on the same property only when they represent the same
      validation path.
- [ ] Callers intentionally choose between `Validate(...)` and
      `ValidateAndThrow(...)`.
- [ ] Complex-property validation uses `SetValidator(...)` or adds an explicit
      null guard for inline nested-property rules.

## Related files

- [FluentValidation foundation map](../references/foundation-map.md)
- [Installation and versioning baseline](./foundation-installation-versioning.md)
- [Collections and composition](./foundation-collections-composition.md)

## Source anchors

- [Creating your first validator](https://docs.fluentvalidation.net/en/latest/start.html)
  - `AbstractValidator<T>`, constructor-defined rules, `RuleFor(...)`,
    `Validate(...)`, `ValidationResult`, `IsValid`, and `Errors`.
- [Chaining validators](https://docs.fluentvalidation.net/en/latest/start.html#chaining-validators)
  - Multiple validators chained on one `RuleFor(...)` path.
- [Throwing exceptions](https://docs.fluentvalidation.net/en/latest/start.html#throwing-exceptions)
  - `ValidateAndThrow(...)` and its equivalence to `ThrowOnFailures()`.
- [Complex properties](https://docs.fluentvalidation.net/en/latest/start.html#complex-properties)
  - `SetValidator(...)`, child null behavior, and explicit null conditions for
    inline nested-property rules.
