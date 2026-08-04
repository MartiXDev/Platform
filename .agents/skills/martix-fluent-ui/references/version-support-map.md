# Version and support map

## Snapshot

Evidence checked on **2026-07-21**. Re-verify before version-sensitive changes.
Published versions can advance independently.

| Surface | Observed version or range | Status and consequence |
| --- | --- | --- |
| `@fluentui/react-components` | `9.74.4` | Primary React v9 umbrella package |
| React peer dependency | `>=16.14.0 <20.0.0` | Observed package peer range; verify the installed release |
| `@fluentui/react-charts` | `9.3.22` | Official chart package; assess requirements before replacing it |
| `@fluentui/react-motion` | `9.16.1` | Official motion package |
| `@fluentui/web-components` | `3.0.2` | Vue/non-React exception; registration differs from older examples |
| `@fluentui/react-alert` | beta in v9 suite | Version-gate and isolate preview usage |
| `@fluentui/react-infobutton` | beta in v9 suite | Version-gate and isolate preview usage |
| `@fluentui/react-virtualizer` | alpha in v9 suite | Treat API drift and behavior as explicit risk |

## Compatibility rules

- Use the target repository's installed package metadata as the operative truth.
- Do not recommend React 20 support from assumptions beyond the observed peer
  range.
- Treat `_unstable` exports independently from package GA status.
- Check individual package maturity; the v9 suite does not give every package the
  same release channel.
- Keep preview packages behind narrow adapters and focused tests.

## SSR caution

The official Next.js App Router material has included a pinned sample using an
experimental third-party SWC transform. This is evidence for that sample, not a
timeless project requirement. Verify the current Fluent, Griffel, Next.js, and
compiler guidance before adopting it.

At the checked source revision, the runtime provider tree imports
`createDOMRenderer`, `RendererProvider`, `SSRProvider`, and the top-level
`renderToStyleElements` function from `@fluentui/react-components`. The insertion
callback calls `renderToStyleElements(renderer)` behind a `didRenderRef` guard.

## Vue caution

Older Microsoft Learn and community examples may use
`provideFluentDesignSystem`. Current Web Components v3 uses a different package
surface. Read the installed v3 README and source rather than mechanically porting
the older example.

At the checked source revision, v3:

- registers components through side-effect definition imports;
- supports a full-registration side-effect entry point;
- uses `setTheme()` with themes from `@fluentui/tokens`;
- ships a Custom Elements Manifest and declarative SSR artifacts.

The README and migration page show different convenience paths for individual
definition imports, so the installed package export map decides the exact path.
Do not replace the side-effect model with class `.define()` calls unless the
installed package explicitly documents them.

## Icon caution

Atomic icon imports depend on the target's module resolution. The icon package
does not promise that every generated icon name remains forever; isolate important
product icon choices and let `martix-typescript` own module-resolution changes.

## Evidence

- [npm: `@fluentui/react-components`](https://www.npmjs.com/package/@fluentui/react-components)
- [npm: `@fluentui/react-charts`](https://www.npmjs.com/package/@fluentui/react-charts)
- [npm: `@fluentui/react-motion`](https://www.npmjs.com/package/@fluentui/react-motion)
- [npm: `@fluentui/web-components`](https://www.npmjs.com/package/@fluentui/web-components)
- [Fluent UI package source](https://github.com/microsoft/fluentui/tree/master/packages)
- [Web Components README](https://github.com/microsoft/fluentui/blob/master/packages/web-components/README.md)
- [Web Components v3 migration](https://github.com/microsoft/fluentui/blob/master/packages/web-components/src/_docs/developer/migration.mdx)

## Maintenance

When updating this snapshot:

1. record the new evidence date;
2. verify npm metadata and official package source;
3. update affected eval expectations;
4. avoid changing durable rules unless the underlying design guidance changed.
