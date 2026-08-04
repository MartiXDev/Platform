## Concurrency, synchronization, and channels

### Purpose

Choose concurrency primitives that fit throughput, coordination, and
backpressure needs without oversynchronizing or overscheduling work.

### Default guidance

- Use `System.Threading.Channels` for producer-consumer pipelines, especially
  when bounded capacity or backpressure matters.
- Use `SemaphoreSlim`, `lock`, concurrent collections, and other primitives
  deliberately based on the data-sharing model.
- Prefer structured concurrency with clear ownership of tasks and cancellation
  rather than fire-and-forget work.
- Use parallelism only for CPU-bound work or clearly partitioned I/O workflows
  where ordering and rate limits are controlled.

### Avoid

- Do not use `Task.Run` as a blanket fix for blocking, latency, or lifetime
  design problems.
- Do not combine multiple synchronization primitives unless each one has a
  clear role.
- Do not leave channel readers, writers, or background loops uncanceled during
  shutdown paths.

### Review checklist

- The primitive matches contention, ordering, and backpressure needs.
- Cancellation and completion semantics are explicit.
- Shared state and thread-affinity assumptions are documented or eliminated.

### Related files

- [Cancellation and timeouts](./async-cancellation-timeouts.md)
- [Collections and immutability](./runtime-collections-immutability.md)
- [Async source map](../references/async-map.md)

### Source anchors

- [Channels library](https://learn.microsoft.com/en-us/dotnet/core/extensions/channels)
- [Synchronization primitives overview](https://learn.microsoft.com/en-us/dotnet/standard/threading/overview-of-synchronization-primitives)
- [Task parallel library overview](https://learn.microsoft.com/en-us/dotnet/standard/parallel-programming/task-parallel-library-tpl)
