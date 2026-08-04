## Logging, metrics, tracing, and health signals

### Purpose

Make diagnostics structured, production-usable, and consistent across
command-line, service, and web workloads.

### Default guidance

- Use `ILogger` with structured message templates, categories, and scopes
  rather than interpolated log strings for every event.
- Emit logs, metrics, traces, and health checks as complementary signals
  instead of forcing one signal to carry every diagnostic burden.
- Capture enough context to explain what operation failed without logging
  secrets or flooding hot paths.
- Use OpenTelemetry-friendly instrumentation and ASP.NET Core health checks
  when the workload is service-like or cloud-hosted.

### Avoid

- Do not log the same failure repeatedly at multiple layers unless each log
  adds unique operational value.
- Do not use verbose trace logging as a substitute for metrics, correlation
  IDs, or spans.
- Do not leak tokens, connection strings, or sensitive payload contents into
  diagnostics.

### Review checklist

- Logs use templates and scopes with meaningful context keys.
- Metrics and traces exist for high-value operations and dependencies.
- Health endpoints reflect readiness and liveness instead of expensive deep
  diagnostics.

### Related files

- [ASP.NET Core application shape](./web-aspnet-core.md)
- [Security guidance](./security-auth-authz.md)
- [Quality and security source map](../references/quality-security-map.md)

### Source anchors

- [Logging in .NET](https://learn.microsoft.com/en-us/dotnet/core/extensions/logging)
- [Distributed tracing in .NET](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/distributed-tracing)
- [Metrics in .NET](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/metrics)
- [Health checks in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/health-checks?view=aspnetcore-10.0)
