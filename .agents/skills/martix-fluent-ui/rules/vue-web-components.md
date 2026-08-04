# Vue Web Components exception

## Purpose

Support the rare Vue request without pretending Fluent UI React APIs are
framework-neutral.

## Default guidance

- Use `@fluentui/web-components` for Vue. Verify the installed major and its export
  map before choosing exact import paths.
- In v3, register custom elements with side-effect definition imports, not class
  `.define()` calls or `provideFluentDesignSystem`. Register only used elements at
  a client-safe application boundary.
- Use native custom-element attributes, properties, events, slots, and CSS custom
  properties. Do not use `FluentProvider`, Griffel, React slots, or React hooks.
- Apply themes with the verified v3 `setTheme()` utility and `@fluentui/tokens`,
  which write token CSS variables to a document or element.
- Configure Vue custom-element recognition and provide a minimal
  `HTMLElementTagNameMap` declaration for the tags in use. Use Vue
  `GlobalComponents` or CEM-driven generation when the target template checker
  requires it; never suppress unknown-element diagnostics.
- Test hydration and registration timing when Vue SSR is present.

## Decision branches

- For Web Components v3, use the package's side-effect definition entry points.
  The exact documented path has changed between published snapshots, so confirm it
  from the installed package exports before writing the import.
- If a required React component has no Web Component equivalent, do not embed React
  casually. Clarify whether a web-standard implementation, a Vue-native design
  system, or a deliberate micro-frontend boundary is acceptable.
- Keep Vue state management and component architecture in the target repository's
  Vue guidance; this rule owns only Fluent Web Components integration.
- This skill owns the required DOM tag/event surface and points to the bundled
  declaration template. Hand off `tsconfig`, module resolution, generated
  declarations, or reusable package publishing to `martix-typescript`.
- For basic Vue SSR, keep definition imports client-only. If true server-rendered
  declarative shadow DOM is required, verify the v3 `define-async`/template
  artifacts and supported hydration integration rather than inventing a Vue path.

## Review checklist

- [ ] The React and Web Components package families are not mixed accidentally.
- [ ] Registration matches the installed Web Components major.
- [ ] Vue compiler and TypeScript understand the custom elements.
- [ ] Themes use the public v3 theme utility and tokens.
- [ ] Events and properties use the actual custom-element contract.
- [ ] SSR does not render unregistered or hydration-incompatible behavior.
- [ ] Missing component parity is surfaced rather than hidden.

## Related files

- [Version and support map](../references/version-support-map.md)
- [Ecosystem boundary map](../references/ecosystem-boundaries.md)
- [Source index](../references/source-index.md)
- [Custom-element declarations](../templates/vue-custom-elements.template.d.ts)

## Source anchors

- [Fluent UI Web Components package](https://github.com/microsoft/fluentui/tree/master/packages/web-components)
- [Fluent UI Web Components v3 migration](https://github.com/microsoft/fluentui/blob/master/packages/web-components/src/_docs/developer/migration.mdx)
- [Vue custom elements configuration](https://vuejs.org/guide/extras/web-components.html#using-custom-elements-in-vue)
