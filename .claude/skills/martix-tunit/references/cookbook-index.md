# TUnit cookbook index

## Purpose

Index the official TUnit example pages, integration guides, and benchmark
material so this skill can link to the right secondary resources quickly,
while keeping primary rule guidance anchored in the core docs. This file is a
navigation artifact, not a rule. Nothing here overrides or extends the guidance
in the rule files — use the rules for opinionated, actionable direction; use
this index to find concrete worked examples.

---

## Integration examples

### ASP.NET Core

Use the ASP.NET Core example when writing integration tests for a minimal API
or controller-based application with TUnit.

- [ASP.NET Core integration](https://tunit.dev/docs/examples/aspnet)
  - `WebApplicationFactory<TProgram>` setup pattern with TUnit hooks.
  - Authentication/authorization test strategies.
  - Request/response pipeline assertions.

### .NET Aspire

Use the Aspire example when the solution uses .NET Aspire and you need to
orchestrate the AppHost in a test harness.

- [Aspire integration](https://tunit.dev/docs/examples/aspire)
  - `DistributedApplicationTestingBuilder` usage with TUnit lifecycle hooks.
  - Service resource waiting and health-check patterns.

### Playwright

Use the Playwright example when writing end-to-end browser tests with TUnit.

- [Playwright integration](https://tunit.dev/docs/examples/playwright)
  - Browser fixture setup in `[Before(Class)]` hooks.
  - Page and context lifecycle management.
  - Parallel browser test considerations.

### Complex test infrastructure

Use the complex infrastructure example when tests require multi-service fixtures,
shared containers, or coordinated resource startup across multiple test classes.

- [Complex test infrastructure](https://tunit.dev/docs/examples/complex-test-infrastructure)
  - Multi-service fixture patterns with `[ClassDataSource]` sharing.
  - Shared container startup with `IAsyncInitializer`.
  - Resource teardown ordering across test scopes.

### FsCheck property-based testing

Use the FsCheck example when adding property-based tests alongside standard
TUnit tests.

- [FsCheck integration](https://tunit.dev/docs/examples/fscheck)
  - Combining FsCheck property generation with `[MethodDataSource]`.

### OpenTelemetry

Use the OpenTelemetry example when verifying traces, metrics, or logs produced
by the application under test.

- [OpenTelemetry integration](https://tunit.dev/docs/examples/opentelemetry)
  - In-memory exporter setup within TUnit test scope.
  - Asserting on span and metric data.

---

## CI pipeline examples

### End-to-end CI configuration

Use the CI pipeline example when setting up a new GitHub Actions or other CI
pipeline to run TUnit tests and publish TRX and coverage artifacts.

- [TUnit CI pipeline example](https://tunit.dev/docs/examples/tunit-ci-pipeline)
  - Canonical `dotnet run` invocation pattern for CI.
  - `--report-trx` and `--coverage` flag placement after `--`.
  - Artifact upload patterns for TRX files and coverage reports.

---

## Non-standard test discovery

### File-based tests (C#)

Use the file-based example when tests are defined in files rather than compiled
assemblies, or when testing the TUnit discovery surface for non-standard input.

- [File-based C# tests](https://tunit.dev/docs/examples/filebased-csharp)

### F# interactive tests

F# coverage is out of scope for the first pass of `martix-tunit` (C# only).
Linked here for completeness; do not use as a source for C# rule guidance.

- [F# interactive tests](https://tunit.dev/docs/examples/fsharp-interactive)

---

## Guides and benchmarks

### Performance guide

Use the performance guide when a test suite is slow and you need to identify
parallelism bottlenecks, excessive setup overhead, or hot-path allocation issues.

- [Performance guide](https://tunit.dev/docs/guides/performance)
  - Profiling strategies for large parallel test suites.
  - `[ParallelLimiter<T>]` tuning recommendations.
  - Setup/teardown overhead reduction patterns.

### Best practices and pitfalls

Use the best practices guide as a cross-cutting reference when reviewing a
test suite for common mistakes across all domains.

- [Tips and pitfalls](https://tunit.dev/docs/guides/best-practices)
  - Unawaited assertions, parallel safety, and lifecycle ordering traps.
  - Recommended patterns for data-driven and shared-state tests.

### Philosophy

Contextual reading only. This page explains the framework design rationale but
contains no actionable rule content. Do not use as a source of TUnit API facts.

- [Philosophy](https://tunit.dev/docs/guides/philosophy)
  - Framework design goals and the reasoning behind Microsoft.Testing.Platform
    adoption and the parallel-by-default model.

---

## Normative usage in this skill

- Treat all pages in this index as **implementation examples and secondary
  material**, not as the primary source of policy. The rules in `rules/`
  and the official docs listed in `references/doc-source-index.md` are
  authoritative.
- Pull integration examples in when the scenario requires concrete wiring
  (e.g., `WebApplicationFactory`, Aspire AppHost, Playwright browser fixture)
  that the core TUnit rules do not cover.
- The CI pipeline example is the recommended reference for getting TRX and
  coverage output right; do not invent flag syntax without checking there
  first.
- Performance and best-practices guides are appropriate cross-references for
  review checklists; quote them by name and link, not by paraphrase.
- F# examples are out of scope for this skill's first pass; keep the link
  for future expansion but do not author C# rules from F# examples.

---

## Related files

- [Foundation map](./foundation-map.md)
- [Execution map](./execution-map.md)
- [Lifecycle map](./lifecycle-map.md)
- [Mocking and extending map](./mocking-extending-map.md)
- [Source index and guardrails](./doc-source-index.md)

## Source anchors

- [TUnit examples index](https://tunit.dev/docs/examples)
  - Entry point for all official example pages.
- [TUnit guides index](https://tunit.dev/docs/guides)
  - Entry point for performance, best practices, and philosophy pages.
- [CI/CD reporting](https://tunit.dev/docs/execution/ci-cd-reporting)
  - Canonical CI flag syntax and artifact patterns.
- [Performance guide](https://tunit.dev/docs/guides/performance)
  - Parallel test suite profiling and tuning.
- [Tips and pitfalls](https://tunit.dev/docs/guides/best-practices)
  - Cross-cutting best practices and common mistakes.
