## API and type design

### Purpose

Keep .NET APIs small, consistent, and version-tolerant by choosing the right
type shapes, visibility, and dependency boundaries.

### Default guidance

- Expose the least surface area that solves the scenario, favoring `private`,
  `internal`, or `sealed` until broader extensibility is justified.
- Use nouns for types, verbs for actions, and consistent parameter naming so
  IntelliSense reads naturally.
- Prefer concrete implementations unless an abstraction is required for
  multiple implementations, external dependencies, or test seams.
- Use records, readonly structs, and immutable collections for value-like data;
  use classes for identity, lifetime, or mutation-heavy behavior.

### Avoid

- Do not add interfaces or wrapper layers by default.
- Do not expose mutable internals, overly generic object bags, or broad
  inheritance hooks without a real versioning plan.
- Do not let convenience overloads drift away from a clear core API.

### Review checklist

- Type choice matches ownership, equality, and mutation semantics.
- Public members are documented, cohesive, and minimal.
- New APIs compose with existing naming and dependency patterns in the repo.

### Related files

- [Exceptions and validation](./design-exceptions-validation.md)
- [Modern C# features](./lang-modern-features.md)
- [Design source map](../references/design-map.md)

### Source anchors

- [Framework design guidelines overview](https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/)
- [Naming guidelines](https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/naming-guidelines)
- [Dependency injection guidelines](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection-guidelines)
