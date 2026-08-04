# TUnit lifecycle map

## Purpose

Map the TUnit lifecycle, hooks, property injection, and dependency injection
topics covered by this workstream so rule files stay aligned with the official
docs and point agents at the right companion guidance. Lifecycle covers
`[Before]` and `[After]` hooks at every scope, `[BeforeEvery]` / `[AfterEvery]`
global hooks, hook execution order, `TestContext`, artifact attachment, property
injection, `IAsyncInitializer`, `IAsyncDiscoveryInitializer`, and constructor
DI via `[ClassConstructor]` and `IServiceProvider`.

## Rule coverage

- **Before and After hooks**
  - Rule file: `rules/lifecycle-hooks.md`
  - Primary sources:
    - [Lifecycle](https://tunit.dev/docs/writing-tests/lifecycle)
    - [Hooks](https://tunit.dev/docs/writing-tests/hooks)
    - [Test context](https://tunit.dev/docs/writing-tests/test-context)
    - [Artifacts](https://tunit.dev/docs/writing-tests/artifacts)
  - Notes: Use for the full hook scopes (`Test`, `Class`, `Assembly`,
    `TestSession`, `TestDiscovery`), the static requirement for `Class`
    and above, the instance-scope of `[Before(Test)]` / `[After(Test)]`,
    `[BeforeEvery]` / `[AfterEvery]` global hooks, execution order within
    and across scopes, multiple hook methods aggregating exceptions, and
    `TestContext` / `ClassHookContext` / `AssemblyHookContext` access.

- **Property injection and IAsyncInitializer**
  - Rule file: `rules/lifecycle-property-injection.md`
  - Primary sources:
    - [Property injection](https://tunit.dev/docs/writing-tests/property-injection)
    - [Lifecycle](https://tunit.dev/docs/writing-tests/lifecycle)
  - Notes: Use for property injection patterns, source-attribute-driven
    injection such as `[ClassDataSource<T>]`, `IAsyncInitializer` for async
    initialization before tests
    run, `IAsyncDiscoveryInitializer` for pre-discovery setup, and the
    interaction between property injection and test class construction.

- **Dependency injection**
  - Rule file: `rules/lifecycle-di.md`
  - Primary sources:
    - [Dependency injection](https://tunit.dev/docs/writing-tests/dependency-injection)
    - [Property injection](https://tunit.dev/docs/writing-tests/property-injection)
  - Notes: Use for `IServiceProvider` wiring, `[ClassConstructor]`
    attribute, DI-based test class construction, scoped service lifetime in
    test context, and how DI interacts with `[ClassDataSource]` sharing.

## Hook scope reference

| Attribute | Scope | Applies to | Static required | Context type |
|---|---|---|---|---|
| `[Before(Test)]` | Single test method | Instance method | No | `TestContext` |
| `[After(Test)]` | Single test method | Instance method | No | `TestContext` |
| `[Before(Class)]` | All tests in class | Static method | **Yes** | `ClassHookContext` |
| `[After(Class)]` | All tests in class | Static method | **Yes** | `ClassHookContext` |
| `[Before(Assembly)]` | All tests in assembly | Static method | **Yes** | `AssemblyHookContext` |
| `[After(Assembly)]` | All tests in assembly | Static method | **Yes** | `AssemblyHookContext` |
| `[Before(TestSession)]` | Entire test session | Static method | **Yes** | `TestSessionContext` |
| `[After(TestSession)]` | Entire test session | Static method | **Yes** | `TestSessionContext` |
| `[Before(TestDiscovery)]` | Before test discovery | Static method | **Yes** | `BeforeTestDiscoveryContext` |
| `[After(TestDiscovery)]` | After test discovery | Static method | **Yes** | `BeforeTestDiscoveryContext` |
| `[BeforeEvery(Test)]` | Every test (global) | Static method | **Yes** | `TestContext` |
| `[AfterEvery(Test)]` | Every test (global) | Static method | **Yes** | `TestContext` |
| `[BeforeEvery(Class)]` | Every class (global) | Static method | **Yes** | `ClassHookContext` |
| `[AfterEvery(Class)]` | Every class (global) | Static method | **Yes** | `ClassHookContext` |

## Related files

- [Lifecycle hooks rule](../rules/lifecycle-hooks.md)
- [Property injection rule](../rules/lifecycle-property-injection.md)
- [Dependency injection rule](../rules/lifecycle-di.md)
- [Data map](./data-map.md)
- [Execution map](./execution-map.md)
- [Source index and guardrails](./doc-source-index.md)

## Source anchors

- [Lifecycle](https://tunit.dev/docs/writing-tests/lifecycle)
  - Full hook execution order diagram and scope contract.
- [Hooks](https://tunit.dev/docs/writing-tests/hooks)
  - `[Before]` / `[After]` attribute contract, context types, static
    requirement for class-and-above hooks, exception aggregation.
- [Test context](https://tunit.dev/docs/writing-tests/test-context)
  - `TestContext` access patterns, metadata, execution result, and
    `TestContext.Current` static accessor.
- [Artifacts](https://tunit.dev/docs/writing-tests/artifacts)
  - Attaching output artifacts to a test run.
- [Property injection](https://tunit.dev/docs/writing-tests/property-injection)
  - Property-based DI and `IAsyncInitializer` contract.
- [Dependency injection](https://tunit.dev/docs/writing-tests/dependency-injection)
  - `IServiceProvider` wiring and `[ClassConstructor]` usage.

## Maintenance notes

- The static requirement for `[Before(Class)]` and above is a frequent
  source of compiler errors when developers migrate from xUnit `IClassFixture`.
  Keep it prominent in the hook rule and in this table.
- `[BeforeEvery]` / `[AfterEvery]` global hooks are absent from the seed
  skill entirely. Ensure they receive full treatment in `lifecycle-hooks.md`.
- `[Before(TestDiscovery)]` runs before test discovery, not before execution.
  That distinction must be stated explicitly to avoid misuse.
- Multiple `[After]` methods at the same scope all execute; exceptions from all
  of them are aggregated. Keep this in the hook rule because it changes the
  teardown error model compared to xUnit/NUnit/MSTest.
- When TUnit adds new hook scopes, add rows to the table above and update the
  lifecycle hook rule before shipping.
