# Native Android and iOS technology options

Research date: 2026-07-20. Versions and lifecycle claims below are snapshots,
not timeless Platform policy. Provider admission must pin and attest an exact
toolchain.

## Executive finding

.NET MAUI and React Native with an explicitly bounded Expo option are the two
best candidates for a MartiX conformance prototype. Neither should be declared
Supported from documentation comparison alone.

- **.NET MAUI** maximizes C#/.NET reuse, fits the existing maintainers and lets
  one application project reach Android and iOS. Its principal risk is not
  language capability but lifecycle and ecosystem evidence: MAUI 10 support
  ends on 2027-05-11 even though .NET 10 LTS continues to 2028-11-14, and iOS
  delivery still requires Apple tooling and a networked Mac.
- **React Native** reuses the already accepted React/TypeScript competence and
  has first-class access to both platforms through the current New
  Architecture. Its cost is a second supply chain and more visible native
  project/toolchain ownership. Expo can simplify builds, updates, and common
  device APIs, but it must be an explicit toolchain choice: Expo SDK and React
  Native versions do not necessarily advance in lockstep, and cloud build or
  over-the-air update services must never become an undeclared dependency.
- **SwiftUI plus Kotlin/Jetpack Compose** is the platform-fidelity reference
  and the escalation path when a product needs immediate access to new OS APIs,
  maximum native behavior, or independently specialized platform teams. It
  duplicates application UI, delivery, and much testing, so it conflicts with
  the normal minimum-project and small-team goals.
- **Flutter** and **Kotlin/Compose Multiplatform** are credible production
  alternatives, not rejected technologies. Both add a language/ecosystem not
  otherwise selected by MartiX. Their marginal value over the two finalists
  must be established by a client force or later evidence before adding them to
  the permanent quality matrix.

A bounded prototype should compare MAUI and React Native on the same API and
device journeys before ticket 124 selects Supported, Experimental, Deferred,
or rejected providers.

## What “native” means

The term must not collapse distinct architectures:

1. **Platform-native implementation** uses the platform's primary language,
   UI framework, SDK, and lifecycle directly: Swift/SwiftUI on iOS and
   Kotlin/Jetpack Compose on Android.
2. **Cross-platform native application** ships an installed Android/iOS binary,
   participates in native lifecycle and distribution, and can call every
   platform API, while sharing substantial code through MAUI, React Native,
   Flutter, or Compose Multiplatform.
3. **Native wrapper around web content** primarily renders an HTML/JavaScript
   product in a WebView. It can access selected device APIs but retains browser
   rendering and web application constraints.
4. **PWA** is a browser application with installability and selected device
   capabilities. It is a separate future browser Capability, not an Android or
   iOS application substitute for this map.

MartiX can support category 1 or 2. Category 3 is not the default meaning of
native mobile, and category 4 is expressly outside this decision.

## Comparative assessment

| Concern | SwiftUI + Kotlin/Compose | .NET MAUI 10 | React Native 0.86 / Expo | Flutter 3.44 | Kotlin/Compose Multiplatform |
| --- | --- | --- | --- | --- | --- |
| Shared product code | Low across platforms | High in C#/XAML | High in TypeScript/React | High in Dart | High in Kotlin; UI may be shared or native |
| Platform fidelity | Highest and earliest | Native controls/APIs with platform code escape | Native platform views/modules with platform code escape | Flutter-rendered UI with platform channels | Shared Compose UI or native SwiftUI over shared logic |
| MartiX skill alignment | Two new specialist stacks | Strongest backend alignment | Strong React alignment; adds RN/native skills | New Dart/Flutter stack | New Kotlin/KMP stack |
| Project/toolchain cost | Two applications | One cross-platform app, plus native targets | One app plus Android/iOS native projects/tooling | One app plus native hosts | Shared modules plus native hosts/UI choices |
| iOS build dependency | macOS/Xcode | macOS/Xcode; Windows can use a networked Mac | macOS/Xcode unless an explicit remote service builds | macOS/Xcode | macOS/Xcode |
| Accessibility | Direct platform semantics/tools | MAUI semantics plus platform testing | RN accessibility APIs plus VoiceOver/TalkBack testing | Flutter semantics and guideline APIs | Compose semantics; iOS support is stable, but platform testing remains required |
| Native API escape | Direct | C# platform-specific code/bindings | Swift/Objective-C/Kotlin/Java native modules | Platform channels/Pigeon | Kotlin native interop and Swift/native UI integration |
| Main lifecycle risk | Duplicate platform evolution | MAUI support cadence shorter than .NET LTS | Fast RN/Node/native dependency cadence; Expo compatibility lag | Flutter/Dart cadence and plugin health | Younger shared-iOS ecosystem/tooling |
| Initial disposition | Reference / Deferred default | Prototype finalist | Prototype finalist | Deferred, reconsider with force | Deferred, reconsider with force |

The matrix does not claim framework-level performance winners. Startup,
working set, scroll smoothness, artifact size, battery/network behavior, and
build time are workload- and version-dependent and must be measured on the same
physical-device journeys. Vendor microbenchmarks are useful hypotheses, not
MartiX release evidence.

## Candidate notes

### Platform-native SwiftUI and Kotlin/Jetpack Compose

This is the least abstracted route to Apple and Android APIs and provides the
strongest independent platform optimization. Both platforms provide semantic
accessibility and UI testing tools. It should be selected when platform-specific
experience is product differentiation, a required SDK is poorly supported by
cross-platform frameworks, or separate specialist teams already own each app.

It is not the MartiX default because sharing HTTP contracts does not remove two
UI implementations, two dependency graphs, two sets of release automation, and
cross-platform behavioral parity work. Code generation can share DTO/client
contracts, but not application behavior automatically.

### .NET MAUI

MAUI 10 provides one C#/XAML codebase and a single-project model for Android and
iOS, while still permitting platform-specific source and API access. It is the
most coherent choice for a .NET-first small team and keeps LLM guidance close to
the Platform's primary language.

The support contract is a material caveat. Microsoft lists MAUI 10.0 support
from 2025-11-11 to 2027-05-11, with current support conditional on the latest
servicing level; this is substantially shorter than .NET 10 LTS. Platform SDK,
Xcode, JDK, workload, binding, secure-storage, push, identity, trimming, and
store-signing compatibility therefore need their own attested matrix. A Mac is
still required for iOS compilation/signing, even when Windows is the main
workstation. Experimental CoreCLR mobile use is not a production baseline.

### React Native and Expo

React Native is a native application framework rather than a WebView wrapper.
The current line uses the New Architecture, and native modules remain the escape
path for platform APIs. It benefits from MartiX's existing React/TypeScript
investment and can share non-visual client concepts, but browser React
components, Fluent UI React, DOM semantics, and CSS are not reusable mobile UI.

Expo is best treated as an optional production toolchain/profile around React
Native, not as the Capability identity. Expo SDK 55 documents React Native 0.83
while React Native 0.86 is current on the research date, illustrating why an
exact compatible set must be selected. Expo Application Services can provide
remote builds and updates, but MartiX must preserve a documented local/native
build and exit path. Over-the-air updates require runtime-version matching,
security, rollback, privacy, and store-policy governance; they are not enabled
implicitly. The strict pnpm, lockfile, script-allowlist, provenance, SBOM, and
upgrade policies accepted for web UI should extend to this JavaScript supply
chain, while CocoaPods/Gradle/native dependencies need equivalent evidence.

### Flutter

Flutter 3.44 supports current Android and iOS ranges, provides its own semantic
accessibility/test APIs, and can call Swift/Kotlin through platform channels or
generated Pigeon bindings. It is a serious cross-platform product framework.

For MartiX it introduces Dart, Flutter-specific rendering and state/tooling, and
a further plugin ecosystem without reusing the accepted .NET or React UI
implementation. Keep it Deferred rather than rejected. Reopen it for an
existing Flutter team, a client mandate, or measured evidence that it materially
beats both finalists for the target interaction/performance profile.

### Kotlin and Compose Multiplatform

Compose Multiplatform for iOS became stable in 2025 and now supports shared UI,
accessibility, testing, and interoperation with SwiftUI/UIKit. Kotlin
Multiplatform can also share only logic while retaining SwiftUI for iOS, making
it a flexible middle ground rather than one fixed architecture.

It is Deferred initially because it adds Kotlin/KMP ownership and a younger iOS
tooling/ecosystem surface without an established MartiX team advantage. Reopen
it when Android/Kotlin expertise dominates, native SwiftUI plus shared logic is
desired, or a client already standardizes on KMP.

### Hybrid and secondary .NET candidates

Capacitor/Ionic and similar WebView-first solutions may be valid for a web-led
product, but they do not satisfy this map's default native-mobile meaning and
must not be presented as a PWA workaround. Avalonia and Uno remain possible
client-driven .NET alternatives, especially where desktop reuse is central;
they are not added to the initial mobile matrix without a force that MAUI cannot
meet. Every additional provider permanently multiplies conformance and release
evidence, so “credible” does not mean “Supported”.

## Cross-cutting MartiX requirements

The provider must consume the same authoritative OpenAPI 3.1 and behavioral
HTTP contract as other clients, but generated client correctness must be proven
for Problem Details, URL major versions, cancellation, binary/multipart,
idempotency keys, ETags, and streaming. Generated code is deterministic,
reviewable, never hand-edited, and wrapped only by small application-owned
composition adapters.

Mobile is an OAuth public client. It cannot hold a client secret and must use
system-browser authorization with Authorization Code plus PKCE, platform-bound
redirect/app-link handling, secure token custody, revocation/logout, and
explicit refresh behavior. Exact identity SDK, secure storage, device
attestation, biometric unlock, and proof-of-possession choices belong to tickets
125 and 126 rather than framework marketing claims.

Push is also provider- and platform-specific: APNs and FCM credentials, device
token rotation, user/device registration, consent, deep links, abuse controls,
and delivery non-guarantees belong to ticket 128. Offline state is not “add a
cache”: ticket 127 must define authoritative data, local database protection,
queued command identity, conflict/version policy, retry, deletion, and recovery.

Every provider needs physical Android and iOS verification for accessibility,
startup, foreground/background transitions, network loss, secure storage,
deep/universal links, push, upgrades, and memory/battery behavior. iOS release
evidence always needs Apple signing and Xcode/macOS; remote build services move
that obligation rather than remove it.

## Required conformance prototype

Before ticket 124 chooses a provider, implement the same disposable vertical
slice in .NET MAUI and React Native with the exact versions then current:

- deterministic OpenAPI client generation and Problem Details mapping;
- list/detail/edit with ETag conflict and idempotent command retry;
- public-client login seam and secure-storage stub without real production
  credentials;
- local read model plus one queued offline command and explicit conflict;
- deep-link and push-notification navigation stub;
- semantic accessibility and localization on Android and iOS;
- unit/component and black-box device tests;
- local Android and iOS build/signing path, dependency/SBOM evidence; and
- measured startup, artifact size, working set, representative scrolling,
  build time, and agent implementation/maintenance friction.

The prototype is evidence, not product code. It must not add both providers to
the generated solution or predetermine that MartiX supports multiple providers.

## Primary sources

- [.NET MAUI support policy](https://dotnet.microsoft.com/en-us/platform/support/policy/maui)
- [.NET and .NET Core support policy](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core)
- [.NET MAUI supported platforms](https://learn.microsoft.com/en-us/dotnet/maui/supported-platforms?view=net-maui-10.0)
- [What is .NET MAUI?](https://learn.microsoft.com/en-us/dotnet/maui/what-is-maui?view=net-maui-10.0)
- [.NET MAUI accessibility](https://learn.microsoft.com/en-us/dotnet/maui/fundamentals/accessibility?view=net-maui-10.0)
- [React Native releases](https://reactnative.dev/versions)
- [React Native New Architecture](https://reactnative.dev/architecture/landing-page)
- [React Native accessibility](https://reactnative.dev/docs/accessibility)
- [Expo New Architecture](https://docs.expo.dev/guides/new-architecture/)
- [Expo runtime versions and updates](https://docs.expo.dev/eas-update/runtime-versions/)
- [Flutter supported platforms](https://docs.flutter.dev/reference/supported-platforms)
- [Flutter architectural overview](https://docs.flutter.dev/resources/architectural-overview)
- [Flutter accessibility testing](https://docs.flutter.dev/ui/accessibility/accessibility-testing)
- [Compose Multiplatform iOS stable announcement](https://blog.jetbrains.com/kotlin/2025/05/compose-multiplatform-1-8-0-released-compose-multiplatform-for-ios-is-stable-and-production-ready/)
- [Kotlin Multiplatform project structure](https://blog.jetbrains.com/kotlin/2026/05/new-kmp-default-structure/)
- [SwiftUI documentation](https://developer.apple.com/documentation/swiftui)
- [Apple Accessibility Inspector](https://developer.apple.com/documentation/accessibility/accessibility-inspector)
- [Jetpack Compose testing](https://developer.android.com/develop/ui/compose/testing)
- [Jetpack Compose accessibility testing](https://developer.android.com/develop/ui/compose/accessibility/testing)
