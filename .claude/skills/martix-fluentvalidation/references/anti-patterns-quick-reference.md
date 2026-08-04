# FluentValidation anti-patterns quick reference

## Purpose

Use this page to spot common FluentValidation mistakes quickly, then return to
the linked rules for the full review contract.

## Quick table

| Anti-pattern | Prefer instead | Primary rule |
| --- | --- | --- |
| New MVC auto-validation in fresh ASP.NET Core code | Manual validation first, or a deliberate async-capable filter strategy | [ASP.NET Core integration](../rules/integration-aspnet-core.md) |
| Registering validators only by concrete type | Register and resolve validators as `IValidator<T>` | [DI registration and discovery](../rules/integration-di-registration.md) |
| Calling `Validate(...)` on a validator that has async rules or conditions | Call `ValidateAsync(model, cancellationToken)` and keep the boundary async | [Async validation integration](../rules/integration-async-validation.md) |
| Blocking on validation with `.Result`, `.Wait()`, or `.GetAwaiter().GetResult()` | Keep validation async end to end and pass the real `CancellationToken` | [Async validation integration](../rules/integration-async-validation.md) |
| Testing validator internals or mocking rule chains | Treat validators as black boxes with `TestValidate` / `TestValidateAsync` | [Validator test helpers](../rules/testing-validator-testhelper.md) |
| Re-asserting every rule through controllers or HTTP tests | Keep rule checks in validator tests and boundary translation in integration tests | [Testing integration boundaries](../rules/testing-integration-boundaries.md) |
| Using `ErrorCode` as display text | Keep `ErrorCode` stable and machine-readable; use messages for user text | [Severity, error codes, and custom state](../rules/runtime-severity-error-codes-state.md) |
| Downgrading real failures to `Warning` just to reduce operational impact | Keep the default `Error` severity unless a documented warning contract exists | [Severity, error codes, and custom state](../rules/runtime-severity-error-codes-state.md) |
| Moving to FluentValidation 12 before the solution is on .NET 8 | Stay on 11.x until the runtime baseline and deprecated API cleanup are ready | [Current upgrade baseline](../rules/upgrade-current-baseline.md) |
| Carrying `StopOnFirstFailure` or old test-helper APIs into current upgrades | Replace deprecated APIs during the staged migration | [Breaking changes history](../rules/upgrade-breaking-changes-history.md) |

## Integration workstream

Avoid hiding validator wiring behind concrete-only registration or treating
legacy MVC auto-validation as the current default.

```csharp
// Wrong
builder.Services.AddScoped<PersonValidator>();
builder.Services.AddControllers()
    .AddFluentValidationAutoValidation();

// Better
builder.Services.AddScoped<IValidator<Person>, PersonValidator>();

app.MapPost("/people", async (
    Person person,
    IValidator<Person> validator,
    CancellationToken cancellationToken) =>
{
    var result = await validator.ValidateAsync(person, cancellationToken);
    return result.IsValid
        ? Results.Created($"/people/{person.Id}", person)
        : Results.ValidationProblem(result.ToDictionary());
});
```

Start with
[ASP.NET Core integration](../rules/integration-aspnet-core.md) and
[DI registration and discovery](../rules/integration-di-registration.md).

## Async workstream

Async rules change the application contract. Once a validator uses
`MustAsync`, `CustomAsync`, or `WhenAsync`, the caller must switch to
`ValidateAsync(...)`.

```csharp
// Wrong
var result = validator.Validate(request);
var isValid = validator.ValidateAsync(request, CancellationToken.None).Result.IsValid;

// Better
var result = await validator.ValidateAsync(request, cancellationToken);
if (!result.IsValid)
{
    return Results.ValidationProblem(result.ToDictionary());
}
```

Start with
[Async validation integration](../rules/integration-async-validation.md).

## Testing workstream

Validator tests and application-boundary tests have different jobs. Do not
replace black-box validator tests with mocks, and do not turn every HTTP test
into a second copy of the validator suite.

```csharp
// Wrong
var descriptor = validator.CreateDescriptor();
Assert.True(descriptor.GetValidatorsForMember(nameof(Person.Name)).Any());

// Better
var result = validator.TestValidate(new Person { Name = "" });

result.ShouldHaveValidationErrorFor(x => x.Name)
    .Only();
```

When a higher-level test truly needs an `IValidator<T>` substitute, use an
intentional `InlineValidator<T>` stub instead of a generic mocking setup. Route
back to
[Validator test helpers](../rules/testing-validator-testhelper.md) and
[Testing integration boundaries](../rules/testing-integration-boundaries.md).

## Runtime metadata workstream

Treat severity, error codes, and custom state as machine-readable contracts, not
as presentation shortcuts.

```csharp
// Wrong
RuleFor(x => x.CustomerId)
    .NotEmpty()
    .WithErrorCode("CustomerId is required")
    .WithSeverity(Severity.Warning)
    .WithState(_ => new { RawPayload = "raw-json", Secret = "top-secret" });

// Better
RuleFor(x => x.CustomerId)
    .NotEmpty()
    .WithErrorCode("customer.required")
    .WithSeverity(Severity.Error)
    .WithState(_ => new { Category = "Customer", Hint = "ProvideExistingCustomerId" });
```

Start with
[Severity, error codes, and custom state](../rules/runtime-severity-error-codes-state.md).

## Upgrade workstream

Upgrade guidance is about runtime viability and deprecated API removal, not just
the newest package version.

```csharp
// Wrong
AbstractValidator.CascadeMode = CascadeMode.StopOnFirstFailure;
ValidatorOptions.Global.CascadeMode = CascadeMode.StopOnFirstFailure;

// Better
ClassLevelCascadeMode = CascadeMode.Continue;
RuleLevelCascadeMode = CascadeMode.Stop;
ValidatorOptions.Global.DefaultRuleLevelCascadeMode = CascadeMode.Stop;
```

Also avoid recommending FluentValidation 12 while the solution still targets
frameworks below .NET 8. Start with
[Current upgrade baseline](../rules/upgrade-current-baseline.md) and
[Breaking changes history](../rules/upgrade-breaking-changes-history.md).

## Related files

- [Web bootstrap recipes](./web-bootstrap-recipes.md)
- [Testing bootstrap recipes](./testing-bootstrap-recipes.md)
- [Integration map](./integration-map.md)
- [Testing map](./testing-map.md)
- [Runtime metadata map](./runtime-metadata-map.md)
- [Upgrade map](./upgrade-map.md)

## Source anchors

- [FluentValidation ASP.NET integration](https://docs.fluentvalidation.net/en/latest/aspnet.html)
- [FluentValidation dependency injection](https://docs.fluentvalidation.net/en/latest/di.html)
- [FluentValidation async validation](https://docs.fluentvalidation.net/en/latest/async.html)
- [FluentValidation testing](https://docs.fluentvalidation.net/en/latest/testing.html)
- [FluentValidation severity](https://docs.fluentvalidation.net/en/latest/severity.html)
- [FluentValidation custom error codes](https://docs.fluentvalidation.net/en/latest/error-codes.html)
- [FluentValidation custom state](https://docs.fluentvalidation.net/en/latest/custom-state.html)
- [Upgrading to 12](https://docs.fluentvalidation.net/en/latest/upgrading-to-12.html)
- [Upgrading to 11](https://docs.fluentvalidation.net/en/latest/upgrading-to-11.html)

## Maintenance notes

- Keep this page short and smell-test oriented. Add an entry only when the same
  mistake recurs across multiple rules or reviews.
- Put nuance in the owning rule first, then link the distilled anti-pattern here.
- Keep legacy and ecosystem guidance clearly labeled so manual validation remains
  the visible default.
