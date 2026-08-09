# UI client evidence

Provider: `vue`

The client surface is generated from the checked-in OpenAPI contract, records the
contract digest, and is composed with the cookie-aware transport adapter. The
client check rejects missing operations, stale generated output, and unreviewed
transport substitutions.
