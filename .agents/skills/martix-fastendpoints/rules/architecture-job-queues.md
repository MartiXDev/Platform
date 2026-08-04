# FastEndpoints job queues and background execution

## Purpose

Set the default boundary for durable background work in FastEndpoints: when to
queue commands, how to configure queue execution, and what storage and tracking
guarantees the architecture must provide.

## Default guidance

- Queue background work as commands when the caller does not need the result
  immediately and the work should survive restarts or worker crashes.
- Design queued jobs around the FastEndpoints command model so the same command
  contract can execute immediately or through the job queue depending on the use
  case.
- Enable job queues explicitly at startup and treat the storage provider as a
  required part of the architecture, not an optional implementation detail.
- Choose queue concurrency and execution-time limits deliberately. Use global
  defaults for broad safety and override per command type only when the workload
  profile justifies it.
- Propagate cancellation through queued command handlers and stop gracefully when
  the token is canceled instead of throwing avoidable failures.
- Use tracking IDs and `JobTracker<TCommand>` or `IJobTracker<TCommand>` for
  cancellation, result retrieval, and progress polling instead of inventing a
  parallel tracking mechanism.
- Support job results and progress only when the feature truly needs them, and
  wire the storage record/provider interfaces accordingly.
- In multi-instance deployments, enable distributed processing intentionally
  and implement atomic claiming in `GetNextBatchAsync` so only one worker can
  lease a job at a time.
- Reset lease state such as `DequeueAfter` appropriately on handler failure so
  retries are eligible promptly instead of waiting for an expired claim.

## Avoid

- Do not queue work that must complete inside the HTTP response path or requires
  an immediate authoritative result.
- Do not enable job queues without a durable storage provider implementation.
- Do not assume `ExecuteAfter` means exact-time execution; it is only a "not
  before" guarantee.
- Do not ignore cancellation tokens or execution-time limits in long-running job
  handlers.
- Do not implement distributed claiming with a read-then-update race; use an
  atomic database operation supported by the chosen store.

## Review checklist

- The feature is using a queued command because delayed, durable background
  execution is actually required.
- Queue startup configuration, storage provider wiring, and concurrency limits
  are all visible in the composition root.
- Handler code honors cancellation and any configured execution-time limit.
- Tracking, results, and progress usage match the implemented storage-provider
  capabilities.
- Distributed mode, if enabled, uses atomic leasing and resets lease state on
  failures.

## Related files

- [Architecture map](../references/architecture-map.md)
- [Command and event bus](./architecture-command-event-bus.md)
- [Dependency injection and service resolution](./architecture-di-service-resolution.md)
- [FastEndpoints startup and registration](./foundation-startup-registration.md)
- [Configuration options](./foundation-configuration-options.md)

## Source anchors

- [Job Queues](https://fast-endpoints.com/docs/job-queues)
- [Command Bus](https://fast-endpoints.com/docs/command-bus)
- [Dependency Injection](https://fast-endpoints.com/docs/dependency-injection)
