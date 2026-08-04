# Type tests and validation

## Purpose

Prove TypeScript contracts with compiler-checked positive and negative cases,
then combine them with runtime tests where behavior crosses a runtime boundary.

## Default guidance

- Compile representative success cases that exercise inference and public API
  ergonomics.
- Mark intentional failures with `@ts-expect-error` and a reason; an unused
  directive must fail the test.
- Keep type tests close to the owning public surface or in the project's
  established type-test harness.
- Test built declarations from a consumer fixture for published libraries.
- Run project typecheck, declaration checks, runtime tests, and lint as separate
  commands so failures remain visible.

## Decision branches

- Inline `@ts-expect-error`: suitable for a small number of focused negative
  cases.
- `tsd`, `expect-type`, or the project's existing harness: suitable when the
  package already has a dedicated public type-test suite.
- Runtime test: required when parsing, coercion, side effects, or execution
  behavior matters.
- Declaration fixture: required when consumers compile against built package
  artifacts rather than source.

## Review checklist

- [ ] Positive cases prove useful inference, not only assignability.
- [ ] Negative cases fail for the intended reason.
- [ ] `@ts-expect-error` directives include context and are not unused.
- [ ] Runtime behavior has runtime tests.
- [ ] Public declarations are tested as consumers import them.

## Related files

- [Generics and advanced types](./language-generics-advanced-types.md)
- [Declarations and publishing](./libraries-declarations-publishing.md)

## Source anchors

- [TypeScript 3.9: `@ts-expect-error`](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-9.html)
- [TypeScript compiler options](https://www.typescriptlang.org/tsconfig/)
