# Markdownlint links, images, and accessibility

Use this grouped rule file for link syntax, fragment targets, reference
definitions, image handling, and the built-in accessibility checks that travel
with those surfaces.

## Purpose

- Protect link and image meaning while repairing markdownlint findings so fixes
  do not silently break destinations, fragments, or accessible labels.
- Clarify which accessibility checks are truly built into markdownlint and which
  belong to broader repository review overlays.
- Keep reference-style decisions, fragment validation, and descriptive-link
  reviews traceable to upstream docs.

## Upstream default

| Family | Built-in rules | Default stance | High-value options |
| --- | --- | --- | --- |
| Syntax and empty links | `MD011`, `MD039`, `MD042` | Fix malformed link syntax, remove spaces inside link text, and reject empty destinations. | None |
| URL and link or image style | `MD034`, `MD054` | Avoid bare URLs and only restrict inline, reference, autolink, or URL-inline styles when the repository has a deliberate house style. | `autolink`, `inline`, `full`, `collapsed`, `shortcut`, `url_inline` |
| Fragments and reference definitions | `MD051`, `MD052`, `MD053` | Keep fragments resolvable and reference labels both defined and needed. | `ignore_case`, `ignored_pattern`, `ignored_labels`, `shortcut_syntax`, `ignored_definitions` |
| Accessibility surfaces | `MD045`, `MD059` | Require alt text for images and descriptive Markdown link text. | `prohibited_texts` |

- `MD051` depends on generated heading fragments, so heading edits can create
  link failures even when the link syntax itself still looks valid.
- `MD052` and `MD053` work best together when a repository prefers reference
  links: one checks that labels exist, the other checks that labels are still
  needed.
- `MD054` allows all link and image styles by default. Tighten it only when the
  repository has a stable style preference that reduces churn.
- `MD059` checks Markdown links only, while `MD045` covers Markdown and HTML
  image alt text.

## Repo-local overlay

- The approved repository-local accessibility guidance is broader than built-in
  markdownlint accessibility rules. It also discusses duplicate link text,
  filename-like alt text, plain language, and heading hierarchy review.
- Keep that wider comparison in the future instruction-bridge layer. This
  grouped rule file stays centered on upstream `MD045`, `MD059`, and the
  built-in link and image rules.

## Avoid

- Do not change heading text without checking `MD051` fragments and any related
  local or external anchors.
- Do not convert reused reference links to inline links if that leaves orphaned
  definitions or makes the paragraph harder to scan.
- Do not "fix" `MD045` with placeholder alt text like `image` or `screenshot`.
  Use author-reviewed text that reflects the actual visual content.
- Do not assume a passing `MD059` result means HTML links or duplicate labels
  are accessible.
- Do not delete unused reference definitions until you confirm they are not
  needed by shortcut or collapsed reference syntax.

## Review checklist

- [ ] Link targets, fragments, and reference definitions were rechecked after
      edits.
- [ ] Visible link text stays descriptive and alt text is author-reviewed.
- [ ] Any link or image style restriction is a deliberate config choice.
- [ ] HTML links or images received separate review where upstream built-in rules
      do not apply.

## Related files

- [Grouped rule family map](../references/rule-family-map.md)
- [Config and validation map](../references/config-and-validation-map.md)
- [Headings, front matter, and document structure](./headings-front-matter-structure.md)
- [Tables and layout edges](./tables-layout-edges.md)

## Source anchors

- [Source index and approved source families](../references/doc-source-index.md)
- [markdownlint rules catalog](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md)
- [MD045 alt text](https://github.com/DavidAnson/markdownlint/blob/main/doc/md045.md)
- [MD051 link fragments](https://github.com/DavidAnson/markdownlint/blob/main/doc/md051.md)
- [MD052 reference links and images](https://github.com/DavidAnson/markdownlint/blob/main/doc/md052.md)
- [MD053 needed reference definitions](https://github.com/DavidAnson/markdownlint/blob/main/doc/md053.md)
- [MD054 link and image style](https://github.com/DavidAnson/markdownlint/blob/main/doc/md054.md)
- [MD059 descriptive link text](https://github.com/DavidAnson/markdownlint/blob/main/doc/md059.md)
