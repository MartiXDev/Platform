# FluentValidation messages and placeholders

## Purpose

Keep `WithMessage(...)` customization precise so validators stay readable and
their failures remain aligned with FluentValidation's placeholder and
localization model.

## Default guidance

- Prefer FluentValidation's built-in messages unless the API or UI contract
  needs more specific wording. Add `WithMessage(...)` to sharpen intent, not to
  restate every built-in validator in custom prose.
- Use placeholders whenever the message should stay generic across properties.
  The configuring docs call out common placeholders such as `{PropertyName}` and
  `{PropertyValue}`, comparison placeholders such as `{ComparisonValue}` and
  `{ComparisonProperty}`, and length placeholders such as `{MinLength}`,
  `{MaxLength}`, and `{TotalLength}`.
- Treat placeholder support as validator-specific beyond the common values.
  Confirm the validator can supply the placeholders you reference instead of
  assuming every validator exposes the same tokens.
- Use the lambda overload of `WithMessage(...)` only when the message must read
  data from the current object being validated. Keep that lambda deterministic,
  side-effect free, and limited to formatting.
- If the same custom wording appears across many validators, prefer a shared
  localization or message strategy instead of copying the same literal into
  multiple rule chains.

## Avoid

- Do not hard-code property labels inside `WithMessage(...)` when `WithName(...)`
  or `OverridePropertyName(...)` should own the name shown to users or clients.
- Do not put business logic, service calls, or branching-heavy formatting inside
  message lambdas.
- Do not assume custom messages are safer than defaults; a vague custom string
  often removes useful detail that built-in messages and placeholders already
  provide.
- Do not treat placeholder lists as universal across all validators.

## Review checklist

- [ ] Custom messages exist only where built-in messages are insufficient.
- [ ] Placeholder tokens used in a message are supported by the validator chain.
- [ ] Lambda messages only format current validation context and do not perform
      side effects.
- [ ] Repeated wording is centralized or documented instead of duplicated across
      many validators.

## Related files

- [Property names and paths](./configuration-property-names-paths.md)
- [Conditions and RuleSets](./execution-conditions-rulesets.md)
- [Cascade, inclusion, and dependent rules](./execution-cascade-dependent-inclusion.md)
- [Rule configuration map](../references/rule-configuration-map.md)

## Source anchors

- [Configuring Validators - Overriding the Message](https://docs.fluentvalidation.net/en/latest/configuring.html)
- [Configuring Validators - Placeholders](https://docs.fluentvalidation.net/en/latest/configuring.html#placeholders)
