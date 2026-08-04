# FluentValidation custom validator selection

## Purpose

Choose the lightest FluentValidation extensibility point for property-level
custom rules so validators stay readable, reusable, and precise.

## Default guidance

- Prefer built-in FluentValidation validators first. Reach for custom logic only
  when the rule cannot be expressed clearly with the built-in rule set.
- Use `Must` as the default custom-validator hook when the rule is a single
  pass/fail predicate over one property value.
- Use the `Must((root, value, context) => ...)` overload when the predicate also
  needs access to the parent object or must add custom message placeholders via
  `context.MessageFormatter`.
- Wrap repeated `Must` or `Custom` logic in an extension method on
  `IRuleBuilder<T, TProperty>` so call sites read like first-class FluentValidation
  rules instead of repeating lambda bodies across validators.
- Use generic constraints on reusable extension methods so they only light up for
  the property shapes they actually support.
- Use `Custom` when the rule must manually call `context.AddFailure(...)`,
  return multiple failures from one rule, override the target property name, or
  construct a `ValidationFailure` directly.
- Keep custom-validator extensions focused on validation behavior. They should
  improve rule composition, not hide domain workflows or side effects.

## Avoid

- Do not jump to `Custom` when a single `Must` predicate communicates the rule
  clearly.
- Do not create a full `PropertyValidator<T, TProperty>` for logic that is only
  a simple predicate plus a message.
- Do not repeat the same inline `Must` lambda in multiple validators when an
  extension method would give the rule a stable, reusable name.
- Do not emit vague failure text when custom placeholders can explain limits,
  counts, or other rule parameters directly in the message.
- Do not use custom validators to mutate state or perform business operations
  outside validation.

## Review checklist

- The rule uses the smallest FluentValidation extensibility point that fits:
  built-in validator, `Must`, reusable extension, or `Custom`.
- Repeated custom logic is extracted into a named extension method instead of
  duplicated inline.
- Any custom placeholders added through `MessageFormatter` are referenced by the
  final message template.
- `Custom` is only used when manual failure creation or multiple failures are
  actually required.

## Related files

- [Reusable property validators rule](./extensibility-property-validators.md)
- [Inheritance, pre-validation, and context rule](./extensibility-inheritance-prevalidate-context.md)
- [FluentValidation extensibility map](../references/extensibility-map.md)

## Source anchors

- [Predicate validator / `Must`](https://docs.fluentvalidation.net/en/latest/custom-validators.html#predicate-validator)
- [Custom message placeholders](https://docs.fluentvalidation.net/en/latest/custom-validators.html#custom-message-placeholders)
- [Writing a custom validator with `Custom`](https://docs.fluentvalidation.net/en/latest/custom-validators.html#writing-a-custom-validator)
