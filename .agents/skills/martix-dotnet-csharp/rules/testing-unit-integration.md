## Unit and integration testing

### Purpose

Set the default testing strategy for .NET code so behavior is verified at the
right layer with reliable, maintainable tests.

### Default guidance

- Use the test framework already present in the solution, and mirror production
  types with focused behavior-based test names.
- Favor small deterministic unit tests for branching logic and narrower
  integration tests for framework, database, and HTTP behavior.
- Test through public APIs whenever possible, and use realistic infrastructure
  for behavior that depends on EF Core translation, ASP.NET Core hosting, or
  serialization.
- For ASP.NET Core integration tests, start from
  `WebApplicationFactory<Program>` and replace only the registrations the
  scenario needs.
- Run the smallest useful test slice first, then broaden to surrounding tests
  once the target behavior passes.

```csharp
public sealed class OrdersApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public OrdersApiTests(WebApplicationFactory<Program> factory) =>
        _client = factory.CreateClient();

    [Fact]
    public async Task Get_order_returns_not_found_for_missing_id()
    {
        var response = await _client.GetAsync("/orders/404");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
```

### Avoid

- Do not add mocks for code that already lives in the solution under test.
- Do not mock routing, model binding, validation, or serialization when those
  behaviors are the reason the test exists.
- Do not put branching logic or opaque helper abstractions inside tests.
- Do not rely on the EF Core in-memory provider or broad end-to-end suites as
  substitutes for the right integration tests.

### Review checklist

- One behavior is under test and the assertion names that behavior clearly.
- Integration tests use the host, serializer, or provider that actually
  exercises the scenario.
- Test host customization is minimal and specific to the scenario.
- Changed public APIs or contract-sensitive behavior have direct tests.

### Related files

- [Exceptions and validation](./design-exceptions-validation.md)
- [Entity Framework Core](./data-efcore.md)
- [Quality and security source map](../references/quality-security-map.md)

### Source anchors

- [Quality and security source map](../references/quality-security-map.md)
- [Testing in .NET](https://learn.microsoft.com/en-us/dotnet/core/testing/)
- [Unit testing best practices](https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-best-practices)
- [ASP.NET Core integration tests](https://learn.microsoft.com/en-us/aspnet/core/test/integration-tests?view=aspnetcore-10.0)
