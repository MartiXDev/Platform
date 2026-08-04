# SSR and Next.js

## Purpose

Produce deterministic Fluent UI styles during server rendering and avoid
hydration mismatches or flashes of unstyled content.

## Default guidance

- Inspect the renderer and routing model before copying an SSR recipe. Next.js
  Pages Router and App Router have different insertion points.
- Record whether `app\`, `pages\`, or both exist and whether the affected route
  actually uses App Router. A prompt label is not a substitute for the repository
  check when code is available.
- Create one Griffel renderer per request or supported rendering boundary. Do not
  leak mutable renderer state across users.
- Insert server-generated styles in deterministic order before hydration.
- Wrap the server-rendered Fluent tree in the installed public `SSRProvider` when
  the component family uses generated IDs. Style parity alone does not guarantee
  ID parity.
- Keep server/client component boundaries explicit; components using hooks,
  browser APIs, event handlers, or client-only providers belong behind a client
  boundary.
- Test a production server render and hydration, not only client navigation.

## Decision branches

- For Next.js App Router, use the currently supported style registry pattern and
  `useServerInsertedHTML` only after verifying it against the installed Next.js and
  Fluent versions.
- At the checked v9 source revision, style extraction is the public top-level call
  `renderToStyleElements(renderer)`, exported from
  `@fluentui/react-components`. Verify that export in the installed package; do not
  invent a method on the renderer.
- Follow the verified registry's one-shot flush contract. The current official
  example uses a `didRenderRef` guard so streaming callbacks do not emit the same
  style buckets repeatedly.
- In current v9, `SSRProvider` is a public export used by the official App Router
  example to keep generated IDs deterministic. Verify that export in the installed
  package before copying the provider tree.
- For a custom React SSR host, use Griffel's supported renderer and style extraction
  APIs and pass the renderer through `RendererProvider`.
- Treat official examples with experimental SWC plugins as pinned examples, not
  universal requirements. Record the exact compatibility evidence.
- If streaming or multiple roots are used, verify insertion order and renderer
  ownership for each boundary.

## Review checklist

- [ ] Router/rendering mode and package versions are documented.
- [ ] Renderer state is request-safe.
- [ ] Server styles are emitted before hydration in stable order.
- [ ] Streaming style insertion cannot flush the same renderer output twice.
- [ ] Generated Fluent IDs are deterministic across server and client.
- [ ] Client boundaries are no broader than necessary.
- [ ] Production SSR has no hydration warnings or style flash.
- [ ] Any compiler plugin is version-gated and justified.

## Related files

- [SSR recipe map](../references/ssr-recipes.md)
- [Version and support map](../references/version-support-map.md)
- [Foundation, packages, and themes](./foundation-packages-provider-theme.md)
- [Next.js App Router registry template](../templates/nextjs-app-router-registry.template.tsx)

## Source anchors

- [Fluent UI Next.js App Router example](https://github.com/microsoft/fluentui/blob/master/apps/public-docsite-v9/src/Concepts/SSR/NextJSAppDir.mdx)
- [Fluent UI public `SSRProvider`](https://github.com/microsoft/fluentui/blob/master/packages/react-components/react-utilities/src/ssr/SSRContext.tsx)
- [Griffel React API](https://griffel.js.org/react/api/)
- [Next.js `useServerInsertedHTML`](https://nextjs.org/docs/app/api-reference/functions/use-server-inserted-html)
