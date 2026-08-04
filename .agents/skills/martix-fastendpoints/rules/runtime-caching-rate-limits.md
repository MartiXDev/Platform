# FastEndpoints response caching and rate limiting

## Purpose

Describe when to use FastEndpoints response-caching and throttling features, and
how to review their operational boundaries per endpoint.

## Default guidance

- Use `ResponseCache()` only when the goal is to emit downstream cache headers
  for browsers or proxies. Review startup to confirm the response-caching
  middleware is enabled before expecting the endpoint setting to matter.
- Keep response caching limited to safe responses whose cache duration,
  variation behavior, and downstream visibility are acceptable if replayed by
  intermediaries.
- If server-side stored responses are needed, use the Minimal API output-caching
  extension path that FastEndpoints points to instead of assuming
  `ResponseCache()` stores anything on the server.
- Use `Throttle()` only for endpoint-local request shaping. Pick the client
  identity header deliberately instead of depending on forwarded IP data unless
  the hosting environment makes that reliable enough.
- Document what identifies a unique client for throttling. A client-generated
  stable identifier header is the FastEndpoints-recommended default when callers
  are under your control.
- Treat FastEndpoints throttling as a convenience guardrail, not as DDoS or
  abuse protection. Put real global or hostile-client protection at the gateway
  or another out-of-process layer.

## Avoid

- Do not describe response caching as server-side caching; FastEndpoints is
  explicit that `ResponseCache()` only manipulates HTTP cache headers.
- Do not throttle based on `X-Forwarded-For` or remote IP without validating the
  reverse-proxy chain and NAT behavior for the deployment.
- Do not use FastEndpoints rate limiting as a security boundary. Malicious
  clients can rotate header values and bypass it.
- Do not expect a global FastEndpoints throttle policy. The docs are explicit
  that only per-endpoint limits are supported.

## Review checklist

- Response-caching middleware is enabled, and each endpoint using
  `ResponseCache()` is safe to cache downstream.
- Review notes distinguish response caching from output caching and state
  whether server-side cached responses are or are not required.
- Each throttled endpoint defines the hit limit, window, and client identity
  source, including what happens when that identity cannot be resolved.
- Operational design calls out that unresolved client identity can lead to a
  forbidden response and that throttling adds some per-request overhead.
- Abuse protection requirements beyond endpoint-local shaping are assigned to
  gateway, proxy, or another external rate-limiting layer.

## Related files

- [Authentication, authorization, and secure defaults](./security-authn-authz.md)
- [Runtime idempotency and exceptions](./runtime-idempotency-exceptions.md)
- [Security and runtime map](../references/security-runtime-map.md)

## Source anchors

- [FastEndpoints response caching](https://fast-endpoints.com/docs/response-caching)
  - `ResponseCache()` requirements, middleware dependency, and the distinction
    between response caching and output caching.
- [FastEndpoints rate limiting](https://fast-endpoints.com/docs/rate-limiting)
  - `Throttle()` behavior, default client identity lookup, 429 or 403 behavior,
    and the security and performance warnings.
