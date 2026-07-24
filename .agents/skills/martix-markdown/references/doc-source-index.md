## Source index and guardrails

### Purpose

This index locks the approved source families for the
`martix-markdown` package before the skill grows into a layered
router, grouped rule library, richer references, and metadata. Use this file
before authoring any new rule, companion guide, or reference map so the package
stays explicit about which statements describe upstream markdownlint behavior
and which statements describe repository-local overlays.

Future rule and reference files should cite the source family they rely on and
keep upstream defaults separate from repo-specific notes.

---

### Precedence model

Author future guidance in two passes instead of blending all Markdown advice
into a single policy block:

1. Preserve document meaning, structure, link targets, and accessibility.
1. Establish the generic markdownlint default from the approved upstream
   markdownlint sources.
1. Apply repository-local overlays separately when this repository adds tighter
   formatting, accessibility, or publishing expectations.
1. Treat package-local files such as [SKILL.md](../SKILL.md),
   [README.md](../README.md), and the bundled references as derived surfaces.
   They organize the skill package, but they do not override upstream
   markdownlint semantics.

If a repo-local overlay conflicts with the upstream default, record both parts
explicitly. Do not rewrite the upstream section so a local convention looks like
universal markdownlint behavior.

---

### Approved upstream markdownlint sources

These upstream sources are approved for the future grouped rule library and
supporting references.

| Source | Primary contribution | Authoring use |
| --- | --- | --- |
| [markdownlint README](https://github.com/DavidAnson/markdownlint/blob/main/README.md) | Workflow, installation, overview, rules and aliases, tags, configuration, API, usage, browser support, examples, and maintainer-facing sections such as contributing, releasing, and history | Use for workflow, config, CLI, API, and tooling guidance. Do not treat README summaries as a substitute for per-rule behavior pages. |
| [Built-in rules catalog](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md) | Canonical index of the 53 built-in rules, aliases, tags, and short descriptions | Use as the navigation hub and first-pass grouping seed. Its top tags currently include `headings`, `links`, `blank_lines`, `code`, `emphasis`, `table`, `images`, `bullet`, `accessibility`, and `blockquote`. |
| [Per-rule docs under `doc/`](https://github.com/DavidAnson/markdownlint/tree/main/doc) | Detailed rule behavior, options, rationale, and examples for `doc/md001.md` through `doc/md060.md` with known gaps | Use these pages for actual built-in rule semantics. If a `Rules.md` summary is ambiguous or compressed, the per-rule page wins. |
| [Custom rules guide](https://github.com/DavidAnson/markdownlint/blob/main/doc/CustomRules.md) | Custom rule authoring, loading, helper packages, and integration points | Use when future package guidance covers custom rules, helper ecosystems, or extending markdownlint beyond built-in checks. |
| [Prettier coexistence guide](https://github.com/DavidAnson/markdownlint/blob/main/doc/Prettier.md) | Formatter coexistence, overlap boundaries, and toolchain trade-offs | Use when guidance touches Prettier or another formatter in the same workflow. Keep the guidance scoped to coexistence, not built-in rule semantics. |
| [Release process](https://github.com/DavidAnson/markdownlint/blob/main/doc/ReleaseProcess.md) | Upstream maintainer release procedure | Exclude from normal authoring guidance. Use only for narrow maintainer tasks such as tracking how new upstream rules or docs may arrive. |

#### Upstream usage notes

- The README is the best source for install, configuration, API, CLI, browser,
  and example workflows.
- `doc/Rules.md` is the best source for the built-in catalog, aliases, and tag
  vocabulary that can seed grouped domains.
- The per-rule files under `doc/` are the authoritative source for built-in
  rule behavior and options.
- `doc/CustomRules.md` and `doc/Prettier.md` are not rule-definition files, but
  they are canonical for extension and toolchain guidance.

---

### Repo-local overlay sources

These files are approved as repository-local overlays. They inform how this
repository wants Markdown written or reviewed, but they do not redefine what
markdownlint means upstream.

| Source | Contribution | Overlay rule |
| --- | --- | --- |
| [`../../../../.github/instructions/markdown.instructions.md`](../../../../.github/instructions/markdown.instructions.md) | Repo-local Markdown structure, list, code block, table, whitespace, and publishing-oriented expectations | Apply only as a repo overlay. Its blog-style front matter requirements are not generic markdownlint defaults and should appear only when the target content actually participates in that publishing workflow. |
| [`../../../../.github/instructions/markdown-accessibility.instructions.md`](../../../../.github/instructions/markdown-accessibility.instructions.md) | Repo-local accessibility review guidance for links, images, heading hierarchy, plain language, lists, and emoji usage | Apply as a companion accessibility overlay. It complements upstream accessibility-tagged rules, but it is broader than markdownlint and does not map to rule IDs one-to-one. |

---

### First-pass grouped domain model

Use the upstream tags and the local overlay split above to seed the future rule
library. This is a first-pass grouping model, not a frozen final taxonomy.

| Domain | Scope | Primary sources |
| --- | --- | --- |
| Foundation and configuration | Install flow, config surfaces, CLI and API usage, rule aliases and tags, validation workflow, and narrow config overrides | README, `doc/Rules.md`, `doc/Prettier.md` |
| Headings, front matter, and document structure | Heading order, first-heading expectations, section spacing, and front-matter-adjacent structure notes | `doc/Rules.md`, per-rule docs, repo-local markdown instructions as overlay only |
| Lists, whitespace, and block spacing | Bullet and ordered lists, indentation, trailing spaces, tabs, blank lines, and blockquote-adjacent spacing | `doc/Rules.md`, per-rule docs |
| Code, HTML, and emphasis | Fenced code blocks, language hints, inline HTML boundaries, emphasis markers, and related readability concerns | `doc/Rules.md`, per-rule docs |
| Links, images, and accessibility | Link validity, fragments, reference links, image handling, descriptive link text, alt text, and accessibility review edges | `doc/Rules.md`, per-rule docs, repo-local accessibility overlay |
| Tables and layout edges | Table formatting, row consistency, blank-line boundaries, and nearby layout edge cases that often travel with tables | `doc/Rules.md`, per-rule docs |
| Custom rules, suppressions, and toolchain coexistence | Custom rule authoring, helper ecosystem, inline disables, config-based suppressions, and formatter coexistence | README, `doc/CustomRules.md`, `doc/Prettier.md` |

#### Domain-shaping notes

- The top tags in `doc/Rules.md` are a strong grouping seed, but they do not
  require a one-tag-per-file taxonomy.
- `front matter` belongs in the structure domain only as an overlay boundary.
  Repo-specific front matter fields must not be promoted into generic
  markdownlint guidance.
- `accessibility` spans both upstream rule tags and repo-local review guidance,
  so future rule files should keep an explicit "upstream default" versus
  "repo-local overlay" split.

---

### Guardrails for future rule authoring

- Do not treat
  [`markdown.instructions.md`](../../../../.github/instructions/markdown.instructions.md)
  as a statement of generic markdownlint policy.
- Do not turn the blog-style front matter fields in
  [`markdown.instructions.md`](../../../../.github/instructions/markdown.instructions.md)
  into universal guidance for all Markdown files.
- Do not infer full rule behavior from README summaries or a single row in
  `doc/Rules.md` when a dedicated `doc/md0xx.md` page exists.
- Do not present
  [`markdown-accessibility.instructions.md`](../../../../.github/instructions/markdown-accessibility.instructions.md)
  as if markdownlint alone enforces every accessibility expectation it describes.
- Do not let `doc/Prettier.md` become a blanket "disable whichever rules clash"
  rule. Keep formatter guidance narrow and explicitly toolchain-scoped.
- Do not use `doc/ReleaseProcess.md`, README `Contributing`, README `Releasing`,
  or README `History` sections as day-to-day authoring guidance.
- Do not treat package-local files such as [default-rule-profile.md](./default-rule-profile.md),
  [install-and-validation.md](./install-and-validation.md), or future grouped
  rule files as upstream authorities. They are downstream summaries that must
  stay traceable to the approved sources above.

---

### Maintainer notes

- Add a source here before using it in a new grouped rule or reference file.
- In future rule files, state the upstream default first and attach the
  repository-local overlay second.
- When upstream adds or renames built-in rules, update this inventory before
  reshaping the grouped rule library.
- If a future rule file needs maintainer-only workflow detail, keep that note
  clearly separated from day-to-day author guidance.
