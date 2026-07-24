---
description: 'Maintainer and user guide for the martix-markdown standalone skill package'
---

# Package overview

`martix-markdown` is the canonical standalone-first source package for
the MartiX Markdown skill. It now ships the authored router, grouped rule
library, instruction-bridge layer, reference maps, templates, and
machine-readable taxonomy that standalone installs and direct marketplace
registration should consume from `skills`.

- Canonical source root: `skills\martix-markdown`
- Primary install surface: standalone `skills` CLI
- Secondary install surface: Copilot CLI plugin marketplace
- Discovery key: `martix-markdown`

## Package structure

| Path | Purpose |
| --- | --- |
| [SKILL.md](./SKILL.md) | Activation router into the grouped rule library and instruction-bridge layer. |
| [AGENTS.md](./AGENTS.md) | Companion guide with cross-family review routes, source boundaries, and maintainer notes. |
| [rules/](./rules) | 7 grouped markdownlint rule files plus support scaffolds. |
| [references/](./references) | 8 reference docs covering source boundaries, rule-family routing, config and validation, the instruction bridge, accessibility review, fallback profile, install notes, and toolchain coexistence. |
| [templates/](./templates) | 4 authoring and config scaffolds. |
| [assets/](./assets) | Machine-readable taxonomy and ordering data. |
| [evals/](./evals) | Skill-creator style eval prompts for future benchmark and trigger-tuning loops. |
| [metadata.json](./metadata.json) | Registration-ready package inventory. |
| [LICENSE.txt](./LICENSE.txt) | License terms for distributing the skill package. |
| [`.markdownlint.json`](./.markdownlint.json) | Local lint policy for this package's own docs. |

## How to use the package

- Start with [SKILL.md](./SKILL.md) for quick routing by MD code, rule family,
  or repair scenario.
- Open the closest grouped rule file under [rules/](./rules) for the primary
  markdownlint guidance.
- Use [instruction-bridge.md](./references/instruction-bridge.md) when the task
  compares upstream markdownlint defaults with repo-local Markdown or
  accessibility overlays.
- Use [accessibility-review-map.md](./references/accessibility-review-map.md)
  when lint passes but descriptive links, alt text, plain language, or emoji
  review still matters.
- Use [AGENTS.md](./AGENTS.md) for cross-family review routes, source boundaries,
  and package maintenance notes.

## Package boundary

- Use this package for markdownlint behavior, markdownlint-cli2 findings,
  content-versus-config decisions, suppressions, custom rules, Prettier
  coexistence, and accessibility-adjacent Markdown review.
- Do not use this package for generic prose improvement, repository publishing
  workflow, or technical guidance owned by another MartiX skill.

## Maintainer notes

- The shared rule contract lives in
  [rules/_sections.md](./rules/_sections.md).
- The approved source boundary and overlay model live in
  [references/doc-source-index.md](./references/doc-source-index.md) and
  [references/instruction-bridge.md](./references/instruction-bridge.md).
- The grouped-domain routing map lives in
  [references/rule-family-map.md](./references/rule-family-map.md).
- The config, suppression, and validation decision map lives in
  [references/config-and-validation-map.md](./references/config-and-validation-map.md).
- The package inventory and distribution intent live in
  [metadata.json](./metadata.json).
- Keep [evals/evals.json](./evals/evals.json) aligned with the router's main
  decision routes when grouped rules or overlay boundaries change.
- Update [metadata.json](./metadata.json),
  [assets/taxonomy.json](./assets/taxonomy.json), and
  [assets/section-order.json](./assets/section-order.json) together whenever
  rules, references, or templates move.
- Marketplace registration points directly at this folder as the single source
  of truth.

## Installation

### Copilot CLI marketplace flow

Use the marketplace flow for normal GitHub Copilot CLI installs.

```powershell
copilot plugin marketplace add MartiXDev/skills
copilot plugin marketplace list
copilot plugin marketplace browse martix-skills
copilot plugin install martix-markdown@martix-skills
```

### Standalone skills CLI flow

Use repo-root skill selection for standalone skill installs.

```powershell
npx skills add https://github.com/MartiXDev/skills --skill martix-markdown
```

### Direct source path flow

Use a direct package path only for local validation or development.

```powershell
npx skills add C:\Git\MartiXDev\skills\skills\martix-markdown -a github-copilot -y
npx skills add C:\Git\MartiXDev\skills\skills\martix-markdown -a github-copilot --copy -y
```

For validation from GitHub, point at the package folder:
`https://github.com/MartiXDev/skills/tree/main/skills/martix-markdown`.

Only the following slash-command equivalents are documented in the reviewed
research, so keep marketplace browsing as a shell command for now.

```text
/plugin marketplace add MartiXDev/skills
/plugin marketplace list
/plugin install martix-markdown@martix-skills
/plugin marketplace remove martix-skills
```

### Automatic Markdown enforcement

Use `martix-markdown` when you need Markdown authoring, lint repair, and review guidance. Use the companion `martix-markdown-automation` plugin when a project should automatically check and fix Markdown files as agents create or update them.

```powershell
copilot plugin install martix-markdown-automation@martix-skills
powershell -ExecutionPolicy Bypass -File .\plugins\martix-markdown-automation\hooks\markdown-check.ps1
```

The automation plugin auto-fixes first, reruns markdownlint checks, and reports remaining issues. Use its `-CheckOnly` mode for CI, dry runs, or conservative projects.

## Verification

### Standalone validation

Preview or verify the standalone package with these commands:

```powershell
npx skills add C:\Git\MartiXDev\skills\skills\martix-markdown --list
npx skills list
```

Expect to see an installed entry named `martix-markdown` after a
successful install.

### Marketplace validation

Verify marketplace registration and plugin installation with these commands:

```powershell
copilot plugin marketplace list
copilot plugin marketplace browse martix-skills
copilot plugin list
```

To validate the package's own Markdown docs in this repository, run:

```powershell
npx --yes markdownlint-cli2 "skills/martix-markdown/**/*.md"
```

## Update

```powershell
npx skills check
npx skills update
```

If you are iterating on the local working tree, re-run the install command with
`--copy` after updating the source files.

## Uninstall

```powershell
npx skills remove martix-markdown
npx skills rm martix-markdown
```

Add `-g` when removing a global standalone install.

## Discovery precedence and same-name conflicts

Copilot deduplicates by the skill `name` declared in `SKILL.md`, not by folder
path. A project or personal standalone install can load before a later
marketplace-delivered copy with the same name.

- A standalone `martix-markdown` install can shadow the marketplace version of
  `martix-markdown`.
- For marketplace validation, use a clean environment or remove the standalone
  copy first.
- If both surfaces must coexist, the eventual package names must stay distinct.

## Troubleshooting

| Symptom | Likely cause | What to do |
| --- | --- | --- |
| `npx skill add` fails | The documented binary is `skills`, not `skill` | Use `npx skills add <source>` exactly as shown. |
| Repo-root install discovery fails | `Skills` is not a default discovery root | Use an absolute folder path or GitHub tree URL. |
| Windows relative path is treated like a git source | The `skills` CLI interprets `.\skills\...` as a git-like source on Windows | Use the full absolute path instead. |
| Markdown still fails lint after autofix | The remaining issues are structural, repo-specific, or span multiple rule families | Start with [rule-family-map.md](./references/rule-family-map.md), then open the closest grouped rule and [instruction-bridge.md](./references/instruction-bridge.md) if repo-local overlays matter. |
| A repo policy conflicts with an upstream markdownlint default | The fix belongs in config or a bridge note, not a repeated content edit | Use [config-and-validation-map.md](./references/config-and-validation-map.md), [foundation-configuration.md](./rules/foundation-configuration.md), and [instruction-bridge.md](./references/instruction-bridge.md). |
| Lint passes but accessibility review is still weak | `MD045` and `MD059` cover only part of the review surface | Use [links-images-accessibility.md](./rules/links-images-accessibility.md) and [accessibility-review-map.md](./references/accessibility-review-map.md). |
| Prettier or another formatter keeps reintroducing findings | Tool ownership is unclear | Use [custom-rules-suppressions-toolchain.md](./rules/custom-rules-suppressions-toolchain.md) and [prettier-and-tooling-notes.md](./references/prettier-and-tooling-notes.md). |
