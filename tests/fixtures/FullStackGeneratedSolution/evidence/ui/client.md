# UI client evidence

Provider: `react`

The TypeScript client is generated from the authoritative OpenAPI artifact with
the pinned generator/runtime pair. Its source records the artifact SHA-256
digest, and the client check compares that digest before a build can consume
the client. Operation coverage is verified by path and HTTP method.
