# FastEndpoints pre and post processors

## Purpose

Set the default boundary for reusable FastEndpoints pipeline behavior that runs
before or after endpoint handlers.

## Default guidance

- Use endpoint hook methods for endpoint-specific lifecycle tweaks and move to
  processors when the same concern must run across multiple endpoints.
- Implement `IPreProcessor<TRequest>` for reusable logic that must run before
  the handler, such as request logging, tenant checks, or short-circuit guards.
- Short-circuit from a pre-processor only when the processor owns that contract.
  If one pre-processor sends a response, later pre-processors must first check
  `ctx.HttpContext.ResponseStarted()` before trying to write another response.
- Implement `IPostProcessor<TRequest, TResponse>` for concerns that run after
  handler execution, such as audit logging, result-pattern translation, or
  exception observation.
- Treat processor ordering as part of the endpoint contract. Multiple
  `PreProcessor<>()` and `PostProcessor<>()` registrations run in configuration
  order, and global processors can be placed before or after endpoint-level
  processors via the configured `Order`.
- Keep processors stateless and singleton-safe. Share per-request data through a
  processor state bag and `ProcessorState<TState>()`, not through instance
  fields, static state, or ambient mutable globals.
- Use global processors for truly cross-cutting concerns that apply to many
  endpoints, and prefer open-generic global processors when the behavior should
  follow a broad request/response pattern.
- Use a response interceptor or global response modifier instead of a
  post-processor when the requirement is to mutate headers or the response body
  immediately before the response is written.
- If a post-processor handles a captured unhandled exception completely, call
  `MarkExceptionAsHandled()`; otherwise allow FastEndpoints to rethrow after
  processors finish.

## Avoid

- Do not hide core business workflow inside processors that are hard to discover
  from the endpoint configuration.
- Do not store mutable request state on singleton processor instances.
- Do not write a second response from a later pre-processor after another
  processor has already started the response.
- Do not expect post-processors to rewrite headers or the body after the handler
  has already sent the response.
- Do not swallow exceptions in post-processors without making the handling path
  explicit.

## Review checklist

- The chosen extension point matches the scope: hook method for endpoint-local
  behavior, processor for reusable cross-cutting behavior.
- Pre-processor short-circuit behavior is explicit and later processors guard on
  `ResponseStarted()`.
- Processor ordering is intentional for endpoint-level and global processors.
- Shared per-request state uses the processor state bag pattern rather than
  singleton fields.
- Any exception handling in post-processors either marks the exception handled or
  deliberately lets FastEndpoints rethrow it.

## Related files

- [Endpoint conveniences](./pipeline-endpoint-conveniences.md)
- [Validation errors](./contracts-validation-errors.md)
- [Configuration options](./foundation-configuration-options.md)
- [Request pipeline map](../references/request-pipeline-map.md)

## Source anchors

- [FastEndpoints pre / post processors](https://fast-endpoints.com/docs/pre-post-processors)
- [FastEndpoints misc conveniences](https://fast-endpoints.com/docs/misc-conveniences)
