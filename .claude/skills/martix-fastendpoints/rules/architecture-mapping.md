# FastEndpoints request, entity, and response mapping

## Purpose

Set the default boundary for mapping request DTOs, domain entities, and response
DTOs in FastEndpoints so endpoint handlers stay thin and mapping logic remains
predictable.

## Default guidance

- Prefer a dedicated mapper class inheriting from
  `Mapper<TRequest, TResponse, TEntity>` when both request-to-entity and
  entity-to-response transforms are part of the feature contract.
- Use FastEndpoints endpoint base types with mapper support so mapping is visible
  in the endpoint signature and the handler can use the `Map` property instead
  of re-implementing transforms inline.
- Use `RequestMapper<TRequest, TEntity>` or `ResponseMapper<TResponse, TEntity>`
  when the endpoint only needs one mapping direction; do not carry a two-way
  mapper when the contract is one-sided.
- Prefer `SendMapped()` or `SendMappedAsync()` when the endpoint already has a
  mapper-enabled base type and is returning an entity-backed response.
- Keep mapping focused on structural translation and contract shaping. Validation,
  persistence orchestration, and business decisions should stay in validators,
  handlers, services, or commands.
- Use `EndpointWithMapping<TRequest, TResponse, TEntity>` only when the mapping
  logic is small, endpoint-specific, and unlikely to be reused elsewhere.
- Treat mappers as singleton-safe. Resolve scoped services only within execution
  methods or via an explicit scope factory pattern when constructor resolution is
  truly necessary.
- Keep DTO and entity boundaries explicit. FastEndpoints mapping support is a
  manual-mapping feature, so favor readable intent over clever reflection-style
  abstractions.

## Avoid

- Do not place large mapping blocks directly in endpoint handlers when a mapper
  type would make the contract easier to review and reuse.
- Do not put business workflow, database calls, or side effects inside mapper
  methods.
- Do not store mutable state on mapper instances; FastEndpoints uses them as
  singletons.
- Do not choose endpoint-local mapping for logic that already needs to be shared
  across endpoints or background flows.

## Review checklist

- The chosen mapping shape matches the feature: dedicated mapper for reusable
  mapping, endpoint-local mapping only for small and isolated cases.
- Mapping logic is limited to data transformation and does not absorb unrelated
  business or persistence behavior.
- Mapper-enabled endpoints use the FastEndpoints-supported base types and helper
  methods consistently.
- Any dependency usage in mapper code respects the documented singleton and scope
  rules.
- DTO, entity, and response boundaries are still obvious from the endpoint and
  mapper types.

## Related files

- [Architecture map](../references/architecture-map.md)
- [Dependency injection and service resolution](./architecture-di-service-resolution.md)
- [Command and event bus](./architecture-command-event-bus.md)
- [Request DTO binding](./contracts-request-dtos-binding.md)
- [Endpoint conveniences](./pipeline-endpoint-conveniences.md)

## Source anchors

- [Domain Entity Mapping](https://fast-endpoints.com/docs/domain-entity-mapping)
- [Dependency Injection](https://fast-endpoints.com/docs/dependency-injection)
