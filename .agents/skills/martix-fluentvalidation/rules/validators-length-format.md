# FluentValidation length and format validators

## Purpose

Use FluentValidation's string length and common format validators for text shape
rules so requiredness, size limits, and lightweight format screening stay
separate and readable.

## Default guidance

- Use `Length`, `MinimumLength`, and `MaximumLength` for string size limits. Use
  the most specific validator that matches the contract:
  - `Length(min, max)` for inclusive ranges
  - `MinimumLength(n)` for lower bounds
  - `MaximumLength(n)` for upper bounds
- Remember that string length validators do not reject `null`. Pair them with
  `NotEmpty` or `NotNull` when the field is required:

  ```csharp
  RuleFor(x => x.Email)
      .NotEmpty()
      .MaximumLength(320)
      .EmailAddress();
  ```

- Keep length and format concerns explicit rather than hiding them inside one
  regex or predicate. This produces clearer failures and reuses built-in
  placeholders such as `{MinLength}`, `{MaxLength}`, `{TotalLength}`, and
  `{PropertyPath}`.
- Use `EmailAddress()` for basic email format screening. FluentValidation's
  default mode intentionally performs a simple ASP.NET Core-compatible check and
  should be treated as input screening, not proof that an address exists or can
  receive mail.
- Do not opt into `EmailValidationMode.Net4xRegex` unless you are maintaining a
  legacy behavior intentionally. The regex mode is deprecated and not the
  preferred default.
- Use `CreditCard()` only to screen for plausible card-number structure. It does
  not authorize a payment instrument, verify ownership, or replace payment
  provider checks.
- When validating nested string members selectively, use `IncludeProperties`
  with the attached property path. For all items in a collection, use wildcard
  paths such as `"Orders[].CustomerEmail"`.
- Keep collection item format rules inside `RuleForEach` or child validators so
  `PropertyPath` identifies the failing member precisely. Add `{CollectionIndex}`
  to a custom message when the caller needs item-level context.
- Prefer these built-ins over `Must` or ad hoc regexes for common string rules.
  They are clearer to review and align with FluentValidation's documented
  messages.

## Avoid

- Do not assume string length validators make a field required.
- Do not replace `EmailAddress()` with a large custom regex unless a documented,
  domain-specific format rule truly requires it.
- Do not treat `EmailAddress()` as deliverability verification or
  `CreditCard()` as payment validation.
- Do not combine unrelated text concerns into one opaque `Must` validator when
  length and built-in format validators can express them separately.
- Do not drop `{PropertyPath}` from custom messages for nested fields when the
  field name alone is ambiguous.

## Review checklist

- [ ] String size rules use `Length`, `MinimumLength`, or `MaximumLength`
      intentionally.
- [ ] Required string fields pair length or format validators with `NotEmpty` or
      `NotNull` as needed.
- [ ] Email validation is treated as lightweight format screening, not address
      verification.
- [ ] Credit-card validation is treated as plausibility checking only.
- [ ] Nested and partial validation flows preserve `PropertyPath`,
      `IncludeProperties`, and collection-item clarity.

## Related files

- [Built-in validators map](../references/built-in-validators-map.md)
- [Null, empty, and presence validators](./validators-null-empty.md)
- [Comparison and range validators](./validators-comparison-range.md)
- [Enum, predicate, and regex validators](./validators-enum-predicate-regex.md)

## Source anchors

- [Length validator](https://docs.fluentvalidation.net/en/latest/built-in-validators.html#length-validator)
- [MinLength validator](https://docs.fluentvalidation.net/en/latest/built-in-validators.html#minlength-validator)
- [MaxLength validator](https://docs.fluentvalidation.net/en/latest/built-in-validators.html#maxlength-validator)
- [Email validator](https://docs.fluentvalidation.net/en/latest/built-in-validators.html#email-validator)
- [Credit Card validator](https://docs.fluentvalidation.net/en/latest/built-in-validators.html#credit-card-validator)
- [Validating specific properties](https://docs.fluentvalidation.net/en/latest/specific-properties.html)
- [Collections](https://docs.fluentvalidation.net/en/latest/collections.html)
