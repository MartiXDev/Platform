# FluentValidation null, empty, and presence validators

## Purpose

Choose the built-in presence validator that matches the contract precisely so
required values, forbidden values, and collection emptiness are expressed
without custom predicates.

## Default guidance

- Use `NotNull` when `null` is the only invalid state and empty strings or
  default values are still allowed by the contract.
- Use `NotEmpty` when the contract requires a meaningful value:
  - strings must not be `null`, empty, or whitespace
  - value types must not be their default value
  - collections must contain at least one item
- Use `Null` or `Empty` for fields the caller must omit, such as server-managed
  values, mutually exclusive inputs, or DTO members that should stay blank in a
  specific workflow.
- For string inputs that are both required and length constrained, chain
  presence first and length second so `null` / whitespace and size failures stay
  explicit:

  ```csharp
  RuleFor(x => x.Name)
      .NotEmpty()
      .MaximumLength(200);
  ```

- For collections, separate collection-level presence from item-level rules.
  `NotEmpty` answers "must this collection contain items?" while `RuleForEach`
  answers "what must be true for each item?":

  ```csharp
  RuleFor(x => x.AddressLines).NotEmpty();
  RuleForEach(x => x.AddressLines).NotNull();
  ```

- Preserve FluentValidation placeholders when customizing messages. Presence
  validators support `{PropertyName}`, `{PropertyValue}`, and `{PropertyPath}`.
  `PropertyPath` is especially useful for nested objects and collection members
  where the leaf property name alone is ambiguous.
- When presence rules run inside `RuleForEach`, use `{CollectionIndex}` in
  `WithMessage` for item-level clarity without hand-building paths:

  ```csharp
  RuleForEach(x => x.AddressLines)
      .NotEmpty()
      .WithMessage("Address line {CollectionIndex} is required.");
  ```

- When validating only part of an object graph, keep `IncludeProperties`
  aligned with the rule's property path:
  - use `options.IncludeProperties(x => x.Surname)` for a direct property
  - use string paths such as `"Orders[].Cost"` for child properties of all
    collection items
- Prefer these built-ins over `Must` for presence checks. They communicate the
  contract more clearly, produce better default messages, and keep placeholders
  available automatically.

## Avoid

- Do not use `NotNull` when whitespace-only strings should also fail. Use
  `NotEmpty` instead.
- Do not assume `Length`, `MinimumLength`, or `MaximumLength` make a field
  required. They do not reject `null`.
- Do not use `Must(x => x != null)` or similar predicates for standard presence
  rules that FluentValidation already models directly.
- Do not collapse collection-level and item-level requirements into one vague
  rule when both semantics matter.
- Do not discard `PropertyPath` in custom messages for nested validators unless
  another explicit path is supplied.

## Review checklist

- [ ] `NotNull` versus `NotEmpty` is chosen intentionally based on contract
      semantics.
- [ ] `Null` / `Empty` rules are used only when the caller must omit or clear a
      value.
- [ ] Collection rules distinguish between "collection must have items" and
      "each item must be valid."
- [ ] Partial validation flows use `IncludeProperties` with the correct direct
      or wildcard path.
- [ ] Custom messages preserve placeholders such as `{PropertyPath}` and use
      `{CollectionIndex}` when item-level clarity is needed.

## Related files

- [Built-in validators map](../references/built-in-validators-map.md)
- [Comparison and range validators](./validators-comparison-range.md)
- [Length and format validators](./validators-length-format.md)
- [Enum, predicate, and regex validators](./validators-enum-predicate-regex.md)

## Source anchors

- [NotNull validator](https://docs.fluentvalidation.net/en/latest/built-in-validators.html#notnull-validator)
- [NotEmpty validator](https://docs.fluentvalidation.net/en/latest/built-in-validators.html#notempty-validator)
- [Empty validator](https://docs.fluentvalidation.net/en/latest/built-in-validators.html#empty-validator)
- [Null validator](https://docs.fluentvalidation.net/en/latest/built-in-validators.html#null-validator)
- [Validating specific properties](https://docs.fluentvalidation.net/en/latest/specific-properties.html)
  - `IncludeProperties` for direct properties and wildcard child collection
    paths such as `"Orders[].Cost"`.
- [Collections](https://docs.fluentvalidation.net/en/latest/collections.html)
  - `RuleForEach`, per-item validation, and `{CollectionIndex}` support.
