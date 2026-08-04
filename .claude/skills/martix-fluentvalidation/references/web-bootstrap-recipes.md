# FluentValidation web bootstrap recipes

## Purpose

Use these recipes for copy-ready FluentValidation web integration, then return
to the linked rules for deeper review and trade-offs.

## Start with these routes

- [ASP.NET Core integration](../rules/integration-aspnet-core.md)
- [DI registration and discovery](../rules/integration-di-registration.md)
- [Async validation integration](../rules/integration-async-validation.md)
- [Integration map](./integration-map.md)
- [Anti-patterns quick reference](./anti-patterns-quick-reference.md)

## DI registration baseline

Register validators as `IValidator<T>`, then inject them at the application
boundary.

```csharp
using FluentValidation;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

// Choose one registration strategy per validator set.

// Explicit registration
builder.Services.AddScoped<IValidator<CreateOrderRequest>, CreateOrderRequestValidator>();
```

Prefer `Scoped` or `Transient` lifetimes unless you have a specific reason to
prove singleton safety.

If validators are a known convention in the target assembly, swap the explicit
line for assembly scanning instead:

```csharp
builder.Services.AddValidatorsFromAssemblyContaining<CreateOrderRequestValidator>();
```

## Controller manual validation

Manual validation is the default path for new ASP.NET Core work because it keeps
the trigger visible and supports async rules.

```csharp
using FluentValidation;
using FluentValidation.Results;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;

[ApiController]
[Route("orders")]
public sealed class OrdersController : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateOrderRequest request,
        [FromServices] IValidator<CreateOrderRequest> validator,
        [FromServices] IOrdersService service,
        CancellationToken cancellationToken)
    {
        ValidationResult result =
            await validator.ValidateAsync(request, cancellationToken);

        if (!result.IsValid)
        {
            result.AddToModelState(ModelState);
            return ValidationProblem(ModelState);
        }

        var order = await service.CreateAsync(request, cancellationToken);
        return Created($"/orders/{order.Id}", order);
    }
}

public static class ValidationResultExtensions
{
    public static void AddToModelState(
        this ValidationResult result,
        ModelStateDictionary modelState)
    {
        foreach (var error in result.Errors)
        {
            modelState.AddModelError(error.PropertyName, error.ErrorMessage);
        }
    }
}
```

Use `ValidationProblem(ModelState)` for API-style responses or return the view
with populated `ModelState` when the boundary is MVC or Razor Pages UI.

## Minimal API manual validation

Keep Minimal API validation explicit unless the application has deliberately
standardized on endpoint filters.

```csharp
using FluentValidation;
using FluentValidation.Results;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddValidatorsFromAssemblyContaining<CreateOrderRequestValidator>();
builder.Services.AddScoped<IOrdersService, OrdersService>();

var app = builder.Build();

app.MapPost("/orders", async (
    CreateOrderRequest request,
    IValidator<CreateOrderRequest> validator,
    IOrdersService service,
    CancellationToken cancellationToken) =>
{
    ValidationResult result =
        await validator.ValidateAsync(request, cancellationToken);

    if (!result.IsValid)
    {
        return Results.ValidationProblem(result.ToDictionary());
    }

    var order = await service.CreateAsync(request, cancellationToken);
    return Results.Created($"/orders/{order.Id}", order);
});

app.Run();
```

In FluentValidation 11.1 and later, `ValidationResult.ToDictionary()` is built
in. For older versions, add the helper below.

## `ValidationProblem` dictionary helper for older versions

```csharp
using FluentValidation.Results;

public static class ValidationResultExtensions
{
    public static IDictionary<string, string[]> ToDictionary(
        this ValidationResult result)
    {
        return result.Errors
            .GroupBy(error => error.PropertyName)
            .ToDictionary(
                group => group.Key,
                group => group.Select(error => error.ErrorMessage).ToArray());
    }
}
```

Use this helper with `Results.ValidationProblem(...)` when the package version
predates the built-in `ToDictionary()` method.

## Async validation with `CancellationToken`

Pass the boundary token into `ValidateAsync(...)`, and let async rules forward it
to any external dependency they call.

```csharp
public sealed class CreateOrderRequestValidator
    : AbstractValidator<CreateOrderRequest>
{
    public CreateOrderRequestValidator(ICustomerDirectory customers)
    {
        RuleFor(x => x.CustomerId)
            .NotEmpty()
            .MustAsync((customerId, cancellationToken) =>
                customers.ExistsAsync(customerId, cancellationToken))
            .WithMessage("CustomerId must refer to an existing customer.");
    }
}

app.MapPost("/orders", async (
    CreateOrderRequest request,
    IValidator<CreateOrderRequest> validator,
    CancellationToken cancellationToken) =>
{
    var result = await validator.ValidateAsync(request, cancellationToken);
    return result.IsValid
        ? Results.Ok()
        : Results.ValidationProblem(result.ToDictionary());
});
```

Do not switch back to `Validate(...)`, and do not replace the real request token
with `CancellationToken.None`.

## Legacy MVC auto-validation is legacy-only

Use this path only when maintaining inherited MVC or Razor Pages code that
already depends on the unsupported `FluentValidation.AspNetCore` package.

```csharp
// Legacy migration only. Do not use as the default for new projects.
builder.Services.AddControllers();
builder.Services.AddScoped<IValidator<CreateOrderRequest>, CreateOrderRequestValidator>();
builder.Services.AddFluentValidationAutoValidation();
```

- This path is MVC-only and does not apply to Minimal APIs or Blazor.
- It is not asynchronous, so async validators are the wrong fit.
- The official docs no longer recommend it for new projects.

Prefer manual validation first. If the team intentionally wants automatic
validation with async support, route that decision through the integration rule
and its clearly labeled ecosystem options.

## Related files

- [Anti-patterns quick reference](./anti-patterns-quick-reference.md)
- [Testing bootstrap recipes](./testing-bootstrap-recipes.md)
- [ASP.NET Core integration](../rules/integration-aspnet-core.md)
- [DI registration and discovery](../rules/integration-di-registration.md)
- [Async validation integration](../rules/integration-async-validation.md)

## Source anchors

- [FluentValidation ASP.NET integration](https://docs.fluentvalidation.net/en/latest/aspnet.html)
- [FluentValidation dependency injection](https://docs.fluentvalidation.net/en/latest/di.html)
- [FluentValidation async validation](https://docs.fluentvalidation.net/en/latest/async.html)
- [FluentValidation.AspNetCore legacy package](https://github.com/FluentValidation/FluentValidation.AspNetCore)

## Maintenance notes

- Keep this file focused on boundary wiring and failure translation, not on
  general ASP.NET Core architecture.
- Keep manual validation as the visible default, then label legacy or ecosystem
  automation paths explicitly.
- Prefer short, copy-ready recipes that can be pasted into `Program.cs`,
  controllers, or endpoints and then adapted locally.
