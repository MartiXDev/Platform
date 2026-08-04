# Package overview

`martix-fluentvalidation` is the canonical standalone-first source package for
the MartiX FluentValidation skill. It stores the authored entrypoints, rule
library, reference library, templates, and registration-ready metadata that
direct standalone installs should consume from this folder.

- Canonical source root: `skills\martix-fluentvalidation`
- Primary install surface: standalone `skills` CLI
- Secondary install surface: Copilot CLI plugin marketplace
- Discovery key: `martix-fluentvalidation`

## Package structure

| Path | Purpose |
| --- | --- |
| [SKILL.md](./SKILL.md) | Activation router |
| [AGENTS.md](./AGENTS.md) | Companion guide |
| [rules/](./rules) | 23 rule files plus support scaffolds |
| [references/](./references) | 13 quick references, recipes, workstream maps, compatibility, and ecosystem notes |
| [templates/](./templates) | Author scaffolds |
| [assets/](./assets) | Supporting taxonomy and ordering data |
| [metadata.json](./metadata.json) | Package metadata and distribution notes |

## Maintainer notes

- The shared rule contract lives in
  [rules/_sections.md](./rules/_sections.md).
- The reference surface under [references/](./references) includes the
  [anti-patterns quick reference](./references/anti-patterns-quick-reference.md),
  [web bootstrap recipes](./references/web-bootstrap-recipes.md),
  [testing bootstrap recipes](./references/testing-bootstrap-recipes.md), the
  workstream maps, the compatibility matrix, and the Blazor ecosystem note.
- The registration-ready inventory lives in
  [metadata.json](./metadata.json).
- Marketplace registration points directly at this folder as the single source
  of truth.

## Installation

### Copilot CLI marketplace flow

Use the marketplace flow for normal GitHub Copilot CLI installs.

```powershell
copilot plugin marketplace add MartiXDev/skills
copilot plugin marketplace list
copilot plugin marketplace browse martix-skills
copilot plugin install martix-fluentvalidation@martix-skills
```

### Standalone skills CLI flow

Use repo-root skill selection for standalone skill installs.

```powershell
npx skills add https://github.com/MartiXDev/skills --skill martix-fluentvalidation
```

### Direct source path flow

Use a direct package path only for local validation or development.

```powershell
npx skills add C:\Git\MartiXDev\skills\skills\martix-fluentvalidation -a github-copilot -y
npx skills add C:\Git\MartiXDev\skills\skills\martix-fluentvalidation -a github-copilot --copy -y
```

For validation from GitHub, point at the package folder:
`https://github.com/MartiXDev/skills/tree/main/skills/martix-fluentvalidation`.

Only the following slash-command equivalents are documented in the reviewed
research, so keep marketplace browsing as a shell command for now.

```text
/plugin marketplace add MartiXDev/skills
/plugin marketplace list
/plugin install martix-fluentvalidation@martix-skills
/plugin marketplace remove martix-skills
```

## Verification

### Standalone validation

Preview or verify the standalone package with these commands:

```powershell
npx skills add C:\Git\MartiXDev\skills\skills\martix-fluentvalidation --list
npx skills list
```

Expect to see an installed entry named `martix-fluentvalidation` after a
successful install.

### Marketplace validation

Verify marketplace registration and plugin installation with these commands:

```powershell
copilot plugin marketplace list
copilot plugin marketplace browse martix-skills
copilot plugin list
```

## Update

```powershell
npx skills check
npx skills update
```

## Uninstall

```powershell
npx skills remove martix-fluentvalidation
npx skills rm martix-fluentvalidation
```

Add `-g` when removing a global standalone install.

## Discovery precedence and same-name conflicts

Copilot deduplicates by the skill `name` declared in `SKILL.md`, not by folder
path. A project or personal standalone install can load before a later
marketplace-delivered copy with the same skill name.

- A standalone `martix-fluentvalidation` install can shadow the marketplace
  version of `martix-fluentvalidation`.
- For marketplace validation, use a clean environment or remove the standalone
  copy first.
- If both surfaces must coexist, the eventual package names must stay distinct.

## Troubleshooting

### `npx skill add` fails

- Cause: The documented binary is `skills`, not `skill`
- Solution: Use `npx skills add <source>` exactly as shown

### Repo-root install discovery fails

- Cause: `Skills` is not a default discovery root
- Solution: Use direct folder path or GitHub tree URL

### Standalone install linked instead of copied

- Cause: `skills` CLI uses symlink installs by default
- Solution: Re-run with `--copy` for copied layout

### Skill updates missing after later marketplace work

- Cause: Same-name standalone install takes precedence
- Solution: Remove the standalone copy or validate in a clean environment
