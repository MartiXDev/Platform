# Project configuration and references

## Purpose

Align compiler options with the actual host, repository layout, and emitted
artifacts instead of treating one `tsconfig` as universal.

## Default guidance

- Read the entire `extends` chain before changing an option.
- Let a base config hold truly shared values; keep host, package, and emit
  choices in leaf configs.
- Match `module` and `moduleResolution` to the runtime or bundler.
- Keep `strict` enabled for greenfield TypeScript 7 projects. Adopt
  beyond-strict options deliberately because they change contracts.
- Use `composite` and project references for independently built packages with
  explicit dependency edges; validate through `tsc --build`.
- Keep test, tool, and generated files in purpose-specific configs when their
  globals or emit requirements differ from production source.

## Decision branches

- Node or Bun package: start with `nodenext`.
- Bundler-owned application: start with `module: preserve` and
  `moduleResolution: bundler`.
- Published library: define declaration, source-map, root, output, and package
  export behavior together.
- Direct Node type stripping: use the Node-specific constraints in the
  [tsconfig map](../references/tsconfig-decision-map.md); Node ignores
  `tsconfig` at runtime.

TypeScript 7 rejects several historical options, including `baseUrl`,
`moduleResolution: node`/`node10`, `moduleResolution: classic`, and legacy
module formats. Use [the TS7 map](../references/typescript-7-compatibility-map.md)
for the dated list.

## Review checklist

- [ ] The host justifies module and resolution settings.
- [ ] Extended configs do not conflict or duplicate leaf defaults.
- [ ] `rootDir`, `include`, `types`, and output paths match the actual layout.
- [ ] Project references point in the dependency direction and build cleanly.
- [ ] The selected compiler accepts every option.

## Related files

- [tsconfig decision map](../references/tsconfig-decision-map.md)
- [Host-aware modules](./modules-host-resolution.md)
- [Declarations and publishing](./libraries-declarations-publishing.md)

## Source anchors

- [TSConfig reference](https://www.typescriptlang.org/tsconfig/)
- [Project references](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [TypeScript 7 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
