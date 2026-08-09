# Valkey Distributed Cache Generated Solution routing

- API composition root: `src/MartiX.ValkeyDistributedCacheTestApp.Api/Program.cs`
- Provider profile: `valkey-conformance.json`
- Manifest: `martix.platform.json`
- Tests: `tests/MartiX.ValkeyDistributedCacheTestApp.Tests`
- Verification: `eng/verify.mjs` from the repository root

This fixture is limited to issue #29. Keep direct framework cache composition,
explicit expiry and serialization, reconnect/outage/cancellation behavior,
multi-instance evidence, and failure isolation visible. Do not add secrets,
Supported claims, or `martix.agent.json`.
