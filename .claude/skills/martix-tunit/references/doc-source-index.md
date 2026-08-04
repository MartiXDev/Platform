## Source index and guardrails

### Purpose

This index locks the approved documentation sources for the `martix-tunit`
standalone skill library and records which source families are intentionally
excluded from rule authoring. Consult this file before writing or revising any
rule, reference map, or research memo in this package.

Every claim in a rule must trace to an approved source listed here. If a source
you need is absent, add it to this file and document the reason before using it.

---

### Source priority

When sources conflict, the following precedence applies. Higher-numbered
positions lose to lower-numbered ones.

1. **Official TUnit documentation** — `https://tunit.dev/docs` and all pages
   under it. This is the canonical, version-tracked record of how TUnit
   behaves. It wins over all other sources unconditionally.
1. **`thomhurst/TUnit` GitHub repository docs tree** — the raw Markdown files
   under `docs/docs/` in the upstream repository. Use as a supplement when a
   tunit.dev page is ambiguous or absent; never use in preference to the
   published site.
1. **Approved local scaffold artifacts** — the package files listed in the
   [Approved local artifacts](#approved-local-artifacts) section below. These
   drive structural decisions (domains, section contract, ordering) but carry
   no authority over TUnit API semantics.
1. **`.github/skills/csharp-tunit/SKILL.md`** — seed/reference only. This
   third-party skill provided the initial domain vocabulary. It must never
   override the official TUnit docs and must be treated as a starting-point
   heuristic, not a statement of correctness. See
   [Excluded and secondary-only sources](#excluded-and-secondary-only-sources)
   for known limitations.

---

### Approved local artifacts

These files are part of the `martix-tunit` package. They are approved as
structural inputs to rule authoring (domain layout, section shape, ordering,
taxonomy) but are **not** sources of TUnit API facts.

| Artifact | Role | Notes |
| --- | --- | --- |
| `skills/martix-tunit/SKILL.md` | Discovery router; defines workstream scope | Highest-priority package-structural file; governs what belongs in this skill |
| `skills/martix-tunit/AGENTS.md` | Cross-workstream companion guide | Defines review routes and maintenance contract |
| `skills/martix-tunit/metadata.json` | Package metadata; domain plan, rule prefixes, tags | Authoritative list of the 9 planned domains and their canonical prefix names |
| `skills/martix-tunit/rules/_sections.md` | Rule section contract | Every rule must follow this 6-section shape exactly |
| `skills/martix-tunit/assets/taxonomy.json` | Machine-readable domain taxonomy | Drives domain ordering and prefix assignment |
| `skills/martix-tunit/assets/section-order.json` | Stable section and domain ordering | Drives `ruleSectionOrder` and `plannedDomainOrder` |
| `skills/martix-tunit/templates/rule-template.md` | Rule authoring scaffold | Starting point for new rule files |
| `skills/martix-tunit/templates/research-pack-template.md` | Research memo scaffold | Use when scoping sources for a new rule domain |
| `skills/martix-tunit/templates/comparison-matrix-template.md` | Comparison scaffold | Use when benchmarking TUnit against another framework |
| `skills/martix-tunit/references/seed-skill-harvest.md` | Harvest memo — seed-skill review | Records what was reusable, what was corrected, and what was absent in the `.github/skills/csharp-tunit/SKILL.md` seed. No TUnit API authority; read-once reference for rule authoring. |
| *(future)* `skills/martix-tunit/research/*.md` | Scoped research memos | Must be explicitly approved and listed here before use in rules |

---

### Approved external sources

The table below maps the official TUnit documentation sections to the package
workstreams they primarily inform. All URLs are under `https://tunit.dev/docs`
unless otherwise noted.

| Documentation section | tunit.dev path prefix | Primary workstream(s) | Notes |
| --- | --- | --- | --- |
| Intro and overview | `/intro` | Foundation | Framework positioning, Microsoft.Testing.Platform integration |
| Installation | `/getting-started/installation` | Foundation | NuGet packages, project file setup, source generator |
| Writing your first test | `/getting-started/writing-your-first-test` | Foundation, Test authoring | Project shape, first `[Test]` |
| Running tests | `/getting-started/running-your-tests` | Foundation | `dotnet test`, runner wiring |
| Things to know | `/writing-tests/things-to-know` | Test authoring | Core concepts, no-attribute-on-class rule, async test model |
| Data-driven overview | `/writing-tests/data-driven-overview` | Data-driven tests | Overview of all data-source patterns |
| `[Arguments]` | `/writing-tests/arguments` | Data-driven tests | Inline parameterization |
| `[MethodDataSource]` | `/writing-tests/method-data-source` | Data-driven tests | Method-based data supply |
| `[ClassDataSource]` | `/writing-tests/class-data-source` | Data-driven tests | Class-based data supply |
| `TestDataRow` | `/writing-tests/test-data-row` | Data-driven tests | Wrapper with per-row metadata |
| Matrix tests | `/writing-tests/matrix-tests` | Data-driven tests | Cartesian product over multiple parameters |
| Combined data sources | `/writing-tests/combined-data-source` | Data-driven tests | Multi-source composition |
| Nested data sources | `/writing-tests/nested-data-sources` | Data-driven tests | Hierarchical parameterization |
| Generic attributes | `/writing-tests/generic-attributes` | Data-driven tests | Type-parameterized test data |
| Lifecycle | `/writing-tests/lifecycle` | Lifecycle and fixtures | Full hook execution order, `[Before]`/`[After]` contract |
| Hooks | `/writing-tests/hooks` | Lifecycle and fixtures | `[Before(Test/Class/Assembly/TestSession/TestDiscovery)]`, `[BeforeEvery]`, context types |
| Test context | `/writing-tests/test-context` | Test authoring, Lifecycle | `TestContext` access, metadata, execution result |
| Artifacts | `/writing-tests/artifacts` | Test authoring | Attaching output artifacts to tests |
| Property injection | `/writing-tests/property-injection` | Dependency injection | Property-based DI pattern |
| Dependency injection | `/writing-tests/dependency-injection` | Dependency injection | `IServiceProvider` wiring, `[ClassConstructor]` |
| Event subscribing | `/writing-tests/event-subscribing` | Extensibility | `ITestRegisteredEventReceiver` and related interfaces |
| Skip | `/writing-tests/skip` | Test authoring | `[Skip]` attribute and conditional skipping |
| Explicit | `/writing-tests/explicit` | Test authoring | `[Explicit]` and on-demand execution |
| Ordering | `/writing-tests/ordering` | Parallel execution and ordering | `[NotInParallel]`, `[DependsOn]`, test ordering |
| Parallelism | `/execution/parallelism` | Parallel execution and ordering | `[ParallelLimiter<T>]`, parallel configuration, default behavior |
| Culture | `/writing-tests/culture` | Test authoring | Culture-sensitive test configuration |
| Mocking overview | `/writing-tests/mocking/index` | Test authoring | Mocking library integration (NSubstitute, Moq) |
| Mocking setup, verification, and matchers | `/writing-tests/mocking/setup`, `/verification`, `/argument-matchers`, `/advanced` | Test authoring | Mocking patterns within TUnit tests |
| Mocking HTTP and logging | `/writing-tests/mocking/http`, `/logging` | Integration testing | `HttpClient` and `ILogger` mocking |
| Assertions — getting started | `/assertions/getting-started` | Assertions | `TUnit.Assertions` package, `Assert.That` entry point |
| Assertions — awaiting | `/assertions/awaiting` | Assertions | Async assertion model, why all assertions are awaited |
| Value assertions | `/assertions/equality-and-comparison`, `/null-and-default`, `/boolean`, `/numeric`, `/string`, `/datetime`, `/types`, `/specialized-types` | Assertions | Full value-assertion surface |
| Collection assertions | `/assertions/collections`, `/dictionaries` | Assertions | Collection and dictionary checks |
| Async and exception assertions | `/assertions/tasks-and-async`, `/exceptions`, `/delegates` | Assertions | `Throws<T>()`, async delegate assertions |
| Combining assertions | `/assertions/combining-assertions` | Assertions | `.And`/`.Or` chains, `Assert.Multiple` |
| Member assertions | `/assertions/member-assertions` | Assertions | Property-level drill-down |
| Regex and type-checking assertions | `/assertions/regex-assertions`, `/type-checking` | Assertions | Pattern and type checks |
| Custom assertions | `/assertions/extensibility/custom-assertions`, `/source-generator-assertions`, `/extensibility-chaining-and-converting`, `/extensibility-returning-items-from-await` | Assertions, Extensibility | Authoring assertion extensions |
| Assertion library reference | `/assertions/library` | Assertions | Full assertion API reference |
| Test filters | `/execution/test-filters` | Foundation | Filter expressions, category/display name filtering |
| Timeouts | `/execution/timeouts` | Parallel execution and ordering | `[Timeout]`, per-test and global timeout config |
| Retrying | `/execution/retrying` | Test authoring | `[Retry]` attribute |
| Repeating | `/execution/repeating` | Test authoring | `[Repeat]` attribute |
| CI/CD reporting | `/execution/ci-cd-reporting` | Foundation | Pipeline output formats, GitHub Actions integration |
| Engine modes | `/execution/engine-modes` | Foundation | In-process vs out-of-process execution |
| AOT | `/writing-tests/aot` | Foundation | Native AOT test publishing |
| Performance guide | `/guides/performance` | Parallel execution and ordering | Profiling, hot-path tips |
| ASP.NET Core integration | `/examples/aspnet` | Integration testing | `WebApplicationFactory` pattern with TUnit |
| Aspire integration | `/examples/aspire` | Integration testing | .NET Aspire test harness |
| Playwright integration | `/examples/playwright` | Integration testing | Browser automation with TUnit |
| Complex test infrastructure | `/examples/complex-test-infrastructure` | Integration testing | Multi-service fixture patterns |
| FsCheck integration | `/examples/fscheck` | Test authoring | Property-based testing |
| OpenTelemetry integration | `/examples/opentelemetry` | Integration testing | Observability in tests |
| File-based and F# examples | `/examples/filebased-csharp`, `/fsharp-interactive` | Test authoring | Non-standard test discovery |
| CI pipeline example | `/examples/tunit-ci-pipeline` | Foundation | End-to-end CI configuration |
| Extension points | `/extending/extension-points` | Extensibility | Stable extension seams |
| Data source generators | `/extending/data-source-generators` | Data-driven tests, Extensibility | Custom `IDataSourceGeneratorAttribute` |
| Argument formatters and display names | `/extending/argument-formatters`, `/display-names` | Extensibility | Custom display formatting |
| Logging, exception handling, dynamic tests | `/extending/logging`, `/exception-handling`, `/dynamic-tests` | Extensibility | Runtime hooks and dynamic discovery |
| Built-in extensions and code coverage | `/extending/built-in-extensions`, `/code-coverage` | Extensibility | Shipped extension points |
| Extending with libraries | `/extending/libraries` | Extensibility | Publishing extension NuGet packages |
| Framework differences | `/comparison/framework-differences` | *(meta — not a rule domain)* | Feature comparison: xUnit, NUnit, MSTest |
| Attribute comparison | `/comparison/attributes` | *(meta — not a rule domain)* | Side-by-side attribute table |
| Migration guides | `/migration/xunit`, `/migration/nunit`, `/migration/mstest` | *(meta — not a rule domain)* | Step-by-step migration guides; useful in Foundation and Test authoring rules |
| CLI flags | `/reference/command-line-flags` | Foundation | `dotnet test` flag reference |
| Environment variables | `/reference/environment-variables` | Foundation | Runtime configuration via env vars |
| Test configuration | `/reference/test-configuration` | Foundation | `testconfig.json` structure |
| Tips and pitfalls | `/guides/best-practices` | All domains | Cross-cutting best practices; anchor in every domain's rule when applicable |
| Troubleshooting | `/troubleshooting` | Foundation | Diagnosis of common runner and output issues |
| Philosophy | `/guides/philosophy` | *(context only — not a rule domain)* | Framework design rationale |

#### Additional external sources

| Source | URL | Notes |
| --- | --- | --- |
| `thomhurst/TUnit` GitHub repository | `https://github.com/thomhurst/TUnit` | Source of truth for changelog, issue tracker, and raw doc files |
| TUnit raw docs tree | `https://github.com/thomhurst/TUnit/tree/main/docs/docs` | Raw Markdown backing tunit.dev; use when checking wording or doc structure |
| TUnit NuGet page | `https://www.nuget.org/packages/TUnit` | Package versions, release history, download stats |
| TUnit.Assertions NuGet page | `https://www.nuget.org/packages/TUnit.Assertions` | Assertions package version tracking |
| Microsoft.Testing.Platform docs | `https://learn.microsoft.com/en-us/dotnet/core/testing/microsoft-testing-platform-intro` | Underlying runner platform that TUnit builds on |
| Testcontainers for .NET docs | `https://dotnet.testcontainers.org/` | Approved for the Integration testing workstream only |
| `WebApplicationFactory` docs | `https://learn.microsoft.com/en-us/aspnet/core/test/integration-tests` | ASP.NET Core integration test host; approved for the Integration testing workstream only |

---

### Excluded and secondary-only sources

#### Secondary only — `.github/skills/csharp-tunit/SKILL.md`

**Status:** Seed/reference heuristic. Never authoritative. Official TUnit docs
always override anything stated in this file.

This skill was used as a domain vocabulary seed before full source analysis was
complete. It is retained as an input for comparison purposes only.

**Known limitations and inaccuracies to watch for when cross-referencing:**

- **Lifecycle hook names**: the seed skill lists `[Before(Test)]`,
  `[After(Test)]`, `[Before(Class)]`, `[After(Class)]` correctly, but does not
  cover `[BeforeEvery]`, `[AfterEvery]`, `[Before(TestSession)]`,
  `[After(TestSession)]`, `[Before(TestDiscovery)]`, or
  `[After(TestDiscovery)]`. Do not treat its lifecycle section as complete.
- **Data-source attribute names**: uses `[MethodData]` and `[ClassData]`; the
  correct current names are `[MethodDataSource]` and `[ClassDataSource]`. Do
  not copy this naming from the seed skill.
- **`ClassFixture`**: this is an xUnit concept. TUnit has no `ClassFixture`
  type. Use `[Before(Class)]` / `[After(Class)]` hooks and
  `[ClassDataSource(Shared = SharedType.PerClass)]` instead.
- **Parallel execution defaults**: the seed skill states "tests in same class
  run sequentially by default". Verify current default behavior against the
  official `/execution/parallelism` page before relying on this claim.
- **`ITestDataSource`**: the seed skill refers to this interface; verify its
  current name and contract against the official docs before use in any rule.
- **Migration table**: useful as a starting point but may not reflect the
  current TUnit API surface. Always verify migration guidance against the
  official `/migration/*` pages.

#### Excluded in-repo sources

The following repo paths are out of scope for this skill and must not be used
as TUnit knowledge sources:

- `.github/skills/csharp-tunit/` (except as the secondary seed documented
  above)
- `src/plugins/` — plugin-wrapper assets are a different product surface
- `docs/martix-csharp/` — scoped to general C# guidance, not TUnit-specific
- `skills/martix-dotnet-csharp/` — broader .NET/C# skill; pull from it
  only when a TUnit rule explicitly cross-links general .NET patterns
- `skills/martix-fastendpoints/` and `skills/martix-fluentvalidation/`
  — different library skills; do not borrow their sources
- Any AI-generated summaries not grounded in the approved sources above
- xUnit, NUnit, or MSTest documentation (approved only inside the
  Comparing & Migrating doc section and migration rule context)

---

### Maintenance notes

- **Add before using.** If a rule cites a source not in this file, add it here
  first with a rationale. No rule should be the first place a source appears.
- **Official docs win.** When tunit.dev contradicts the seed skill or any local
  artifact, the official page is correct. Revise the affected rule; do not
  revise this file to match a secondary source.
- **Version drift.** TUnit's API surface changes rapidly. Each rule's
  `Source anchors` section must note the TUnit version range the guidance was
  verified against. Revisit rules when the project's TUnit version changes
  significantly.
- **No cross-skill contamination.** Keep TUnit-specific decisions in this
  package. Pull broader .NET guidance from `martix-dotnet-csharp` only when
  a rule explicitly annotates the cross-link and the guidance is stable across
  TUnit versions.
- **Research memos.** When scoping a new rule domain, author a research memo
  using `templates/research-pack-template.md` and add it to the approved local
  artifacts table above before writing the rule.
- **Scaffold-only flag.** `metadata.json` currently carries `"scaffoldOnly": false`.
  Only flip this flag back to `true` if the package is intentionally reset to a
  scaffold state; otherwise keep the source-boundary notes aligned with the
  published rule library.
