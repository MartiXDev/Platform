# Rule authoring template

## Purpose

Use this template when adding a new rule file under `rules/` so the
TUnit package keeps a stable section order and review shape.

## Front section

- Start with an H1 title that matches one specific TUnit decision area.
- Keep the opening sentence actionable and scoped to one workstream.

## Body outline

1. `## Purpose`
1. `## Default guidance`
1. `## Avoid`
1. `## Review checklist`
1. `## Related files`
1. `## Source anchors`

## Drafting prompts

- Which TUnit default should win unless the rule says otherwise?
- Where does lifecycle or data-source ownership belong for this scenario?
- Which DI, parallelism, or integration expectations must be reviewed
  alongside the main guidance?
- Which official TUnit docs or approved samples should the rule anchor to?
