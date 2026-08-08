# MartiX.Platform.AspNetCore.FastEndpoints

`MartiX.Platform.AspNetCore.FastEndpoints` is an optional endpoint-framework
adapter for the MartiX Platform HTTP contract. It keeps the Minimal API
composition canonical while providing explicit FastEndpoints registration,
Problem Details metadata, lifecycle headers, and FastEndpoints OpenAPI
integration.

Use `AddMartiXFastEndpoints()` and `UseMartiXFastEndpoints()` only when the
generated API profile explicitly selects the `fastendpoints` provider. The
adapter is JIT-supported in this preview; trim and Native AOT support remain
undeclared until generated discovery and parity evidence exist.

Endpoints that use FastEndpoints automatic validation should derive from
`MartiXEndpoint<TRequest, TResponse>`. Its validation hook translates
FastEndpoints failures into the canonical `application/problem+json` shape;
normal operation failures should continue to use the shared
`MartiXResultExtensions.ToProblemDetails()` mapping.
