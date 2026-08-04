# Narrowing and trust boundaries

## Purpose

Turn uncertain values into proven domain values without spreading `any`,
unchecked assertions, or fragile property checks.

## Default guidance

- Accept uncertain external values as `unknown` and narrow them before use.
- Prefer control-flow narrowing, discriminants, `in`, `instanceof`, and
  well-scoped predicates over type assertions.
- Make type predicates prove exactly what their implementation checks.
- Use assertion functions only when failure terminates control flow and the
  function enforces the asserted condition.
- Use `never` in exhaustive checks so a newly added union member creates a
  compiler error at every incomplete branch.
- Preserve absence semantics: optional, missing, and explicitly `undefined`
  may be different contracts, especially with `exactOptionalPropertyTypes`.

## Decision branches

- Parse external input into a domain type when the boundary owns validation.
- Keep a boolean predicate when callers may recover from a failed check.
- Throw through an assertion function when continued execution would violate an
  invariant.
- Use a schema or framework validator when validation needs coercion, detailed
  error reporting, or a shared runtime contract; hand its library-specific
  configuration to the owning skill.

## Review checklist

- [ ] No `any` crosses a boundary without a documented interoperability reason.
- [ ] Predicate output matches every runtime condition it checks.
- [ ] Exhaustive branches fail compilation when a member is missing.
- [ ] Assertions are adjacent to evidence and cannot hide malformed input.
- [ ] Optional-property semantics match serialized and runtime behavior.

## Related files

- [Type-first API design](./language-type-design.md)
- [Type tests](./quality-type-tests.md)

## Source anchors

- [TypeScript handbook: narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [TypeScript handbook: `unknown`](https://www.typescriptlang.org/docs/handbook/2/functions.html#unknown)
- [TSConfig: exactOptionalPropertyTypes](https://www.typescriptlang.org/tsconfig/exactOptionalPropertyTypes.html)
