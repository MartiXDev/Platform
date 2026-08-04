## Web stack map

### Purpose

Map ASP.NET Core application structure, options lifetime, and outbound HTTP
resilience guidance to their official documentation sources.

### Start here when

- The question is route selection: endpoint style, middleware order,
  `IOptions*` lifetime, or outbound HTTP shape.
- You want the source trail before touching host configuration or request
  pipeline wiring.

### Quick decision aid

#### `IOptions<T>` vs `IOptionsSnapshot<T>` vs `IOptionsMonitor<T>`

| Need | Prefer | Why |
| --- | --- | --- |
| Startup-time or effectively static settings, including singleton consumers | `IOptions<T>` | Singleton wrapper with no reload after startup |
| A fresh value per web request or scoped resolution | `IOptionsSnapshot<T>` | Scoped snapshot recomputed on each scope and not injectable into singletons |
| Live reload or change callbacks in singleton or background services | `IOptionsMonitor<T>` | Singleton access with change notifications and reloadable values |

### Rule coverage

- **Configuration binding, options lifetime, and validation**
  - Rule files: `rules/web-aspnet-core.md`
  - Primary sources:
    - [Options pattern in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/configuration/options?view=aspnetcore-10.0)
    - [Options pattern in .NET](https://learn.microsoft.com/en-us/dotnet/core/extensions/options)
  - Notes: Use for choosing `IOptions<T>`, `IOptionsSnapshot<T>`, and
    `IOptionsMonitor<T>`, plus reload and validation semantics.
- **App shape, host configuration, middleware, and endpoint style**
  - Rule files: `rules/web-aspnet-core.md`
  - Primary sources:
    - [ASP.NET Core fundamentals](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/?view=aspnetcore-9.0)
    - [Minimal APIs](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis?view=aspnetcore-10.0)
    - [Web API guidance](https://learn.microsoft.com/en-us/aspnet/core/web-api/?view=aspnetcore-10.0)
  - Notes: Use for web app structure, endpoint style choice, and operational
    baseline.
- **Outbound HTTP clients and resilience**
  - Rule files: `rules/web-http-resilience.md`
  - Primary sources:
    - [Build resilient HTTP apps with .NET](https://learn.microsoft.com/en-us/dotnet/core/resilience/http-resilience)
    - [Use IHttpClientFactory](https://learn.microsoft.com/en-us/dotnet/core/extensions/httpclient-factory)
  - Notes: Use for retries, timeouts, streaming, and client lifetime decisions.

### Maintenance notes

- Security, health checks, and diagnostics cross-cut the web stack; this map
  intentionally points readers to `quality-security-map.md` for those adjacent
  topics.
- Keep the options-interface choice here so AGENTS can route app-shape and
  configuration questions through one web entry point.
- If later work adds Minimal API-specific security or OpenAPI files, keep them
  linked here rather than splitting the package taxonomy.
