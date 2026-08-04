# MartiX.Platform.AspNetCore

`MartiX.Platform.AspNetCore` is the narrow ASP.NET Core adapter for the
framework-independent `MartiX.Platform` Result and Error contracts.

It provides:

- explicit `AddMartiXProblemDetails()` registration for Problem Details and
  safe centralized exception handling;
- `Result` and `Result<T>` failure mapping to concrete
  `ProblemHttpResult` values;
- stable `ErrorKind` to HTTP status and problem-type mapping;
- explicit `ProducesMartiXProblemDetails(...)` endpoint metadata; and
- an OpenAPI schema transformer for the `code`, `traceId`, and `errors`
  Problem Details extensions.

Application endpoints choose their own typed success result and call
`UseExceptionHandler()` in the visible middleware order. Kernel Result types
are never serialized as HTTP payloads.
