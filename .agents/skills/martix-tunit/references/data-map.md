# TUnit data map

## Purpose

Map the TUnit data-driven and parameterized test topics covered by this
workstream so rule files stay aligned with the official docs and point agents
at the right companion guidance. Data covers inline arguments, method-sourced
data, class-sourced data, `TestDataRow`, matrix tests, combined data sources,
nested data sources, generic attributes, and custom data-source generators.

## Rule coverage

- **Inline arguments and method-sourced data**
  - Rule file: `rules/data-inline-method-sources.md`
  - Primary sources:
    - [Data-driven overview](https://tunit.dev/docs/writing-tests/data-driven-overview)
    - [`[Arguments]`](https://tunit.dev/docs/writing-tests/arguments)
    - [`[MethodDataSource]`](https://tunit.dev/docs/writing-tests/method-data-source)
    - [`TestDataRow`](https://tunit.dev/docs/writing-tests/test-data-row)
  - Notes: Use for `[Arguments(...)]` inline parameterization, the
    `[MethodDataSource(nameof(...))]` pattern, static vs instance method
    data, and `TestDataRow<T>` for per-row metadata such as display name,
    categories, and skip reason.

- **Class-sourced and property-sourced data**
  - Rule file: `rules/data-class-property-sources.md`
  - Primary sources:
    - [`[ClassDataSource]`](https://tunit.dev/docs/writing-tests/class-data-source)
    - [Data-driven overview](https://tunit.dev/docs/writing-tests/data-driven-overview)
  - Notes: Use for `[ClassDataSource<T>]`, the `Shared` enum values
    (`SharedType.None`, `SharedType.PerClass`, `SharedType.PerTestSession`,
    `SharedType.Keyed`), `IAsyncInitializer` on shared data objects, and
    `IAsyncDisposable` lifecycle for class data sources.

- **Matrix tests, combined sources, and generators**
  - Rule file: `rules/data-matrix-combined-generators.md`
  - Primary sources:
    - [Matrix tests](https://tunit.dev/docs/writing-tests/matrix-tests)
    - [Combined data sources](https://tunit.dev/docs/writing-tests/combined-data-source)
    - [Nested data sources](https://tunit.dev/docs/writing-tests/nested-data-sources)
    - [Generic attributes](https://tunit.dev/docs/writing-tests/generic-attributes)
    - [Data source generators](https://tunit.dev/docs/extending/data-source-generators)
  - Notes: Use for Cartesian-product test generation via `[Matrix]`, the
    multi-source composition model of combined data sources, hierarchical
    nested parameterization, type-parameterized test data with generic
    attributes, and custom `IDataSourceGeneratorAttribute` implementations.
    The `IDataSourceGeneratorAttribute` interface is the correct extension
    point; do not reference the seed-skill term `ITestDataSource`.

## Related files

- [Inline and method-sourced data rule](../rules/data-inline-method-sources.md)
- [Class and property-sourced data rule](../rules/data-class-property-sources.md)
- [Matrix, combined, and generator data rule](../rules/data-matrix-combined-generators.md)
- [Lifecycle map](./lifecycle-map.md)
- [Mocking and extending map](./mocking-extending-map.md)
- [Source index and guardrails](./doc-source-index.md)

## Source anchors

- [Data-driven overview](https://tunit.dev/docs/writing-tests/data-driven-overview)
  - Overview of all TUnit data-source patterns; start here for routing.
- [`[Arguments]`](https://tunit.dev/docs/writing-tests/arguments)
  - Inline parameterization; correct attribute name is `[Arguments]`, not
    `[InlineData]`.
- [`[MethodDataSource]`](https://tunit.dev/docs/writing-tests/method-data-source)
  - Method-based data supply; correct name is `[MethodDataSource]`, not
    `[MethodData]`.
- [`[ClassDataSource]`](https://tunit.dev/docs/writing-tests/class-data-source)
  - Class-based data supply; correct name is `[ClassDataSource]`, not
    `[ClassData]`.
- [`TestDataRow`](https://tunit.dev/docs/writing-tests/test-data-row)
  - `TestDataRow<T>` wrapper for per-row metadata.
- [Matrix tests](https://tunit.dev/docs/writing-tests/matrix-tests)
  - Cartesian product parameterization across multiple parameters.
- [Combined data sources](https://tunit.dev/docs/writing-tests/combined-data-source)
  - Composing multiple data sources in one test.
- [Nested data sources](https://tunit.dev/docs/writing-tests/nested-data-sources)
  - Hierarchical parameterization.
- [Generic attributes](https://tunit.dev/docs/writing-tests/generic-attributes)
  - Type-parameterized test data.
- [Data source generators](https://tunit.dev/docs/extending/data-source-generators)
  - `IDataSourceGeneratorAttribute` for fully custom data supply.

## Maintenance notes

- Attribute name accuracy is critical in this domain. Always use the current
  names `[Arguments]`, `[MethodDataSource]`, and `[ClassDataSource]`. The seed
  skill used `[MethodData]` and `[ClassData]`; those names are incorrect.
- `SharedType` values for `[ClassDataSource]` change test architecture
  significantly. Keep sharing semantics in a dedicated section of the class
  data rule to avoid confusion with plain per-test instantiation.
- `IDataSourceGeneratorAttribute` lives in the Extending domain but is
  documented here because it directly expands the data-driven surface.
  Link back to the mocking-extending map when agents need the extension-points
  contract.
- When TUnit adds new data-source patterns, add entries to this map and the
  relevant rule before shipping the guidance.
