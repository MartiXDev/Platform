# Migration and coexistence

## Purpose

Move legacy Fluent UI or Fabric code toward v9 without hiding behavior changes or
creating an unbounded mixed-generation layer.

## Default guidance

- Inventory packages, imports, providers, styling systems, deep imports, component
  usage, and test assumptions before editing.
- Migrate by coherent feature or component boundary. Keep the application running
  and define a cutover criterion for each slice.
- Map behavior and accessibility first, then visual styling. A same-named component
  is not proof of API or interaction equivalence.
- Move legacy styling to the repository's stylesheet convention at the migrated
  boundary, using CSS Modules by default and semantic Fluent variables. Retain
  application Griffel only for a documented capability that classes cannot safely
  preserve.
- Isolate unavoidable v8/v9 interop and remove the adapter after its migration slice.

## Decision branches

- For Fabric or v8 packages, use official v9 migration guidance and Storybook to
  identify converged replacements and gaps.
- For v0 Northstar, treat component concepts, shorthands, and accessibility
  behaviors as migration inputs; do not mechanically rename imports.
- When no v9 equivalent exists, choose between keeping the legacy component behind
  an adapter, composing public v9 primitives, or accepting a version-gated
  preview package. Document the tradeoff.
- Avoid broad dependency overrides that force incompatible React or package peers.
- Use codemods only for transformations they explicitly support, then review the
  semantic diff.

## Review checklist

- [ ] Legacy generations and styling systems are inventoried.
- [ ] Each slice has behavior, visual, accessibility, and test acceptance criteria.
- [ ] Interop adapters have narrow ownership and an exit condition.
- [ ] Deep imports and private DOM assumptions are removed.
- [ ] Package peer ranges and bundle duplication are checked.
- [ ] Migration notes distinguish known gaps from implementation defects.

## Related files

- [Migration map](../references/migration-map.md)
- [Foundation, packages, and themes](./foundation-packages-provider-theme.md)
- [Component composition](./component-composition-slots.md)

## Source anchors

- [Fluent UI v9 migration documentation](https://github.com/microsoft/fluentui/tree/master/packages/react-components/react-components/docs/react-v9/migration)
- [Fluent UI repository](https://github.com/microsoft/fluentui)
