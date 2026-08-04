# FastEndpoints request pipeline map

## Purpose

Map the FastEndpoints request-pipeline topics covered by this workstream so
rules stay aligned with the official docs and link to the right companion
guidance.

## Rule coverage

- **Request DTO contracts and binding**
  - Rule files: `rules/contracts-request-dtos-binding.md`
  - Primary sources:
    - [Model binding](https://fast-endpoints.com/docs/model-binding)
    - [Misc conveniences](https://fast-endpoints.com/docs/misc-conveniences)
  - Notes: Use for binding order, per-property source selection, form/query
    conventions, custom binders, raw body access, and strongly typed route
    parameter setup.
- **Validation contracts and failure responses**
  - Rule files: `rules/contracts-validation-errors.md`
  - Primary sources:
    - [Validation](https://fast-endpoints.com/docs/validation)
    - [Misc conveniences](https://fast-endpoints.com/docs/misc-conveniences)
  - Notes: Use for `Validator<TRequest>`, automatic 400 responses, manual error
    flows, duplicate validator selection, and endpoint send helpers that return
    validation failures.
- **Reusable pre/post processor pipeline behavior**
  - Rule files: `rules/pipeline-pre-post-processors.md`
  - Primary sources:
    - [Pre / post processors](https://fast-endpoints.com/docs/pre-post-processors)
    - [Misc conveniences](https://fast-endpoints.com/docs/misc-conveniences)
  - Notes: Use for endpoint-level and global processors, ordering,
    short-circuiting, exception handling, shared processor state, and hook
    method boundaries.
- **Endpoint conveniences and lifecycle hooks**
  - Rule files: `rules/pipeline-endpoint-conveniences.md`
  - Primary sources:
    - [Misc conveniences](https://fast-endpoints.com/docs/misc-conveniences)
    - [Model binding](https://fast-endpoints.com/docs/model-binding)
  - Notes: Use for endpoint properties, send helpers, multi-verb/route setup,
    strongly typed route parameters, hook methods, and `Route<T>()` /
    `Query<T>()` fallback access when no request DTO exists.

## Related files

- [Request DTOs and binding rule](../rules/contracts-request-dtos-binding.md)
- [Validation and error contracts rule](../rules/contracts-validation-errors.md)
- [Pre and post processors rule](../rules/pipeline-pre-post-processors.md)
- [Endpoint conveniences and hooks rule](../rules/pipeline-endpoint-conveniences.md)
- [FastEndpoints foundation map](./foundation-map.md)

## Source anchors

- [FastEndpoints model binding](https://fast-endpoints.com/docs/model-binding)
  - Binding order, body/form/route/query sources, claim/header/permission
    binding, custom parsers, custom binders, and raw text request handling.
- [FastEndpoints validation](https://fast-endpoints.com/docs/validation)
  - `Validator<TRequest>`, automatic 400 responses, manual validation failure
    handling, duplicate validators, singleton validator behavior, and
    DataAnnotations fallback.
- [FastEndpoints misc conveniences](https://fast-endpoints.com/docs/misc-conveniences)
  - Multi-verb routing, shorthand route setup, strongly typed route parameters,
    endpoint properties, send helpers, and endpoint hook methods.
- [FastEndpoints pre / post processors](https://fast-endpoints.com/docs/pre-post-processors)
  - Endpoint and global processors, short-circuiting, processor order, shared
    state, and post-processor exception handling.

## Maintenance notes

- Keep this workstream FastEndpoints-specific. General ASP.NET Core design
  guidance belongs in `skills/martix-dotnet-csharp/`.
- Coordinate with [`foundation-map.md`](./foundation-map.md) when request
  pipeline guidance depends on startup-time naming, serializer, or error
  response configuration.
- When later work adds FastEndpoints coverage for configuration, security, or
  OpenAPI concerns, link the new rule files here instead of overloading these
  pipeline-focused documents.
- Keep cross-links between these rules current so agents can move from DTO
  binding to validation and then to processor behavior without re-discovering
  the package layout.
