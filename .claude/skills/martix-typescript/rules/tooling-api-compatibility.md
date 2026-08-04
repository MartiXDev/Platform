# Compiler API and tooling compatibility

## Purpose

Keep TypeScript 7's CLI and language benefits separate from tools that still
depend on the TypeScript 6 programmatic API.

## Default guidance

- Detect direct and transitive imports of `typescript`, custom transformers,
  typed linting, editor plugins, and embedded framework compilers.
- Check each tool's official supported TypeScript range on the installed version.
- Treat TypeScript 7.0 compiler compatibility and compiler-API compatibility as
  separate decisions.
- Prefer the official `@typescript/typescript6` compatibility package when a
  supported tool still requires the legacy API.
- Name compiler commands clearly when both generations coexist; prevent CI from
  silently running a different compiler than local development.

## Decision branches

- No API consumer: use TS7 normally after project validation.
- Peer dependency imports `typescript`: use an npm alias only after confirming
  the tool cannot select a differently named package.
- Framework embeds TypeScript: follow that framework's supported compiler and
  language-service path; TS7 may still run a separate CLI check if supported.
- Custom transformer: remain on the compatible compiler API until the transformer
  has an explicit TS7/7.1 path.

## Review checklist

- [ ] Every compiler-API consumer is identified.
- [ ] Compatibility claims cite current first-party documentation.
- [ ] Package aliases expose the intended binary and API.
- [ ] Editor, lint, build, and CI commands use intentional compiler generations.
- [ ] The workaround has a removal condition tied to tool support.

## Related files

- [TypeScript 7 compatibility map](../references/typescript-7-compatibility-map.md)
- [TypeScript 7 migration](./migration-typescript-7.md)

## Source anchors

- [TypeScript 7: running side-by-side with TypeScript 6](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-60)
- [typescript-eslint dependency versions](https://typescript-eslint.io/users/dependency-versions/)
