# TUnit lifecycle hooks

## Purpose

Govern how `[Before]`, `[BeforeEvery]`, `[After]`, and `[AfterEvery]` hook
attributes are applied, what method shape they require, how they interlock in
the full execution order, and which misuse patterns cause silent or aggregated
failures. This rule covers all six hook levels — TestDiscovery, TestSession,
Assembly, Class, Test, and their `*Every` global variants — plus AsyncLocal
propagation and common migration pitfalls. It does **not** cover property
injection, `IClassConstructor`, or DI wiring; see
[lifecycle-property-injection.md](./lifecycle-property-injection.md) and
[lifecycle-di.md](./lifecycle-di.md) for those.

## Default guidance

### Hook levels and static/instance split

Every hook level from Class upward must be **static**. Only `[Before(Test)]`
and `[After(Test)]` are instance methods. The compiler enforces this; do not
rely on runtime detection.

| Level | Before | After | Method type |
|---|---|---|---|
| TestDiscovery | `[Before(TestDiscovery)]` | `[After(TestDiscovery)]` | `static` |
| TestSession | `[Before(TestSession)]` | `[After(TestSession)]` | `static` |
| Assembly | `[Before(Assembly)]` | `[After(Assembly)]` | `static` |
| Class | `[Before(Class)]` | `[After(Class)]` | `static` |
| Test | `[Before(Test)]` | `[After(Test)]` | **instance** |

All `[BeforeEvery(...)]` and `[AfterEvery(...)]` methods at every level must
also be **static** and are conventionally placed in a dedicated file such as
`GlobalHooks.cs` to make their global scope obvious.

### `[Before]` vs `[BeforeEvery]` — scope distinction

| Attribute | Scope |
|---|---|
| `[Before(Class)]` | Once, before the first test in the **declaring class only** |
| `[BeforeEvery(Class)]` | Before the first test of **every class** in the session |
| `[Before(Test)]` | Before **each test in this class** |
| `[BeforeEvery(Test)]` | Before **every test** across the entire session |

Use `[Before(Test)]` and `[Before(Class)]` as the default. Reserve
`[BeforeEvery]` and `[AfterEvery]` for cross-cutting concerns (telemetry,
global screenshot capture, shared resource warm-up) that genuinely span all
classes or tests.

### Complete per-test execution order

The table below reflects the canonical execution order for a single test from
the official TUnit lifecycle docs. Each row names the operation and its type.

| Step | What happens | Type |
|---|---|---|
| 1 | `[Before(TestSession)]` | Hook (once per session) |
| 2 | `IFirstTestInTestSessionEventReceiver` | Event (once per session) |
| 3 | `[BeforeEvery(Assembly)]` / `[Before(Assembly)]` | Hooks (once per assembly) |
| 4 | `IFirstTestInAssemblyEventReceiver` | Event (once per assembly) |
| 5 | `[BeforeEvery(Class)]` / `[Before(Class)]` | Hooks (once per class) |
| 6 | `IFirstTestInClassEventReceiver` | Event (once per class) |
| 7 | Constructor runs (new test class instance) | Instance creation |
| 8 | Cached property values set on instance | Property injection |
| 9 | `IAsyncInitializer.InitializeAsync()` | Initialization |
| 10 | `[BeforeEvery(Test)]` | Hook |
| 11 | `ITestStartEventReceiver` (Early) | Event |
| 12 | `[Before(Test)]` | Hook (instance) |
| 13 | `ITestStartEventReceiver` (Late) | Event |
| 14 | Test body | Your test code |
| 15 | `ITestEndEventReceiver` (Early) | Event |
| 16 | `[After(Test)]` | Hook (instance) |
| 17 | `ITestEndEventReceiver` (Late) | Event |
| 18 | `[AfterEvery(Test)]` | Hook |
| 19 | `IAsyncDisposable` / `IDisposable` | Disposal |
| 20 | Tracked-object cleanup (ref-count decrement) | Shared-object lifecycle |
| 21 | `ILastTestInClassEventReceiver` | Event (last test in class) |
| 22 | `[After(Class)]` / `[AfterEvery(Class)]` | Hooks (last test in class) |
| 23 | `ILastTestInAssemblyEventReceiver` | Event (last test in assembly) |
| 24 | `[After(Assembly)]` / `[AfterEvery(Assembly)]` | Hooks (last test in assembly) |
| 25 | `ILastTestInTestSessionEventReceiver` | Event (last test in session) |
| 26 | `[After(TestSession)]` | Hook (once per session) |

Base-class `[Before(Test)]` hooks run **bottom-up** (deepest ancestor first).
`[After(Test)]` hooks run **top-down** (current class first, then base classes).

### Valid method signatures

A hook method must be either `void` (synchronous) or `async Task`
(asynchronous). Both are valid for all levels:

```csharp
[Before(Test)]
public void SynchronousSetup() { _value = 99; }

[Before(Test)]
public async Task AsyncSetup()
{
    _response = await httpClient.GetAsync("https://localhost/ping");
}
```

Hook methods may optionally declare a context parameter, a `CancellationToken`,
or both. The context type depends on the hook level:

| Hook level | Context type |
|---|---|
| Test | `TestContext` |
| Class | `ClassHookContext` |
| Assembly | `AssemblyHookContext` |
| TestSession | `TestSessionContext` |
| TestDiscovery | `BeforeTestDiscoveryContext` |

```csharp
[Before(Test)]
public async Task Setup(TestContext context, CancellationToken ct)
{
    Console.WriteLine($"Setting up: {context.Metadata.TestName}");
    await SomeLongRunningOperation(ct);
}
```

Any other parameter combination is invalid.

### Exception aggregation in `[After]` hooks

Multiple `[After]` methods on the same class all run regardless of whether
earlier ones throw. TUnit collects exceptions from every cleanup method and
aggregates them into a single failure at the end. This is why `[After]`
attributes are preferred over `IDisposable` for cleanup — `IDisposable` stops
at the first exception, whereas `[After]` ensures all cleanup paths run.

### Inspecting test results in cleanup hooks

Use `context.Execution.Result?.State` in an `[After(Test)]` hook to branch on
the test outcome:

```csharp
[After(Test)]
public async Task Cleanup(TestContext context, CancellationToken ct)
{
    if (context.Execution.Result?.State == TestState.Failed)
    {
        await CaptureScreenshot(ct);
    }
}
```

This pattern is useful for conditional artifact capture (screenshots, logs,
database state) that should only trigger on failure.

### AsyncLocal propagation

Setting `AsyncLocal<T>` values in a `[Before]` hook requires an explicit call
to `context.AddAsyncLocalValues()` to propagate them into the test framework's
execution flow:

```csharp
[BeforeEvery(Class)]
public static void BeforeClass(ClassHookContext context)
{
    _correlationId.Value = Guid.NewGuid().ToString();
    context.AddAsyncLocalValues(); // required for propagation
}
```

Without `AddAsyncLocalValues()` the value is set but will not be visible to
test body or other hooks running in downstream continuations.

### Migration pitfalls — xUnit, NUnit, MSTest

| Old pattern | TUnit replacement | Notes |
|---|---|---|
| xUnit constructor / `IClassFixture<T>` setup | `[Before(Class)]` static hook + `[ClassDataSource<T>(Shared = SharedType.PerClass)]` | Constructor sets up per-test state; use hooks or shared data sources for class-wide resources |
| xUnit `IDisposable.Dispose()` | `[After(Test)]` instance hook or `IAsyncDisposable` | `[After]` aggregates exceptions; `IDisposable` stops at first throw |
| NUnit `[OneTimeSetUp]` / `[OneTimeTearDown]` | `[Before(Class)]` / `[After(Class)]` static | Must be static in TUnit |
| NUnit `[SetUp]` / `[TearDown]` | `[Before(Test)]` / `[After(Test)]` instance | |
| MSTest `[ClassInitialize]` / `[ClassCleanup]` | `[Before(Class)]` / `[After(Class)]` static | |
| MSTest `[TestInitialize]` / `[TestCleanup]` | `[Before(Test)]` / `[After(Test)]` instance | |

The `[Before(TestDiscovery)]` and `[Before(TestSession)]` levels have no direct
equivalents in xUnit, NUnit, or MSTest. Use them only when a global one-time
action is required before any discovery or execution starts.

## Avoid

- **`async void` hooks.** Not allowed. The compiler will error. Use `async Task`
  or plain `void`.
- **Blocking on async inside hooks.** Never call `.Wait()` or `.Result`. Use
  `await` end-to-end.
- **Instance methods at Class level or above.** `[Before(Class)]` and higher
  require `static`. Violating this causes a compile or runtime error.
- **Static methods at Test level.** `[Before(Test)]` and `[After(Test)]` must
  be instance methods to access per-instance test state.
- **Using `IDisposable` as the sole cleanup mechanism.** Prefer `[After(Test)]`
  so that all cleanup methods run even when one throws.
- **Forgetting `context.AddAsyncLocalValues()`.** Setting an `AsyncLocal` value
  without the call will not propagate into downstream hooks or test bodies.
- **Scattering `[BeforeEvery]` across many files.** Global hooks are hard to
  audit when spread; consolidate them in `GlobalHooks.cs` or a similarly named
  file.
- **Using `[Before(Class)]` when per-test setup is intended.** Class-level hooks
  run once; they share state across parallel tests in that class. Use
  `[Before(Test)]` for per-test isolation.

## Review checklist

- [ ] Every `[Before(Class)]` and above is a `static` method.
- [ ] Every `[Before(Test)]` / `[After(Test)]` is an instance method.
- [ ] All async hooks are `async Task`, not `async void`.
- [ ] No `.Wait()` or `.Result` inside hook bodies.
- [ ] `[After(Test)]` is preferred over `IDisposable` wherever multiple cleanup
      paths are needed.
- [ ] Any `AsyncLocal` value set in a hook is followed by
      `context.AddAsyncLocalValues()`.
- [ ] All `[BeforeEvery]` / `[AfterEvery]` hooks are `static` and grouped in a
      dedicated hooks file.
- [ ] Test-result inspection uses `context.Execution.Result?.State` rather than
      inspecting thrown exceptions manually.
- [ ] `[Before(TestDiscovery)]` and `[Before(TestSession)]` hooks are justified
      for global/one-time concerns, not per-test setup.

## Related files

- [lifecycle-property-injection.md](./lifecycle-property-injection.md) —
  property injection, `IAsyncInitializer`, `IAsyncDiscoveryInitializer`,
  disposal lifetimes, and event receivers
- [lifecycle-di.md](./lifecycle-di.md) —
  `IClassConstructor` and `DependencyInjectionDataSourceAttribute<TScope>`
- [execution-parallelism.md](./execution-parallelism.md) —
  how hooks interact with parallel-by-default execution and `[NotInParallel]`
- [references/lifecycle-map.md](../references/lifecycle-map.md) —
  quick-reference entry map for the lifecycle domain

## Source anchors

- [TUnit — Test Lifecycle](https://tunit.dev/docs/writing-tests/lifecycle)
  — complete execution order table, discovery vs execution phase diagram,
  initialization interfaces, disposal-by-sharing-type matrix.
- [TUnit — Hooks](https://tunit.dev/docs/writing-tests/hooks)
  — hook method signatures, parameter combinations, `[Before]` vs
  `[BeforeEvery]`, `[After]` vs `[AfterEvery]`, common mistakes, AsyncLocal
  guidance, and cleanup examples.
- [TUnit — Event Subscribing](https://tunit.dev/docs/writing-tests/event-subscribing)
  — event receiver interfaces and `EventReceiverStage` (Early vs Late).
