# FastEndpoints endpoint conveniences and hooks

## Purpose

Capture the default FastEndpoints-specific conveniences that simplify endpoint
configuration, response sending, and single-endpoint lifecycle customization.

## Default guidance

- Prefer the shorthand route methods (`Get()`, `Post()`, `Put()`, `Patch()`,
  `Delete()`) for single-verb endpoints. Use `Verbs()` and `Routes()` only when
  one endpoint class intentionally serves multiple verbs or route templates.
- Treat multi-verb or multi-route endpoints as an optimization, not a default.
  Remember that each configured verb/route combination becomes a separate route
  registration even if the handler logic is shared.
- Use strongly typed route parameter configuration when DTO-bound route segments
  should stay coupled to request-property names, and combine it with `[BindFrom]`
  when the public route parameter name must differ from the DTO property.
- Prefer built-in endpoint properties such as `HttpContext`, `User`, `Logger`,
  `Env`, `Config`, `Files`, `Form`, `ValidationFailed`, and
  `ValidationFailures` instead of re-fetching the same request-scoped context by
  hand.
- Use the `Send.*Async()` helpers that match the HTTP contract:
  `OkAsync()`, `CreatedAtAsync()`, `AcceptedAtAsync()`, `NoContentAsync()`,
  `ErrorsAsync()`, `NotFoundAsync()`, `UnauthorizedAsync()`,
  `ForbiddenAsync()`, `FileAsync()`, `StreamAsync()`, and related helpers.
- Use `ResultAsync()` when the endpoint intentionally returns a Minimal APIs
  `IResult` or `TypedResults` instance instead of a normal FastEndpoints
  response DTO flow.
- Add custom response-sending extensions on `IResponseSender` when many
  endpoints need the same response shape or header pattern.
- Use endpoint hook methods when the behavior is local to one endpoint:
  `OnBeforeValidate()`, `OnAfterValidate()`, `OnValidationFailed()`,
  `OnBeforeHandle()`, and `OnAfterHandle()`. Escalate to processors only when
  the same logic must be shared more broadly.
- If an endpoint has no request DTO, use `Route<T>()` and `Query<T>()` for
  direct access to route and query values that support FastEndpoints parsing.

## Avoid

- Do not collapse unrelated use cases into one multi-route or multi-verb
  endpoint just because the framework allows it.
- Do not bypass `Send.*Async()` helpers with manual response writing unless the
  response contract genuinely needs lower-level control.
- Do not use hook methods as a hidden substitute for reusable processor-based
  cross-cutting concerns.
- Do not treat endpoint convenience properties as shared mutable state beyond
  the current request.
- Do not assume response changes made after a handler sends data will still take
  effect; pick the correct lifecycle point up front.

## Review checklist

- Route configuration is as simple as the contract allows, with multi-route or
  multi-verb setup used only when it reduces duplication without obscuring the
  API surface.
- The endpoint uses the `Send.*Async()` helper that best matches its published
  HTTP response contract.
- Hook methods are used only for endpoint-local lifecycle behavior; shared
  concerns move to processors.
- Built-in endpoint properties cover request context access without unnecessary
  extra plumbing.
- DTO-less endpoints using `Route<T>()` or `Query<T>()` only rely on types that
  FastEndpoints can parse.

## Related files

- [Request DTOs and binding](./contracts-request-dtos-binding.md)
- [Pre/post processors](./pipeline-pre-post-processors.md)
- [Validation errors](./contracts-validation-errors.md)
- [Configuration options](./foundation-configuration-options.md)
- [Request pipeline map](../references/request-pipeline-map.md)

## Source anchors

- [FastEndpoints misc conveniences](https://fast-endpoints.com/docs/misc-conveniences)
- [FastEndpoints model binding](https://fast-endpoints.com/docs/model-binding)
- [FastEndpoints pre / post processors](https://fast-endpoints.com/docs/pre-post-processors)
