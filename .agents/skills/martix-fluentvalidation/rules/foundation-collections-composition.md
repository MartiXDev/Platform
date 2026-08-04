# FluentValidation collections and composition

## Purpose

Define the default FluentValidation patterns for validating collections and for
composing validators across nested objects or same-type rule slices.

## Default guidance

- Use `RuleForEach(...)` to apply the same rule to each element in a collection.
  This is the primary collection-validation shape in the official docs.
- When validating simple collection elements, keep the rule on the item path,
  for example `RuleForEach(x => x.AddressLines).NotNull()`.
- Use the `{CollectionIndex}` placeholder in the failure message when the item
  position helps explain which collection element failed validation.
- For collections of complex objects, compose with
  `RuleForEach(...).SetValidator(new ChildValidator())` when the element type
  already has a reusable validator.
- Use `RuleForEach(...).ChildRules(...)` when the collection element rules are
  local to the parent validator and do not justify a separate validator class.
- If only some collection items should be validated, apply `Where(...)` or
  `WhereAsync(...)` immediately after `RuleForEach(...)`, as required by the
  collections docs.
- Keep whole-collection rules and per-item rules as separate rules by default:
  use `RuleFor(x => x.Collection)` for collection-wide checks and
  `RuleForEach(...)` for item checks. The docs allow `ForEach(...)` on a regular
  `RuleFor(...)`, but explicitly recommend separate rules because they are
  clearer.
- Use `SetValidator(...)` for nested complex properties when the child type has
  its own validator, and use `Include(...)` only to compose validators that
  target the same root type.
- Treat `Include(...)` as same-type composition. It is for merging rule slices
  for one root model, not for validating a nested child object of another type.

## Avoid

- Do not use `Include(...)` to attach a validator for a different model type;
  the docs explicitly limit `Include(...)` to validators targeting the same
  root type.
- Do not replace `SetValidator(...)` with `Include(...)` for nested child
  objects.
- Do not place `Where(...)` later in the chain; the collections docs require it
  to come directly after `RuleForEach(...)`.
- Do not force whole-collection and per-item rules into one `ForEach(...)`
  chain when two separate rules are clearer.
- Do not duplicate a reusable child validator inline with `ChildRules(...)`
  unless keeping the rules local is the intentional choice.

## Review checklist

- [ ] Collection item validation uses `RuleForEach(...)` for per-element rules.
- [ ] `{CollectionIndex}` is used intentionally when failure messages need item
      positions.
- [ ] Complex collection elements use `SetValidator(...)` or `ChildRules(...)`
      intentionally, not interchangeably by accident.
- [ ] `Where(...)` / `WhereAsync(...)` appears immediately after
      `RuleForEach(...)` when filtering items.
- [ ] `Include(...)` only composes validators for the same root type, while
      nested child objects use `SetValidator(...)`.
- [ ] Whole-collection rules and per-item rules stay separate unless there is a
      deliberate reason to use `ForEach(...)`.

## Related files

- [FluentValidation foundation map](../references/foundation-map.md)
- [Installation and versioning baseline](./foundation-installation-versioning.md)
- [Validator basics](./foundation-validator-basics.md)

## Source anchors

- [Collections](https://docs.fluentvalidation.net/en/latest/collections.html)
  - `RuleForEach(...)`, `{CollectionIndex}`, `SetValidator(...)`,
    `ChildRules(...)`, `Where(...)`, `WhereAsync(...)`, and `ForEach(...)`.
- [Complex properties](https://docs.fluentvalidation.net/en/latest/start.html#complex-properties)
  - `SetValidator(...)` for nested complex properties and the child-null
    behavior that affects composition choices.
- [Including Rules](https://docs.fluentvalidation.net/en/latest/including-rules.html)
  - `Include(...)` composition for validators that target the same root type.
