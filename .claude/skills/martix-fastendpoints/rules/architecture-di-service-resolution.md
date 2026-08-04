# FastEndpoints dependency injection and service resolution

## Purpose

Set the default composition rules for how FastEndpoints services are obtained:
constructor injection, property injection, manual resolution, and the lifetime
boundaries that apply to endpoints and singleton framework components.

## Default guidance

- Prefer constructor injection for required dependencies that define the stable
  behavior of an endpoint, command handler, or other compositional unit.
- Use property injection on endpoints for optional collaborators or FastEndpoints
  convenience-style dependencies when that keeps the constructor focused on the
  real required graph.
- Use manual `Resolve<T>()` or `TryResolve<T>()` sparingly for optional services,
  keyed lookups, or runtime-only access where constructor injection would force
  an unnecessarily broad dependency surface.
- Treat FastEndpoints singleton components as singleton-safe by design:
  validators, mappers, processors, and event handlers must not keep mutable
  per-request state in instance fields.
- In validators and mappers, resolve scoped dependencies inside execution-time
  methods when possible. If constructor-time access is unavoidable, create and
  dispose a scope explicitly with `IServiceScopeFactory`.
- In processors and event handlers, inject singleton collaborators normally and
  create a scope or resolve from `HttpContext` when scoped services are needed
  during request execution.
- Treat command handlers differently from the singleton components above:
  FastEndpoints registers them per execution, so scoped dependencies can usually
  be constructor-injected directly. If a command runs outside an HTTP request,
  use `IServiceScopeFactory` explicitly.
- Use keyed services only when the dependency truly has named variants; keep the
  key choice visible at the boundary so endpoint composition stays explainable.
- Keep service registration discoverable from startup. If you adopt
  source-generated service registrations, keep the generated extension method
  obvious in the composition root instead of hiding it behind unrelated helpers.

## Avoid

- Do not mix constructor injection and public property assignment for the same
  dependency on an endpoint.
- Do not resolve scoped services in the constructor of validators, mappers,
  processors, or event handlers without creating and disposing an explicit scope.
- Do not turn `Resolve<T>()` into the default dependency access style; it hides
  required dependencies and makes review harder.
- Do not store request-specific state on singleton FastEndpoints components.
- Do not assume command handlers always execute under an HTTP request scope if
  commands may also run from jobs or other background flows.

## Review checklist

- Required dependencies are constructor-injected unless there is a documented
  reason to use property injection or runtime resolution.
- Any singleton FastEndpoints component is stateless, or its state is genuinely
  singleton-safe.
- Scoped dependencies accessed from validators, mappers, processors, or event
  handlers use the documented scope-creation or request-scope resolution path.
- Any manual resolution or keyed-service usage is intentional and easy to trace
  during review.
- Startup registration still makes the application's service graph easy to find.

## Related files

- [Architecture map](../references/architecture-map.md)
- [Mapping](./architecture-mapping.md)
- [Command and event bus](./architecture-command-event-bus.md)
- [Job queues](./architecture-job-queues.md)
- [FastEndpoints startup and registration](./foundation-startup-registration.md)

## Source anchors

- [Dependency Injection](https://fast-endpoints.com/docs/dependency-injection)
- [ASP.NET Core keyed services](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/dependency-injection?view=aspnetcore-8.0#keyed-services)
