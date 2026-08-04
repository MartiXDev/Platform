# FluentValidation rule configuration map

## Purpose

Map the FluentValidation rule-configuration workstream back to the official
configuration and execution documentation set so rule authors can find the
right guidance quickly.

## Rule coverage

- **Messages and placeholders**
  - Rule files: `rules/configuration-messages-placeholders.md`
  - Primary sources:
    - [Configuring Validators - Overriding the Message](https://docs.fluentvalidation.net/en/latest/configuring.html)
    - [Configuring Validators - Placeholders](https://docs.fluentvalidation.net/en/latest/configuring.html#placeholders)
  - Notes: Use for `WithMessage(...)`, supported placeholder strategy, lambda
    messages, and deciding when repeated wording belongs in localization or a
    broader convention instead of per-rule literals.
- **Property names, paths, and collection indexers**
  - Rule files: `rules/configuration-property-names-paths.md`
  - Primary sources:
    - [Configuring Validators - Overriding the Property Name](https://docs.fluentvalidation.net/en/latest/configuring.html#overriding-the-property-name)
    - [Configuring Validators - Overriding the indexer for collections](https://docs.fluentvalidation.net/en/latest/configuring.html#overriding-the-indexer-for-collections)
  - Notes: Use for `WithName(...)`, `OverridePropertyName(...)`,
    `DisplayNameResolver`, default collection paths such as `Orders[3].Sku`,
    and `OverrideIndexer(...)`.
- **Execution conditions and scenario-based RuleSets**
  - Rule files: `rules/execution-conditions-rulesets.md`
  - Primary sources:
    - [Conditions](https://docs.fluentvalidation.net/en/latest/conditions.html)
    - [RuleSets](https://docs.fluentvalidation.net/en/latest/rulesets.html)
  - Notes: Use for chained `When` / `Unless`, top-level `When(...).Otherwise(...)`,
    `ApplyConditionTo`, `IncludeRuleSets(...)`, `IncludeRulesNotInRuleSet()`,
    `IncludeAllRuleSets()`, and inherited RuleSet selection for child validators.
- **Cascade modes, validator inclusion, and dependent rules**
  - Rule files: `rules/execution-cascade-dependent-inclusion.md`
  - Primary sources:
    - [Setting the Cascade mode](https://docs.fluentvalidation.net/en/latest/cascade.html)
    - [Including Rules](https://docs.fluentvalidation.net/en/latest/including-rules.html)
    - [Dependent Rules](https://docs.fluentvalidation.net/en/latest/dependentrules.html)
  - Notes: Use for rule-level versus validator-level short-circuiting,
    fail-fast trade-offs, composing validators with `Include(...)`, and deciding
    when `DependentRules(...)` harms readability more than it helps.

## Related files

- [Messages and placeholders](../rules/configuration-messages-placeholders.md)
- [Property names and paths](../rules/configuration-property-names-paths.md)
- [Conditions and RuleSets](../rules/execution-conditions-rulesets.md)
- [Cascade, inclusion, and dependent rules](../rules/execution-cascade-dependent-inclusion.md)

## Source anchors

- [Configuring Validators](https://docs.fluentvalidation.net/en/latest/configuring.html)
- [Conditions](https://docs.fluentvalidation.net/en/latest/conditions.html)
- [RuleSets](https://docs.fluentvalidation.net/en/latest/rulesets.html)
- [Setting the Cascade mode](https://docs.fluentvalidation.net/en/latest/cascade.html)
- [Including Rules](https://docs.fluentvalidation.net/en/latest/including-rules.html)
- [Dependent Rules](https://docs.fluentvalidation.net/en/latest/dependentrules.html)

## Maintenance notes

- Keep this map FluentValidation-specific; generic .NET exception or API
  contract guidance belongs in broader C# skill packages instead.
- Update this map and the linked rules together when FluentValidation changes
  configuration APIs, RuleSet behavior, or cascade terminology.
- Prefer cross-linking related rule files over copying the same execution
  guidance into multiple documents.
