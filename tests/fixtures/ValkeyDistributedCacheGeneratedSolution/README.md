# Valkey Distributed Cache Generated Solution

This temporary Generated Solution is the executable acceptance seam for the
Valkey distributed-cache provider.

- Preset: `api`
- Cache interface: `Microsoft.Extensions.Caching.Distributed.IDistributedCache`
- Provider: `Microsoft.Extensions.Caching.StackExchangeRedis` 10.0.10
- Service profile: Valkey 9.1.0
- Matrix: `api/net10.0/linux/container`

The host configures the Microsoft StackExchange Redis provider directly. It
does not add a MartiX cache facade, use in-memory cache as a production
fallback, or make cache state authoritative for business results,
authorization, or readiness.

`valkey-conformance.json` records the controlled profile, observed provider
effects, and required behavioral scenarios. The TUnit project runs those
scenarios against the pinned Valkey container profile.
