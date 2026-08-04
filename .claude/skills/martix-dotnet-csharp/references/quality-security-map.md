## Quality, diagnostics, and security map

### Purpose

Bundle the official sources that support testing, diagnostics, and
secure-by-default recommendations.

### Rule coverage

- **Unit and integration testing strategy**
  - Rule files: `rules/testing-unit-integration.md`
  - Primary sources:
    - [Testing in .NET](https://learn.microsoft.com/en-us/dotnet/core/testing/)
    - [Unit testing best practices](https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-best-practices)
    - [ASP.NET Core integration tests](https://learn.microsoft.com/en-us/aspnet/core/test/integration-tests?view=aspnetcore-10.0)
  - Notes: Use for test-layer selection, framework reuse, and realistic
    infrastructure testing.
- **Logging, metrics, tracing, and health signals**
  - Rule files: `rules/diagnostics-logging-tracing.md`
  - Primary sources:
    - [Logging in .NET](https://learn.microsoft.com/en-us/dotnet/core/extensions/logging)
    - [Distributed tracing in .NET](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/distributed-tracing)
    - [Metrics in .NET](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/metrics)
    - [Health checks in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/health-checks?view=aspnetcore-10.0)
  - Notes: Use for observability and operational readiness guidance.
- **Authentication, authorization, and secure defaults**
  - Rule files: `rules/security-auth-authz.md`
  - Primary sources:
    - [ASP.NET Core security overview](https://learn.microsoft.com/en-us/aspnet/core/security/?view=aspnetcore-9.0)
    - [Authentication in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/?view=aspnetcore-10.0)
    - [Authorization in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/security/authorization/introduction?view=aspnetcore-10.0)
    - [Data protection overview](https://learn.microsoft.com/en-us/aspnet/core/security/data-protection/introduction?view=aspnetcore-10.0)
    - [Secrets management](https://learn.microsoft.com/en-us/aspnet/core/security/app-secrets?view=aspnetcore-10.0)
  - Notes: Use for secure configuration, endpoint protection, and
    transport-adjacent security defaults.

### Maintenance notes

- The approved `web-data-quality.md` memo also mentions CORS, CSRF, and deeper
  diagnostics tooling; this first pass folds those concerns into the existing
  security and diagnostics files.
- Keep testing, diagnostics, and security adjacent because they frequently
  need to be applied together during reviews.
