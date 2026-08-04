# Host-aware modules and resolution

## Purpose

Make TypeScript resolve modules the way the code's runtime or bundler will
resolve them, including file extensions, package conditions, and emitted format.

## Default guidance

- Identify the host before selecting module options.
- Use `nodenext` for modern Node/Bun package semantics.
- Use `preserve` with `bundler` when a bundler owns runtime resolution and emit.
- Treat `paths` as compiler resolution guidance, not a runtime alias. Configure
  the host consistently or use package subpath imports.
- Keep type-only imports explicit when runtime elision matters.
- Test published package entrypoints from a consumer perspective; a local source
  import does not prove package exports or declarations.

## Decision branches

- For ESM Node packages, align `package.json` `type`, source extensions, emitted
  extensions, and relative import specifiers.
- For dual ESM/CJS output, verify each condition and declaration path rather than
  relying on one compiler pass to describe both hosts.
- For workspace aliases, prefer package exports or Node subpath imports when
  consumers must resolve the same path at runtime.
- For direct Node type stripping, import `.ts` extensions and use erasable
  syntax; open [the module host map](../references/module-host-map.md).

## Review checklist

- [ ] Compiler and host resolve the same specifiers.
- [ ] Relative extension behavior matches emitted or directly executed files.
- [ ] `paths` aliases have a runtime owner.
- [ ] Package `exports` and `types` conditions point to existing artifacts.
- [ ] Tests exercise package entrypoints, not only source-relative paths.

## Related files

- [Module host map](../references/module-host-map.md)
- [Project configuration](./config-project-shape.md)
- [Declarations and publishing](./libraries-declarations-publishing.md)

## Source anchors

- [TypeScript module theory](https://www.typescriptlang.org/docs/handbook/modules/theory.html)
- [Node.js packages](https://nodejs.org/api/packages.html)
- [Node.js TypeScript support](https://nodejs.org/api/typescript.html)
