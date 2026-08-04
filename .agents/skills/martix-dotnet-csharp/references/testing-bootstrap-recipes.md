## Testing bootstrap recipes

### Purpose

Use these recipes to stand up host-level ASP.NET Core tests quickly, then
return to the testing, data, and diagnostics rules for long-term structure.

### Start with these routes

- [Unit and integration testing](../rules/testing-unit-integration.md)
- [Entity Framework Core](../rules/data-efcore.md)
- [Exceptions, validation, and failure contracts](../rules/design-exceptions-validation.md)
- [Quality, diagnostics, and security map](./quality-security-map.md)
- [Web bootstrap recipes](./web-bootstrap-recipes.md)

### Test project baseline

- Use the same target framework as the system under test and reference that
  project directly.
- Add `Microsoft.AspNetCore.Mvc.Testing` for
  `WebApplicationFactory<Program>` support.
- Reuse the test framework already present in the solution instead of adding a
  new one just for one project.
- Add the relational provider package you will test against when EF Core
  translation or constraints matter.

### `WebApplicationFactory<Program>` baseline

```csharp
public sealed class ApiFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
    }
}

public sealed class OrdersApiTests : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client;

    public OrdersApiTests(ApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Get_missing_order_returns_not_found()
    {
        var response = await _client.GetAsync("/orders/42");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
```

Keep the baseline factory small, then use `WithWebHostBuilder` or
`ConfigureTestServices` only for the scenarios that need overrides.

### Replace authentication with a test scheme

Use a dedicated test-only authentication scheme so authorization behavior is
predictable and production auth wiring stays untouched.

```csharp
public sealed class AuthenticatedApiFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureTestServices(services =>
        {
            services.AddAuthentication("TestScheme")
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(
                    "TestScheme",
                    _ => { });
        });
    }
}

public sealed class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public TestAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder)
        : base(options, logger, encoder)
    {
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "test-user"),
            new Claim(ClaimTypes.Role, "Admin")
        };

        var identity = new ClaimsIdentity(claims, "TestScheme");
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, "TestScheme");

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
```

If the app requires a specific default scheme, set that same scheme inside the
test host so authorization paths stay representative.

### Replace EF Core with a relational test database

Prefer SQLite in-memory or the real provider when queries, constraints, or
transactions are part of what the test is proving.

```csharp
public sealed class SqliteApiFactory : WebApplicationFactory<Program>
{
    private DbConnection? _connection;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureTestServices(services =>
        {
            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();

            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.AddSingleton<DbConnection>(_connection);
            services.AddDbContext<AppDbContext>((sp, options) =>
                options.UseSqlite(sp.GetRequiredService<DbConnection>()));
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        _connection?.Dispose();
    }
}
```

After the factory boots, create a scope, resolve the `DbContext`, and call
`EnsureCreatedAsync()` or run migrations before the test path that needs data.

### API validation and contract assertions

Use host-level tests for the behavior that depends on routing, filters,
serialization, authentication, or problem-details payloads.

```csharp
public sealed class OrdersValidationTests : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client;

    public OrdersValidationTests(ApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Post_invalid_order_returns_problem_details()
    {
        var response = await _client.PostAsJsonAsync(
            "/orders",
            new
            {
                CustomerId = "",
                Total = 0
            });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var problem = await response.Content
            .ReadFromJsonAsync<HttpValidationProblemDetails>();

        Assert.NotNull(problem);
        Assert.NotEmpty(problem.Errors);
    }
}
```

This is the right place to assert status codes, typed contracts, and
problem-details payload shape. Keep narrower branching logic in unit tests.

### Per-test service overrides

Override only the dependency that the scenario needs instead of rebuilding the
whole host for every test class.

```csharp
var client = factory.WithWebHostBuilder(builder =>
{
    builder.ConfigureTestServices(services =>
    {
        services.RemoveAll<IClock>();
        services.AddSingleton<IClock>(new FixedClock(DateTimeOffset.Parse("2025-01-01T00:00:00Z")));
    });
}).CreateClient();
```

This pattern keeps the default host realistic while still allowing focused
scenario setup.

### Related files

- [Anti-patterns quick reference](./anti-patterns-quick-reference.md)
- [Web bootstrap recipes](./web-bootstrap-recipes.md)
- [Libraries catalog](./libraries-catalog.md)
- [Unit and integration testing](../rules/testing-unit-integration.md)
- [Entity Framework Core](../rules/data-efcore.md)

### Source anchors

- [Testing in .NET](https://learn.microsoft.com/en-us/dotnet/core/testing/)
- [Unit testing best practices](https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-best-practices)
- [ASP.NET Core integration tests](https://learn.microsoft.com/en-us/aspnet/core/test/integration-tests?view=aspnetcore-10.0)
- [Handle errors in ASP.NET Core APIs](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/error-handling-api?view=aspnetcore-10.0)
- [EF Core documentation hub](https://learn.microsoft.com/en-us/ef/core/)

### Maintenance notes

- Keep this file focused on host-level setup and contract testing; broader test
  philosophy still belongs in the rule library.
- Prefer factories and per-test overrides over deep test inheritance unless the
  repetition has already proven itself costly.
