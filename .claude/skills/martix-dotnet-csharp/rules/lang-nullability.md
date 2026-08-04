## Nullability and contracts

### Purpose

Keep nullable reference types and null-state analysis aligned with real API
contracts so the compiler can enforce intent instead of being suppressed.

### Default guidance

- Treat nullable annotations as part of the contract for every public and
  internal API that matters.
- Use `ArgumentNullException.ThrowIfNull` for required reference arguments and
  `string.IsNullOrWhiteSpace` for required text inputs.
- Prefer accurate annotations, nullable attributes, and flow-friendly guards
  over blanket null-forgiving operators.
- When migrating older code, enable and fix warnings incrementally rather than
  silencing entire files or projects.

### Avoid

- Do not add `!` as a shortcut unless you can prove the flow state and document
  why the compiler cannot.
- Do not annotate everything as nullable to avoid warnings; that removes the
  value of the feature.
- Do not return null for collection results when an empty collection
  communicates the contract better.

### Review checklist

- Annotations match the actual runtime behavior.
- Guard clauses fail early for invalid inputs.
- Tests cover null, empty, and whitespace paths where they are part of the
  public contract.

### Related files

- [Pattern matching guidance](./lang-pattern-matching.md)
- [Exceptions and validation](./design-exceptions-validation.md)
- [C# language source map](../references/csharp-language-map.md)

### Source anchors

- [Nullable reference types](https://learn.microsoft.com/en-us/dotnet/csharp/nullable-references)
- [Project brief](../../../docs/martix-dotnet-csharp/martix-dotnet-csharp.md)
- [C# language source map](../references/csharp-language-map.md)
