# TypeScript 7 compatibility map

**Status date:** 2026-07-21  
**Verified stable line:** TypeScript 7.0.x; npm `latest` was 7.0.2 at review time.

## Choose the compiler path

- **Plain Node, Bun, or bundler project with no API consumer:** migrate config
  to TypeScript 7 and run project checks.
- **Tool imports `typescript` or uses a custom transformer:** check its support
  and retain the TS6 API where required while using the TS7 CLI.
- **`typescript-eslint` typed linting:** check the installed version's range.
  At review time the official range was `<6.1.0`; use its supported TS6 path.
- **Vue, Svelte, Astro, MDX, Angular template tooling, or Volar:** keep embedded
  tooling on its framework-supported generation. Add TS7 only where documented.
- **Declaration library moving from TS6:** compare TS6 to the TS7 target. Use
  `stableTypeOrdering` during diffing, then remove the temporary path.

## TypeScript 7 configuration changes

TypeScript 7 inherits new TypeScript 6 defaults and rejects previously
deprecated configurations.

### Notable defaults

- `strict: true`
- `module: esnext`
- `target`: the stable ECMAScript version immediately before `esnext`
- `noUncheckedSideEffectImports: true`
- `libReplacement: false`
- `stableTypeOrdering: true` and not configurable
- `rootDir: "./"`
- `types: []`

Set important choices explicitly in reusable templates when doing so documents
the host contract across supported compiler generations.

### Removed or fixed behavior

- `target: es5`
- `downlevelIteration`
- `moduleResolution: node`, `node10`, or `classic`
- `module: amd`, `umd`, `systemjs`, or `none`
- `baseUrl`
- `esModuleInterop: false` and `allowSyntheticDefaultImports: false`
- disabling `alwaysStrict`
- import assertions with `assert` instead of `with`

This list is a dated migration aid. Re-check the
[TypeScript 7 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#updates-since-5x-and-new-behaviors-from-60)
before updating the rule.

## Official side-by-side mechanism

TypeScript 7.0 does not provide a programmatic API. Microsoft publishes
`@typescript/typescript6`, which exports the TS6 API and a `tsc6` binary.
Tools whose peer dependency imports `typescript` may require an npm alias:

```json
{
  "devDependencies": {
    "@typescript/native": "npm:typescript@^7.0.2",
    "typescript": "npm:@typescript/typescript6@^6.0.2"
  }
}
```

Confirm current package versions and tool support before applying this dated
example. Give the compatibility workaround an explicit removal condition.

## Verification gate

- The TS7 compiler passes the project's intended CLI checks.
- Every compiler-API consumer runs against a supported API generation.
- Editor, lint, build, and CI commands identify which generation they invoke.
- Removed options and changed defaults are handled intentionally.
- Public declarations and consumer fixtures remain compatible.
