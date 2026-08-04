# Foundation, packages, and themes

## Purpose

Establish the correct Fluent UI generation, provider boundary, and theme contract
before component implementation begins.

## Default guidance

- Inspect installed `@fluentui/*` packages and versions. Default new React work to
  the v9 converged package `@fluentui/react-components`.
- Install only the packages the implementation uses. Keep the umbrella package
  for normal app development; use individual packages only when the repository
  already optimizes dependencies that way.
- Put `FluentProvider` at the application or independently themed subtree
  boundary. Pass a complete theme and preserve inherited document attributes.
- Treat the client's brand definition as the single input to one theme adapter.
  Derive complete light and dark Fluent themes through supported theme APIs rather
  than copying generated token values.
- Let `FluentProvider` expose Fluent semantic CSS variables to component
  stylesheets. Derive namespaced application variables from the same brand source
  only when no Fluent semantic token expresses the requirement.
- Keep provider nesting intentional. A nested provider creates a new token and
  directionality scope and may change portal behavior.

## Decision branches

- For a new v9 app, establish one top-level provider and import public components
  from `@fluentui/react-components`.
- For an embedded widget, add the smallest provider boundary that gives the widget
  a stable theme without overriding the host.
- For mixed v8/v9 code, keep provider and styling systems explicit; do not assume
  one generation's theme automatically configures the other.
- If the host supplies a theme, map it into supported Fluent theme tokens at one
  adapter boundary instead of scattering host checks through components.
- If CSP or SSR constrains generated styles, inspect the provider's actual output.
  Fluent-generated style elements or attributes are runtime infrastructure, not
  permission to author ordinary application styles inline.
- If the repository uses SSR, route to the SSR rule before finalizing provider and
  renderer placement.

## Review checklist

- [ ] Package generation and installed versions are known.
- [ ] Public v9 imports are used for new React code.
- [ ] Provider placement matches theme and portal boundaries.
- [ ] One client brand source owns Fluent themes and any application variables.
- [ ] Feature styles consume semantic variables rather than palette literals.
- [ ] Theme switching preserves readable foreground/background pairs.
- [ ] Mixed-generation behavior is explicit.
- [ ] No version-sensitive API was assumed without verification.

## Related files

- [Version and support map](../references/version-support-map.md)
- [Migration map](../references/migration-map.md)
- [SSR and Next.js](./ssr-nextjs.md)
- [Provider template](../templates/fluent-provider.template.tsx)

## Source anchors

- [Fluent UI React v9 repository package](https://github.com/microsoft/fluentui/tree/master/packages/react-components/react-components)
- [Fluent UI Storybook](https://react.fluentui.dev/)
- [Fluent UI theming specification](https://github.com/microsoft/fluentui/blob/master/packages/react-components/theme/README.md)
