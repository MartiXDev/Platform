# FastEndpoints request DTOs and binding

## Purpose

Set the default contract for shaping FastEndpoints request DTOs and for choosing
binding sources without surprising precedence or serializer failures.

## Default guidance

- Default to FastEndpoints automatic request binding and keep request DTOs
  transport-focused. Put endpoint inputs on the DTO and keep business logic out
  of binder customization.
- Design DTOs with FastEndpoints binding order in mind: JSON body, form fields,
  route values, query values, claims, headers, then permission checks. If more
  than one source could populate the same property, make the intended winner
  obvious.
- Use `[BindFrom]` when the external field, route, query, claim, or header name
  must differ from the DTO property name. Prefer a shared naming policy when the
  mismatch is systemic rather than one-off.
- For mixed-source requests that also use C# `required`, annotate non-body
  properties with their explicit source attributes such as `[RouteParam]`,
  `[QueryParam]`, `[FormField]`, `[FromHeader]`, or `[FromClaim]` so STJ does
  not fail JSON deserialization before FastEndpoints can finish binding.
- Use `[FromBody]` when the request body should bind into a single DTO property
  instead of the whole request DTO, and use a single root `[FromForm]` or
  `[FromQuery]` property when binding deeply nested complex form/query graphs.
- Call `AllowFormData()` for endpoints that intentionally accept
  `multipart/form-data`, and configure URL-encoded form handling only when that
  transport is part of the contract.
- Prefer strongly typed route parameter configuration when route segments bind
  directly to DTO members, so route templates stay coupled to request-property
  names instead of duplicated string literals.
- For custom scalar-like types bound from route/query/form/header/claim values,
  implement `TryParse()` or `IParsable<TSelf>`, or register a custom value
  parser. Reserve custom request binders for cases the built-in binder and
  binding modifier cannot express cleanly.
- Implement `IPlainTextRequest` only when the endpoint truly needs raw request
  body text instead of JSON binding.

## Avoid

- Do not rely on accidental source precedence when the same property can arrive
  from both body and route/query inputs.
- Do not mix JSON body binding with `required` route/query/header/claim
  properties unless those non-body properties are explicitly marked with the
  correct FastEndpoints source attributes.
- Do not introduce a global custom binder just to tweak one request family or
  one endpoint.
- Do not make Swagger route parameter casing harder than necessary; keep route
  naming aligned with the app naming policy when possible.
- Do not add request DTO state that depends on per-request mutation outside the
  documented binding pipeline.

## Review checklist

- The request DTO makes its binding sources clear anywhere mixed binding could
  be ambiguous.
- Nested form or query binding uses the documented field naming conventions and
  exactly one root `[FromForm]` or `[FromQuery]` property.
- Custom types bound from non-JSON sources have `TryParse()`, `IParsable`, or a
  registered value parser.
- Any custom binder or binding modifier is scoped narrowly and justified by a
  real binding gap.
- Raw text binding via `IPlainTextRequest` is intentional and not a workaround
  for avoidable serializer or DTO design issues.

## Related files

- [Validation errors](./contracts-validation-errors.md)
- [Endpoint conveniences](./pipeline-endpoint-conveniences.md)
- [Configuration options](./foundation-configuration-options.md)
- [Request pipeline map](../references/request-pipeline-map.md)

## Source anchors

- [FastEndpoints model binding](https://fast-endpoints.com/docs/model-binding)
- [FastEndpoints misc conveniences](https://fast-endpoints.com/docs/misc-conveniences)
