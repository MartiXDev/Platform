## Design map

### Purpose

Capture the official design, dependency injection, and exception references
that back the current design rules.

### Start here when

- The main hesitation is public contract or failure shape, not syntax.
- You need a fast route for result type vs exception before opening the full
  rule.

### Quick decision aid

| If this is true | Prefer | Why |
| --- | --- | --- |
| Invalid arguments, broken invariants, or a failure the caller cannot treat as normal flow | Exception | .NET guidance reserves exceptions for error conditions and contract violations |
| Missing data, validation feedback, or another outcome the caller is expected to branch on routinely | Result or return shape (`Try*`, validation result, domain result) | Keep normal flow explicit and avoid exception-driven control flow |

### Rule coverage

- **Type shape, visibility, naming, and dependency boundaries**
  - Rule files: `rules/design-api-type-design.md`
  - Primary sources:
    - [Framework design guidelines overview](https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/)
    - [Naming guidelines](https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/naming-guidelines)
    - [Dependency injection guidelines](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection-guidelines)
  - Notes: Use for API review, visibility minimization, and abstraction
    discipline.
- **Validation and exception behavior**
  - Rule files: `rules/design-exceptions-validation.md`
  - Primary sources:
    - [Best practices for exceptions](https://learn.microsoft.com/en-us/dotnet/standard/exceptions/best-practices-for-exceptions)
    - [Design guidelines for exceptions](https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/exceptions)
  - Notes: Use for guard clauses, precise failures, and error handling
    contracts. Keep expected control flow in the return shape and reserve
    exceptions for exceptional paths.

### Maintenance notes

- The Learn framework design guideline pages are useful but older; keep them
  as baseline references and cross-check strict new rules against newer .NET
  docs.
- Route options-lifetime questions to `web-stack-map.md` so this file stays
  focused on design and failure semantics.
- Future expansion can add versioning or disposal-specific entries without
  changing the current rule names.
