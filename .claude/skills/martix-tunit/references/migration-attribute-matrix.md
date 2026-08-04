# TUnit migration attribute matrix

## Purpose

Provide a comprehensive side-by-side attribute and API equivalence table for
developers migrating tests from xUnit, NUnit, or MSTest to TUnit. This file
is a reference artifact, not a rule. The `rules/migration-comparison.md` rule
points here for the full table so the rule file stays concise. Verify every
cell against the official TUnit migration guides before citing it in a rule.

**Official sources for this matrix:**

- [xUnit migration guide](https://tunit.dev/docs/migration/xunit)
- [NUnit migration guide](https://tunit.dev/docs/migration/nunit)
- [MSTest migration guide](https://tunit.dev/docs/migration/mstest)
- [Framework differences](https://tunit.dev/docs/comparison/framework-differences)
- [Attribute comparison](https://tunit.dev/docs/comparison/attributes)

---

## Test-method and class marking

| Concept | xUnit | NUnit | MSTest | TUnit |
|---|---|---|---|---|
| Mark a test method | `[Fact]` | `[Test]` | `[TestMethod]` | `[Test]` |
| Mark a parameterized test | `[Theory]` + `[InlineData]` | `[TestCase]` | `[DataTestMethod]` + `[DataRow]` | `[Test]` + `[Arguments]` |
| Mark a test class | *(no attribute)* | `[TestFixture]` | `[TestClass]` | *(no attribute)* |

---

## Data-driven attributes

| Concept | xUnit | NUnit | MSTest | TUnit |
|---|---|---|---|---|
| Inline data | `[InlineData(...)]` | `[TestCase(...)]` | `[DataRow(...)]` | `[Arguments(...)]` |
| Method-sourced data | `[MemberData(nameof(...))]` | `[TestCaseSource(nameof(...))]` | `[DynamicData(nameof(...))]` | `[MethodDataSource(nameof(...))]` |
| Class-sourced data | `[MemberData]` on static property | `[TestCaseSource(typeof(T))]` | `[DynamicData]` | `[ClassDataSource<T>]` |
| Per-row metadata | *(custom)* | `[TestCase]` properties | `[DataRow]` + `DisplayName` | `TestDataRow<T>` |
| Matrix / Cartesian product | *(manual)* | *(manual)* | *(manual)* | `[Matrix]` (multiple `[Arguments]`) |

---

## Lifecycle and setup / teardown

| Concept | xUnit | NUnit | MSTest | TUnit |
|---|---|---|---|---|
| Per-test setup | Constructor | `[SetUp]` | `[TestInitialize]` | `[Before(Test)]` |
| Per-test teardown | `IDisposable.Dispose` | `[TearDown]` | `[TestCleanup]` | `[After(Test)]` |
| Per-class setup | `IClassFixture<T>` constructor | `[OneTimeSetUp]` | `[ClassInitialize]` | `[Before(Class)]` *(static)* |
| Per-class teardown | `IClassFixture<T>` Dispose | `[OneTimeTearDown]` | `[ClassCleanup]` | `[After(Class)]` *(static)* |
| Per-assembly setup | `ICollectionFixture<T>` | `[OneTimeSetUp]` on assembly-level fixture | `[AssemblyInitialize]` | `[Before(Assembly)]` *(static)* |
| Per-assembly teardown | `ICollectionFixture<T>` | `[OneTimeTearDown]` on assembly-level fixture | `[AssemblyCleanup]` | `[After(Assembly)]` *(static)* |
| Shared typed fixture (class scope) | `IClassFixture<T>` | `[TestFixture]` field | `[ClassInitialize]` + field | `[ClassDataSource<T>(Shared = SharedType.PerClass)]` |
| Global setup before discovery | *(none)* | *(none)* | *(none)* | `[Before(TestDiscovery)]` *(static)* |
| Global hooks across all tests | *(none)* | *(none)* | *(none)* | `[BeforeEvery(Test)]` / `[AfterEvery(Test)]` *(static)* |

> **Note:** `[Before(Class)]` and above are **static** in TUnit. `IClassFixture<T>`
> does not have a TUnit equivalent type; the closest replacement is either
> `[Before(Class)]` / `[After(Class)]` for one-time setup/teardown logic or
> `[ClassDataSource<T>(Shared = SharedType.PerClass)]` for a shared typed instance.

---

## Skip and explicit

| Concept | xUnit | NUnit | MSTest | TUnit |
|---|---|---|---|---|
| Skip a test (declarative) | `[Fact(Skip = "reason")]` | `[Ignore("reason")]` | `[Ignore]` | `[Skip("reason")]` |
| Skip a test (runtime) | `Assert.Skip()` *(xUnit 2.5+)* | `Assert.Ignore()` | *(manual throw)* | `Skip.Test(reason)` |
| On-demand only | *(none)* | `[Explicit]` | *(none)* | `[Explicit]` |

---

## Assertions

| Concept | xUnit | NUnit | MSTest | TUnit |
|---|---|---|---|---|
| Entry point | `Assert.Equal(expected, actual)` | `Assert.That(actual, Is.EqualTo(expected))` | `Assert.AreEqual(expected, actual)` | `await Assert.That(actual).IsEqualTo(expected)` |
| Assertion style | Static, synchronous | Constraint model | Static, synchronous | **Async, must be awaited** |
| Throw assertion | `Assert.Throws<T>()` | `Assert.Throws<T>()` | `Assert.ThrowsException<T>()` | `await Assert.That(action).Throws<T>()` |
| Async throw assertion | `await Assert.ThrowsAsync<T>()` | `Assert.ThrowsAsync<T>()` | `await Assert.ThrowsExceptionAsync<T>()` | `await Assert.That(async () => await action()).Throws<T>()` |
| Multiple assertions | `Assert.Multiple(...)` *(xUnit 2.8+)* | `Assert.Multiple(...)` | *(sequential)* | `await using var _ = Assert.Multiple(); await ...; await ...` |
| Combining | *(none)* | *(none)* | *(none)* | `.And` / `.Or` assertion chaining |

> **Critical:** Every TUnit assertion returns an awaitable. An **unawaited**
> `Assert.That(...)` silently passes — the test will not fail. Always `await`
> every assertion.

---

## Parallelism and execution control

| Concept | xUnit | NUnit | MSTest | TUnit |
|---|---|---|---|---|
| Default parallelism | Collection-scoped, opt-in per assembly | Configurable; default sequential per fixture | Sequential by default | **Fully parallel by default** (all tests eligible) |
| Prevent parallel | `[Collection("name")]` | `[NonParallelizable]` | *(attribute not available)* | `[NotInParallel("key")]` |
| Concurrency cap | *(none)* | `[LevelOfParallelism]` | *(none)* | `[ParallelLimiter<T>]` |
| Explicit ordering | `[TestCaseOrderer]` | `[Order(n)]` | *(none)* | `[DependsOn(nameof(...))]` |
| Retry on failure | *(none, third-party)* | `[Retry(n)]` | *(none)* | `[Retry(n)]` |
| Repeat runs | *(none)* | `[Repeat(n)]` *(n total)* | *(none)* | `[Repeat(n)]` *(n + 1 total)* |
| Per-test timeout | *(none)* | `[Timeout(ms)]` | `[Timeout(ms)]` | `[Timeout(ms)]` |
| Category / trait | `[Trait("Category", "name")]` | `[Category("name")]` | `[TestCategory("name")]` | Custom property via `TestContext` / filter expressions |

---

## Display names

| Concept | xUnit | NUnit | MSTest | TUnit |
|---|---|---|---|---|
| Custom test display name | `[Fact(DisplayName = "...")]` | `[Test("...")]` | `[TestMethod]` + `DisplayName` property | `[Test(DisplayName = "...")]` or argument formatters |

---

## Dependency injection

| Concept | xUnit | NUnit | MSTest | TUnit |
|---|---|---|---|---|
| Constructor DI | Via `IClassFixture<T>` | Via `[TestFixture]` constructor with DI framework | *(limited)* | `[ClassConstructor]` + `IServiceProvider` |
| Property injection | *(none)* | *(none)* | *(none)* | Property injection with `IAsyncInitializer` |

---

## Migration checklist

Before migrating a test project to TUnit, verify:

1. Project file: `OutputType` is `Exe`; `Microsoft.NET.Test.Sdk` is removed;
   Coverlet packages are removed; `TUnit` NuGet is added.
2. Test class attributes: `[TestFixture]` / `[TestClass]` are removed; TUnit
   requires no class attribute.
3. Test method attributes: `[Fact]` / `[Test]` / `[TestMethod]` → `[Test]`;
   parameterized data attributes updated (see data-driven table above).
4. Data attributes: `[InlineData]` → `[Arguments]`; `[MemberData]` →
   `[MethodDataSource]`; `[TestCaseSource]` → `[ClassDataSource]`.
5. Lifecycle attributes: setup/teardown methods migrated to correct `[Before]`
   / `[After]` scopes with static requirement for class and above.
6. `IClassFixture<T>` usages: replaced with `[ClassDataSource<T>(Shared = SharedType.PerClass)]`
   or `[Before(Class)]` / `[After(Class)]` as appropriate.
7. Assertions: every `Assert.That(...)` call is `await`ed; `ThrowsAsync` is
   replaced with `Throws<T>()` on an async delegate.
8. Parallelism: tests that relied on sequential execution within a class now
   use `[NotInParallel]` if ordering matters.
9. Runner: `dotnet test` CLI flags moved after `--`; `dotnet run` verified
   as the preferred execution surface.
10. IDE: Visual Studio preview feature, Rider Testing Platform setting, or
    VS Code C# Dev Kit protocol confirmed active.

## Related files

- [Migration comparison rule](../rules/migration-comparison.md)
- [Foundation map](./foundation-map.md)
- [Lifecycle map](./lifecycle-map.md)
- [Assertions map](./assertions-map.md)
- [Execution map](./execution-map.md)
- [Source index and guardrails](./doc-source-index.md)

## Source anchors

- [xUnit migration guide](https://tunit.dev/docs/migration/xunit)
  - Step-by-step xUnit to TUnit migration with attribute mapping.
- [NUnit migration guide](https://tunit.dev/docs/migration/nunit)
  - Step-by-step NUnit to TUnit migration with attribute mapping.
- [MSTest migration guide](https://tunit.dev/docs/migration/mstest)
  - Step-by-step MSTest to TUnit migration with attribute mapping.
- [Framework differences](https://tunit.dev/docs/comparison/framework-differences)
  - Feature-level comparison across xUnit, NUnit, MSTest, and TUnit.
- [Attribute comparison](https://tunit.dev/docs/comparison/attributes)
  - Official side-by-side attribute table; verify cells here before citing.
