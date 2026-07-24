---
title: Research native Android and iOS client technology options
status: closed
type: wayfinder:research
parent: ../map.md
claimed_by:
resolved: 2026-07-20
blocked_by:
  - 104-capability-preset-matrix.md
  - 106-generated-solution-topology.md
  - 110-http-contract-policy.md
  - 118-ui-provider-architecture.md
---

## Question

Against exact current stable versions and primary vendor documentation, how do
platform-native SwiftUI plus Kotlin/Compose, .NET MAUI, React Native including
its appropriate production toolchain, Flutter, and any other credible current
candidate compare for MartiX Generated Solutions across native-platform access,
code sharing, accessibility, performance, startup and artifact size, lifecycle
and support, licensing and supply chain, identity SDKs, secure storage, push,
offline behavior, testing, build and signing requirements, macOS dependency,
OpenAPI client integration, maintainability, and human/LLM developer readiness?
Define the meaningful forms of “native”, identify adoption and rejection risks,
and do not treat a PWA as a substitute for an Android/iOS application.

## Research asset

[Native Android and iOS technology options](../research/123-native-mobile-technology-options.md)
records the dated primary-source comparison, terminology, risks, alternative
admission triggers, and required conformance experiment.

## Resolution

Treat an installed Android/iOS client with direct platform-API access as a
first-class native mobile candidate whether its implementation is
platform-native or cross-platform. A WebView wrapper and a PWA are distinct
architectures and cannot silently satisfy this Capability.

Advance .NET MAUI and React Native, with Expo only as an explicit bounded
toolchain option, to one disposable side-by-side conformance prototype. MAUI is
the strongest C#/.NET-aligned candidate, but its support lifecycle is shorter
than .NET 10 LTS and iOS still requires Apple tooling. React Native best reuses
the accepted React/TypeScript competence, but browser UI, Fluent UI React, CSS,
and web components do not transfer to mobile, and it introduces JavaScript plus
native dependency governance. Expo SDK and React Native releases must be
attested as one compatible set; EAS build or over-the-air updates cannot become
hidden service dependencies.

Keep SwiftUI plus Kotlin/Jetpack Compose as the platform-fidelity reference and
client-driven escalation path, not the small-team default, because it owns two
applications and duplicates UI, delivery, and parity work. Keep Flutter and
Kotlin/Compose Multiplatform Deferred rather than rejected: reopen them for an
existing specialist team, client mandate, or measured advantage over both
finalists. Do not add hybrid WebView frameworks, Avalonia, Uno, or any other
credible provider to the permanent matrix without a concrete unmet force and
full conformance evidence.

Do not select a Supported provider from vendor claims. Startup, artifact size,
working set, interaction performance, accessibility, native integration,
OpenAPI semantics, offline behavior, secure storage, build/signing, supply
chain, and human/LLM maintainability are version- and workload-dependent. New
ticket 131 therefore blocks the user decision in ticket 124 and compares the
two finalists on exactly one MartiX mobile journey. Identity, device trust,
offline synchronization, push, and store/release obligations remain owned by
tickets 125–130.

## Material alternatives and triggers

- Select MAUI immediately: rejected because stack alignment does not prove its
  real-device behavior, ecosystem fit, or sustainable release evidence.
- Select React Native immediately: rejected because prior web React experience
  does not prove native dependency, platform, and operational fitness.
- Support every credible framework: rejected because each provider permanently
  multiplies templates, skills, security review, device matrices, and release
  gates.
- Default to two platform-native applications: rejected for minimum-project and
  small-team goals; reconsider for platform-differentiated UX, unsupported
  device SDKs, or independent specialist teams.
- Use PWA or WebView packaging: rejected as a substitute; reconsider only as a
  separately named browser/hybrid product requirement.
