# Testing and quality gates

## Purpose

Verify Fluent UI behavior across interaction, themes, rendering modes, and package
boundaries instead of accepting a visually plausible component.

## Default guidance

- Use the repository's existing test runner and accessibility tooling.
- Prefer role, name, state, and user-observable queries over Fluent class names or
  private DOM structure.
- Test keyboard sequences and focus outcomes for composite widgets and overlays.
- Test theme changes, directionality, forced colors, and reduced motion where the
  component behavior depends on them.
- For SSR, test server output plus hydration and inspect warnings.
- Run the smallest target build or typecheck that exercises the changed TSX.

## Decision branches

- Use unit or component tests for state, slots, names, keyboard behavior, and focus.
- Use browser tests for layout, portal positioning, real focus transitions,
  forced-colors, and SSR hydration behavior that DOM emulators cannot prove.
- Use visual regression only for stable visual contracts; pair it with semantic
  assertions so screenshots do not become the only accessibility signal.
- During migration, run legacy and migrated acceptance paths against the same
  behavior checklist.
- If the package is alpha, beta, or `_unstable`, add a focused adapter test that
  will fail clearly on API drift.

## Review checklist

- [ ] Tests query public semantics rather than implementation details.
- [ ] Keyboard and focus behavior is asserted.
- [ ] Theme and user-preference branches are covered when relevant.
- [ ] SSR changes include hydration evidence.
- [ ] Typecheck/build uses the target repository configuration.
- [ ] Known manual checks are explicit and not misrepresented as automated.

## Related files

- [Accessibility and focus](./accessibility-focus.md)
- [SSR and Next.js](./ssr-nextjs.md)
- [Version and support map](../references/version-support-map.md)

## Source anchors

- [Testing Library query priority](https://testing-library.com/docs/queries/about/#priority)
- [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing)
- [WAI-ARIA Authoring Practices testing guidance](https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/)
