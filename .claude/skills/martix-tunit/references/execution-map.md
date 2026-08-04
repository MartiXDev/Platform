# TUnit execution map

## Purpose

Map the TUnit parallel execution and execution-control topics covered by this
workstream so rule files stay aligned with the official docs and point agents
at the right companion guidance. Execution covers the parallel-by-default model,
`[ParallelLimiter<T>]`, `[NotInParallel]`, `[DependsOn]`, test ordering,
retries, repeats, timeouts, skip, explicit, test filters, CI/CD reporting, and
engine modes.

## Rule coverage

- **Parallel execution**
  - Rule file: `rules/execution-parallelism.md`
  - Primary sources:
    - [Parallelism](https://tunit.dev/docs/execution/parallelism)
    - [Ordering](https://tunit.dev/docs/writing-tests/ordering)
    - [Performance guide](https://tunit.dev/docs/guides/performance)
    - [Things to know](https://tunit.dev/docs/writing-tests/things-to-know)
  - Notes: Use for the parallel-by-default guarantee (every test is eligible
    to run concurrently with no configuration), `[ParallelLimiter<T>]` for
    capping concurrency, `[NotInParallel]` with a shared constraint key,
    `[DependsOn(nameof(...))]` for explicit sequencing, `[ParallelGroup]`
    for phased grouping, and test ordering attributes. The seed skill
    incorrectly stated that tests in the same class run sequentially by
    default — they do not.

- **Execution control**
  - Rule file: `rules/execution-control.md`
  - Primary sources:
    - [Retrying](https://tunit.dev/docs/execution/retrying)
    - [Repeating](https://tunit.dev/docs/execution/repeating)
    - [Timeouts](https://tunit.dev/docs/execution/timeouts)
    - [Skip](https://tunit.dev/docs/writing-tests/skip)
    - [Explicit](https://tunit.dev/docs/writing-tests/explicit)
    - [Test filters](https://tunit.dev/docs/execution/test-filters)
    - [CI/CD reporting](https://tunit.dev/docs/execution/ci-cd-reporting)
    - [Engine modes](https://tunit.dev/docs/execution/engine-modes)
    - [Culture](https://tunit.dev/docs/writing-tests/culture)
  - Notes: Use for `[Retry(n)]`, `[Repeat(n)]` (runs `n` additional times
    for a total of `n + 1` invocations), `[Timeout(ms)]`, `[Skip("reason")]`,
    `Skip.Test(reason)` runtime API, `[Explicit]` for on-demand-only
    execution, TUnit tree-node filter syntax (not VSTest syntax), and
    in-process vs out-of-process engine mode selection.

## Concurrency quick-reference

| Attribute / API | Effect |
|---|---|
| *(none)* | Test is eligible to run in parallel with all other tests |
| `[NotInParallel("key")]` | Test will not run in parallel with other tests sharing the same key |
| `[ParallelLimiter<T>]` | Caps concurrent tests to the limit defined by `T : IParallelLimit` |
| `[DependsOn(nameof(OtherTest))]` | Test waits for the named test to complete before starting |
| `[ParallelGroup("name")]` | Groups tests into a named parallel execution phase |
| `[Repeat(n)]` | Runs the test `n + 1` total times (once + `n` additional) |
| `[Retry(n)]` | Retries up to `n` times on failure |
| `[Timeout(ms)]` | Cancels the test after the given milliseconds |
| `[Skip("reason")]` | Marks test as skipped at discovery time |
| `Skip.Test(reason)` | Skips test at runtime from inside a test body or hook |
| `[Explicit]` | Test only runs when explicitly targeted by a filter |

## Related files

- [Parallel execution rule](../rules/execution-parallelism.md)
- [Execution control rule](../rules/execution-control.md)
- [Foundation map](./foundation-map.md)
- [Lifecycle map](./lifecycle-map.md)
- [Cookbook index](./cookbook-index.md)
- [Source index and guardrails](./doc-source-index.md)

## Source anchors

- [Parallelism](https://tunit.dev/docs/execution/parallelism)
  - Parallel-by-default behavior, `[ParallelLimiter<T>]`, `[NotInParallel]`,
    and `[ParallelGroup]` attributes.
- [Ordering](https://tunit.dev/docs/writing-tests/ordering)
  - `[DependsOn]` and test execution ordering.
- [Retrying](https://tunit.dev/docs/execution/retrying)
  - `[Retry(n)]` attribute; retry semantics on failure.
- [Repeating](https://tunit.dev/docs/execution/repeating)
  - `[Repeat(n)]` attribute; n additional runs (total = n + 1).
- [Timeouts](https://tunit.dev/docs/execution/timeouts)
  - `[Timeout(ms)]` attribute; per-test and global timeout configuration.
- [Skip](https://tunit.dev/docs/writing-tests/skip)
  - `[Skip("reason")]` and `Skip.Test(reason)` runtime API.
- [Explicit](https://tunit.dev/docs/writing-tests/explicit)
  - `[Explicit]` attribute for on-demand-only test execution.
- [Test filters](https://tunit.dev/docs/execution/test-filters)
  - TUnit tree-node filter syntax; `--` separator with `dotnet test`.
- [CI/CD reporting](https://tunit.dev/docs/execution/ci-cd-reporting)
  - Pipeline output formats, TRX artifact, and GitHub Actions integration.
- [Engine modes](https://tunit.dev/docs/execution/engine-modes)
  - In-process vs out-of-process execution mode selection.
- [Performance guide](https://tunit.dev/docs/guides/performance)
  - Profiling tips and hot-path guidance for large parallel test suites.

## Maintenance notes

- The parallel-by-default model is the single most disruptive behavioral
  difference from xUnit, NUnit, and MSTest. Keep it prominently in the
  parallelism rule and the concurrency quick-reference above.
- `[Repeat(n)]` semantics (`n + 1` total invocations) differ from the common
  expectation of exactly `n` runs. State the total count explicitly.
- `[ParallelLimiter<T>]` is the correct attribute name. The seed skill used
  `[ParallelLimit<T>]`; that name is incorrect.
- Test filter syntax is TUnit-specific tree-node syntax, not VSTest syntax.
  Keep a clear pointer to the test-filters page in both the execution rule
  and the foundation rule.
- When TUnit adds new execution-control attributes, add rows to the
  quick-reference table and update the relevant rule before shipping.
