# Component composition, slots, and advanced recomposition

## Purpose

Choose the right Fluent interaction and extend it without breaking public
contracts, semantics, or upgradeability.

## Default guidance

- Search current Fluent Storybook and package exports before building a custom
  interaction.
- Prefer a semantic high-level component over assembling atomic controls and
  keyboard handlers.
- Use documented slots and compound components as the normal extension surface.
- Treat slot shorthand, render functions, and slot props as public contracts:
  preserve accessible props, handlers, refs, and consumer customization.
- Keep application wrappers thin. Expose domain props and supported Fluent escape
  hatches rather than mirroring every upstream prop without purpose.

## Decision branches

- Use a public component directly when its interaction and semantics match.
- Use public slots when the component matches but content or presentation differs.
- Use compound components when consumers must coordinate visible subparts.
- Build a custom component from Fluent primitives only when no existing public
  component owns the interaction. Start from the WAI-ARIA pattern and test the full
  keyboard contract.
- Consider `_unstable` state/render APIs only for advanced recomposition that public
  slots cannot express. Verify the installed source, isolate the dependency behind
  one adapter, and document upgrade risk.
- Do not use internal DOM selectors or copied Fluent source as an extension API.

## Review checklist

- [ ] Current public components were considered first.
- [ ] The chosen component matches the interaction, not only the appearance.
- [ ] Slot props, refs, and event composition are preserved.
- [ ] Wrapper props express a stable domain contract.
- [ ] Any `_unstable` API has a documented reason and containment boundary.
- [ ] Custom interactions include semantics, keyboard, focus, and tests.

## Related files

- [Component selection map](../references/component-selection-map.md)
- [Accessibility and focus](./accessibility-focus.md)
- [Testing and quality gates](./testing-quality-gates.md)

## Source anchors

- [Fluent UI React v9 Storybook](https://react.fluentui.dev/)
- [Fluent UI React components source](https://github.com/microsoft/fluentui/tree/master/packages/react-components)
- [WAI-ARIA Authoring Practices patterns](https://www.w3.org/WAI/ARIA/apg/patterns/)
