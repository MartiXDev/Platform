---
description: 'Long-form companion guide for the martix-tunit standalone skill package'
---

# MartiX TUnit companion

- This file is the long-form companion to [SKILL.md](./SKILL.md).
- The package follows a layered, standalone-first split: `SKILL.md` routes
  activation, `AGENTS.md` explains how to apply the library, `rules\*.md`
  holds atomic guidance, `references\*.md` maps guidance to approved TUnit
  sources, and `templates\*.md` plus `assets\*.json` keep the package
  maintainable.
- Start with the closest bundled workstream map and expand to cross-workstream
  routes when the scenario spans multiple domains.

## Package inventory

| Layer | Purpose | Key files |
| --- | --- | --- |
| Discovery | Quick activation and workstream routing | [SKILL.md](./SKILL.md) |
| Companion | Cross-workstream guidance, review routes, and maintainer notes | [AGENTS.md](./AGENTS.md) |
| Rules | 15 atomic TUnit decision guides across 7 domains | [Rule section contract](./rules/_sections.md) |
| References | 10 reference files (domain maps, attribute matrix, cookbook, seed-skill harvest memo) | [Foundation map](./references/foundation-map.md) |
| Templates | Authoring, research, and comparison scaffolds | [Rule template](./templates/rule-template.md) |
| Assets | Preferred taxonomy and ordering data | [taxonomy.json](./assets/taxonomy.json) and [section-order.json](./assets/section-order.json) |
| Metadata | Package identity, inventory, and distribution intent | [metadata.json](./metadata.json) |

## Working stance

- Keep this package TUnit-specific. General .NET testing patterns, or
  xUnit/NUnit/MSTest guidance belongs in a sibling skill unless TUnit docs
  introduce framework-specific behavior that requires comparison here.
- Prefer documented TUnit defaults before custom wrappers: `[Test]` methods,
  `[Arguments]` data-source attributes, `[Before]`/`[After]` lifecycle hooks,
  `await Assert.That(...)` chains, and structured DI wiring.
- Keep project setup, test authoring, data-driven patterns, lifecycle,
  parallelism, assertions, DI, extensibility, and migration aligned instead of
  treating them as separate cleanup passes.
- Keep review notes concrete at test class, test method, attribute, hook,
  assertion, and runner level.

### Boundary handoffs

- Hand off to `martix-dotnet-csharp` when the request is primarily broad .NET,
  C# language, or runtime guidance that is not specific to TUnit behavior.
- Hand off to `martix-fastendpoints` when the request is mainly endpoint design,
  contracts, or ASP.NET runtime pipeline work rather than test-framework choices.
- Hand off to `martix-powershell` when the request is script automation that
  does not change TUnit runner, assertion, lifecycle, or data-source decisions.

### Critical TUnit facts — front-load in every review

- **Unawaited assertions silently pass.** Every assertion chain must be
  `await`ed. An un-awaited `Assert.That(...)` compiles and runs without
  failing the test.
- **`dotnet run` is the canonical execution surface.** TUnit uses
  `Microsoft.Testing.Platform`; `dotnet test` works but routes through a
  compatibility shim.
- **`Microsoft.NET.Test.Sdk` breaks discovery.** Do not add this package to
  a TUnit test project.
- **Coverlet packages are incompatible.** Use TUnit's bundled code-coverage
  support instead.
- **New class instance per test.** TUnit creates a new instance of the test
  class for each test method, matching xUnit's default, not NUnit's.
- **Parallel execution is the default.** Tests run in parallel unless
  explicitly constrained with `[NotInParallel]` or `[ParallelLimiter<T>]`.
- **`[Before(Class)]` and higher scopes are static.** Only `[Before(Test)]`
  and `[After(Test)]` are instance-scoped.
- **Multiple `[After]` hooks all run.** Exceptions are aggregated, not
  short-circuited.
- **Filter syntax is TUnit tree-node syntax.** It is not VSTest `/TestCaseFilter`
  syntax.
- **IDE configuration is required** in VS, Rider, and VS Code to discover
  and run TUnit tests.
- **`TUnit.Mocks` is beta and requires C# 14.** Gate all mocking rule usage
  on this constraint.

## Workstream playbook

### Foundation and project setup

- Open this workstream before changing package references, runner
  configuration, project layout, source generator wiring, or .NET SDK
  targeting for TUnit test projects.
- Start with
  [TUnit foundation — installation and project shape](./rules/foundation-installation-project.md).
- Pair with the [TUnit foundation map](./references/foundation-map.md) when
  CLI flags, environment variables, test configuration files, or engine mode
  options drive the change.
- Review questions:
  - Is the test project using `<OutputType>Exe</OutputType>` and targeting
    .NET 8 or higher?
  - Is `Microsoft.NET.Test.Sdk` absent from the project references?
  - Is the source generator enabled for fast test discovery?
  - Are runner configuration options declared in `testconfig.json` or via
    the correct CLI flags rather than in project properties?
  - Is the IDE configured (VS Test Explorer, Rider, or VS Code) to discover
    TUnit tests?

### Data-driven and parameterized tests

- Open this workstream for parameterized test design, data-source attribute
  selection, inline versus method-backed versus class-backed data, and
  matrix or combined explosion patterns.
- Start with
  [TUnit data — inline arguments and method data sources](./rules/data-inline-method-sources.md),
  then add
  [TUnit data — class data sources, sharing, and nested sources](./rules/data-class-property-sources.md)
  when data is complex, reused across tests, or class-backed.
  Add
  [TUnit data — matrix tests, combined data sources, and custom generators](./rules/data-matrix-combined-generators.md)
  only when matrix explosion or custom `IDataSourceGeneratorAttribute` is needed.
- Pair with the [TUnit data map](./references/data-map.md) when the right
  data-source pattern is still unclear.
- Review questions:
  - Is `[Arguments]` the right choice for simple inline cases?
  - Are method- or class-backed sources used when data is complex or shared
    across multiple test classes?
  - Does a `TestDataRow` wrapper add useful per-row metadata, or is it
    overhead for the scenario?
  - Does the matrix pattern fit the combinatorial surface being tested, or
    does it generate an unexpectedly large test count?

### Lifecycle, hooks, and dependency injection

- Open this workstream for setup and teardown hook selection, hook scope,
  shared context initialization, property injection, `IAsyncInitializer`,
  and DI construction patterns.
- Start with
  [TUnit lifecycle hooks](./rules/lifecycle-hooks.md),
  then add
  [TUnit property injection and initialization](./rules/lifecycle-property-injection.md)
  for property-level initialization patterns, and
  [TUnit dependency injection construction](./rules/lifecycle-di.md)
  for constructor-level `IServiceProvider` or `[ClassConstructor]` wiring.
- Pair with the [TUnit lifecycle map](./references/lifecycle-map.md) when
  hook scope, execution order, or `IAsyncDiscoveryInitializer` behavior
  drives the change.
- Review questions:
  - Are hooks scoped to the smallest durable level (Test before Class before
    Assembly before TestSession before TestDiscovery)?
  - Are `[Before(Class)]` and higher-scope hooks declared as `static`?
  - Are multiple `[After]` hooks intentional, and are their aggregate
    exceptions handled?
  - Is `IAsyncInitializer` used only when async test-class construction is
    genuinely needed?
  - Are service lifetimes aligned with the hook scope they live in?

### Assertions

- Open this workstream for `Assert.That` usage, async assertion chains,
  collection assertions, exception and delegate assertions, `Assert.Multiple`,
  member assertions, custom assertion messages, and assertion extensibility.
- Start with
  [TUnit assertion fundamentals](./rules/assertions-fundamentals.md)
  to establish the async model and the unawaited-assertion pitfall.
  Add
  [TUnit value, collection, and async assertions](./rules/assertions-value-collection-async.md)
  for the full value assertion surface, and
  [TUnit combining and custom assertions](./rules/assertions-combining-custom.md)
  for chaining, `Assert.Multiple`, or custom extension authoring.
- Pair with the [TUnit assertions map](./references/assertions-map.md) when
  the right assertion API is still unclear or when exception assertion syntax
  is in question.
- Review questions:
  - Are all `Assert.That(...)` calls `await`ed? Look for un-awaited chains.
  - Are exception assertions using the correct TUnit `Throws` pattern rather
    than a try/catch?
  - Are `.And` chains used to combine conditions rather than separate
    assertions that all execute independently?
  - Are `Assert.Multiple` boundaries explicit and bounded to a single test
    scenario?
  - Are custom assertion extension methods returning the correct awaitable
    type?

### Parallel execution and execution control

- Open this workstream for `[ParallelLimiter<T>]`, `[NotInParallel]`,
  `[DependsOn]`, test ordering, retries, repeats, timeouts, test filters,
  skip/explicit behavior, CI/CD reporting, and engine mode decisions.
- Start with
  [TUnit parallel execution](./rules/execution-parallelism.md)
  to understand the default parallel model before adding any ordering or
  constraint attributes.
  Add
  [TUnit execution control](./rules/execution-control.md)
  for retries, repeats, timeouts, filters, skip, and CI configuration.
- Pair with the [TUnit execution map](./references/execution-map.md) when
  parallel limits, dependency chains, or reporting formats drive the change.
- Review questions:
  - Are tests that share mutable state explicitly marked `[NotInParallel]`?
  - Are `[DependsOn]` relationships accurate, minimal, and not hiding test
    design problems?
  - Does the `[ParallelLimiter<T>]` marker reflect actual resource constraints?
  - Are filter expressions using TUnit tree-node syntax, not VSTest syntax?
  - Are retry and repeat attributes applied at the right scope and with
    appropriate limits?

### Mocking and extensibility

- Open this workstream for `TUnit.Mocks` setup and verification, argument
  matchers, custom `[Test]`-derived attributes, `ITestRegisteredEventReceiver`,
  custom data source generators, argument formatters, dynamic tests, and
  built-in extension point authoring.
- Start with
  [TUnit.Mocks — source-generated mocking](./rules/mocking-tunit-mocks.md)
  for mock creation and verification. Note the C# 14 and beta constraints
  before recommending this library.
  Add
  [TUnit extension points](./rules/extending-extension-points.md)
  for custom attributes and runtime extension authoring.
- Pair with the
  [TUnit mocking and extending map](./references/mocking-extending-map.md)
  when deciding which extension seam to use.
- Review questions:
  - Is `TUnit.Mocks` a deliberate choice and is the project on C# 14+?
  - Is the mock's `Setup` and `Verify` surface appropriate for the scenario,
    or is a stub or fake simpler?
  - Does the custom attribute derive from the correct TUnit base?
  - Is the extension point bounded to a specific cross-cutting concern?
  - Are dynamic tests used sparingly and only when static discovery is
    genuinely insufficient?

### Migration and framework comparison

- Open this workstream when migrating existing xUnit, NUnit, or MSTest tests
  to TUnit, or when onboarding a team that is familiar with those frameworks.
- Start with
  [TUnit migration and framework comparison](./rules/migration-comparison.md)
  for the behavioral-difference narrative and step-by-step migration guidance.
  Add the
  [TUnit migration attribute matrix](./references/migration-attribute-matrix.md)
  for the full attribute and API equivalence table.
- Review questions:
  - Are xUnit, NUnit, or MSTest attributes fully replaced with TUnit
    equivalents? Check the attribute matrix for the full surface.
  - Is `Assert.Throws<T>(...)` (sync) replaced with the correct TUnit async
    assertion pattern?
  - Are `IClassFixture<T>` or `[SetUpFixture]` lifetime patterns replaced
    with the appropriate `[Before(Class)]`/`[Before(Assembly)]` hooks?
  - Is the test project's `OutputType` set to `Exe` and `Microsoft.NET.Test.Sdk`
    removed?
  - Are discovery and execution verified with `dotnet run` after migration?

### Common review routes

| Scenario | Start with | Then add |
| --- | --- | --- |
| New TUnit test project | [TUnit foundation — installation and project shape](./rules/foundation-installation-project.md) | [TUnit data — inline arguments and method data sources](./rules/data-inline-method-sources.md), [TUnit lifecycle hooks](./rules/lifecycle-hooks.md) |
| Parameterized test design | [TUnit data — inline arguments and method data sources](./rules/data-inline-method-sources.md) | [TUnit data — class data sources, sharing, and nested sources](./rules/data-class-property-sources.md), [TUnit data map](./references/data-map.md) |
| Lifecycle or shared context design | [TUnit lifecycle hooks](./rules/lifecycle-hooks.md) | [TUnit property injection and initialization](./rules/lifecycle-property-injection.md), [TUnit parallel execution](./rules/execution-parallelism.md) |
| Assertion coverage review | [TUnit assertion fundamentals](./rules/assertions-fundamentals.md) | [TUnit value, collection, and async assertions](./rules/assertions-value-collection-async.md), [TUnit combining and custom assertions](./rules/assertions-combining-custom.md) |
| DI wiring in tests | [TUnit dependency injection construction](./rules/lifecycle-di.md) | [TUnit lifecycle hooks](./rules/lifecycle-hooks.md), [TUnit property injection and initialization](./rules/lifecycle-property-injection.md) |
| Parallel execution or test ordering | [TUnit parallel execution](./rules/execution-parallelism.md) | [TUnit execution control](./rules/execution-control.md), [TUnit execution map](./references/execution-map.md) |
| Migrating from xUnit/NUnit/MSTest | [TUnit migration and framework comparison](./rules/migration-comparison.md) | [TUnit migration attribute matrix](./references/migration-attribute-matrix.md), [TUnit foundation — installation and project shape](./rules/foundation-installation-project.md) |
| Custom attribute or extension authoring | [TUnit extension points](./rules/extending-extension-points.md) | [TUnit mocking and extending map](./references/mocking-extending-map.md) |
| TUnit.Mocks usage | [TUnit.Mocks — source-generated mocking](./rules/mocking-tunit-mocks.md) | [TUnit mocking and extending map](./references/mocking-extending-map.md) |
| Advanced integration scenarios | [TUnit cookbook index](./references/cookbook-index.md) | [TUnit foundation map](./references/foundation-map.md) |

### Reference map index

- [TUnit foundation map](./references/foundation-map.md)
- [TUnit data map](./references/data-map.md)
- [TUnit lifecycle map](./references/lifecycle-map.md)
- [TUnit assertions map](./references/assertions-map.md)
- [TUnit execution map](./references/execution-map.md)
- [TUnit mocking and extending map](./references/mocking-extending-map.md)
- [TUnit migration attribute matrix](./references/migration-attribute-matrix.md)
- [TUnit cookbook index](./references/cookbook-index.md)
- [Source index and guardrails](./references/doc-source-index.md)

### Official core docs

- Foundation:
  - [Intro and overview](https://tunit.dev/docs/intro)
  - [Installation](https://tunit.dev/docs/getting-started/installation)
  - [Writing your first test](https://tunit.dev/docs/getting-started/writing-your-first-test)
  - [Running tests](https://tunit.dev/docs/getting-started/running-your-tests)
  - [Things to know](https://tunit.dev/docs/writing-tests/things-to-know)
  - [Test filters](https://tunit.dev/docs/execution/test-filters)
  - [CLI flags](https://tunit.dev/docs/reference/command-line-flags)
  - [Engine modes](https://tunit.dev/docs/execution/engine-modes)
- Data-driven tests:
  - [Data-driven overview](https://tunit.dev/docs/writing-tests/data-driven-overview)
  - [`[Arguments]`](https://tunit.dev/docs/writing-tests/arguments)
  - [`[MethodDataSource]`](https://tunit.dev/docs/writing-tests/method-data-source)
  - [`[ClassDataSource]`](https://tunit.dev/docs/writing-tests/class-data-source)
  - [TestDataRow](https://tunit.dev/docs/writing-tests/test-data-row)
  - [Matrix tests](https://tunit.dev/docs/writing-tests/matrix-tests)
  - [Combined data sources](https://tunit.dev/docs/writing-tests/combined-data-source)
- Lifecycle and DI:
  - [Lifecycle](https://tunit.dev/docs/writing-tests/lifecycle)
  - [Hooks](https://tunit.dev/docs/writing-tests/hooks)
  - [Property injection](https://tunit.dev/docs/writing-tests/property-injection)
  - [Dependency injection](https://tunit.dev/docs/writing-tests/dependency-injection)
- Assertions:
  - [Getting started](https://tunit.dev/docs/assertions/getting-started)
  - [Awaiting](https://tunit.dev/docs/assertions/awaiting)
  - [Combining assertions](https://tunit.dev/docs/assertions/combining-assertions)
  - [Custom assertions](https://tunit.dev/docs/assertions/extensibility/custom-assertions)
- Execution:
  - [Parallelism](https://tunit.dev/docs/execution/parallelism)
  - [Timeouts](https://tunit.dev/docs/execution/timeouts)
  - [Retrying](https://tunit.dev/docs/execution/retrying)
  - [CI/CD reporting](https://tunit.dev/docs/execution/ci-cd-reporting)
- Mocking and extending:
  - [Mocking overview](https://tunit.dev/docs/writing-tests/mocking/index)
  - [Extension points](https://tunit.dev/docs/extending/extension-points)
  - [Data source generators](https://tunit.dev/docs/extending/data-source-generators)
- Migration:
  - [From xUnit](https://tunit.dev/docs/migration/xunit)
  - [From NUnit](https://tunit.dev/docs/migration/nunit)
  - [From MSTest](https://tunit.dev/docs/migration/mstest)
  - [Framework differences](https://tunit.dev/docs/comparison/framework-differences)
  - [Attribute comparison](https://tunit.dev/docs/comparison/attributes)

## Maintenance and package growth

### Authoring contract

- Keep every rule aligned with [rules/_sections.md](./rules/_sections.md).
- Use [the rule template](./templates/rule-template.md) when adding or
  revising rule files.
- Keep new guidance small, decision-oriented, and cross-linked instead of
  turning one rule into a tutorial dump.
- When adding rules, update `metadata.json` (`artifacts.ruleCount`,
  `artifacts.rules`, the relevant domain's `ruleCount` and `rules` array,
  and `ordering.recommendedRuleOrder`).

### Research and comparison

- Use [the research pack template](./templates/research-pack-template.md)
  when a future expansion needs a scoped source inventory before new rules
  are added.
- Use
  [the comparison matrix template](./templates/comparison-matrix-template.md)
  when comparing this package with external TUnit, xUnit, NUnit, or MSTest
  skills.
- Treat [metadata.json](./metadata.json) as the registration-ready inventory
  and distribution contract for future package growth.

### Standalone packaging note

- This package is the canonical standalone skill under `skills`.
- If you document or install it directly, use `npx skills add <source>`.
- A future direct marketplace registration should point to
  `skills/martix-tunit` rather than duplicating the package elsewhere.

### Source boundaries

- Approved first-pass guidance comes from the official TUnit documentation
  (`https://tunit.dev/docs`) and the approved source inventory in
  [references/doc-source-index.md](./references/doc-source-index.md).
- Do not widen this package into generic xUnit, NUnit, or MSTest guidance
  unless a rule explicitly annotates the cross-link and the guidance is
  stable across TUnit versions.
- Keep TUnit version-specific behavior clearly marked in each rule's
  `Source anchors` section.
- The `.github/skills/csharp-tunit/SKILL.md` seed has known inaccuracies
  documented in [references/doc-source-index.md](./references/doc-source-index.md).
  Do not cite it as an authority; always verify against the official docs.
