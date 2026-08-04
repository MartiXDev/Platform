## HTTP clients and resilience

### Purpose

Guide outbound HTTP work toward reusable clients, bounded retries, and
explicit failure handling instead of ad-hoc request code.

### Default guidance

- Use `IHttpClientFactory` or typed clients for reusable HTTP dependencies, and
  keep client configuration close to the consuming service.
- Prefer the built-in resilience handlers such as
  `AddStandardResilienceHandler()` before assembling custom delegating handlers
  or retry stacks by hand.
- Apply retries, timeouts, circuit breakers, and hedging only where the
  operation is safe, idempotent, and measurable.
- Stream large responses with `ResponseHeadersRead` and `ReadAsStreamAsync`
  instead of buffering the whole payload as a string.
- Treat transient faults, permanent failures, and caller cancellation as
  separate cases with separate logging and metrics.

```csharp
var baseAddress = builder.Configuration["Catalog:BaseUrl"]
    ?? throw new InvalidOperationException("Catalog:BaseUrl is required.");

builder.Services.AddHttpClient<CatalogClient>(client =>
{
    client.BaseAddress = new Uri(baseAddress);
})
.AddStandardResilienceHandler(options =>
{
    options.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(10);
});
```

### Avoid

- Do not create and dispose `HttpClient` per request.
- Do not retry non-idempotent operations blindly or stack multiple timeout
  layers without intent.
- Do not collapse upstream `404`, timeout, and caller cancellation into the
  same local failure path.
- Do not log full payloads, secrets, or personally identifiable data just to
  debug HTTP issues.

### Review checklist

- Client lifetime, timeout budget, and resilience policies are explicit.
- Failure mapping distinguishes upstream absence, transient dependency failure,
  and caller cancellation.
- Serialization and streaming choices match payload size and reliability needs.
- Tests or integration checks cover retry, timeout, and failure mapping
  behavior.

### Related files

- [ASP.NET Core application shape](./web-aspnet-core.md)
- [Cancellation and timeouts](./async-cancellation-timeouts.md)
- [Web stack source map](../references/web-stack-map.md)

### Source anchors

- [Build resilient HTTP apps with .NET](https://learn.microsoft.com/en-us/dotnet/core/resilience/http-resilience)
- [Use IHttpClientFactory](https://learn.microsoft.com/en-us/dotnet/core/extensions/httpclient-factory)
- [Web stack source map](../references/web-stack-map.md)
