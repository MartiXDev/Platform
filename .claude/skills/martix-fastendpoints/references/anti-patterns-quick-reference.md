# FastEndpoints anti-patterns quick reference

## Purpose

Use this file for fast mistake triage. It is an index into the rule library, not
a replacement for the rules.

## Quick triage table

| Anti-pattern | Prefer | Primary rule |
| --- | --- | --- |
| Mix `Configure()` and endpoint attributes on one endpoint | Pick one style; prefer `Configure()` for non-trivial endpoints | [FastEndpoints startup and registration](../rules/foundation-startup-registration.md) |
| Put `UseSwaggerGen()` before `UseFastEndpoints()` | Keep `UseSwaggerGen()` after `UseFastEndpoints()` | [Swagger and OpenAPI with FastEndpoints](../rules/docs-swagger-openapi.md) |
| Let FE serializer settings drift from `JsonOptions` | Keep serializer behavior aligned across both surfaces | [FastEndpoints configuration options](../rules/foundation-configuration-options.md) |
| Use `RoutePrefixOverride()` as a convenience | Keep shared prefixes/groups unless the route really needs an exception | [FastEndpoints configuration options](../rules/foundation-configuration-options.md) |
| Treat cookbook samples as policy | Start with the mapped rule or reference, then use recipes second | [FastEndpoints cookbook index](./cookbook-index.md) |
| Rewrite an old endpoint version in place | Publish a new version and deprecate intentionally | [FastEndpoints versioning and release groups](../rules/versioning-release-groups.md) |
| Use `AllowAnonymous()` to dodge endpoint design | Make public exposure a deliberate contract choice | [FastEndpoints authentication, authorization, and secure defaults](../rules/security-authn-authz.md) |

## Wrong / Better

- **Wrong:** Mix `Configure()` with route and verb attributes on one endpoint.  
  **Better:** Use `Configure()` only, or the limited attribute path only.
- **Wrong:** Add docs middleware before FastEndpoints endpoint metadata
  exists.  
  **Better:** Run FastEndpoints first, then let `UseSwaggerGen()` read the final
  surface.
- **Wrong:** Tweak FE serializer settings without matching `JsonOptions`.  
  **Better:** Review serializer behavior as one shared contract.
- **Wrong:** Edit `v1` in place until it behaves like `v2`.  
  **Better:** Add `v2` explicitly and keep older versions visible on purpose.

## Related files

- [MartiX FastEndpoints router](../SKILL.md)
- [MartiX FastEndpoints companion](../AGENTS.md)
- [FastEndpoints foundation map](./foundation-map.md)
- [FastEndpoints transport and docs map](./transport-docs-map.md)
- [FastEndpoints security and runtime map](./security-runtime-map.md)
- [FastEndpoints testing and versioning map](./testing-versioning-map.md)

## Source anchors

- [Get Started](https://fast-endpoints.com/docs/get-started)
  - `Configure()` versus attribute configuration, startup flow, and endpoint
    registration.
- [Configuration Settings](https://fast-endpoints.com/docs/configuration-settings)
  - Serializer alignment, route prefixes, configurators, and source-generation
    wiring.
- [Swagger Support](https://fast-endpoints.com/docs/swagger-support)
  - `FastEndpoints.Swagger`, NSwag integration, and middleware ordering.
- [Security](https://fast-endpoints.com/docs/security)
  - Deliberate anonymous exposure and endpoint-level auth choices.
- [API Versioning](https://fast-endpoints.com/docs/api-versioning)
  - Release groups, explicit version publication, and deprecation strategy.

## Maintenance notes

- Keep each anti-pattern sourced from an existing rule or mapped reference.
- Update this file when high-value `Avoid` guidance becomes hard to discover
  across the rule library.
