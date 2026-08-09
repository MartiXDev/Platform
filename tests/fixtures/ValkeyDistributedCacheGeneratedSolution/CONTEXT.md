# Valkey Distributed Cache Generated Solution context

This fixture selects the Valkey provider for the Distributed Cache Capability
over the framework `IDistributedCache` interface. Cache entries are transient
optimizations: business results remain recoverable, authorization never reads
cache state, and cache health is not part of global readiness for this
optional dependency.
