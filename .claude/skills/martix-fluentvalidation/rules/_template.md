## Rule template

### Purpose

Describe the decision space, trigger phrases, and when the rule should be used.

### Default guidance

- State the primary FluentValidation default.
- Add the most important trade-off or boundary.
- Add one implementation or review cue.

### Avoid

- Name the most common anti-pattern.
- Name one subtle failure mode that reviewers should catch.

### Review checklist

- Confirm the default path was considered before custom extensions or framework
  adapters were introduced.
- Confirm async, localization, or downstream error-contract implications were
  reviewed when the topic requires them.
- Confirm the rule links to the closest workstream map when the topic crosses
  package boundaries.

### Related files

- [Rule section contract](./_sections.md)
- Link the closest workstream map under `../references/`.

### Source anchors

- Link authoritative FluentValidation documentation with descriptive text.
- Link any approved ecosystem notes only when the rule depends on them.
