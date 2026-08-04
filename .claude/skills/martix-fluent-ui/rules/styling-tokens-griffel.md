# CSS-first tokens and Griffel boundaries

## Purpose

Keep application-authored presentation in stylesheets while remaining
theme-aware, deterministic, bidirectional, and compatible with Fluent UI's
runtime and override model.

## Default guidance

- Follow the repository's established stylesheet convention. For greenfield React
  work, put static application styles in colocated CSS Modules.
- Keep TSX structural. A `className` on a documented root or public slot is the
  supported bridge to CSS; keep declarations out of render code and do not target
  Fluent's private DOM.
- Apply the same boundary to stories, tests, and visual fixtures. Put stable fixture
  dimensions and layout in a small stylesheet class rather than an ordinary React
  `style` object.
- Use Fluent semantic CSS variables for color, spacing, typography, radius, shadow,
  and duration instead of hard-coded brand or theme values.
- Preserve caller `className` and public slot props when wrapping or composing
  components. Make class precedence explicit without broad specificity escalation.
- Use logical CSS properties by default. Verify directionality in both LTR and RTL.
- Add forced-colors behavior only where native semantics and Fluent defaults do not
  already provide it.
- Keep global CSS for genuine document-level concerns. Scope component styles with
  modules rather than broad selectors, `!important`, or DOM-shape assumptions.
- Do not introduce Tailwind. When a touched Fluent boundary already uses it, move
  the affected static styles to the local stylesheet without expanding the task
  into an unrelated application-wide migration.

## Decision branches

- Prefer a Fluent semantic CSS variable when the value expresses a design-system
  decision. Use a namespaced application variable only for semantics absent from
  Fluent, deriving it from the same client brand source.
- Express finite visual states with classes, data attributes, or Fluent state props.
  Let a public component prop own a continuous runtime value when available. Only
  when no public API owns it and classes cannot enumerate it, pass a CSS custom
  property through React's `style` prop and keep every presentation rule in the
  stylesheet.
- Use application-authored Griffel only when a concrete requirement cannot be met
  safely with public root or slot classes. Examples include preserving a cohesive
  existing Griffel boundary or requiring its automatic RTL transformation for a
  value without a logical CSS equivalent. Record the reason.
- Migrate touched `makeStyles` code incrementally when CSS Modules can preserve its
  behavior. Do not create a second styling owner merely to satisfy this preference.
- Accept style elements or attributes generated internally by Fluent providers and
  renderers. The application rule governs authored code; separately verify CSP and
  SSR compatibility.
- For third-party CSS coexistence, isolate ownership by layer or boundary rather
  than increasing specificity globally.

## Review checklist

- [ ] Static application declarations live in the established stylesheet format.
- [ ] Semantic Fluent variables replace duplicated design and brand literals.
- [ ] TSX contains only class or slot bindings plus justified runtime custom
      properties.
- [ ] Stories, tests, and fixtures do not reintroduce ordinary inline declarations.
- [ ] Consumer classes, public slot props, and events are preserved.
- [ ] Any application Griffel usage names a capability that CSS cannot safely cover.
- [ ] New Tailwind utilities are absent and touched utility styles move locally.
- [ ] LTR, RTL, dark theme, and forced-colors behavior are considered.
- [ ] Selectors do not depend on private DOM structure.
- [ ] Specificity workarounds are not hiding an ownership problem.

## Related files

- [Token styles template](../templates/token-styles.template.module.css)
- [Foundation, packages, and themes](./foundation-packages-provider-theme.md)
- [Accessibility and focus](./accessibility-focus.md)

## Source anchors

- [Griffel documentation](https://griffel.js.org/)
- [Fluent UI React theme Sass bridge](https://github.com/microsoft/fluentui/tree/master/packages/react-components/react-theme-sass)
- [CSS forced-colors](https://developer.mozilla.org/docs/Web/CSS/@media/forced-colors)
