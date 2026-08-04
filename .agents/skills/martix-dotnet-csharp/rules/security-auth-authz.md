## Authentication, authorization, and secure defaults

### Purpose

Summarize the baseline security decisions for .NET apps, especially ASP.NET
Core services that expose HTTP endpoints or handle secrets.

### Default guidance

- Choose authentication schemes explicitly, configure authorization policies
  close to the domain rules, and keep anonymous access intentional.
- Use data protection, secret providers, HTTPS, and narrow CORS policies as
  platform defaults rather than afterthoughts.
- Validate all untrusted input and keep security-sensitive behavior explicit in
  middleware, endpoints, and background jobs.
- Separate authentication, authorization, and transport security concerns so
  each can be reviewed and tested on its own.

### Avoid

- Do not hardcode secrets, tokens, or connection strings into source-controlled
  files.
- Do not treat CORS as a security feature; it relaxes browser restrictions and
  should be narrowly scoped.
- Do not rely on GET requests for state-changing operations or skip CSRF
  protections where cookie-based auth is in play.

### Review checklist

- Authentication scheme, authorization policy, and anonymous endpoints are
  explicit.
- Secrets, protected data, and transport requirements are handled by platform
  features.
- Security-sensitive paths have focused tests or review notes for failure
  cases.

### Related files

- [ASP.NET Core application shape](./web-aspnet-core.md)
- [Logging and tracing](./diagnostics-logging-tracing.md)
- [Quality and security source map](../references/quality-security-map.md)

### Source anchors

- [ASP.NET Core security overview](https://learn.microsoft.com/en-us/aspnet/core/security/?view=aspnetcore-9.0)
- [Authentication in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/?view=aspnetcore-10.0)
- [Authorization in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/security/authorization/introduction?view=aspnetcore-10.0)
- [Data protection overview](https://learn.microsoft.com/en-us/aspnet/core/security/data-protection/introduction?view=aspnetcore-10.0)
- [Secrets management](https://learn.microsoft.com/en-us/aspnet/core/security/app-secrets?view=aspnetcore-10.0)
