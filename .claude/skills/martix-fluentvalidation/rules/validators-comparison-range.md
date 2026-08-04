# FluentValidation comparison and range validators

## Purpose

Use FluentValidation's comparison and range built-ins for equality, ordering,
and numeric-shape rules so cross-property logic stays declarative and message
placeholders remain accurate.

## Default guidance

- Use `Equal` and `NotEqual` for same-value and different-value contracts before
  reaching for `Must`. This is the default for confirmation fields and sibling
  property comparisons:

  ```csharp
  RuleFor(x => x.Password)
      .Equal(x => x.PasswordConfirmation);
  ```

- Use the comparer overloads on `Equal` and `NotEqual` when string comparison
  semantics matter. The default is ordinal; pass an explicit comparer such as
  `StringComparer.OrdinalIgnoreCase` or `StringComparer.CurrentCulture`
  intentionally.
- Use `GreaterThan`, `GreaterThanOrEqualTo`, `LessThan`, and
  `LessThanOrEqualTo` for `IComparable<T>` types instead of writing manual
  predicates. These support both literal thresholds and cross-property
  comparisons.
- Use `InclusiveBetween` and `ExclusiveBetween` when the requirement is a true
  bounded range. They express intent more clearly than pairing two separate
  comparison validators and expose `{From}` / `{To}` placeholders automatically.
- Use `PrecisionScale` for decimal-shape constraints when the stored or accepted
  numeric representation matters. Treat it as a precision contract, not as a
  substitute for domain rounding rules or currency policy.
- Preserve the comparison placeholders that built-ins provide:
  - `{ComparisonValue}` and `{ComparisonProperty}` for equality or ordering
    rules
  - `{From}` and `{To}` for range rules
  - `{ExpectedPrecision}`, `{ExpectedScale}`, `{Digits}`, and `{ActualScale}`
    for decimal precision rules
  - `{PropertyPath}` for nested and collection member failures
- When only specific comparison rules should run, scope validation with
  `IncludeProperties` using the exact property path the rule is attached to. For
  collection members, use wildcard paths such as `"Orders[].Total"`.
- In collection rules, keep item-level comparisons inside `RuleForEach` or child
  validators so `PropertyPath` identifies the failing element correctly.
- Prefer built-in cross-property comparisons over `Must((parent, value) => ...)`
  when the rule is fundamentally equality or ordering. The built-ins are more
  readable and produce richer error metadata.

## Avoid

- Do not implement basic equality or ordering checks with `Must` when a built-in
  comparison validator already exists.
- Do not rely on the default ordinal string comparison when the business rule is
  case-insensitive or culture-sensitive.
- Do not use two separate comparison validators when a single between-validator
  describes the requirement more directly.
- Do not use `PrecisionScale` as a business-rule replacement for rounding,
  currency conversion, or persistence-layer formatting.
- Do not remove `{ComparisonProperty}` or `{PropertyPath}` context from custom
  messages unless the replacement is equally specific.

## Review checklist

- [ ] Equality and ordering rules use built-in comparison validators instead of
      custom predicates where possible.
- [ ] String comparison rules specify an explicit comparer when default ordinal
      behavior is not intended.
- [ ] Range constraints use `InclusiveBetween` or `ExclusiveBetween` when that
      is the real contract.
- [ ] Decimal-shape rules use `PrecisionScale` only for precision and scale
      requirements.
- [ ] Partial validation and nested validation keep property paths aligned with
      `IncludeProperties` and `PropertyPath`.

## Related files

- [Built-in validators map](../references/built-in-validators-map.md)
- [Null, empty, and presence validators](./validators-null-empty.md)
- [Length and format validators](./validators-length-format.md)
- [Enum, predicate, and regex validators](./validators-enum-predicate-regex.md)

## Source anchors

- [Equal validator](https://docs.fluentvalidation.net/en/latest/built-in-validators.html#equal-validator)
- [NotEqual validator](https://docs.fluentvalidation.net/en/latest/built-in-validators.html#notequal-validator)
- [LessThan validator](https://docs.fluentvalidation.net/en/latest/built-in-validators.html#less-than-validator)
- [LessThanOrEqualTo validator](https://docs.fluentvalidation.net/en/latest/built-in-validators.html#less-than-or-equal-validator)
- [GreaterThan validator](https://docs.fluentvalidation.net/en/latest/built-in-validators.html#greater-than-validator)
- [GreaterThanOrEqualTo validator](https://docs.fluentvalidation.net/en/latest/built-in-validators.html#greater-than-or-equal-validator)
- [ExclusiveBetween validator](https://docs.fluentvalidation.net/en/latest/built-in-validators.html#exclusivebetween-validator)
- [InclusiveBetween validator](https://docs.fluentvalidation.net/en/latest/built-in-validators.html#inclusivebetween-validator)
- [PrecisionScale validator](https://docs.fluentvalidation.net/en/latest/built-in-validators.html#precisionscale-validator)
- [Validating specific properties](https://docs.fluentvalidation.net/en/latest/specific-properties.html)
- [Collections](https://docs.fluentvalidation.net/en/latest/collections.html)
