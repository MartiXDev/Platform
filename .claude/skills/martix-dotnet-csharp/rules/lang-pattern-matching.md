## Pattern matching

### Purpose

Describe when pattern matching is the clearest way to express branching, null
handling, and data-shape checks in modern C#.

### Default guidance

- Prefer `is` patterns and switch expressions for type- and shape-based
  dispatch when they are more explicit than nested `if` chains.
- Use property, positional, relational, logical, and list patterns to express
  invariants close to the value being checked.
- Keep each arm short and side-effect light; extract helpers when a branch
  needs multiple steps.
- Use pattern matching to improve exhaustiveness and null-safety, especially
  when working with records, discriminated shapes, or DTO validation.

### Avoid

- Do not build giant switch expressions that hide business logic or duplicate
  the same guard conditions.
- Do not use pattern syntax when a direct comparison or early-return guard is
  easier to read.
- Do not depend on complex nested patterns without tests for edge cases and
  null inputs.

### Review checklist

- Branches remain readable without horizontal scrolling or nested condition
  stacks.
- Null cases and fallback behavior are explicit.
- Tests cover each meaningful branch or pattern family.

### Related files

- [Modern C# features](./lang-modern-features.md)
- [Nullability guidance](./lang-nullability.md)
- [Exceptions and validation](./design-exceptions-validation.md)

### Source anchors

- [Pattern matching overview](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/functional/pattern-matching)
- [Pattern operators reference](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/patterns)
- [C# language source map](../references/csharp-language-map.md)
