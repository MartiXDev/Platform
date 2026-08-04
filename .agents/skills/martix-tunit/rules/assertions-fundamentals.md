# TUnit assertion fundamentals

This rule protects the async-first assertion model that all TUnit tests must follow.
It defines the entry point, the await requirement, the analyzer contract, return-value
continuations, and type safety. Every other assertion rule depends on the model described
here.

## Purpose

Establish the foundational assertion contract — `await Assert.That(subject).Method()` —
so that tests never silently pass due to an unawaited assertion and always participate
in TUnit's async execution model.

## Default guidance

### Always await assertions — the critical pitfall

TUnit's assertion design makes `await` the mechanism that **triggers** assertion
execution. Before `await`, the framework is only building a chain of rules. An unawaited
call compiles without error and runs without error, but never checks anything — the test
passes silently regardless of the actual value.

```csharp
// ✅ Correct — assertion executes and verifies the value
await Assert.That(result).IsEqualTo(42);

// ❌ WRONG — assertion never runs; test silently passes
Assert.That(result).IsEqualTo(42);
```

A built-in Roslyn analyzer ships with `TUnit.Assertions` and flags unawaited
`Assert.That(...)` calls at compile time. Treat these analyzer warnings as errors so the
mistake is caught before CI, not after.

### Test methods must be `async Task`

Because every assertion must be awaited, every test method that asserts must be declared
`async Task` (or `async Task<T>` when a return value is needed downstream). A synchronous
test method cannot `await` its assertions and will therefore never execute them.

```csharp
[Test]
public async Task Add_Returns_Expected_Sum()
{
    var result = Add(1, 2);
    await Assert.That(result).IsEqualTo(3);
}
```

### `Assert.That()` is the sole entry point

All TUnit assertions begin with `Assert.That(subject)`. There are no one-shot static
overloads such as `Assert.Equal(...)` or `Assert.True(...)`. The fluent chain that
follows `Assert.That(...)` determines what is checked and how.

### Async delegates avoid sync-over-async

TUnit accepts async delegates directly so that tests never need to block a thread. Pass
an async lambda when the subject is an asynchronous operation. TUnit executes the
delegate internally, captures any exception, and reports a failure if the expectation is
not met. This keeps the thread pool free and keeps the assertion API consistent
regardless of whether the code under test is synchronous or asynchronous.

```csharp
// Asserting that an async operation throws a specific exception
await Assert.That(async () => await FetchDataAsync())
    .Throws<HttpRequestException>();

// Asserting that an async operation completes within a time limit
await Assert.That(async () => await LongRunningOperationAsync())
    .CompletesWithin(TimeSpan.FromSeconds(5));
```

### Return-value continuations

Awaiting certain assertions returns a strongly-typed value that can be used in
subsequent statements. This eliminates manual pattern-matching or unsafe casts after
assertions that verify a type or extract a single item.

```csharp
// Assert the type and capture a strongly-typed reference for further assertions
object shape = new Circle { Radius = 5.0 };
var circle = await Assert.That(shape).IsTypeOf<Circle>();
await Assert.That(circle.Radius).IsEqualTo(5.0);

// Assert that a collection has exactly one item and continue on the unwrapped instance
var user = await Assert.That(users).HasSingleItem();
await Assert.That(user.Name).IsEqualTo("Alice");

// Assert a predicate match and inspect the found item
var admin = await Assert.That(users).Contains(u => u.Role == "Admin");
await Assert.That(admin.Permissions).IsNotEmpty();
```

### Strong type safety

`Assert.That(subject)` is generic. Assertion methods on the resulting chain are typed to
the subject's compile-time type. Comparing an `int` subject to a `string` expected value
does not compile. Convert explicitly when types differ before asserting.

```csharp
int number = 42;

// ✅ Same type — compiles and asserts correctly
await Assert.That(number).IsEqualTo(42);

// ❌ Does not compile — int subject vs string expected
// await Assert.That(number).IsEqualTo("42");
```

### Custom single-value conditions with `.Satisfies()`

For ad-hoc conditions that have no built-in assertion method, use
`.Satisfies(predicate, description)`. The description string is included in the failure
message; write it as a statement of what was expected, not a restatement of the
predicate.

```csharp
await Assert.That(value).Satisfies(v => v % 2 == 0, "Value must be even");

// Map to a derived value and assert on it
await Assert.That(order)
    .Satisfies(o => o.Total, total => total > 100);
```

## Avoid

- **Never leave an `Assert.That(...)` call unawaited.** The test compiles and silently
  passes regardless of the actual value. The built-in analyzer flags this; do not
  suppress the warning.
- **Do not write non-async test methods** that call `Assert.That(...)`. Declare every
  asserting test method as `async Task`.
- **Do not use assertion method names from other frameworks** (`Assert.Equal`,
  `Assert.True`, `ThrowsAsync<T>`, `Should().Be()`, etc.). TUnit has no such overloads.
  Using them either fails to compile or imports unintended extension methods.
- **`ThrowsAsync<T>()` does not exist in TUnit.** For async delegates, pass the async
  lambda to `Assert.That(...)` and call `.Throws<T>()`. The standard `Throws<T>()`
  accepts both synchronous and asynchronous delegates.
- **Do not pre-await the delegate** before passing it to `Assert.That(...)` when you
  intend to assert on an exception. Pre-awaiting lets the exception escape before the
  assertion framework can capture it.

  ```csharp
  // ❌ Exception escapes before the assertion can capture it
  var result = await RiskyOperationAsync();
  await Assert.That(result)...;

  // ✅ Pass the unawaited delegate; the framework executes it
  await Assert.That(async () => await RiskyOperationAsync())
      .Throws<InvalidOperationException>();
  ```

- **Do not discard return values from continuation-supporting assertions** (`HasSingleItem`,
  predicate `Contains`, `IsTypeOf<T>`) when the unwrapped instance is needed later.
  Assign them to a named variable.

## Review checklist

- [ ] Every `Assert.That(...)` call is awaited.
- [ ] Every test method that asserts is `async Task` (or `async Task<T>`).
- [ ] No assertion method names from xUnit, NUnit, MSTest, or FluentAssertions appear
      (`Assert.Equal`, `Assert.True`, `ThrowsAsync<T>`, etc.).
- [ ] Async delegates are passed as unawaited lambdas to `Assert.That(...)`, not
      pre-awaited before the call.
- [ ] Return values from `HasSingleItem()`, predicate `Contains()`, and `IsTypeOf<T>()`
      are captured when the unwrapped instance is needed.
- [ ] Strong typing is respected; cross-type equality comparisons include an explicit
      conversion.
- [ ] `.Satisfies()` failure descriptions state the expected outcome, not the predicate
      expression.

## Related files

- [Value, collection, and async assertions](./assertions-value-collection-async.md) —
  full built-in assertion API surface.
- [Combining assertions and custom extensibility](./assertions-combining-custom.md) —
  `.And`, `.Or`, `Assert.Multiple()`, custom assertion authoring.
- [Assertions domain reference map](../references/assertions-map.md)
- [Lifecycle hooks rule](./lifecycle-hooks.md) — the async test model applies across the
  full lifecycle, not only inside test bodies.

## Source anchors

- [Assertions: Getting started](https://tunit.dev/docs/assertions/getting-started) —
  `Assert.That()` entry point, fluent syntax, type safety, common mistakes including the
  silent-pass pitfall.
- [Assertions: Awaiting](https://tunit.dev/docs/assertions/awaiting) — the await
  requirement, async delegate support, return-value continuations from awaited
  assertions.
- [Assertions: Getting started — Common mistakes](https://tunit.dev/docs/assertions/getting-started#common-mistakes)
  — unawaited assertion behavior, type confusion, sequential assertion failure hiding.
