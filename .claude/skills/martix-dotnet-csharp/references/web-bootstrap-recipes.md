## Web bootstrap recipes

### Purpose

Use these recipes for first-pass ASP.NET Core and Minimal API bootstraps, then
return to the linked rules for deeper review and trade-offs.

### Start with these routes

- [Skill router and compatibility stance](../SKILL.md#compatibility-stance)
- [ASP.NET Core application shape](../rules/web-aspnet-core.md)
- [HTTP clients and resilience](../rules/web-http-resilience.md)
- [Authentication, authorization, and secure defaults](../rules/security-auth-authz.md)
- [Logging, metrics, tracing, and health signals](../rules/diagnostics-logging-tracing.md)
- [Web stack map](./web-stack-map.md)
- [Quality, diagnostics, and security map](./quality-security-map.md)

### Minimal API baseline

Use this ASP.NET Core baseline only for a greenfield service or an explicit
upgrade. For an existing repository, first follow the compatibility stance in
[`SKILL.md`](../SKILL.md#compatibility-stance).

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <LangVersion>14</LangVersion>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
</Project>
```

```csharp
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOptions<ApiOptions>()
    .BindConfiguration(ApiOptions.SectionName)
    .ValidateDataAnnotations()
    .ValidateOnStart();

builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();
builder.Services.AddHealthChecks();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer();

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("weather.read", policy =>
        policy.RequireAuthenticatedUser()
            .RequireClaim("scope", "weather.read"));
});

builder.Services.AddHttpClient<WeatherClient>((sp, client) =>
{
    var options = sp.GetRequiredService<IOptions<ApiOptions>>().Value;
    client.BaseAddress = new Uri(options.BaseUrl);
})
.AddStandardResilienceHandler();

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

app.MapHealthChecks("/health");

var api = app.MapGroup("/api");
api.MapGet("/weather", async (WeatherClient client, CancellationToken ct) =>
        TypedResults.Ok(await client.GetAsync(ct)))
    .RequireAuthorization("weather.read");

app.Run();

sealed class ApiOptions
{
    public const string SectionName = "Api";

    [Required]
    public string BaseUrl { get; init; } = string.Empty;
}

sealed class WeatherClient(HttpClient http)
{
    public async Task<Forecast[]> GetAsync(CancellationToken ct) =>
        await http.GetFromJsonAsync<Forecast[]>("/weather", ct)
        ?? [];
}

sealed record Forecast(DateOnly Date, int TemperatureC, string Summary);
```

Use controllers instead of Minimal APIs when filters, conventions, or broader
MVC features materially improve the service shape.

### Authentication and authorization baseline

Keep anonymous endpoints explicit and apply policies at the narrowest useful
surface.

```csharp
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer();

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("orders.read", policy =>
        policy.RequireAuthenticatedUser()
            .RequireClaim("scope", "orders.read"));

    options.AddPolicy("orders.write", policy =>
        policy.RequireAuthenticatedUser()
            .RequireClaim("scope", "orders.write"));
});

app.MapGet("/status", () => TypedResults.Ok(new { status = "ok" }))
    .AllowAnonymous();

var orders = app.MapGroup("/orders");

orders.MapGet("/{id:int}", async (int id, OrdersService service, CancellationToken ct) =>
{
    var order = await service.FindAsync(id, ct);
    return order is null
        ? TypedResults.NotFound()
        : TypedResults.Ok(order);
})
.RequireAuthorization("orders.read");

orders.MapPost("/", async (CreateOrderRequest request, OrdersService service, CancellationToken ct) =>
{
    var order = await service.CreateAsync(request, ct);
    return TypedResults.Created($"/orders/{order.Id}", order);
})
.RequireAuthorization("orders.write");
```

For browser-facing cookie flows, cross-check the security guidance for CSRF,
CORS, and transport defaults before treating this baseline as complete.

### Typed results and problem details

Use typed results to keep HTTP contracts explicit, then let problem details
carry consistent failure payloads.

```csharp
app.MapPost("/orders",
    async Task<Results<Created<OrderResponse>, ValidationProblem>> (
        CreateOrderRequest request,
        OrdersService service,
        CancellationToken ct) =>
{
    var errors = new Dictionary<string, string[]>();

    if (string.IsNullOrWhiteSpace(request.CustomerId))
    {
        errors["customerId"] = ["CustomerId is required."];
    }

    if (request.Total <= 0)
    {
        errors["total"] = ["Total must be greater than zero."];
    }

    if (errors.Count > 0)
    {
        return TypedResults.ValidationProblem(errors);
    }

    var order = await service.CreateAsync(request, ct);
    return TypedResults.Created($"/orders/{order.Id}", order);
});
```

When unhandled exceptions escape the handler, `AddProblemDetails`,
`UseExceptionHandler`, and `UseStatusCodePages` keep empty `4xx` and `5xx`
responses aligned with the same problem-details contract.

### Outbound HTTP with standard resilience

Start with one standard handler and customize it only after measuring a real
latency or dependency problem.

```csharp
using System.ComponentModel.DataAnnotations;
using Microsoft.Extensions.Options;

builder.Services.AddOptions<PaymentsOptions>()
    .BindConfiguration(PaymentsOptions.SectionName)
    .ValidateDataAnnotations()
    .ValidateOnStart();

builder.Services.AddHttpClient<PaymentsClient>((sp, client) =>
{
    var options = sp.GetRequiredService<IOptions<PaymentsOptions>>().Value;
    client.BaseAddress = new Uri(options.BaseUrl);
})
.AddStandardResilienceHandler(options =>
{
    options.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(15);
});

sealed class PaymentsOptions
{
    public const string SectionName = "Payments";

    [Required]
    public string BaseUrl { get; init; } = string.Empty;
}

sealed class PaymentsClient(HttpClient http)
{
    public Task<HttpResponseMessage> PostAsync(
        PaymentRequest request,
        CancellationToken ct) =>
        http.PostAsJsonAsync("/payments", request, ct);
}
```

Keep retries and timeouts explicit, and avoid stacking another manual resilience
layer on the same client without a measured reason.

### Middleware ordering baseline

Keep middleware order explicit, reviewable, and close to `Program.cs`.

- Put exception handling and problem-details support early so failures are
  normalized before later middleware runs.
- Run HTTPS, CORS, authentication, authorization, and other cross-cutting
  middleware before endpoint mapping.
- Keep endpoint registration near the end so the request pipeline is easy to
  trace during reviews.
- Keep health endpoints deliberate: public liveness checks and restricted
  readiness or detailed checks often need different routes.

```csharp
app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseHttpsRedirection();
app.UseCors("frontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapHealthChecks("/health");
app.MapGroup("/api");
```

### Related files

- [Anti-patterns quick reference](./anti-patterns-quick-reference.md)
- [Testing bootstrap recipes](./testing-bootstrap-recipes.md)
- [Libraries catalog](./libraries-catalog.md)
- [ASP.NET Core application shape](../rules/web-aspnet-core.md)
- [HTTP clients and resilience](../rules/web-http-resilience.md)
- [Authentication, authorization, and secure defaults](../rules/security-auth-authz.md)

### Source anchors

- [ASP.NET Core fundamentals](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/?view=aspnetcore-9.0)
- [Minimal APIs](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis?view=aspnetcore-10.0)
- [Create responses in Minimal API apps](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis/responses?view=aspnetcore-10.0)
- [Handle errors in ASP.NET Core APIs](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/error-handling-api?view=aspnetcore-10.0)
- [Options pattern](https://learn.microsoft.com/en-us/dotnet/core/extensions/options)
- [Build resilient HTTP apps with .NET](https://learn.microsoft.com/en-us/dotnet/core/resilience/http-resilience)
- [Authentication in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/?view=aspnetcore-10.0)
- [Authorization in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/security/authorization/introduction?view=aspnetcore-10.0)
- [Health checks in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/health-checks?view=aspnetcore-10.0)

### Maintenance notes

- Keep these recipes copy-ready and small; move deep trade-offs into the rule
  library or source maps.
- Favor platform defaults first, then point to the
  [libraries catalog](./libraries-catalog.md) when a third-party package is the
  better fit.
