## Purpose

Use this bridge when the skill needs to separate generic markdownlint defaults
from repository-local Markdown guidance. Start with
[the source index](./doc-source-index.md), use
[the default rule profile](./default-rule-profile.md) as the package summary of
common markdownlint behavior, and apply the two local instruction files only as
overlays for this repository.

Use [the accessibility review map](./accessibility-review-map.md) when you need
the fast routing version.

## Source layers

| Layer | Primary sources | Use it for | Do not use it for |
| --- | --- | --- | --- |
| Upstream markdownlint default | [Rules catalog](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md), per-rule docs such as [`MD013`](https://github.com/DavidAnson/markdownlint/blob/main/doc/md013.md), [`MD041`](https://github.com/DavidAnson/markdownlint/blob/main/doc/md041.md), [`MD045`](https://github.com/DavidAnson/markdownlint/blob/main/doc/md045.md), and [`MD059`](https://github.com/DavidAnson/markdownlint/blob/main/doc/md059.md) | Built-in rule IDs, default behavior, options, and config choices | Repo-specific front matter, publishing, or tone rules |
| Package-local summary | [default-rule-profile.md](./default-rule-profile.md) and [install-and-validation.md](./install-and-validation.md) | Downstream summaries of upstream behavior, local repair strategy, and validation flow for this skill package | A replacement for the upstream rule docs |
| Repo-local Markdown overlay | [`../../../../.github/instructions/markdown.instructions.md`](../../../../.github/instructions/markdown.instructions.md) | This repository's Markdown structure, formatting, and publishing expectations | Universal markdownlint defaults |
| Repo-local accessibility overlay | [`../../../../.github/instructions/markdown-accessibility.instructions.md`](../../../../.github/instructions/markdown-accessibility.instructions.md) | Accessibility review questions that complement lint output | A promise that markdownlint can catch every issue automatically |

## Boundary cases

### H1 and heading policy

- **Upstream markdownlint default**:
  [`MD041`](https://github.com/DavidAnson/markdownlint/blob/main/doc/md041.md)
  expects the first line to be a top-level heading by default.
  [`MD025`](https://github.com/DavidAnson/markdownlint/blob/main/doc/md025.md)
  assumes there is only one top-level title when that convention is in use, and
  [`MD001`](https://github.com/DavidAnson/markdownlint/blob/main/doc/md001.md)
  requires heading levels to increment by one level at a time.
- **Repo-local Markdown overlay**:
  [`markdown.instructions.md`](../../../../.github/instructions/markdown.instructions.md)
  says repository Markdown content should start at `##` and use `###` beneath
  it because the page title is generated elsewhere.
- **Accessibility review overlay**:
  [`markdown-accessibility.instructions.md`](../../../../.github/instructions/markdown-accessibility.instructions.md)
  also expects a single page title, but explicitly allows starting at `##`
  where another system generates the `#` heading. It also flags bold text used
  as a fake heading.
- **Best route**: If the repository intentionally externalizes the title, adjust
  config or document the exception instead of rewriting every file to use `#`.
  If the real problem is skipped levels or fake headings, edit the content.

### Line length and formatting expectations

- **Upstream markdownlint default**:
  [`MD013`](https://github.com/DavidAnson/markdownlint/blob/main/doc/md013.md)
  defaults to 80 characters and is configurable for headings, code blocks, and
  tables. Structural rules such as `MD022`, `MD031`, `MD032`, `MD040`, and
  `MD058` define blank-line and block-shape expectations.
- **Repo-local Markdown overlay**:
  [`markdown.instructions.md`](../../../../.github/instructions/markdown.instructions.md)
  combines a repo-local validator ceiling of 400 characters with a softer
  readability preference to wrap prose around 80 characters. It also prefers
  `##` and `###`, `-` bullet markers, fenced code blocks with languages, blank
  lines between sections, and normal Markdown tables.
- **Accessibility review overlay**:
  The accessibility instructions do not define a competing line-length rule, but
  they do reinforce shorter paragraphs and clearer structure when readability is
  suffering.
- **Best route**: Fix real spacing, heading, list, and fence problems in the
  content. Use config when a repository intentionally wants a different line
  length or stable exemptions for code blocks and tables. Do not force an
  upstream 80-character default onto a repo that has already chosen a different
  lint policy.

### Blog and post front matter requirements

- **Upstream markdownlint default**: markdownlint does not require blog-style
  metadata such as `post_title`, `author1`, `post_slug`, or `featured_image`.
  The upstream heading rules only use front matter to detect a document title,
  and the relevant key is configurable through `front_matter_title`.
- **Repo-local Markdown overlay**:
  [`markdown.instructions.md`](../../../../.github/instructions/markdown.instructions.md)
  defines a specific post front matter shape for this repository's publishing
  workflow.
- **Accessibility review overlay**: The accessibility instructions do not add
  those publishing fields; they only care about heading structure and readable
  content.
- **Best route**: Add blog metadata only when the target file participates in
  that publishing flow. Do not treat the local front matter block as a generic
  markdownlint requirement. If a repository uses a different title key in front
  matter, prefer config over inventing new inline rules.

### Descriptive links and alt text

- **Upstream markdownlint default**:
  [`MD059`](https://github.com/DavidAnson/markdownlint/blob/main/doc/md059.md)
  catches common generic link text such as `here` or `more`, and
  [`MD045`](https://github.com/DavidAnson/markdownlint/blob/main/doc/md045.md)
  requires images to have alt text. Link structure and target integrity are
  also covered by rules such as `MD011`, `MD042`, and `MD051` through `MD054`.
- **Repo-local Markdown overlay**:
  [`markdown.instructions.md`](../../../../.github/instructions/markdown.instructions.md)
  requires proper Markdown link and image syntax and says images should include
  alt text.
- **Accessibility review overlay**:
  [`markdown-accessibility.instructions.md`](../../../../.github/instructions/markdown-accessibility.instructions.md)
  goes further by flagging bare URLs in prose, identical link text that points
  to different destinations, filename-style or placeholder alt text, and
  complex images that need a longer description or linked explanation.
- **Best route**: Most of these fixes belong in the content, not the config.
  Config is only the right tool when you need a repo-wide `MD059`
  `prohibited_texts` override or another explicit, repeated convention.

### Plain language and emoji usage

- **Upstream markdownlint default**: markdownlint has no built-in plain-language
  rule, and it does not decide whether emoji are carrying too much meaning.
  Structural list rules can catch malformed lists, but not confusing wording.
- **Repo-local Markdown overlay**:
  [`markdown.instructions.md`](../../../../.github/instructions/markdown.instructions.md)
  prefers real Markdown lists and readable structure, but it is not a full
  accessibility review rubric.
- **Accessibility review overlay**:
  [`markdown-accessibility.instructions.md`](../../../../.github/instructions/markdown-accessibility.instructions.md)
  flags jargon-heavy prose, dense paragraphs, emoji used as list markers,
  repeated emoji, and cases where emoji carry meaning that is not repeated in
  words.
- **Best route**: Treat these as editorial review items. Content changes and
  human judgement are the right fix; config cannot infer audience, tone, or the
  meaning of an emoji sequence.

## When config is the right fix

Prefer config or an explicitly documented exception when:

- the repository intentionally supplies the title outside the Markdown file and
  `MD041` or `MD025` should target `##` instead of `#`,
- front matter uses a different title key than the upstream default,
- a repo-wide line-length choice or code/table exemption is intentional and
  repeated across many files, or
- the same `MD059` descriptive-link-text exception needs a language-specific
  prohibited word list.

That aligns with [default-rule-profile.md](./default-rule-profile.md) and
[install-and-validation.md](./install-and-validation.md): use config when a
justified repository convention would otherwise create noisy, repeated edits.

## When content changes are the right fix

Edit the document when:

- heading levels are actually skipped,
- bold text is being used instead of a real heading,
- link text is vague or duplicated in a confusing way,
- alt text is missing, empty, generic, or inaccurate,
- a post file that really belongs to the publishing flow is missing required
  metadata, or
- prose, lists, or emoji usage reduce accessibility even though lint is clean.

## Recommended authoring order for future bridge notes

When a future grouped rule or reference file needs all three layers, state them
in this order:

1. Upstream markdownlint default and rule IDs.
2. Repo-local Markdown overlay for this repository.
3. Repo-local accessibility overlay if the issue extends beyond lint.
4. The preferred fix route: config, content edit, or human review.
