---
title: Specify mobile API resilience, offline data, and synchronization semantics
status: open
type: wayfinder:grilling
parent: ../map.md
claimed_by:
blocked_by:
  - 109-integration-event-delivery.md
  - 110-http-contract-policy.md
  - 124-native-mobile-capability-topology.md
  - 126-native-mobile-authentication-contract.md
---

## Question

What online-first baseline and optional offline/synchronization Capability should
native mobile clients use for intermittent connectivity, timeouts, cancellation,
safe retry, idempotent mutations, local caching and sensitive-data isolation,
queued work, optimistic concurrency and conflict resolution, delta retrieval,
pagination, uploads/downloads, background execution, API and client version
skew, logout/user switching, observability, and recovery without inventing a
generic sync engine or weakening the canonical HTTP/OpenAPI contract?
