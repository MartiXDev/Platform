# Rule section contract

## Purpose

Use this section contract when adding a new PowerShell cmdlet rule file under
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

- Start with an H1 title that names a single cmdlet concern.
- Keep the opening sentence narrow and decision-oriented.
- Write defaults that preserve PowerShell SDK conventions before documenting
  exceptions.
- Separate cmdlet authoring concerns from module packaging or script concerns
  when the rule touches both.

## Drafting prompts

- What must an agent decide first when this cmdlet topic is active?
- Which misuse patterns are common enough to warn about immediately?
- Which neighboring workstreams should be linked for deeper context?
- Which official Microsoft PowerShell-Docs or API reference anchors prove the
  recommendation?
