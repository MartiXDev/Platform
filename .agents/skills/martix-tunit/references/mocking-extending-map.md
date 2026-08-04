# TUnit mocking and extending map

## Purpose

Map the TUnit mocking and extensibility topics covered by this workstream so
rule files stay aligned with the official docs and point agents at the right
companion guidance. This workstream covers `TUnit.Mocks` (beta, C# 14),
third-party mock library integration, `ITestRegisteredEventReceiver`, custom
test attributes, custom data-source generators, argument formatters, dynamic
tests, logging, exception handling, and the built-in extension points.

## Rule coverage

- **TUnit.Mocks beta library**
  - Rule file: `rules/mocking-tunit-mocks.md`
  - Primary sources:
    - [Mocking overview](https://tunit.dev/docs/writing-tests/mocking/index)
    - [Mocking setup](https://tunit.dev/docs/writing-tests/mocking/setup)
    - [Mocking verification](https://tunit.dev/docs/writing-tests/mocking/verification)
    - [Argument matchers](https://tunit.dev/docs/writing-tests/mocking/argument-matchers)
    - [Advanced mocking](https://tunit.dev/docs/writing-tests/mocking/advanced)
    - [Mocking HTTP](https://tunit.dev/docs/writing-tests/mocking/http)
    - [Mocking logging](https://tunit.dev/docs/writing-tests/mocking/logging)
  - Notes: `TUnit.Mocks` is a **beta** library that requires **C# 14**.
    Gate all TUnit.Mocks guidance with explicit beta and language-version
    callouts. Use for mock setup, call verification, argument matchers,
    advanced mock scenarios, `HttpClient` mocking, and `ILogger` mocking.
    The mocking overview also covers third-party library integration
    (NSubstitute, Moq); include that for projects that cannot take the C# 14
    dependency.

- **Extension points**
  - Rule file: `rules/extending-extension-points.md`
  - Primary sources:
    - [Extension points](https://tunit.dev/docs/extending/extension-points)
    - [Event subscribing](https://tunit.dev/docs/writing-tests/event-subscribing)
    - [Data source generators](https://tunit.dev/docs/extending/data-source-generators)
    - [Argument formatters](https://tunit.dev/docs/extending/argument-formatters)
    - [Display names](https://tunit.dev/docs/extending/display-names)
    - [Logging](https://tunit.dev/docs/extending/logging)
    - [Exception handling](https://tunit.dev/docs/extending/exception-handling)
    - [Dynamic tests](https://tunit.dev/docs/extending/dynamic-tests)
    - [Built-in extensions](https://tunit.dev/docs/extending/built-in-extensions)
    - [Code coverage](https://tunit.dev/docs/extending/code-coverage)
    - [Extending with libraries](https://tunit.dev/docs/extending/libraries)
  - Notes: Use for `ITestRegisteredEventReceiver`, custom test attributes,
    `IDataSourceGeneratorAttribute` (custom data generation), argument
    formatter implementations for custom display names, dynamic test
    registration, built-in extension points, and packaging extension logic
    as a NuGet library.

## TUnit.Mocks status

| Dimension | Detail |
|---|---|
| Package | `TUnit.Mocks` |
| Status | **Beta** |
| Minimum language version | **C# 14** |
| Minimum .NET version | .NET 10+ (required for C# 14) |
| Stability | API may change between preview releases |
| Alternative for stable projects | Use NSubstitute or Moq with standard TUnit tests |

## Extension point quick-reference

| Extension interface / attribute | Purpose |
|---|---|
| `ITestRegisteredEventReceiver` | Hook into test registration events before the run starts |
| Custom attribute (inherits `TUnitAttribute`) | Extend test metadata and lifecycle behavior |
| `IDataSourceGeneratorAttribute` | Custom data-source generation for parameterized tests |
| Argument formatter | Custom `ToString` display logic for test parameter display names |
| Dynamic test registration | Register tests discovered or generated at runtime |
| `IExtension` (built-in hooks) | Plug into built-in extension seams |

## Related files

- [TUnit.Mocks rule](../rules/mocking-tunit-mocks.md)
- [Extension points rule](../rules/extending-extension-points.md)
- [Data map](./data-map.md)
- [Lifecycle map](./lifecycle-map.md)
- [Source index and guardrails](./doc-source-index.md)

## Source anchors

- [Mocking overview](https://tunit.dev/docs/writing-tests/mocking/index)
  - Entry point for all mocking guidance; covers both `TUnit.Mocks` and
    third-party libraries.
- [Mocking setup](https://tunit.dev/docs/writing-tests/mocking/setup)
  - Mock object creation and behavior setup with `TUnit.Mocks`.
- [Mocking verification](https://tunit.dev/docs/writing-tests/mocking/verification)
  - Call-count and interaction verification API.
- [Argument matchers](https://tunit.dev/docs/writing-tests/mocking/argument-matchers)
  - Flexible argument matching in mock setup and verification.
- [Advanced mocking](https://tunit.dev/docs/writing-tests/mocking/advanced)
  - Callback sequences, partial mocks, and edge cases.
- [Mocking HTTP](https://tunit.dev/docs/writing-tests/mocking/http)
  - `HttpClient` request/response mocking patterns.
- [Mocking logging](https://tunit.dev/docs/writing-tests/mocking/logging)
  - `ILogger` mock setup and log verification.
- [Extension points](https://tunit.dev/docs/extending/extension-points)
  - Stable seams for extending TUnit behavior.
- [Event subscribing](https://tunit.dev/docs/writing-tests/event-subscribing)
  - `ITestRegisteredEventReceiver` and related interfaces.
- [Data source generators](https://tunit.dev/docs/extending/data-source-generators)
  - `IDataSourceGeneratorAttribute` for fully custom data supply.
- [Dynamic tests](https://tunit.dev/docs/extending/dynamic-tests)
  - Runtime test registration and discovery.
- [Built-in extensions](https://tunit.dev/docs/extending/built-in-extensions)
  - Shipped extension points and their contracts.
- [Extending with libraries](https://tunit.dev/docs/extending/libraries)
  - Packaging TUnit extensions as publishable NuGet libraries.

## Maintenance notes

- All `TUnit.Mocks` guidance must lead with the beta and C# 14 callouts.
  Do not recommend it for projects that cannot adopt C# 14 or .NET 10+.
- `IDataSourceGeneratorAttribute` appears in both this workstream and the
  data workstream. The data rules cover its usage patterns; the extension
  rules cover its implementation contract. Keep cross-links current.
- `TUnit.Mocks` API surface is subject to change. When verifying guidance,
  confirm against the current version documented at `tunit.dev`. Annotate
  the rule with the TUnit version range it was verified against.
- When `TUnit.Mocks` graduates from beta, update the status table above and
  remove the beta gate from the mocking rule.
