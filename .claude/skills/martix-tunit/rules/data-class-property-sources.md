# TUnit data — class data sources, sharing, and nested sources

## Purpose

Define how to use `[ClassDataSource<T>]` to inject typed instances into
tests and test classes, how to control shared-instance semantics with
`SharedType`, how to wire initialization and teardown through
`IAsyncInitializer` / `IAsyncDisposable`, and how to compose nested data
sources so TUnit resolves initialization order automatically.

## Default guidance

### `[ClassDataSource<T>]` basics

- Use `[ClassDataSource<T>]` when a test requires a typed object that TUnit
  should construct and optionally share across tests. The attribute can target
  test method parameters or test class constructor parameters:

  ```csharp
  [Test]
  [ClassDataSource<WebApplicationFactory>(Shared = SharedType.PerTestSession)]
  public async Task MyTest(WebApplicationFactory factory) { ... }
  ```

- TUnit creates and disposes the instance according to the `Shared` value.
  By default (`Shared = SharedType.None`) a new instance is created per test
  case.

### `SharedType` options

| Value | Scope | Notes |
| --- | --- | --- |
| `None` | One instance per test case | Default. Safe for mutable objects. |
| `PerTestSession` | One instance for the entire test run | Expensive shared resources (containers, servers). Initialize once, never mutate. |
| `PerClass` | One instance per test class | Shared within a class; reset state between classes. |
| `Keyed` | One instance per named key | Cross-class sharing by explicit key; see `Key` property below. |

- Use `SharedType.PerTestSession` for expensive, stateless resources such as
  `WebApplicationFactory` or started test containers.
- Use `SharedType.PerClass` when the fixture is scoped to one test class and
  should not outlive it.
- Use `SharedType.Keyed` when a specific named instance must be shared across
  multiple test classes without sharing the same instance across the full
  session:

  ```csharp
  [ClassDataSource<TestApplication>(Shared = SharedType.Keyed, Key = "integration-tests")]
  ```

- **Avoid mutating shared instances inside tests**. Tests run in parallel by
  default; mutating a `PerTestSession` or `PerClass` instance inside a test
  body produces unpredictable results.

### Initialization and teardown

- Implement `IAsyncInitializer` on the data class to run async setup before
  the instance is injected into tests. TUnit calls `InitializeAsync()` after
  construction but before any test that receives the instance starts.
- Implement `IAsyncDisposable` on the data class to run async teardown when
  the shared scope ends (test, class, session, or keyed group):

  ```csharp
  public record WebApplicationFactory : IAsyncInitializer, IAsyncDisposable
  {
      public HttpClient Client { get; private set; } = null!;

      public async Task InitializeAsync()
      {
          // Start server, create HttpClient, etc.
          Client = CreateClient();
      }

      public async ValueTask DisposeAsync()
      {
          Client?.Dispose();
          await StopServerAsync();
      }
  }
  ```

### Multi-type overloads and positional `Keys`

- `ClassDataSource` has generic overloads for injecting multiple types at once:
  `ClassDataSource<T1, T2>`, `ClassDataSource<T1, T2, T3>`, etc.
- When using multi-type overloads, pass `Shared` as an array and `Keys` as a
  positional array. **The `Keys` array is positional** — each index corresponds
  to the type at the same position in the generic parameters. Only
  `SharedType.Keyed` positions need a non-empty key; all other positions should
  use an empty string:

  ```csharp
  [ClassDataSource<Value1, Value2, Value3>(
      Shared = [SharedType.PerTestSession, SharedType.Keyed, SharedType.PerClass],
      Keys   = ["", "Value2Key", ""]
      // Index 0: Value1 (PerTestSession) — no key needed
      // Index 1: Value2 (Keyed)          — "Value2Key"
      // Index 2: Value3 (PerClass)        — no key needed
  )]
  ```

### Nested data sources

- A data class can declare `[ClassDataSource<T>]` on a `required` property
  with the `init` accessor. TUnit detects these nested declarations and
  initializes them in dependency order before calling the outer class's
  `InitializeAsync()`:

  ```csharp
  public class TestApplication : IAsyncInitializer, IAsyncDisposable
  {
      [ClassDataSource<RedisTestContainer>]
      public required RedisTestContainer Redis { get; init; }

      public HttpClient Client { get; private set; } = null!;

      public async Task InitializeAsync()
      {
          // Redis is already initialized here
          Client = CreateClientWithRedis(Redis.ConnectionString);
      }

      public async ValueTask DisposeAsync() { ... }
  }
  ```

- Multiple nested dependencies are all initialized before the outer
  `InitializeAsync()` runs; you do not need to manage initialization order
  manually.
- Apply the same `Shared` semantics to nested properties as to top-level
  `[ClassDataSource]` usages. Expensive nested resources (for example,
  `PostgresTestContainer`) should be declared `PerTestSession` or
  `PerClass` so they are not restarted for every test case.

### xUnit comparison — `IClassFixture<T>` migration

- xUnit's `IClassFixture<T>` combined both setup/teardown logic and typed
  injection into a single construct.
- In TUnit these are distinct:
  - **Setup/teardown hooks** → `[Before(Class)]` / `[After(Class)]` (static,
    class-scoped; covered in `lifecycle-hooks.md`).
  - **Typed shared injection** → `[ClassDataSource<T>(Shared = SharedType.PerClass)]`.
- Replacing `IClassFixture<T>` with only `[Before(Class)]` is incomplete.
  Use `[ClassDataSource<T>]` when the fixture's purpose is to supply a typed
  instance to test methods or test constructors.

## Avoid

- **Do not mutate shared data-source instances inside tests**. Parallel
  execution makes the outcome unpredictable.
- **Do not omit `required` and `init`** on nested `[ClassDataSource]`
  properties. Omitting either keyword prevents TUnit from recognizing the
  property as a nested dependency and the property will remain `null`.
- **Do not expect `IAsyncInitializer` to run during test discovery**. It runs
  before test *execution*. Data used to enumerate test cases must be available
  statically or via `IAsyncDiscoveryInitializer` (see
  `data-inline-method-sources.md` for `InstanceMethodDataSource` discovery
  limitations).
- **Do not use `[ClassData]`** — this is the incorrect name from the
  third-party seed skill. The correct attribute is `[ClassDataSource<T>]`.
- **Do not omit the positional `Keys` array entries for non-`Keyed` positions
  in multi-type overloads**. Supply empty strings `""` for those positions.

## Review checklist

- [ ] `Shared` value matches the actual sharing intent (isolation vs. session
      vs. class vs. named key).
- [ ] Shared instances are not mutated inside test bodies.
- [ ] Data classes that require setup implement `IAsyncInitializer`; those
      that hold resources implement `IAsyncDisposable`.
- [ ] Nested `[ClassDataSource]` properties are declared `required` with the
      `init` accessor.
- [ ] Multi-type `ClassDataSource<T1, T2, ...>` uses positional `Keys` arrays
      aligned with the generic parameter positions.
- [ ] Migrating from xUnit `IClassFixture<T>` uses `[ClassDataSource<T>]`
      for injection (not just lifecycle hooks).

## Related files

- [Data — inline and method sources](./data-inline-method-sources.md)
- [Data — matrix, combined, and generators](./data-matrix-combined-generators.md)
- [Lifecycle — hooks](./lifecycle-hooks.md)
- [Data map](../references/data-map.md)

## Source anchors

- [TUnit class data source (`[ClassDataSource]`)](https://tunit.dev/docs/writing-tests/class-data-source)
  — `SharedType` options, multi-type overloads, positional `Keys`, `IAsyncInitializer`,
  `IAsyncDisposable`, and mutable-state warning.
- [Nested data sources](https://tunit.dev/docs/writing-tests/nested-data-sources)
  — `required` property injection, automatic initialization ordering, multi-dependency examples.
- [Property injection](https://tunit.dev/docs/writing-tests/property-injection)
  — Property-level data source injection and `IAsyncDiscoveryInitializer` context.
- [TestDataRow](https://tunit.dev/docs/writing-tests/test-data-row)
  — Per-row metadata on class-sourced cases.
- [Lifecycle](https://tunit.dev/docs/writing-tests/lifecycle)
  — Hook execution order relative to `ClassDataSource` initialization.
