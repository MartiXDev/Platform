# TUnit execution control

## Purpose

Guide decisions about controlling how individual TUnit tests run: retrying
flaky tests, repeating for stress coverage, timing out slow tests, skipping
or deferring on-demand tests, locking test culture, filtering which tests
execute, reporting results to CI/CD pipelines, and choosing between TUnit's
execution engine modes. This rule covers everything outside the parallelism
topology (see `execution-parallelism.md` for that).

## Default guidance

### Running tests — `dotnet run` vs `dotnet test`

TUnit is built on `Microsoft.Testing.Platform`. The **primary** execution
surface is `dotnet run` from the test project directory:

```sh
dotnet run
```

`dotnet test` also works, but command-line flags passed directly to the runner
must be separated by `--` to avoid `unknown switch` errors:

```sh
# Correct — flags follow the separator
dotnet test -- --treenode-filter "/*/*/MyClass/*"

# Incorrect — runner rejects flags without the separator
dotnet test --treenode-filter "/*/*/MyClass/*"
```

Prefer `dotnet run` in local development and scripts. Use `dotnet test` when a
CI pipeline or toolchain requires it and always place runner flags after `--`.

---

### `[Retry]` — flaky test mitigation

Add `[Retry(n)]` to re-run a failing test up to `n` additional times. The test
stops retrying as soon as it passes. Each retry is a fresh execution on a new
class instance.

```csharp
[Test, Retry(3)]
public async Task Flaky_External_Call() { ... }
```

**Custom retry condition:** Subclass `RetryAttribute` and override `ShouldRetry`
to limit retries to specific exception types:

```csharp
public class RetryOnHttpAttribute(int times) : RetryAttribute(times)
{
    public override Task<bool> ShouldRetry(
        TestContext context, Exception exception, int currentRetryCount)
    {
        var isTransient = exception is HttpRequestException { StatusCode:
            HttpStatusCode.TooManyRequests or
            HttpStatusCode.GatewayTimeout or
            HttpStatusCode.ServiceUnavailable };
        return Task.FromResult(isTransient);
    }
}
```

**Scope and precedence:** `[Retry]` applies to a method, a class, or an
assembly. Method > Class > Assembly. More specific overrides less specific.

**Interaction with `[Timeout]`:** When both are present, each retry attempt
receives its own fresh timeout window. A timeout on attempt 1 does not consume
the next attempt's budget.

---

### `[Repeat]` — stress and consistency testing

Add `[Repeat(n)]` to run a test `n` **additional** times regardless of pass or
fail. The total invocation count is `n + 1`. Each repeat appears as a separate
test instance in the test explorer with a `RepeatIndex` suffix.

```csharp
[Test, Repeat(3)]
public async Task Calculation_Is_Consistent()
{
    var result = Calculator.Add(2, 3);
    await Assert.That(result).IsEqualTo(5);
}
// Produces: Calculation_Is_Consistent (×1 original + ×3 repeats = 4 runs)
```

Use `[Repeat]` for consistency checks, concurrency stress tests, and detecting
intermittent race conditions. Use `[Retry]` for transient-failure mitigation.
Do not use `[Repeat]` as a proxy for `[Retry]` — it runs unconditionally.

**Scope and precedence:** Method > Class > Assembly, same as `[Retry]`.

---

### `[Timeout]` — per-test time budget

Add `[Timeout(milliseconds)]` to fail a test after the given duration. Declare
a `CancellationToken` parameter on the test method to receive a token linked to
the timeout; forward it to all async I/O operations.

```csharp
[Test, Timeout(30_000)]
public async Task Api_Responds_Within_30s(CancellationToken cancellationToken)
{
    using var client = new HttpClient();
    var response = await client.GetAsync("https://api.example.com/health", cancellationToken);
    await Assert.That(response.IsSuccessStatusCode).IsTrue();
}
```

When the budget expires, the `CancellationToken` is cancelled, any operation
forwarding it throws `OperationCanceledException`, and the test is marked as
failed due to timeout.

**Assembly-level default timeout:**

```csharp
[assembly: Timeout(60_000)]
```

**Scope and precedence:** Method > Class > Assembly.

---

### `[Skip]` — static and dynamic skipping

**Static skip (attribute):** `[Skip("reason")]` skips the test at discovery
time. The reason is surfaced in the test report. Use `[Skip]` when the skip
condition is known at compile time.

```csharp
[Test, Skip("Pending infrastructure ticket #42")]
public async Task Requires_Redis() { ... }
```

**Conditional skip (subclass):** Inherit `SkipAttribute` and override
`ShouldSkip` to evaluate the skip at discovery time with runtime context:

```csharp
public class LinuxOnlyAttribute() : SkipAttribute("Skipped: not running on Linux")
{
    public override Task<bool> ShouldSkip(TestRegisteredContext context)
        => Task.FromResult(!RuntimeInformation.IsOSPlatform(OSPlatform.Linux));
}
```

**Dynamic skip (runtime API):** Call `Skip.Test(reason)` inside a test body or
hook when the skip decision requires logic that cannot be evaluated at discovery
time (e.g., checking whether an external service is available). This throws
`SkipTestException`, which TUnit catches and marks the test as skipped.

```csharp
[Test]
public async Task Requires_Live_Api()
{
    if (!await ApiProbe.IsAvailableAsync())
        Skip.Test("API endpoint is unavailable in this environment");

    var response = await ApiClient.GetStatusAsync();
    await Assert.That(response.IsOk).IsTrue();
}
```

`Skip.Test()` can also be called from `[Before(Test)]` or `[Before(Class)]`
hooks to skip all tests in a class when shared setup conditions are not met.

**Assembly-level skip:**

```csharp
[assembly: Skip("Work in progress — do not run in CI")]
```

---

### `[Explicit]` — on-demand-only tests

`[Explicit]` marks a test so it is excluded from general runs. An explicit test
executes only when a filter targets it directly and every test matched by that
filter also carries `[Explicit]`. Mixing explicit and non-explicit tests in a
filter excludes the explicit ones.

```csharp
[Test, Explicit]
public async Task Seed_Local_Database() { ... }
```

Run an explicit test via `--treenode-filter` (see Filter syntax below):

```sh
dotnet run -- --treenode-filter "/*/*/MyClass/Seed_Local_Database"
```

Use `[Explicit]` for developer-only utilities (database seeders, cache warmers,
feature-flag resets) that should never run as part of the normal CI suite but
must remain runnable on demand.

Combine with `[Property("Category", "DevTool")]` to group explicit utilities
under a filterable property:

```csharp
[Test, Explicit, Property("Category", "DevTool")]
public async Task Reset_Feature_Flags() { ... }
```

---

### `[Culture]` — locale-stable tests

Add `[Culture("locale")]` to lock `CurrentCulture` and `CurrentUICulture` for
the duration of a test. Without it, a test that formats or parses
locale-sensitive strings may pass on a developer machine in `en-US` but fail
on a CI server with a different default locale.

```csharp
[Test, Culture("en-US")]
public async Task Parse_Decimal_Is_Stable()
{
    var value = double.Parse("3.5");
    await Assert.That(value).IsEqualTo(3.5);
}
```

**Scope:** Method, class, or assembly. One culture per scope. To run the same
logic under multiple locales, extract it into a private helper and call it from
separate test methods with distinct `[Culture]` attributes. The attribute sets
both `CurrentCulture` and `CurrentUICulture`.

---

### `[Property]` — custom test metadata

Add `[Property("key", "value")]` to attach arbitrary string metadata to a test.
Properties are available at runtime via `TestContext` and are the primary
mechanism for TUnit's filter-based categorisation.

```csharp
[Test, Property("Category", "Integration"), Property("Owner", "team-backend")]
public async Task Orders_Endpoint_Returns_200() { ... }
```

The `[Category("name")]` shorthand is equivalent to
`[Property("Category", "name")]` and is supported when TUnit exposes it as a
first-class attribute. Check the TUnit version in use; `[Property]` is always
available.

Properties can be applied on base classes and are inherited by all sub-class
tests.

---

### Filter syntax — TUnit tree-node syntax

> **Important:** TUnit uses its own tree-node filter syntax passed via
> `--treenode-filter`. This is **not** the VSTest `--filter` syntax. Do not use
> VSTest filter expressions (e.g., `TestCategory=Smoke` or
> `FullyQualifiedName~MyClass`) with TUnit; they are silently ignored or produce
> errors.

**Flag:**

```sh
dotnet run -- --treenode-filter "<expression>"
```

**Path format:** `/<Assembly>/<Namespace>/<ClassName>/<TestName>`

Each segment can be a literal, a wildcard (`*`), or a property expression.
Use `*` to match any single segment.

**Common patterns:**

```sh
# All tests in a class
dotnet run -- --treenode-filter "/*/*/LoginTests/*"

# Specific test by name
dotnet run -- --treenode-filter "/*/*/*/AcceptCookiesTest"

# All tests in a namespace
dotnet run -- --treenode-filter "/*/MyProject.Tests.Integration/*/*"

# Namespace prefix wildcard
dotnet run -- --treenode-filter "/*/MyProject.Tests.Api*/*/*"

# Filter by custom property
dotnet run -- --treenode-filter "/*/*/*/*[Category=Smoke]"

# Exclude by property
dotnet run -- --treenode-filter "/*/*/*/*[Category!=Slow]"

# AND — multiple conditions
dotnet run -- --treenode-filter "/*/*/*/*[Category=Smoke]&[Priority=High]"

# OR — across classes (requires parentheses)
dotnet run -- --treenode-filter "/*/*/(LoginTests)|(SignupTests)/*"
```

**Operators:** `=` (exact match), `!=` (negation), `&` (AND), `|` (OR, requires
parentheses around each operand in a path segment), `*` (wildcard).

**With `dotnet test`:** Pass the filter after `--`:

```sh
dotnet test -- --treenode-filter "/*/*/LoginTests/*"
```

---

### CI/CD reporting

**TRX (Azure DevOps, Jenkins, generic):**

```sh
dotnet test -- --report-trx --report-trx-filename TestResults.trx
```

**GitHub Actions:** TUnit auto-detects the `GITHUB_ACTIONS` environment
variable and writes a test summary to `$GITHUB_STEP_SUMMARY`. No additional
configuration is required. The default style is **collapsible** (expandable
detail section). Switch to the full (legacy) style when needed:

```sh
dotnet test -- --github-reporter-style full
# or
export TUNIT_GITHUB_REPORTER_STYLE=full
```

Disable the GitHub reporter entirely:

```sh
export TUNIT_DISABLE_GITHUB_REPORTER=true
```

**GitLab CI:** GitLab requires JUnit XML. TRX is not JUnit XML. Convert with
`trx2junit` after the test run:

```yaml
test:
  script:
    - dotnet test -- --report-trx
    - dotnet tool install -g trx2junit
    - trx2junit TestResults/*.trx
  artifacts:
    reports:
      junit:
        - TestResults/*.xml
```

**Fail-fast (PR builds):** Use `--fail-fast` to stop the run on the first
failure and get quicker feedback in PR validation jobs.

**Verbosity:** Adjust `--output` or `--logger "console;verbosity=detailed"` to
match the noise level needed for the pipeline.

---

### Engine modes

TUnit supports two execution modes:

**Source generation (default):** All test discovery is generated at compile
time. Faster, type-safe, and fully AOT-compatible. No configuration needed.

**Reflection mode:** Test discovery happens at runtime via reflection. Use it
when a third-party source generator produces test cases that TUnit's source
generator cannot discover (for example, bUnit Razor components).

Enable reflection mode in priority order:

1. Command-line flag (highest precedence):
   ```sh
   dotnet test -- --reflection
   ```

2. Assembly attribute (recommended for per-project configuration):
   ```csharp
   [assembly: ReflectionMode]
   ```

3. Environment variable or `testconfig.json`:
   ```sh
   export TUNIT_EXECUTION_MODE=reflection
   ```

When using reflection mode exclusively, disable the source generator to improve
build times:

```xml
<PropertyGroup>
    <EnableTUnitSourceGeneration>false</EnableTUnitSourceGeneration>
</PropertyGroup>
```

---

### AOT-sensitive guidance

TUnit's source generation mode is fully Native AOT-compatible. Reflection mode
is **not** AOT-compatible.

For AOT builds:

- **Generic test methods and classes** require `[GenerateGenericTest(typeof(T))]`
  for each type combination. Without it the source generator emits a compile-time
  diagnostic error (`TUnit0058`).

  ```csharp
  [Test]
  [GenerateGenericTest(typeof(int))]
  [GenerateGenericTest(typeof(string))]
  public async Task Generic_Test<T>() { ... }
  ```

- **Data sources** must be `static` methods or properties. Dynamic or
  instance-level data sources are flagged with `TUnit0059`.

- **Publish:** Add `<PublishAot>true</PublishAot>` to the project file and run
  `dotnet publish -c Release`. The test binary is a self-contained native
  executable.

Do not apply `[assembly: ReflectionMode]` in projects intended for AOT
publishing; it disables source generation and breaks native compilation.

## Avoid

- Do not pass runner flags to `dotnet test` without the `--` separator; they
  will be silently ignored or cause unknown-switch errors.
- Do not use `[Repeat]` to mitigate flakiness; use `[Retry]` instead. Repeating
  unconditionally does not stop on pass.
- Do not leave tests without a `CancellationToken` parameter when `[Timeout]` is
  applied; the token is the mechanism by which timeouts cancel in-progress I/O.
- Do not use VSTest filter syntax (`--filter TestCategory=X`) with TUnit. Use
  `--treenode-filter` with the tree-node path format.
- Do not mix `[Explicit]` and non-explicit tests in the same filter; explicit
  tests are excluded when the filter also matches non-explicit tests.
- Do not use `[assembly: ReflectionMode]` in an AOT-published project.
- Do not hardcode locale-sensitive string comparisons without `[Culture]`;
  format-dependent assertions will produce different results across CI machines.
- Do not use `[Retry]` as a substitute for fixing genuinely broken tests; it
  masks root-cause failures in CI metrics.

## Review checklist

- [ ] `dotnet run` is used for local execution; `dotnet test` passes runner
      flags after `--`.
- [ ] `[Timeout]` tests declare a `CancellationToken` parameter and forward it
      to async I/O.
- [ ] `[Repeat(n)]` is used for stress and consistency testing, not flakiness
      mitigation.
- [ ] `[Retry(n)]` has a custom `ShouldRetry` override when only specific
      exception types should trigger a retry.
- [ ] Locale-sensitive assertions carry `[Culture]` at the appropriate scope.
- [ ] Filter expressions use TUnit's `--treenode-filter` tree-node syntax, not
      VSTest syntax.
- [ ] `[Explicit]` tests are grouped by `[Property("Category", "...")]` so they
      can be targeted consistently.
- [ ] CI pipelines use `--report-trx` for Azure DevOps and Jenkins, auto-detect
      for GitHub Actions, and `trx2junit` conversion for GitLab.
- [ ] AOT projects use `[GenerateGenericTest]` on generic tests and static data
      sources; `[assembly: ReflectionMode]` is absent.

## Related files

- [Execution parallelism](./execution-parallelism.md) — parallel-by-default
  model, `[NotInParallel]`, `[ParallelGroup]`, `[ParallelLimiter<T>]`, and
  `[DependsOn]`
- [Foundation installation and project](./foundation-installation-project.md) —
  `OutputType=Exe`, `dotnet run` project model, IDE configuration, and
  `Microsoft.Testing.Platform` integration details
- [Execution reference map](../references/execution-map.md) — quick attribute
  and configuration index for the execution domain

## Source anchors

- [Retrying — tunit.dev](https://tunit.dev/docs/execution/retrying) — `[Retry]`
  attribute, `ShouldRetry` override, scope and precedence
- [Repeating — tunit.dev](https://tunit.dev/docs/execution/repeating) —
  `[Repeat]` semantics (`n` additional runs, total = n+1), repeat vs retry
- [Timeouts — tunit.dev](https://tunit.dev/docs/execution/timeouts) —
  `[Timeout]` millisecond contract, `CancellationToken` wiring, retry
  interaction, scope and precedence
- [Skip — tunit.dev](https://tunit.dev/docs/writing-tests/skip) — `[Skip]`
  attribute, `SkipAttribute` subclass pattern, `Skip.Test()` runtime API,
  assembly-level skip
- [Explicit — tunit.dev](https://tunit.dev/docs/writing-tests/explicit) —
  `[Explicit]` behavior when mixed with non-explicit tests, filtering
- [Culture — tunit.dev](https://tunit.dev/docs/writing-tests/culture) —
  `[Culture]` attribute, scope, per-locale test patterns
- [Test context — tunit.dev](https://tunit.dev/docs/writing-tests/test-context) —
  `[Property]` attribute, `CustomProperties` access at runtime
- [Test filters — tunit.dev](https://tunit.dev/docs/execution/test-filters) —
  `--treenode-filter` flag, path format, operators, property-based filtering
- [CI/CD reporting — tunit.dev](https://tunit.dev/docs/execution/ci-cd-reporting) —
  GitHub Actions auto-detection, TRX reporting, GitLab conversion, `--fail-fast`
- [Engine modes — tunit.dev](https://tunit.dev/docs/execution/engine-modes) —
  source generation vs reflection mode, `[assembly: ReflectionMode]`, AOT
  compatibility, `EnableTUnitSourceGeneration`
- [AOT — tunit.dev](https://tunit.dev/docs/writing-tests/aot) —
  `[GenerateGenericTest]`, static data sources, `<PublishAot>`, AOT diagnostics
- [Command-line flags — tunit.dev](https://tunit.dev/docs/reference/command-line-flags) —
  full flag reference including `--reflection`, `--fail-fast`, `--output`
