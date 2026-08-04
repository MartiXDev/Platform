# Library declarations and publishing boundaries

## Purpose

Keep a library's JavaScript entrypoints, declaration files, and public type
surface consistent for real consumers.

## Default guidance

- Design the public TypeScript surface before declaration emit.
- Export only supported contracts; keep implementation helpers internal.
- Generate declarations from source when possible and inspect emitted `.d.ts`
  as a consumer artifact.
- Use `declarationMap` when source navigation across project references matters
  and published source locations remain valid.
- Keep runtime exports and type declarations aligned across package conditions.
- Test declarations from a fixture that imports the built package.

## Decision branches

- Application package: declaration emit is optional unless another project
  consumes it as a typed boundary.
- Single-format library: one output graph can own JavaScript and declarations.
- Dual-format library: map ESM, CJS, and types conditions explicitly and test
  both runtime formats.
- Handwritten ambient declarations: follow the actual library runtime shape;
  do not combine incompatible export forms.

## Review checklist

- [ ] Public types expose no private or unnameable implementation detail.
- [ ] Emitted declarations are stable and importable.
- [ ] Package conditions resolve to existing runtime and declaration files.
- [ ] Consumer fixtures compile without source-only aliases.
- [ ] Breaking type-surface changes are treated as API changes.

## Related files

- [Type-first API design](./language-type-design.md)
- [Host-aware modules](./modules-host-resolution.md)
- [Type tests](./quality-type-tests.md)

## Source anchors

- [Declaration files introduction](https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html)
- [Publishing declaration files](https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html)
- [Declaration file do's and don'ts](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
