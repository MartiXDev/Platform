# FastEndpoints authentication, authorization, and secure defaults

## Purpose

Capture the FastEndpoints-specific security decisions that should be reviewed in
startup configuration and in each endpoint definition.

## Default guidance

- Treat endpoints as protected by default. Require an explicit
  `AllowAnonymous()` decision for public access, and review verb-specific
  anonymous allowances carefully when an endpoint handles multiple verbs.
- Register authentication in the ASP.NET Core pipeline first, then keep
  endpoint-level authorization requirements close to the endpoint using
  FastEndpoints role, claim, permission, scope, policy, and scheme settings.
- Be explicit when mixing JWT bearer, cookies, Identity, or custom schemes.
  Review which scheme becomes the default, and pin endpoint-specific schemes
  when only one scheme should be accepted.
- Use the FastEndpoints security wrappers when they fit the application:
  `FastEndpoints.Security` for JWT and cookie convenience, refresh token
  services for token rotation flows, and token revocation middleware when JWTs
  must be invalidated after issuance.
- For browser form flows, enable antiforgery verification only where required
  and confirm the client sends both the antiforgery cookie and the form-field or
  header token expected by the configured middleware.
- Keep permission and policy names stable and reviewable. If the source
  generator is used for access-control lists, verify generated permissions are
  still enforced with explicit endpoint requirements.

## Avoid

- Do not rely on implicit defaults when multiple authentication schemes are
  registered; the last wrapper registration becoming the default is easy to miss
  during reviews.
- Do not use `AllowAnonymous()` as a convenience shortcut on mixed-purpose
  endpoints without checking which verbs and routes become public.
- Do not assume cookie auth alone solves browser security. Form submissions that
  mutate state still need explicit antiforgery decisions.
- Do not treat generated permission constants, refresh tokens, or revocation
  hooks as sufficient by themselves; the endpoint still needs clear access rules
  and operational revocation storage.

## Review checklist

- Authentication middleware is registered, and the default scheme is explicit
  when JWT, cookies, Identity, or custom schemes coexist.
- Each endpoint's access posture is obvious: protected by default, anonymous by
  exception, and scheme restrictions are deliberate where needed.
- Authorization requirements use the narrowest practical mechanism: policy,
  role, claim, permission, or scope, with `All` variants used when every value
  is required.
- Login, refresh-token, and token-revocation flows identify where signing keys,
  token lifetimes, and revoked-token state are stored and rotated.
- Browser-based form endpoints that rely on cookies have an antiforgery plan,
  including token issuance and client submission behavior.

## Related files

- [Runtime caching and rate limits](./runtime-caching-rate-limits.md)
- [Runtime idempotency and exceptions](./runtime-idempotency-exceptions.md)
- [Security and runtime map](../references/security-runtime-map.md)

## Source anchors

- [FastEndpoints security](https://fast-endpoints.com/docs/security)
  - Secure-by-default endpoints, JWT and cookie wrappers, claims or roles or
    permissions or scopes, multiple schemes, refresh tokens, revocation, and
    antiforgery guidance.
