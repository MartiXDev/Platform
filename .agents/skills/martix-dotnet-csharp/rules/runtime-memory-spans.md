## Memory, spans, and hot-path performance

### Purpose

Explain when `Span<T>`, `ReadOnlySpan<T>`, `Memory<T>`, pooling, and
allocation-aware APIs are worth using in .NET code.

### Default guidance

- Start with simple array, string, stream, and collection code, then optimize
  hot paths that are proven by measurement.
- Use `Span<T>` and `ReadOnlySpan<T>` for synchronous, stack-friendly slicing
  and parsing where avoiding extra allocations materially matters.
- Use `Memory<T>` when data must survive across async boundaries or be stored
  for later use.
- Prefer streaming and incremental parsing for large payloads instead of
  loading entire buffers into memory.

### Avoid

- Do not carry spans across async suspension points or store them on
  heap-allocated objects.
- Do not add pooling, `stackalloc`, or manual buffer reuse without a measured
  reason and ownership clarity.
- Do not trade away maintainability for micro-optimizations in non-hot code.

### Review checklist

- The optimization target is measured or otherwise high confidence.
- Ownership and lifetime rules are explicit for pooled or borrowed memory.
- Async code uses `Memory<T>` or streams instead of invalid span capture.

### Related files

- [Collections and immutability](./runtime-collections-immutability.md)
- [Tasks and ValueTasks](./async-tasks-valuetasks.md)
- [Runtime source map](../references/runtime-bcl-map.md)

### Source anchors

- [Memory and spans in .NET](https://learn.microsoft.com/en-us/dotnet/standard/memory-and-spans/)
- [Memory&lt;T&gt; usage guidelines](https://learn.microsoft.com/en-us/dotnet/standard/memory-and-spans/memory-t-usage-guidelines)
- [Runtime source map](../references/runtime-bcl-map.md)
