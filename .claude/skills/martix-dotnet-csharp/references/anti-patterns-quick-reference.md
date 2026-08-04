## Anti-patterns quick reference

### Purpose

Use this page to spot common .NET and ASP.NET Core mistakes quickly, then
return to the linked rules for the full review contract.

### Quick table

| Anti-pattern | Better default | Start with |
| --- | --- | --- |
| `new HttpClient()` in request code | Register a named or typed client and apply one standard resilience handler | [HTTP clients and resilience](../rules/web-http-resilience.md); [Web stack map](./web-stack-map.md) |
| `.Result`, `.Wait()`, or dropped cancellation | Keep the call path async and pass the `CancellationToken` through | [Tasks, ValueTasks, async streams, and API shape](../rules/async-tasks-valuetasks.md); [Cancellation and timeouts](../rules/async-cancellation-timeouts.md) |
| `async void` for app logic | Return `Task` or `ValueTask`; reserve `async void` for true event handlers | [Tasks, ValueTasks, async streams, and API shape](../rules/async-tasks-valuetasks.md); [Async and concurrency map](./async-map.md) |
| Exceptions for expected misses | Use nullable, `Try*`, or result-style contracts for routine failures | [Exceptions, validation, and failure contracts](../rules/design-exceptions-validation.md); [Design map](./design-map.md) |
| Missing options validation on critical settings | Bind options explicitly, validate them, and fail during startup | [ASP.NET Core application shape](../rules/web-aspnet-core.md); [Web bootstrap recipes](./web-bootstrap-recipes.md) |
| Singleton services that capture scoped dependencies | Align lifetimes or create a scope for the short-lived work | [API and type design](../rules/design-api-type-design.md); [Design map](./design-map.md) |
| Endpoint lambdas that do transport, business, and data work together | Keep endpoints thin and move behavior into services or handlers | [ASP.NET Core application shape](../rules/web-aspnet-core.md); [API and type design](../rules/design-api-type-design.md) |
| EF Core in-memory provider as a stand-in for relational integration tests | Use a relational test database when translation and constraints matter | [Unit and integration testing](../rules/testing-unit-integration.md); [Entity Framework Core](../rules/data-efcore.md) |
| Fire-and-forget background work or unbounded queues | Use hosted services, bounded channels, and explicit shutdown behavior | [Concurrency, synchronization, and channels](../rules/async-concurrency-channels.md); [Async and concurrency map](./async-map.md) |
| Logging secrets or repeating the same failure at every layer | Log structured, minimal context once per layer with real value | [Logging, metrics, tracing, and health signals](../rules/diagnostics-logging-tracing.md); [Authentication, authorization, and secure defaults](../rules/security-auth-authz.md) |

### Per-request `HttpClient`

`HttpClient` lifetime and resilience are application-level decisions, not
endpoint details.

```csharp
// Wrong
public sealed class WeatherService
{
    public async Task<string> GetAsync(CancellationToken ct)
    {
        using var client = new HttpClient();
        return await client.GetStringAsync("https://api.example.com/weather", ct);
    }
}

// Better
builder.Services.AddHttpClient<WeatherClient>((sp, client) =>
{
    client.BaseAddress = new Uri("https://api.example.com");
})
.AddStandardResilienceHandler();

sealed class WeatherClient(HttpClient http)
{
    public Task<string> GetAsync(CancellationToken ct) =>
        http.GetStringAsync("/weather", ct);
}
```

Route back to [HTTP clients and resilience](../rules/web-http-resilience.md)
and [Web stack map](./web-stack-map.md).

### Blocking async and dropped cancellation

Blocking on async work hides latency problems and makes shutdown paths harder
to reason about.

```csharp
// Wrong
public UserDto GetUser(int id)
{
    return _client.GetUserAsync(id, CancellationToken.None).Result;
}

// Better
public Task<UserDto?> GetUserAsync(int id, CancellationToken ct)
{
    return _client.GetUserAsync(id, ct);
}
```

Route back to
[Tasks, ValueTasks, async streams, and API shape](../rules/async-tasks-valuetasks.md),
[Cancellation and timeouts](../rules/async-cancellation-timeouts.md), and
[Async and concurrency map](./async-map.md).

### Exceptions for expected misses

Use exceptions for broken contracts or truly exceptional failures, not for the
common "not found" branch.

```csharp
// Wrong
app.MapGet("/users/{id:int}", async (int id, UserService service) =>
{
    try
    {
        var user = await service.GetRequiredAsync(id);
        return TypedResults.Ok(user);
    }
    catch (UserNotFoundException)
    {
        return TypedResults.NotFound();
    }
});

// Better
app.MapGet("/users/{id:int}", async (int id, UserService service, CancellationToken ct) =>
{
    var user = await service.FindAsync(id, ct);
    return user is null
        ? TypedResults.NotFound()
        : TypedResults.Ok(user);
});
```

Route back to
[Exceptions, validation, and failure contracts](../rules/design-exceptions-validation.md)
and [Design map](./design-map.md).

### Missing startup validation for options

Configuration errors are easier to fix when the app fails before it accepts
traffic.

```csharp
using System.ComponentModel.DataAnnotations;

// Wrong
builder.Services.AddOptions<PaymentsOptions>()
    .BindConfiguration(PaymentsOptions.SectionName);

// Better
builder.Services.AddOptions<PaymentsOptions>()
    .BindConfiguration(PaymentsOptions.SectionName)
    .ValidateDataAnnotations()
    .ValidateOnStart();

sealed class PaymentsOptions
{
    public const string SectionName = "Payments";

    [Required]
    public string BaseUrl { get; init; } = string.Empty;
}
```

Route back to [Web bootstrap recipes](./web-bootstrap-recipes.md),
[ASP.NET Core application shape](../rules/web-aspnet-core.md), and
[Design map](./design-map.md).

### Captive scoped dependencies

Long-lived services should not hold onto request or scope-bound dependencies.

```csharp
// Wrong
sealed class CleanupWorker(AppDbContext db) : BackgroundService
{
    protected override Task ExecuteAsync(CancellationToken ct) =>
        PruneAsync(db, ct);
}

// Better
sealed class CleanupWorker(IServiceScopeFactory scopeFactory) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            await PruneAsync(db, ct);
            await Task.Delay(TimeSpan.FromMinutes(5), ct);
        }
    }
}
```

Route back to [API and type design](../rules/design-api-type-design.md),
[Entity Framework Core](../rules/data-efcore.md), and
[Design map](./design-map.md).

### Endpoints that do everything

Keep transport glue small so validation, persistence, and domain behavior can
be reviewed and tested separately.

```csharp
// Wrong
app.MapPost("/orders", async (CreateOrderRequest request, AppDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(request.CustomerId))
    {
        return TypedResults.BadRequest();
    }

    var order = new Order
    {
        CustomerId = request.CustomerId,
        Total = request.Total
    };

    db.Orders.Add(order);
    await db.SaveChangesAsync();

    return TypedResults.Created($"/orders/{order.Id}", order);
});

// Better
app.MapPost("/orders", async (CreateOrderRequest request, OrdersService service, CancellationToken ct) =>
{
    var order = await service.CreateAsync(request, ct);
    return TypedResults.Created($"/orders/{order.Id}", order);
});
```

Route back to [ASP.NET Core application shape](../rules/web-aspnet-core.md),
[API and type design](../rules/design-api-type-design.md), and
[Unit and integration testing](../rules/testing-unit-integration.md).

### Relational behavior hidden by the EF Core in-memory provider

When a test cares about query translation, transactions, or constraints, use a
relational provider.

```csharp
// Wrong
builder.ConfigureTestServices(services =>
{
    services.RemoveAll<DbContextOptions<AppDbContext>>();
    services.AddDbContext<AppDbContext>(options =>
        options.UseInMemoryDatabase("AppTests"));
});

// Better
builder.ConfigureTestServices(services =>
{
    var connection = new SqliteConnection("DataSource=:memory:");
    connection.Open();

    services.RemoveAll<DbContextOptions<AppDbContext>>();
    services.AddSingleton<DbConnection>(connection);
    services.AddDbContext<AppDbContext>((sp, options) =>
        options.UseSqlite(sp.GetRequiredService<DbConnection>()));
});
```

Route back to [Entity Framework Core](../rules/data-efcore.md),
[Unit and integration testing](../rules/testing-unit-integration.md), and
[Testing bootstrap recipes](./testing-bootstrap-recipes.md).

### Fire-and-forget background work and unbounded queues

Bounded work is easier to monitor, cancel, and shut down cleanly.

```csharp
// Wrong
app.MapPost("/jobs", (Job job) =>
{
    _ = Task.Run(() => ProcessAsync(job));
    return TypedResults.Accepted();
});

// Better
var jobs = Channel.CreateBounded<Job>(new BoundedChannelOptions(100)
{
    FullMode = BoundedChannelFullMode.Wait
});

app.MapPost("/jobs", async (Job job, CancellationToken ct) =>
{
    await jobs.Writer.WriteAsync(job, ct);
    return TypedResults.Accepted();
});
```

Route back to
[Concurrency, synchronization, and channels](../rules/async-concurrency-channels.md),
[Cancellation and timeouts](../rules/async-cancellation-timeouts.md), and
[Async and concurrency map](./async-map.md).

### Related files

- [Skill router and compatibility stance](../SKILL.md#compatibility-stance)
- [Web bootstrap recipes](./web-bootstrap-recipes.md)
- [Testing bootstrap recipes](./testing-bootstrap-recipes.md)
- [Libraries catalog](./libraries-catalog.md)

### Source anchors

- [Options pattern](https://learn.microsoft.com/en-us/dotnet/core/extensions/options)
- [Use IHttpClientFactory](https://learn.microsoft.com/en-us/dotnet/core/extensions/httpclient-factory)
- [Build resilient HTTP apps with .NET](https://learn.microsoft.com/en-us/dotnet/core/resilience/http-resilience)
- [Best practices for exceptions](https://learn.microsoft.com/en-us/dotnet/standard/exceptions/best-practices-for-exceptions)
- [Dependency injection guidelines](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection-guidelines)
- [Channels library](https://learn.microsoft.com/en-us/dotnet/core/extensions/channels)
- [ASP.NET Core integration tests](https://learn.microsoft.com/en-us/aspnet/core/test/integration-tests?view=aspnetcore-10.0)
- [Logging in .NET](https://learn.microsoft.com/en-us/dotnet/core/extensions/logging)

### Maintenance notes

- Keep this list curated: add entries only when the same mistake recurs across
  multiple rules or reviews.
- Add nuance to the rule file first when a fix depends on heavy context, then
  link the distilled anti-pattern here.
