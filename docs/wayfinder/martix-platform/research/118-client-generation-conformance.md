# OpenAPI client generation conformance

Research date: 2026-07-18  
Scope: evidence for Wayfinder ticket 118; throwaway generator prototype only

## Executive conclusion

For React and Vue, adopt `openapi-typescript` 7.13.0 with `openapi-fetch` 0.17.0
as the current candidate. The combination preserved exact OpenAPI response/status,
header, parameter, and nullability shapes and compiled under the MartiX strict
TypeScript profile. A small repository-owned generator script must use the documented
`transform` hook to map `format: binary` to the browser `Blob` type. Upload
`FormData`, download `parseAs: "blob"`, and SSE `parseAs: "stream"` remain explicit
at the handwritten composition boundary.

Do not adopt `@hey-api/openapi-ts` 0.99.0 yet. Its generated Fetch client provided
excellent first-class binary and SSE behavior, but its bundled generated runtime did
not compile with `exactOptionalPropertyTypes` enabled. MartiX should not weaken the
strict profile or exclude generated transport code from checking to accommodate it.

For Blazor, tuned NSwag 14.7.1 is the strongest current ordinary-HTTP candidate. It
produced a single dependency-free C# source file over `HttpClient` and
`System.Text.Json`, preserving required/optional/null semantics and native .NET date,
time, identifier, decimal, header, status, binary, cancellation, and Problem Details
shapes. It must sit below the handwritten MartiX transport adapter. Its generated SSE
method buffers the entire response as `string`, so SSE must be excluded from generated
use and implemented as a small streaming `HttpClient` adapter. NSwag's
`System.Text.Json` path is described by its own CLI as experimental and uses generic
deserialization rather than a source-generated JSON context; generator upgrades and
any trimming/AOT claim therefore require a fresh executable conformance gate.

Kiota 1.34.1 is not recommended for this UI-client role. It generated working streams,
cancellation, and typed errors, but weakened required/nullability semantics, used
Kiota-specific `Date` and `Time`, and required a broad runtime/serialization stack. Its
SDK-oriented request-builder model is deeper infrastructure than the MartiX UI needs.

These are research recommendations, not accepted architecture decisions, until they
are approved and recorded in ticket 118.

## Question and method

The prototype asked which TypeScript and C# generator profiles best preserve the
accepted MartiX OpenAPI 3.1 contract without leaking generated infrastructure into UI
features. One deliberately non-product `ClientConformanceResource` fixture exercised:

- required, optional, and nullable values;
- UUIDs, textual enums, arrays, decimal money, `date`, `time`, and `date-time`;
- GET, POST, and PUT operations with exact success/error statuses;
- canonical Problem Details, `ETag`, `Location`, `Idempotency-Key`, and `If-Match`;
- multipart binary upload, binary download, SSE, and cancellation;
- same-origin browser cookie authentication metadata.

The binary schema used valid OpenAPI 3.1 `type: string, format: binary`, matching the
shape documented for ASP.NET Core file/stream OpenAPI output. An earlier pure JSON
Schema empty-schema experiment was intentionally discarded because it did not
represent the ASP.NET Core producer. Request objects were expressed with explicit
composition rather than `allOf`, because generated inheritance conflicts with the
accepted composition-first DTO policy.

Every candidate was generated from the same artifact, compiled against .NET 10 or
TypeScript 5.9.3, and inspected for semantic fidelity and generated/runtime surface.
The throwaway files were deleted after this record was written.

## Exact evaluated toolchain

| Role | Exact evaluated version |
| --- | ---: |
| TypeScript compiler | 5.9.3 |
| `@hey-api/openapi-ts` | 0.99.0 |
| `openapi-typescript` | 7.13.0 |
| `openapi-fetch` | 0.17.0 |
| Microsoft OpenAPI Kiota tool | 1.34.1 |
| Microsoft.Kiota.Bundle runtime | 2.0.0 |
| NSwag.ConsoleCore | 14.7.1 |
| .NET SDK used for compilation | 10.0.110 |

The JavaScript prototype used the owner's local Volta-selected environment only to
run commands. Volta is not a MartiX repository, generator, or CI requirement.

## Results

| Candidate | Semantic/compile result | Important strengths | Release-blocking weakness |
| --- | --- | --- | --- |
| Hey API | Failed strict TypeScript compilation | First-class `Blob`/`File`; generated Fetch and SSE runtime | Generated runtime violated `exactOptionalPropertyTypes` in request, parameter, and SSE option shapes |
| `openapi-typescript` + `openapi-fetch` | Passed strict TypeScript compilation | Precise operation/status/header/body types; small runtime; cancellation; blob and raw stream parsing | Binary needs a documented AST transform; multipart serialization and SSE event parsing are explicit handwritten adapters |
| Kiota | Generated and built with zero .NET warnings | Streams, cancellation, typed errors, maintained Microsoft ecosystem | Required properties became nullable; custom date/time types; mutable serialization models; broad runtime stack |
| NSwag, tuned | Generated and built with zero .NET warnings | Native .NET types; required `init` records; typed statuses/errors/headers/files; cancellation; no client runtime package | Generated SSE buffers; STJ generator path is experimental and reflection-oriented |

Strict TypeScript meant `strict`, `exactOptionalPropertyTypes`,
`noUncheckedIndexedAccess`, and `skipLibCheck: false`. The selected TypeScript
candidate passed with explicit compile assertions for `Blob` upload/download and
`ReadableStream<Uint8Array> | null | undefined` SSE output.

Approximate generated source evidence from this fixture was 336 lines/11,863 bytes
for `openapi-typescript`, 1,986 lines/66,649 bytes for Hey API including its generated
runtime, 970 lines/62,578 bytes for NSwag, and 1,344 lines/76,713 bytes across 18 Kiota
files. Line count is contextual evidence, not a quality score.

Kiota's single `Microsoft.Kiota.Bundle` reference resolved additional abstractions,
HTTP, form, JSON, multipart and text serialization packages, dependency-injection
abstractions, recyclable streams, and URI-template infrastructure. NSwag-generated
client compilation required no runtime package reference.

## Candidate profiles to approve

### TypeScript

Pin `openapi-typescript` 7.13.0 and `openapi-fetch` 0.17.0. Generate immutable exported
types from the reviewed OpenAPI artifact with a repository-owned Node API script. Its
only semantic override maps binary schemas to `Blob`; every override is itself tested.
Compile generated declarations and handwritten adapters with the full strict profile.

Use one composition adapter to own base URL, credentials, antiforgery, tracing,
Problem Details, ETag/idempotency policy, safe retries, multipart serialization,
binary parsing, and SSE framing/reconnect behavior. React Query and Vue Query consume
feature adapters above it. No component calls the generated client directly.

Reconsider Hey API when its complete generated client/runtime compiles unchanged under
the MartiX strict profile and passes the same conformance corpus. Its integrated SSE
support is attractive but does not outweigh a type-check failure.

### C sharp

Pin NSwag.ConsoleCore 14.7.1 with the tested explicit settings: no generated base URL;
client interface; nullable reference types; optional properties nullable; required
properties defined and emitted with `required`; `init` accessors; native records; no
data annotations, JSON helpers, or default values; `DateOnly`, `TimeOnly`, and
`DateTimeOffset`; `System.Text.Json`; and wrapped responses for status/header access.

Treat ordinary request/response operations, Problem Details, file upload/download,
headers, and cancellation as generated scope. Exclude SSE from generated consumption
and implement it through a reviewed streaming `HttpClient` adapter. The surrounding
composition adapter catches generated exceptions and maps them to the canonical
MartiX result/problem model; generated exceptions never become a feature contract.

Re-run generation, zero-warning compilation, golden contract tests, binary/SSE tests,
and generated-diff review for every tool upgrade. Before any trimming or Native AOT
claim, prove the real published Blazor client behavior and either replace/refine the
reflection serializer path or explicitly account for it. Reconsider Kiota if it gains
native .NET temporal types and exact required/nullability preservation with a
materially smaller runtime profile.

## Primary references

- [Hey API TypeScript generator](https://heyapi.dev/docs/openapi/typescript/get-started)
- [Hey API Fetch client](https://heyapi.dev/docs/openapi/typescript/clients/fetch)
- [openapi-typescript CLI](https://openapi-ts.dev/cli)
- [openapi-typescript Node API and transforms](https://openapi-ts.dev/node)
- [openapi-fetch API](https://openapi-ts.dev/openapi-fetch/api)
- [Microsoft Kiota overview](https://learn.microsoft.com/en-us/openapi/kiota/)
- [Microsoft OpenAPI Kiota 1.34.1](https://www.nuget.org/packages/Microsoft.OpenApi.Kiota/1.34.1)
- [NSwag.ConsoleCore 14.7.1](https://www.nuget.org/packages/NSwag.ConsoleCore/14.7.1)
- [OpenAPI 3.1.2 data types and binary guidance](https://spec.openapis.org/oas/v3.1.2.html)
- [ASP.NET Core Minimal API responses and OpenAPI file schemas](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis/responses?view=aspnetcore-10.0)
- [ASP.NET Core OpenAPI document generation](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/openapi/aspnetcore-openapi?view=aspnetcore-10.0)
