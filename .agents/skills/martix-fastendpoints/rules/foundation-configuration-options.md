# FastEndpoints configuration options

## Purpose

Capture the FastEndpoints-specific startup options that shape serialization,
binding, route composition, shared endpoint conventions, and FE-managed error
or response behavior.

## Default guidance

- Put FastEndpoints runtime customization in the `UseFastEndpoints(...)` call,
  because that is where the library expects app startup settings to be applied.
- Configure serializer options in one deliberate place. If you use union-type
  handlers, prefer the ASP.NET `JsonOptions` path the docs call out, because
  the serializer settings inside `UseFastEndpoints(...)` do not apply there.
- Enable unified property naming only when the team wants the same convention
  across JSON, query, form, route, and header binding. Otherwise keep the
  default case-insensitive binding behavior and use explicit binding attributes
  only where needed.
- Use a global route prefix for app-wide FE route composition, and reserve
  `RoutePrefixOverride()` for deliberate exceptions rather than ad hoc route
  customization.
- Pick one reuse mechanism for shared endpoint conventions: use
  `Endpoints.Configurator` for a flat global policy, or `Group` / `SubGroup`
  classes when vertical-slice teams want hierarchical route and policy reuse.
- If you override FE error responses or JSON serialization, remember those hooks
  change FastEndpoints-managed responses; custom response serialization does not
  apply to `TypedResults` / `IResult` outcomes.

## Avoid

- Do not let serializer configuration diverge between `UseFastEndpoints(...)`
  and `JsonOptions` when union-type handlers are part of the same app.
- Do not add compounding configurator calls such as `Roles()`, `Policies()`,
  `Tags()`, or pre/post-processors globally without confirming the additive
  effect is wanted.
- Do not use `RoutePrefixOverride()` casually; it replaces endpoint-level route
  prefix behavior instead of layering on top of it.
- Do not assume a custom FE serializer hook will affect every response path in
  the app; `Send.*Async()` and `TypedResults` have different behavior.

## Review checklist

- Serializer settings match the handler style being used, especially for
  union-type endpoints.
- Naming policy choices are intentional across non-JSON binding sources.
- Shared route prefixes, filters, configurators, or groups are easy to trace
  from startup to endpoint behavior.
- Any custom FE error/serialization hooks document which response paths they do
  and do not affect.

## Related files

- [Startup and registration](./foundation-startup-registration.md)
- [Source generation and Native AOT](./foundation-source-generation-aot.md)
- [Scaffolding](./foundation-scaffolding.md)
- [FastEndpoints foundation map](../references/foundation-map.md)

## Source anchors

- [Configuration Settings - Specify JSON Serializer Options](https://fast-endpoints.com/docs/configuration-settings#specify-json-serializer-options)
- [Configuration Settings - Unified Property Naming Policy](https://fast-endpoints.com/docs/configuration-settings#unified-property-naming-policy)
- [Configuration Settings - Global Route Prefix](https://fast-endpoints.com/docs/configuration-settings#global-route-prefix)
- [Configuration Settings - Filtering Endpoint Registration](https://fast-endpoints.com/docs/configuration-settings#filtering-endpoint-registration)
- [Configuration Settings - Global Endpoint Options](https://fast-endpoints.com/docs/configuration-settings#global-endpoint-options)
- [Configuration Settings - Endpoint Configuration Groups](https://fast-endpoints.com/docs/configuration-settings#endpoint-configuration-groups)
- [Configuration Settings - Customizing Error Responses](https://fast-endpoints.com/docs/configuration-settings#customizing-error-responses)
- [Configuration Settings - Custom Response DTO Serialization](https://fast-endpoints.com/docs/configuration-settings#custom-response-dto-serialization)
