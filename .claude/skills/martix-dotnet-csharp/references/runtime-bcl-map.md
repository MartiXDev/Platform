## Runtime and BCL map

### Purpose

Track which runtime, collection, and allocation-focused Microsoft docs back the
current runtime guidance.

### Rule coverage

| Topic | Rule files | Primary sources | Notes |
| --- | --- | --- | --- |
| Spans, memory, and allocation-aware APIs | `rules/runtime-memory-spans.md` | [Memory and spans in .NET](https://learn.microsoft.com/en-us/dotnet/standard/memory-and-spans/); [Memory&lt;T&gt; usage guidelines](https://learn.microsoft.com/en-us/dotnet/standard/memory-and-spans/memory-t-usage-guidelines) | Use for hot-path optimization, ownership, and async-boundary decisions. |
| Collections, immutability, and thread-safe containers | `rules/runtime-collections-immutability.md` | [Thread-safe collections](https://learn.microsoft.com/en-us/dotnet/standard/collections/thread-safe/); [C# records guidance](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/types/records) | Bridges runtime collection choices with immutable data-shape guidance. |

### Maintenance notes

- If later work adds GC, runtime configuration, or diagnostics runtime tooling
  rules, extend this map instead of creating an unrelated source index.
- Use the `dotnet-platform.md` memo as the backlog source for deferred runtime
  topics.
