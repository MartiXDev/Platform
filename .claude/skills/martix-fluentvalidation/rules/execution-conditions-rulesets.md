# FluentValidation conditions and RuleSets

## Purpose

Control when rules execute and which rule groups run for a scenario without
making validation flow implicit or surprising.

## Default guidance

- Use chained `When(...)` or `Unless(...)` for a single rule chain, and use the
  top-level `When(..., () => { ... })` form when the same condition should gate
  several separate rules.
- Use `Otherwise(...)` when two validation branches are mutually exclusive and
  you want that split to remain explicit in the validator definition.
- Remember that chained `When(...)` / `Unless(...)` applies to all preceding
  validators in the same `RuleFor(...)` chain by default. When the condition
  should affect only the immediately preceding validator, specify
  `ApplyConditionTo.CurrentValidator` on every relevant condition call.
- If a rule chain needs several mixed conditions, prefer splitting it into
  separate `RuleFor(...)` definitions before it becomes difficult to see which
  validators each condition actually governs.
- Use RuleSets for scenario-based validation slices such as `Create`, `Update`,
  or `Publish`. Keep RuleSet names business-oriented so callers can select them
  intentionally with `IncludeRuleSets(...)`.
- Treat rules outside any RuleSet as the baseline validation path. A plain
  `Validate(...)` call executes only rules not assigned to a RuleSet.
- Use `IncludeRulesNotInRuleSet()` when a scenario-specific execution path also
  needs the baseline rules, or use the special `"default"` RuleSet name if that
  reads better at the call site.
- Use `IncludeAllRuleSets()` sparingly. It is useful for tooling or explicit
  full-validation flows, but it weakens the point of RuleSets if used as the
  routine application default.
- If a parent validator includes a child validator with `SetValidator(...)`,
  remember the selected RuleSets flow into that child validator by default
  unless an explicit override RuleSet is supplied.

## Avoid

- Do not rely on the default `ApplyConditionTo.AllValidators` behavior unless
  you really want the condition to affect every earlier validator in the chain.
- Do not put shared baseline rules inside a named RuleSet if callers expect
  plain `Validate(...)` to enforce them automatically.
- Do not create a custom RuleSet named `default`; FluentValidation reserves that
  meaning for rules outside any RuleSet.
- Do not use `IncludeAllRuleSets()` as a blanket workaround for unclear RuleSet
  design.
- Do not hide complex conditional flows inside one long chain when separate
  rules would be easier to review.

## Review checklist

- [ ] Each condition clearly targets the intended validators or rule block.
- [ ] Any use of `ApplyConditionTo.CurrentValidator` is repeated wherever the
      validator-specific behavior is required.
- [ ] Baseline rules outside RuleSets remain obvious and are included where
      scenario-specific validation also needs them.
- [ ] RuleSet names communicate a caller-facing scenario rather than an internal
      implementation detail.
- [ ] Child validators inherit or override RuleSet selection intentionally.

## Related files

- [Messages and placeholders](./configuration-messages-placeholders.md)
- [Property names and paths](./configuration-property-names-paths.md)
- [Cascade, inclusion, and dependent rules](./execution-cascade-dependent-inclusion.md)
- [Rule configuration map](../references/rule-configuration-map.md)

## Source anchors

- [Conditions](https://docs.fluentvalidation.net/en/latest/conditions.html)
- [RuleSets](https://docs.fluentvalidation.net/en/latest/rulesets.html)
