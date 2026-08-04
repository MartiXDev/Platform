# FluentValidation foundation map

## Purpose

Map the FluentValidation foundation topics covered by this workstream so rule
files stay aligned with the official docs and point agents at the right
companion guidance.

## Rule coverage

- **Installation baseline and version boundary**
  - Rule files: `rules/foundation-installation-versioning.md`
  - Primary sources:
    - [Installation](https://docs.fluentvalidation.net/en/latest/installation.html)
  - Notes: Use for the core package install command, the current docs baseline,
    and the upgrade/version boundary called out on the installation page.
- **Validator shape and execution basics**
  - Rule files: `rules/foundation-validator-basics.md`
  - Primary sources:
    - [Creating your first validator](https://docs.fluentvalidation.net/en/latest/start.html)
    - [Creating your first validator - Chaining validators](https://docs.fluentvalidation.net/en/latest/start.html#chaining-validators)
    - [Creating your first validator - Throwing Exceptions](https://docs.fluentvalidation.net/en/latest/start.html#throwing-exceptions)
    - [Creating your first validator - Complex Properties](https://docs.fluentvalidation.net/en/latest/start.html#complex-properties)
  - Notes: Use for `AbstractValidator<T>`, constructor-defined rules,
    `RuleFor(...)`, chaining, `Validate(...)`, `ValidateAndThrow(...)`, and
    complex-property reuse with `SetValidator(...)`.
- **Collection rules and validator composition**
  - Rule files: `rules/foundation-collections-composition.md`
  - Primary sources:
    - [Collections](https://docs.fluentvalidation.net/en/latest/collections.html)
    - [Including Rules](https://docs.fluentvalidation.net/en/latest/including-rules.html)
    - [Creating your first validator - Complex Properties](https://docs.fluentvalidation.net/en/latest/start.html#complex-properties)
  - Notes: Use for `RuleForEach(...)`, `{CollectionIndex}`, `ChildRules(...)`,
    `Where(...)`, `ForEach(...)`, `SetValidator(...)`, and `Include(...)`
    boundaries.

## Related files

- [Installation and versioning rule](../rules/foundation-installation-versioning.md)
- [Validator basics rule](../rules/foundation-validator-basics.md)
- [Collections and composition rule](../rules/foundation-collections-composition.md)

## Source anchors

- [FluentValidation installation](https://docs.fluentvalidation.net/en/latest/installation.html)
  - Core package installation commands and the upgrade note for older versions.
- [FluentValidation getting started](https://docs.fluentvalidation.net/en/latest/start.html)
  - `AbstractValidator<T>`, `RuleFor(...)`, validation execution, chaining, and
    complex-property examples.
- [FluentValidation collections](https://docs.fluentvalidation.net/en/latest/collections.html)
  - `RuleForEach(...)`, child collection validation, `{CollectionIndex}`,
    `Where(...)`, and `ForEach(...)`.
- [FluentValidation including rules](https://docs.fluentvalidation.net/en/latest/including-rules.html)
  - `Include(...)` composition for validators targeting the same root type.

## Maintenance notes

- Keep this workstream FluentValidation-specific. Generic .NET validation
  guidance belongs in broader .NET skill packages, not in these foundation
  rules.
- Keep `foundation-validator-basics.md` focused on single-object validator
  authoring and execution, and move collection-specific guidance into
  `foundation-collections-composition.md`.
- When expanding this skill with ASP.NET Core, testing, or advanced ruleset
  guidance, add new files and link them here instead of overloading the
  foundation documents.
- Keep cross-links current so agents can move from installation, to validator
  authoring, to nested/collection composition without re-discovering the package
  layout.
