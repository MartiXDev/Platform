# Markdownlint tables and layout edges

Use this grouped rule file for GitHub Flavored Markdown tables and nearby layout
choices that often travel with them, including blank lines and thematic breaks.

## Purpose

- Keep table repairs focused on render-safe structure instead of manual spacing
  wars.
- Clarify where table style belongs in config and where table structure belongs
  in content.
- Capture nearby layout edge cases such as horizontal rules and table-adjacent
  blank lines without creating a separate one-rule file.

## Upstream default

| Family | Built-in rules | Default stance | High-value options |
| --- | --- | --- | --- |
| Table pipe and column style | `MD055`, `MD060` | Choose a consistent pipe envelope and, if needed, a consistent aligned, compact, or tight column style. | `style`, `aligned_delimiter` |
| Table structure and boundaries | `MD056`, `MD058` | Keep the same number of cells in every row and surround tables with blank lines. | None |
| Nearby layout edges | `MD035` | Use one thematic-break style so horizontal rules do not add layout noise or accidentally resemble other constructs. | `style` |

- `MD060` defaults to `any`, so no table column style is enforced until config
  deliberately tightens it. Use config for a repo-wide compact or aligned
  preference rather than reformatting tables case by case.
- `MD055` answers a different question from `MD060`: first decide whether
  leading and trailing pipes are required, then decide how compact or aligned
  the columns should be.
- `MD058` matters around blockquotes and paragraphs because Markdown table
  parsing is sensitive to blank-line boundaries.
- If a table genuinely needs HTML line breaks or other inline HTML inside cells,
  handle that through the sibling `MD033.table_allowed_elements` discussion in
  [Code, HTML, and emphasis](./code-html-emphasis.md).

## Repo-local overlay

- The bundled [default rule profile](../references/default-rule-profile.md)
  records compact `MD060` tables as a local fallback preference when a
  repository chooses to enforce table column style.
- That is not an upstream markdownlint default. Put durable table-style choices
  in config and move broader repository comparisons into the future
  instruction-bridge layer.

## Avoid

- Do not fix `MD056` by dropping table content unless the content is truly
  redundant.
- Do not alternate between aligned and compact tables in the same repository
  without an explicit config decision.
- Do not insert thematic breaks where a heading or blank line would express
  structure more clearly.
- Do not use a table-only HTML need as a reason to disable `MD033` globally.
- Do not forget the blank lines that `MD058` expects before and after tables.

## Review checklist

- [ ] Pipe envelope and column style are consistent across the file or repo.
- [ ] Every table row has the expected number of cells.
- [ ] Tables and nearby blocks are separated by blank lines.
- [ ] Any HTML exception inside tables is narrow and handled with `MD033` or repo
      config.

## Related files

- [Grouped rule family map](../references/rule-family-map.md)
- [Default rule profile](../references/default-rule-profile.md)
- [Config and validation map](../references/config-and-validation-map.md)
- [Code, HTML, and emphasis](./code-html-emphasis.md)

## Source anchors

- [Source index and approved source families](../references/doc-source-index.md)
- [markdownlint rules catalog](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md)
- [MD035 horizontal rule style](https://github.com/DavidAnson/markdownlint/blob/main/doc/md035.md)
- [MD055 table pipe style](https://github.com/DavidAnson/markdownlint/blob/main/doc/md055.md)
- [MD056 table column count](https://github.com/DavidAnson/markdownlint/blob/main/doc/md056.md)
- [MD058 blanks around tables](https://github.com/DavidAnson/markdownlint/blob/main/doc/md058.md)
- [MD060 table column style](https://github.com/DavidAnson/markdownlint/blob/main/doc/md060.md)
