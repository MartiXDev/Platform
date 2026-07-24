## Purpose

Use this map for fast accessibility-aware Markdown review after a lint run or
during manual review. Rule IDs refer to
[the markdownlint rules catalog](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md).
For the full source-layer explanation, use
[instruction-bridge.md](./instruction-bridge.md).

## Routing map

| Review area | markdownlint helps directly | Repo accessibility overlay adds | Human review still needed | Primary route |
| --- | --- | --- | --- | --- |
| Heading order, title level, and faux headings | `MD001`, `MD022`, `MD025`, and `MD041` catch heading hierarchy and title structure | Flags bold text used as headings and reminds reviewers that some repos generate the `#` title elsewhere | Yes, when section changes may alter meaning or the external-title policy is unclear | Fix content for skipped levels; use config only for an intentional title policy |
| Link syntax and destination integrity | `MD011`, `MD042`, and `MD051` through `MD054` catch broken syntax, empty links, and bad fragments | Usually little extra coverage beyond the lint result | Sometimes, if the destination itself is wrong or the surrounding context is unclear | Run lint or autofix first, then repair content |
| Descriptive link text | `MD059` catches common generic phrases such as `here` or `more` | Flags bare URLs in prose and identical link text that points to different destinations | Yes, because better link wording depends on document intent | Content edit |
| Image alt text | `MD045` checks that alt text exists | Flags empty, filename-style, or placeholder alt text, reminds authors to include visible text from the image, and calls out complex images that need a longer explanation | Yes, because only a reviewer can confirm whether the text is accurate or the image is decorative | Content edit with reviewer confirmation |
| Lists, sequencing, and emoji bullets | `MD004`, `MD005`, `MD007`, `MD029`, `MD030`, and `MD032` catch list structure and spacing | Flags emoji used as bullets and sequences that should be real lists | Yes, when emoji might carry meaning that needs words | Fix structure first, then review wording |
| Plain language and dense paragraphs | No direct markdownlint rule | Flags jargon-heavy language, dense paragraphs, and opportunities to split content into shorter sections or lists | Always | Editorial rewrite, not config |
| Emoji meaning and repeated emoji | No direct markdownlint rule | Flags multiple consecutive emoji and emoji-only meaning | Always | Replace or supplement emoji with words |
| Publishing metadata or blog front matter | Only title-detection behavior through `MD001`, `MD025`, and `MD041` | This comes from the repo-local Markdown overlay, not the accessibility overlay | Yes, because reviewers must know whether the file belongs to the publishing workflow | Route to [instruction-bridge.md](./instruction-bridge.md) and [`markdown.instructions.md`](../../../../.github/instructions/markdown.instructions.md) |

## Fast decisions

- If markdownlint reports a structural issue, fix or configure that first.
- If lint passes but links, alt text, wording, or emoji usage still seem weak,
  apply
  [`markdown-accessibility.instructions.md`](../../../../.github/instructions/markdown-accessibility.instructions.md).
- If the question depends on audience, author intent, whether an image is
  decorative, or whether wording is plain enough, require human review.
- If the issue is really about publishing metadata or repo formatting, route to
  [instruction-bridge.md](./instruction-bridge.md) instead of treating it as a
  universal markdownlint accessibility rule.
