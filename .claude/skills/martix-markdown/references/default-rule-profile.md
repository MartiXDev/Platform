## Purpose

Use this reference when a repository does not already explain its markdownlint
policy clearly, or when you need a practical interpretation of common rule
families before editing Markdown.

## Policy precedence

1. Preserve the document's meaning, hierarchy, and accessibility.
2. Follow repository-local markdown instructions.
3. Follow repository-local `.markdownlint*` config and lint scripts.
4. Use this bundled default profile as the fallback.

If these layers disagree, prefer the most specific local rule set and document
the reason for any exception.

## High-value rule groups

### Headings and block spacing

- `MD001`: Keep heading levels sequential.
- `MD022`: Surround headings with blank lines.
- `MD032`: Surround lists with blank lines.
- `MD031`: Surround fenced code blocks with blank lines.
- `MD058`: Surround tables with blank lines.
- `MD041`: Only enforce a top-level first heading when the repository actually
  wants H1-first files. If the repo intentionally omits H1 headings, configure
  the rule instead of rewriting every file.

### Lists, whitespace, and file hygiene

- `MD004`, `MD005`, `MD007`, `MD029`, and `MD030`: Keep list markers, numbering,
  and indentation consistent.
- `MD009` and `MD010`: Remove trailing spaces and hard tabs.
- `MD012`: Avoid extra blank lines.
- `MD047`: End files with a single trailing newline.

### Code fences, links, and tables

- `MD040`: Use fenced code blocks with an explicit language when practical.
- `MD011`, `MD042`, and `MD051` through `MD054`: Keep links and fragments valid.
- `MD033`: Prefer pure Markdown over inline HTML unless the repo intentionally
  relies on HTML.
- `MD055`, `MD056`, and `MD060`: Keep table rows aligned and use the configured
  style consistently. In this repository, compact `MD060` tables are the local
  default when the rule is enabled.

## Repair strategy

1. Fix document structure first so headings, lists, tables, and code blocks are
   valid.
2. Run autofix for mechanical issues.
3. Resolve any remaining structural findings manually.
4. Only change config when a justified repository convention would otherwise
   force repeated noisy edits.

## Accessibility guardrails

- Keep link text descriptive.
- Do not flatten heading hierarchy just to silence a warning.
- Keep code examples readable and correctly fenced.
- Prefer fixes that improve both lint output and document usability.
