# FluentValidation extensibility map

## Purpose

Map the FluentValidation extensibility topics covered by this workstream so
rules stay aligned with the official docs and link to the right companion
guidance.

## Rule coverage

- **Custom rule composition with `Must`, `Custom`, and reusable extensions**
  - Rule files: `rules/extensibility-custom-validators.md`
  - Primary sources:
    - [Custom validators](https://docs.fluentvalidation.net/en/latest/custom-validators.html#predicate-validator)
    - [Custom message placeholders](https://docs.fluentvalidation.net/en/latest/custom-validators.html#custom-message-placeholders)
    - [Writing a custom validator with `Custom`](https://docs.fluentvalidation.net/en/latest/custom-validators.html#writing-a-custom-validator)
  - Notes: Use for choosing the smallest extensibility point, shaping reusable
    extension methods, adding custom message placeholders, and emitting one or
    many failures from a rule.
- **Reusable property validators and `SetValidator`**
  - Rule files: `rules/extensibility-property-validators.md`
  - Primary sources:
    - [Reusable property validators](https://docs.fluentvalidation.net/en/latest/custom-validators.html#reusable-property-validators)
    - [Custom validators](https://docs.fluentvalidation.net/en/latest/custom-validators.html)
  - Notes: Use for named `PropertyValidator<T, TProperty>` implementations,
    default message templates, validator naming, and deciding when `SetValidator`
    is the right fixed binding point instead of a lighter custom rule.
- **Inheritance dispatch, `PreValidate`, `RootContextData`, and custom exception behavior**
  - Rule files: `rules/extensibility-inheritance-prevalidate-context.md`
  - Primary sources:
    - [Inheritance validation](https://docs.fluentvalidation.net/en/latest/inheritance.html)
    - [PreValidate](https://docs.fluentvalidation.net/en/latest/advanced.html#prevalidate)
    - [Root Context Data](https://docs.fluentvalidation.net/en/latest/advanced.html#root-context-data)
    - [Customizing the validation exception](https://docs.fluentvalidation.net/en/latest/advanced.html#customizing-the-validation-exception)
  - Notes: Use for runtime subtype mapping, collection inheritance validation,
    early short-circuiting, passing per-call ambient data, and deciding whether
    exception customization should be validator-wide or opt-in.

## Related files

- [Custom validator selection rule](../rules/extensibility-custom-validators.md)
- [Reusable property validators rule](../rules/extensibility-property-validators.md)
- [Inheritance, pre-validation, and context rule](../rules/extensibility-inheritance-prevalidate-context.md)

## Source anchors

- [FluentValidation custom validators](https://docs.fluentvalidation.net/en/latest/custom-validators.html)
  - `Must`, custom placeholders, `Custom`, reusable extension methods, and
    `PropertyValidator<T, TProperty>`.
- [FluentValidation advanced features](https://docs.fluentvalidation.net/en/latest/advanced.html)
  - `PreValidate`, `RootContextData`, and validation exception customization.
- [FluentValidation inheritance validation](https://docs.fluentvalidation.net/en/latest/inheritance.html)
  - `SetInheritanceValidator`, collection inheritance mapping, and explicit
    subtype limitations.

## Maintenance notes

- Keep this workstream FluentValidation-specific. General .NET exception,
  validation, or application-architecture guidance belongs in
  `skills/martix-dotnet-csharp/`.
- Keep the decision boundary between `SetValidator` and
  `SetInheritanceValidator` explicit so agents do not blur fixed validator
  composition with runtime subtype dispatch.
