# Seed-skill harvest memo — `csharp-tunit` → `martix-tunit`

**Source reviewed:** `.github/skills/csharp-tunit/SKILL.md`
**Authority:** Official TUnit docs at `https://tunit.dev/docs` (all claims below verified
against the live site unless explicitly marked *unverified*).
**Status:** Secondary reference only. This memo records what is reusable,
what needs rewriting, and what must never be copied into `martix-tunit` rules.

---

## 1  Useful topic coverage worth preserving

These topics in the seed skill map to real TUnit capability and are worth
including in the corresponding `martix-tunit` rule domains. The seed skill
does not always phrase them accurately (see §3), but the topic itself is valid
and should appear in the rule.

| Seed-skill topic | Relevant domain | Notes |
|---|---|---|
| Separate test project, `[ProjectName].Tests` naming | Foundation | Correct convention; include in foundation rule |
| No test-class attribute required | Foundation / Test authoring | Confirmed — TUnit requires no class-level attribute |
| `[Test]` for test methods | Foundation | Correct; include as primary fact |
| AAA pattern, one behaviour per test | Test authoring | Framework-agnostic but worth reinforcing |
| `await Assert.That()` entry point | Assertions | Correct; central assertion API |
| `.And` / `.Or` chaining | Assertions | Confirmed; include in assertions-combining rule |
| `[Arguments]` for inline data | Data-driven | Correct attribute name; include in data-inline rule |
| `[Repeat(n)]`, `[Retry(n)]` | Execution control | Correct attribute names (see §3 for `[Repeat]` semantics) |
| `[Skip("reason")]` | Test authoring | Correct; also note `Skip.Test()` runtime API (not in seed) |
| `[DependsOn(nameof(OtherTest))]` | Parallel execution / ordering | Correct; include in execution rule |
| `[Timeout(milliseconds)]` | Execution control | Correct; include in execution rule |
| `[Before(Test)]` / `[After(Test)]` | Lifecycle | Correct names; include in lifecycle rule |
| `[Before(Class)]` / `[After(Class)]` | Lifecycle | Correct; note static requirement (see §3) |
| `[Before(Assembly)]` / `[After(Assembly)]` | Lifecycle | Correct |
| `[Before(TestSession)]` / `[After(TestSession)]` | Lifecycle | Mentioned but coverage is thin; needs full treatment |
| TUnit parallel by default | Parallel execution | Correct claim; crucial to lead with |
| `[NotInParallel]` | Parallel execution | Correct attribute name |
| Custom platform-attribute pattern (`[WindowsOnly]`) | Test authoring | Correct pattern; extends `SkipAttribute` |
| `TestContext` for test diagnostics | Test authoring | Correct; note `TestContext.Current` static accessor |
| xUnit → TUnit migration mapping table | Migration | Useful starting point; must be verified (see §3) |

---

## 2  Useful phrasing or routing ideas

These phrases or structural approaches from the seed skill are worth borrowing
as starting points for `martix-tunit` rule copy or routing prompts. All must be
reconciled with verified API facts before publishing.

- **"No test class attributes required"** — effective at contrasting with
  NUnit `[TestFixture]` and MSTest `[TestClass]`; leads well in the foundation
  rule.
- **"Replace `[Fact]` with `[Test]`"** — concise migration lead-in; use in the
  migration rule opener.
- **"All assertions are asynchronous and must be awaited"** — exact phrasing
  is good; make this a dedicated callout in the assertions-fundamentals rule
  because an unawaited assertion silently passes.
- **Migration table structure** (xUnit column → TUnit column) — the table
  layout itself is worth keeping; every cell must be re-verified against
  official `/migration/xunit` and `/comparison/attributes` before use.
- **"TUnit offers… advanced features not present in xUnit"** — positioning
  sentence useful for the SKILL.md overview blurb.
- **Data-driven progression: inline → method-based → class-based** — the
  conceptual ordering is correct and should drive the data-domain rule split.
- **`[DependsOn]` as an explicit coupling escape valve** — worth restating in
  the ordering rule; the seed skill identifies it as intentional rather than
  accidental.

---

## 3  Incorrect, outdated, or unsupported guidance

Every item in this section is **wrong or misleading** relative to official
TUnit docs and must not be copied into any `martix-tunit` rule unchanged.

### 3a  Wrong attribute names

| Seed-skill text | Correct name | Official source |
|---|---|---|
| `[MethodData]` | `[MethodDataSource]` | `/writing-tests/method-data-source` |
| `[ClassData]` | `[ClassDataSource]` | `/writing-tests/class-data-source` |
| `[ParallelLimit<T>]` | `[ParallelLimiter<T>]` | `/execution/parallelism` |

None of the three old names exist in current TUnit. Using them will result in
unresolved attribute errors.

### 3b  Wrong assertion API

| Seed-skill claim | Correction |
|---|---|
| `await Assert.That(asyncAction).ThrowsAsync<TException>()` | There is no `ThrowsAsync` method in TUnit. Use `await Assert.That(async () => await action()).Throws<TException>()`. The standard `Throws<T>()` accepts both sync and async delegates. |
| `await Assert.That(value).IsSameReferenceAs(expected)` | *Unverified* — not found on the assertions docs pages reviewed; needs confirmation against `/assertions/library` before use. |
| `await Assert.That(value).Matches(pattern)` | Confirmed valid for strings (`/assertions/regex-assertions`), but the seed skill does not note it is string-only. Do not apply to non-string types. |

### 3c  Wrong parallel-execution default

The seed skill states:

> _"Tests within the same class run sequentially by default."_

This is **false**. Official docs (`/execution/parallelism`, `/writing-tests/things-to-know`):

> _"TUnit runs all tests in parallel by default. … With no attributes, every
> test is eligible to run concurrently."_

There is no per-class sequential guarantee. Any test that relies on sequential
intra-class ordering must use `[NotInParallel]` with a shared constraint key.
This inversion is a high-risk gotcha — put it prominently in the parallel
execution rule.

### 3d  `[Repeat(n)]` semantics

The seed skill implies `[Repeat(n)]` runs a test n times. The official docs
clarify it runs the test **n additional times**, for a total of n + 1
invocations. Example: `[Repeat(3)]` produces 4 runs. This distinction matters
when documenting the attribute.

### 3e  `ITestDataSource` interface

The seed skill says:

> _"Create custom data sources by implementing `ITestDataSource`."_

This interface name does not appear in the current TUnit docs. The extension
surface for custom data sources is `IDataSourceGeneratorAttribute`
(see `/extending/data-source-generators`). Do not copy `ITestDataSource`
into any rule without first verifying it against the official API.

### 3f  xUnit `IClassFixture<T>` migration guidance

The seed skill states:

> _"Replace `IClassFixture<T>` with `[Before(Class)]`/`[After(Class)]`."_

This is **incomplete**. The correct TUnit equivalent for a shared class-scoped
fixture is `[ClassDataSource<T>(Shared = SharedType.PerClass)]`. The
`[Before(Class)]` / `[After(Class)]` hooks are for one-time setup/teardown
logic, not for injecting a shared typed instance into tests. Use both patterns
in the migration rule but distinguish their roles.

### 3g  Execution command guidance

The seed skill states:

> _"Use .NET SDK test commands: `dotnet test` for running tests."_

This is **misleading**. TUnit is built on `Microsoft.Testing.Platform`. The
**preferred** execution surface is `dotnet run`. `dotnet test` works but any
command-line flags must follow `--` (e.g., `dotnet test -- --report-trx`),
otherwise the runner reports unknown-switch errors. The foundation rule must
lead with `dotnet run` and treat `dotnet test` as a secondary alternative.

---

## 4  Specific corrections to verify against official docs

These items from the seed skill are plausible but were not fully confirmed
during this harvest. Each must be verified before being used in a rule.

| Seed-skill claim | Risk | Recommended check |
|---|---|---|
| `[Category("CategoryName")]` as a built-in attribute | May actually be a custom property via `TestContext` rather than a first-class attribute | `/execution/test-filters` and `/writing-tests/test-context` |
| `[DisplayName("Custom Test Name")]` | May be `[Test(DisplayName = "...")]` parameter rather than a separate attribute | `/extending/display-names` |
| `.Within(tolerance)` on DateTime and numeric comparisons | Syntax not confirmed in reviewed assertion pages | `/assertions/datetime`, `/assertions/numeric` |
| `.Or` operator on chained assertions | Confirmed at surface level; verify interaction with `Assert.Multiple()` | `/assertions/combining-assertions` |
| TUnit requires .NET 8.0 or higher | Likely correct but should be pinned to the exact minimum TFM | `/getting-started/installation` |

---

## 5  Coverage gaps — topics absent from the seed skill

These are important TUnit features that must appear in `martix-tunit` rules
but have no coverage in the seed skill. They are not incorrect; they are simply
absent and therefore cannot be seeded from this source.

- `[BeforeEvery]` / `[AfterEvery]` global hooks (must-be-static; distinct from
  `[Before]` / `[After]` scoped hooks)
- `[Before(TestDiscovery)]` / `[BeforeEvery(TestDiscovery)]` (runs before
  discovery, not before execution)
- `[ParallelGroup("key")]` attribute for phased parallel grouping
  (different from `[ParallelLimiter<T>]`)
- `Assert.Multiple()` block for collecting multiple assertion failures
- Exception assertion chaining: `.WithMessage()`, `.WithMessageContaining()`,
  `.ThrowsExactly<T>()`
- `Skip.Test(reason)` runtime API for dynamic skip inside test body or hooks
- `[Explicit]` attribute for on-demand-only test execution
- `[ClassDataSource<T>(Shared = SharedType.*)]` sharing semantics
  (`PerTestSession`, `PerClass`, `Keyed`, `None`)
- `TestDataRow<T>` wrapper for per-row metadata in data-driven tests
- Matrix tests (`/writing-tests/matrix-tests`) — Cartesian product
  parameterisation
- Property injection and constructor DI (`[ClassConstructor]`,
  `IServiceProvider`)
- `IAsyncInitializer` and `IAsyncDisposable` on data-source classes
- IDE configuration requirements (Visual Studio preview feature toggle,
  Rider Testing Platform setting, VS Code C# Dev Kit protocol setting)
- Project shape: `OutputType=Exe`, no `Microsoft.NET.Test.Sdk`, built-in
  coverage reporting, Coverlet incompatibility
- TRX / coverage flags: `--report-trx`, `--coverage` passed as app arguments

---

## 6  Scaffold-file inaccuracies to fix immediately

The `doc-source-index.md` already records the key known limitations of the
seed skill (§ "Excluded and secondary-only sources"). No other current scaffold
file was found to have copied inaccurate seed-skill content. No immediate fixes
are needed beyond what this memo documents.

If a future rule-authoring task quotes the seed skill directly, the author
must cross-check against this memo's §3 before committing.

---

## Maintenance note

This memo is a secondary artifact. It has no authority over TUnit API facts.
If official TUnit docs update and contradict anything here, update the relevant
rule; do not update this memo to match a stale claim. When the package exits
scaffold phase, this memo should remain as a point-in-time record of what the
seed skill contained and what was corrected.
