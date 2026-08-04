# FluentValidation testing bootstrap recipes

## Purpose

Use these recipes for copy-ready validator and boundary tests, then return to
the linked rules for the full testing contract.

## Start with these routes

- [Validator test helpers](../rules/testing-validator-testhelper.md)
- [Testing integration boundaries](../rules/testing-integration-boundaries.md)
- [Async validation integration](../rules/integration-async-validation.md)
- [Testing map](./testing-map.md)
- [Anti-patterns quick reference](./anti-patterns-quick-reference.md)

## Use this test layer when

| Need to prove | Prefer this test | Start with |
| --- | --- | --- |
| A validator rejects or accepts a model correctly | Direct validator test with `TestValidate` | [Validator test helpers](../rules/testing-validator-testhelper.md) |
| A validator with async rules behaves correctly | Direct validator test with `TestValidateAsync` | [Async validation integration](../rules/integration-async-validation.md) |
| The app turns failures into `ModelState`, `ValidationProblem`, or HTTP `400` responses | Boundary or integration test through the real entrypoint | [Testing integration boundaries](../rules/testing-integration-boundaries.md) |
| A higher-level test needs an `IValidator<T>` substitute | `InlineValidator<T>` as an intentional stub | [Testing integration boundaries](../rules/testing-integration-boundaries.md) |

## Direct validator test with `TestValidate`

Use the real validator and assert on the observable failures it emits.

```csharp
using FluentValidation.TestHelper;
using Xunit;

public sealed class CreateOrderRequestValidatorTests
{
    private readonly CreateOrderRequestValidator _validator = new();

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Total_must_be_greater_than_zero(decimal total)
    {
        var model = new CreateOrderRequest("customer-123", total);

        var result = _validator.TestValidate(model);

        result.ShouldHaveValidationErrorFor(x => x.Total)
            .WithErrorCode("GreaterThanValidator")
            .Only();
    }

    [Fact]
    public void CustomerId_is_required()
    {
        var model = new CreateOrderRequest("", 10m);

        var result = _validator.TestValidate(model);

        result.ShouldHaveValidationErrorFor(x => x.CustomerId)
            .WithErrorMessage("'Customer Id' must not be empty.")
            .Only();
    }
}
```

Use direct validator tests for rule behavior, property paths, and failure
metadata. Keep them black-box and input-driven.

## Direct async validator test with `TestValidateAsync`

When the validator contains async rules or conditions, match the production path
and use `TestValidateAsync`.

```csharp
using FluentValidation;
using FluentValidation.TestHelper;
using Xunit;

public interface ICustomerDirectory
{
    Task<bool> ExistsAsync(string customerId, CancellationToken cancellationToken);
}

public sealed class StubCustomerDirectory(bool exists) : ICustomerDirectory
{
    public Task<bool> ExistsAsync(
        string customerId,
        CancellationToken cancellationToken) =>
        Task.FromResult(exists);
}

public sealed class CreateOrderRequestAsyncValidator
    : AbstractValidator<CreateOrderRequest>
{
    public CreateOrderRequestAsyncValidator(ICustomerDirectory customers)
    {
        RuleFor(x => x.CustomerId)
            .MustAsync((customerId, cancellationToken) =>
                customers.ExistsAsync(customerId, cancellationToken))
            .WithMessage("CustomerId must refer to an existing customer.");
    }
}

public sealed class CreateOrderRequestValidatorAsyncTests
{
    [Fact]
    public async Task Missing_customer_id_is_reported_as_a_failure()
    {
        var validator =
            new CreateOrderRequestAsyncValidator(
                new StubCustomerDirectory(exists: false));

        var result = await validator.TestValidateAsync(
            new CreateOrderRequest("missing", 10m),
            cancellationToken: CancellationToken.None);

        result.ShouldHaveValidationErrorFor(x => x.CustomerId)
            .WithErrorMessage("CustomerId must refer to an existing customer.")
            .Only();
    }
}
```

Do not call `TestValidate` on validators that use async rules, and do not hide
async validation behind synchronous wrappers in tests.

## Boundary tests belong at the app entrypoint

Use higher-level tests only for what the boundary adds: DI registration, request
handling, filters, and failure translation.

```csharp
using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

public sealed class OrdersApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public OrdersApiTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Invalid_request_returns_validation_problem_details()
    {
        var response = await _client.PostAsJsonAsync(
            "/orders",
            new
            {
                CustomerId = "",
                Total = 0m
            });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var problem =
            await response.Content.ReadFromJsonAsync<HttpValidationProblemDetails>();

        Assert.NotNull(problem);
        Assert.Contains("CustomerId", problem.Errors.Keys);
        Assert.Contains("Total", problem.Errors.Keys);
    }
}
```

This test proves boundary translation. It should not restate every validator
rule that already has direct validator coverage.

## `InlineValidator<T>` as an intentional boundary stub

If a higher-level test needs to force a known failure shape without re-testing a
real validator, use `InlineValidator<T>` instead of a generic mocking library.

```csharp
using System.Net;
using System.Net.Http.Json;
using FluentValidation;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit;

public sealed class OrdersApiStubbedValidatorTests
    : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public OrdersApiStubbedValidatorTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Stubbed_validator_can_force_one_known_failure()
    {
        var validator = new InlineValidator<CreateOrderRequest>();
        validator.RuleFor(x => x.CustomerId)
            .Custom((_, context) =>
                context.AddFailure("CustomerId", "CustomerId is required."));

        var client = _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<IValidator<CreateOrderRequest>>();
                services.AddSingleton<IValidator<CreateOrderRequest>>(validator);
            });
        }).CreateClient();

        var response = await client.PostAsJsonAsync(
            "/orders",
            new CreateOrderRequest("", 10m));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
```

Use this only when the test is about boundary behavior. Real validator behavior
still belongs in validator-focused tests with `TestValidate*`.

## Keep validator tests and integration tests separate

- Use validator tests for rule logic, property paths, error codes, severity, and
  custom state.
- Use integration tests for whether validation runs, where failures land, and how
  the boundary returns them.
- Do not duplicate every rule assertion in both places.
- When a test suite starts asserting FluentValidation internals instead of
  failures, route back to the validator test-helper rule.

## Related files

- [Anti-patterns quick reference](./anti-patterns-quick-reference.md)
- [Web bootstrap recipes](./web-bootstrap-recipes.md)
- [Validator test helpers](../rules/testing-validator-testhelper.md)
- [Testing integration boundaries](../rules/testing-integration-boundaries.md)
- [Async validation integration](../rules/integration-async-validation.md)

## Source anchors

- [FluentValidation testing](https://docs.fluentvalidation.net/en/latest/testing.html)
- [FluentValidation async validation](https://docs.fluentvalidation.net/en/latest/async.html)
- [FluentValidation ASP.NET integration](https://docs.fluentvalidation.net/en/latest/aspnet.html)

## Maintenance notes

- Keep this file centered on validator tests and boundary tests, not on general
  host setup or test-framework comparisons.
- Prefer short examples that demonstrate the testing seam clearly.
- Keep `InlineValidator<T>` guidance narrow so it stays an intentional stub, not a
  replacement for real validator tests.
