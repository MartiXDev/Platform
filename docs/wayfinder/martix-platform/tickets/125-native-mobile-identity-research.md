---
title: Research native mobile authentication and device-security profiles
status: open
type: wayfinder:research
parent: ../map.md
claimed_by:
blocked_by:
  - 108-identity-provider-matrix.md
  - 111-security-observability-baseline.md
  - 124-native-mobile-capability-topology.md
---

## Question

Using current OAuth/OIDC standards and primary Apple, Google, Microsoft, .NET,
and selected provider documentation, what public-client authorization, system
browser, PKCE, redirect and app/universal-link, token custody and refresh,
revocation, secure-storage, passkey or biometric-unlock, device registration,
attestation, proof-of-possession, account recovery, and compromise scenarios are
available for the selected native mobile topology? Identify which existing
`identity`, `oidc`, and `entra` profiles can be reused, which require a distinct
mobile profile, and where ASP.NET Core Identity is not an OAuth authorization
server.
