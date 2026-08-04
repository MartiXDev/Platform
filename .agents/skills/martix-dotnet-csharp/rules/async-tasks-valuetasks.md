## Tasks, ValueTasks, async streams, and API shape

### Purpose

Keep async APIs idiomatic, cancelable, and allocation-aware without adding
accidental complexity.

### Default guidance

- Use `Task` and `Task<T>` as the default async return types, and suffix
  asynchronous methods with `Async`.
- Keep I/O-bound APIs on `Task` and `Task<T>` even when they sometimes hit a
  cache or fast path.
- Use `ValueTask` only when measurement or a known synchronous-completion path
  shows a meaningful benefit and the consumption rules are understood.
- Stream data with `IAsyncEnumerable<T>` when callers benefit from partial
  results or large datasets should not buffer eagerly.
- Perform fast argument validation before the first `await`, then let
  exceptions and cancellations flow naturally.

```csharp
// Wrong: I/O work uses ValueTask without a strong synchronous-completion case.
public ValueTask<OrderDto?> GetOrderAsync(
    int id,
    CancellationToken cancellationToken);

// Better: I/O stays Task; mixed sync/async hot paths can justify ValueTask.
public Task<OrderDto?> GetOrderAsync(
    int id,
    CancellationToken cancellationToken);

public ValueTask<Session?> GetSessionAsync(
    string key,
    CancellationToken cancellationToken)
{
    if (_sessions.TryGetValue(key, out var session))
    {
        return ValueTask.FromResult<Session?>(session);
    }

    return new ValueTask<Session?>(
        LoadSessionAsync(key, cancellationToken));
}
```

### Avoid

- Do not wrap an existing task in an unnecessary `async` and `await` layer.
- Do not use `ValueTask` casually in public APIs where the savings are
  theoretical or the consumer burden is higher.
- Do not expose `ValueTask` when callers are likely to await multiple times,
  cache the operation, or compose it with `Task.WhenAll`.
- Do not block on tasks with `.Result`, `.Wait()`, or other sync-over-async
  bridges.

### Review checklist

- Async names, return types, and cancellation parameters follow TAP
  expectations.
- `ValueTask` use has a measured or obvious synchronous-completion reason.
- Large or streaming workloads avoid full buffering when not required.
- Tests cover success, failure, and cancellation behavior.

### Related files

- [Cancellation and timeouts](./async-cancellation-timeouts.md)
- [Concurrency and channels](./async-concurrency-channels.md)
- [Async source map](../references/async-map.md)

### Source anchors

- [Task-based asynchronous pattern](https://learn.microsoft.com/en-us/dotnet/standard/asynchronous-programming-patterns/task-based-asynchronous-pattern-tap)
- [C# async scenarios](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/async-scenarios)
- [ValueTask<TResult>](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.valuetask-1?view=net-10.0)
- [Async source map](../references/async-map.md)
