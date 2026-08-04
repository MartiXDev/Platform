# Rule section contract

## Purpose

Use this section contract when adding a new FastEndpoints rule file under
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

- Start with an H2 title that names a single FastEndpoints concern.
- Keep the opening sentence narrow and decision-oriented.
- Write defaults that preserve FastEndpoints conventions before documenting
  exceptions.
- Separate transport concerns from application or domain concerns when the rule
  touches handlers, validators, or processors.

## Drafting prompts

- What must an agent decide first when this FastEndpoints topic is active?
- Which misuse patterns are common enough to warn about immediately?
- Which neighboring workstreams should be linked for deeper context?
- Which official docs or sample anchors prove the recommendation?
