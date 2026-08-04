# FastEndpoints idempotency and exception handling

## Purpose

Guide review of duplicate-request protection and unhandled-exception behavior in
FastEndpoints applications.

## Default guidance

- Enable FastEndpoints idempotency only for endpoints where duplicate execution
  would be materially harmful, such as payment or order-submission flows.
- Require client cooperation for idempotent endpoints. The request must include
  the configured idempotency header, and the client must generate a unique value
  per user action instead of reusing keys loosely across different operations.
- Review cache-key composition before enabling idempotency broadly. By default
  FastEndpoints considers URL, route values, query values, idempotency header,
  selected headers, form data, and body content when identifying duplicates.
- Keep `IgnoreRequestBody` off unless the clients are trusted to never reuse an
  idempotency key for a semantically different request. That switch improves
  performance by avoiding body buffering, but it reduces duplicate detection
  fidelity.
- Decide where idempotent responses live. In-memory output-cache storage may be
  enough for a single node, while multi-node deployments need a distributed
  `IOutputCacheStore` such as Redis or another shared provider.
- Use the built-in FastEndpoints exception-handler middleware to log unhandled
  exceptions and return a user-friendly 500 response unless the application has
  an intentional replacement.
- If validation failures must reach custom middleware or processors, make that
  behavior explicit and confirm the replacement path now owns validation error
  response formatting.
- Disable duplicate ASP.NET Core diagnostic logging for unhandled exceptions when
  the FastEndpoints exception handler is active so one failure produces one
  operational signal.

## Avoid

- Do not enable idempotency on every endpoint. The middleware inspects requests
  and may buffer body content, so there is a real runtime cost.
- Do not assume the idempotency key alone defines uniqueness unless the endpoint
  intentionally ignores request bodies and accepts that trade-off.
- Do not keep idempotent responses only in memory for deployments that need
  cross-node duplicate suppression.
- Do not throw validation exceptions into the middleware pipeline unless a
  custom exception or post-processing path is ready to emit the correct error
  response.
- Do not run the FastEndpoints exception handler alongside duplicate unhandled
  exception logging without an intentional reason.

## Review checklist

- Only duplicate-sensitive endpoints opt into idempotency, and each one defines
  the expected client header name and key-lifetime assumptions.
- Cache-key behavior is understood, especially whether request bodies,
  additional headers, and form uploads must participate in uniqueness.
- Cache duration, response-header behavior, and storage topology are explicit
  for idempotent endpoints.
- Unhandled-exception middleware is registered, and the logging path avoids
  duplicate records for the same failure.
- Validation-failure behavior is deliberate: either FastEndpoints keeps its
  automatic handling, or a custom middleware or post-processor now owns the
  response contract.

## Related files

- [Authentication, authorization, and secure defaults](./security-authn-authz.md)
- [Runtime caching and rate limits](./runtime-caching-rate-limits.md)
- [Security and runtime map](../references/security-runtime-map.md)

## Source anchors

- [FastEndpoints idempotency](https://fast-endpoints.com/docs/idempotency)
  - Middleware enablement, required request header, cache-key inputs,
    performance warnings, and distributed-cache guidance.
- [FastEndpoints IdempotencyOptions API reference](https://api-ref.fast-endpoints.com/api/FastEndpoints.IdempotencyOptions.html)
  - `CacheDuration`, `HeaderName`, `AddHeaderToResponse`,
    `AdditionalHeaders`, and `IgnoreRequestBody`.
- [FastEndpoints exception handler](https://fast-endpoints.com/docs/exception-handler)
  - Default 500 handling, duplicate logging warning, customization guidance, and
    validation-failure escalation behavior.
