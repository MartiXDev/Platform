# MartiX TypeScript agents guide

Use this guide for cross-branch implementation, review routes, and package
maintenance. Start ordinary tasks in [SKILL.md](./SKILL.md).

## Cost-aware routing

- Use `premium` for cross-package migration, public API design, or ambiguous
  module architecture.
- Use `medium` for package-local implementation and focused rule application.
- Use `cheap` for compiler checks, JSON and link validation, or mechanical
  cleanup.

## Cross-branch review routes

| Scenario | Start with | Then add |
| --- | --- | --- |
| New typed API over untrusted input | [Type design](./rules/language-type-design.md) | [Narrowing and boundaries](./rules/language-narrowing-boundaries.md), runtime validation owner |
| Advanced generic library API | [Generics](./rules/language-generics-advanced-types.md) | [Declarations](./rules/libraries-declarations-publishing.md), [type tests](./rules/quality-type-tests.md) |
| Node ESM conversion | [Module host map](./references/module-host-map.md) | [Host-aware modules](./rules/modules-host-resolution.md), [project config](./rules/config-project-shape.md) |
| TypeScript 6 to 7 library migration | [Migration](./rules/migration-typescript-7.md) | [Compatibility](./rules/tooling-api-compatibility.md), declarations, type tests |
| Slow monorepo | [Performance](./rules/performance-diagnostics.md) | project config, compiler diagnostics map |
| Typed JavaScript migration | [JS/JSDoc changes](./references/javascript-jsdoc-ts7-changes.md) | narrowing and boundaries |

Use the [SKILL.md handoff boundaries](./SKILL.md#handoff-boundaries) as the
single ownership map when a route reaches a framework, test runner, linter,
bundler, or package manager.

## Maintainer contract

- Keep normative guidance in one rule file. References map decisions and sources
  without duplicating the rule.
- Keep version-sensitive facts in dated references and stable process in
  `SKILL.md`.
- Compile every bundled TypeScript example and validate each config template
  against its documented compiler baseline.
- Update `metadata.json`, `assets\taxonomy.json`,
  `assets\section-order.json`, and `evals\evals.json` when routes move.
- Treat `.github\plugin\marketplace.json` and root README files as
  coordinator-owned shared surfaces.

## Validation

Run the Markdown hook for changed Markdown files, then:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\validate-repository.ps1
```
