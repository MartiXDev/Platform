# Markdownlint headings, front matter, and document structure

Use this grouped rule file for outline decisions that affect titles, heading
syntax, duplicate sections, and front-matter-adjacent document shape.

## Purpose

- Protect the document outline first so fixes do not flatten hierarchy,
  duplicate titles, or break generated fragments.
- Separate upstream heading behavior from repository-specific title or
  front-matter workflows.
- Give reviewers one place to route first-heading, required-heading, and
  duplicate-heading findings before they start rewriting content.

## Upstream default

| Family | Built-in rules | Default stance | High-value options |
| --- | --- | --- | --- |
| Heading flow and uniqueness | `MD001`, `MD024`, `MD025`, `MD041`, `MD043` | Keep heading depth sequential, avoid duplicate headings where fragments depend on them, and only enforce a required outline when the repository truly has one. | `front_matter_title`, `level`, `siblings_only`, `allow_preamble`, `headings`, `match_case` |
| Heading syntax and spacing | `MD003`, `MD018`, `MD019`, `MD020`, `MD021`, `MD022`, `MD023` | Pick one heading style and apply it consistently. Clean up ATX spacing and keep headings on their own lines with blank lines around them. | `style` |
| Heading text cleanup | `MD026` | Remove trailing punctuation unless the repository deliberately allows specific punctuation characters. | `punctuation` |

- `MD001`, `MD025`, and `MD041` can treat a front matter `title` field as the
  document title. That is an upstream parsing option, not a statement that every
  Markdown file needs front matter.
- `MD025.level` and `MD041.level` let repositories shift the top-level heading
  when an outer system injects the visible page title.
- `MD024.siblings_only` is useful for repeated headings that are acceptable
  under different parents, such as changelog releases.
- `MD043` is the strongest structure rule in this family. Use it only when a
  stable template genuinely exists; otherwise let `MD001`, `MD024`, and human
  review carry most of the outline work.

## Repo-local overlay

- Some repository-local authoring surfaces in this repository family start
  content at `##` or require front matter fields because the host system
  generates the visible page title.
- This package's own [`.markdownlint.json`](../.markdownlint.json) disables
  `MD041` for the bundled docs. That is a local package choice, not an upstream
  markdownlint default.
- Keep broader H1 and front-matter comparisons in the future instruction-bridge
  layer instead of copying a repository-specific matrix into this grouped rule
  file.

## Avoid

- Do not add a synthetic top-level heading when repo config intentionally shifts
  or disables the `MD041` expectation.
- Do not collapse structure into bold text or pseudo-headings just to avoid
  restyling the outline.
- Do not treat blog-style front matter fields as universal markdownlint
  requirements.
- Do not rename headings without checking duplicate-heading behavior and any
  fragment links that depend on them.
- Do not turn `MD043` into a rigid template gate unless the target content is
  actually template-shaped.

## Review checklist

- [ ] Heading depth, first-heading policy, and duplicate-title behavior are
      intentional.
- [ ] Front matter handling is described as an upstream option or a repo-local
      overlay, not both.
- [ ] Heading syntax, spacing, and punctuation match the chosen style.
- [ ] Fragment links or required-heading templates were rechecked after edits.

## Related files

- [Grouped rule family map](../references/rule-family-map.md)
- [Config and validation map](../references/config-and-validation-map.md)
- [Links, images, and accessibility](./links-images-accessibility.md)
- [Code, HTML, and emphasis](./code-html-emphasis.md)

## Source anchors

- [Source index and approved source families](../references/doc-source-index.md)
- [markdownlint rules catalog](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md)
- [MD001 heading increment](https://github.com/DavidAnson/markdownlint/blob/main/doc/md001.md)
- [MD003 heading style](https://github.com/DavidAnson/markdownlint/blob/main/doc/md003.md)
- [MD024 duplicate headings](https://github.com/DavidAnson/markdownlint/blob/main/doc/md024.md)
- [MD025 single title](https://github.com/DavidAnson/markdownlint/blob/main/doc/md025.md)
- [MD041 first-line heading](https://github.com/DavidAnson/markdownlint/blob/main/doc/md041.md)
- [MD043 required headings](https://github.com/DavidAnson/markdownlint/blob/main/doc/md043.md)
