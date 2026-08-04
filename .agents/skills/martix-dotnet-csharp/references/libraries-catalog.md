## Libraries catalog

### Purpose

Use this catalog to choose supporting packages deliberately. Start with
platform features first, then add libraries only when they reduce repeated
complexity.

### Selection defaults

| Default | Escalate when | Routes |
| --- | --- | --- |
| Use built-in options binding and `ValidateOnStart()` for configuration | Cross-property or reusable object validation deserves a dedicated validator layer | [ASP.NET Core application shape](../rules/web-aspnet-core.md); [Exceptions, validation, and failure contracts](../rules/design-exceptions-validation.md) |
| Use `IHttpClientFactory` plus `Microsoft.Extensions.Http.Resilience` for outbound HTTP | You have measured needs that require a custom resilience pipeline | [HTTP clients and resilience](../rules/web-http-resilience.md); [Async and concurrency map](./async-map.md) |
| Use `ILogger`, health checks, and OpenTelemetry-friendly instrumentation first | Teams need richer sinks, request logging middleware, or opinionated enrichment | [Logging, metrics, tracing, and health signals](../rules/diagnostics-logging-tracing.md); [Quality, diagnostics, and security map](./quality-security-map.md) |

### Library catalog

| Library or package | Use when | Helps with | MartiX routes |
| --- | --- | --- | --- |
| `Microsoft.Extensions.Http.Resilience` | Outbound HTTP calls need retries, timeouts, circuit breaking, or hedging without manual policy plumbing | Platform-aligned resilience on top of `IHttpClientFactory` | [HTTP clients and resilience](../rules/web-http-resilience.md); [Cancellation and timeouts](../rules/async-cancellation-timeouts.md); [Web stack map](./web-stack-map.md) |
| `Microsoft.AspNetCore.Mvc.Testing` | API or host-level tests need the real request pipeline, serializer, auth middleware, or filters | `WebApplicationFactory<Program>` and test server bootstrapping | [Unit and integration testing](../rules/testing-unit-integration.md); [Testing bootstrap recipes](./testing-bootstrap-recipes.md) |
| `Microsoft.Data.Sqlite` plus `Microsoft.EntityFrameworkCore.Sqlite` | Integration tests need relational translation and constraints without a full external server | Low-friction relational test database for EF Core | [Entity Framework Core](../rules/data-efcore.md); [Unit and integration testing](../rules/testing-unit-integration.md); [Testing bootstrap recipes](./testing-bootstrap-recipes.md) |
| `MediatR` | Commands, queries, or pipeline behaviors are clarifying feature boundaries instead of adding indirection | Handler-based composition, cross-cutting behaviors, and request orchestration | [API and type design](../rules/design-api-type-design.md); [ASP.NET Core application shape](../rules/web-aspnet-core.md); [Design map](./design-map.md) |
| `FluentValidation.DependencyInjectionExtensions` | Validation rules are richer than data annotations, especially for nested objects and reusable request models | Reusable validators, request pipelines, and readable validation rules | [Exceptions, validation, and failure contracts](../rules/design-exceptions-validation.md); [Unit and integration testing](../rules/testing-unit-integration.md); [Quality, diagnostics, and security map](./quality-security-map.md) |
| `Mapster` | Repeated mapping or EF Core projection noise is obscuring use cases | DTO mapping, projection, and mapping configuration with low boilerplate | [API and type design](../rules/design-api-type-design.md); [Serialization and payload contracts](../rules/data-serialization.md); [Entity Framework Core](../rules/data-efcore.md) |
| `ErrorOr` | Failures are expected outcomes that should map cleanly to HTTP or domain responses | Result-style flows for expected errors without exception-driven control paths | [Exceptions, validation, and failure contracts](../rules/design-exceptions-validation.md); [ASP.NET Core application shape](../rules/web-aspnet-core.md); [Testing bootstrap recipes](./testing-bootstrap-recipes.md) |
| `Serilog.AspNetCore` | Built-in providers are not enough for sinks, enrichment, or request logging | Structured logging, sink ecosystem, and HTTP request logs | [Logging, metrics, tracing, and health signals](../rules/diagnostics-logging-tracing.md); [Authentication, authorization, and secure defaults](../rules/security-auth-authz.md) |
| `OpenTelemetry.Extensions.Hosting` and related instrumentation or exporter packages | Services need vendor-neutral traces, metrics, and cross-service correlation | Observability pipelines that complement `ILogger` and health checks | [Logging, metrics, tracing, and health signals](../rules/diagnostics-logging-tracing.md); [Quality, diagnostics, and security map](./quality-security-map.md) |

### Fit notes

- Prefer platform defaults before third-party abstractions when the built-in
  feature already covers the scenario.
- Avoid adding more than one library for the same concern unless the boundary is
  explicit and the trade-off is documented.
- Keep application code on stable abstractions where possible, such as
  `ILogger`, `HttpClient`, and framework DI registrations.
- Hand off to `martix-fluentvalidation` when validators, RuleSets, async rules,
  or `FluentValidation.TestHelper` become the primary design concern.

### Related files

- [Web bootstrap recipes](./web-bootstrap-recipes.md)
- [Anti-patterns quick reference](./anti-patterns-quick-reference.md)
- [Testing bootstrap recipes](./testing-bootstrap-recipes.md)

### Source anchors

- [Dependency injection guidelines](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection-guidelines)
- [Options pattern](https://learn.microsoft.com/en-us/dotnet/core/extensions/options)
- [Build resilient HTTP apps with .NET](https://learn.microsoft.com/en-us/dotnet/core/resilience/http-resilience)
- [Logging in .NET](https://learn.microsoft.com/en-us/dotnet/core/extensions/logging)
- [Distributed tracing in .NET](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/distributed-tracing)
- [Metrics in .NET](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/metrics)
- [Testing in .NET](https://learn.microsoft.com/en-us/dotnet/core/testing/)
- [ASP.NET Core integration tests](https://learn.microsoft.com/en-us/aspnet/core/test/integration-tests?view=aspnetcore-10.0)

### Maintenance notes

- This catalog is intentionally short and non-exhaustive; add entries only for
  packages that repeatedly help MartiX users make design decisions.
- When a package becomes a repeat recommendation, reflect the underlying concern
  in the linked rule or recipe and keep this page as the index.
- Verify exact package APIs and version compatibility against the package's own
  docs during adoption, but keep MartiX guidance anchored in the official .NET
  concerns listed above.
