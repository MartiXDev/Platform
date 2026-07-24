# Markdownlint code, HTML, and emphasis

Use this grouped rule file for code-fence decisions, inline HTML boundaries, and
emphasis cleanup that should improve readability without damaging structure.

## Purpose

- Keep code examples copyable, language-aware, and visually stable.
- Separate content repairs from config choices for code block style, fence
  characters, and allowed HTML.
- Treat emphasis misuse as a structural smell when it is standing in for real
  headings or section boundaries.

## Upstream default

| Family | Built-in rules | Default stance | High-value options |
| --- | --- | --- | --- |
| Shell snippets and code boundaries | `MD014`, `MD031`, `MD040`, `MD046`, `MD048` | Keep command examples honest, surround fences with blank lines, specify fenced-code languages when practical, and use one code-block and fence style consistently. | `allowed_languages`, `language_only`, `style`, `list_items` |
| Inline code and HTML | `MD033`, `MD038` | Prefer pure Markdown over raw HTML where possible, and keep code spans tight with no stray spaces. | `allowed_elements`, `table_allowed_elements` |
| Emphasis and strong markers | `MD036`, `MD037`, `MD049`, `MD050` | Use emphasis for emphasis, not headings; remove spaces inside markers and keep emphasis and strong-marker style consistent. | `punctuation`, `style` |

- `MD014` is about shell examples that show only commands. If a block is a real
  transcript with output, review it as a transcript instead of stripping every
  prompt automatically.
- `MD040` is content-first: add a language when syntax highlighting or parser
  context matters. Use config allowlists only when a repository has a known set
  of accepted language labels.
- `MD033` can allow specific HTML globally or only inside tables. Reach for
  narrow allowlists before disabling the rule.
- `MD036` often points back to structure work. If bold or italic text is acting
  like a section label, fix the outline, not just the marker characters.

## Repo-local overlay

No repo-local overlay. If a repository needs HTML allowlists or code-language
exceptions, document them in config and the future instruction-bridge layer.

## Avoid

- Do not strip shell prompts from transcripts that also show output or shell
  state changes without checking what the example is trying to teach.
- Do not use inline HTML for headings or layout when pure Markdown can express
  the same thing.
- Do not leave unlabeled fenced code blocks when the language is known.
- Do not use emphasis as a pseudo-heading or section divider.
- Do not mix indented and fenced code-block styles in the same file unless the
  repository explicitly allows both.

## Review checklist

- [ ] Code blocks use the intended block and fence style.
- [ ] Fenced snippets have languages when practical and safe.
- [ ] Inline HTML or emphasis changes did not alter document structure or
      accessibility.
- [ ] Any HTML allowlist or language exception is narrow and documented.

## Related files

- [Grouped rule family map](../references/rule-family-map.md)
- [Config and validation map](../references/config-and-validation-map.md)
- [Prettier and tooling notes](../references/prettier-and-tooling-notes.md)
- [Headings, front matter, and document structure](./headings-front-matter-structure.md)
- [Tables and layout edges](./tables-layout-edges.md)

## Source anchors

- [Source index and approved source families](../references/doc-source-index.md)
- [markdownlint rules catalog](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md)
- [MD014 commands show output](https://github.com/DavidAnson/markdownlint/blob/main/doc/md014.md)
- [MD033 inline HTML](https://github.com/DavidAnson/markdownlint/blob/main/doc/md033.md)
- [MD040 fenced code language](https://github.com/DavidAnson/markdownlint/blob/main/doc/md040.md)
- [MD046 code block style](https://github.com/DavidAnson/markdownlint/blob/main/doc/md046.md)
- [MD048 code fence style](https://github.com/DavidAnson/markdownlint/blob/main/doc/md048.md)
- [MD049 emphasis style](https://github.com/DavidAnson/markdownlint/blob/main/doc/md049.md)
- [MD050 strong style](https://github.com/DavidAnson/markdownlint/blob/main/doc/md050.md)
