## Modern C# features

### Purpose

Capture the default modernization path for released C# 10 through C# 14
features without pushing preview-only syntax or unnecessary novelty.

### Default guidance

- Read the target framework and SDK first, then use only the language version
  that comes with that toolchain by default.
- Prefer file-scoped namespaces, global usings where the repo already uses
  them, raw string literals for large text, and collection expressions only
  when they improve clarity.
- Use records for immutable DTO-like shapes, primary constructors only when
  they simplify the type, and extension members only on .NET 10 or later when
  they reduce noise.
- Adopt newer syntax conservatively in hot paths, public APIs, and shared
  libraries so readability stays ahead of cleverness.
- When modernizing, keep diffs small and preserve surrounding project
  conventions rather than mixing multiple style migrations in one change.

### Avoid

- Do not raise `LangVersion`, SDK, or target framework unless the task
  explicitly requires it.
- Do not replace stable readable code with newer syntax that hides control flow
  or ownership semantics.
- Do not assume preview or placeholder language features are safe just because
  they appear in version history pages.

### Review checklist

- Confirm the project toolchain supports the feature set in use.
- Use modern syntax only where it reduces ceremony or clarifies intent.
- Keep public surface area and serialization contracts stable after
  modernization.

### Related files

- [Nullability guidance](./lang-nullability.md)
- [Pattern matching guidance](./lang-pattern-matching.md)
- [C# language source map](../references/csharp-language-map.md)

### Source anchors

- [Project brief](../../../docs/martix-dotnet-csharp/martix-dotnet-csharp.md)
- [C# version history](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-version-history)
- [What is new in C# 14](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-14)
