# Migration map

## Inventory

Capture:

- package names, versions, and React peer constraints;
- imports from Fabric, v8, v0, v9, deep paths, and compatibility packages;
- providers and theme sources;
- styling systems such as `mergeStyleSets`, `styled`, CSS-in-JS, and Griffel;
- components with custom render hooks or private DOM selectors;
- tests coupled to class names or legacy markup;
- accessibility behavior and known exceptions.

## Slice plan

| Phase | Outcome |
| --- | --- |
| Baseline | Current behavior, visuals, keyboard, focus, and tests are recorded |
| Boundary | One coherent feature or component family is selected |
| Contract | Public v9 replacement, gaps, and adapter surface are identified |
| Implementation | Provider, tokens, stylesheet ownership, components, and tests move together |
| Acceptance | Behavior and accessibility match the declared criteria |
| Cleanup | Legacy package, styles, adapter, and dead tests are removed |

## Common translations

- Theme values become semantic v9 tokens or one explicit theme adapter.
- Legacy render callbacks become public v9 slots or compound components where
  supported.
- Legacy styling moves to the repository's stylesheet convention, using CSS Modules
  by default and semantic Fluent variables. Retain Griffel only behind a documented
  capability or coherent existing boundary.
- Deep imports become public package exports.
- DOM-shape tests become role/name/state and user-flow tests.

Translations are conceptual, not mechanical. Confirm the target component's
current API and interaction.

## Coexistence constraints

- Keep both generations operational only for a bounded migration window.
- Avoid making a universal wrapper that attempts to normalize every v8 and v9 prop.
- Track duplicate styling/runtime cost and package peer constraints.
- Give each adapter an owner, test, and deletion condition.

## Evidence

- [Fluent UI v9 migration docs](https://github.com/microsoft/fluentui/tree/master/packages/react-components/react-components/docs/react-v9/migration)
- [Fluent UI Storybook](https://react.fluentui.dev/)
