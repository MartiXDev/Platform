# FastEndpoints transport and docs map

## Purpose

Map the FastEndpoints-specific transport and documentation topics in this
workstream back to their primary official docs pages so authors can choose the
right rule file quickly.

## Rule coverage

- **Swagger, OpenAPI metadata, and client export**
  - Rule files: `../rules/docs-swagger-openapi.md`
  - Primary sources:
    - [FastEndpoints swagger support](https://fast-endpoints.com/docs/swagger-support)
  - Notes: Use for NSwag integration, middleware ordering, endpoint summaries,
    auth scheme docs, and API client or `swagger.json` export choices.
- **File uploads, downloads, response streaming, and SSE**
  - Rule files: `../rules/transport-files-streaming-sse.md`
  - Primary sources:
    - [FastEndpoints file handling](https://fast-endpoints.com/docs/file-handling)
    - [FastEndpoints server sent events](https://fast-endpoints.com/docs/server-sent-events)
  - Notes: Use for multipart uploads, large-file streaming, file response
    helpers, direct response writes, and browser-facing server-sent event flows.
- **Remote RPC, streaming, and HTTP boundary selection**
  - Rule files: `../rules/transport-rpc-http-patterns.md`
  - Primary sources:
    - [FastEndpoints remote procedure calls](https://fast-endpoints.com/docs/remote-procedure-calls)
    - [FastEndpoints swagger support](https://fast-endpoints.com/docs/swagger-support)
  - Notes: Use for remote command bus and event queue design, gRPC transport
    concerns, and deciding when a normal FastEndpoints HTTP endpoint is the
    better contract.

## Related files

- [Swagger and OpenAPI rule](../rules/docs-swagger-openapi.md)
- [Files, streaming, and SSE rule](../rules/transport-files-streaming-sse.md)
- [RPC and HTTP patterns rule](../rules/transport-rpc-http-patterns.md)

## Source anchors

- [FastEndpoints swagger support](https://fast-endpoints.com/docs/swagger-support)
  - Installation, configuration, endpoint metadata, summaries, auth schemes,
    operation naming, and client generation.
- [FastEndpoints file handling](https://fast-endpoints.com/docs/file-handling)
  - Upload enablement, DTO binding, section-based large file processing, and
    file response helpers.
- [FastEndpoints server sent events](https://fast-endpoints.com/docs/server-sent-events)
  - `IAsyncEnumerable`, `StreamItem`, and HTTP/2 guidance for many streams.
- [FastEndpoints remote procedure calls](https://fast-endpoints.com/docs/remote-procedure-calls)
  - Remote command bus, streaming RPC, event queues, persistence, and broker
    modes.

## Maintenance notes

- Keep this map limited to FastEndpoints transport and documentation behaviors
  that differ materially from generic ASP.NET Core guidance.
- If later work adds security or testing rules for this skill, link them from
  here only when the transport decision actually depends on them.
