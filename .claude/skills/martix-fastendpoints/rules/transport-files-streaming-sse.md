# File handling, streaming, and server-sent events

## Purpose

Set the default FastEndpoints transport choices for multipart uploads, large
file handling, streamed file responses, and browser-facing server-sent event
feeds.

## Default guidance

- Explicitly opt in to multipart uploads with `AllowFileUploads()` because
  FastEndpoints does not accept `multipart/form-data` by default.
- Use DTO-bound `IFormFile` or file collections for ordinary uploads, but switch
  to `AllowFileUploads(dontAutoBindFormData: true)` plus
  `FormFileSectionsAsync()` or `FormMultipartSectionsAsync()` when upload size
  makes request buffering too expensive.
- Raise per-endpoint request body limits intentionally when large uploads are
  valid, and review upstream reverse-proxy or Kestrel limits at the same time.
- For downloads, prefer `Send.StreamAsync()`, `Send.FileAsync()`, or
  `Send.BytesAsync()` with explicit content type, file name, and range
  processing decisions instead of bespoke response code.
- Use direct response-stream writes only when the helper methods are not a fit,
  and keep ownership of the response stream and cancellation flow obvious.
- Use SSE for one-way async browser updates with `IAsyncEnumerable`, and use
  `StreamItem` only when one stream must carry multiple event payload types.
- Enable HTTP/2 on Kestrel and upstream infrastructure when many concurrent SSE
  streams are expected so connections can be multiplexed efficiently.

## Avoid

- Do not assume file uploads work without `AllowFileUploads()` or rely on hidden
  conventions for multipart enablement.
- Do not use `IFormFile` or `IFormFileCollection` for very large uploads when
  buffering to memory or disk is unacceptable.
- Do not disable auto-binding for large uploads and then forget that regular
  form fields also need manual section processing.
- Do not use SSE for bidirectional messaging or internal service-to-service
  contracts where gRPC or normal HTTP endpoints are a better fit.

## Review checklist

- Multipart endpoints opt in explicitly and size limits are reviewed at both the
  endpoint and host boundary.
- Large upload flows avoid accidental buffering and handle both file sections and
  form fields deliberately.
- File responses use the helper that matches the data source and set content
  disposition or range processing intentionally.
- SSE endpoints expose a clear event model, account for cancellation, and review
  HTTP/2 or proxy behavior when stream counts may grow.
- The chosen transport stays one-way and browser-friendly rather than drifting
  into RPC or queue semantics.

## Related files

- [Transport and docs map](../references/transport-docs-map.md)
- [Swagger and OpenAPI rule](./docs-swagger-openapi.md)
- [RPC and HTTP patterns rule](./transport-rpc-http-patterns.md)

## Source anchors

- [FastEndpoints file handling](https://fast-endpoints.com/docs/file-handling)
  - Multipart enablement and DTO binding.
- [FastEndpoints file handling](https://fast-endpoints.com/docs/file-handling)
  - Large-file section streaming and mixed form-field processing.
- [FastEndpoints file handling](https://fast-endpoints.com/docs/file-handling)
  - `Send.StreamAsync()`, `Send.FileAsync()`, `Send.BytesAsync()`, and direct
    response-stream writes.
- [FastEndpoints server sent events](https://fast-endpoints.com/docs/server-sent-events)
  - `IAsyncEnumerable`, `StreamItem`, and browser `EventSource` usage.
- [FastEndpoints server sent events](https://fast-endpoints.com/docs/server-sent-events)
  - HTTP/2 guidance for many concurrent streams.
- [Transport and docs map](../references/transport-docs-map.md)
