# RPC and HTTP transport patterns

## Purpose

Help FastEndpoints authors choose intentionally between normal HTTP endpoints,
remote gRPC-backed command execution, and remote event delivery patterns.

## Default guidance

- Prefer standard FastEndpoints HTTP endpoints for public APIs, browser clients,
  and integrations that benefit from ordinary HTTP semantics, Swagger docs, and
  language-agnostic contracts.
- Use the remote command bus when .NET services can share command and result
  DTOs directly and you want FastEndpoints to hide most gRPC plumbing without
  introducing `.proto` files.
- Keep remote messaging setup explicit across contracts, handler server, and
  client projects, and register each command type against only one remote
  connection.
- Treat production remote connections as secure infrastructure: enable TLS,
  configure authentication and authorization where needed, and prefer private
  network placement for low-latency service-to-service calls.
- Use streaming RPC only when the command flow truly needs client streaming or
  server streaming; otherwise keep the contract unary and easier to reason
  about.
- Tune `GrpcChannelOptions` and per-call `CallOptions` intentionally, especially
  for deadlines, retries, and transport settings that affect reliability.
- Treat remote event queues as best-effort by default; add persistence providers,
  broker mode, round-robin mode, or error receivers only when those delivery
  guarantees are actually required.
- Prefer a normal FastEndpoints REST endpoint over remote RPC when the caller is
  an end user or broad client population instead of a controlled .NET service.

## Avoid

- Do not leave the default insecure development channel in place for production
  deployments that cross trust boundaries.
- Do not register the same command type in multiple `MapRemote(...)` calls and
  expect FastEndpoints to broadcast or load-balance it automatically.
- Do not treat the default in-memory remote event queue as durable messaging if
  lost events are unacceptable.
- Do not use remote publish or remote execute calls as fire-and-forget work when
  the code still needs to handle network failures and retry behavior.

## Review checklist

- The boundary choice is explicit: HTTP endpoint, unary RPC, streaming RPC, or
  remote event queue.
- Contracts, handler registration, and remote connection mapping are separated
  cleanly and versioned in a way other services can consume safely.
- TLS, auth, and network placement are reviewed for every production remote
  connection.
- Channel options, call options, and timeout or retry expectations are
  documented where failures would be operationally significant.
- Any event queue usage states whether best-effort delivery is acceptable or a
  persistence and error-handling strategy is in place.
- Public or browser-facing workflows are not forced through internal RPC when a
  normal FastEndpoints HTTP surface would be clearer.

## Related files

- [Transport and docs map](../references/transport-docs-map.md)
- [Swagger and OpenAPI rule](./docs-swagger-openapi.md)
- [Files, streaming, and SSE rule](./transport-files-streaming-sse.md)

## Source anchors

- [FastEndpoints remote procedure calls](https://fast-endpoints.com/docs/remote-procedure-calls)
  - Remote command bus project setup and handler or client registration.
- [FastEndpoints remote procedure calls](https://fast-endpoints.com/docs/remote-procedure-calls)
  - TLS, auth, channel options, call options, and MessagePack transport notes.
- [FastEndpoints remote procedure calls](https://fast-endpoints.com/docs/remote-procedure-calls)
  - Client streaming and server streaming.
- [FastEndpoints remote procedure calls](https://fast-endpoints.com/docs/remote-procedure-calls)
  - Remote pub/sub queues, persistence providers, exception receivers, broker
    mode, and round-robin mode.
- [Transport and docs map](../references/transport-docs-map.md)
