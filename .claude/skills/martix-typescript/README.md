# MartiX TypeScript

`martix-typescript` is a standalone TypeScript 7 skill for type-first
implementation, compiler configuration, migration, declarations, module
resolution, type tests, and performance diagnosis. It preserves an explicit
TypeScript 6 compatibility branch for tools that still require the legacy
compiler API.

## Install

```powershell
copilot plugin marketplace add MartiXDev/skills
copilot plugin install martix-typescript@martix-skills
npx skills add https://github.com/MartiXDev/skills --skill martix-typescript
```

Use a direct package path only for local validation:

```powershell
npx skills add `
  C:\Git\MartiXDev\skills\skills\martix-typescript `
  -a github-copilot -y
```

## What it owns

- TypeScript language and type-driven API design
- `tsconfig`, project references, declaration emit, and compiler diagnostics
- Host-aware ESM/CJS and module-resolution decisions
- TypeScript 5/6 to 7 migration and TS6/TS7 side-by-side tooling
- Type-level tests and measured compiler-performance work

Framework APIs, runtime test-runner setup, lint policy, bundler internals, and
package release mechanics remain companion-skill concerns.

## Package layout

| Path | Purpose |
| --- | --- |
| `SKILL.md` | Compact process and routing entrypoint |
| `AGENTS.md` | Cross-branch routes and maintainer contract |
| `rules\` | Normative TypeScript decisions |
| `references\` | Dated compatibility, decision maps, and official sources |
| `templates\` | Host-specific config and type-test starting points |
| `assets\` | Machine-readable taxonomy and stable ordering |
| `evals\evals.json` | Routing and behavior regressions |

## Baseline

The package treats TypeScript 7 as the greenfield compiler baseline as of
2026-07-21. It does not assume that compiler-API consumers or embedded framework
tooling are TS7-compatible. Check
[the compatibility map](./references/typescript-7-compatibility-map.md) before
changing those projects.

## Verification

Validate authored Markdown and the repository contract:

```powershell
powershell -ExecutionPolicy Bypass `
  -File .\plugins\martix-markdown-automation\hooks\markdown-check.ps1 `
  -CheckOnly `
  -Path .\skills\martix-typescript

powershell -ExecutionPolicy Bypass -File .\scripts\validate-repository.ps1
```
