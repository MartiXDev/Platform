## Package overview

`martix-dotnet-csharp` is the canonical standalone-first source package for the
MartiX .NET 10+ and C# 14+ skill. It stores the authored rule library,
reference docs, templates, and machine-readable taxonomy that Copilot CLI and
marketplace packaging should consume.

This folder already contains the authored support library under
[`rules/`](./rules), [`references/`](./references),
[`templates/`](./templates), and [`assets/`](./assets), plus the current
entrypoints `SKILL.md` and `AGENTS.md`. The install flows below describe the
intended release path and current package shape.

- Canonical source root: `skills\martix-dotnet-csharp`
- Primary install surface: standalone `skills` CLI
- Secondary install surface: Copilot CLI plugin marketplace
- Discovery key: `martix-dotnet-csharp`

## Compatibility stance

The authoritative compatibility decision lives in
[`SKILL.md`](./SKILL.md#compatibility-stance). It distinguishes greenfield or
explicit-upgrade work from incremental modernization of an existing SDK-style
repository; read that decision before using a net10-only API or C# 14 feature.

## Package structure

| Path | Purpose |
| --- | --- |
| [`rules/`](./rules) | Nineteen topic files plus shared rule scaffolding for language, SDK, runtime, async, design, web, data, testing, diagnostics, and security guidance. |
| [`references/`](./references) | Thirteen reference docs covering source boundaries, quick-reference guides, bootstrap recipes, and traceable source maps. |
| [`templates/`](./templates) | Maintainer scaffolds for new rules, research packs, and comparison work. |
| [`assets/`](./assets) | Machine-readable taxonomy and ordering data used to keep the package consistent as the library grows. |
| [`metadata.json`](./metadata.json) | Package identity, taxonomy summary, distribution notes, and release-facing reference lists. |

### Maintainer notes

- The shared rule contract lives in
  [`rules/_sections.md`](./rules/_sections.md).
- The approved source boundary and first-pass exclusions live in
  [`references/doc-source-index.md`](./references/doc-source-index.md).
- Taxonomy and stable file ordering live in
  [`assets/taxonomy.json`](./assets/taxonomy.json) and
  [`assets/section-order.json`](./assets/section-order.json).
- Marketplace registration should point directly at this folder when no
  extra plugin-scoped assets are needed.

## Installation

### Copilot CLI marketplace flow

Use the marketplace flow for normal GitHub Copilot CLI installs.

```powershell
copilot plugin marketplace add MartiXDev/skills
copilot plugin marketplace list
copilot plugin marketplace browse martix-skills
copilot plugin install martix-dotnet-csharp@martix-skills
```

### Standalone skills CLI flow

Use repo-root skill selection for standalone skill installs.

```powershell
npx skills add https://github.com/MartiXDev/skills --skill martix-dotnet-csharp
```

### Direct source path flow

Use a direct package path only for local validation or development.

```powershell
npx skills add C:\Git\MartiXDev\skills\skills\martix-dotnet-csharp -a github-copilot -y
npx skills add C:\Git\MartiXDev\skills\skills\martix-dotnet-csharp -a github-copilot --copy -y
```

For validation from GitHub, point at the package folder:
`https://github.com/MartiXDev/skills/tree/main/skills/martix-dotnet-csharp`.

Only the following slash-command equivalents are documented in the reviewed
research, so keep marketplace browsing as a shell command for now.

```text
/plugin marketplace add MartiXDev/skills
/plugin marketplace list
/plugin install martix-dotnet-csharp@martix-skills
/plugin marketplace remove martix-skills
```

## Verification

### Standalone verification

Preview or verify the standalone package with these commands:

```powershell
npx skills add C:\Git\MartiXDev\skills\skills\martix-dotnet-csharp --list
npx skills list
```

Expect to see an installed entry named `martix-dotnet-csharp` after a successful
install.

### Plugin marketplace verification

Verify marketplace registration and plugin installation with these commands:

```powershell
copilot plugin marketplace list
copilot plugin marketplace browse martix-skills
copilot plugin list
```

If the marketplace install looks clean but the skill still appears missing,
check the discovery precedence section before debugging the registration.

## Update

### Standalone update

```powershell
npx skills check
npx skills update
```

### Plugin update

```powershell
copilot plugin update martix-dotnet-csharp
copilot plugin update --all
```

If the plugin update appears to do nothing, verify that a same-name standalone
install is not shadowing the plugin-delivered copy.

## Uninstall

### Standalone uninstall

```powershell
npx skills remove martix-dotnet-csharp
npx skills rm martix-dotnet-csharp
```

Add `-g` when removing a global standalone install.

### Plugin uninstall

```powershell
copilot plugin uninstall martix-dotnet-csharp
copilot plugin marketplace remove martix-skills
```

If the marketplace still has installed plugins, remove them first or use
`--force` only when you intentionally want to clear the marketplace
registration.

## Discovery precedence and same-name conflicts

Copilot deduplicates by the skill `name` declared in `SKILL.md`, not by folder
path. The reviewed plugin reference describes first-found-wins behavior, so a
project or personal standalone install can load before a plugin-delivered copy
with the same name.

- A standalone `martix-dotnet-csharp` install can silently shadow the plugin
  version of `martix-dotnet-csharp`.
- This can make plugin verification, update checks, and uninstall checks look
  inconsistent.
- For plugin validation, use a clean environment or remove the standalone copy
  first.
- If both surfaces must coexist, the eventual package names must stay distinct.

## Troubleshooting

| Symptom | Likely cause | What to do |
| --- | --- | --- |
| `npx skill add` fails or resolves the wrong tool | The documented binary is `skills`, not `skill` | Use `npx skills add <source>` exactly as shown in the official docs. |
| Repo-root install does not discover the package | `Skills` is not a documented default discovery root | Install from a direct folder path or direct GitHub tree URL to `skills\martix-dotnet-csharp`. |
| Windows relative path is treated like a git source | The `skills` CLI interprets `.\skills\...` as a git-like source on Windows | Use the full absolute path instead. |
| Standalone install looks linked instead of copied | The `skills` CLI uses symlink-based installs by default | Re-run the install with `--copy` when you need a copied layout. |
| Plugin install succeeds but the skill still does not appear | A same-name standalone install is taking precedence | Remove the standalone copy or test the plugin in a clean environment. |
| Marketplace removal fails | Installed plugins still depend on the registered marketplace | Uninstall `martix-dotnet-csharp` first, then remove the marketplace, or use `--force` intentionally. |
| Install commands fail because the chosen source is missing an entrypoint | The install source does not contain `SKILL.md` at its root | Install from `skills\martix-dotnet-csharp` or another published source that already includes `SKILL.md`. |
