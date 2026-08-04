# Type-first API design

## Purpose

Shape TypeScript APIs around domain invariants while preserving useful
inference and keeping public contracts understandable.

## Default guidance

- Model valid states before implementation details.
- Put explicit types at module, I/O, and public API boundaries; let local values
  infer when the inferred type is precise and readable.
- Use discriminated unions when behavior depends on a finite set of states.
- Preserve literal information with `satisfies` or `as const` when callers need
  both validation and narrow inference.
- Keep public types named and stable. Derive internal helper types when that
  removes duplication without hiding the contract.
- Keep runtime validation at untrusted boundaries. A TypeScript annotation does
  not validate network, storage, environment, or user input.

## Decision branches

- Use an interface when consumers are expected to extend or merge an object
  contract; use a type alias for unions, tuples, mapped types, or closed
  composition.
- Use a branded or opaque type when primitive mix-ups cross a meaningful domain
  boundary and construction can be controlled. Keep plain primitives when the
  distinction adds no enforceable value.
- Use overloads when callers receive meaningfully different return types from
  distinct call shapes. Prefer a union parameter when the implementation and
  result do not vary by call shape.

## Review checklist

- [ ] Invalid states are excluded or explicit.
- [ ] Boundary data is validated before it is trusted.
- [ ] Public annotations aid consumers without suppressing inference.
- [ ] Assertions do not replace a real proof or runtime check.
- [ ] New abstractions encode a current requirement.

## Related files

- [Narrowing and boundaries](./language-narrowing-boundaries.md)
- [Generics and advanced types](./language-generics-advanced-types.md)
- [Declarations and publishing](./libraries-declarations-publishing.md)

## Source anchors

- [TypeScript handbook: everyday types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)
- [TypeScript handbook: narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [TypeScript 4.9: `satisfies`](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html)
