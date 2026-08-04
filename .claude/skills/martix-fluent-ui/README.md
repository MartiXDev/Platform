# MartiX Fluent UI

Standalone React-first Fluent UI skill for building and reviewing accessible,
theme-aware interfaces with Fluent UI React v9.

## Install

From the `martix-skills` marketplace:

```sh
copilot plugin install martix-fluent-ui@martix-skills
```

As a standalone skill:

```sh
npx skills add https://github.com/MartiXDev/skills --skill martix-fluent-ui
```

## Scope

- `@fluentui/react-components` v9 selection and setup
- `FluentProvider`, client-brand theme adapters, design tokens, and nested scopes
- CSS-first application styling, CSS Modules, bounded Griffel use, RTL, and
  forced-colors behavior
- public slots, compound components, and advanced recomposition boundaries
- semantics, keyboard interaction, focus, overlays, and form behavior
- SSR and Next.js style extraction or hydration concerns
- Fluent icons, motion, charts, and package maturity checks
- v8, v0, and Fabric migration or coexistence
- Vue only through `@fluentui/web-components`

The package intentionally hands TypeScript language configuration, declaration
publishing, and type-level API design to `martix-typescript`.

## Layout

| Path | Purpose |
| --- | --- |
| `SKILL.md` | Activation, workflow, and topic routing |
| `rules\` | Durable implementation and review policy |
| `references\` | Dated version facts, source map, recipes, and decision maps |
| `templates\` | TypeScript, TSX, and CSS Module starting points |
| `assets\` | Machine-readable taxonomy and loading order |
| `evals\` | Behavior and activation coverage |

## Verification

Run the repository validator and the Markdown check from the repository root.
When version-sensitive guidance changes, update
`references\version-support-map.md` with the evidence date and source.
