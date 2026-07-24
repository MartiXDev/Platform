# Identity provider capability matrix research

Research date: 2026-07-17  
Target: .NET 10 and ASP.NET Core 10 Generated Solutions

## Scope and source policy

This note supplies the primary-source evidence for Wayfinder ticket 108. It
does not itself resolve the ticket. Sources are limited to Microsoft/.NET and
ASP.NET Core documentation, Microsoft identity platform documentation, final
OpenID Connect specifications, and IETF standards or Best Current Practice.

Microsoft Learn pages are living documentation and may change after the
research date. Links that support it use `view=aspnetcore-10.0` or the .NET 10
API surface where available. Microsoft Entra service behavior, package support,
and portal prerequisites are independently versioned from .NET. Implementation
must therefore pin the selected package versions, capture provider metadata and
configuration assumptions, and rerun the provider's release tests. Protocol
requirements from final OpenID Connect specifications and RFCs are more stable,
but an individual provider can support only a subset of optional features.

## Executive conclusion

The current MartiX direction is sound: authentication, application Actor
identity, authorization, local account storage, and UI are separate concerns.
The provider matrix should preserve that separation and expose four initial
profiles:

1. `auth=none`, with a deliberate anonymous Actor and explicit anonymous
   endpoint metadata;
2. local ASP.NET Core Identity, with application-owned accounts and cookie
   sessions;
3. generic external OpenID Connect, using a confidential authorization-code
   client with PKCE for interactive web use and JWT bearer validation for APIs;
4. Microsoft Entra ID, as a first-class external provider with explicit
   single-tenant, delegated-user, and application-identity contracts.

Interactive browser sessions, bearer-protected APIs, and machine-to-machine
access are not interchangeable configuration details. They have different
schemes, challenges, credentials, revocation behavior, UI needs, and tests.
React and Vue should use the same-origin cookie/BFF posture already preferred
by the Capability Matrix. Blazor Web App must select its authentication shape
with its render mode, but only server-side authorization is authoritative.

Local plus external account linking should remain an invalid initial
combination. A stable provider-independent `ActorId` across providers requires
an explicit, durable Actor Registry or a deliberate migration/linking protocol;
matching accounts by email is unsafe. External authentication does not require
ASP.NET Core Identity storage, but durable actor continuity, locally managed
permissions, or account linking can independently require persistence.

## Facts that constrain the design

### Authentication schemes and anonymous operation

ASP.NET Core authentication is scheme-based. A scheme identifies a handler and
its options, including authenticate, challenge, and forbid behavior. Cookie
challenge normally redirects, while bearer challenge returns `401`; forbid for
an authenticated but unauthorized caller is `403`. With multiple schemes, the
application must choose defaults or name schemes in policies. Authentication
middleware must run before middleware that depends on the authenticated
principal ([ASP.NET Core authentication overview](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/?view=aspnetcore-10.0)).

A fallback authorization policy can require authentication for every endpoint
that does not declare another policy. Microsoft recommends this fail-closed
posture because newly added endpoints are then protected unless explicitly
anonymous ([secure data with authorization](https://learn.microsoft.com/en-us/aspnet/core/security/authorization/secure-data?view=aspnetcore-10.0)).

Consequences for MartiX:

- `auth=none` should register no accidental authentication scheme and should
  generate an explicit anonymous Actor rather than a permissive fake user.
- Every HTTP endpoint must still carry an intentional authorization
  classification. In `auth=none`, business endpoints are explicitly anonymous;
  infrastructure endpoints retain their own exposure policy.
- Selecting a provider changes the generated security posture to a
  require-authenticated fallback. Truly public endpoints must then be explicitly
  anonymous, and protected endpoints must name an application permission or
  other policy where authentication alone is insufficient.
- The generator must not silently preserve blanket anonymous metadata when an
  existing solution later adopts authentication. That is a reviewed Platform
  Migration because endpoint exposure changes.

### ASP.NET Core Identity is local account management, not Entra

ASP.NET Core Identity manages users, passwords, profile data, roles, claims,
tokens, email confirmation, external logins, and login UI. Its default EF model
contains users, roles, user claims, user tokens, external user logins, role
claims, and user-role joins. It is explicitly unrelated to the Microsoft
identity platform ([Identity introduction](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/identity?view=aspnetcore-10.0),
[Identity model customization](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/customize-identity-model?view=aspnetcore-10.0)).

ASP.NET Core Identity's API endpoints can issue either cookies or proprietary
bearer tokens. Microsoft recommends cookies for browser applications because
the browser manages them without exposing them to JavaScript. The built-in
tokens are not standard JWTs and are intended for simple scenarios, not as a
general token server or identity provider
([Identity API authorization](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/identity-api-authorization?view=aspnetcore-10.0)).

Identity has explicit session invalidation behavior. The security-stamp
validator periodically regenerates the principal and can invalidate existing
cookies after password, login, or other security-sensitive changes; its
validation interval trades datastore traffic against stale claims
([Identity configuration and security stamps](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/identity-configuration?view=aspnetcore-10.0),
[.NET 10 `SecurityStampValidatorOptions`](https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.identity.securitystampvalidatoroptions.validationinterval?view=aspnetcore-10.0)).

.NET 10 adds ASP.NET Core Identity passkey support, but the initial API is
Identity-specific, has no default attestation validation, treats passkeys as a
primary factor rather than built-in second factor, and requires HTTPS and
careful relying-party domain control
([ASP.NET Core passkeys](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/passkeys/?view=aspnetcore-10.0)).

Consequences for MartiX:

- Local Identity is an optional isolated Capability Provider, not the Actor
  contract and not a mandatory Business Module dependency.
- It owns its account model, credential and recovery policy, `identity` schema,
  EF configuration, migrations, login/session endpoints, and provider tests.
  Business Module tables store only application `ActorId` values and have no FK
  or navigation to Identity tables.
- The first supported browser flow should be an HTTP-only secure cookie. Do not
  present Identity's proprietary bearer token as a general JWT/OAuth solution.
- Email confirmation, password recovery, passkeys, TOTP, administrative account
  lifecycle, and external-login linking are separate subcapabilities with
  additional prerequisites and tests. They must not appear merely because
  `auth=identity` was selected.

### Generic OpenID Connect interactive clients

OpenID Connect defines a subject identifier as locally unique and never
reassigned within its issuer. The guaranteed stable identifier is therefore
the `iss` plus `sub` pair; email, phone, display name, and preferred username do
not have the same guarantee. Providers can issue pairwise subject identifiers,
so the same human can have different `sub` values for different clients
([OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0-18.html)).

The .NET 10 guidance recommends an OIDC confidential interactive client using
authorization code flow and PKCE. Public OIDC/OAuth clients are no longer the
recommended web-application posture. The ASP.NET Core OIDC handler performs
remote challenge/sign-out and uses a cookie sign-in scheme to persist the web
session. Provider registration requires exact callback and post-logout URIs,
authority, client ID, and a safely stored client secret or client assertion.
Providers differ in discovery metadata and optional features; from .NET 9 the
handler uses Pushed Authorization Requests when advertised
([configure OIDC web authentication](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/configure-oidc-web-authentication?view=aspnetcore-10.0)).

OAuth 2.0 Security Best Current Practice requires authorization servers to
support PKCE, requires a non-exposing challenge method such as `S256`, rejects
weak flow assumptions, and requires public-client refresh tokens to be
sender-constrained or rotated. Access tokens should be audience- and
privilege-restricted
([RFC 9700](https://datatracker.ietf.org/doc/html/rfc9700)).

Consequences for MartiX:

- The provider adapter validates protocol output and maps the external
  `(issuer, subject)` key to an application Actor. It must never key or link an
  Actor by email, username, or display name.
- A provider-specific claim map is required. Claim mapping must use exact,
  documented casing; modern `Microsoft.IdentityModel` principals use
  case-sensitive claim-type matching while cookie identities generally remain
  case-insensitive
  ([claim authorization casing](https://learn.microsoft.com/en-us/aspnet/core/security/authorization/claims?view=aspnetcore-10.0)).
- Generic OIDC support is conditional on verified discovery, code plus PKCE,
  token validation, redirect/logout behavior, key rotation, and claim mapping.
  The label cannot promise compatibility with every nominal OIDC server.
- Tokens remain at the server boundary for a cookie/BFF UI. A browser UI receives
  only a safe session projection, not provider tokens or raw claims.

### Microsoft Entra ID is a specialized external provider

An API must validate an access token's signature, issuer, lifetime, and audience
and accept only a token intended for that API. Microsoft recommends
`Microsoft.Identity.Web` for ASP.NET Core web apps and APIs. Multi-tenant issuer
validation is more complex than accepting `common`: the tenant identifier,
issuer template, and signing-key issuer must be tied together, and tenant ID
must participate in data lookup
([Microsoft identity platform access tokens](https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens)).

For Entra user identities, mutable `preferred_username` and email values must
not drive authorization. `oid` is immutable within a tenant and can be combined
with `tid` for identity shared across applications; `sub` is pairwise to the
token recipient. Claims may be absent and applications must not depend on
incidental claim presence
([access-token claims reference](https://learn.microsoft.com/en-us/entra/identity-platform/access-token-claims-reference),
[ID-token claims reference](https://learn.microsoft.com/en-us/entra/identity-platform/id-token-claims-reference)).

Delegated user calls are authorized through API scopes. Application-only calls
use application permissions/app roles. Client-credentials flow is for
confidential clients acting as themselves, not as a user, and normally does not
return a refresh token
([verify scopes and app roles](https://learn.microsoft.com/en-us/entra/identity-platform/scenario-protected-web-api-verification-scope-app-roles),
[OAuth 2.0 client credentials](https://datatracker.ietf.org/doc/html/rfc6749#section-4.4)).
Entra supports secrets, certificates, and federated credentials; Microsoft
documents certificates or federated credentials as higher-assurance choices
than a shared secret
([Entra client credentials](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow),
[certificate credentials](https://learn.microsoft.com/en-us/entra/identity-platform/certificate-credentials)).

Consequences for MartiX:

- Initial Entra support should be single-tenant unless multi-tenant acceptance,
  tenant allow-listing, guest semantics, issuer validation, and data isolation
  are explicitly selected and tested.
- User Actors and service/application Actors are distinct. A client-credentials
  token has no human user and must not be adapted into a fake current user.
- The API registration owns audience, exposed delegated scopes, application
  roles, and consent prerequisites. A web/BFF client registration owns redirect
  and logout URIs. A daemon/client registration owns its app-role assignments
  and credential lifecycle.
- Prefer workload identity/federated credential or certificate when the
  deployment supports it. A client secret is a supported fallback with an
  explicit rotation and secret-storage contract.
- ROPC is not a supported provider flow; Microsoft recommends against it and it
  is incompatible with MFA
  ([Entra ROPC guidance](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth-ropc)).

### Claims normalization and authorization

Claims describe the subject; permissions describe what the application allows
the Actor to do. ASP.NET Core policy authorization composes named policies from
requirements and handlers and supports resource-aware imperative checks after
the resource has been loaded
([policy authorization](https://learn.microsoft.com/en-us/aspnet/core/security/authorization/policies?view=aspnetcore-10.0),
[resource-based authorization](https://learn.microsoft.com/en-us/aspnet/core/security/authorization/resource-based?view=aspnetcore-10.0)).

`IClaimsTransformation` is a central transformation point but can execute on
every `AuthenticateAsync` call and can execute multiple times. Transformations
must therefore be idempotent and should not hide unbounded remote or database
work
([`IClaimsTransformation`](https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.authentication.iclaimstransformation?view=aspnetcore-10.0),
[claims mapping and transformation](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/claims?view=aspnetcore-10.0)).

Recommended MartiX boundary:

```text
provider ticket/ClaimsPrincipal
        |
        v
provider-specific principal validator and mapper
        |
        +--> ExternalPrincipalKey (scheme, issuer, subject/tenant/object)
        |
        v
Actor resolver / optional durable Actor Registry
        |
        v
immutable request Actor snapshot
        |
        v
application permission and resource policies
```

The stable application contract should represent at least Actor kind
(`Anonymous`, `Human`, `Service`, `Background`, or another explicitly admitted
kind), immutable `ActorId` when one exists, authentication state, and provider-
independent permission evaluation. Display name is optional presentation data,
not identity. Business code must not consume `ClaimsPrincipal`, `IdentityUser`,
scheme names, token claim names, or provider roles.

The exact `ActorId` type is a ticket decision, but research exposes an important
constraint: an external principal can be resolved without local Identity
accounts, yet preserving one application Actor across provider/client changes
requires a durable mapping. If an application does not select such continuity,
the external principal key can identify a provider-bound Actor, and a provider
change is an explicit data migration.

### Account linking and conflict semantics

ASP.NET Core Identity can store multiple external logins for one local user
([Identity custom stores](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/identity-custom-storage-providers?view=aspnetcore-10.0)).
That mechanism does not define MartiX's proof, conflict, merge, audit, recovery,
or unlink policy.

The following recommendation is an inference from the stable-identifier rules
in OpenID Connect Core and Microsoft's warning that email and username are
mutable: automatic linking by matching email, UPN, or display name can attach an
external principal to the wrong application Actor. Linking must require fresh
proof of control of both identities or an audited administrative recovery
process, enforce uniqueness of every normalized external key, handle concurrent
link attempts transactionally, and prevent removal of the last recovery method.

Therefore retain the current rule: local plus external identity is invalid
until a separate account-linking capability and threat model are resolved. Do
not make account linking an implicit feature of `auth=identity` or
`auth=oidc`.

### Cookies, Data Protection, session, logout, and revocation

ASP.NET Core Data Protection protects authentication and antiforgery payloads.
Default environment-derived settings are suitable for one machine, but a
multi-instance app needs a shared key repository. The key ring is security-
sensitive: access permits creation of new keys, so storage access must be
restricted to the application. `SetApplicationName` supplies isolation or
intentional sharing; key persistence and encryption at rest are separate
choices
([Data Protection configuration](https://learn.microsoft.com/en-us/aspnet/core/security/data-protection/configuration/overview?view=aspnetcore-10.0),
[key storage providers](https://learn.microsoft.com/en-us/aspnet/core/security/data-protection/implementation/key-storage-providers?view=aspnetcore-10.0)).

Cookie authentication continues to accept an issued cookie until expiry unless
the application validates backend changes through `ValidatePrincipal` or an
equivalent mechanism
([cookie authentication](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/cookie?view=aspnetcore-10.0)).
For OIDC, local cookie logout and provider logout are distinct actions. ASP.NET
Core guidance signs out both schemes; the OIDC RP-Initiated Logout specification
uses provider discovery's `end_session_endpoint` and registered post-logout
redirects
([ASP.NET Core OIDC logout](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/configure-oidc-web-authentication?view=aspnetcore-10.0),
[OIDC RP-Initiated Logout 1.0](https://openid.net/specs/openid-connect-rpinitiated-1_0.html)).
Provider-wide session termination can additionally use front-channel or
back-channel logout only where the provider and client explicitly support it
([OIDC Back-Channel Logout 1.0](https://openid.net/specs/openid-connect-backchannel-1_0.html)).

Consequences for MartiX:

- The Generated Solution/deployment owns one explicit Data Protection profile,
  not the Identity EF schema. Multi-instance cookie/BFF support requires a
  shared durable key ring, stable application discriminator, access control,
  encryption-at-rest decision, backup/retention policy, and rotation tests.
- Cookie lifetime, sliding expiration, security-stamp/principal revalidation,
  local sign-out, sign-out-everywhere, OIDC provider logout, access-token
  expiration, refresh, and remote revocation are different controls. The
  capability manifest must state which are supported rather than promise
  immediate universal revocation.
- Logout endpoints are state-changing security operations. Redirect targets
  must be fixed or validated; provider failures must still clear the local
  session according to an explicit policy.
- Do not log cookies, authorization codes, access/refresh/ID tokens, client
  credentials, Data Protection keys, or raw sensitive claims.

### Browser UI contract without selecting UI implementation

Microsoft recommends cookies for browser-based ASP.NET Core Identity clients.
Cookie-authenticated unsafe requests need antiforgery protection because the
browser sends cookies automatically. Minimal APIs can require antiforgery
metadata; disabling it is appropriate only when a browser cookie cannot
authenticate the endpoint
([antiforgery guidance](https://learn.microsoft.com/en-us/aspnet/core/security/anti-request-forgery?view=aspnetcore-10.0)).
Cross-origin credentials increase risk, and wildcard origins cannot be combined
safely with credentials
([ASP.NET Core CORS](https://learn.microsoft.com/en-us/aspnet/core/security/cors?view=aspnetcore-10.0)).

For Blazor Web App, authentication uses ASP.NET Core mechanisms and differs by
render mode. Client-side authorization state is a UI aid, not a security
boundary; server-side checks enforce access. Microsoft's .NET 10 OIDC sample
uses a BFF and notes that serialized WebAssembly authentication state is fixed
for the lifetime of the client application
([Blazor authentication](https://learn.microsoft.com/en-us/aspnet/core/blazor/security/?view=aspnetcore-10.0),
[Blazor Web App OIDC](https://learn.microsoft.com/en-us/aspnet/core/blazor/security/blazor-web-app-with-oidc?view=aspnetcore-10.0)).

Ticket 118 should choose render modes and concrete frontend libraries. Ticket
108 can safely require the following provider-neutral UI contract now:

- Blazor Web App, React, and Vue have equal authentication outcomes: explicit
  sign-in, safe return URL, session-state query, authorization-aware navigation,
  `401`/`403` handling, expiry/re-authentication, logout, and accessible error
  states.
- React and Vue use same-origin secure HTTP-only cookie/BFF by default. Provider
  tokens and client credentials are never stored in browser `localStorage`,
  `sessionStorage`, or JavaScript-readable cookies.
- Cookie-authenticated state-changing API calls carry the generated antiforgery
  contract. CORS is absent for same-origin hosting or is a narrow named-origin
  policy; it is not an authentication mechanism.
- Blazor chooses the exact server/client state propagation with its selected
  render mode. Every server endpoint independently authorizes the operation.
- UI permission hints improve UX only. Hiding a button never replaces server
  policy or resource authorization.
- `auth=none` still has an explicit anonymous session shape so UI code does not
  invent a fake authenticated user.

### Native AOT and trimming

Native AOT and trimming require static analysis of reachable code. Microsoft
requires trim warnings to be understood and fixed rather than broadly
suppressed, recommends source generation or explicit generic registration over
unbounded reflection, and requires runtime testing of the published artifact
([fix trim warnings](https://learn.microsoft.com/en-us/dotnet/core/deploying/trimming/fixing-warnings),
[prepare libraries for trimming](https://learn.microsoft.com/en-us/dotnet/core/deploying/trimming/prepare-libraries-for-trimming)).

The evidence does not justify claiming that every combination of Identity UI,
EF stores, generic OIDC, Microsoft Identity Web, Blazor render mode, and
provider extensions is Native AOT compatible. Treat compatibility as an output
of the exact provider profile, not a property inferred from target framework.

Recommended classification:

- `api + auth=none` remains the strongest Native AOT candidate.
- Bearer-only API profiles may become Supported for Native AOT only after the
  pinned package combination publishes with zero unexplained AOT/trim warnings
  and passes signed-token, key-rotation, authorization, and error-path tests.
- Local Identity interactive UI, generic OIDC interactive UI, Entra interactive
  UI, and Blazor modes are `NativeAOT=not-declared` initially unless their exact
  generated artifact passes the same publish and end-to-end gate.
- No linker descriptor or suppression may be added merely to make CI green; it
  must be scoped, justified, and exercised by a published-artifact test.

## Provider capability matrix

| Profile | Application-facing authentication | Required storage | Required external prerequisites | Initial flow support | Important exclusions |
| --- | --- | --- | --- | --- | --- |
| `none` | Deliberate anonymous Actor; no provider claims | None for authentication | None | Anonymous HTTP; explicit background/bootstrap Actors | No fake authenticated user, default permissions, or accidental scheme |
| `identity` | Local account maps to stable `ActorId`; provider types remain in adapter | Relational `identity` schema and migrations; Data Protection key ring for deployed cookie sessions | HTTPS; cookie domain/name policy; credential/recovery policy; email provider only when confirmation/recovery selected | Interactive secure cookie | Proprietary bearer tokens are not a general OAuth/JWT issuer; external linking absent |
| `oidc` interactive | Validated `(iss, sub)` maps to Actor; safe normalized session projection | No local Identity store; Data Protection for cookie; optional Actor Registry for durable continuity/permissions | HTTPS authority/discovery; registered callback/logout URIs; client ID; confidential credential/assertion; exact claim map | Authorization code + PKCE, server cookie/BFF, RP-initiated logout when advertised | No implicit flow, ROPC, email linking, browser-held client secret, or promise of every OIDC server |
| `oidc` API | Validated bearer token maps to Actor and permissions | None intrinsically; optional Actor Registry/permission store | Trusted issuer metadata; exact API audience; signing-key rollover; required scope/role contract | JWT bearer for user or application tokens where provider supports it | ID token as API credential; accepting arbitrary issuer/audience |
| `entra` interactive | Tenant-aware user key (`tid` with `oid`, or client-scoped `sub`) maps to Actor | Data Protection cookie; optional Actor Registry | Tenant and client registration; exact redirect/logout URIs; Microsoft Identity Web profile; consent; credential/assertion | Single-tenant code + PKCE and cookie/BFF | Multi-tenant/consumer accounts until explicitly admitted; email/UPN identity |
| `entra` API delegated | Validated Entra access token plus required API scope | None intrinsically | API registration, App ID URI/audience, delegated scopes, consent, tenant policy | User-delegated bearer | ID token authorization; Graph token accepted by own API |
| `entra` API application | Service Actor plus required app role/application permission | None intrinsically | Client/service-principal registration, app role assignment, admin consent, certificate/federated credential or rotated secret | Client credentials | Fake human user, delegated scope check, ROPC |

The matrix should model interactive, API bearer, and machine-to-machine as
subprofiles selected explicitly. A single `auth=oidc` or `auth=entra` switch is
insufficient to generate secure defaults without the intended host role.

## Provider prerequisites

### Common to every selected provider

- HTTPS production origin and trusted forwarded-header/host configuration.
- Explicit authenticate, challenge, forbid, and sign-out schemes where more
  than one scheme exists.
- Fail-closed authorization fallback plus explicit public endpoints.
- A provider-to-Actor mapping and a separate permission policy.
- Configuration validation at startup without emitting secrets.
- Stable clock behavior through `TimeProvider` in application-owned expiry and
  session policies; protocol handlers retain their supported clock seams.
- Security audit events for sign-in outcome, sign-out, recovery, credential or
  link changes, privileged permission changes, and administrative revocation,
  without recording secrets or tokens.

### Local Identity

- Selected PostgreSQL or SQL Server relational provider and module-owned
  Identity migrations under the one-shot migrator contract.
- Explicit Identity user key mapped to application `ActorId`; no FK from
  Business Modules.
- Password/passkey/MFA/recovery policy selected independently.
- Real email delivery and verified public URL generation before enabling email
  confirmation or recovery in production.
- Data Protection operational profile, cookie policy, security-stamp validation
  interval, account lockout, rate limiting, session lifetime, and secure
  account-management UI.
- Production bootstrap creates no default credential in migrations or source.

### Generic OIDC

- HTTPS issuer and discovery document; exact expected issuer, client ID,
  callbacks, post-logout redirects, response type, scopes, and claim mapping.
- Confidential client authentication using secret from a secret store or a
  supported client assertion; PKCE `S256`; nonce and correlation/state handling
  supplied by the handler.
- API profiles additionally require exact audience and required scopes/roles.
- Documented support decision for PAR, UserInfo, refresh/offline access,
  RP-initiated logout, and front/back-channel logout. Discovery presence is not
  evidence that an untested optional feature is operationally supported.
- Data Protection and cookie session profile for interactive clients.

### Microsoft Entra ID

- Explicit account audience: initially one workforce tenant. Any organization,
  personal accounts, external tenant, and guest behavior are separate profiles.
- Separate or deliberately shared app registrations for API, web/BFF, and
  daemon roles, with exact redirect/logout URIs and exposed API permissions.
- Tenant ID, client IDs, API audience, scopes/app roles, consent ownership, and
  credential lifecycle recorded outside source secrets.
- `Microsoft.Identity.Web` versions pinned and verified with ASP.NET Core 10.
- Application-only clients prefer workload federation/managed identity where
  applicable or certificates; secret fallback has expiry monitoring and
  rotation evidence.

## Required verification matrix

Do not test only mocked `ClaimsPrincipal` objects. Unit tests for mapping and
policies are necessary but not sufficient; every Supported combination needs a
published host and protocol-level evidence.

### Baseline tests for every profile

1. Application starts only with complete valid configuration and fails safely
   for missing issuer, audience, credential reference, redirect, key store, or
   provider-specific prerequisites.
2. Endpoint inventory proves every endpoint is explicitly public or protected;
   a newly added unclassified endpoint fails closed when authentication exists.
3. Public, unauthenticated (`401` challenge), authenticated-but-forbidden
   (`403` forbid), allowed, and resource-owner/non-owner paths are distinct.
4. Actor mapping covers anonymous, human, service, background, bootstrap, and
   unavailable/malformed principal cases without inventing a human identity.
5. Permission and resource policies use normalized application concepts, not
   provider claim names. Missing, duplicate, reordered, differently cased, and
   oversized claim sets fail according to policy.
6. Logs, traces, metrics, Problem Details, audit events, and health output contain
   no password, cookie, authorization code, token, secret, key, or raw sensitive
   claim.
7. The exact release artifact is tested after normal publish; any declared
   trim/Native AOT profile is also tested after its release publish mode with no
   unexplained warnings.

### `auth=none`

- All intended business routes work as the explicit anonymous Actor and no
  authentication challenge or provider endpoint is accidentally mapped.
- Permission-required endpoints cannot become allowed through a default
  anonymous permission set.
- Background/bootstrap Actors must be supplied explicitly outside HTTP.
- A generated migration rehearsal to an authentication provider produces a
  reviewed endpoint-exposure diff; it never silently protects or exposes routes.

### Local Identity, for PostgreSQL and SQL Server

- Empty-to-current and previous-Supported-to-current Identity migrations,
  schema ownership, unique normalized identifiers, concurrency, and rollback-by-
  roll-forward behavior use the real provider.
- Register, confirmed/unconfirmed sign-in, invalid credentials, lockout, logout,
  cookie expiry/sliding policy, password change, security-stamp invalidation,
  sign-out-everywhere, disabled/deleted account, and concurrent session behavior.
- Confirmation/recovery tests include expired, replayed, wrong-user, tampered,
  and single-use expectations plus delivery failure without account disclosure.
- Each selected 2FA/passkey subcapability tests registration, authentication,
  recovery, replay, credential limit, HTTPS/origin/domain enforcement, and
  revocation. Omitted subcapabilities expose no dead endpoints or tables beyond
  Identity's deliberate model.
- Data Protection survives restart and rolling deployment, rejects foreign
  application discriminators, tolerates key rotation, and works across two host
  instances sharing the configured key ring.
- Browser tests run for Blazor, React, and Vue combinations actually declared
  Supported; they include antiforgery success/failure and secure cookie flags.

### Generic OIDC

- A controllable standards-conformant test issuer exercises discovery, exact
  issuer/audience/signature/lifetime/nonce/state validation, PKCE, callback
  correlation, signing-key rotation, metadata refresh, clock boundaries, and
  provider outage. At least one explicitly named real provider profile validates
  interoperability before release.
- Stable Actor mapping uses issuer plus subject. Changed email/name remains the
  same Actor; same email with a different issuer/subject is a different Actor;
  pairwise subjects and changed client registration follow the documented
  migration policy.
- Missing optional claims, duplicate identities, malformed values, claim casing,
  excessive group/role claims, and unknown permission values fail safely.
- Local cookie logout always clears the MartiX session. RP-initiated and any
  front/back-channel provider logout are tested only when declared Supported,
  including invalid logout tokens and unsafe return URLs.
- Cookie/BFF browser tests prove no provider token or client credential is
  exposed to JavaScript storage, HTML, URLs, logs, or browser diagnostics.
- API-bearer profiles test valid token, wrong issuer, wrong audience, expired/not-
  yet-valid token, bad signature, stale signing key, insufficient scope/role,
  delegated user, and application-only token.

### Microsoft Entra ID

- Run the generic OIDC/bearer tests against dedicated Entra test registrations
  and tenant, not production identities.
- Single-tenant profile rejects another tenant. If multi-tenant is later
  Supported, test issuer-template/signing-key binding, tenant allow-list,
  home/guest tenant semantics, consent, and isolation explicitly.
- Delegated-user token requires the intended API scope. Application token
  requires the intended app role. A token for Microsoft Graph or another API is
  rejected by audience.
- Actor mapping tests `tid + oid`, client-scoped `sub`, guest users, mutable UPN/
  email/display name, absent optional claims, service principals, and credential
  rotation.
- Client-credentials tests cover certificate/federated credential or secret
  rotation, expired/revoked credential, missing admin consent, missing app role,
  and service Actor audit evidence.
- Conditional Access/MFA challenges and claims challenges are added to the
  profile only if the Generated Solution declares that behavior; otherwise they
  are a documented future extension, not silently swallowed.

### UI compatibility rows

The release matrix need not execute the full Cartesian product, but these rows
are non-negotiable when declared Supported:

| UI provider | `none` | Local cookie | Generic OIDC cookie/BFF | Entra cookie/BFF |
| --- | --- | --- | --- | --- |
| No UI (`api`, modular host) | Host and API tests | API/account endpoint tests where offered | Bearer and/or interactive host according to role | Delegated and application API roles according to role |
| Blazor Web App | Anonymous state | Full browser flow | Full browser flow for every supported render mode | Full browser flow for every supported render mode |
| React | Anonymous state | Full browser flow plus antiforgery | Same-origin BFF browser flow | Same-origin BFF browser flow |
| Vue | Anonymous state | Full browser flow plus antiforgery | Same-origin BFF browser flow | Same-origin BFF browser flow |

React and Blazor retain equal prominence, and Vue passes the same contract when
selected. Ticket 118 can minimize redundant implementation tests, but it cannot
remove provider-level sign-in, expiry, forbidden, antiforgery, and logout
evidence from a Supported UI combination.

## Comparison with current MartiX decisions and code

### Decisions already validated

- Authentication remains optional for every Preset, including Full Stack.
- Actor and authorization seams are present without forcing account storage.
- Local Identity requires relational persistence; generic external identity does
  not inherently require an Identity database.
- Permission management remains separate from authentication.
- Business Modules keep provider-independent Actor identifiers without FK or
  navigation to Identity storage.
- React/Vue prefer cookie/BFF and long-lived browser token storage is invalid.
- Local plus external identity remains invalid until linking/conflict semantics
  are designed.
- UI choice remains explicit and provider details do not enter Domain or
  Application Operations.

### Current `ICurrentUser` shortcomings

The current
[`ICurrentUser`](../../../../src/MartiX.WebApi/Abstractions/ICurrentUser.cs)
contains only nullable string `UserId`, nullable `UserName`, and
`IsAuthenticated`. It has no implementation in the current project.

It should not be moved unchanged into the Platform because:

- “user” excludes anonymous, service, background, import, and bootstrap Actors;
- a nullable string does not define stable identity, validity, or provider
  migration semantics;
- `UserName` is mutable presentation data and is unsafe as identity or
  authorization input;
- it cannot distinguish absent authentication, failed actor resolution, and a
  deliberately anonymous Actor;
- it carries no Actor kind, authentication source assurance, or deliberate
  application permission seam;
- it does not define behavior outside an HTTP request;
- it encourages callers to branch on authentication instead of requiring named
  authorization/resource policy at the boundary.

Adapt it into generated application-owned Actor contracts. Authentication
providers should be sealed adapters at the ASP.NET Core composition edge. The
Platform Library should not publish a universal current-user abstraction,
provider claim wrapper, or generic authorization service.

## Adopt, adapt, reject, defer

| Item | Recommendation | Reason |
| --- | --- | --- |
| Optional authentication with baseline Actor/authorization seams | **Adopt** | Supports anonymous, external, service, and background scenarios without a later domain retrofit. |
| Explicit endpoint classification and fail-closed fallback when auth exists | **Adopt** | Matches ASP.NET Core authorization guidance and makes exposure reviewable. |
| Current `ICurrentUser` shape | **Reject** | It is HTTP/human-centric, stringly typed, nullable, and lacks stable Actor semantics. |
| Generated application-owned Actor snapshot and provider adapters | **Adopt** | Keeps application semantics stable while schemes and providers vary. |
| Durable Actor Registry | **Adapt** | Required when cross-provider continuity, local permissions, linking, or durable actor references demand it; not mandatory for every external-only API. |
| ASP.NET Core Identity as optional local provider | **Adopt** | First-party account/credential/session implementation with owned persistence; not needed for external-only or M2M systems. |
| Secure HTTP-only cookie for browser Identity | **Adopt** | Microsoft-recommended browser posture and compatible with server-side BFF. |
| Identity proprietary bearer tokens as Platform token service | **Reject** | They are not standard JWTs and are documented for simple cases, not a general IdP. |
| Generic OIDC confidential code + PKCE | **Adopt** | Current ASP.NET Core guidance and OAuth BCP posture. |
| Browser public client/implicit flow or ROPC | **Reject** | Weaker/deprecated posture; ROPC conflicts with MFA. |
| Generic JWT issuer implemented by MartiX | **Reject** | Key lifecycle, discovery, revocation, consent, and protocol conformance are identity-provider responsibilities. |
| Microsoft Entra ID first-class provider | **Adopt** | Provides verified workforce, delegated API, and application-identity paths without local accounts. |
| Entra single-tenant initial profile | **Adopt** | Keeps issuer, consent, guest, and isolation semantics bounded. |
| Entra multi-tenant/consumer/external-tenant profiles | **Defer** | Require explicit tenant admission, guest, consent, issuer, and isolation design and evidence. |
| Machine-to-machine as service Actor | **Adopt** | Client credentials represent the application, not a human user. |
| Certificate/federated credential preference | **Adopt** | Higher assurance than long-lived shared secrets where deployment supports it. |
| Provider roles/claims directly in business code | **Reject** | Provider naming and claim shape are volatile; use normalized permissions and resource policies. |
| Automatic account linking by email/UPN/name | **Reject** | Those values are mutable and not guaranteed unique; linking needs proof and conflict/audit semantics. |
| Local plus external account linking | **Defer** | Keep invalid until a separate threat-modeled capability is resolved. |
| Shared durable Data Protection keys for multi-instance cookie apps | **Adopt** | Required for cross-instance protected payloads and rolling deployment continuity. |
| Universal immediate logout/revocation promise | **Reject** | Cookie, security stamp, access token, provider session, and back-channel logout have different guarantees. |
| React/Vue same-origin cookie/BFF | **Adopt** | Avoids JavaScript token custody and makes antiforgery/security policy server-owned. |
| Blazor authentication independent of render mode | **Reject** | Official guidance makes hosting/render mode material; ticket 118 must select the concrete mechanism. |
| Native AOT support inferred from .NET 10 | **Reject** | Exact dependency/profile must publish warning-free and pass protocol tests. |
| `api + auth=none` as primary Native AOT target | **Adopt** | Smallest reflection/provider surface; still requires release-artifact evidence. |
| Passkeys automatically included with local Identity | **Defer** | Valuable .NET 10 capability, but current limitations and recovery/domain requirements warrant an explicit subcapability. |

## Recommended ticket decisions

The evidence supports asking the Wayfinder interview to resolve these points in
order:

1. the generated Actor snapshot, `ActorId`, Actor kinds, and failed-resolution
   semantics;
2. whether a durable Actor Registry is selected automatically by persistent
   actor references/permissions or remains an explicit capability;
3. the exact profile grammar separating interactive cookie/BFF, API bearer, and
   machine-to-machine flows;
4. local Identity storage/schema and its initial subcapabilities;
5. generic OIDC compatibility boundary and named reference provider evidence;
6. Entra single-tenant delegated and application profiles;
7. Data Protection ownership and multi-instance deployment contract;
8. permission normalization, endpoint fallback, and resource authorization;
9. logout/revocation guarantees and account-linking invalidity; and
10. release test combinations plus Native AOT declarations.

This ordering prevents UI implementation details from preempting ticket 118
while fixing the identity and authorization contracts that every UI provider
must satisfy.
