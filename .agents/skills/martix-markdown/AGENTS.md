---
description: 'Long-form companion guide for the martix-markdown standalone skill package'
---

# MartiX Markdown companion

- This file is the long-form companion to [SKILL.md](./SKILL.md).
- Route tight here too: assess scope first, open the nearest grouped rule, then
  add only the reference layer the question actually needs.
- The package now follows a layered, standalone-first split: `SKILL.md` routes
  activation, `AGENTS.md` explains how to apply the library, `rules\*.md`
  holds the grouped markdownlint guidance, `references\*.md` provides maps and
  the instruction-bridge layer, and `templates\*.md` plus `assets\*.json` keep
  the package maintainable.
- Start with the closest grouped rule and add
  [instruction-bridge.md](./references/instruction-bridge.md) whenever the task
  compares upstream markdownlint defaults with repo-local Markdown or
  accessibility overlays.

## Package inventory

| Layer | Purpose | Key files |
| --- | --- | --- |
| Discovery | Quick activation and rule-family routing | [SKILL.md](./SKILL.md) |
| Companion | Cross-family guidance, review routes, and maintainer notes | [AGENTS.md](./AGENTS.md) |
| Rules | 7 grouped markdownlint decision guides plus support scaffolds | [Rule section contract](./rules/_sections.md) |
| References | 8 reference docs for source boundaries, routing, config and validation, install notes, toolchain coexistence, and bridge guidance | [Source index](./references/doc-source-index.md) |
| Templates | Authoring, research, comparison, and config scaffolds | [Rule template](./templates/rule-template.md) |
| Assets | Taxonomy and ordering data | [taxonomy.json](./assets/taxonomy.json) and [section-order.json](./assets/section-order.json) |
| Metadata | Package identity, inventory, and distribution intent | [metadata.json](./metadata.json) |

## Working stance

- Assess the boundary before loading deep context. If the request is generic
  writing help, repo publishing process, or another domain skill's technical
  guidance, hand off instead of forcing a markdownlint route.
- Keep this package markdownlint-specific. General writing coaching, publishing
  workflows, or broad documentation style guidance belongs elsewhere unless it
  changes a markdownlint rule, config choice, or review route.
- Treat the grouped rule files as the primary day-to-day guidance. The bundled
  reference maps help choose a route quickly, but they do not replace the rule
  files.
- Keep upstream markdownlint defaults separate from repo-local overlays. Use the
  instruction bridge when the real question is "what is markdownlint's default"
  versus "what does this repository additionally expect?"
- Prefer the smallest durable fix: content edit first, repo config second,
  file-local exception third, and custom rule last.
- Preserve document meaning, structure, link targets, accessibility, and review
  readability before mechanical cleanup.

## Critical markdownlint facts

- Upstream markdownlint defaults and repo-local Markdown instructions are
  different layers.
- `MD041`, `MD025`, and front matter title handling are policy-sensitive, not
  universal Markdown requirements.
- `MD045` and `MD059` cover only part of accessibility review. Duplicate link
  text, filename-like alt text, plain language, and emoji-heavy formatting still
  need human review.
- Prettier coexistence is usually narrow. Structural rules such as headings,
  blank-line boundaries, fragments, and alt text stay in content or human review
  territory.
- Inline suppressions are escape hatches, not baseline policy.

## Source boundaries

| Boundary | Start with | Use it for | Do not do |
| --- | --- | --- | --- |
| Upstream markdownlint default | Grouped rule files, [rule-family-map.md](./references/rule-family-map.md), and [doc-source-index.md](./references/doc-source-index.md) | Built-in rule IDs, aliases, tags, options, config semantics, custom rules, and Prettier docs | Do not present repo-local instructions as universal markdownlint behavior. |
| Instruction-bridge layer | [instruction-bridge.md](./references/instruction-bridge.md) and [accessibility-review-map.md](./references/accessibility-review-map.md) | Comparing upstream defaults with repo-local Markdown or accessibility overlays | Do not replace the grouped rule files when the question is still purely about built-in markdownlint behavior. |
| Package-local summaries | [default-rule-profile.md](./references/default-rule-profile.md), [config-and-validation-map.md](./references/config-and-validation-map.md), [install-and-validation.md](./references/install-and-validation.md), and [prettier-and-tooling-notes.md](./references/prettier-and-tooling-notes.md) | Fast routing, validation flow, fallback summaries, and toolchain notes | Do not let summaries override source-backed grouped rules or upstream docs. |
| Repo-local overlays | [`../../../../.github/instructions/markdown.instructions.md`](../../../../.github/instructions/markdown.instructions.md) and [`../../../../.github/instructions/markdown-accessibility.instructions.md`](../../../../.github/instructions/markdown-accessibility.instructions.md) | Repository-specific structure, publishing, and accessibility expectations | Do not describe those overlays as if every markdownlint user inherits them. |

Read [the source index](./references/doc-source-index.md) first whenever a new
rule, reference, or comparison note might widen beyond the approved boundary.

## Common review routes

| Scenario | Start with | Then add |
| --- | --- | --- |
| Config versus content versus suppression | [Foundation and configuration](./rules/foundation-configuration.md) | [Config and validation map](./references/config-and-validation-map.md), [Custom rules, suppressions, and toolchain coexistence](./rules/custom-rules-suppressions-toolchain.md), [instruction-bridge.md](./references/instruction-bridge.md) |
| `MD022`, `MD041`, heading shape, or front matter title policy | [Headings, front matter, and document structure](./rules/headings-front-matter-structure.md) | [instruction-bridge.md](./references/instruction-bridge.md), [Links, images, and accessibility](./rules/links-images-accessibility.md) when fragments are involved |
| `MD032`, list spacing, tabs, or trailing whitespace | [Lists, whitespace, and block spacing](./rules/lists-whitespace-block-spacing.md) | [Config and validation map](./references/config-and-validation-map.md), [Prettier and tooling notes](./references/prettier-and-tooling-notes.md) |
| `MD033`, `MD040`, code fence language, inline HTML, or pseudo-headings | [Code, HTML, and emphasis](./rules/code-html-emphasis.md) | [Tables and layout edges](./rules/tables-layout-edges.md) for HTML inside tables, [Headings, front matter, and document structure](./rules/headings-front-matter-structure.md) for outline repair |
| `MD045`, `MD059`, descriptive links, alt text, or link fragments | [Links, images, and accessibility](./rules/links-images-accessibility.md) | [accessibility-review-map.md](./references/accessibility-review-map.md), [instruction-bridge.md](./references/instruction-bridge.md) |
| `MD055`, `MD058`, or `MD060` table questions | [Tables and layout edges](./rules/tables-layout-edges.md) | [Code, HTML, and emphasis](./rules/code-html-emphasis.md) for HTML inside cells, [default-rule-profile.md](./references/default-rule-profile.md) for fallback style decisions |
| Custom rule authoring, inline disables, or file-local config | [Custom rules, suppressions, and toolchain coexistence](./rules/custom-rules-suppressions-toolchain.md) | [Foundation and configuration](./rules/foundation-configuration.md), [Config and validation map](./references/config-and-validation-map.md) |
| Prettier conflict or formatter ownership question | [prettier-and-tooling-notes.md](./references/prettier-and-tooling-notes.md) | [Custom rules, suppressions, and toolchain coexistence](./rules/custom-rules-suppressions-toolchain.md), [Lists, whitespace, and block spacing](./rules/lists-whitespace-block-spacing.md), [Foundation and configuration](./rules/foundation-configuration.md) |
| Repo-local Markdown instructions versus markdownlint default | [instruction-bridge.md](./references/instruction-bridge.md) | The closest grouped rule and [accessibility-review-map.md](./references/accessibility-review-map.md) if the issue extends beyond lint |

## Reference index

- [Source index and guardrails](./references/doc-source-index.md)
- [Grouped rule family map](./references/rule-family-map.md)
- [Config and validation map](./references/config-and-validation-map.md)
- [Instruction bridge](./references/instruction-bridge.md)
- [Accessibility review map](./references/accessibility-review-map.md)
- [Default rule profile](./references/default-rule-profile.md)
- [Install and validation notes](./references/install-and-validation.md)
- [Prettier and tooling notes](./references/prettier-and-tooling-notes.md)

## Authoring contract

- Keep every grouped rule aligned with
  [rules/_sections.md](./rules/_sections.md).
- Preserve the explicit split between `Upstream default` and `Repo-local
  overlay`.
- Keep [SKILL.md](./SKILL.md) compact and routing-oriented. Move durable detail
  into grouped rules or references instead of rebuilding a monolith.
- Update [metadata.json](./metadata.json),
  [assets/taxonomy.json](./assets/taxonomy.json), and
  [assets/section-order.json](./assets/section-order.json) in the same change
  whenever rule or reference coverage changes.

## Research and comparison

- Use [the rule template](./templates/rule-template.md) for new grouped rules.
- Use
  [the research pack template](./templates/research-pack-template.md) when a
  future expansion needs a source inventory before new guidance lands.
- Use
  [the comparison matrix template](./templates/comparison-matrix-template.md)
  for repo-local overlay comparisons, formatter boundary comparisons, or
  upstream-versus-package audits.
- Keep
  [markdownlint-cli2-config.template.jsonc](./templates/markdownlint-cli2-config.template.jsonc)
  as the narrow starting point for repo config changes.

## Standalone packaging note

- This package is the canonical standalone skill under `skills`.
- If you document or install it directly, use `npx skills add <source>`.
- A future direct marketplace registration should point to
  `skills/martix-markdown` rather than duplicate the package in
  another location.
