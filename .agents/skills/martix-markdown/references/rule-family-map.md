## Purpose

Use this map to route every upstream built-in markdownlint rule into the grouped
files in this package without creating one file per rule.

## Grouped domain summary

| Domain | Local grouped file | Built-in rules | Notes |
| --- | --- | --- | --- |
| Foundation and configuration | [foundation-configuration.md](../rules/foundation-configuration.md) | 2 | Config-first control surfaces plus the most policy-driven built-ins in this taxonomy. |
| Headings, front matter, and document structure | [headings-front-matter-structure.md](../rules/headings-front-matter-structure.md) | 13 | Heading flow, syntax, first-title behavior, duplicates, and required outlines. |
| Lists, whitespace, and block spacing | [lists-whitespace-block-spacing.md](../rules/lists-whitespace-block-spacing.md) | 12 | Lists, blockquotes, whitespace cleanup, blank lines, and file hygiene. |
| Code, HTML, and emphasis | [code-html-emphasis.md](../rules/code-html-emphasis.md) | 11 | Code fences, code spans, inline HTML, emphasis, and strong markers. |
| Links, images, and accessibility | [links-images-accessibility.md](../rules/links-images-accessibility.md) | 10 | Link syntax, fragments, references, image handling, and built-in accessibility checks. |
| Tables and layout edges | [tables-layout-edges.md](../rules/tables-layout-edges.md) | 5 | GFM tables, blank-line boundaries, and thematic-break layout edges. |
| Custom rules, suppressions, and toolchain coexistence | [custom-rules-suppressions-toolchain.md](../rules/custom-rules-suppressions-toolchain.md) | 0 | Workflow-only domain for extensions, suppressions, and formatter boundaries. |

## Built-in rule map

### [Foundation and configuration](../rules/foundation-configuration.md)

| Rule | Alias | Primary tags | Core decision |
| --- | --- | --- | --- |
| [MD013](https://github.com/DavidAnson/markdownlint/blob/main/doc/md013.md) | `line-length` | `line_length` | Decide whether wrapping is a content edit or a repository policy change. |
| [MD044](https://github.com/DavidAnson/markdownlint/blob/main/doc/md044.md) | `proper-names` | `spelling` | Maintain canonical product and project casing through config. |

### [Headings, front matter, and document structure](../rules/headings-front-matter-structure.md)

| Rule | Alias | Primary tags | Core decision |
| --- | --- | --- | --- |
| [MD001](https://github.com/DavidAnson/markdownlint/blob/main/doc/md001.md) | `heading-increment` | `headings` | Keep heading levels sequential. |
| [MD003](https://github.com/DavidAnson/markdownlint/blob/main/doc/md003.md) | `heading-style` | `headings` | Choose one heading syntax family. |
| [MD018](https://github.com/DavidAnson/markdownlint/blob/main/doc/md018.md) | `no-missing-space-atx` | `atx`, `headings`, `spaces` | Require one space after `#` in ATX headings. |
| [MD019](https://github.com/DavidAnson/markdownlint/blob/main/doc/md019.md) | `no-multiple-space-atx` | `atx`, `headings`, `spaces` | Prevent extra spaces after `#` in ATX headings. |
| [MD020](https://github.com/DavidAnson/markdownlint/blob/main/doc/md020.md) | `no-missing-space-closed-atx` | `atx_closed`, `headings`, `spaces` | Require spaces inside closed ATX heading markers. |
| [MD021](https://github.com/DavidAnson/markdownlint/blob/main/doc/md021.md) | `no-multiple-space-closed-atx` | `atx_closed`, `headings`, `spaces` | Prevent extra spaces inside closed ATX heading markers. |
| [MD022](https://github.com/DavidAnson/markdownlint/blob/main/doc/md022.md) | `blanks-around-headings` | `blank_lines`, `headings` | Separate headings from surrounding blocks with blank lines. |
| [MD023](https://github.com/DavidAnson/markdownlint/blob/main/doc/md023.md) | `heading-start-left` | `headings`, `spaces` | Keep headings flush left. |
| [MD024](https://github.com/DavidAnson/markdownlint/blob/main/doc/md024.md) | `no-duplicate-heading` | `headings` | Avoid duplicate headings that confuse navigation and fragments. |
| [MD025](https://github.com/DavidAnson/markdownlint/blob/main/doc/md025.md) | `single-title`, `single-h1` | `headings` | Keep a single top-level title for the document. |
| [MD026](https://github.com/DavidAnson/markdownlint/blob/main/doc/md026.md) | `no-trailing-punctuation` | `headings` | Remove trailing punctuation from headings unless config allows it. |
| [MD041](https://github.com/DavidAnson/markdownlint/blob/main/doc/md041.md) | `first-line-heading`, `first-line-h1` | `headings` | Decide whether the first visible title belongs inside the Markdown file. |
| [MD043](https://github.com/DavidAnson/markdownlint/blob/main/doc/md043.md) | `required-headings` | `headings` | Enforce a stable heading template only when one truly exists. |

### [Lists, whitespace, and block spacing](../rules/lists-whitespace-block-spacing.md)

| Rule | Alias | Primary tags | Core decision |
| --- | --- | --- | --- |
| [MD004](https://github.com/DavidAnson/markdownlint/blob/main/doc/md004.md) | `ul-style` | `bullet`, `ul` | Keep unordered list markers consistent. |
| [MD005](https://github.com/DavidAnson/markdownlint/blob/main/doc/md005.md) | `list-indent` | `bullet`, `indentation`, `ul` | Keep same-level list items aligned. |
| [MD007](https://github.com/DavidAnson/markdownlint/blob/main/doc/md007.md) | `ul-indent` | `bullet`, `indentation`, `ul` | Choose the unordered-list indent depth. |
| [MD009](https://github.com/DavidAnson/markdownlint/blob/main/doc/md009.md) | `no-trailing-spaces` | `whitespace` | Remove trailing spaces except for deliberate hard-break policy. |
| [MD010](https://github.com/DavidAnson/markdownlint/blob/main/doc/md010.md) | `no-hard-tabs` | `hard_tab`, `whitespace` | Replace hard tabs or document a narrow exception. |
| [MD012](https://github.com/DavidAnson/markdownlint/blob/main/doc/md012.md) | `no-multiple-blanks` | `blank_lines`, `whitespace` | Cap consecutive blank lines. |
| [MD027](https://github.com/DavidAnson/markdownlint/blob/main/doc/md027.md) | `no-multiple-space-blockquote` | `blockquote`, `indentation`, `whitespace` | Keep blockquote prefixes clean and unambiguous. |
| [MD028](https://github.com/DavidAnson/markdownlint/blob/main/doc/md028.md) | `no-blanks-blockquote` | `blockquote`, `whitespace` | Prevent blank lines that unintentionally join or split blockquotes. |
| [MD029](https://github.com/DavidAnson/markdownlint/blob/main/doc/md029.md) | `ol-prefix` | `ol` | Choose one ordered-list numbering style. |
| [MD030](https://github.com/DavidAnson/markdownlint/blob/main/doc/md030.md) | `list-marker-space` | `ol`, `ul`, `whitespace` | Set the space width after list markers. |
| [MD032](https://github.com/DavidAnson/markdownlint/blob/main/doc/md032.md) | `blanks-around-lists` | `blank_lines`, `bullet`, `ol`, `ul` | Separate lists from surrounding blocks. |
| [MD047](https://github.com/DavidAnson/markdownlint/blob/main/doc/md047.md) | `single-trailing-newline` | `blank_lines` | End files with exactly one newline. |

### [Code, HTML, and emphasis](../rules/code-html-emphasis.md)

| Rule | Alias | Primary tags | Core decision |
| --- | --- | --- | --- |
| [MD014](https://github.com/DavidAnson/markdownlint/blob/main/doc/md014.md) | `commands-show-output` | `code` | Decide whether shell examples are copy-paste commands or full transcripts. |
| [MD031](https://github.com/DavidAnson/markdownlint/blob/main/doc/md031.md) | `blanks-around-fences` | `blank_lines`, `code` | Keep fenced code blocks visually separate from surrounding prose. |
| [MD033](https://github.com/DavidAnson/markdownlint/blob/main/doc/md033.md) | `no-inline-html` | `html` | Prefer Markdown over raw HTML and allow only narrow exceptions. |
| [MD036](https://github.com/DavidAnson/markdownlint/blob/main/doc/md036.md) | `no-emphasis-as-heading` | `emphasis`, `headings` | Replace pseudo-headings with real heading structure. |
| [MD037](https://github.com/DavidAnson/markdownlint/blob/main/doc/md037.md) | `no-space-in-emphasis` | `emphasis`, `whitespace` | Remove stray spaces inside emphasis markers. |
| [MD038](https://github.com/DavidAnson/markdownlint/blob/main/doc/md038.md) | `no-space-in-code` | `code`, `whitespace` | Keep inline code spans tight. |
| [MD040](https://github.com/DavidAnson/markdownlint/blob/main/doc/md040.md) | `fenced-code-language` | `code`, `language` | Add language labels to fenced code blocks when practical. |
| [MD046](https://github.com/DavidAnson/markdownlint/blob/main/doc/md046.md) | `code-block-style` | `code` | Choose indented versus fenced code blocks. |
| [MD048](https://github.com/DavidAnson/markdownlint/blob/main/doc/md048.md) | `code-fence-style` | `code` | Choose backticks versus tildes for fences. |
| [MD049](https://github.com/DavidAnson/markdownlint/blob/main/doc/md049.md) | `emphasis-style` | `emphasis` | Choose one emphasis marker style. |
| [MD050](https://github.com/DavidAnson/markdownlint/blob/main/doc/md050.md) | `strong-style` | `emphasis` | Choose one strong-emphasis marker style. |

### [Links, images, and accessibility](../rules/links-images-accessibility.md)

| Rule | Alias | Primary tags | Core decision |
| --- | --- | --- | --- |
| [MD011](https://github.com/DavidAnson/markdownlint/blob/main/doc/md011.md) | `no-reversed-links` | `links` | Fix malformed reversed link syntax. |
| [MD034](https://github.com/DavidAnson/markdownlint/blob/main/doc/md034.md) | `no-bare-urls` | `links`, `url` | Decide when bare URLs should become proper Markdown links or autolinks. |
| [MD039](https://github.com/DavidAnson/markdownlint/blob/main/doc/md039.md) | `no-space-in-links` | `links`, `whitespace` | Remove stray spaces inside link text. |
| [MD042](https://github.com/DavidAnson/markdownlint/blob/main/doc/md042.md) | `no-empty-links` | `links` | Reject empty destinations. |
| [MD045](https://github.com/DavidAnson/markdownlint/blob/main/doc/md045.md) | `no-alt-text` | `accessibility`, `images` | Require alternate text for images. |
| [MD051](https://github.com/DavidAnson/markdownlint/blob/main/doc/md051.md) | `link-fragments` | `links` | Keep heading fragments and other anchors valid. |
| [MD052](https://github.com/DavidAnson/markdownlint/blob/main/doc/md052.md) | `reference-links-images` | `images`, `links` | Ensure reference labels are defined. |
| [MD053](https://github.com/DavidAnson/markdownlint/blob/main/doc/md053.md) | `link-image-reference-definitions` | `images`, `links` | Remove unused or duplicate reference definitions. |
| [MD054](https://github.com/DavidAnson/markdownlint/blob/main/doc/md054.md) | `link-image-style` | `images`, `links` | Choose which link and image styles are allowed. |
| [MD059](https://github.com/DavidAnson/markdownlint/blob/main/doc/md059.md) | `descriptive-link-text` | `accessibility`, `links` | Keep Markdown link text descriptive. |

### [Tables and layout edges](../rules/tables-layout-edges.md)

| Rule | Alias | Primary tags | Core decision |
| --- | --- | --- | --- |
| [MD035](https://github.com/DavidAnson/markdownlint/blob/main/doc/md035.md) | `hr-style` | `hr` | Keep thematic-break style consistent. |
| [MD055](https://github.com/DavidAnson/markdownlint/blob/main/doc/md055.md) | `table-pipe-style` | `table` | Choose the leading and trailing pipe envelope. |
| [MD056](https://github.com/DavidAnson/markdownlint/blob/main/doc/md056.md) | `table-column-count` | `table` | Keep the same number of table cells in every row. |
| [MD058](https://github.com/DavidAnson/markdownlint/blob/main/doc/md058.md) | `blanks-around-tables` | `table` | Separate tables from surrounding blocks with blank lines. |
| [MD060](https://github.com/DavidAnson/markdownlint/blob/main/doc/md060.md) | `table-column-style` | `table` | Choose aligned, compact, tight, or any table-column style. |

### [Custom rules, suppressions, and toolchain coexistence](../rules/custom-rules-suppressions-toolchain.md)

This workflow domain does not own any built-in rule IDs. It maps the upstream
extension and exception surfaces that sit around the 53 built-in rules:
`options.customRules`, inline config comments, file-level config comments, and
the Prettier coexistence guidance.

## Related files

- [Config and validation map](./config-and-validation-map.md)
- [Prettier and tooling notes](./prettier-and-tooling-notes.md)
- [Source index and guardrails](./doc-source-index.md)

## Source anchors

- [Source index and approved source families](./doc-source-index.md)
- [markdownlint README: rules and aliases](https://github.com/DavidAnson/markdownlint/blob/main/README.md#rules--aliases)
- [markdownlint README: tags](https://github.com/DavidAnson/markdownlint/blob/main/README.md#tags)
- [markdownlint rules catalog](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md)
