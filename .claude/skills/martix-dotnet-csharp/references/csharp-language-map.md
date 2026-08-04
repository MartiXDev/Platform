## C# language map

### Purpose

Map the first-pass C# language rule set to the approved research memo and the
main Microsoft Learn pages that justify each recommendation.

### Rule coverage

| Topic | Rule files | Primary sources | Notes |
| --- | --- | --- | --- |
| Modernization and version-aware feature use | `rules/lang-modern-features.md` | [C# version history](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-version-history); [What is new in C# 14](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-14) | Use for released C# 10-14 features and conservative adoption guidance. |
| Pattern-driven branching | `rules/lang-pattern-matching.md` | [Pattern matching overview](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/functional/pattern-matching); [Pattern operators reference](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/patterns) | Focuses on readability, exhaustiveness, and null-safe branching. |
| Nullable contracts | `rules/lang-nullability.md` | [Nullable reference types](https://learn.microsoft.com/en-us/dotnet/csharp/nullable-references) | Covers annotations, guard clauses, and migration posture. |

### Maintenance notes

- Use the approved `csharp-language.md` memo as the planning bridge when
  expanding into generics, async streams, LINQ, or ref-safety rules later.
- Keep future language additions grouped under the `lang-` prefix and update
  `assets/taxonomy.json` when new subdomains are added.
