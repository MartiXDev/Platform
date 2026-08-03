---
title: Prototype the native mobile provider finalists
status: open
type: wayfinder:prototype
parent: ../map.md
claimed_by:
blocked_by:
  - 123-native-mobile-technology-research.md
  - 132-native-mobile-conformance-lab.md
---

## Question

On the exact current stable compatible toolchains, how do disposable .NET MAUI
and React Native implementations of one identical MartiX vertical slice behave
on physical Android and iOS devices across deterministic OpenAPI integration,
Problem Details, ETag conflict, idempotent retry, public-client authentication
and secure-storage seams, one explicit offline command conflict, deep-link and
push navigation stubs, accessibility, localization, native API escape, tests,
local build and signing, dependency evidence, startup, artifact size, working
set, interaction performance, build time, and human/LLM maintenance? Record
reproducible evidence and remove throwaway source after its decision-relevant
results are absorbed; do not add either provider to production templates.

## Execution preflight

Preflight on 2026-07-20 found .NET SDK 10.0.110 on Windows x64, but no installed
.NET workloads, JDK, `ANDROID_HOME`, or `ANDROID_SDK_ROOT`. The current workspace
therefore cannot compile or execute either finalist for Android. It also has no
local macOS/Xcode environment and cannot produce or measure an iOS application.

Do not replace the missing evidence with framework documentation, emulator-only
results, Windows artifacts, or inferred scores. Before implementation, confirm
access to a current Xcode-capable Mac, one supported physical iPhone, one
supported physical Android device, Apple and Android signing identities suitable
for disposable development builds, and authority to install pinned MAUI,
Node/pnpm, JDK, Android SDK, Xcode, CocoaPods, and related toolchains. Provisioning
these prerequisites is a distinct manual task if they are not already available.

The ticket remains open but is parked behind **Provision the native mobile
conformance lab** because a Wayfinder prototype is HITL and the required Apple
hardware is not currently available. No provider result has been fabricated or
accepted. The Android-only portion is deliberately not started because it could
not complete the comparative Android/iOS decision and is not currently a top
priority.
