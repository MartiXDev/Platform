# TUnit migration and framework comparison

## Purpose

Prevent high-risk cargo-culting of xUnit, NUnit, or MSTest assumptions when
writing or reviewing TUnit tests. The behavioral differences below are the ones
most likely to produce silent failures or confusing results after a mechanical
attribute substitution.

## Default guidance

### Run the automated code fixers first

TUnit ships Roslyn analyzers and code fixers for each source framework:

| Source | Diagnostic | Command |
| --- | --- | --- |
| xUnit | `TUXU0001` | `dotnet format analyzers --severity info --diagnostics TUXU0001` |
| NUnit | `TUNU0001` | `dotnet format analyzers --severity info --diagnostics TUNU0001` |
| MSTest | *(check release notes)* | same pattern with the MSTest diagnostic ID |

The fixer automates roughly **80–90 %** of a typical test suite. Run it on a
clean commit so you can diff and review every change. Add the TUnit packages
temporarily alongside the old framework, run the fixer, then remove the old
package. See the per-framework migration guide links in **Source anchors** for
the step-by-step sequence.

### High-risk behavioral differences — do not assume old behavior

These are the differences that survive a mechanical attribute substitution but
break silently or produce wrong results:

**1. All assertions must be awaited.**
`await Assert.That(value).IsEqualTo(expected)` — an unawaited assertion call
silently passes. This is the most common cause of tests that "pass" after
migration but cover nothing. Every assertion line needs `await`.

**2. Tests run in parallel by default.**
TUnit is parallel-first. There is no sequential-by-default guarantee, not even
within the same class. If tests share mutable state through fields, they will
race. Use `[NotInParallel("key")]` or `static` shared state with explicit
synchronization. Do not assume NUnit's single-instance-per-class sequential
default or xUnit's collection-isolation default.

**3. A new class instance is created per test.**
TUnit always constructs a fresh test class for each test method. You cannot
rely on field state set during an earlier test persisting into a later one. To
share a typed instance across tests in the same class, use
`[ClassDataSource<T>(Shared = SharedType.PerClass)]`.

**4. `Microsoft.NET.Test.Sdk` breaks discovery.**
TUnit uses `Microsoft.Testing.Platform`. Do not add `Microsoft.NET.Test.Sdk`
to a TUnit project — it conflicts with the TUnit runner and breaks test
discovery. Remove it if it was copied from the old project file.

**5. Coverlet is incompatible.**
TUnit bundles its own code coverage support (`--coverage`). Do not add Coverlet
packages. They conflict with the TUnit runner.

**6. `dotnet run` is the primary execution surface.**
TUnit test projects have `<OutputType>Exe</OutputType>`. The preferred way to
run them is `dotnet run`. `dotnet test` works but extra command-line flags must
follow `--` (e.g., `dotnet test -- --report-trx`) or the runner reports
unknown-switch errors. Do not document `dotnet test` as the only option.

**7. `[Before(Class)]` and higher scopes must be static.**
`[Before(Test)]` and `[After(Test)]` are instance methods. `[Before(Class)]`,
`[After(Class)]`, `[Before(Assembly)]`, `[After(Assembly)]`,
`[Before(TestSession)]`, `[After(TestSession)]`, `[Before(TestDiscovery)]`,
and all `[BeforeEvery]` / `[AfterEvery]` variants must be static. NUnit's
`[OneTimeSetUp]` is instance-scoped in NUnit but must become a static method in
TUnit.

**8. Multiple `[After]` hooks all run and aggregate exceptions.**
In TUnit, every `[After(Test)]` method on the class (and its base classes) is
guaranteed to run even if earlier ones throw. Exceptions are aggregated. Do not
assume the first exception short-circuits cleanup.

**9. `IClassFixture<T>` has no direct equivalent.**
The correct replacement is `[ClassDataSource<T>(Shared = SharedType.PerClass)]`
on the class. `[Before(Class)]` / `[After(Class)]` handle one-time
setup/teardown logic; they do not inject a typed fixture instance into tests.
Do not conflate the two.

**10. Filter syntax is TUnit tree-node syntax, not VSTest syntax.**
Use `--treenode-filter` with TUnit filter expressions. VSTest `--filter`
category or trait filters do not apply.

### What requires manual migration

The code fixer does not handle:

- `IClassFixture<T>` and `ICollectionFixture<T>` / `[Collection("name")]`
  — convert to `[ClassDataSource<T>(Shared = ...)]`.
- `IAsyncLifetime` — split into `[Before(Test)]` and `[After(Test)]` methods.
- `ITestOutputHelper` (xUnit) — inject `TestContext` as a method parameter
  instead, or use `TestContext.Current`.
- `TestContext.CurrentContext` (NUnit static) — inject `TestContext` as a
  method parameter.
- Custom `MemberData` return types — convert `IEnumerable<object[]>` to
  `IEnumerable<(T1, T2, ...)>` tuples.
- `[SetUpFixture]` with namespace-scoped setup — convert to
  `[Before(Assembly)]` on a static method.

### Attribute equivalence at a glance

The table below shows the most critical one-liners. For the full attribute
matrix including NUnit and MSTest columns, see the reference artifact.

| xUnit | NUnit | TUnit |
| --- | --- | --- |
| `[Fact]` | `[Test]` | `[Test]` |
| `[Theory]` + `[InlineData]` | `[TestCase]` | `[Test]` + `[Arguments]` |
| `[MemberData]` | `[TestCaseSource]` | `[MethodDataSource]` |
| `[Trait]` | `[Category]` | `[Property]` |
| `IClassFixture<T>` | `[TestFixture]` base-class pattern | `[ClassDataSource<T>(Shared = SharedType.PerClass)]` |
| Constructor / `IDisposable` | `[SetUp]` / `[TearDown]` | `[Before(Test)]` / `[After(Test)]` |
| `IAsyncLifetime` | `[SetUp]` async | `[Before(Test)]` / `[After(Test)]` |
| Assembly-level wiring | `[SetUpFixture]` | `[Before(Assembly)]` static |
| `Assert.Equal(expected, actual)` | `Assert.AreEqual(expected, actual)` | `await Assert.That(actual).IsEqualTo(expected)` |
| `Assert.Throws<T>()` | `Assert.Throws<T>()` | `await Assert.That(() => ...).Throws<T>()` or `await Assert.That(async () => await ...).Throws<T>()` |

For the complete xUnit, NUnit, and MSTest mapping, see:
[`references/migration-attribute-matrix.md`](../references/migration-attribute-matrix.md)

## Avoid

- Do not skip the `await` on assertion calls; silently passing tests are worse
  than failing ones.
- Do not add `Microsoft.NET.Test.Sdk` or Coverlet packages to a TUnit project.
- Do not assume sequential execution inside a class without `[NotInParallel]`.
- Do not use NUnit-style `[OneTimeSetUp]` as an instance method; make it
  `static` and rename it to `[Before(Class)]`.
- Do not replace `IClassFixture<T>` with only `[Before(Class)]` / `[After(Class)]`
  hooks and expect the fixture instance to be available in test methods; use
  `[ClassDataSource<T>(Shared = SharedType.PerClass)]` for instance injection.
- Do not run the code fixer on an uncommitted working tree; the fixer modifies
  files in place and you need a diff to review its output.
- Do not export xUnit or NUnit migration guidance from this skill as if it
  applied to TUnit. xUnit's `IClassFixture`, NUnit's `TestContext.CurrentContext`,
  and MSTest's `TestInitialize` are source-framework concepts; apply their TUnit
  equivalents only.
- Do not bloat this file with a full attribute equivalence table; that belongs in
  `references/migration-attribute-matrix.md`.

## Review checklist

- [ ] `Microsoft.NET.Test.Sdk` and Coverlet packages have been removed from the project file.
- [ ] `<OutputType>Exe</OutputType>` is present in the test project.
- [ ] Every assertion call starts with `await`.
- [ ] Tests that share mutable state are protected with `[NotInParallel]` or use `static` fields.
- [ ] `IClassFixture<T>` replacements use `[ClassDataSource<T>(Shared = SharedType.PerClass)]`, not just lifecycle hooks.
- [ ] Class-level and above hooks (`[Before(Class)]`, `[After(Class)]`, etc.) are `static`.
- [ ] The code fixer was run on a committed baseline and the diff was reviewed.
- [ ] Manual migration items (fixtures, async lifetime, output helpers, filter expressions) are addressed explicitly.

## Related files

- [Foundation and installation rule](./foundation-installation-project.md)
- [Lifecycle hooks rule](./lifecycle-hooks.md)
- [Assertions fundamentals rule](./assertions-fundamentals.md)
- [Execution parallelism rule](./execution-parallelism.md)
- [Migration attribute matrix reference](../references/migration-attribute-matrix.md)

## Source anchors

- [TUnit migration from xUnit](https://tunit.dev/docs/migration/xunit)
- [TUnit migration from NUnit](https://tunit.dev/docs/migration/nunit)
- [TUnit migration from MSTest](https://tunit.dev/docs/migration/mstest)
- [Framework differences comparison](https://tunit.dev/docs/comparison/framework-differences)
- [Attribute comparison reference](https://tunit.dev/docs/comparison/attributes)
- [Things to know — TUnit](https://tunit.dev/docs/writing-tests/things-to-know)
