# Rule authoring template

## Purpose

Use this template when adding a new rule file under `rules/` so the
PowerShell cmdlet package keeps a stable section order and review shape.

## Front section

- Start with an H1 title that matches one specific cmdlet decision area.
- Keep the opening sentence actionable and scoped to one workstream.

## Body outline

1. `## Purpose`
1. `## Default guidance`
1. `## Avoid`
1. `## Review checklist`
1. `## Related files`
1. `## Source anchors`

## Drafting prompts

- Which PowerShell SDK default should win unless the rule says otherwise?
- Where does parameter, lifecycle, or error-handling ownership belong for
  this scenario?
- Which confirmation, pipeline, or module packaging expectations must be
  reviewed alongside the main guidance?
- Which official Microsoft PowerShell-Docs or API reference anchors should
  the rule anchor to?
