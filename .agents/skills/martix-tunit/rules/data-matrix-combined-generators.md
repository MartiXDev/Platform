# TUnit data — matrix tests, combined data sources, and custom generators

## Purpose

Define the advanced data-source patterns — Cartesian-product matrix tests,
mixed-source `[CombinedDataSources]`, and custom generator attributes — so
that agents choose the right tool for cross-parameter combination scenarios
and understand the performance and discovery-time constraints each pattern
carries.

## Default guidance

### `[MatrixDataSource]` — Cartesian product over typed parameter values

- Add `[MatrixDataSource]` to the test method and `[Matrix(...)]` to each
  parameter that should contribute values. TUnit generates one test case for
  every combination:

  ```csharp
  [Test]
  [MatrixDataSource]
  public async Task MyTest(
      [Matrix(1, 2, 3)] int value1,
      [Matrix(1, 2, 3)] int value2)
  {
      await Assert.That(value1 + value2).IsPositive();
  }
  // Generates 3 × 3 = 9 test cases
  ```

- Use `[MatrixRange<T>(min, max)]` for numeric types to generate a value range
  instead of listing each value. An optional third argument sets the step
  (default step is 1):

  ```csharp
  [MatrixRange<int>(1, 10)] int value // generates 10 values: 1..10
  [MatrixRange<int>(0, 100, 10)] int value // generates 11 values: 0, 10, 20, ..., 100
  ```

- Use `[MatrixMethod<TClass>(nameof(MethodName))]` on a parameter to pull its
  value set from a method that returns `IEnumerable<T>`:

  ```csharp
  [MatrixMethod<MyTestClass>(nameof(Numbers))] int value2
  private IEnumerable<int> Numbers() { yield return 1; yield return 2; }
  ```

- Use `[MatrixExclusion(...)]` on the test method to drop specific generated
  combinations. Exclusion arguments match `[Arguments]` syntax. This keeps the
  test matrix clean without adding `if` guards inside the test body:

  ```csharp
  [Test]
  [MatrixDataSource]
  [MatrixExclusion(1, 1)]
  [MatrixExclusion(2, 2)]
  public async Task NoDiagonals(
      [MatrixRange<int>(1, 3)] int a,
      [MatrixRange<int>(1, 3)] int b) { ... }
  // Generates 3×3=9 minus 2 exclusions = 7 cases
  ```

- **Test-count growth is exponential**. Three parameters with ten values each
  produce 1 000 test cases. Two parameters of ten values each produce 100.
  Keep matrix dimensions small and focused.

### `[CombinedDataSources]` — mixed sources with Cartesian product

- Use `[CombinedDataSources]` when different parameters should be driven by
  different data-source types (`[Arguments]`, `[MethodDataSource]`,
  `[ClassDataSource]`, or custom attributes implementing `IDataSourceAttribute`).
  TUnit applies the Cartesian product across all parameters:

  ```csharp
  public static IEnumerable<string> GetStrings()
  {
      yield return "Hello";
      yield return "World";
  }

  [Test]
  [CombinedDataSources]
  public async Task MixedSources(
      [Arguments(1, 2)] int x,
      [MethodDataSource(nameof(GetStrings))] string y)
  {
      // 2 × 2 = 4 test cases
  }
  ```

- Multiple data-source attributes on the **same parameter** union their value
  sets. All combined values for that parameter are then crossed with the other
  parameters:

  ```csharp
  [CombinedDataSources]
  public async Task UnionedValues(
      [Arguments(1, 2)]
      [Arguments(3, 4)] int x,  // x can be 1, 2, 3, or 4 — union of both
      [Arguments("a")] string y)
  // (1+2+2 more) values × 1 = 4 cases
  ```

- `[CombinedDataSources]` vs `[MatrixDataSource]` — choose based on data
  source diversity:

  | Need | Recommended |
  | --- | --- |
  | All parameters driven by constant value lists | `[MatrixDataSource]` + `[Matrix]` |
  | Parameters from different source types | `[CombinedDataSources]` |
  | One parameter from a method, another inline | `[CombinedDataSources]` |
  | Simple range generation | `[MatrixDataSource]` + `[MatrixRange<T>]` |

- **All parameters must have at least one data-source attribute** under
  `[CombinedDataSources]`. A parameter without a source causes a runtime error
  at discovery time.

### Custom generator attributes

TUnit provides three base classes for custom data generators. Choose the
appropriate base:

#### `DataSourceGeneratorAttribute<T>` — typed, synchronous

- Derive from `DataSourceGeneratorAttribute<T>` and override
  `GenerateDataSources(DataGeneratorMetadata)` returning
  `IEnumerable<Func<T>>`.
- For multiple parameters, use a tuple return type such as
  `DataSourceGeneratorAttribute<T1, T2, T3>` and return `Func<(T1, T2, T3)>`.
- `GenerateDataSources` may be called multiple times (for example, when the
  attribute is used on both a class and a method creating nested loops). Always
  return `Func<T>`, not `T`, so each invocation constructs a fresh instance.

  ```csharp
  public class AutoFixtureGeneratorAttribute<T1, T2> : DataSourceGeneratorAttribute<T1, T2>
  {
      public override IEnumerable<Func<(T1, T2)>> GenerateDataSources(
          DataGeneratorMetadata metadata)
      {
          var fixture = new Fixture();
          yield return () => (fixture.Create<T1>(), fixture.Create<T2>());
      }
  }
  ```

#### `AsyncDataSourceGeneratorAttribute<T>` — async generator

- Derive from `AsyncDataSourceGeneratorAttribute<T>` and override
  `GenerateDataSources` returning `IAsyncEnumerable<Func<T>>`.
- **Discovery-time execution**: `GenerateDataSources` runs during test
  *discovery*, not execution. Any await points here delay the discovery phase
  for all tests. Keep the async work minimal and avoid network or database
  calls unless the data cannot be obtained otherwise.

  ```csharp
  public class DatabaseDataGeneratorAttribute<T> : AsyncDataSourceGeneratorAttribute<T>
      where T : class
  {
      public override async IAsyncEnumerable<Func<T>> GenerateDataSources(
          DataGeneratorMetadata metadata)
      {
          var items = await LoadFromDatabaseAsync(); // keep this lightweight
          foreach (var item in items)
              yield return () => item;
      }
  }
  ```

#### `UntypedDataSourceGeneratorAttribute` — dynamic types

- Use `UntypedDataSourceGeneratorAttribute` when the types are not known at
  compile time (for example, when integrating with AutoFixture or similar
  libraries that generate objects from `Type` references at runtime).
- Override `GenerateDataSources` returning
  `IEnumerable<Func<object?[]>>` — each `Func` returns an array of argument
  values in parameter order.

  ```csharp
  public class AutoFixtureGeneratorAttribute : UntypedDataSourceGeneratorAttribute
  {
      private readonly Type[] _types;
      public AutoFixtureGeneratorAttribute(params Type[] types) => _types = types;

      public override IEnumerable<Func<object?[]>> GenerateDataSources(
          DataGeneratorMetadata metadata)
      {
          var fixture = new Fixture();
          yield return () => _types
              .Select(t => fixture.Create(t, new SpecimenContext(fixture)))
              .ToArray();
      }
  }
  ```

- Custom generator attributes derived from any of these base classes work
  inside `[CombinedDataSources]` on individual parameters because they
  implement `IDataSourceAttribute`.

### Discovery-time gotchas across all advanced patterns

- **All data sources — including async generators — resolve at test discovery
  time**. Discovery happens before any test execution, `IAsyncInitializer`, or
  lifecycle hooks run. Data that depends on a running server, database, or any
  initialized object must use `IAsyncDiscoveryInitializer` or be rearchitected
  as static data.
- **The `Func<T>` return contract is strictly enforced** in generator base
  classes. Returning the same instance across multiple `yield` calls means
  nested-loop invocations share that instance, which can cause test isolation
  failures.
- **Exponential test count applies to both `[MatrixDataSource]` and
  `[CombinedDataSources]`**. Audit the total test count (product of all
  parameter value counts) before committing matrix-style tests to CI.

## Avoid

- **Do not use `[MatrixDataSource]` when parameters need different source
  types**. Use `[CombinedDataSources]` instead.
- **Do not perform slow or unreliable I/O in `AsyncDataSourceGeneratorAttribute`**.
  A hung `GenerateDataSources` blocks discovery; the test run may never start.
- **Do not return bare instances from `GenerateDataSources`**. Always return
  `Func<T>` so each invocation of the generator constructs fresh objects.
- **Do not leave `[CombinedDataSources]` parameters without at least one
  data-source attribute**. TUnit cannot generate test cases for parameterless
  slots and will error at discovery time.
- **Do not create unbounded or very large matrices** without explicit test-
  count justification. Exponential growth is the most common matrix misuse
  pattern; use `[MatrixExclusion]` or reduce value sets to keep the suite size
  manageable.
- **Do not implement `ITestDataSource`** — this interface name does not exist
  in current TUnit. The correct extension surface is
  `DataSourceGeneratorAttribute<T>` and its async and untyped variants.

## Review checklist

- [ ] `[MatrixDataSource]` is used only when all parameters need the same
      source type (constants or ranges); `[CombinedDataSources]` is used when
      source types differ.
- [ ] Test-case count is bounded and documented for any matrix or combined
      test.
- [ ] Custom generators return `Func<T>`, not bare `T`.
- [ ] Async generators are lightweight; no long-running work at discovery time.
- [ ] `[CombinedDataSources]` parameters all have at least one data-source
      attribute.
- [ ] `[MatrixExclusion]` is used in preference to `if` conditions inside
      matrix test bodies when specific combinations must be skipped.

## Related files

- [Data — inline and method sources](./data-inline-method-sources.md)
- [Data — class and property sources](./data-class-property-sources.md)
- [Extension points](./extending-extension-points.md)
- [Data map](../references/data-map.md)

## Source anchors

- [Matrix tests](https://tunit.dev/docs/writing-tests/matrix-tests)
  — `[MatrixDataSource]`, `[Matrix]`, `[MatrixRange<T>]`, `[MatrixMethod<T>]`,
  `[MatrixExclusion]`, and the exponential-growth warning.
- [Combined data sources](https://tunit.dev/docs/writing-tests/combined-data-source)
  — `[CombinedDataSources]`, parameter-level mixed sources, multi-attribute
  union, comparison with `[MatrixDataSource]`.
- [Data source generators](https://tunit.dev/docs/extending/data-source-generators)
  — `DataSourceGeneratorAttribute<T>`, `AsyncDataSourceGeneratorAttribute<T>`,
  `UntypedDataSourceGeneratorAttribute`, `Func<T>` requirement, discovery-time
  execution note.
- [Data-driven overview](https://tunit.dev/docs/writing-tests/data-driven-overview)
  — Canonical overview of all TUnit data-source patterns.
- [Generic attributes](https://tunit.dev/docs/writing-tests/generic-attributes)
  — Type-parameterized test attribute patterns.
