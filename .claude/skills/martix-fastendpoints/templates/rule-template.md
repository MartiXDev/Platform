# Rule authoring template

## Purpose

Use this template when adding a new rule file under `rules/` so the
FastEndpoints package keeps a stable section order and review shape.

## Front section

- Start with an H2 title that matches one specific FastEndpoints decision area.
- Keep the opening sentence actionable and scoped to one workstream.

## Body outline

1. `### Purpose`
1. `### Default guidance`
1. `### Avoid`
1. `### Review checklist`
1. `### Related files`
1. `### Source anchors`

## Drafting prompts

- Which FastEndpoints default should win unless the rule says otherwise?
- Where does validation or pipeline ownership belong for this scenario?
- Which diagnostics, auth, or testing expectations must be reviewed alongside
  the main guidance?
- Which official docs or approved samples should the rule anchor to?
