---
title: Specify the identity provider capability matrix
status: closed
type: wayfinder:research
parent: ../map.md
claimed_by:
resolved: 2026-07-17
blocked_by:
  - 104-capability-preset-matrix.md
  - 106-generated-solution-topology.md
---

## Question

What application-facing contracts, generated projects, authentication flows, storage ownership, authorization hooks, and test combinations are required for anonymous, ASP.NET Core Identity, external OpenID Connect, and Microsoft Entra ID capabilities?

## Research asset

[Identity provider capability matrix research](../research/108-identity-provider-matrix-research.md) records the primary Microsoft, .NET, OpenID Connect, and IETF evidence behind this resolution. The research date and target versions are explicit because framework packages and hosted-provider behavior evolve independently.

## Resolution

### Model providers and flows separately

The Template System offers four Authentication Capability Providers: `none`, `identity`, `oidc`, and `entra`. Provider selection alone is insufficient. A generated Capability Manifest must also select every intended host role and flow:

| Provider profile | Supported initial role and flow | Actor source | Persistence required by authentication | Initial boundary |
| --- | --- | --- | --- | --- |
| `none` | Explicit anonymous HTTP plus explicitly supplied background/bootstrap Actors | Application composition | None | No registered authentication scheme and no fake authenticated principal |
| `identity:interactive` | Local account with secure HTTP-only cookie | ASP.NET Core Identity user | Relational `identity` schema; durable Data Protection keys in multi-instance deployments | Browser session only; built-in proprietary bearer tokens are not a MartiX OAuth/JWT service |
| `oidc:interactive` | Confidential authorization-code client with PKCE and server cookie/BFF | Validated `(issuer, subject)` | Data Protection; Actor Registry only when durable application identity is required | Verified providers only; never promises compatibility with every OIDC server |
| `oidc:api` | JWT bearer validation for a named issuer/audience and required scope or role | Validated external subject | None intrinsically; Actor Registry when required | API access token only; an ID token is invalid as an API credential |
| `entra:interactive` | Single-tenant authorization code with PKCE and server cookie/BFF | Tenant-aware Entra user | Data Protection; optional Actor Registry | Workforce tenant initially; other tenant audiences are deferred |
| `entra:api-delegated` | Bearer access token with the API's delegated scope | Entra user | None intrinsically; Actor Registry when required | Reject tokens for Graph or any other audience |
| `entra:api-application` | Client credentials with the API's application role | Entra service principal | None intrinsically; Actor Registry when required | Produces a Service Actor, never a fake human user |

The manifest may compose compatible interactive and API roles in one host, but it must name default authenticate, challenge, forbid, and sign-out schemes and test the interaction. It may not collapse browser session, bearer API, and machine-to-machine behavior into a single `auth=oidc` or `auth=entra` Boolean.

**Why:** these flows have different principals, credentials, browser exposure, challenges, logout and revocation guarantees, authorization inputs, and release evidence. Making the distinctions generation-time facts prevents apparently convenient defaults from silently changing the threat model.

### Composed Actor contract

Admit three small framework-independent security primitives to the BCL-only `MartiX.Platform` Kernel under `MartiX.Platform.Security`:

- `ActorId`, a strongly typed immutable `readonly record struct` over a non-empty `Guid`;
- `ActorKind`, with the initially admitted values `Anonymous`, `Human`, `Service`, and `Background`; and
- `ActorSnapshot`, a sealed immutable value containing `ActorKind`, optional `ActorId`, authentication state, and only safe provider-independent presentation fields required by the generated application.

Use `Guid.CreateVersion7()` when the application allocates a new durable Actor. `ActorId` is opaque outside identity/security composition: business code must not infer provider, tenant, user type, or chronology from it. `Anonymous` has no `ActorId` and is unauthenticated. A valid external stateless API principal may be authenticated without a durable `ActorId`; an operation or Entity Capability that requires durable attribution must demand a resolved Actor and fail closed when it is absent. Failed validation or failed required Actor resolution never falls back to Anonymous.

Application Operations receive an `ActorSnapshot` explicitly at their invocation boundary. Background, import, migration, bootstrap, and message processing supply their Actor deliberately rather than accessing HTTP ambient state. The ASP.NET Core composition edge may use a request-scoped resolver internally, but Business Modules never consume `HttpContext`, `ClaimsPrincipal`, `IdentityUser`, authentication scheme names, raw claims, or a service-locator-style current-user abstraction.

The current nullable string-based `ICurrentUser` is rejected and removed rather than moved unchanged. It is human- and HTTP-centric, treats mutable user names as identity data, cannot model service/background/anonymous Actors, and does not distinguish deliberate absence from failed resolution.

This decision narrowly amends the earlier Kernel boundary: the exact Actor primitives are now stable and demonstrably shared by Application Operations, Entity Actor tracking, authorization, and security audit events. Permission vocabulary, provider mapping, Actor resolution, and application policies remain generated application behavior. No inheritance hierarchy, universal identity service, claims wrapper, or generic `IHasActor` marker is introduced.

**Why:** one Kernel value identity avoids a new generated `Shared`, `Application`, or `Identity` project and gives every Business Module the same durable identifier. Explicit Actor composition supports non-human contexts and testing without ambient state while preserving the user's composition-over-inheritance rule.

### External principal mapping and optional Actor Registry

Provider adapters validate credentials and normalize a provider principal before an Actor is created. Generic OIDC uses the exact `(issuer, subject)` pair. Entra uses a tenant-aware stable key such as `tid + oid` where its cross-application semantics are required, or the client-scoped `sub` where that is the deliberate scope. Email, UPN, preferred username, phone, and display name are mutable presentation claims and never identity keys or automatic linking evidence.

A generated Actor Registry is selected when the application needs any of the following:

- durable `CreatedByActorId` or `UpdatedByActorId` references for an external Actor;
- locally administered permissions or durable security/audit correlation;
- continuity across an external client/provider migration; or
- future account-linking support.

The Registry owns unique normalized external-principal keys and allocates application `ActorId` values. It is not ASP.NET Core Identity and does not store external credentials. Without the Registry, a stateless bearer profile may authorize directly from validated, normalized claims but cannot pretend that it has durable cross-provider Actor continuity. A requirement for a resolved Actor is explicit policy metadata and is verified before the operation runs.

Local Identity uses a `Guid` key that is also its application `ActorId`; it does not need a duplicate Registry row merely for indirection. Business Module tables have no FK or navigation to Local Identity or the Registry. Account linking across local and external providers remains an invalid combination until a separate threat-modeled capability defines proof of control, conflicts, merge/unlink/recovery, uniqueness, concurrency, and audit. Matching by email or user name is permanently rejected.

**Why:** authentication proves an external principal, whereas an application Actor is a durable local meaning. Keeping the Registry conditional preserves a genuinely stateless API option; selecting it when durable attribution is required prevents mutable provider data from entering Domain persistence.

### Generated source and storage ownership without another default project

Provider code is generated into the existing API host, not a new project:

- provider registration, validation, challenge, endpoints, principal mapping, and session projection live under `<name>.Api/Infrastructure/Identity`;
- application Actor resolution and authorization composition live under `<name>.Api/Infrastructure/Security`;
- Local Identity owns a dedicated `identity` schema, context configuration, and migrations in the API project;
- an optional Actor Registry owns a dedicated `security` schema and API-owned migrations; and
- the existing one-shot `<name>.Migrator` is the only production process that applies those migrations.

The lean API follows the same ownership. In a Modular Monolith, identity and Actor resolution remain host-level cross-cutting infrastructure rather than a counterfeit Business Module. Business Modules depend only on Kernel Actor values and receive the snapshot through their Application Operation call. The Migrator may reference the API migrations assembly as already accepted for lean application persistence; it never starts the web host or applies migrations through API startup.

Create a separate `<name>.Identity` project only after a concrete force exists: multiple independently composed hosts need the implementation, identity is deployed/versioned independently, or the API assembly becomes an invalid migration dependency. Extraction is then a Platform Migration with unchanged application-facing Actor contracts. Do not generate the project pre-emptively.

**Why:** folders, schemas, internal types, and dependency rules provide the necessary separation today. A project whose only consumer is the API would add ceremony without a deployment or compilation boundary benefit, conflicting with the accepted minimum-project goal.

### Local ASP.NET Core Identity profile

`identity:interactive` is an optional first-party local-account provider. It owns users, credential hashes, Identity tokens, account state, local roles/claims needed by the adapter, login sessions, schema, and migrations. The initial Supported flow is an HTTP-only secure cookie. The provider uses the generated application permission seam; Business Modules never authorize directly from Identity roles or reference `IdentityUser`.

Registration, email confirmation, password reset/recovery, passkeys, TOTP/MFA, administrative lifecycle, external login, impersonation, and sign-out-everywhere are individually declared subcapabilities. They are neither silently exposed nor claimed Supported merely because Local Identity is selected. A production subcapability that sends links requires a real delivery provider, trusted public URL generation, expiry/replay policy, privacy-preserving responses, rate limiting, and browser tests. Passkeys are deferred until their relying-party, attestation, recovery, credential-management, and test contract is resolved.

Cookie lifetime, sliding expiration, security-stamp validation interval, lockout, account disable/delete behavior, concurrent sessions, and local session invalidation are explicit configuration and tests. No migration, source file, sample, or bootstrap path creates a production default password.

### Generic OIDC and Entra profiles

Generic interactive OIDC is a confidential web client using authorization code plus PKCE `S256`, exact registered callback and post-logout URIs, discovery and issuer validation, nonce/state/correlation handling, safely stored client authentication, and an explicit claim map. PAR, UserInfo, offline access/refresh, RP-initiated logout, and front/back-channel logout are Supported only per named provider profile and test evidence. Implicit flow, ROPC, browser-held client secrets, and long-lived provider tokens in JavaScript-readable storage are rejected.

Generic bearer API support validates signature, exact issuer, exact API audience, lifetime, algorithm/key policy, and key rotation, then requires normalized scopes/roles through application policies. A generic OIDC label is conditional on the tested discovery and protocol profile; it is not a guarantee for every nominally compliant product.

Entra is first-class because its tenant, consent, delegated scope, application role, guest, and workload-identity semantics deserve explicit configuration. Initial support is single-workforce-tenant. Delegated user tokens require the API's scope; application-only tokens require the API's app role and map to `ActorKind.Service`. Prefer managed/workload federation where available or certificates for confidential machine credentials; a secret is a documented fallback with safe storage, expiry monitoring, and rotation. Multi-tenant, consumer-account, arbitrary external-tenant, guest-isolation, claims-challenge/Conditional Access, and on-behalf-of flows are deferred until separately selected and tested.

### Authentication and authorization separation

Selecting any real provider enables a fail-closed fallback policy requiring authentication for unclassified endpoints. Every truly public endpoint declares anonymous access explicitly; every protected endpoint declares authentication and, where required, an application permission or resource policy. `auth=none` registers no accidental scheme, still requires deliberate anonymous endpoint classification, and grants no default permissions.

Provider claims describe a principal; they do not define Business Module permission vocabulary. Provider-specific mapping is idempotent, bounded, case-exact, and located at ingress. Named application permissions and resource-aware handlers authorize the operation. UI visibility is only a usability projection. Application Operations enforce resource and Domain authorization even when the endpoint has already authenticated the Actor.

`IClaimsTransformation` may be used only for cheap idempotent normalization because ASP.NET Core can invoke it more than once. Remote/database Actor resolution and permission loading use explicit bounded request services and caches with defined invalidation rather than hidden unbounded claim transformation.

### Browser, session, Data Protection, and logout contract

React and Vue use a same-origin cookie/BFF posture by default. Blazor Web App achieves the same security outcomes with a mechanism chosen together with its render mode in ticket 118. All three are equally Supported UI options when selected and must provide sign-in, safe return URL, session query, authorization-aware navigation, `401`/`403`, expiry/re-authentication, logout, and accessible failure states. Client-side authorization state and hidden controls are never security boundaries.

Cookie-authenticated state-changing requests require antiforgery protection. CORS is absent for same-origin deployment or restricted to named trusted origins; it is not authentication. Tokens, cookies, authorization codes, client credentials, Data Protection keys, and sensitive raw claims never appear in browser storage, URLs, logs, traces, Problem Details, health output, or audit payloads.

Cookie profiles require an explicit Data Protection operational profile. Multi-instance and rolling deployment require a shared durable key ring, stable application discriminator, least-privileged access, an encryption-at-rest decision, backup/retention policy, and key-rotation tests. This deployment-owned key ring is not stored in the Local Identity schema.

Local cookie clearing, security-stamp/principal revalidation, sign-out-everywhere, access-token expiry, refresh, remote revocation, and provider session logout have different guarantees. The manifest states exactly which controls exist. Interactive OIDC logout clears the local session even when remote logout fails according to the declared policy; provider logout and validated return URLs are used only when the provider profile proves them. Do not promise universal immediate revocation.

### Verification and Native AOT truth

Every Supported provider/flow combination must pass unit policy tests, real-host integration tests, generated-template tests, and protocol/browser tests for its declared UI. Required negative evidence includes incomplete startup configuration; unclassified endpoints; `401` versus `403`; malformed/missing/duplicated claims; wrong issuer, audience, signature, lifetime, scope, role, tenant, state, nonce, or correlation; key rotation; provider outage; unsafe return URLs; logout failure; antiforgery; credential/token leakage; and Human, Service, Background, Anonymous, missing, and unresolved Actor cases.

Local Identity runs schema/migration, concurrency, account, session, invalidation, recovery, Data Protection restart/rotation/two-instance, and browser tests against both PostgreSQL and SQL Server whenever those profiles are declared Supported. OIDC uses a controllable standards-conformant test issuer plus at least one named real-provider interoperability profile. Entra uses dedicated non-production registrations and tenant data and tests delegated and application roles separately.

Do not infer Native AOT compatibility from `.NET 10`. `api + auth=none` remains the primary AOT candidate. A bearer-only profile becomes Supported only when its exact pinned packages publish without unexplained trim/AOT warnings and the published artifact passes protocol and failure-path tests. Local Identity interactive, OIDC interactive, Entra interactive, and Blazor combinations start as `NativeAOT=not-declared`. Linker suppressions require narrow rationale and published-artifact coverage.

### Adopt, adapt, reject, and defer

Adopt optional providers, explicit provider/flow profiles, stable Actor values, secure browser cookies/BFF, fail-closed endpoint policy, normalized application permissions, single-tenant Entra, Service Actors for client credentials, and durable Data Protection for multi-instance cookies. Adapt Actor persistence through the conditional Registry and keep provider implementation in the existing API project until extraction has a real force.

Reject the current `ICurrentUser`, raw provider types or roles in Business Modules, automatic email/UPN linking, Identity proprietary bearer tokens as a general token service, implicit flow, ROPC, browser token custody, fake system users, mandatory Local Identity, an always-generated Identity project, universal logout/revocation claims, and unverified AOT claims.

Defer account linking, passkeys and other advanced Local Identity subcapabilities, Entra multi-tenant/consumer and advanced Conditional Access/OBO profiles, exact UI/render-mode implementation, and any separate identity package/project until their stated forces and release evidence exist.

### Migration and dependent decisions

Replace the existing `ICurrentUser` with the admitted Kernel Actor values and generated provider adapters; no compatibility wrapper is retained. Add authentication middleware only when a real provider profile is selected, and review endpoint exposure as an explicit Platform Migration when adding authentication to an existing anonymous application. Local Identity or Actor Registry persistence adds API-owned schemas and migrations consumed by the existing Migrator, not a new default project.

[Define the security and observability baseline](111-security-observability-baseline.md) owns credential/configuration hardening, Actor propagation, audit event fields, rate limits, telemetry privacy, and operational evidence. [Design the supported UI provider architectures](118-ui-provider-architecture.md) owns concrete React, Blazor, and Vue implementations and Blazor render-mode behavior. [Define the AOT and performance compatibility matrix](112-aot-performance-matrix.md) owns exact publish combinations and budgets. Those tickets must preserve this provider/flow grammar, explicit Actor contract, permission boundary, and negative-test requirements.
