# Generics and advanced types

## Purpose

Use generics and type-level transforms to preserve relationships that ordinary
unions cannot express, while keeping compiler work and error messages bounded.

## Default guidance

- Introduce a type parameter only when two or more positions share a type
  relationship.
- Constrain parameters to the operations the implementation actually uses.
- Prefer indexed access, `keyof`, mapped types, and standard utility types over
  duplicated object shapes.
- Distribute conditional types only when each union member should be processed
  independently; wrap both sides in tuples to suppress accidental distribution.
- Keep recursive types shallow and terminating. Name intermediate results when
  it improves diagnostics or avoids repeated instantiation.
- Validate advanced types with positive and negative compile-time cases.

## Decision branches

- Use a union when values vary but no input/output relationship must be
  preserved.
- Use overloads for a small, readable set of distinct calls.
- Use conditional types when the result is a function of a type parameter and
  the relationship must survive composition.
- Use `const` type parameters when literal preservation is part of the API
  contract rather than an incidental implementation detail.

## Review checklist

- [ ] Every type parameter connects meaningful positions.
- [ ] Constraints are neither absent nor broader than required.
- [ ] Conditional distribution is intentional.
- [ ] Recursive expansion has an obvious bound.
- [ ] Public errors remain understandable at call sites.
- [ ] Type tests compile on the supported compiler baseline.

## Related files

- [Type-first API design](./language-type-design.md)
- [Type tests](./quality-type-tests.md)
- [Performance diagnostics](./performance-diagnostics.md)

## Source anchors

- [TypeScript handbook: generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)
- [TypeScript handbook: conditional types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html)
- [TypeScript handbook: mapped types](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html)
- [TypeScript handbook: template literal types](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html)
