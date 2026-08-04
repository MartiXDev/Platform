## Async and concurrency map

### Purpose

Connect TAP, cancellation, synchronization, and channel guidance to the
official async and threading documentation.

### Start here when

- The main question is primitive choice rather than implementation detail.
- You need a fast answer for `Task` vs `ValueTask` or bounded vs unbounded
  channels before opening the linked rule file.

### Quick decision aids

#### `Task` vs `ValueTask`

| If this is true | Prefer | Why |
| --- | --- | --- |
| Most application code, public APIs, or general async workflows | `Task` / `Task<T>` | TAP default and the simplest return shape for callers |
| A hot path often completes synchronously and task allocation is a measured cost | `ValueTask` / `ValueTask<T>` | Advanced allocation optimization for specialized paths |

#### Bounded vs unbounded channels

| If this is true | Prefer | Why |
| --- | --- | --- |
| Producers can outrun consumers, memory needs a cap, or backpressure must be explicit | Bounded channel | Capacity and `FullMode` make flow control visible |
| Producer rate is naturally limited and unbounded growth is acceptable | Unbounded channel | Simplest setup, but writes stay synchronous and memory can grow |

### Rule coverage

- **Task and ValueTask API shape**
  - Rule files: `rules/async-tasks-valuetasks.md`
  - Primary sources:
    - [Task-based asynchronous pattern](https://learn.microsoft.com/en-us/dotnet/standard/asynchronous-programming-patterns/task-based-asynchronous-pattern-tap)
    - [C# async scenarios](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/async-scenarios)
    - [Async return types](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/async-return-types)
  - Notes: Use for naming, return-type choice, validation timing, and async
    streams. Keep `Task` as the default and treat `ValueTask` as an advanced,
    measured choice.
- **Cancellation and timeout handling**
  - Rule files: `rules/async-cancellation-timeouts.md`
  - Primary sources:
    - [Cancellation in managed threads](https://learn.microsoft.com/en-us/dotnet/standard/threading/cancellation-in-managed-threads)
    - [Implementing TAP](https://learn.microsoft.com/en-us/dotnet/standard/asynchronous-programming-patterns/implementing-the-task-based-asynchronous-pattern)
  - Notes: Focuses on end-to-end cancellation and bounded work.
- **Concurrency primitives and channels**
  - Rule files: `rules/async-concurrency-channels.md`
  - Primary sources:
    - [Channels library](https://learn.microsoft.com/en-us/dotnet/core/extensions/channels)
    - [Synchronization primitives overview](https://learn.microsoft.com/en-us/dotnet/standard/threading/overview-of-synchronization-primitives)
    - [Task parallel library overview](https://learn.microsoft.com/en-us/dotnet/standard/parallel-programming/task-parallel-library-tpl)
  - Notes: Covers bounded vs unbounded channels, backpressure, parallelism, and
    safe coordination.

### Maintenance notes

- The first pass intentionally folds async streams into the task rule and
  channel guidance into the concurrency rule to match the approved future
  structure.
- Keep the decision aids short and source-backed; leave longer examples in the
  rule files.
- Expand with `IAsyncDisposable` or timer-specific guidance only if the future
  structure is revised.
