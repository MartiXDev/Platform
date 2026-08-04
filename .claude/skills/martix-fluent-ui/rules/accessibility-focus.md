# Accessibility and focus

## Purpose

Preserve the semantic, keyboard, focus, and assistive-technology behavior that
makes a Fluent component more than a visual primitive.

## Default guidance

- Prefer native elements and Fluent components with built-in interaction behavior.
- Give icon-only controls an accessible name. Use tooltip text as supplemental
  discovery, not the only naming strategy unless the component's documented
  relationship provides the name and is verified.
- Follow the keyboard pattern for the selected widget. Do not add arrow-key or
  roving-tabindex behavior to unrelated controls.
- Keep visible focus. Move focus only for a user-understandable reason and restore
  it when dismissing modal or transient surfaces.
- Use labeled form controls, associate validation messages, and announce dynamic
  failures without stealing focus unnecessarily.
- Test zoom, reflow, forced colors, reduced motion, and pointer-independent use.

## Decision branches

- For dialogs and popovers, use Fluent overlay components and their documented
  trigger or positioning contracts; verify initial focus, dismissal, and restore.
- For menus, listboxes, trees, tabs, grids, and toolbars, begin from the matching
  ARIA Authoring Practices pattern and the Fluent component behavior.
- Use `aria-label` when no visible label exists; prefer visible text or
  `aria-labelledby` when users benefit from an on-screen label.
- Use live regions for status changes that must be announced. Do not mark large
  changing containers as live.
- If visual order differs from DOM order, redesign the layout rather than patching
  tab order with positive `tabIndex`.

## Review checklist

- [ ] Controls have correct roles, names, states, and relationships.
- [ ] Keyboard behavior matches the widget pattern.
- [ ] Focus is visible, contained where required, and restored after dismissal.
- [ ] Pointer, keyboard, screen-reader, zoom, and forced-colors paths are viable.
- [ ] Error and status messages are associated and announced appropriately.
- [ ] No ARIA overrides contradict native or Fluent semantics.

## Related files

- [Accessibility evidence map](../references/accessibility-map.md)
- [Accessible toolbar template](../templates/accessible-toolbar.template.tsx)
- [Testing and quality gates](./testing-quality-gates.md)

## Source anchors

- [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [Fluent UI React accessibility notes](https://github.com/microsoft/fluentui/wiki/Accessibility)
