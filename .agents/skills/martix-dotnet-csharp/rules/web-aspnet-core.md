## ASP.NET Core application shape

### Purpose

Provide the default architecture and request-pipeline rules for ASP.NET Core
apps, including Minimal APIs and controller-based services.

### Default guidance

- Keep startup explicit: configuration, dependency injection, middleware
  ordering, and endpoint registration should be easy to trace.
- Choose Minimal APIs for small focused HTTP surfaces and controllers when
  conventions, filters, or richer MVC features materially help.
- For small stable Minimal API response sets, prefer `TypedResults` with
  `Results<...>` so the HTTP contract stays visible in the handler signature.
- Use environment-aware configuration, health checks, and structured logging as
  first-class platform features rather than optional extras.
- Validate request models, return clear HTTP contracts, and keep business logic
  out of endpoint glue code.
- Use built-in `ProblemDetails` support and centralized exception handling so
  failures stay consistent across Minimal APIs and controllers.

```csharp
app.MapGet("/orders/{id:int}",
    async Task<Results<Ok<OrderDto>, NotFound>> (
        int id,
        OrdersService service,
        CancellationToken cancellationToken) =>
        await service.GetAsync(id, cancellationToken) is { } order
            ? TypedResults.Ok(order)
            : TypedResults.NotFound());
```

### Avoid

- Do not hide critical middleware ordering inside extension methods without
  documentation.
- Do not mix transport concerns, business logic, and persistence logic in the
  same endpoint method.
- Do not return broad `IResult` everywhere when the response set is small and
  known.
- Do not add framework layers that fight the host, DI container, or routing
  model without a clear payoff.

### Review checklist

- Middleware order, auth, exception handling, and endpoint mapping are
  intentional.
- Endpoint style matches the size and complexity of the API surface.
- Response and failure contracts are explicit, typed, and consistent.
- Operational concerns such as health, logs, and configuration are wired for
  production.

### Related files

- [HTTP resilience](./web-http-resilience.md)
- [Security guidance](./security-auth-authz.md)
- [Exceptions and validation](./design-exceptions-validation.md)
- [Web stack source map](../references/web-stack-map.md)

### Source anchors

- [Web stack source map](../references/web-stack-map.md)
- [ASP.NET Core fundamentals](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/?view=aspnetcore-9.0)
- [Minimal APIs](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis?view=aspnetcore-10.0)
- [Create responses in Minimal API applications](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis/responses?view=aspnetcore-10.0)
- [Handle errors in ASP.NET Core APIs](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/error-handling-api?view=aspnetcore-10.0)
- [Web API guidance](https://learn.microsoft.com/en-us/aspnet/core/web-api/?view=aspnetcore-10.0)
