# FluentValidation property names and paths

## Purpose

Choose the right naming override so FluentValidation error messages stay human
readable without breaking the machine-readable property paths consumers depend
on.

## Default guidance

- Use `WithName(...)` when you only want to change the display text that appears
  in the validation message. The underlying `ValidationFailure.PropertyName`
  still points to the original member path.
- Use `OverridePropertyName(...)` only when downstream consumers must see a
  different property key or path in the validation result itself. Keep that name
  aligned with the request contract that callers actually send.
- Reach for the `WithName(...)` lambda overload only when the display text truly
  depends on the current object instance. Keep it formatting-oriented and easy
  to reason about.
- Reserve `ValidatorOptions.Global.DisplayNameResolver` for deliberate
  application-wide naming policy changes. A global resolver affects every
  validator that relies on FluentValidation's default property name extraction.
- Accept FluentValidation's default collection paths for `RuleForEach(...)`
  unless a consumer has a concrete need for another format. Indexed paths such
  as `Items[2].Sku` are usually the clearest way to pinpoint which element
  failed.
- Use `OverrideIndexer(...)` only when replacing the numeric index makes the
  error location easier to match back to a stable domain identifier. The custom
  indexer output should still uniquely identify the failing item.

## Avoid

- Do not use `WithName(...)` when you actually need to change
  `ValidationFailure.PropertyName`; it only changes message text.
- Do not override property names with prose labels that break API clients,
  serializers, or UI field mapping.
- Do not remove collection index information unless the replacement is more
  actionable than the default indexed path.
- Do not change `DisplayNameResolver` globally without confirming the effect on
  every validator in the app.

## Review checklist

- [ ] `WithName(...)` versus `OverridePropertyName(...)` matches the actual
      contract change needed.
- [ ] Any overridden property path stays consistent with the serialized request
      shape consumed by callers.
- [ ] Collection validation failures still identify the exact failing element.
- [ ] Global display-name customization is intentional and documented.

## Related files

- [Messages and placeholders](./configuration-messages-placeholders.md)
- [Conditions and RuleSets](./execution-conditions-rulesets.md)
- [Rule configuration map](../references/rule-configuration-map.md)

## Source anchors

- [Configuring Validators - Overriding the Property Name](https://docs.fluentvalidation.net/en/latest/configuring.html#overriding-the-property-name)
- [Configuring Validators - Overriding the indexer for collections](https://docs.fluentvalidation.net/en/latest/configuring.html#overriding-the-indexer-for-collections)
