## Cancellation and timeouts

### Purpose

Make asynchronous work cooperative, cancelable, and bounded so failures are
responsive instead of lingering in the background.

### Default guidance

- Accept a `CancellationToken` in async and long-running APIs, pass it through,
  and honor it in loops, delays, and I/O.
- Use linked tokens or `CancelAfter` to model timeouts, and cancel the
  underlying work rather than only abandoning the await.
- Let `OperationCanceledException` represent expected cancellation, and keep
  timeout handling distinct from permanent failures.
- Return non-zero exit codes for canceled command-line operations so automation
  can distinguish cancellation from success.

### Avoid

- Do not create tokens that are never observed by downstream work.
- Do not swallow cancellation exceptions as if they were successful completion.
- Do not implement timeouts with `Task.WhenAny` unless the losing task is
  canceled or otherwise cleaned up.

### Review checklist

- Cancellation reaches every relevant async dependency.
- Timeout and cancellation policies are explicit at the edge of the operation.
- Tests cover immediate cancellation, mid-flight cancellation, and timeout
  behavior.

### Related files

- [Tasks and async API shape](./async-tasks-valuetasks.md)
- [HTTP resilience](./web-http-resilience.md)
- [Async source map](../references/async-map.md)

### Source anchors

- [Cancellation in managed threads](https://learn.microsoft.com/en-us/dotnet/standard/threading/cancellation-in-managed-threads)
- [Implementing TAP](https://learn.microsoft.com/en-us/dotnet/standard/asynchronous-programming-patterns/implementing-the-task-based-asynchronous-pattern)
- [Async source map](../references/async-map.md)
