# FastEndpoints security and runtime map

## Purpose

Map the FastEndpoints security and runtime behaviors covered by this workstream
to the official documentation pages that justify the rules.

## Rule coverage

- **Authentication, authorization, and endpoint security defaults**
  - Rule files: `rules/security-authn-authz.md`
  - Primary sources:
    - [FastEndpoints security](https://fast-endpoints.com/docs/security)
  - Notes: Use for secure-by-default endpoint exposure, authentication scheme
    setup, endpoint-level authorization rules, refresh token flows, and
    antiforgery verification.
- **Response caching and request throttling**
  - Rule files: `rules/runtime-caching-rate-limits.md`
  - Primary sources:
    - [FastEndpoints response caching](https://fast-endpoints.com/docs/response-caching)
    - [FastEndpoints rate limiting](https://fast-endpoints.com/docs/rate-limiting)
  - Notes: Use for deciding whether an endpoint should emit downstream cache
    headers, use Minimal API output caching extensions, or apply FastEndpoints
    per-endpoint throttling.
- **Idempotency and exception handling**
  - Rule files: `rules/runtime-idempotency-exceptions.md`
  - Primary sources:
    - [FastEndpoints idempotency](https://fast-endpoints.com/docs/idempotency)
    - [FastEndpoints exception handler](https://fast-endpoints.com/docs/exception-handler)
    - [FastEndpoints IdempotencyOptions API reference](https://api-ref.fast-endpoints.com/api/FastEndpoints.IdempotencyOptions.html)
  - Notes: Use for duplicate-request protection, idempotency key design,
    cache-key composition, validation exception propagation, and default 500
    handling.

## Maintenance notes

- Keep these files FastEndpoints-specific. Only mention underlying ASP.NET Core
  middleware when the FastEndpoints docs explicitly depend on it, such as output
  caching or authentication middleware registration.
- Keep rule guidance reviewable at endpoint and startup level. Prefer concrete
  checks like `AllowAnonymous()`, `ResponseCache()`, `Throttle()`, and
  idempotency middleware registration over generic web-framework advice.
- If later work adds dedicated FastEndpoints guidance for validation,
  processors, or OpenAPI security integration, link it from this map instead of
  broadening these runtime files beyond their scope.
