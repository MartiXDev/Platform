# FastEndpoints commands, events, and bus composition

## Purpose

Set the default boundary for when FastEndpoints features should stay in endpoint
handlers and when they should move behind the command bus, event bus, or command
middleware pipeline.

## Default guidance

- Use commands for a single business operation that has exactly one handler and
  may return a result. This is the default bus abstraction when the logic should
  be reusable across endpoints, jobs, or other application entry points.
- Use events for one-to-many side effects where multiple independent handlers may
  react to the same occurrence and no handler result needs to flow back to the
  publisher.
- Keep endpoint handlers focused on transport concerns: binding, auth, request
  validation outcomes, and choosing which command or event boundary to invoke.
- Prefer `CommandHandler<>` base types when a command must contribute validation
  or error state back to the issuing endpoint; otherwise use the lighter command
  handler contract that best matches the need.
- Use command middleware for cross-cutting policies around command execution,
  such as logging, timing, validation, or error decoration, when the same policy
  should wrap many commands in a consistent order.
- Register command middleware in intentional order and keep open-generic
  middleware broad, predictable, and side-effect aware.
- Publish events with the default wait-for-all behavior unless there is a clear
  reason to use another publish mode. Make the fire-and-forget choice explicit
  because it changes delivery and observability expectations.
- When publishing or executing from outside endpoints, use the FastEndpoints
  extension methods and DI rules documented for those flows rather than
  rebuilding your own dispatcher abstraction.

## Avoid

- Do not use events when the caller depends on a single authoritative result or
  must know which specific handler completed the work.
- Do not split simple endpoint logic into commands or events prematurely when the
  extra indirection adds no reuse or compositional value.
- Do not bury core business orchestration in command middleware that reviewers
  cannot discover from registration order.
- Do not assume event handlers can manipulate endpoint response state the way a
  command handler can.
- Do not publish fire-and-forget events for critical work unless the delivery and
  failure behavior is acceptable to the feature.

## Review checklist

- The chosen bus primitive matches the relationship: command for one handler with
  optional result, event for one-to-many side effects.
- Endpoint code remains transport-oriented and pushes reusable business workflow
  behind commands where that improves composition.
- Any command middleware is registered in deliberate order and only contains
  cross-cutting logic.
- Event publication mode is intentional, especially for fire-and-forget usage.
- Handler dependency usage follows the FastEndpoints lifetime rules for command
  and event handlers.

## Related files

- [Architecture map](../references/architecture-map.md)
- [Dependency injection and service resolution](./architecture-di-service-resolution.md)
- [Job queues](./architecture-job-queues.md)
- [Pre and post processors](./pipeline-pre-post-processors.md)
- [Validation errors](./contracts-validation-errors.md)

## Source anchors

- [Command Bus](https://fast-endpoints.com/docs/command-bus)
- [Event Bus](https://fast-endpoints.com/docs/event-bus)
- [Dependency Injection](https://fast-endpoints.com/docs/dependency-injection)
