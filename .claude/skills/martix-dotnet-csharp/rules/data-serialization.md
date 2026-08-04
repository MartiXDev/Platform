## Serialization and payload contracts

### Purpose

Keep JSON and wire-format handling explicit, performant, and version-tolerant
for APIs, clients, and background processing.

### Default guidance

- Prefer `System.Text.Json` unless a dependency or compatibility requirement
  demands another serializer.
- Keep serialization options centralized so naming policy, enum handling, case
  sensitivity, and converters remain consistent.
- Stream large JSON payloads and favor strongly typed contracts over late-bound
  dictionaries or raw strings.
- Treat payload versioning as a contract concern: additive changes are safer
  than breaking renames or shape changes.

### Avoid

- Do not hand-build JSON strings when serializers and typed models can express
  the payload safely.
- Do not introduce custom converters for simple formatting preferences that can
  be solved with existing options.
- Do not assume serializer defaults are stable across unrelated applications;
  make important behavior explicit.

### Review checklist

- Serialization options are shared consistently across producers and consumers.
- Large payload paths avoid unnecessary buffering.
- Tests cover compatibility-sensitive fields, enums, and date or number
  formatting.

### Related files

- [ASP.NET Core application shape](./web-aspnet-core.md)
- [EF Core guidance](./data-efcore.md)
- [Data stack source map](../references/data-stack-map.md)

### Source anchors

- [System.Text.Json overview](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/overview)
- [Serialize and deserialize JSON](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/how-to)
- [Data stack source map](../references/data-stack-map.md)
