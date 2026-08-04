# TUnit extension points

## Purpose

Guide the selection and implementation of TUnit's advanced extensibility seams
so that custom executors, hook wrappers, event receivers, data generators,
display formatters, and dynamic tests are authored correctly and registered at
the right scope.

## Default guidance

### Choosing the right extension point

| Goal | Extension point | Registration |
| --- | --- | --- |
| Wrap test body with custom logic (timing, retry, STA thread) | `ITestExecutor` | `[TestExecutor<T>]` on assembly / class / method |
| Wrap any hook with cross-cutting logic | `IHookExecutor` | `[HookExecutor<T>]` on assembly / class / method |
| React to test lifecycle events | `ITestDiscoveryEventReceiver`, `ITestRegisteredEventReceiver`, `ITestStartEventReceiver`, `ITestEndEventReceiver`, `ITestRetryEventReceiver` | Embed in a custom `Attribute` class; apply at assembly / class / method |
| Generate custom parameterized data at compile time | `DataSourceGeneratorAttribute<T>` or multi-param generic variants | Attribute applied to class or test method |
| Generate custom parameterized data asynchronously | `AsyncDataSourceGeneratorAttribute<T>` | Same; runs at **discovery time** — keep it fast |
| Generate data without compile-time type info | `UntypedDataSourceGeneratorAttribute` | Same; returns `IEnumerable<Func<object?[]>>` |
| Control how arguments display in test explorer | `ArgumentDisplayFormatter` subclass | `[ArgumentDisplayFormatter<T>]` on test method |
| Custom display name logic | Override `GetDisplayName()` on a custom attribute | — |
| Generate tests from code rather than attributes | `[DynamicTestBuilder]` on a method with `DynamicTestBuilderContext` | Declarative in the same class; also callable from within a running test via `TestContext.Current!.AddDynamicTest(...)` |
| Limit actual concurrent test count | `IParallelLimit` | `[ParallelLimiter<T>]` on assembly / class |

### ITestExecutor

Implement `ITestExecutor` when you need to wrap the test body itself. The
framework calls `ExecuteTest(TestContext context, Func<ValueTask> action)` and
you own the call to `action()`.

```csharp
public class TimingTestExecutor : ITestExecutor
{
    public async ValueTask ExecuteTest(TestContext context, Func<ValueTask> action)
    {
        var sw = Stopwatch.StartNew();
        try { await action(); }
        finally { context.WriteLine($"Elapsed: {sw.ElapsedMilliseconds}ms"); }
    }
}
// Register at assembly scope:
[assembly: TestExecutor<TimingTestExecutor>]
```

Always `await action()` inside the executor. Dropping the call skips the test
body silently.

### IHookExecutor

`IHookExecutor` has one method per hook type:
`ExecuteBefore/AfterTestDiscoveryHook`, `ExecuteBefore/AfterTestSessionHook`,
`ExecuteBefore/AfterAssemblyHook`, `ExecuteBefore/AfterClassHook`,
`ExecuteBefore/AfterTestHook`. Each receives `MethodMetadata`, the
scope-specific context, and `Func<ValueTask> action`.

Use `IHookExecutor` for cross-cutting hook concerns (logging, error handling,
resource management). Prefer `ITestExecutor` for test-body concerns. Do not
silently swallow exceptions from `action()` unless the hook design explicitly
requires it; aggregate and rethrow.

### Event receivers

Event receivers must be implemented inside a custom `Attribute` subclass.
Implement one or more of the receiver interfaces and apply the attribute at the
desired scope:

```csharp
[AttributeUsage(AttributeTargets.Assembly | AttributeTargets.Class | AttributeTargets.Method)]
public class TestReporterAttribute : Attribute, ITestStartEventReceiver, ITestEndEventReceiver
{
    public int Order => 0;

    public async ValueTask OnTestStart(TestContext context) =>
        await ReportingService.ReportStartAsync(context.GetDisplayName());

    public async ValueTask OnTestEnd(TestContext context) =>
        await ReportingService.ReportEndAsync(context.GetDisplayName(), context.Execution.Result?.State);
}

[assembly: TestReporter]
```

`Order` controls the relative execution sequence when multiple event receivers
are registered at the same scope.

### Data source generators

Generators extend `DataSourceGeneratorAttribute<T>` (or multi-type generic
variants). Override `GenerateDataSources(DataGeneratorMetadata)` and yield
`Func<T>` factories — one per test case. The `Func` wrapper is required because
generators can be composed in nested loops and TUnit needs a fresh instance per
cell.

For async discovery-time data, extend `AsyncDataSourceGeneratorAttribute<T>` and
yield `Func<T>` (or return `IAsyncEnumerable<Func<T>>`). This runs at
**discovery time** — IDE reloads, `--list-tests`, and CI test enumeration all
call it. Expensive or flaky I/O here breaks discovery; prefer fast, stable
sources and cache aggressively. Use `IAsyncDiscoveryInitializer` on shared
fixtures to separate initialization from data generation.

### Argument formatters and display names

Subclass `ArgumentDisplayFormatter` and override the formatting logic, then
annotate the test method with `[ArgumentDisplayFormatter<MyFormatter>]`. The
formatter controls how each argument appears in the test explorer display name.

For static or computed display names, set `DisplayName` on `[Test]` or return
a custom name from `[Arguments]`/`TestDataRow<T>`.

### Dynamic tests

Use `[DynamicTestBuilder]` on a public method with a single
`DynamicTestBuilderContext` parameter to register tests programmatically:

```csharp
public class DynamicSuite
{
    [DynamicTestBuilder]
    public void BuildTests(DynamicTestBuilderContext context)
    {
        foreach (var name in new[] { "Alice", "Bob" })
            context.AddTest(new DynamicTest<DynamicSuite>
            {
                TestMethod = c => c.RunFor(DynamicTestHelper.Argument<string>()),
                TestMethodArguments = [name],
            });
    }

    public async Task RunFor(string name) =>
        await Assert.That(name).IsNotNullOrEmpty();
}
```

The lambda body is an `Expression`, not a delegate. Arguments inside the lambda
are placeholders; actual values come from `TestMethodArguments`. Use
`DynamicTestHelper.Argument<T>()` to make this intent explicit.

You can also add dynamic tests from inside a running test via
`TestContext.Current!.AddDynamicTest(...)`.

### Built-in extension packages

TUnit ships built-in extensions. Check `/extending/built-in-extensions` before
reimplementing behavior that is already provided. Code coverage integration is
bundled and enabled via `--coverage` rather than Coverlet.

## Avoid

- Do not drop the `await action()` call in `ITestExecutor` or `IHookExecutor`
  implementations — missing it silently skips test execution or hooks.
- Do not perform heavy I/O in `AsyncDataSourceGeneratorAttribute` because it
  blocks IDE test discovery. Gate expensive discovery-time initialization behind
  `IAsyncDiscoveryInitializer`.
- Do not register event receivers by calling a static method or adding to a
  collection — they must live inside an `Attribute` class applied at the
  appropriate scope.
- Do not use dynamic arguments directly in the `[DynamicTestBuilder]` lambda
  body; always pass real values via `TestMethodArguments` and use
  `DynamicTestHelper.Argument<T>()` in the expression.
- Do not implement `ITestExecutor` to replace retry or timeout logic that
  `[Retry]` and `[Timeout]` already handle; use built-in attributes first.
- Do not publish extension attributes that hard-code assembly-level registration
  inside the library itself — let consumers choose the registration scope.

## Review checklist

- [ ] The chosen extension point is the smallest one that covers the requirement (event receiver before executor, built-in attribute before custom executor).
- [ ] Every `ITestExecutor` and `IHookExecutor` implementation `await`s the `action()` delegate.
- [ ] Event receiver interfaces are implemented on an `Attribute` class, not a plain class.
- [ ] `DataSourceGeneratorAttribute` overrides return `IEnumerable<Func<T>>` (factories, not values).
- [ ] Discovery-time async generators avoid slow or flaky external I/O.
- [ ] Dynamic test lambdas use `DynamicTestHelper.Argument<T>()` and pass actual values via `TestMethodArguments`.
- [ ] `Order` is set on event receivers when relative execution sequence matters.

## Related files

- [Mocking rule](./mocking-tunit-mocks.md)
- [Lifecycle hooks rule](./lifecycle-hooks.md)
- [Data matrix and combined generators rule](./data-matrix-combined-generators.md)
- [Mocking and extending map](../references/mocking-extending-map.md)

## Source anchors

- [TUnit extension points](https://tunit.dev/docs/extending/extension-points)
- [Data source generators](https://tunit.dev/docs/extending/data-source-generators)
- [Argument formatters](https://tunit.dev/docs/extending/argument-formatters)
- [Display names](https://tunit.dev/docs/extending/display-names)
- [Dynamic tests](https://tunit.dev/docs/extending/dynamic-tests)
- [Logging extension](https://tunit.dev/docs/extending/logging)
- [Exception handling extension](https://tunit.dev/docs/extending/exception-handling)
- [Built-in extensions](https://tunit.dev/docs/extending/built-in-extensions)
- [Publishing extension libraries](https://tunit.dev/docs/extending/libraries)
- [Event subscribing](https://tunit.dev/docs/writing-tests/event-subscribing)
