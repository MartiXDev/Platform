# SSR recipe map

## First questions

- Which router and rendering model are installed?
- Which Fluent and Griffel versions are installed?
- Is rendering per request, streamed, cached, or split across roots?
- Where can server-generated styles be inserted before hydration?
- Which component boundary must be client-side?

## Generic React SSR

1. Create a Griffel renderer for the request or supported isolated boundary.
2. Provide it through `RendererProvider` around the rendered Fluent tree.
3. Add the installed public `SSRProvider` when Fluent-generated IDs must remain
   deterministic.
4. Render the application.
5. Extract critical CSS with the API supported by the installed Griffel version.
6. Insert styles in deterministic order before the client hydrates.
7. Hydrate with equivalent provider, theme, direction, renderer, and ID assumptions.

Verify the exact API names against installed Griffel packages; this reference
intentionally does not freeze a drifting code sample.

## Next.js App Router

Confirm that the affected route lives under `app\` and record any mixed
`app\`/`pages\` setup before choosing this recipe.

Use a client registry component that owns the renderer and registers server style
insertion through the current Next.js API. Keep the registry as narrow as the
provider/rendering contract allows. The current official Fluent example wraps
`FluentProvider` in both `RendererProvider` and `SSRProvider`; verify those exports
against the installed version. Its `useServerInsertedHTML` callback also uses a
`didRenderRef` one-shot guard to avoid duplicate streaming flushes. Confirm whether
the example's compiler transform supports the installed Next.js release.

At the checked official revision, import the public
`renderToStyleElements` function and call it as
`renderToStyleElements(renderer)`. It is not a renderer method. Start from
[the bundled registry template](../templates/nextjs-app-router-registry.template.tsx)
only after confirming the installed package exports every imported symbol.

## Failure signatures

| Symptom | Investigate |
| --- | --- |
| Flash of unstyled content | Missing or late server style insertion |
| Hydration class mismatch | Different renderer, theme, direction, or render path |
| Hydration ID mismatch | Missing or inconsistent `SSRProvider` or render order |
| Styles leak across users | Shared mutable server renderer |
| Duplicate styles | Registry recreated or extraction inserted more than once |
| Repeated streaming buckets | Missing one-shot guard around style extraction |
| Client boundary expands unexpectedly | Provider/registry component owns unrelated app logic |
| Development works, production fails | Compiler transform or streaming path differs |

## Evidence

- [Griffel React API](https://griffel.js.org/react/api/)
- [Next.js `useServerInsertedHTML`](https://nextjs.org/docs/app/api-reference/functions/use-server-inserted-html)
- [Fluent UI App Router SSR example](https://github.com/microsoft/fluentui/blob/master/apps/public-docsite-v9/src/Concepts/SSR/NextJSAppDir.mdx)
- [Fluent UI public `SSRProvider`](https://github.com/microsoft/fluentui/blob/master/packages/react-components/react-utilities/src/ssr/SSRContext.tsx)
