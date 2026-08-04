# Fluent UI source index

## Use this reference when

- a package name, API, release channel, peer range, or SSR recipe may have changed;
- a local implementation conflicts with secondary guidance;
- a component or migration path needs authoritative confirmation.

## Evidence order

1. Installed package metadata and source in the target repository.
2. Official Fluent UI package README, Storybook, and source at the matching tag.
3. npm package metadata for published versions and peer dependencies.
4. Official Microsoft Learn or project documentation with a visible update date.
5. W3C specifications for semantics and interaction patterns.
6. Secondary articles only as discovery aids.

## Primary sources

| Topic | Source | Use |
| --- | --- | --- |
| React v9 components | [Fluent UI React Storybook](https://react.fluentui.dev/) | Current public component APIs, examples, and accessibility notes |
| Monorepo and packages | [microsoft/fluentui](https://github.com/microsoft/fluentui) | Source, package READMEs, migration docs, examples |
| Converged package | [`react-components`](https://github.com/microsoft/fluentui/tree/master/packages/react-components/react-components) | Umbrella exports and package contract |
| Theme CSS bridge | [`react-theme-sass`](https://github.com/microsoft/fluentui/tree/master/packages/react-components/react-theme-sass) | Official Sass aliases for provider-injected token variables; verify its release channel before adding it |
| Styling engine | [Griffel](https://griffel.js.org/) | `makeStyles`, renderer, extraction, and RTL behavior |
| React icons | [`@fluentui/react-icons`](https://www.npmjs.com/package/@fluentui/react-icons) | Published version and package metadata |
| Web Components | [`packages/web-components`](https://github.com/microsoft/fluentui/tree/master/packages/web-components) | Current custom-element registration and API |
| Charts | [`react-charts`](https://github.com/microsoft/fluentui/tree/master/packages/charts/react-charts) | Supported chart package and examples |
| Motion | [`react-motion`](https://github.com/microsoft/fluentui/tree/master/packages/react-components/react-motion) | Fluent motion package and API |
| Accessibility | [WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/) | Widget semantics and keyboard patterns |
| Conformance | [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | Accessibility success criteria |
| Next.js insertion | [`useServerInsertedHTML`](https://nextjs.org/docs/app/api-reference/functions/use-server-inserted-html) | Current Next App Router style insertion API |

## Verification recipe

1. Read the target's `package.json` and lockfile.
2. Resolve the installed package version and peer dependencies.
3. Open the official source or README at the matching tag when possible.
4. Compare exported APIs with the proposed import.
5. Record the evidence date for facts copied into
   [the version map](./version-support-map.md).

## Source hygiene

- Do not infer general support from a single sample application.
- Do not treat `master` branch code as proof that a published package contains an
  API.
- Do not use an unversioned search snippet to choose an `_unstable` API.
- Keep reusable policy in rules; keep checked-at dates and release channels here or
  in the version map.
