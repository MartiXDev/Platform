# Maintainer and agent guide

## Package role

`martix-fluent-ui` is the portfolio owner for Fluent UI implementation decisions.
It is React-first and targets Fluent UI React v9 unless the inspected repository
shows a migration or Web Components scenario.

## Ownership boundaries

| Concern | Owner |
| --- | --- |
| Fluent package generation and component selection | `martix-fluent-ui` |
| Provider, themes, CSS-first token styling, Griffel boundaries, slots, accessibility | `martix-fluent-ui` |
| Fluent SSR, icons, motion, charts, migration | `martix-fluent-ui` |
| TypeScript language design, tsconfig, declarations | `martix-typescript` |
| SPFx host, packaging, deployment, SharePoint theme variants | `martix-sharepoint-spfx` |
| Generic React architecture without Fluent UI | Target repository or React-specific guidance |
| Vue composition and state management | Target repository; this package covers only Fluent Web Components integration |

## Authoring contract

- Keep `SKILL.md` a short activation and routing layer.
- Put durable decisions in focused rules using the shared section order.
- Put release status, version ranges, and source navigation in references.
- Prefer official package README, Storybook, source, and npm metadata over
  secondary articles.
- Date version-sensitive claims and avoid presenting pinned examples as timeless.
- Preserve the public-before-unstable composition boundary.
- Add or revise evals when behavior or activation scope changes.

## Review routes

| Change | Review |
| --- | --- |
| New React component guidance | Component selection, slots, tokens, semantics, keyboard, focus, tests |
| New styling guidance | Stylesheet ownership, token variables, Griffel exception, RTL, forced colors, consumer overrides |
| New package recommendation | Current version, release channel, peer range, official support status |
| New SSR recipe | Renderer lifecycle, style insertion order, hydration, current Next.js compatibility |
| New Vue guidance | Web Components v3 API, registration, custom-element typing, no React-only concepts |
| New template | Public APIs only, type-safe props, accessible names, target build assumptions |

## Verification

Run the repository validator after package changes:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\validate-repository.ps1
```

Run the Markdown hook for authored Markdown changes:

```powershell
powershell -ExecutionPolicy Bypass `
  -File .\plugins\martix-markdown-automation\hooks\markdown-check.ps1 `
  -CheckOnly
```

For skill behavior changes, run with-skill and no-skill evals, grade objective
expectations, aggregate the benchmark, and generate the skill-creator review view.
