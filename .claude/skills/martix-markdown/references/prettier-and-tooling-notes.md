## Purpose

Use this note when markdownlint shares a workflow with Prettier or another
formatter and you need to decide who owns a repeated formatting choice.

## Upstream coexistence baseline

- Upstream markdownlint says Prettier works seamlessly with markdownlint for the
  most part.
- When formatter ownership is deliberate, use the upstream `prettier.json` style
  through the normal `extends` mechanism to disable overlapping markdownlint
  rules.
- The explicit upstream list-indentation example is Prettier `--tab-width 4`,
  which pairs with `MD030.ul_single = 3`, `MD030.ul_multi = 3`, and
  `MD007.indent = 4`.
- Structural rules such as headings, blank-line boundaries, fragments, and alt
  text remain markdownlint or human-review territory even when Prettier is in
  the toolchain.

## Decision guide

| Scenario | Prefer | Why |
| --- | --- | --- |
| Default Prettier formatting plus default markdownlint config | Keep both tools as-is. | Upstream documents them as compatible by default. |
| Prettier uses `tab-width 4` and list indentation now fails | Tune `MD007` and `MD030` in config. | This is the explicit upstream coexistence case. |
| Structural findings such as `MD001`, `MD022`, `MD032`, `MD040`, or `MD058` | Fix content. | Formatters are not the authority for document structure. |
| Repeated wrapping disagreement on prose | Choose an explicit `MD013` policy and formatter wrap stance. | Avoid endless reflow churn. |
| Inline HTML is needed only inside table cells | Use a narrow `MD033.table_allowed_elements` exception or rewrite the content. | Smaller blast radius than disabling HTML checks globally. |
| The same formatter conflict appears in many files | Move the rule ownership decision into repo config or a shared style. | Repeated inline suppressions hide the real policy. |

## Avoid

- Do not disable whole markdownlint tags because a formatter touches only part
  of the family.
- Do not assume a formatter enforces accessibility rules such as alt text or
  descriptive links.
- Do not use file-local suppressions to hide a persistent toolchain policy.
- Do not run multiple formatters against the same Markdown files without naming a
  single owner for wrapping and layout.

## Related files

- [Lists, whitespace, and block spacing](../rules/lists-whitespace-block-spacing.md)
- [Code, HTML, and emphasis](../rules/code-html-emphasis.md)
- [Custom rules, suppressions, and toolchain coexistence](../rules/custom-rules-suppressions-toolchain.md)
- [Config and validation map](./config-and-validation-map.md)

## Source anchors

- [Source index and approved source families](./doc-source-index.md)
- [Prettier coexistence guide](https://github.com/DavidAnson/markdownlint/blob/main/doc/Prettier.md)
- [markdownlint README: shared config and `extends`](https://github.com/DavidAnson/markdownlint/blob/main/README.md#config)
- [markdownlint rules catalog](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md)
