# UI client evidence

Provider: `vue`

The client surface is generated from the checked-in OpenAPI contract, records the
contract digest, and is composed with the cookie-aware transport adapter. The
generated-client check rejects stale output; the Full Stack gate verifies required
operations and transport composition.
