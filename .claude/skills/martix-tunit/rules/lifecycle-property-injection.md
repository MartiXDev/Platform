# TUnit property injection and initialization

## Purpose

Govern how properties on test classes and data-source objects are injected by
TUnit, how injected objects are initialized asynchronously, which initialization
interface applies at discovery time vs execution time, how disposal lifetime
is controlled through `SharedType`, how nested dependency graphs are resolved,
and how objects subscribe to lifecycle events to react to test-start, test-end,
and class/assembly boundaries. This rule does **not** cover `IClassConstructor`
or DI-container wiring; those belong in [lifecycle-di.md](./lifecycle-di.md).
Hook attributes (`[Before]`, `[After]`, etc.) are covered in
[lifecycle-hooks.md](./lifecycle-hooks.md).

## Default guidance

### Declaring injectable properties

Mark every injectable property with the `required` keyword and an appropriate
data-source attribute. The `required` modifier eliminates nullability warnings
and produces a compile-time error if the property is accidentally left
un-attributed:

```csharp
public class MyTests
{
    [ClassDataSource<DatabaseFixture>(Shared = SharedType.PerTestSession)]
    public required DatabaseFixture Database { get; init; }

    [MethodDataSource(nameof(GetConfig))]
    public required string Config { get; init; }

    public static string GetConfig() => "test-config";
}
```

**Supported property attributes (AOT-compatible):**

| Attribute | Use case |
|---|---|
| `[ClassDataSource<T>]` | Injects and manages a `T` instance with configurable sharing |
| `[MethodDataSource]` | Calls a static method and injects the returned value |
| `[DataSourceGeneratorAttribute]` (custom) | Source-generated data; first item only for properties |

For DI-container–resolved properties, inherit from
`DependencyInjectionDataSourceAttribute<TScope>` — see
[lifecycle-di.md](./lifecycle-di.md).

### Property value resolution and caching

1. Property values are **resolved once** during test registration, not per test
   invocation.
2. Shared objects (`SharedType.PerClass` and above) are created once and reused
   across the tests that share them.
3. Each test runs with its own **new test class instance**, but the cached
   property values are applied to that fresh instance before `[Before(Test)]`
   runs.
4. `IAsyncInitializer.InitializeAsync()` fires after `[Before(Class)]` hooks,
   on every object in the dependency graph.

### `IAsyncInitializer` — execution-time initialization

Implement `IAsyncInitializer` on a data-source class to perform async setup
(starting containers, opening connections, seeding databases) that must complete
before the test body runs. This interface runs during **test execution**, not
during discovery.

```csharp
public class DatabaseFixture : IAsyncInitializer, IAsyncDisposable
{
    public string? ConnectionString { get; private set; }

    public async Task InitializeAsync()
    {
        // Runs after [Before(Class)] hooks, before [Before(Test)] hooks.
        ConnectionString = await StartDatabaseContainerAsync();
    }

    public async ValueTask DisposeAsync()
    {
        await StopDatabaseContainerAsync();
    }
}
```

**Do not** call `IAsyncInitializer` during discovery. At discovery time, the
`InitializeAsync` method has not run, so any property set inside it will be
`null` or default.

### `IAsyncDiscoveryInitializer` — discovery-time initialization

Implement `IAsyncDiscoveryInitializer` only when your data-source class is
referenced by an `InstanceMethodDataSource` and the data that method returns
must be loaded asynchronously before TUnit can enumerate test cases. This is
uncommon; most tests should use `IAsyncInitializer`.

```csharp
public class TestCaseFixture : IAsyncDiscoveryInitializer, IAsyncDisposable
{
    private List<string> _cases = [];

    // Runs during discovery, before test enumeration.
    public async Task InitializeAsync()
    {
        _cases = await LoadTestCasesFromDatabaseAsync();
    }

    public IEnumerable<string> GetCases() => _cases;

    public async ValueTask DisposeAsync() => _cases.Clear();
}
```

Because discovery runs frequently — on every IDE project reload and every
`--list-tests` call — **avoid expensive operations** in
`IAsyncDiscoveryInitializer`. If your test-case identifiers are predefined,
use `IAsyncInitializer` instead.

### Disposal and lifetime via `SharedType`

The `Shared` parameter on `[ClassDataSource<T>]` controls when the injected
object is disposed:

| `SharedType` | When disposed |
|---|---|
| `None` (default) | After each test that used it |
| `PerClass` | After the last test in the class |
| `PerAssembly` | After the last test in the assembly |
| `PerTestSession` | After the test session ends |
| `Keyed` | When all tests sharing the given `Key` value complete |

Implement `IAsyncDisposable` (preferred) or `IDisposable` on the data-source
class to participate in this lifecycle. TUnit decrements a reference count after
each test and calls dispose only when the count reaches zero, matching the
`SharedType` boundary.

### Nested property injection graphs

Data-source objects can themselves declare `required` properties with
data-source attributes, creating a nested dependency graph. TUnit resolves the
graph **depth-first**: the deepest nested object is initialized first, then each
parent.

```csharp
// InMemorySql is initialized first; WebAppFactory is initialized after.
public class WebAppFactory : IAsyncInitializer
{
    [ClassDataSource<InMemorySql>(Shared = SharedType.PerTestSession)]
    public required InMemorySql Sql { get; init; }

    public Task InitializeAsync()
    {
        // Sql.ConnectionString is already set here.
        _ = Server;
        return Task.CompletedTask;
    }
}

public class IntegrationTests
{
    [ClassDataSource<WebAppFactory>]
    public required WebAppFactory App { get; init; }
}
```

TUnit handles the full orchestration: graph construction, depth-first
initialization, and reference-counted disposal in reverse order. Do not rely
on sibling-property initialization order; siblings may initialize in any order.

TUnit detects and reports circular dependencies; no defensive guard is needed
in test code.

### Event receiver interfaces

Any object associated with a test — the test class itself, an injected property,
a custom class constructor, or an attribute — may implement event receiver
interfaces to react to lifecycle events. The available interfaces are:

| Interface | When fired | Context type |
|---|---|---|
| `ITestRegisteredEventReceiver` | After test discovered | `TestRegisteredContext` |
| `IFirstTestInTestSessionEventReceiver` | Before first test in session | `TestSessionContext` |
| `IFirstTestInAssemblyEventReceiver` | Before first test in assembly | `AssemblyHookContext` |
| `IFirstTestInClassEventReceiver` | Before first test in class | `ClassHookContext` |
| `ITestStartEventReceiver` | When test begins | `TestContext` |
| `ITestEndEventReceiver` | When test completes | `TestContext` |
| `ITestSkippedEventReceiver` | When test is skipped | `TestContext` |
| `ILastTestInClassEventReceiver` | After last test in class | `ClassHookContext` |
| `ILastTestInAssemblyEventReceiver` | After last test in assembly | `AssemblyHookContext` |
| `ILastTestInTestSessionEventReceiver` | After last test in session | `TestSessionContext` |

Implement these on the data-source class — not in the test class — when the
event is logically tied to the lifecycle of the injected object rather than to
the test itself.

### Early vs Late stage for start/end receivers

`ITestStartEventReceiver` and `ITestEndEventReceiver` support an `EventReceiverStage`
property (available on .NET 8.0+ only):

- **`EventReceiverStage.Early`** — receiver fires **before** `[Before(Test)]`
  (start) or **before** `[After(Test)]` (end). Use this when the receiver
  must initialize resources that `[Before(Test)]` hooks depend on.
- **`EventReceiverStage.Late`** (default) — receiver fires **after**
  `[Before(Test)]` (start) or **after** `[After(Test)]` (end). Use this to
  observe final test state or clean up after all instance hooks have run.

```csharp
public class DatabaseConnectionAttribute : Attribute, ITestStartEventReceiver
{
    // Early: connection is open before [Before(Test)] hooks run.
    public EventReceiverStage Stage => EventReceiverStage.Early;

    public async ValueTask OnTestStart(TestContext context)
    {
        var conn = new SqlConnection(connectionString);
        await conn.OpenAsync();
        context.StateBag.GetOrAdd("DbConnection", _ => conn);
    }
}
```

On .NET Framework and .NET Standard 2.0 the `Stage` property is unavailable
and all receivers execute at the Late stage.

## Avoid

- **Properties without `required`.** Omitting `required` removes the compile-time
  guarantee and re-introduces nullability warnings. Always declare injectable
  properties as `required`.
- **Mutable setters (`{ get; set; }`).** Use `{ get; init; }` to prevent
  accidental reassignment after injection.
- **Accessing `IAsyncInitializer`-set values during discovery.** These values
  are uninitialized at discovery time; code that runs during `InstanceMethodDataSource`
  enumeration must not depend on them.
- **Expensive operations in `IAsyncDiscoveryInitializer`.** Discovery runs on
  every IDE reload; keep it fast or move the work to `IAsyncInitializer`.
- **Relying on sibling-property initialization order.** TUnit only guarantees
  depth-first initialization of nested graphs; ordering among sibling properties
  is not specified.
- **Circular property injection graphs.** TUnit reports circular dependencies
  at runtime; eliminate them by refactoring into a shared base type or a
  dedicated composite fixture.
- **Implementing `IDisposable` only for shared resources.** If an exception
  fires in `Dispose`, the rest of the cleanup chain is skipped. Implement
  `IAsyncDisposable` and let TUnit manage ref-counted disposal through
  `SharedType`.
- **Putting event receiver logic in the test class for concerns that belong to
  the fixture.** Event receivers on data-source classes keep fixture lifecycle
  logic co-located with the fixture.

## Review checklist

- [ ] Every injectable property is declared `required` with `{ get; init; }`.
- [ ] `IAsyncInitializer` is used for execution-time setup only, never for
      discovery-time data loading.
- [ ] `IAsyncDiscoveryInitializer` is used only when test-case enumeration
      genuinely depends on async-loaded data.
- [ ] `SharedType` is set to the narrowest scope that avoids repeated expensive
      initialization (`None` for cheap objects, `PerClass` or `PerTestSession`
      for containers or DB connections).
- [ ] Every object that allocates external resources implements
      `IAsyncDisposable`.
- [ ] Nested property graphs are free of circular dependencies.
- [ ] Event receiver interfaces are implemented on the fixture/data-source class
      where the lifecycle concern originates.
- [ ] `EventReceiverStage.Early` is used only when the receiver must run before
      instance hooks, not as a default.

## Related files

- [lifecycle-hooks.md](./lifecycle-hooks.md) —
  `[Before]` / `[After]` hook attributes, execution order, AsyncLocal
- [lifecycle-di.md](./lifecycle-di.md) —
  `IClassConstructor`, `DependencyInjectionDataSourceAttribute<TScope>`,
  DI container integration
- [data-class-property-sources.md](./data-class-property-sources.md) —
  `[ClassDataSource<T>]` as a parameterized data source for test arguments
- [references/lifecycle-map.md](../references/lifecycle-map.md) —
  quick-reference entry map for the lifecycle domain

## Source anchors

- [TUnit — Test Lifecycle](https://tunit.dev/docs/writing-tests/lifecycle)
  — complete execution order, discovery vs execution phases, property injection
  lifecycle, disposal-by-sharing-type matrix, and all event receiver interfaces.
- [TUnit — Property Injection](https://tunit.dev/docs/writing-tests/property-injection)
  — AOT-compatible property attributes, `IAsyncInitializer`, `IAsyncDiscoveryInitializer`,
  basic and nested property injection examples, sharing strategies, and best practices.
- [TUnit — Event Subscribing](https://tunit.dev/docs/writing-tests/event-subscribing)
  — full list of event receiver interfaces, `EventReceiverStage` (Early vs Late),
  .NET version constraints, and `[ClassDataSource<T>]` internal event usage.
