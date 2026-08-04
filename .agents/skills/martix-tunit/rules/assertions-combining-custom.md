# TUnit combining and custom assertions

This rule covers how to aggregate multiple assertions in a single test scope using
`.And`, `.Or`, and `Assert.Multiple()`, and how to author custom assertions that
participate in the same chain. Read `assertions-fundamentals.md` before this rule.

## Purpose

Define the correct patterns for combining assertions on the same subject and for
extending TUnit's assertion chain with custom, project-specific assertion methods that
produce accurate failure messages and integrate cleanly with `.And`/`.Or` continuations.

## Default guidance

### `.And` — all conditions must pass

Use `.And` to chain multiple conditions on the same subject in a single awaited
expression. Every condition must pass; the first failing condition ends the chain. The
chain reads as a natural sentence and avoids repeating `Assert.That(...)` for each
check.

```csharp
await Assert.That(username)
    .IsNotNull()
    .And.IsNotEmpty()
    .And.Length().IsGreaterThan(3)
    .And.Length().IsLessThan(20);

await Assert.That(result)
    .IsNotNull()
    .And.IsPositive()
    .And.IsEqualTo(3);
```

### `.Or` — at least one condition must pass

Use `.Or` when any one of a known set of values or states is acceptable.

```csharp
await Assert.That(statusCode)
    .IsEqualTo(200)
    .Or.IsEqualTo(201)
    .Or.IsEqualTo(204);
```

`.And` and `.Or` can be mixed in a single chain. Conditions are evaluated left-to-right.

```csharp
await Assert.That(product.Price)
    .IsGreaterThan(0)
    .And.IsLessThan(10000);

await Assert.That(product.Status)
    .IsEqualTo(ProductStatus.Active)
    .Or.IsEqualTo(ProductStatus.Preview);
```

### `Assert.Multiple()` — collect all failures in a scope

By default, a failing assertion throws immediately and stops the test. `Assert.Multiple()`
creates a scope in which all assertions are evaluated regardless of individual failures.
When the scope exits, every accumulated failure is thrown as a single exception that
lists all violations together.

Use `Assert.Multiple()` when asserting multiple independent properties of the same
object or multiple unrelated values in the same test, so that all failures are visible in
a single run instead of requiring fix-one-rerun cycles.

**Explicit block scope** — failures are collected only inside the block:

```csharp
using (Assert.Multiple())
{
    await Assert.That(user.FirstName).IsEqualTo("John");
    await Assert.That(user.LastName).IsEqualTo("Doe");
    await Assert.That(user.Age).IsGreaterThan(18);
    await Assert.That(user.Email).IsNotNull();
}
// Scope exits here; all failures reported as one exception
```

**Implicit scope** — covers every assertion from the `using` declaration to the end of
the method:

```csharp
using var _ = Assert.Multiple();

await Assert.That(response.StatusCode).IsEqualTo(HttpStatusCode.OK);
await Assert.That(response.Content).IsNotNull();
await Assert.That(response.Headers).Contains("X-Request-Id");
```

Both forms are `IDisposable`. `Assert.Multiple()` collects failures from any awaited
assertions inside the scope, including those inside chained `.And`/`.Or` expressions.

### Authoring custom assertions

Custom TUnit assertions extend `IAssertionSource<T>` with extension methods that return
a new `Assertion<TValue>` subclass. This integrates the custom method into the standard
chain at any position — directly after `Assert.That(...)`, after `.And`, or after `.Or`.

#### Step 1 — Create the assertion class

Inherit from `Assertion<TValue>`. Implement:

- `CheckAsync(EvaluationMetadata<TValue> metadata)` — return `AssertionResult.Passed` or
  `AssertionResult.Failed(reason)`. Inspect `metadata.Exception` first; if it is non-null
  the subject could not be evaluated and the assertion should fail with that context.
- `GetExpectation()` — return a human-readable string describing what was expected. This
  string appears in failure messages.

```csharp
using TUnit.Assertions.Core;

public class IsEvenAssertion : Assertion<int>
{
    public IsEvenAssertion(AssertionContext<int> context) : base(context) { }

    protected override Task<AssertionResult> CheckAsync(EvaluationMetadata<int> metadata)
    {
        if (metadata.Exception is not null)
            return Task.FromResult(
                AssertionResult.Failed($"threw {metadata.Exception.GetType().Name}"));

        return metadata.Value % 2 == 0
            ? Task.FromResult(AssertionResult.Passed)
            : Task.FromResult(AssertionResult.Failed($"{metadata.Value} is not even"));
    }

    protected override string GetExpectation() => "to be an even number";
}
```

#### Step 2 — Create the extension method

Extend `IAssertionSource<T>` (not the concrete class or `Assert` directly). Call
`source.Context.ExpressionBuilder.Append(...)` before returning so the method call
appears in failure-message expression traces. Use `[CallerArgumentExpression]` on
parameters to capture argument expressions automatically.

```csharp
using System.Runtime.CompilerServices;
using TUnit.Assertions.Core;

public static class IntAssertionExtensions
{
    public static IsEvenAssertion IsEven(this IAssertionSource<int> source)
    {
        source.Context.ExpressionBuilder.Append(".IsEven()");
        return new IsEvenAssertion(source.Context);
    }
}
```

For an extension that takes a parameter, add `[CallerArgumentExpression]`:

```csharp
public static StringContainsAssertion ContainsIgnoreCase(
    this IAssertionSource<string> source,
    string expected,
    [CallerArgumentExpression(nameof(expected))] string? expression = null)
{
    source.Context.ExpressionBuilder.Append($".ContainsIgnoreCase({expression})");
    return new StringContainsAssertion(source.Context, expected, StringComparison.OrdinalIgnoreCase);
}
```

#### Step 3 — Use the custom assertion

Because the extension method returns `Assertion<T>`, `.And` and `.Or` work
automatically without any extra wiring.

```csharp
await Assert.That(value).IsEven();
await Assert.That(value).IsEven().And.IsGreaterThan(0);
```

### Type-converting (chaining) custom assertions

When an assertion transforms the subject type — for example, deserializing an
`HttpResponseMessage` into a `ProblemDetails` — use `context.Map<TTo>(transform)` in
the assertion class constructor. The continuation chain then operates on `TTo` instead
of `TFrom`. The transform can be synchronous or asynchronous.

```csharp
public class IsProblemDetailsAssertion : Assertion<ProblemDetails>
{
    public IsProblemDetailsAssertion(AssertionContext<HttpResponseMessage> context)
        : base(context.Map<ProblemDetails>(async response =>
            await response.Content.ReadFromJsonAsync<ProblemDetails>()
            ?? throw new InvalidOperationException("Response is not ProblemDetails")))
    { }

    protected override Task<AssertionResult> CheckAsync(EvaluationMetadata<ProblemDetails> metadata)
        => metadata.Exception is null
            ? Task.FromResult(AssertionResult.Passed)
            : Task.FromResult(AssertionResult.Failed(metadata.Exception.Message));

    protected override string GetExpectation() =>
        "HTTP response to be in Problem Details format";
}

// Extension method on the source type
public static class HttpResponseAssertionExtensions
{
    public static IsProblemDetailsAssertion IsProblemDetails(
        this IAssertionSource<HttpResponseMessage> source)
    {
        source.Context.ExpressionBuilder.Append(".IsProblemDetails()");
        return new IsProblemDetailsAssertion(source.Context);
    }
}
```

After calling `.IsProblemDetails()`, subsequent calls in the chain use assertions typed
to `ProblemDetails`:

```csharp
await Assert.That(response)
    .IsProblemDetails()
    .And.HasTitle("Invalid Authentication Token")
    .And.HasDetail("No token provided");
```

### When to use `.And` chain vs `Assert.Multiple()`

| Scenario | Use |
| --- | --- |
| Multiple conditions on the same value in a single fluent expression | `.And` chain |
| Multiple independent assertions on different properties or values | `Assert.Multiple()` |
| All failures must be collected and reported together | `Assert.Multiple()` |
| First-fail is acceptable and the expression reads clearly | `.And` chain |

## Avoid

- **Do not write multiple separate `Assert.That(...)` calls for related properties
  without `Assert.Multiple()`** when you need all failures reported. The first failure
  will stop the test and hide the others.
- **Do not confuse `.And` (fail-fast on first failing condition) with
  `Assert.Multiple()` (collect all failures).** They serve different purposes.
- **Do not extend the concrete assertion class** or `Assert` directly. Always extend
  `IAssertionSource<T>` so the method participates in all chain positions (`.And`,
  `.Or`, and after `Assert.That(...)`).
- **Do not skip `source.Context.ExpressionBuilder.Append(...)`** in the extension
  method. Without it, failure messages will not include the custom method call in the
  expression trace, making failures harder to diagnose.
- **Do not perform the type conversion inside `CheckAsync`**. Use `context.Map<TTo>(transform)`
  in the constructor so the framework handles the evaluation context correctly.
- **Do not return bare boolean values from `CheckAsync`.** Return `AssertionResult.Passed`
  or `AssertionResult.Failed(reason)` with a non-empty reason string describing the
  discrepancy.
- **Do not forget to inspect `metadata.Exception` in `CheckAsync`** before accessing
  `metadata.Value`. If the subject threw during evaluation, `metadata.Value` may be
  default; check the exception path first.

## Review checklist

- [ ] `.And` is used when all conditions must hold on the same subject in a single
      awaited expression.
- [ ] `.Or` is used when any one of a fixed set of values or states is acceptable.
- [ ] `Assert.Multiple()` wraps independent assertions on multiple properties or values
      so all failures are visible together.
- [ ] The correct scope form is chosen: explicit `using (...) { }` block for a
      sub-scope, implicit `using var _ =` for the whole method tail.
- [ ] Custom assertion classes inherit from `Assertion<TValue>` and implement both
      `CheckAsync` and `GetExpectation`.
- [ ] Extension methods target `IAssertionSource<T>`.
- [ ] `source.Context.ExpressionBuilder.Append(...)` is called in every extension
      method before returning the assertion instance.
- [ ] `[CallerArgumentExpression]` is applied to expression-captured parameters.
- [ ] Type-converting assertions use `context.Map<TTo>(transform)` in the constructor,
      not inside `CheckAsync`.
- [ ] `CheckAsync` inspects `metadata.Exception` before accessing `metadata.Value`.

## Related files

- [Assertion fundamentals](./assertions-fundamentals.md) — await requirement, entry
  point, type safety.
- [Value, collection, and async assertions](./assertions-value-collection-async.md) —
  built-in assertion API surface.
- [Assertions domain reference map](../references/assertions-map.md)
- [Extension points rule](./extending-extension-points.md) — broader TUnit extension
  model beyond assertions.

## Source anchors

- [Assertions: Combining assertions](https://tunit.dev/docs/assertions/combining-assertions)
  — `.And`, `.Or`, `Assert.Multiple()` implicit and explicit scopes.
- [Assertions: Custom assertions](https://tunit.dev/docs/assertions/extensibility/custom-assertions)
  — `Assertion<TValue>`, `IAssertionSource<T>`, `CheckAsync`, `GetExpectation`,
  `AssertionResult`, `[CallerArgumentExpression]`.
- [Assertions: Extensibility — chaining and converting](https://tunit.dev/docs/assertions/extensibility/extensibility-chaining-and-converting)
  — type-converting assertions, `context.Map<TTo>()`, continuation chain after a type
  change.
- [Assertions: Awaiting — return values](https://tunit.dev/docs/assertions/awaiting#using-return-values-from-awaited-assertions)
  — continuation return values from built-in assertions that interact with `.And`/`.Or`
  chains.
