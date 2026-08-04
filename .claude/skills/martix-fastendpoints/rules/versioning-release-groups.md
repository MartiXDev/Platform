# FastEndpoints versioning and release groups

## Purpose

Set the default versioning strategy for FastEndpoints APIs so contract evolution,
Swagger grouping, and deprecation windows stay explicit and consumer-readable.

## Default guidance

- Prefer FastEndpoints built-in route-based versioning unless the API contract
  explicitly requires header-based negotiation or compatibility with broader
  `Asp.Versioning` conventions.
- Configure versioning once at startup by choosing the route prefix, default
  version, and whether the version segment is prepended or appended. Keep that
  choice stable across the API surface.
- When a contract changes incompatibly, leave the existing endpoint in place and
  add a new endpoint class or derived endpoint that calls `Version(n)` for the
  new contract.
- Use release groups to shape consumer-facing Swagger documents. Set
  `MaxEndpointVersion` per document when the doc should contain the latest
  eligible endpoint version up to a release boundary.
- Use release versions only when the team wants endpoints to opt into documents
  explicitly via `StartingRelease(...)` instead of relying on release-group
  inclusion rules.
- Mark the final superseded endpoint version as deprecated with `deprecateAt`
  and decide deliberately whether `ShowDeprecatedOps` belongs in the Swagger
  experience during migration.
- If header-based versioning is required, use the documented
  `FastEndpoints.AspVersioning` integration with named version sets,
  `MapToApiVersion(...)`, and Swagger documents aligned to the same API version
  model.

## Avoid

- Do not rewrite an existing endpoint contract in place when clients still need
  the earlier shape.
- Do not mix built-in route versioning and `Asp.Versioning.Http` in the same API
  surface without a very clear ownership model and documentation plan.
- Do not publish Swagger documents without an explicit grouping strategy;
  otherwise consumers see accidental mixes of versions.
- Do not mark every historical endpoint version as deprecated when only the last
  visible superseded version needs the deprecation signal.
- Do not treat cookbook samples as the versioning policy; the API versioning doc
  is the policy anchor.

## Review checklist

- The API uses one clear versioning model: built-in route versioning or
  `Asp.Versioning.Http`.
- Breaking changes create new endpoint versions instead of mutating old ones.
- Swagger documents clearly communicate release groups, release versions, or API
  versions without ambiguity.
- Deprecation timing is intentional and documented in endpoint configuration.
- The chosen strategy is reflected in related testing and cookbook references.

## Related files

- [Testing and versioning map](../references/testing-versioning-map.md)
- [Cookbook index](../references/cookbook-index.md)
- [Testing FastEndpoints rule](./testing-fastendpoints.md)

## Source anchors

- [FastEndpoints API versioning](https://fast-endpoints.com/docs/api-versioning)
- [FastEndpoints cookbook](https://fast-endpoints.com/docs/the-cookbook)
- [Cookbook recipe: Asp.Versioning.Http integration](https://gist.github.com/dj-nitehawk/fbefbcb6273d372e5e5913accb18ab76)
- [Cookbook recipe: show deprecated versions in Swagger](https://gist.github.com/dj-nitehawk/c32e7f887389460c661b955d233b650d)
