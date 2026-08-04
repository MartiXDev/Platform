# FastEndpoints architecture map

## Purpose

Map the FastEndpoints composition rules for service resolution, mapper layout,
in-process messaging, and background job queues back to the approved
FastEndpoints documentation set.

## Rule coverage

- **Dependency injection and service resolution**
  - Rule files: `rules/architecture-di-service-resolution.md`
  - Primary sources:
    - [Dependency Injection](https://fast-endpoints.com/docs/dependency-injection)
  - Notes: Use for choosing between constructor injection, property injection,
    and manual `Resolve()`/`TryResolve()` patterns across endpoints, validators,
    mappers, processors, event handlers, and command handlers.
- **Request, entity, and response mapping**
  - Rule files: `rules/architecture-mapping.md`
  - Primary sources:
    - [Domain Entity Mapping](https://fast-endpoints.com/docs/domain-entity-mapping)
    - [Dependency Injection](https://fast-endpoints.com/docs/dependency-injection)
  - Notes: Use for deciding when mapping belongs in a dedicated mapper type,
    when endpoint-local mapping is acceptable, and how singleton mapper
    lifetimes affect dependency usage.
- **In-process commands, events, and command middleware**
  - Rule files: `rules/architecture-command-event-bus.md`
  - Primary sources:
    - [Command Bus](https://fast-endpoints.com/docs/command-bus)
    - [Event Bus](https://fast-endpoints.com/docs/event-bus)
    - [Dependency Injection](https://fast-endpoints.com/docs/dependency-injection)
  - Notes: Use for separating single-handler commands from one-to-many events,
    deciding when endpoint logic should move behind a bus boundary, and keeping
    cross-cutting concerns in the documented middleware pipeline.
- **Durable background jobs and queue processing**
  - Rule files: `rules/architecture-job-queues.md`
  - Primary sources:
    - [Job Queues](https://fast-endpoints.com/docs/job-queues)
    - [Command Bus](https://fast-endpoints.com/docs/command-bus)
    - [Dependency Injection](https://fast-endpoints.com/docs/dependency-injection)
  - Notes: Use for queue-backed command execution, storage provider design,
    tracking and cancellation, concurrency limits, and distributed job
    processing boundaries.

## Source anchors

- [Dependency Injection](https://fast-endpoints.com/docs/dependency-injection)
- [Domain Entity Mapping](https://fast-endpoints.com/docs/domain-entity-mapping)
- [Command Bus](https://fast-endpoints.com/docs/command-bus)
- [Event Bus](https://fast-endpoints.com/docs/event-bus)
- [Job Queues](https://fast-endpoints.com/docs/job-queues)

## Maintenance notes

- Keep this map focused on FastEndpoints composition primitives. Broader ASP.NET
  Core host, security, persistence, or diagnostics guidance belongs in the
  shared .NET skill package unless FastEndpoints adds framework-specific
  behavior.
- Treat commands, events, and job queues as related but distinct boundaries; if
  later work adds separate files for testing or operational playbooks, link them
  here instead of repeating architecture defaults.
- When FastEndpoints changes handler lifetime, queue storage requirements, or
  mapping APIs, update this map and the linked rules together so the workstream
  stays internally consistent.
