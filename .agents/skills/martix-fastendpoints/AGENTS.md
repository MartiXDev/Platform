---
description: 'Long-form companion guide for the martix-fastendpoints standalone skill package'
---

# MartiX FastEndpoints companion

- This file is the long-form companion to [SKILL.md](./SKILL.md).
- The package follows a layered, standalone-first split: `SKILL.md` routes
  activation, `AGENTS.md` explains how to apply the library, `rules\*.md`
  holds atomic guidance, `references\*.md` maps guidance to approved
  FastEndpoints sources, and `templates\*.md` plus `assets\*.json` keep the
  package maintainable.
- Start with the closest bundled workstream map and keep
  [the cookbook index](./references/cookbook-index.md) as a second-pass
  expansion surface instead of a first-stop rule source.

## Package inventory

| Layer | Purpose | Key files |
| --- | --- | --- |
| Discovery | Quick activation and workstream routing | [SKILL.md](./SKILL.md) |
| Companion | Cross-workstream guidance, review routes, and maintainer notes | [AGENTS.md](./AGENTS.md) |
| Rules | 20 atomic FastEndpoints decision guides grouped by workstream | [Rule section contract](./rules/_sections.md) |
| References | 8 maps and quick references | [Anti-patterns quick reference](./references/anti-patterns-quick-reference.md) |
| Templates | Authoring, research, and comparison scaffolds | [Rule template](./templates/rule-template.md) |
| Assets | Preferred taxonomy and ordering | [taxonomy.json](./assets/taxonomy.json) and [section-order.json](./assets/section-order.json) |
| Metadata | Package identity, release notes, and distribution intent | [metadata.json](./metadata.json) |

## Working stance

- Keep this package FastEndpoints-specific. General ASP.NET Core, broader .NET,
  or language-wide guidance belongs in the sibling MartiX .NET skill unless the
  FastEndpoints docs introduce framework-specific behavior.
- Prefer documented FastEndpoints defaults before custom wrappers: explicit
  `Configure()` methods, request DTOs, validators, send helpers, processors,
  groups, and release-group-aware versioning.
- Keep startup registration, endpoint contracts, transport choices, security,
  and tests aligned instead of treating them as separate cleanup passes.
- Use the cookbook only after the primary doc-backed map identifies the
  workstream; cookbook samples are implementation examples, not policy.
- Keep review notes concrete at endpoint, validator, mapper, processor,
  transport, and startup level.
- For mistake-first review, open
  [the anti-patterns quick reference](./references/anti-patterns-quick-reference.md)
  before expanding into workstream rules.

## Workstream playbook

## Foundation and hosting

- Open this workstream before changing package setup, endpoint discovery,
  `AddFastEndpoints(...)`, `UseFastEndpoints(...)`, serializer or naming
  options, feature scaffolding, or Native AOT wiring.
- Start with
  [FastEndpoints startup and registration](./rules/foundation-startup-registration.md),
  then add
  [FastEndpoints configuration options](./rules/foundation-configuration-options.md),
  [FastEndpoints source generation and Native AOT](./rules/foundation-source-generation-aot.md),
  and [FastEndpoints scaffolding](./rules/foundation-scaffolding.md) as needed.
- Pair with the
  [FastEndpoints foundation map](./references/foundation-map.md) when startup
  assumptions or supported configuration knobs matter.
- Review questions:
  - Is the host wiring using documented registration and middleware order?
  - Are shared FastEndpoints options declared once instead of repeated per
    endpoint?
  - Did the change introduce AOT, source-generation, or scaffolding assumptions
    without matching project setup?

## Architecture and messaging

- Open this workstream for mapper boundaries, service resolution choices,
  endpoint-to-handler decomposition, command or event bus usage, and durable job
  execution.
- Start with
  [FastEndpoints request, entity, and response mapping](./rules/architecture-mapping.md),
  [FastEndpoints dependency injection and service resolution](./rules/architecture-di-service-resolution.md),
  [FastEndpoints commands, events, and bus composition](./rules/architecture-command-event-bus.md),
  and [FastEndpoints job queues and background execution](./rules/architecture-job-queues.md).
- Pair with the
  [FastEndpoints architecture map](./references/architecture-map.md) when you
  need the source trail behind mapper lifetime, event fan-out, or queue design.
- Review questions:
  - Does mapping live in the smallest durable place: endpoint, mapper, or
    handler?
  - Are service lifetimes and resolution patterns safe for singleton mappers,
    validators, and processors?
  - Should work stay inline, move behind the command bus, publish as an event,
    or enter a queue?

## Request pipeline

- Open this workstream for binding rules, request DTO shape, validation flow,
  endpoint hook usage, send helpers, and reusable pre or post processor logic.
- Start with
  [FastEndpoints request DTOs and binding](./rules/contracts-request-dtos-binding.md),
  [FastEndpoints validation and error contracts](./rules/contracts-validation-errors.md),
  [FastEndpoints endpoint conveniences and hooks](./rules/pipeline-endpoint-conveniences.md),
  and [FastEndpoints pre and post processors](./rules/pipeline-pre-post-processors.md).
- Pair with the
  [FastEndpoints request pipeline map](./references/request-pipeline-map.md) for
  the official source trail behind DTO binding and processor behavior.
- Review questions:
  - Are binding sources explicit enough for route, query, form, claim, or raw
    body input?
  - Does validation stay aligned with the endpoint contract and failure shape?
  - Should shared logic live in hooks, processors, or a different abstraction?

## Transport and documentation

- Open this workstream for Swagger setup, NSwag integration, endpoint metadata,
  API client export, file transfer, stream responses, SSE flows, and RPC design.
- Start with
  [Swagger and OpenAPI with FastEndpoints](./rules/docs-swagger-openapi.md),
  [File handling, streaming, and server-sent events](./rules/transport-files-streaming-sse.md),
  and [RPC and HTTP transport patterns](./rules/transport-rpc-http-patterns.md).
- Pair with the
  [FastEndpoints transport and docs map](./references/transport-docs-map.md),
  then cross into security or testing when the chosen transport affects
  authorization or verification strategy.
- Review questions:
  - Is the contract better expressed as a normal FastEndpoints HTTP endpoint, a
    streamed response, SSE, or RPC?
  - Are file handling and streaming paths explicit about buffering, size, and
    response shape?
  - Do Swagger and OpenAPI docs expose the latest intended surface accurately?

## Runtime and security

- Open this workstream for authentication, authorization, anonymous exposure,
  antiforgery, response caching, throttling, idempotency, and exception
  handling.
- Start with
  [FastEndpoints authentication, authorization, and secure defaults](./rules/security-authn-authz.md),
  [FastEndpoints response caching and rate limiting](./rules/runtime-caching-rate-limits.md),
  and [FastEndpoints idempotency and exception handling](./rules/runtime-idempotency-exceptions.md).
- Pair with the
  [FastEndpoints security and runtime map](./references/security-runtime-map.md)
  when you need the doc trail behind endpoint-level security or runtime policy.
- Review questions:
  - Are auth and authz requirements explicit at startup and endpoint level?
  - Is throttling, response caching, or idempotency applied only where the
    contract actually needs it?
  - Will exception behavior preserve the intended failure contract?

## Testing and versioning

- Open this workstream for endpoint integration coverage, handler-only unit
  coverage, test auth, test containers, release groups, and API versioning
  strategy.
- Start with [FastEndpoints testing](./rules/testing-fastendpoints.md) and
  [FastEndpoints versioning and release groups](./rules/versioning-release-groups.md).
- Pair with the
  [FastEndpoints testing and versioning map](./references/testing-versioning-map.md)
  for the doc-backed strategy, then add
  [the cookbook index](./references/cookbook-index.md) only when a tested
  scenario needs a recipe-level example.
- Review questions:
  - Does the scenario need full pipeline coverage or only handler logic?
  - Is built-in route versioning enough, or is `Asp.Versioning.Http` a real
    requirement?
  - Are release groups and deprecated operations visible to consumers on
    purpose?

## Common review routes

| Scenario | Start with | Then add |
| --- | --- | --- |
| New FastEndpoints feature slice | [FastEndpoints startup and registration](./rules/foundation-startup-registration.md) | [FastEndpoints request DTOs and binding](./rules/contracts-request-dtos-binding.md), [FastEndpoints validation and error contracts](./rules/contracts-validation-errors.md), [FastEndpoints endpoint conveniences and hooks](./rules/pipeline-endpoint-conveniences.md), [FastEndpoints testing](./rules/testing-fastendpoints.md) |
| Shared configuration or AOT change | [FastEndpoints configuration options](./rules/foundation-configuration-options.md) | [FastEndpoints source generation and Native AOT](./rules/foundation-source-generation-aot.md), [Swagger and OpenAPI with FastEndpoints](./rules/docs-swagger-openapi.md), [FastEndpoints foundation map](./references/foundation-map.md) |
| DTO binding or validation bug | [FastEndpoints request DTOs and binding](./rules/contracts-request-dtos-binding.md) | [FastEndpoints validation and error contracts](./rules/contracts-validation-errors.md), [FastEndpoints endpoint conveniences and hooks](./rules/pipeline-endpoint-conveniences.md), [FastEndpoints request pipeline map](./references/request-pipeline-map.md) |
| Startup ordering or Swagger middleware bug | [FastEndpoints anti-patterns quick reference](./references/anti-patterns-quick-reference.md) | [FastEndpoints startup and registration](./rules/foundation-startup-registration.md), [Swagger and OpenAPI with FastEndpoints](./rules/docs-swagger-openapi.md), [FastEndpoints foundation map](./references/foundation-map.md) |
| Processor or cross-cutting pipeline design | [FastEndpoints pre and post processors](./rules/pipeline-pre-post-processors.md) | [FastEndpoints endpoint conveniences and hooks](./rules/pipeline-endpoint-conveniences.md), [FastEndpoints dependency injection and service resolution](./rules/architecture-di-service-resolution.md), [FastEndpoints testing](./rules/testing-fastendpoints.md) |
| File upload, download, streaming, or SSE work | [File handling, streaming, and server-sent events](./rules/transport-files-streaming-sse.md) | [Swagger and OpenAPI with FastEndpoints](./rules/docs-swagger-openapi.md), [FastEndpoints authentication, authorization, and secure defaults](./rules/security-authn-authz.md), [FastEndpoints testing](./rules/testing-fastendpoints.md) |
| RPC, commands, events, or queues | [RPC and HTTP transport patterns](./rules/transport-rpc-http-patterns.md) | [FastEndpoints commands, events, and bus composition](./rules/architecture-command-event-bus.md), [FastEndpoints job queues and background execution](./rules/architecture-job-queues.md), [FastEndpoints architecture map](./references/architecture-map.md) |
| Auth, throttling, caching, or idempotency review | [FastEndpoints authentication, authorization, and secure defaults](./rules/security-authn-authz.md) | [FastEndpoints response caching and rate limiting](./rules/runtime-caching-rate-limits.md), [FastEndpoints idempotency and exception handling](./rules/runtime-idempotency-exceptions.md), [FastEndpoints security and runtime map](./references/security-runtime-map.md) |
| Versioning or test harness design | [FastEndpoints testing](./rules/testing-fastendpoints.md) | [FastEndpoints versioning and release groups](./rules/versioning-release-groups.md), [FastEndpoints testing and versioning map](./references/testing-versioning-map.md), [FastEndpoints cookbook index](./references/cookbook-index.md) |

## Reference map index

- [FastEndpoints foundation map](./references/foundation-map.md)
- [FastEndpoints anti-patterns quick reference](./references/anti-patterns-quick-reference.md)
- [FastEndpoints architecture map](./references/architecture-map.md)
- [FastEndpoints request pipeline map](./references/request-pipeline-map.md)
- [FastEndpoints transport and docs map](./references/transport-docs-map.md)
- [FastEndpoints security and runtime map](./references/security-runtime-map.md)
- [FastEndpoints testing and versioning map](./references/testing-versioning-map.md)
- [FastEndpoints cookbook index](./references/cookbook-index.md)

## Maintenance and package growth

## Authoring contract

- Keep every rule aligned with
  [rules/_sections.md](./rules/_sections.md).
- Use [the rule template](./templates/rule-template.md) when adding or revising
  rule files.
- Keep new guidance small, decision-oriented, and cross-linked instead of
  turning one rule into a tutorial dump.

## Research and comparison

- Use [the research pack template](./templates/research-pack-template.md) when a
  future expansion needs a scoped source inventory before new rules are added.
- Use
  [the comparison matrix template](./templates/comparison-matrix-template.md)
  when comparing this package with external FastEndpoints or API-framework
  skills.
- Treat [taxonomy.json](./assets/taxonomy.json),
  [section-order.json](./assets/section-order.json), and
  [metadata.json](./metadata.json) as the stable navigation, grouping, and
  distribution contract for future package growth.
- Keep
  [the anti-patterns quick reference](./references/anti-patterns-quick-reference.md)
  aligned with the strongest `Avoid` guidance rather than inventing separate
  policy.

## Standalone packaging note

- This package is the canonical standalone skill under `skills`.
- If you document or install it directly, use `npx skills add <source>`.
- A future marketplace registration can point directly at
  `skills/martix-fastendpoints` rather than duplicating the package
  elsewhere.

## Source boundaries

- Approved first-pass guidance comes from the FastEndpoints official docs and the
  cookbook references surfaced by the bundled maps.
- Treat
  [FastEndpoints cookbook index](./references/cookbook-index.md) as a secondary
  recipe index, not as a policy replacement for the official docs.
- Do not widen this package into generic ASP.NET Core or unrelated repository
  guidance unless a later task explicitly requires it.
