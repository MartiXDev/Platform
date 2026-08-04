# FluentValidation cascade, inclusion, and dependent rules

## Purpose

Keep validator execution order, short-circuiting, and composition explicit so
FluentValidation behavior stays readable under change.

## Default guidance

- Start from FluentValidation's default `Continue` behavior and change cascade
  behavior only where extra failures add noise or a later validator depends on
  an earlier guard succeeding.
- Use rule-level `Cascade(CascadeMode.Stop)` or `RuleLevelCascadeMode =
  CascadeMode.Stop;` when a single rule chain should stop after the first failed
  validator.
- Use `ClassLevelCascadeMode = CascadeMode.Stop;` only when complete fail-fast
  behavior is a deliberate product choice. Keeping class-level behavior at
  `Continue` is usually better when callers need the full list of validation
  failures.
- If the application wants a shared default, set
  `ValidatorOptions.Global.DefaultRuleLevelCascadeMode` and
  `ValidatorOptions.Global.DefaultClassLevelCascadeMode` during startup instead
  of repeating the same convention in every validator.
- Compose validators with `Include(...)` when several validators target the same
  root type and each owns a clear concern. This keeps large validators split by
  topic without changing the validated model type.
- Prefer clearer patterns over `DependentRules(...)` for most gating behavior.
  A combination of `When(...)`, `Unless(...)`, or rule-level `Stop` is usually
  easier to read than nested dependent rule blocks.
- Use `DependentRules(...)` only when a later rule should run strictly after a
  specific earlier rule succeeds and the dependency is easier to understand than
  an equivalent conditional rewrite. Keep the dependent block short and local.

## Avoid

- Do not use the old `AbstractValidator.CascadeMode` property; the docs note it
  was deprecated in FluentValidation 11 and removed in FluentValidation 12.
- Do not set class-level `Stop` unless returning at most one error is the
  intended contract.
- Do not use `Include(...)` with validators for a different root type; inclusion
  only works for validators that target the same model.
- Do not bury large validator trees inside `DependentRules(...)`.
- Do not use `DependentRules(...)` as a general substitute for clearer
  conditions, even if that means a small amount of duplicated rule wiring.

## Review checklist

- [ ] Rule-level versus class-level cascade behavior matches the intended error
      aggregation strategy.
- [ ] Any global cascade defaults are documented and consistent with local
      validator overrides.
- [ ] Included validators target the same root type and have clear ownership
      boundaries.
- [ ] `DependentRules(...)` usage is brief, necessary, and easier to read than
      the available alternatives.
- [ ] Validators do not rely on removed `CascadeMode` APIs.

## Related files

- [Conditions and RuleSets](./execution-conditions-rulesets.md)
- [Messages and placeholders](./configuration-messages-placeholders.md)
- [Rule configuration map](../references/rule-configuration-map.md)

## Source anchors

- [Setting the Cascade mode - Rule-Level Cascade Modes](https://docs.fluentvalidation.net/en/latest/cascade.html#rule-level-cascade-modes)
- [Setting the Cascade mode - Validator Class-Level Cascade Modes](https://docs.fluentvalidation.net/en/latest/cascade.html#validator-class-level-cascade-modes)
- [Setting the Cascade mode - Global Default Cascade Modes](https://docs.fluentvalidation.net/en/latest/cascade.html#global-default-cascade-modes)
- [Setting the Cascade mode - CascadeMode removal](https://docs.fluentvalidation.net/en/latest/cascade.html#introduction-of-rulelevelcascademode-and-classlevelcascademode-and-removal-of-cascademode)
- [Including Rules](https://docs.fluentvalidation.net/en/latest/including-rules.html)
- [Dependent Rules](https://docs.fluentvalidation.net/en/latest/dependentrules.html)
