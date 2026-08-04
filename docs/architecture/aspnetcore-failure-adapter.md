# ASP.NET Core Failure Adapter

> Status: **Implemented** in the issue 10 acceptance slice. The repository
> remains pre-release and makes no Supported Capability claim.

`MartiX.Platform.AspNetCore` is the outward adapter for the BCL-only
`MartiX.Platform` Result and Error contracts. It does not add hosting defaults,
endpoint discovery, response envelopes, or a replacement HTTP abstraction.

## Composition

Generated application code composes the adapter explicitly:

```csharp
builder.Services.AddMartiXProblemDetails();
builder.Services.AddOpenApi(options =>
    options.AddMartiXProblemDetailsContract());

var app = builder.Build();
app.UseExceptionHandler();
```

Application Operations still return `Result` or `Result<T>`. Each endpoint owns
its typed success response and maps only its expected failure branch:

```csharp
static Results<Ok<OrderResponse>, ProblemHttpResult> GetOrder(
    Result<OrderResponse> result,
    HttpContext httpContext)
{
    return result.IsSuccess
        ? TypedResults.Ok(result.Value)
        : result.ToProblemDetails(httpContext);
}
```

## Failure contract

Expected failures return `application/problem+json` with the standard RFC 9457
members and the allowlisted extensions `code`, `traceId`, and `errors`.
`errors` contains only stable codes, safe messages, and optional validation
targets. The first Application Error determines the HTTP status and primary
code:

| Error kind | Status | Problem type |
| --- | ---: | --- |
| Validation | 400 | `/problems/validation-failed` |
| RuleViolation | 422 | `/problems/rule-violation` |
| NotFound | 404 | `/problems/not-found` |
| Conflict | 409 | `/problems/conflict` |
| AuthenticationRequired | 401 | `/problems/authentication-required` |
| Forbidden | 403 | `/problems/forbidden` |
| RateLimited | 429 | `/problems/rate-limited` |
| Unavailable | 503 | `/problems/unavailable` |
| Unexpected | 500 | `/problems/unexpected` |

The exception handler records a stable server-side error event and returns only
the generic `platform.unexpected` contract. It never serializes or logs
exception messages, stack traces, provider names, SQL, or secrets.

## Acceptance seam

`tests/Compatibility/AspNetCoreFailureAdapterGeneratedSolution/` is the
explicitly named temporary Generated Solution. Its TUnit consumer runs a real
ASP.NET Core `TestServer`, exercises typed success and every Kernel error
category, checks unexpected-exception redaction, and verifies the OpenAPI 3.1
Problem Details schema. Run it with:

```text
npm run verify:aspnetcore
```
