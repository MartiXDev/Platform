# TUnit value, collection, and async assertions

This rule covers the full built-in assertion surface for values, strings, collections,
task state and completion, and exception-throwing delegates. Read
`assertions-fundamentals.md` first; this rule does not repeat the await requirement or
the async model.

## Purpose

Provide the complete reference for TUnit's built-in assertion methods — equality,
comparison, null, boolean, numeric, string, type, collection, member, exception, and
task-state assertions — so that the correct method is always chosen without reaching for
xUnit or NUnit equivalents.

## Default guidance

### Equality and comparison

```csharp
await Assert.That(actual).IsEqualTo(expected);
await Assert.That(value).IsNotEqualTo(other);
await Assert.That(score).IsGreaterThan(70);
await Assert.That(score).IsGreaterThanOrEqualTo(70);
await Assert.That(age).IsLessThan(100);
await Assert.That(age).IsLessThanOrEqualTo(100);
await Assert.That(temperature).IsBetween(20, 30);
await Assert.That(temperature).IsPositive();
await Assert.That(temperature).IsNegative();
```

### Null and default

```csharp
await Assert.That(result).IsNull();
await Assert.That(result).IsNotNull();
await Assert.That(optional).IsDefault();
await Assert.That(optional).IsNotDefault();
```

### Boolean

```csharp
await Assert.That(isValid).IsTrue();
await Assert.That(isValid).IsFalse();
```

### Numeric with tolerance

For floating-point comparisons, chain `.Within(tolerance)` after `.IsEqualTo(...)`.

```csharp
await Assert.That(3.14159).IsEqualTo(Math.PI).Within(0.001);
await Assert.That(score).IsBetween(0, 100);
await Assert.That(temperature).IsGreaterThanOrEqualTo(32.0);
```

### String

```csharp
await Assert.That(message).Contains("Hello");
await Assert.That(message).DoesNotContain("Error");
await Assert.That(filename).StartsWith("test_");
await Assert.That(filename).EndsWith(".csv");
await Assert.That(email).Matches(@"^[\w\.-]+@[\w\.-]+\.\w+$");
await Assert.That(input).IsEmpty();
await Assert.That(input).IsNotEmpty();
```

`.Matches(pattern)` is **string-only**. Do not apply it to non-string types. For
case-insensitive matching within exception messages see `.WithMessageContaining(...).IgnoringCase()`.

### Type assertions

```csharp
// Exact type match; returns a strongly-typed reference
var circle = await Assert.That(shape).IsTypeOf<Circle>();
await Assert.That(circle.Radius).IsEqualTo(5.0);

// Type or subtype
await Assert.That(obj).IsAssignableTo<Animal>();
await Assert.That(typeof(Dog)).IsAssignableTo<Animal>();
```

`IsTypeOf<T>()` returns the typed instance. Capture it when you need to continue
asserting on type-specific members.

### Collection assertions

TUnit collection assertions work on any `IEnumerable<T>`.

```csharp
var numbers = new[] { 1, 2, 3, 4, 5 };

// Membership
await Assert.That(numbers).Contains(3);
await Assert.That(numbers).DoesNotContain(10);

// Predicate membership — returns the matched item for further assertions
var admin = await Assert.That(users).Contains(u => u.Role == "Admin");
await Assert.That(admin.Permissions).IsNotEmpty();

// Count
await Assert.That(numbers).Count().IsEqualTo(5);
await Assert.That(numbers).Count().IsGreaterThan(3);
// Count items matching an assertion predicate
await Assert.That(numbers).Count(item => item.IsGreaterThan(2)).IsEqualTo(3);

// Emptiness
await Assert.That(list).IsEmpty();
await Assert.That(list).IsNotEmpty();

// Single-item extraction — returns the item for further assertions
var user = await Assert.That(users).HasSingleItem();
await Assert.That(user.Name).IsEqualTo("Alice");

// All / Any predicates
await Assert.That(numbers).All(n => n > 0);
await Assert.That(numbers).Any(n => n > 4);

// Ordering
await Assert.That(numbers).IsInOrder();              // ascending
await Assert.That(numbers).IsInDescendingOrder();    // descending

// Equivalence — same items, any order
await Assert.That(actual).IsEquivalentTo(expected);

// Distinct items
await Assert.That(items).HasDistinctItems();
```

**Order sensitivity:** use `IsEquivalentTo()` instead of `IsEqualTo()` when element
order is not guaranteed, for example with database query results or hash-set outputs.
`IsEqualTo()` on collections checks order.

### Member assertions

`.Member(selector, innerAssertions)` asserts on a specific property of the subject and
returns context back to the parent object, so subsequent `.And.Member(...)` calls all
operate on the original subject rather than the property value.

```csharp
await Assert.That(user)
    .IsNotNull()
    .And.Member(u => u.Email, email => email.IsEqualTo("alice@example.com"))
    .And.Member(u => u.Age, age => age.IsGreaterThan(18))
    .And.Member(u => u.Roles, roles => roles.Contains("Admin"));
```

Nested properties work without flattening the selector:

```csharp
await Assert.That(order)
    .Member(o => o.Customer.Address.City, city => city.IsEqualTo("Seattle"))
    .And.Member(o => o.Customer.Address.ZipCode, zip => zip.Matches(@"^\d{5}$"));
```

`.Member()` also works with `.Or`:

```csharp
await Assert.That(product)
    .Member(p => p.Status, s => s.IsEqualTo(ProductStatus.Active))
    .Or.Member(p => p.Status, s => s.IsEqualTo(ProductStatus.Preview));
```

### Exception assertions

Use `Assert.That(delegate).Throws<TException>()` for both synchronous and asynchronous
delegates. **There is no `ThrowsAsync<T>()` method in TUnit.** Pass the async lambda
unawaited; the framework executes it internally.

```csharp
// Synchronous delegate
await Assert.That(() => int.Parse("not a number"))
    .Throws<FormatException>();

// Async delegate — pass the lambda, do not pre-await it
await Assert.That(async () => await RiskyOperationAsync())
    .Throws<InvalidOperationException>();

// Exact type — subclasses are not accepted
await Assert.That(() => throw new ArgumentNullException())
    .ThrowsExactly<ArgumentNullException>();

// Runtime type — when the type is only known at runtime
await Assert.That(() => throw new InvalidOperationException())
    .Throws(typeof(InvalidOperationException));

// Assert that no exception is thrown
await Assert.That(() => int.Parse("42"))
    .ThrowsNothing();
await Assert.That(async () => await SuccessfulOperationAsync())
    .ThrowsNothing();
```

#### Exception message and property chaining

After `.Throws<T>()` or `.ThrowsExactly<T>()`, the chain exposes message and property
assertions. These can be combined freely.

```csharp
// Exact message
await Assert.That(() => throw new InvalidOperationException("Operation failed"))
    .Throws<InvalidOperationException>()
    .WithMessage("Operation failed");

// Substring in message
await Assert.That(() => throw new ArgumentException("The 'userId' is invalid"))
    .Throws<ArgumentException>()
    .WithMessageContaining("userId");

// Case-insensitive substring
await Assert.That(() => throw new Exception("ERROR: Failed"))
    .Throws<Exception>()
    .WithMessageContaining("error")
    .IgnoringCase();

// Message does not contain a substring
await Assert.That(() => throw new Exception("User error"))
    .Throws<Exception>()
    .WithMessageNotContaining("system");

// Wildcard pattern
await Assert.That(() => throw new Exception("Error code: 12345"))
    .Throws<Exception>()
    .WithMessageMatching("Error code: *");

// ArgumentException parameter name (ArgumentException and subclasses only)
await Assert.That(() => ValidateUser(null!))
    .Throws<ArgumentNullException>()
    .WithParameterName("user");

// Combine parameter name and message
await Assert.That(() => SetAge(-1))
    .Throws<ArgumentOutOfRangeException>()
    .WithParameterName("age")
    .WithMessageContaining("must be positive");
```

#### Capturing the thrown exception for further inspection

`Assert.That(delegate).Throws<T>()` returns the exception instance so you can assert on
its properties after capturing the result of the `await`.

```csharp
var exception = await Assert.That(() => ParallelOperationAsync())
    .Throws<AggregateException>();

await Assert.That(exception.InnerExceptions).Count().IsEqualTo(3);
await Assert.That(exception.InnerExceptions).All(e => e is TaskCanceledException);
```

#### Inner exception chaining

`.WithInnerException()` drills into the inner exception. The chain can then call
`.Throws<T>()` again to assert the inner exception type.

```csharp
await Assert.That(() => ThrowWithInner())
    .Throws<InvalidOperationException>()
    .WithInnerException()
    .Throws<FormatException>();
```

### Task-state and async-completion assertions

Assert directly on `Task` or `Task<T>` objects for state checks and timeout
verification.

```csharp
// Task state
await Assert.That(task).IsCompleted();
await Assert.That(task).IsNotCompleted();
await Assert.That(task).IsCanceled();
await Assert.That(task).IsNotCanceled();
await Assert.That(task).IsFaulted();
await Assert.That(task).IsNotFaulted();
await Assert.That(task).IsCompletedSuccessfully();    // .NET 6+
await Assert.That(task).IsNotCompletedSuccessfully(); // .NET 6+

// Completion within a time limit
await Assert.That(task).CompletesWithin(TimeSpan.FromSeconds(5));

// Async delegate timeout check
await Assert.That(async () => await LongRunningOperationAsync())
    .CompletesWithin(TimeSpan.FromSeconds(5));
```

For `Task<T>`, await the task first to obtain the result, then assert on the value:

```csharp
var result = await GetValueAsync();
await Assert.That(result).IsEqualTo(42);
```

## Avoid

- **Do not use `ThrowsAsync<T>()`** — it does not exist in TUnit. For async delegates,
  pass the async lambda to `Assert.That(...)` and call `.Throws<T>()`.
- **Do not pre-await the delegate** before passing it to `Assert.That(...)` when
  asserting on an exception. Pre-awaiting lets the exception escape before the framework
  can capture it.

  ```csharp
  // ❌ Exception already escaped; assertion cannot catch it
  var result = await RiskyOperationAsync();

  // ✅ Pass the unawaited delegate
  await Assert.That(async () => await RiskyOperationAsync())
      .Throws<InvalidOperationException>();
  ```

- **Do not apply `.Matches(pattern)` to non-string types.** It is a string-only method.
- **Do not use `IsEqualTo()` on unordered collections** when element order is not
  guaranteed. Use `IsEquivalentTo()`.
- **Do not call `.WithParameterName()`** on non-`ArgumentException` subtypes. It is
  scoped to `ArgumentException` and its subclasses.
- **Do not assert `Task<T>` state when you need the result value.** Await the task first,
  then assert the value separately.
- **Do not discard the return value of `HasSingleItem()`** or predicate `Contains()` when
  you need to inspect the extracted item. Capture it into a named variable.
- **Do not forget `IsEquivalentTo()` vs `IsEqualTo()` for collections.** `IsEqualTo()`
  checks element order; `IsEquivalentTo()` does not.

## Review checklist

- [ ] Exception assertions use `.Throws<T>()` (not `ThrowsAsync<T>()`); async delegates
      are passed as unawaited lambdas.
- [ ] `.Matches(pattern)` is used only on string subjects.
- [ ] `.Within(tolerance)` is present on floating-point equality comparisons where
      rounding matters.
- [ ] `IsEquivalentTo()` is used instead of `IsEqualTo()` when collection element order
      is not significant.
- [ ] `.Member(...)` is used instead of extracting properties manually when multiple
      member checks are chained on the same object.
- [ ] Return values from `HasSingleItem()` and predicate `Contains()` are captured when
      the extracted item is needed.
- [ ] Exception chain methods (`.WithMessage()`, `.WithMessageContaining()`,
      `.WithParameterName()`) follow `.Throws<T>()` or `.ThrowsExactly<T>()`.
- [ ] `.WithParameterName()` is used only on `ArgumentException` and subclasses.
- [ ] Task-state assertions directly target a `Task` or `Task<T>` object; `Task<T>`
      results are awaited before value assertions.

## Related files

- [Assertion fundamentals](./assertions-fundamentals.md) — await requirement, async
  model, type safety, `Assert.That()` entry point.
- [Combining assertions and custom extensibility](./assertions-combining-custom.md) —
  `.And`, `.Or`, `Assert.Multiple()`, custom assertion authoring.
- [Assertions domain reference map](../references/assertions-map.md)

## Source anchors

- [Assertions: Exceptions](https://tunit.dev/docs/assertions/exceptions) —
  `Throws<T>()`, `ThrowsExactly<T>()`, `ThrowsNothing()`, `.WithMessage()`,
  `.WithMessageContaining()`, `.WithMessageNotContaining()`, `.WithMessageMatching()`,
  `.WithParameterName()`, `.WithInnerException()`.
- [Assertions: Tasks and async](https://tunit.dev/docs/assertions/tasks-and-async) —
  task-state assertions, `CompletesWithin()`, async delegate assertions.
- [Assertions: Getting started](https://tunit.dev/docs/assertions/getting-started) —
  equality, comparison, null, boolean, string, collection, and type assertion overview.
- [Assertions: Collections](https://tunit.dev/docs/assertions/collections) — full
  collection assertion API including count, ordering, equivalence, and predicate
  membership.
- [Assertions: Member assertions](https://tunit.dev/docs/assertions/member-assertions) —
  `.Member()` syntax, nested property access, `.Or` usage.
- [Assertions: Awaiting — return values](https://tunit.dev/docs/assertions/awaiting#using-return-values-from-awaited-assertions)
  — continuation return values from `HasSingleItem()`, predicate `Contains()`, and
  `IsTypeOf<T>()`.
