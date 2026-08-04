# FluentValidation enum, predicate, and regex validators

## Purpose

Use enum and regex built-ins first, and reserve predicate validators for rules
that FluentValidation cannot already express with a more specific built-in.

## Default guidance

- Use `IsInEnum()` when input binds to an enum-backed numeric value and the goal
  is to reject undefined numeric casts. This is the default guard when model
  binding or deserialization can supply out-of-range numeric enum values.
- Use `IsEnumName(typeof(TEnum), caseSensitive: ...)` when the contract accepts
  enum names as strings rather than numeric enum values. Set case sensitivity
  explicitly so reviewers can see whether casing is part of the contract.
- Use `Matches(...)` when the rule is fundamentally a regular-expression match.
  Keep the regex targeted and pair it with `NotEmpty` first when blank values
  are not allowed.
- Use `Must(...)` only when the validation logic is specific to the application's
  business rule and no built-in validator models it directly. Keep predicates
  deterministic, side-effect free, and easy to explain in one sentence.
- Prefer cross-property built-ins over parent-aware predicates. If the rule is
  "must equal another property" or "must be greater than another property," use
  `Equal`, `NotEqual`, or the comparison validators instead of
  `Must((parent, value) => ...)`.
- Customize messages without discarding the built-in placeholders:
  - enum validators expose `{PropertyName}`, `{PropertyValue}`, and
    `{PropertyPath}`
  - regex validators also expose `{RegularExpression}`
  - predicate validators expose the standard property placeholders, so add a
    precise message whenever the default condition text would be too vague
- When validating subsets of nested data, scope execution with
  `IncludeProperties`. Use direct expressions for single properties and wildcard
  string paths such as `"Lines[].Status"` for collection members.
- In collection item rules, let `PropertyPath` identify the failing path and use
  `{CollectionIndex}` in a custom message only when callers need an explicit
  item number.
- Prefer `Matches`, `IsInEnum`, and `IsEnumName` over `Must` whenever they fit.
  They communicate intent better and keep FluentValidation metadata richer.

## Avoid

- Do not use `Must` for enum membership, regex matching, equality, or ordering
  when a built-in validator already exists.
- Do not write large opaque predicates with generic failure messages such as
  "condition was not met" when the rule can be stated more precisely.
- Do not use `Matches` for standard email validation when `EmailAddress()`
  already fits the requirement.
- Do not forget to set `caseSensitive` intentionally on `IsEnumName(...)` when
  string enum input is part of a public contract.
- Do not hide nested failure location by replacing `{PropertyPath}` with a less
  specific custom message.

## Review checklist

- [ ] Numeric enum inputs use `IsInEnum()` when undefined enum values must be
      rejected.
- [ ] String enum inputs use `IsEnumName(...)` with an intentional case-sensitivity
      choice.
- [ ] Regex rules use `Matches(...)` only when a regex is the clearest built-in
      fit.
- [ ] `Must(...)` is reserved for logic not already covered by built-ins and has
      a precise, reviewer-friendly message.
- [ ] Nested and collection rules preserve `PropertyPath`, `IncludeProperties`,
      and `{CollectionIndex}` usage where helpful.

## Related files

- [Built-in validators map](../references/built-in-validators-map.md)
- [Null, empty, and presence validators](./validators-null-empty.md)
- [Comparison and range validators](./validators-comparison-range.md)
- [Length and format validators](./validators-length-format.md)

## Source anchors

- [Enum validator](https://docs.fluentvalidation.net/en/latest/built-in-validators.html#enum-validator)
- [Enum Name validator](https://docs.fluentvalidation.net/en/latest/built-in-validators.html#enum-name-validator)
- [Predicate validator](https://docs.fluentvalidation.net/en/latest/built-in-validators.html#predicate-validator)
- [Regular Expression validator](https://docs.fluentvalidation.net/en/latest/built-in-validators.html#regular-expression-validator)
- [Validating specific properties](https://docs.fluentvalidation.net/en/latest/specific-properties.html)
- [Collections](https://docs.fluentvalidation.net/en/latest/collections.html)
