# Rule section contract

## Purpose

Use this section contract when adding a new FluentValidation rule file under
`rules/` so the package keeps a stable review shape as the workstream library
grows.

## Section order

1. `### Purpose`
1. `### Default guidance`
1. `### Avoid`
1. `### Review checklist`
1. `### Related files`
1. `### Source anchors`

## Authoring notes

- Start with an H2 title that names one FluentValidation decision area.
- Keep the opening sentence narrow, actionable, and validator-focused.
- Prefer FluentValidation defaults before documenting ASP.NET Core or pipeline
  exceptions.
- Keep validator composition guidance separate from application-entrypoint
  integration unless the rule is explicitly about both.
- Treat error metadata, localization, and failure shape as validation-contract
  concerns rather than presentation-only details.

## Drafting prompts

- What FluentValidation decision must an agent make first when this topic is
  active?
- Which default API, pattern, or workstream should win unless the rule says
  otherwise?
- Which hazards need immediate warnings, such as sync-over-async validation,
  legacy MVC auto-validation, or fragile error-message parsing?
- Which neighboring workstreams or official docs prove the recommendation?
