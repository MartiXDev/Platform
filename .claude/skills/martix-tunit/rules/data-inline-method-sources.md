# TUnit data — inline arguments and method data sources

## Purpose

Define how to supply compile-time constant data with `[Arguments]` and
runtime-constructed data with `[MethodDataSource]` so that parameterized
tests are correctly typed, receive isolated object instances, and produce
readable test output.

## Default guidance

### `[Arguments]` — inline constant data

- Use `[Arguments(...)]` when all parameter values are compile-time constants
  (literals, `const` fields, `nameof`, `typeof`). Multiple `[Arguments]`
  attributes on the same method generate one test case per attribute:

  ```csharp
  [Test]
  [Arguments(1, 1, 2)]
  [Arguments(1, 2, 3)]
  [Arguments(5, 5, 10)]
  public async Task Add_ReturnsExpectedSum(int a, int b, int expected)
  {
      await Assert.That(a + b).IsEqualTo(expected);
  }
  ```

- Use the `DisplayName` property on `[Arguments]` to attach human-readable
  names to individual cases. Display names support `$paramName` or positional
  `$arg1` substitution syntax:

  ```csharp
  [Arguments(1, 2, 3, DisplayName = "Adding $a + $b = $expected")]
  ```

- Use the `Categories` property to tag individual cases for test filtering:

  ```csharp
  [Arguments(100, 50, Categories = new[] { "Performance", "LargeNumbers" })]
  ```

- Use the `Skip` property on a specific `[Arguments]` entry to skip only that
  case without disabling the other cases on the same method:

  ```csharp
  [Arguments("Safari", "17", Skip = "Safari not available in CI")]
  ```

- `[Arguments]` does **not** support `new` expressions, method calls, or any
  non-constant value. This is a C# language constraint, not a TUnit limitation.
  Switch to `[MethodDataSource]` whenever object construction is needed.

### `[MethodDataSource]` — runtime-constructed data

- Use `[MethodDataSource]` when data requires object construction, conditional
  logic, external configuration, or any value that is not a compile-time
  constant.

- **Static source methods are required** for AOT compatibility and are the
  strongly preferred pattern. Place them in a dedicated `static` data class:

  ```csharp
  public static class MyTestDataSources
  {
      public static IEnumerable<Func<AdditionTestData>> AdditionData()
      {
          yield return () => new AdditionTestData(1, 2, 3);
          yield return () => new AdditionTestData(2, 2, 4);
      }
  }
  ```

- **Return `Func<T>` for reference types**, not `T` directly. The `Func<T>`
  wrapper ensures each test case receives a fresh instance and tests cannot
  share mutable state through the same object reference:

  ```csharp
  // ✅ Correct — each test gets its own AdditionTestData instance
  public static IEnumerable<Func<AdditionTestData>> Data()
      => [() => new AdditionTestData(1, 2, 3)];

  // ❌ Wrong — multiple tests may share the same object
  public static IEnumerable<AdditionTestData> Data()
      => [new AdditionTestData(1, 2, 3)];
  ```

- For value types and tuples, returning `T` directly is safe because they are
  copied on assignment. Prefer the `Func<T>` pattern regardless for consistency.

- Use the two-argument overload when the data method lives in a separate class:

  ```csharp
  [MethodDataSource(typeof(MyTestDataSources), nameof(MyTestDataSources.AdditionData))]
  ```

  Use the single-argument overload when the method is on the same test class:

  ```csharp
  [MethodDataSource(nameof(LocalDataMethod))]
  ```

- Tuples are supported when you prefer not to create named types:

  ```csharp
  public static IEnumerable<Func<(int, int, int)>> TupleData()
  {
      yield return () => (1, 2, 3);
      yield return () => (2, 2, 4);
  }

  [Test]
  [MethodDataSource(typeof(MyTestDataSources), nameof(MyTestDataSources.TupleData))]
  public async Task Add_WithTupleData(int a, int b, int expected) { ... }
  ```

- Async data sources use `IAsyncEnumerable<Func<T>>` with `[EnumeratorCancellation]`:

  ```csharp
  public static async IAsyncEnumerable<Func<AsyncTestData>> GetAsyncData(
      [EnumeratorCancellation] CancellationToken ct = default)
  {
      await Task.Delay(1, ct); // simulate lightweight async load
      yield return () => new AsyncTestData(1, "Item_1");
  }
  ```

  Async data sources run during **discovery**, not test execution. Keep them
  fast. Long-running or unreliable I/O here will delay or prevent test
  discovery entirely.

### `InstanceMethodDataSource` — instance property access

- Use `[InstanceMethodDataSource(nameof(propertyOrMethod))]` when the data
  source must access instance members of the test class:

  ```csharp
  public class MyTests
  {
      private IEnumerable<int> TestData => [1, 2, 3];

      [Test]
      [InstanceMethodDataSource(nameof(TestData))]
      public async Task MyTest(int value) { ... }
  }
  ```

- `InstanceMethodDataSource` is evaluated at **test discovery time**, before
  any test execution begins. If the instance depends on `IAsyncInitializer`
  for setup, that initialization has **not yet run** during discovery.
  The result is empty data and no tests being generated — no error, just
  silently missing tests.

  **Solutions in priority order:**
  1. Return pre-defined values that do not require initialization.
  2. Use `IAsyncDiscoveryInitializer` if discovery-time async initialization
     is genuinely needed.

### `TestDataRow<T>` — per-row metadata on method-sourced data

- Use `TestDataRow<T>` to attach per-case metadata (`DisplayName`, `Skip`,
  `Categories`) when the data source is a `[MethodDataSource]` and you need
  per-row customization beyond what `[Arguments]` properties provide:

  ```csharp
  public static IEnumerable<TestDataRow<(string Browser, string Version)>> BrowserData()
  {
      yield return new(("Chrome", "120"), DisplayName: "Chrome latest");
      yield return new(("Firefox", "121"), DisplayName: "Firefox latest");
      yield return new(("Safari", "17"),   DisplayName: "Safari", Skip: "Not in CI");
  }

  [Test]
  [MethodDataSource(typeof(LoginTestData), nameof(LoginTestData.BrowserData))]
  public async Task Login_Works(string browser, string version) { ... }
  ```

- Combine `TestDataRow<Func<T>>` when wrapping reference types to preserve
  both fresh-instance semantics and per-row metadata.

## Avoid

- **Do not use `new` expressions inside `[Arguments]`**. The compiler rejects
  them. Use `[MethodDataSource]` for any non-constant value.
- **Do not return instance references from `[MethodDataSource]`** for
  reference types. Use `Func<T>` so each test case starts with its own object.
- **Do not use instance methods as `[MethodDataSource]` targets in AOT builds**.
  AOT requires static methods. Use `[InstanceMethodDataSource]` if instance
  access is unavoidable, and document the discovery-phase limitation explicitly.
- **Do not perform slow or unreliable I/O in async data sources**. Any hang or
  error during discovery silently removes the affected tests from the run.
- **Do not name data-source methods `[MethodData]`** — this was an incorrect
  name used in older docs and the third-party seed skill. The correct attribute
  is `[MethodDataSource]`.

## Review checklist

- [ ] `[Arguments]` entries contain only compile-time constants.
- [ ] `[MethodDataSource]` targets are `static` methods on accessible types.
- [ ] Reference-type data sources return `Func<T>`, not bare `T`.
- [ ] `InstanceMethodDataSource` usage acknowledges the discovery-phase
      initialization limit in a comment or test-class doc.
- [ ] `TestDataRow<T>` is used when individual method-sourced cases need
      custom display names, skip reasons, or categories.
- [ ] Async data sources are lightweight; no long-running or network I/O at
      discovery time.
- [ ] Single-argument `[MethodDataSource]` is used only when the method is
      on the same class; two-argument form is used for external classes.

## Related files

- [Data — class and property sources](./data-class-property-sources.md)
- [Data — matrix, combined, and generators](./data-matrix-combined-generators.md)
- [Data map](../references/data-map.md)

## Source anchors

- [TUnit arguments (`[Arguments]`)](https://tunit.dev/docs/writing-tests/arguments)
  — Inline data, `DisplayName`, `Categories`, `Skip` properties on `[Arguments]`.
- [TUnit method data source (`[MethodDataSource]`)](https://tunit.dev/docs/writing-tests/method-data-source)
  — Static/instance sources, `Func<T>` pattern, `IEnumerable<Func<T>>`,
  async `IAsyncEnumerable`, `InstanceMethodDataSource`, discovery-phase
  initialization gotcha.
- [TestDataRow](https://tunit.dev/docs/writing-tests/test-data-row)
  — Per-row metadata wrapper for method-sourced cases.
- [Data-driven overview](https://tunit.dev/docs/writing-tests/data-driven-overview)
  — Full overview of all data-source patterns.
