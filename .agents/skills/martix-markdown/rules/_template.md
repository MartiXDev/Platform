# Rule authoring template

## Purpose

Use this template when adding a new grouped markdownlint rule file under
`rules/` so the package keeps a stable section order and source split.

## Front section

- Start with an H1 title that names one planned domain or stable sub-domain.
- Keep the opening sentence decision-oriented and explicit about whether the
  file is grouped by rule family, tag, or workflow boundary.
- Re-read [the source index](../references/doc-source-index.md) before drafting
  the body.

## Body outline

1. `## Purpose`
1. `## Upstream default`
1. `## Repo-local overlay`
1. `## Avoid`
1. `## Review checklist`
1. `## Related files`
1. `## Source anchors`

## Drafting prompts

- Which upstream markdownlint surfaces define the default?
- Which repo-local instructions, if any, act as overlays?
- Does the topic belong in a grouped rule file, a reference memo, or a
  template?
- Which future domain order and file name in
  [section-order.json](../assets/section-order.json) should this file align
  with?
