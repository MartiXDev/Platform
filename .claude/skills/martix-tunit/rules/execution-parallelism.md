# TUnit parallel execution

## Purpose

Guide decisions about TUnit's parallel-by-default execution model, the three
parallelism-control attributes, dependency ordering, and concurrency-safe test
design. This rule covers when to constrain parallelism and how to do it without
accidentally serialising the entire test suite.

## Default guidance

### Parallel by default

TUnit runs every test concurrently with no configuration required. The .NET
thread pool decides how many tests execute at once. Assume all tests in a
suite are eligible to run at the same time unless an attribute explicitly
says otherwise.

> **Correction from seed skill:** The claim that "tests within the same class
> run sequentially by default" is **false**. TUnit applies no per-class
> sequential guarantee. Any test relying on intra-class ordering must use
> `[NotInParallel]` with a shared constraint key.

---

### `[NotInParallel]` — mutual exclusion

Add `[NotInParallel]` to a test to prevent it from overlapping with other
constrained tests.

**With constraint keys:** Tests that share any key are mutually exclusive. Tests
with no common key are unaffected.

```csharp
private const string DbKey = "Database";

[Test, NotInParallel(DbKey)]
public async Task Create_User() { ... }

[Test, NotInParallel(DbKey)]
public async Task Delete_User() { ... }
```

**Without keys:** The test runs completely alone — no other test executes at the
same time. This is the most restrictive form; prefer keyed constraints so
unrelated tests can still proceed.

**Sequential ordering inside a constraint group:** Set the `Order` property to
control execution order within a shared key. Tests run from smallest to largest
order value. Prefer `[DependsOn]` instead when you have a choice, because
`[DependsOn]` preserves more parallelism across the rest of the suite.

```csharp
[Test, NotInParallel(Order = 1)]
public async Task Step1_CreateRecord() { ... }

[Test, NotInParallel(Order = 2)]
public async Task Step2_VerifyRecord() { ... }
```

**Assembly-level sequential execution:** Disable all parallelism for an entire
assembly by placing the attribute at the assembly level. Use only for
test suites where every test shares a non-shareable global resource.

```csharp
[assembly: NotInParallel]
```

---

### `[ParallelGroup]` — phase-based isolation

`[ParallelGroup("key")]` groups classes into execution phases. Tests inside one
group run concurrently with each other, but no tests from any other group run at
the same time. The engine drains one group entirely before it starts the next.

```csharp
[ParallelGroup("Database")]
public class UserRepositoryTests { ... }

[ParallelGroup("Database")]
public class OrderRepositoryTests { ... }    // runs alongside UserRepositoryTests

[ParallelGroup("ExternalApi")]
public class PaymentApiTests { ... }         // runs in a separate phase
```

Tests not assigned to a group run under normal parallel execution rules.

Use `[ParallelGroup]` when different subsystems need mutual isolation but tests
within each subsystem are safe to run together. Use `[NotInParallel]` when the
constraint is finer-grained (individual tests, not entire class groups).

---

### `[ParallelLimiter<T>]` — concurrency cap

`[ParallelLimiter<T>]` limits how many tests sharing the same `IParallelLimit`
type run concurrently. Define the limit type once and reference it from any
number of test classes or methods.

```csharp
public record MaxTwoConnections : IParallelLimit
{
    public int Limit => 2;
}

[ParallelLimiter<MaxTwoConnections>]
public class DatabaseIntegrationTests
{
    [Test, Repeat(10)]
    public async Task Query_Returns_Rows() { ... }
}
```

With `Limit = 2`, at most two of those ten invocations execute at once.

**Assembly-level limiter:**

```csharp
[assembly: ParallelLimiter<MaxTwoConnections>]
```

**Precedence:** Method > Class > Assembly. A method-level limiter overrides a
class-level limiter, which in turn overrides an assembly-level limiter.

---

### `[DependsOn]` — dependency ordering

A test that carries `[DependsOn(nameof(OtherTest))]` waits until the named test
finishes before it starts. This preserves parallelism elsewhere in the suite
because only the dependent pair is serialised.

```csharp
[Test]
public async Task AddUser() { ... }

[Test, DependsOn(nameof(AddUser))]
public async Task VerifyUserExists() { ... }
```

When multiple tests share the same method name (overloaded data-driven tests),
supply the parameter types to disambiguate:

```csharp
[DependsOn(nameof(AddUser), new[] { typeof(string), typeof(int) })]
```

**Accessing a dependency's state:** Retrieve the dependency's `TestContext`
through `TestContext.Current!.Dependencies.GetTests(nameof(...))`. For
data-driven dependencies this returns all invocations; filter by argument values
as needed.

**Failure propagation:** By default, if the dependency fails the dependent test
is not started. Set `ProceedOnFailure = true` to allow the dependent test to run
regardless.

```csharp
[Test, DependsOn(nameof(SetupStep), ProceedOnFailure = true)]
public async Task TeardownEvenIfSetupFailed() { ... }
```

Use `[DependsOn]` only for workflows where true ordering is unavoidable (e.g.,
deployment pipeline steps, expensive shared-state workflows). Prefer
self-contained tests with setup hooks for everything else.

---

### Concurrency-safe test design

Parallel execution requires that tests do not share mutable state unless
protected by an explicit constraint attribute.

- **Unique resource names:** Use `TestContext.Current!.Isolation.GetIsolatedName("base")` to
  generate a per-test-instance resource name (e.g., a database table, queue
  topic, or cache key). The returned name is unique across all parallel tests in
  the session.

  ```csharp
  var tableName = TestContext.Current!.Isolation.GetIsolatedName("orders");
  // returns something like "Test_42_orders"
  ```

- **Unique IDs:** Use `TestContext.Current!.Isolation.UniqueId` when only a
  numeric discriminator is needed.

- **No static mutable fields in test classes:** Each test run creates a new
  class instance, but static members are shared. Protect them or eliminate them.

- **Async-safe assertions:** All TUnit assertions are async and must be awaited.
  Unawaited assertions silently pass. Concurrent assertion streams within a
  single test are safe; concurrent assertions across tests are isolated by the
  new-instance-per-test model.

## Avoid

- Do not assume tests in the same class run sequentially. They do not. Apply
  `[NotInParallel]` with a key if sequential execution is required.
- Do not use keyless `[NotInParallel]` when constraint keys can accomplish the
  same goal; it serialises more of the suite than necessary.
- Do not mix `[DependsOn]` with different `[ParallelLimiter<T>]` or
  `[ParallelGroup]` groupings on the same tests. Ordering is not guaranteed
  when these attributes conflict.
- Do not use `[assembly: NotInParallel]` as a default-safe workaround. It turns
  off the primary performance advantage of TUnit for the entire assembly.
- Do not use `[Order]` in isolation without a shared `[NotInParallel]`
  constraint. Order has no effect when tests run in parallel.
- Do not store per-test state in static fields without protection. New class
  instances do not isolate static state.

## Review checklist

- [ ] Tests with shared resource dependencies carry matching `[NotInParallel]`
      constraint keys.
- [ ] `[ParallelLimiter<T>]` is used (rather than `[NotInParallel]` without
      keys) when the constraint is a concurrency cap rather than mutual exclusion.
- [ ] `[DependsOn]` is reserved for genuinely ordered workflows, not for
      sequencing tests that could instead be made independent.
- [ ] No static mutable fields in test classes without explicit synchronisation
      or elimination.
- [ ] Resource names in parallel tests use `TestContext.Current!.Isolation`
      helpers rather than fixed strings.
- [ ] Assembly-level parallelism suppression is documented with a reason in a
      comment near the attribute.

## Related files

- [Execution control](./execution-control.md) — retries, timeouts, skip,
  explicit, filter syntax, CI/CD reporting, and engine modes
- [Lifecycle hooks](./lifecycle-hooks.md) — `[Before(Class)]` and
  `[Before(Assembly)]` for test-scoped shared setup that avoids mutable static
  state
- [Execution reference map](../references/execution-map.md) — quick attribute
  and configuration index for the execution domain

## Source anchors

- [Parallelism — tunit.dev](https://tunit.dev/docs/execution/parallelism) —
  `[NotInParallel]`, `[ParallelGroup]`, `[ParallelLimiter<T>]`, attribute
  precedence, and assembly-level configuration
- [Ordering — tunit.dev](https://tunit.dev/docs/writing-tests/ordering) —
  `[Order]` within `[NotInParallel]`, `[DependsOn]` contract, failure
  propagation, `ProceedOnFailure`, and accessing dependency state via
  `TestContext`
- [Things to know — tunit.dev](https://tunit.dev/docs/writing-tests/things-to-know) —
  confirms parallel-by-default, new instance per test, and no class-level
  sequential guarantee
- [Test context — tunit.dev](https://tunit.dev/docs/writing-tests/test-context) —
  `TestContext.Current!.Isolation` resource-naming helpers
- [Performance guide — tunit.dev](https://tunit.dev/docs/guides/performance) —
  profiling and hot-path tips for parallel test suites
