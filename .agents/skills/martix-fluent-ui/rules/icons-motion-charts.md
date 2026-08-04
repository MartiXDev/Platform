# Icons, motion, and charts

## Purpose

Use Fluent ecosystem packages without weakening semantics, performance,
compatibility, or user preferences.

## Default guidance

- Import only the icon components used by the implementation from
  `@fluentui/react-icons`.
- Treat decorative icons as hidden from assistive technology. Give controls and
  standalone meaningful graphics an accessible name through the owning UI.
- Prefer Fluent motion tokens and supported motion components. Respect
  `prefers-reduced-motion` and keep essential state changes understandable without
  animation.
- Evaluate `@fluentui/react-charts` against the required chart types,
  accessibility, bundle constraints, and release status before choosing another
  library.
- Keep package maturity and version checks in the dated version map.

## Decision branches

- Use regular, filled, or color icons based on product semantics and contrast, not
  decoration alone.
- Verify color icons in forced-colors mode and avoid duplicate SVG IDs when an icon
  implementation embeds definitions.
- Use motion for continuity, hierarchy, and feedback. Avoid motion that delays
  action or becomes the only state signal.
- Choose a third-party chart library only when explicit requirements exceed the
  supported Fluent chart surface; wrap it in Fluent tokens and accessibility
  requirements.

## Review checklist

- [ ] Icon imports and module resolution work in the target build.
- [ ] Decorative and meaningful icons have correct accessibility treatment.
- [ ] Reduced-motion behavior is tested.
- [ ] Charts provide names, descriptions, keyboard or data-table alternatives as needed.
- [ ] Package maturity and compatibility were verified.
- [ ] Third-party visualization does not invent a parallel design system.

## Related files

- [Version and support map](../references/version-support-map.md)
- [Ecosystem boundary map](../references/ecosystem-boundaries.md)
- [Accessibility and focus](./accessibility-focus.md)

## Source anchors

- [Fluent System Icons](https://github.com/microsoft/fluentui-system-icons)
- [Fluent UI React Charts](https://github.com/microsoft/fluentui/tree/master/packages/charts/react-charts)
- [Fluent UI React Motion](https://github.com/microsoft/fluentui/tree/master/packages/react-components/react-motion)
