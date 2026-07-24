# {Grouped rule title}

Replace `{Grouped rule title}` with a narrow markdownlint domain such as
`Markdownlint headings and document structure` or
`Markdownlint links, images, and accessibility`.

## Purpose

State the decision this grouped rule file protects and the boundary it covers.

## Upstream default

- Describe the generic markdownlint behavior from approved upstream sources.
- Name the main rule IDs, aliases, tags, and options that drive the default.
- Keep tool-specific behavior here unless it is clearly repo-local.

## Repo-local overlay

- Describe repository-specific instructions or policy only when they materially
  change authoring or review in this repository.
- Keep the overlay separate from the upstream default.
- If no overlay exists, say `No repo-local overlay.`

## Avoid

- List anti-patterns that cause lint churn, semantic damage, or accessibility
  regressions.
- Include cases where config changes are better than repeated file edits.

## Review checklist

- [ ] Upstream markdownlint behavior is separated from repo-local overlay notes.
- [ ] Relevant rule IDs, aliases, tags, or options are named.
- [ ] Accessibility, links, and structure are preserved while fixing style.
- [ ] Related configs, references, and sibling domains are linked when useful.

## Related files

- Link sibling rule files, reference memos, templates, or config samples.

## Source anchors

- Link the approved upstream markdownlint docs with descriptive text.
- Link [the source index](../references/doc-source-index.md) when the rule needs
  to explain why a source family is allowed.
