# FluentValidation built-in validators map

## Purpose

Map the built-in validator families covered by this workstream so agents can
pick the right FluentValidation rule file before reaching for custom logic.

## Rule coverage

- **Null, empty, and presence semantics**
  - Rule files: `rules/validators-null-empty.md`
  - Primary sources:
    - [Built-in validators: NotNull](https://docs.fluentvalidation.net/en/latest/built-in-validators.html#notnull-validator)
    - [Built-in validators: NotEmpty](https://docs.fluentvalidation.net/en/latest/built-in-validators.html#notempty-validator)
    - [Built-in validators: Empty](https://docs.fluentvalidation.net/en/latest/built-in-validators.html#empty-validator)
    - [Built-in validators: Null](https://docs.fluentvalidation.net/en/latest/built-in-validators.html#null-validator)
    - [Validating specific properties](https://docs.fluentvalidation.net/en/latest/specific-properties.html)
    - [Collections](https://docs.fluentvalidation.net/en/latest/collections.html)
  - Notes: Use for required-field intent, collection emptiness, subset
    validation with `IncludeProperties`, and `PropertyPath` /
    `{CollectionIndex}` handling for nested members.
- **Comparison, equality, and numeric range semantics**
  - Rule files: `rules/validators-comparison-range.md`
  - Primary sources:
    - [Built-in validators: Equal](https://docs.fluentvalidation.net/en/latest/built-in-validators.html#equal-validator)
    - [Built-in validators: NotEqual](https://docs.fluentvalidation.net/en/latest/built-in-validators.html#notequal-validator)
    - [Built-in validators: LessThan](https://docs.fluentvalidation.net/en/latest/built-in-validators.html#less-than-validator)
    - [Built-in validators: LessThanOrEqualTo](https://docs.fluentvalidation.net/en/latest/built-in-validators.html#less-than-or-equal-validator)
    - [Built-in validators: GreaterThan](https://docs.fluentvalidation.net/en/latest/built-in-validators.html#greater-than-validator)
    - [Built-in validators: GreaterThanOrEqualTo](https://docs.fluentvalidation.net/en/latest/built-in-validators.html#greater-than-or-equal-validator)
    - [Built-in validators: ExclusiveBetween](https://docs.fluentvalidation.net/en/latest/built-in-validators.html#exclusivebetween-validator)
    - [Built-in validators: InclusiveBetween](https://docs.fluentvalidation.net/en/latest/built-in-validators.html#inclusivebetween-validator)
    - [Built-in validators: PrecisionScale](https://docs.fluentvalidation.net/en/latest/built-in-validators.html#precisionscale-validator)
  - Notes: Use for cross-property comparisons, comparer selection, numeric
    bounds, and decimal precision/scale constraints before falling back to
    predicates.
- **String length and common format checks**
  - Rule files: `rules/validators-length-format.md`
  - Primary sources:
    - [Built-in validators: Length](https://docs.fluentvalidation.net/en/latest/built-in-validators.html#length-validator)
    - [Built-in validators: MinLength](https://docs.fluentvalidation.net/en/latest/built-in-validators.html#minlength-validator)
    - [Built-in validators: MaxLength](https://docs.fluentvalidation.net/en/latest/built-in-validators.html#maxlength-validator)
    - [Built-in validators: EmailAddress](https://docs.fluentvalidation.net/en/latest/built-in-validators.html#email-validator)
    - [Built-in validators: CreditCard](https://docs.fluentvalidation.net/en/latest/built-in-validators.html#credit-card-validator)
    - [Validating specific properties](https://docs.fluentvalidation.net/en/latest/specific-properties.html)
  - Notes: Use for string size limits, common format screening, null-handling
    caveats, and targeted validation of nested string properties.
- **Enums, predicates, and regex-based escape hatches**
  - Rule files: `rules/validators-enum-predicate-regex.md`
  - Primary sources:
    - [Built-in validators: Enum](https://docs.fluentvalidation.net/en/latest/built-in-validators.html#enum-validator)
    - [Built-in validators: Enum Name](https://docs.fluentvalidation.net/en/latest/built-in-validators.html#enum-name-validator)
    - [Built-in validators: Predicate](https://docs.fluentvalidation.net/en/latest/built-in-validators.html#predicate-validator)
    - [Built-in validators: Regular Expression](https://docs.fluentvalidation.net/en/latest/built-in-validators.html#regular-expression-validator)
    - [Collections](https://docs.fluentvalidation.net/en/latest/collections.html)
  - Notes: Use when input arrives as enum-backed numbers or strings, when
    regex is the clearest built-in option, and when `Must` is truly needed for
    logic not represented by existing validators.

## Shared reviewer notes

- Most built-in validators expose `{PropertyName}`, `{PropertyValue}`, and
  `{PropertyPath}` placeholders. Prefer messages that preserve these values
  instead of replacing them with opaque text.
- `IncludeProperties` can target a single property with an expression and child
  collection members with wildcard paths such as `"Orders[].Cost"`.
- For collection item rules created with `RuleForEach`, use `{CollectionIndex}`
  in custom messages when the failure needs item-level clarity.

## Review checklist

- [ ] The selected rule file matches the validator family being added or
      reviewed.
- [ ] Built-in validators are preferred over `Must` when FluentValidation
      already models the rule directly.
- [ ] `PropertyPath`, collection paths, and `IncludeProperties` usage stay
      consistent for nested or partial validation flows.
- [ ] Related rule files are linked when a validator chain spans presence,
      comparison, and format concerns.

## Related files

- [Null, empty, and presence validators](../rules/validators-null-empty.md)
- [Comparison and range validators](../rules/validators-comparison-range.md)
- [Length and format validators](../rules/validators-length-format.md)
- [Enum, predicate, and regex validators](../rules/validators-enum-predicate-regex.md)

## Source anchors

- [FluentValidation built-in validators](https://docs.fluentvalidation.net/en/latest/built-in-validators.html)
  - Canonical reference for built-in validator behavior and message
    placeholders.
- [FluentValidation validating specific properties](https://docs.fluentvalidation.net/en/latest/specific-properties.html)
  - `IncludeProperties` selection, including wildcard collection paths.
- [FluentValidation collections](https://docs.fluentvalidation.net/en/latest/collections.html)
  - `RuleForEach`, `{CollectionIndex}`, and collection-item validation context.

## Maintenance notes

- Keep this workstream FluentValidation-specific. General .NET DTO or API design
  guidance belongs in broader language or framework skills.
- When future work adds dedicated rules for custom validators, conditions, or
  RuleSets, link them here instead of expanding these built-in-focused files
  beyond their scope.
