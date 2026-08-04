# Rule authoring template

## Purpose

Use this template when adding a new rule file under `rules/` so the
FluentValidation package keeps a stable section order and review shape.

## Front section

- Start with an H2 title that matches one specific FluentValidation decision
  area.
- Keep the opening sentence actionable and scoped to one workstream.

## Body outline

1. `### Purpose`
1. `### Default guidance`
1. `### Avoid`
1. `### Review checklist`
1. `### Related files`
1. `### Source anchors`

## Drafting prompts

- Which FluentValidation default should win unless the rule says otherwise?
- Where does validator ownership stop and application-entrypoint integration
  begin for this scenario?
- Which async, localization, metadata, or testing expectations must be reviewed
  alongside the main guidance?
- Which official docs or approved ecosystem notes should the rule anchor to?
