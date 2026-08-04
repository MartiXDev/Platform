# Rule section contract

## Purpose

Use this section contract when adding a new TUnit rule file under
`rules/` so the package keeps a stable review shape as the workstream library
grows.

## Section order

1. `## Purpose`
1. `## Default guidance`
1. `## Avoid`
1. `## Review checklist`
1. `## Related files`
1. `## Source anchors`

## Authoring notes

- Start with an H1 title that names a single TUnit concern.
- Keep the opening sentence narrow and decision-oriented.
- Write defaults that preserve TUnit conventions before documenting
  exceptions.
- Separate test lifecycle concerns from application or domain concerns when
  the rule touches hooks, fixtures, or DI wiring.

## Drafting prompts

- What must an agent decide first when this TUnit topic is active?
- Which misuse patterns are common enough to warn about immediately?
- Which neighboring workstreams should be linked for deeper context?
- Which official TUnit docs or sample anchors prove the recommendation?
