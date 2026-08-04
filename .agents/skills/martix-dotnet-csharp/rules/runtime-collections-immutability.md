## Collections, concurrency, and immutability

### Purpose

Choose collection types that match access patterns, thread-safety
requirements, and mutation costs instead of defaulting to the nearest familiar
type.

### Default guidance

- Use generic collection interfaces and concrete types that reflect actual
  behavior such as `List<T>`, `Dictionary<TKey, TValue>`, or `HashSet<T>`.
- Prefer immutable data shapes for DTOs, configuration snapshots, and values
  that are shared widely.
- Use `System.Collections.Immutable` or concurrent collections when shared
  mutation or thread-safe coordination is required.
- Expose the narrowest abstraction that callers need, such as read-only views
  for read-mostly data.

### Avoid

- Do not return mutable internal collections directly from public APIs.
- Do not use synchronized wrappers or manual locking around collections when
  concurrent collection types already model the scenario.
- Do not over-abstract collection choices; optimize for the real access
  pattern, not theoretical flexibility.

### Review checklist

- Collection semantics match lookup, ordering, uniqueness, and concurrency
  requirements.
- Mutability boundaries are intentional and visible in the API shape.
- Hot paths avoid needless copying while preserving correctness.

### Related files

- [Memory and spans](./runtime-memory-spans.md)
- [Concurrency and channels](./async-concurrency-channels.md)
- [Runtime source map](../references/runtime-bcl-map.md)

### Source anchors

- [Thread-safe collections](https://learn.microsoft.com/en-us/dotnet/standard/collections/thread-safe/)
- [C# records guidance](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/types/records)
- [Runtime source map](../references/runtime-bcl-map.md)
