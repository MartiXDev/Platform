## Exceptions, validation, and failure contracts

### Purpose

Define how .NET code should reject invalid input, surface failures, and
preserve useful context without swallowing errors.

### Default guidance

- Validate caller input early with precise exception types such as
  `ArgumentException`, `ArgumentNullException`, or
  `ArgumentOutOfRangeException`; use `InvalidOperationException` for invalid
  object or workflow state.
- Use guard clauses to fail fast and keep the happy path small.
- Make the public failure contract explicit: throw for caller misuse or invalid
  state, and return validation results or `Try*` outcomes for expected
  rejection paths.
- Throw only when the caller cannot reasonably continue; otherwise consider
  `Try*` patterns, validation results, or domain-specific error objects.
- Log failures with structured context and let the exception bubble unless the
  layer can add meaningful handling.

```csharp
// Wrong: false hides whether the failure was validation or infrastructure.
public Task<bool> CreateAsync(CreateOrder command, CancellationToken cancellationToken);

// Better: guard bad caller input and return an explicit validation outcome.
public async Task<CreateOrderResult> CreateAsync(
    CreateOrder command,
    CancellationToken cancellationToken)
{
    ArgumentNullException.ThrowIfNull(command);

    if (string.IsNullOrWhiteSpace(command.CustomerId))
    {
        return CreateOrderResult.Validation(
            "CustomerId",
            "CustomerId is required.");
    }

    await _repository.SaveAsync(command, cancellationToken);
    return CreateOrderResult.Success();
}
```

### Avoid

- Do not throw or catch base `Exception` unless the framework contract requires
  it.
- Do not hide failures in silent catch blocks or ambiguous boolean results.
- Do not return `false` or `null` when callers need to distinguish validation,
  missing data, and infrastructure failure.
- Do not use exceptions for routine control flow in hot or expected paths.

### Review checklist

- Guard clauses cover null, whitespace, range, and invalid state where the
  contract demands it.
- Method signatures make expected rejection versus exceptional failure obvious.
- Exception types and messages are specific enough for callers and logs.
- Tests assert precise failure behavior for public APIs and key domain rules.

### Related files

- [Nullability guidance](./lang-nullability.md)
- [Testing guidance](./testing-unit-integration.md)
- [Design source map](../references/design-map.md)

### Source anchors

- [Best practices for exceptions](https://learn.microsoft.com/en-us/dotnet/standard/exceptions/best-practices-for-exceptions)
- [Design guidelines for exceptions](https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/exceptions)
- [Project brief](../../../docs/martix-dotnet-csharp/martix-dotnet-csharp.md)
