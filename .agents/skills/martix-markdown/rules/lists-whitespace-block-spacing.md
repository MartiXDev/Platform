# Markdownlint lists, whitespace, and block spacing

Use this grouped rule file for list structure, blockquote spacing, whitespace
cleanup, and file-hygiene fixes that can easily damage parsing when done
mechanically.

## Purpose

- Route list and whitespace findings into a stable repair order: parse
  boundaries first, marker style second, and cosmetic cleanup last.
- Make config-versus-content decisions clearer for spacing rules that often
  overlap with formatter output.
- Keep blank-line and indentation fixes from changing the intended structure of
  lists, blockquotes, or nested examples.

## Upstream default

| Family | Built-in rules | Default stance | High-value options |
| --- | --- | --- | --- |
| Unordered list marker and indent | `MD004`, `MD005`, `MD007` | Keep unordered marker style and same-level indentation consistent. The default nested indent is `2` spaces. | `style`, `indent`, `start_indented`, `start_indent` |
| Ordered list numbering and marker spacing | `MD029`, `MD030` | Pick one numbering pattern and use one space after list markers by default. | `style`, `ol_single`, `ol_multi`, `ul_single`, `ul_multi` |
| Whitespace and file hygiene | `MD009`, `MD010`, `MD012`, `MD047` | Remove trailing spaces and tabs, cap consecutive blank lines, and end files with a single trailing newline. | `br_spaces`, `strict`, `code_blocks`, `list_item_empty_lines`, `spaces_per_tab`, `maximum` |
| Blockquote spacing | `MD027`, `MD028` | Use one space after `>` and avoid blank lines that accidentally merge or split blockquotes. | `list_items` |
| List boundaries | `MD032` | Surround lists with blank lines except at file edges so paragraphs and lists parse cleanly. | None |

- `MD009` already allows intentional hard breaks through `br_spaces`. Do not
  strip two-space line breaks blindly when they carry meaning.
- `MD010` scans code blocks by default. If a language truly requires tabs, use a
  narrow config exception such as `ignore_code_languages` instead of a broad
  disable.
- `MD029` policy is semantic only at the repository level. The choice between
  `one`, `ordered`, `one_or_ordered`, and `zero` should be made once in config.
- `MD032` protects parsing boundaries around lists. Fix structure before marker
  polish so later autofix does not chase the wrong parse tree.

## Repo-local overlay

No repo-local overlay. Repository-specific list and whitespace preferences
belong in config or the future instruction-bridge layer.

## Avoid

- Do not renumber ordered procedures manually if repo policy intentionally uses
  repeated `1.` markers.
- Do not remove whitespace that is serving an intentional hard break or a
  parser-required empty list line without checking the relevant rule options.
- Do not replace tabs inside language examples without checking whether the code
  semantics depend on them.
- Do not merge adjacent blockquotes or lists unintentionally while fixing blank
  lines.
- Do not fight formatter output one file at a time when the real problem is a
  stable `MD007` or `MD030` config mismatch.

## Review checklist

- [ ] Marker style, numbering, and indentation are consistent at each nesting
      level.
- [ ] Whitespace fixes did not remove intentional hard breaks, parser-required
      blanks, or code semantics.
- [ ] Lists, blockquotes, and nearby paragraphs still parse as intended.
- [ ] Any non-default indentation or spacing choice is documented in config
      instead of hidden in one file.

## Related files

- [Grouped rule family map](../references/rule-family-map.md)
- [Config and validation map](../references/config-and-validation-map.md)
- [Prettier and tooling notes](../references/prettier-and-tooling-notes.md)
- [Code, HTML, and emphasis](./code-html-emphasis.md)

## Source anchors

- [Source index and approved source families](../references/doc-source-index.md)
- [markdownlint rules catalog](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md)
- [MD004 unordered list style](https://github.com/DavidAnson/markdownlint/blob/main/doc/md004.md)
- [MD007 unordered list indentation](https://github.com/DavidAnson/markdownlint/blob/main/doc/md007.md)
- [MD009 trailing spaces](https://github.com/DavidAnson/markdownlint/blob/main/doc/md009.md)
- [MD010 hard tabs](https://github.com/DavidAnson/markdownlint/blob/main/doc/md010.md)
- [MD029 ordered list prefix](https://github.com/DavidAnson/markdownlint/blob/main/doc/md029.md)
- [MD030 list marker space](https://github.com/DavidAnson/markdownlint/blob/main/doc/md030.md)
- [MD032 blanks around lists](https://github.com/DavidAnson/markdownlint/blob/main/doc/md032.md)
- [markdownlint with Prettier](https://github.com/DavidAnson/markdownlint/blob/main/doc/Prettier.md)
