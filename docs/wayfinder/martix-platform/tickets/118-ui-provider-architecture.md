---
title: Design the supported UI provider architectures
status: closed
type: wayfinder:grilling
parent: ../map.md
claimed_by: codex-root
blocked_by:
  - 104-capability-preset-matrix.md
  - 106-generated-solution-topology.md
  - 108-identity-provider-matrix.md
  - 110-http-contract-policy.md
  - 111-security-observability-baseline.md
resolved: 2026-07-19
---

## Question

What Application UI and Admin UI topology, framework stack, render and hosting model, generated-client contract, identity flow, shared UI Capability Contract, and quality profile should make Blazor Web App, React, and Vue equally Supported providers?

## Decisions in progress

### Default UI role topology

Generate one selected UI provider project and one deployable UI artifact by
default. The project always contains the required Application UI role and may
compose the optional Admin UI role. The roles have explicit internal boundaries,
separate route spaces, layouts and navigation, authorization policies, and
role-specific security and browser tests. The Admin UI conventionally occupies
the `/admin` route space, but that route is not itself the security boundary.

Keep the Admin UI independently selectable as a Capability role, but do not
translate that logical independence into an additional project or deployment
without a concrete force. A Generated Solution may split it into a separate
project and deployable only when justified by a different trust or network
boundary, identity or security policy, release cadence, owning team or
operational responsibility, or UI provider.

**Why:** Application UI and Admin UI are roles rather than automatically
distinct technology stacks. Their default composition minimizes projects and
avoids duplicating the generated API client, design system, authentication and
session integration, runtime configuration, dependency graph, build pipeline,
and deployment assets. Explicit role boundaries preserve an extraction seam and
enterprise evolution without imposing enterprise deployment complexity on every
new application.

**Alternatives rejected:** Always generating two UI projects and deployments
adds permanent cost without a demonstrated boundary. Mixing privileged Admin UI
features invisibly into ordinary application features lacks an auditable seam
and makes later separation unnecessarily difficult.

### One production UI provider and an evaluation workflow

A Supported Generated Solution selects exactly one UI Capability Provider for
all of its UI roles. Application UI and an optional Admin UI therefore use the
same `blazor-webapp`, `react`, or `vue` provider even if a demonstrated force
later places those roles in separate projects or deployments. Mixed production
providers are Deferred until a concrete use case justifies the larger security,
identity, design-system, accessibility, build, upgrade, browser-test, and
deployment matrix and every declared combination earns full release evidence.

Support research without weakening that production rule through a separate,
explicitly non-production **UI Evaluation Workspace**. It may generate multiple
disposable provider variants against the same design brief, representative user
journeys, OpenAPI contract, Authentication Profile, fixtures, and acceptance
criteria. Each variant should use its framework's natural idioms rather than a
lowest-common-denominator shared UI abstraction. The workspace is excluded from
the production solution, Capability Manifest, deployment, and Supported claims.

Every evaluation records comparable functional behavior, developer experience,
accessibility, security, performance, testability, build, and operational
evidence in an evaluation report. The final provider decision and material
trade-offs become an ADR; exactly one provider is then generated or adopted for
the production solution. The Template System may later expose a dedicated
command such as `martix new ui-evaluation --providers
blazor-webapp,react,vue`, but this command is tooling for architectural research,
not another application Preset.

**Why:** one production provider keeps ownership and release evidence tractable,
while disciplined parallel prototypes allow technology decisions to be based on
the application's real workflows instead of generic demos or preference. Keeping
the evaluation outside the Generated Solution also preserves the accepted
minimum-project objective.

**Alternatives rejected:** Supporting arbitrary mixed production providers from
the first release multiplies combinations without a known consumer need.
Forbidding multi-provider prototypes would remove a useful evidence-producing
decision tool. Keeping all prototypes in the production solution would turn
temporary research into permanent architecture and maintenance cost.

### Blazor Web App render and hosting profile

The initial Supported `blazor-webapp` provider generates one ASP.NET Core Blazor
Web App project with global Interactive Server rendering, prerendering, and
selective static SSR for pages that do not require interactivity. It remains an
HTTP/OpenAPI client of the backend and never references Business Module or API
assemblies. Interactive Server's circuit is an explicit operational dependency:
the profile must verify reconnect and stale-state behavior, bounded per-user
server resources, latency and dependency-loss behavior, scale-out session and
Data Protection configuration, safe logging, graceful deployment, and any
required affinity or SignalR backplane topology.

Do not describe static SSR as merely a performance switch. Use it deliberately
for request/response pages that can provide complete accessible HTML behavior
without a circuit; interactive workflows retain Interactive Server. Prerendered
interactive components must handle their non-interactive phase, duplicated
lifecycle execution, state transfer, loading, and errors explicitly.

A standalone Blazor WebAssembly provider profile is a future explicit option for
requirements such as static hosting, client-side execution, offline behavior, or
reduced server session state. It has its own download, trimming, optional
WebAssembly AOT, browser security, authentication, runtime-configuration, and
artifact evidence. It is not silently selected by `blazor-webapp`.

Interactive WebAssembly and Interactive Auto inside a Blazor Web App are
Deferred. Both require a separate client project in the .NET 10 project model,
and Auto requires behavior to remain correct across initial server interactivity
and later client execution. Promote either only when a real application benefit
justifies the additional project, dual execution environments, identity and
state semantics, publish pipeline, and test matrix. The UI Evaluation Workspace
may prototype all render modes without changing their production status.

**Why:** Interactive Server provides the smallest project topology, fast initial
rendering, and a natural server-held authentication posture for ordinary
enterprise applications. Explicitly accounting for its stateful connection
prevents simplicity at generation time from hiding production scale and
reliability costs. Separate profiles keep WebAssembly and Auto available for
requirements that actually benefit from their different execution model.

**Alternatives rejected:** Interactive Auto as the universal default maximizes
runtime and testing complexity without evidence that every application needs
both execution locations. A mandatory standalone WebAssembly UI gives up the
server-rendered startup and authentication advantages and imposes its download
cost on every application. Treating arbitrary per-component render modes as an
unconstrained default makes security, state ownership, and test coverage
unpredictable.

### React framework and state profile

The Supported React provider uses the current attested React major with strict
TypeScript, Vite, and React Router Framework Mode. The selected rendering profile
configures it as a static SPA or as an SSR/static-prerender-capable web app.
Framework Mode owns URL structure, route modules, type-safe route values, lazy
route code splitting, navigation and pending state, and route-level error
boundaries. A Node.js application server exists only when dynamic SSR is selected;
SPA and fully prerendered profiles produce static artifacts.

TanStack Query is included as the single owner of remote API server state. Route
loaders may ensure or prefetch named queries, and route actions or feature
mutations invalidate the exact affected query keys, but router state and query
state must not become independent caches of the same resource. Query-key
factories, stale times, garbage collection, retry, cancellation, optimistic
updates, and invalidation are explicit feature policies. Unsafe mutations are
never made retryable merely by a global default. The generated OpenAPI client
owns typed HTTP DTOs, serialization, cancellation, and transport behavior below
the query layer.

Use component state, reducers, context, URL state, and form state for their
natural local or scoped responsibilities. Do not include Redux, Zustand, or
another general global client-state manager by default, and never copy remote
query data into one. React Hook Form, a runtime schema library, or another form
abstraction is selected only when a demonstrated form complexity and validation
contract justifies it; backend validation remains authoritative.

**Why:** this stack provides typed routing, code splitting, disciplined remote
state, and explicit rendering strategies while preserving ASP.NET Core as the
only business API backend. Explicit ownership prevents the common accumulation
of router data, query data, and global-store copies with divergent invalidation.
It adopts FullStackHero's useful Vite, routing, and query patterns without
copying every library into every Generated Solution.

**Alternatives rejected:** a Node SSR runtime in the `application` profile adds
another production server without a requirement, but forbidding it would block
the accepted `hybrid-web` profile. Declarative-only routing discards useful type,
loading, action, and error boundaries. Omitting a server-state layer leaves each
feature to reinvent caching and invalidation, while a default general-purpose
global store creates a second owner for data that already belongs to the
server-state cache.

### Vue framework and state profile

The Supported Vue provider uses the current attested Vue 3 major, Single-File
Components with Composition API and `<script setup lang="ts">`, strict
TypeScript, and Vite. Because Vite transpiles TypeScript without whole-program
type checking, `vue-tsc` is a separate mandatory local and release Quality Gate
covering scripts and templates. The `application` profile uses Vue Router as the
owner of URL structure, route metadata and guards, navigation state, route
errors, and dynamic-import route code splitting. The `hybrid-web` profile uses
Nuxt's Vue/Vite stack, file/typed routing and route rules for universal, static,
or hybrid rendering instead of hand-building a parallel Vue SSR framework.

TanStack Vue Query is the single owner of remote API server state and follows
the same explicit query-key, invalidation, stale-time, garbage-collection,
retry, cancellation, mutation, and optimistic-update policies as the React
provider. The generated OpenAPI client owns DTO and transport behavior below it.
Feature composables may compose query and presentation behavior but must not
hide an independent cache or copy query results into another store.

Use component state, `ref`, `reactive`, computed state, scoped composables, and
URL state for their natural responsibilities. Pinia is the preferred future
Supported provider only when the application demonstrates durable cross-feature
client state that does not belong to the server, URL, component tree, or a
feature-scoped composable. It is absent by default and, when selected, must not
become a second owner for API resources.

**Why:** this uses Vue's natural authoring, routing, and reactivity model while
holding it to the same type, remote-state, code-splitting, and release contract
as React. Keeping Pinia conditional follows KISS without closing the seam for a
genuine application-owned client state machine.

**Alternatives rejected:** Options API as the generated convention offers less
direct composition for the feature-oriented template. Relying on Vite alone
would allow TypeScript and template errors to escape CI. Including Pinia in
every solution creates an ownerless global store and invites duplication of
TanStack Query data; forbidding Pinia entirely would ignore legitimate complex
client-only state.

### Rendering profiles and SEO readiness

Every Full Stack generation explicitly selects one Supported rendering profile.
`application` targets primarily authenticated workflows: React Router and Vue
produce static SPAs, while Blazor uses Interactive Server with prerendering and
selective static SSR. `hybrid-web` supports public indexable content and
authenticated application/admin areas in the same one UI project: React Router
uses SSR and/or static prerendering, Vue uses Nuxt hybrid rendering, and Blazor
uses static SSR for public routes with Interactive Server only where needed.

Do not silently select a Node production runtime. React/Vue routes whose public
content is completely known at build time may prerender to a static artifact;
dynamic per-request SSR introduces an explicit Node/Nitro process, operational
profile, health/readiness, caching, security, observability, and release evidence.
When the user is uncertain and public content is plausible, recommend
`hybrid-web`; use `application` when avoiding that runtime and SEO guarantee is a
known requirement.

Both profiles are structurally SEO-ready: clean history URLs without hashes,
route classification as public indexable, public `noindex`, or authenticated
`noindex`, unique localized title and description, canonical URL, Open Graph and
social metadata, valid status codes and redirects, semantic headings and
landmarks, `robots.txt`, sitemap generation, and an explicit structured-data
extension point. Authenticated, personalized, or tenant-private data must never
enter public prerender, shared SSR caches, sitemap, social previews, or search
indexes.

Feature code is SSR-safe from inception: browser globals and layout APIs are
accessed only behind client lifecycle boundaries, server and client caches are
separated, request/user state is never stored in module singletons, generated
transport obtains the correct runtime base URL and credentials, and hydration
or prerender state cannot duplicate unsafe mutations. SEO/browser tests verify
HTML without JavaScript, titles and canonical links, robots/sitemap exclusions,
structured data when selected, public `200`, genuine `404`, redirect status,
cache variation, hydration, and authenticated-content isolation.

Only `hybrid-web` makes a Supported SEO-rendering claim. `application` preserves
the metadata and SSR-safe migration seam but does not market client-rendered
dynamic content as reliably indexable.

**Why:** public websites are a first-class MartiX use case, while many business
applications should not pay for a second server. Explicit profiles preserve one
project and shared feature architecture but make the real rendering, security,
deployment, and SEO difference visible and testable.

**Alternatives rejected:** metadata-only SPA "SEO" depends on crawler execution
and cannot prove initial HTML or correct response status. Universal SSR forces a
Node process and hydration complexity on every React/Vue application. A separate
marketing project is unnecessary when one provider can enforce public/private
route boundaries; split it later only for a genuine team, deployment, trust, or
content-platform force.

For the initial React/Vue `hybrid-web` profile, SSR, SSG, ISR, and prerendering
are limited to explicitly public, nonpersonalized routes and public API
operations. The Node/Nitro renderer does not own an authentication session,
store or renew user access/refresh tokens, forward arbitrary browser cookies,
perform user-specific SSR, or place actor/tenant-private data in shared HTML or
payload caches. Cache keys and invalidation include every public content and
culture dimension, and build-time rendering cannot silently depend on production
secrets or mutable user context.

Authenticated `/app` and `/admin` React/Vue routes remain client-rendered and use
the accepted same-origin ASP.NET Core cookie/BFF profile. They are `noindex` and
excluded from sitemap, shared prerender output, and social previews. ASP.NET Core
therefore remains the single browser session and authorization owner instead of
duplicating critical identity behavior in JavaScript. Personalized SSR is
Deferred until a dedicated profile defines session ownership, token delegation,
CSRF, cache partitioning and leakage prevention, logout/revocation, privacy,
deployment, and failure evidence.

**Why:** public SSR supplies real SEO while keeping the high-risk private path on
the already selected ASP.NET Core BFF. This prevents a second identity stack and
the most dangerous class of SSR cache leak without blocking public MartiX sites.

**Alternatives rejected:** forwarding cookies through an unconstrained SSR proxy
creates an implicit second BFF. Caching personalized HTML without a complete
partition contract risks cross-user and cross-tenant disclosure. Forcing every
authenticated route through SSR adds complexity without SEO value.

### Generated API client boundary

Define one provider-independent Client Generation Contract, but use
language-specific generators: one TypeScript generator and output profile shared
by React and Vue, and one C# generator and output profile for Blazor. Do not
force a universal generator when its output is materially weaker in one
language. Both profiles consume the exact reviewed OpenAPI 3.1 artifact and pass
the same semantic conformance suite.

Generated code owns only wire DTOs and enums, API operations, route/query/header
and body serialization, response status and payload deserialization, and
cancellation. It contains no feature orchestration, UI state, authorization
decisions, notifications, localization, or business behavior. It is never
edited manually. Blazor does not share backend DTO assemblies and gains no
privileged in-process path; like React and Vue, it consumes only HTTP and the
published OpenAPI contract.

A small handwritten composition-based transport adapter surrounds the generated
client and owns runtime base URL, credentials according to the selected
Authentication Profile, antiforgery, correlation and tracing headers, canonical
Problem Details normalization, idempotency and ETag headers, safe retry policy,
and observability hooks. Feature query/use-case adapters consume that boundary;
UI components do not scatter raw generated calls or transport policy.

Select the concrete generators only after a reproducible conformance prototype
tests OpenAPI 3.1, required and nullable semantics, textual enums, identifiers,
`DateOnly`, `TimeOnly`, UTC `DateTimeOffset`, decimal money, Problem Details,
multiple success and error statuses, binary upload/download, streaming and SSE,
API major versions, idempotency headers, ETags, and cancellation. Evaluate
semantic correctness first, then deterministic output, maintained runtime
dependencies, extensibility without generated-file edits, diagnostics, artifact
size, performance, release cadence, license, and upgrade cost. Pin exact tool and
runtime versions in Release Evidence.

**Why:** C# and TypeScript have different idioms and generator ecosystems, while
the HTTP contract is the actual common boundary. A conformance contract permits
the best native output without allowing React, Vue, and Blazor to interpret the
API differently. The handwritten adapter isolates volatile generator APIs and
keeps security and operational policy reviewable.

**Alternatives rejected:** sharing backend contract assemblies with Blazor
couples one provider to implementation and makes its compatibility claim unlike
React and Vue. One universal generator selected before evidence risks poor or
dependency-heavy output. Hand-maintained DTO clients drift from authoritative
OpenAPI, while putting business behavior into generated partials or templates
makes regeneration unsafe.

#### Accepted TypeScript client-generation profile

The required throwaway prototype was executed on 2026-07-18 and its durable
method, exact versions, result matrix, limitations, and recommendations are
recorded in
[`../research/118-client-generation-conformance.md`](../research/118-client-generation-conformance.md).

Use exactly `openapi-typescript` 7.13.0 plus `openapi-fetch` 0.17.0 for the
initial Supported React and Vue client-generation profile. A small
repository-owned generation script uses the generator's documented Node API
transform hook to map OpenAPI `format: binary` schemas to browser `Blob` types;
that semantic override is explicit and covered by the conformance suite.
Multipart serialization, binary response parsing, and SSE stream framing remain
in the handwritten composition adapter rather than an edited generated file.

Compile generated declarations and adapters with the complete strict profile,
including `strict`, `exactOptionalPropertyTypes`,
`noUncheckedIndexedAccess`, and `skipLibCheck: false`. Pin generator, runtime,
and compiler versions in Release Evidence and re-run the executable conformance
corpus for every upgrade.

**Why:** this was the only evaluated TypeScript option that preserved exact
operation, status, header, body, required/optional/null, binary, cancellation,
and raw-stream semantics while compiling under the full MartiX strict profile.
Its small generated surface also keeps transport policy in the composition
boundary shared conceptually by all UI providers.

**Deferred alternative:** `@hey-api/openapi-ts` 0.99.0 generated attractive
first-class Fetch, binary, and SSE support, but its generated runtime failed
`exactOptionalPropertyTypes` checks. Reconsider it only when the complete
unchanged output passes the MartiX conformance suite; do not weaken TypeScript
settings or skip generated-code checking to adopt it.

#### Accepted C# client-generation profile

Keep the first-party .NET 10 `Microsoft.AspNetCore.OpenApi` support accepted in
ticket 110 as the sole producer of the authoritative OpenAPI 3.1 documents.
Use `Microsoft.Extensions.ApiDescription.Server` for build-time document
generation. NSwag must not generate the server document, add a parallel server
middleware, or become a second contract owner.

Use exactly NSwag.ConsoleCore 14.7.1 in its `openapi2csclient` role for the
initial Supported Blazor client profile. Generate a client interface, nullable
reference types, nullable optional properties, defined and C# `required`
required properties, `init` accessors, native records, `DateOnly`, `TimeOnly`,
`DateTimeOffset`, `System.Text.Json`, cancellation tokens, and wrapped responses
for status and header access. Do not generate a base URL, data annotations, JSON
helper methods, or default values. The output remains standalone source over
`HttpClient` and has no NSwag runtime dependency.

The generated client sits below the handwritten composition-based MartiX
transport adapter. The adapter maps generated exceptions and Problem Details
to the canonical UI failure contract and owns credentials, antiforgery,
correlation, idempotency, ETags, safe retries, and observability. Generated DTOs
and exceptions never become feature-domain contracts.

Exclude generated NSwag SSE operations from Supported consumption because the
evaluated output buffered the response as `string`. Implement SSE with a small
reviewed streaming `HttpClient` adapter and prove cancellation, framing,
reconnection, boundedness, and Problem Details behavior independently.

**Why:** the conformance prototype showed that tuned NSwag best preserved the
accepted required/optional/null, native temporal and numeric types, exact
statuses and errors, response headers, binary operations, and cancellation for
this Blazor UI role. It generated one dependency-free client source file and
therefore keeps the generator behind a small composition seam.

**Alternative rejected for this role:** Microsoft Kiota is an official and
capable SDK generator, but the evaluated profile weakened required/nullability
semantics, used Kiota-specific `Date` and `Time` types, mutable serialization
models, and a broader request-builder and runtime package stack. Microsoft
ownership does not compensate for lower fidelity to the accepted MartiX client
contract.

**Promotion and upgrade condition:** NSwag's evaluated `System.Text.Json` path
is experimental and reflection-oriented. Every generator upgrade must pass
generation, zero-warning compilation, deterministic diff review, and the full
semantic conformance suite. No trimming or Native AOT compatibility claim is
made until the real published client passes an executable test and its
serialization path is explicitly proven.

### Generated-source lifecycle

Commit the generated TypeScript or C# client source into the Generated Solution.
Update it only through an explicit repository command after the build-generated
OpenAPI change and its semantic contract diff have been reviewed. Ordinary UI
and solution builds consume the checked-in client and do not silently invoke a
generator or require its toolchain.

CI rebuilds every applicable OpenAPI major-version document, runs the exact
pinned generator and configuration into a clean temporary location, executes the
Client Generation Contract suite, and byte-for-byte or semantically compares
the deterministic output with the committed source. Drift, unstable ordering,
timestamps, machine-specific paths, line-ending instability, uncommitted output,
or an unreviewed generator/runtime upgrade fails the gate. Generated directories
carry clear ownership and edit warnings; review treats the OpenAPI semantic diff,
generator version/configuration, and conformance evidence as the primary change.

Provide stable cross-platform repository entry points equivalent to
`eng/update-api-client` and `eng/verify-api-client`; a PowerShell facade may be
supplied for Windows, but the operation and output cannot depend on one shell or
OS. Multi-major APIs generate isolated namespaces/modules so compatibility code
can coexist intentionally and be removed with the corresponding API lifecycle.

**Why:** checked-in output lets each UI build independently, gives humans and
agents the exact usable contract, avoids hidden build-order and toolchain costs,
and makes client changes reviewable. Clean regeneration retains the essential
anti-drift guarantee and proves that the committed artifact is reproducible.

**Alternatives rejected:** generation on every ordinary build couples UI builds
to backend artifacts and generator runtimes, increases latency, and permits a
tool upgrade to change code implicitly. Unverified committed output can drift.
Hand-editing generated output or suppressing drift failures makes regeneration
and contract authority unreliable.

### Product output and UI conformance fixture

Do not generate a fictitious business feature such as Todo, Weather Forecast,
Orders, `Acme`, or another placeholder into a production Generated Solution.
The selected provider output contains only the real application shell, routing,
layouts, runtime configuration, authentication seam, error and loading behavior,
localization readiness, design tokens, and infrastructure required by selected
Capabilities. A selected Capability may generate its genuine feature UI; it is
not replaced by a synthetic demonstration domain.

Maintain a repository-owned, explicitly non-product `MartiX.UI.Conformance`
reference application for each Supported provider. All variants exercise the
same provider-neutral acceptance scenarios, including forms, validation and
Problem Details, a bounded data presentation, binary upload/download, SSE,
authorization roles, localization, themes, accessibility, SEO profile behavior,
browser security, observability, and representative performance journeys. The
fixture consumes only the same public OpenAPI and UI Capability Contracts as a
real Generated Solution.

Keep this conformance application outside generated production solutions,
Capability Manifests, deployment artifacts, and product-domain guidance. It is
a release-test and comparative-measurement fixture, not a reusable domain
template. Documentation snippets are small and explicitly identified as
contract examples; agents must not copy their synthetic names or behavior into
product architecture.

**Why:** Supported provider claims need one stable, behaviorally rich workload,
but placeholder business code would pollute every new product, create deletion
work, distort vertical slices, and mislead inexpensive implementation agents.
Separating the fixture gives Blazor, React, and Vue comparable release evidence
without pretending that MartiX owns an example product domain.

**Alternatives rejected:** an empty test shell cannot prove forms, errors,
streaming, accessibility, SEO, or performance. Shipping the conformance domain
in every application confuses test infrastructure with business design. A
different ad hoc demo per provider would make cross-provider evidence
incomparable.

### Public origin and runtime UI configuration

The default Supported deployment exposes the selected UI, optional Admin UI,
business API, and interactive authentication endpoints through one public HTTPS
origin. Conventional public paths are `/`, `/admin`, `/api/v{major}`, `/auth`,
and `/ui-config.json`. A reverse proxy or gateway may route these paths to
independently built and scaled processes or containers; internal topology and
addresses are not public UI contracts.

React and Vue remain immutable static artifacts. The Blazor Interactive Server
profile is an ASP.NET Core UI process behind the same public origin. All three
providers consume one versioned public runtime-configuration schema. Deployment
or process startup supplies `/ui-config.json` without rebuilding the UI artifact.
The UI validates it before initialization and fails safely with an accessible,
diagnosable configuration state when it is absent, invalid, or incompatible.

Runtime UI configuration contains only intentionally public values such as a
relative API base path, deployment version, environment label, supported culture
metadata, public identity-discovery values, and selected UI Capability metadata.
It never contains secrets, server connection details, privileged feature rules,
or authorization decisions. Client-visible flags affect presentation only; the
server independently enforces every Capability and permission. Define explicit
cache and revalidation semantics so promotion or rollback cannot retain stale
environment configuration.

Cross-origin UI/API deployment is an advanced profile, not an accidental
configuration switch. It requires dedicated evidence for exact origin allowlists,
preflight behavior, credentialed requests, cookie SameSite and domain policy or
token handling, antiforgery, CSP and `connect-src`, redirects, logout, browser
privacy behavior, and local-development parity before it can be Supported.

**Why:** a same-origin public surface provides the safest and simplest cookie,
antiforgery, CSP, routing, and browser contract while retaining independent
internal deployment boundaries. Runtime public configuration permits promotion
of one immutable artifact through environments, adopting a strong FullStackHero
pattern without exposing secrets or making UI flags authoritative.

**Alternatives rejected:** compile-time environment values require rebuilding
and weaken artifact provenance. Publishing secrets in a static config file is
not secret management. Cross-origin by default adds browser security and support
complexity without a known boundary. Serving UI and API from one process is not
required and would erase provider-neutral deployment topology.

### React and Vue interactive authentication

`auth=none` remains a complete Supported React and Vue profile. When interactive
authentication is selected, the same-origin ASP.NET Core backend acts as the
browser security backend/BFF and issues only a `Secure`, `HttpOnly` session
cookie. Browser requests use same-origin credentials. Access tokens, refresh
tokens, provider secrets, and JavaScript-readable authentication cookies are
prohibited in `localStorage`, `sessionStorage`, IndexedDB, application state,
logs, or other browser-accessible persistence.

The backend owns provider redirects, callback validation, session creation and
renewal, and local plus provider-aware logout through versioned `/auth` routes.
It stores external OIDC tokens only server-side when the selected provider and
downstream access require them. A safe `/auth/session` representation exposes a
normalized Actor and only the presentation-relevant effective permissions and
session metadata; it never exposes raw provider tokens or makes the UI an
authorization authority. Local ASP.NET Core Identity and external OIDC share
this browser contract while retaining provider-specific server adapters.

Every state-changing cookie-authenticated request requires the accepted
antiforgery protocol, including login and logout where applicable. Return and
redirect targets use exact local validation or allowlists. Session expiry,
revocation, multi-tab behavior, back-button/cache behavior, failed callback,
access denial, account disablement, permission change, local logout, and
provider logout have accessible browser scenarios. Bearer authentication for
machine, mobile, or external API clients is a separate Authentication Profile
and does not weaken the interactive browser posture.

**Why:** the browser receives a hardened session handle rather than credentials
valuable to script injection. The provider-independent session surface keeps
React and Vue stable across local and external identity choices, while server
authorization remains authoritative.

**Alternatives rejected:** browser-managed access and refresh tokens expand XSS
impact and duplicate secure token lifecycle logic. Provider SDK state leaking
through UI features couples the application to one identity system. Treating a
bearer API profile as the default browser flow ignores the stronger same-origin
cookie/BFF topology already selected.

### Blazor Interactive Server authentication

The initial Blazor Interactive Server matrix Supports `auth=none` and external
OIDC/OAuth or Microsoft Entra profiles that issue an audience-bound access token
for the API. The Blazor UI host is a confidential client and BFF: the browser
receives only its hardened session cookie, while access and refresh tokens remain
server-side. A scoped, application-scope-aware outbound handler obtains or
renews the current user's delegated access token and attaches it to the generated
C# client's API requests. Components, rendered markup, browser storage, logs,
and client-side code never receive those tokens.

Treat circuit identity as mutable state rather than a copy of the initial HTTP
request. The profile uses a revalidating `AuthenticationStateProvider`, does not
depend on ambient `HttpContext` during interactive rendering, and defines bounded
behavior for token expiry and refresh, security-stamp or account invalidation,
permission change, circuit reconnect, multi-tab sessions, UI/API deployment,
local and provider logout, revocation, downstream `401`/`403`, and unavailable
identity infrastructure. Each behavior requires integration and browser evidence.

Local ASP.NET Core Identity without a standards-based token-issuing provider is
Deferred specifically for Blazor Interactive Server. Built-in proprietary
Identity bearer tokens are not treated as a general OAuth/OIDC authorization
server, and sharing a Data Protection cookie between processes proves browser
SSO but does not by itself define safe, renewable circuit-to-API delegation.
Future support requires either an attested standards-based authorization-server
Capability Provider or a separately reviewed topology and security prototype.
Local Identity remains Supported for the React/Vue same-origin cookie profile.

**Why:** Interactive Server adds a trusted server hop and a long-lived circuit;
using standard delegated tokens follows that topology without exposing them to
the browser. Narrowing the initial matrix is preferable to inventing a
security-critical cookie forwarding or token exchange protocol merely to claim
every provider combination.

**Alternatives rejected:** reading or forwarding an initial browser cookie or
`HttpContext` throughout a circuit can become stale and is not a complete token
renewal design. Sending access tokens to components or browser storage destroys
the BFF protection. Advertising proprietary Identity bearer tokens as an
enterprise authorization server exceeds their intended scope. Rejecting Blazor
authentication entirely would discard a well-supported external OIDC/Entra BFF
profile.

### UI Design Contract

Define one versioned MartiX UI Design Contract shared semantically across all UI
providers, not a cross-framework component library. It contains semantic CSS
custom-property tokens for color roles, typography, spacing, sizing, radii,
elevation, layering, breakpoints, and motion; required interaction states;
component behavior specifications; content and localization rules; and common
accessibility and browser conformance scenarios. Token names describe purpose,
such as a danger surface or focus indicator, rather than a particular palette
value.

The contract explicitly covers keyboard operation, focus visibility and return,
screen-reader names and relationships, high contrast, zoom and text reflow,
reduced motion, RTL, pointer and touch targets, responsive layouts, disabled
versus read-only semantics, and loading, empty, validation, denied, error,
offline, reconnecting, and stale-data states. WCAG 2.2 AA conformance depends on
rendered behavior and evidence, not on a component-library marketing claim.

React, Vue, and Blazor implement this contract idiomatically with their selected
provider primitives. Do not create shared Razor/JS component source, `IButton`
style abstractions, a universal component API, or generated wrappers whose only
purpose is to make unlike frameworks look identical. Shared visual artifacts
remain inside the one selected UI project initially. Extract a separately
versioned MartiX design-system package only after multiple real applications
need independent consumption and its compatibility lifecycle is defined.

**Why:** tokens and behavior provide consistent brand, usability, and measurable
quality while leaving each framework free to use its strongest composition and
accessibility model. This is a deeper, more stable interface than shared widget
source and preserves the minimum-project topology.

**Alternatives rejected:** copying styles without semantic tokens makes themes
and accessibility states drift. A cross-framework wrapper collapses to the
lowest common denominator and creates a proprietary UI framework. A design
system package generated before multiple consumers exist adds release and
migration cost without a demonstrated boundary.

### Fluent 2 provider implementations

Use Microsoft Fluent 2 as the default MartiX design language. This is a deliberate
knowledge-reuse choice for the owner's Microsoft 365 and SharePoint Online work,
not a claim that one component package has equivalent support in every UI
framework. The MartiX UI Design Contract remains the stable authority above
provider packages and supplies any application-specific semantic tokens and
conformance behavior.

The React provider uses Fluent UI React v9 (`@fluentui/react-components`) and its
supported Fluent 2 theming/styling model. New applications do not mix v8 and v9;
v8 knowledge and migration may matter to existing Microsoft 365 integrations but
is not new MartiX source. Import only used components and verify tree shaking,
selected SPA/SSR/prerender behavior, CSP, accessibility, hydration where
applicable, and bundle budgets.

The Blazor provider prefers `Microsoft.FluentUI.AspNetCore.Components`, but only
an exact stable major and patch that has passed the MartiX Blazor render,
accessibility, JS-interop, reconnect, trimming, browser, and performance profile.
Preview and release-candidate packages cannot enter a Supported release. As of
this decision, v4.14 supports .NET 10 while v5 is still a release candidate with
a planned end of v4 maintenance after v5; therefore promotion must be evidence-
based rather than automatically following the newest major. Residence in the
Microsoft GitHub organization does not substitute for a support SLA or MartiX
release evidence.

Vue has no equivalent first-class Fluent UI Vue library. Its Supported default
uses idiomatic headless accessibility primitives, initially evaluating Reka UI,
and a thin MartiX-owned Fluent 2 visual layer over the Design Contract. Microsoft
Fluent UI Web Components remain an Evaluation Workspace candidate, not a
Supported default, until current Vite/Vue typing, custom events, forms, Shadow
DOM styling, theming, accessibility, CSP, bundle size, maintenance, and browser
evidence demonstrates an advantage. Do not follow the obsolete Vue CLI setup in
the old integration guidance.

Across providers, use native semantic HTML first. Component packages supply
complex interaction behavior, but WCAG 2.2 AA remains MartiX's tested claim and
is never inherited from a vendor statement. Add wrappers only when they enforce
MartiX policy, compose a deeper feature, or isolate demonstrated API volatility;
do not wrap every vendor component mechanically.

**Why:** this maximizes transferable Fluent knowledge and Microsoft ecosystem
alignment while acknowledging unequal framework support. The stable Design
Contract prevents the Vue fallback or a Blazor package transition from changing
application semantics and makes provider evolution testable.

**Alternatives rejected:** mandating Fluent Web Components everywhere discards
the strongest React-native implementation and can impose Shadow DOM integration
costs. Treating Fluent UI Blazor previews as production dependencies violates
the release-quality bar. Abandoning Fluent solely because Vue lacks a first-
class package loses valuable knowledge reuse; building every complex widget
ourselves creates accessibility and maintenance risk.

### Semantic CSS authoring

MartiX-authored UI uses semantic markup classes whose presentation is defined in
external CSS, following the separation illustrated by CSS Zen Garden. Tailwind
and utility-class-first styling are prohibited from the Supported baseline, as
are application-authored CSS-in-JS, arbitrary inline `style` values, and long
presentational class lists embedded in Razor, JSX, or Vue templates. Markup
describes roles such as an order summary, action bar, validation summary, or
empty state rather than spelling out color, spacing, display, breakpoint, or
typography decisions.

Feature-owned styles use predictable semantic names, MartiX Fluent tokens,
cascade layers, logical properties, and provider-native isolation: external CSS
or CSS Modules for React, CSS isolation for Blazor, and scoped external style
blocks or imported CSS for Vue. Prefer actual element and ARIA state, and
reviewed `data-*` state hooks where CSS needs them, over duplicating behavioral
truth in styling-only modifier classes. Do not reach through vendor internals
with brittle generated-class or Shadow DOM selectors.

Default to one semantic class on the root of a cohesive component or feature
region, then style its meaningful native descendants through scoped element,
direct-child, ARIA, and state selectors. Do not assign a class to `header`, `h2`,
`p`, `ul`, `table`, or every wrapper merely because it might need styling. Add a
named descendant class only when the element has an independent semantic role,
multiple same-tag roles would be ambiguous, the part is reused or composed, a
stable test or integration hook is genuinely required, or relying on DOM shape
would make the contract fragile.

Keep descendant reach deliberate. Prefer selectors such as
`.order-summary > header` and `.order-summary > header > h2`, or low-specificity
equivalents using `:where(...)`, over broad selectors that accidentally restyle
nested components. Native CSS nesting may improve locality when supported by the
declared browser baseline, but it must compile to understandable CSS and must not
hide excessive structural coupling. Component markup remains semantic and valid
HTML; styling convenience never justifies invented elements.

Lint and review prohibit raw palette, spacing, typography, motion, and z-index
values outside their token definitions where reliable enforcement is possible.
Exceptions such as computed geometry or user-authored content require a narrow
documented reason. Tailwind may be evaluated only as an application-owned
deviation outside the Supported profile; it is not generated, documented as the
normal path, or transitively required by a component provider.

**Why:** clean semantic markup keeps content and behavior readable, allows a
theme or responsive redesign to change CSS without rewriting component trees,
reduces inconsistent output from implementation agents, and aligns theme
readiness with composition rather than scattered presentation instructions.
The additional root-scope convention takes inspiration from classless CSS and
BareCSS: native HTML already carries meaning, so classes should identify real
component concepts rather than annotate every node.

**Alternatives rejected:** Tailwind and similar utility soup couple layout and
visual decisions directly to markup. Application CSS-in-JS embeds presentation
in TypeScript and adds another runtime or build abstraction. One global
unstructured stylesheet risks collisions, so styles remain feature-owned and
layered without abandoning semantic classes. BareCSS itself is not adopted: its
unmaintained framework, non-standard custom elements, and styling utility
attributes conflict with valid semantic HTML, current accessibility evidence,
and the prohibition on presentation instructions in markup.

Fluent UI React's internal Griffel implementation is an explicit contained
vendor exception because the library's accessible components, Fluent 2 behavior,
Microsoft ecosystem alignment, and transferable knowledge provide material
value. MartiX-authored React code does not call Griffel `makeStyles` or adopt
CSS-in-JS as an application pattern. Feature roots apply semantic classes and
external CSS; Fluent internals are customized through supported component
properties and Fluent/MartiX tokens. Never select generated Griffel class names.
If a required customization cannot be expressed without substantial application
CSS-in-JS or brittle internal selectors, use a native or headless primitive with
semantic external CSS instead.

**Why:** this accepts a valuable dependency's encapsulated implementation without
allowing its internal styling technique to spread into application architecture.
It preserves Fluent UI React and the owner's Microsoft ecosystem knowledge while
keeping MartiX source consistent with the accepted CSS Zen Garden principle.

### UI test and browser quality profile

Every Full Stack Generated Solution includes UI verification; it is not an
optional production-readiness add-on. Do not create another .NET test project.
React and Vue keep fast feature/component tests in the selected UI package using
Vitest and the appropriate Testing Library. Tests query and exercise accessible
roles, names, labels, text, and public state rather than implementation classes,
hook internals, or snapshots of complete component trees.

Blazor component tests use bUnit with TUnit inside the existing
`tests/<name>.Tests` project. The same project uses `Microsoft.Playwright` as a
library under TUnit for provider-neutral black-box journeys against the real
deployed UI and API artifact. A shared scenario contract covers anonymous and
selected Authentication Profiles, Application and Admin roles, authorization
denial, validation and Problem Details, loading/empty/error/offline or reconnect
states, culture, theme, keyboard operation, session expiry/logout, responsive
layouts, and critical business journeys. Provider-specific behavior adds narrow
tests without forking the common user contract.

Run an attested Deque axe-core integration over representative states, but never
claim WCAG 2.2 AA from automated scans alone. Release evidence also includes
documented keyboard-only testing, focus order and restoration, zoom/reflow,
high-contrast and reduced-motion checks, and screen-reader verification for the
declared browser/assistive-technology profile.

Chromium runs on every applicable pull request. Firefox, WebKit, and Microsoft
Edge run nightly and before a Supported release, with additional risk-based PR
lanes for provider or browser-sensitive changes. Each test has an isolated
BrowserContext and uniquely owned data. Use web-first assertions and bounded
condition waits; fixed sleeps, order dependence, shared mutable accounts,
quarantine, and retry-to-green are invalid. Failures retain sanitized traces,
screenshots, DOM snapshots, console/page errors, and relevant network diagnostics.

Use targeted visual comparisons only for stable critical layouts, responsive
breakpoints, Fluent theme regressions, and high-value components. They supplement
semantic and behavior assertions rather than replacing them, use pinned fonts,
browser and rendering environment, and require reviewed baseline changes.

**Why:** provider-native component tests keep TDD fast, while one black-box suite
proves equivalent public behavior across Blazor, React, and Vue without another
project. Real browser engines and accessibility evidence catch failures invisible
to DOM emulators or vendor claims.

**Alternatives rejected:** one JavaScript E2E package per provider duplicates
journeys and adds Node tooling to the Blazor project. A separate browser-test
project violates the minimum-project objective without an isolation force.
End-to-end-only testing is slow and diagnostically weak; component-only testing
cannot prove routing, cookies, CSP, API integration, rendering, or deployment.
Automated axe scans and broad visual snapshots alone are incomplete quality
evidence.

### Feature-first UI source organization

Organize every provider by user-facing workflow slices rather than global
technical layers. The stable conceptual areas are a thin `App` composition root
and shell, `Features`, explicitly separated `Administration` features, a narrow
cross-cutting `Platform` adapter area, and `Ui` Design Contract implementation.
Provider idioms may change filenames and casing, but not these ownership rules.

A feature owns its routes, orchestration, query definitions, forms, presentation
components, semantic external CSS, fixtures, and fast tests as closely as its
toolchain permits. A feature models a cohesive user capability or journey, not
one HTTP endpoint, React hook, Razor component, Vue composable, or backend class.
It may intentionally compose several API operations and Business Modules. Do not
mirror the backend project tree mechanically or require a one-to-one UI-feature
to Business-Module mapping.

`App` owns only startup composition, provider registration, routing composition,
top-level layouts, and global boundaries. `Platform` owns generated and wrapped
API transport, authentication/session integration, runtime configuration,
Problem Details normalization, observability, and similar genuine cross-cutting
adapters. `Ui` owns tokens, layouts, and provider-specific primitives that
implement the Design Contract. The Admin role has its own feature namespace and
route composition even inside the same project and artifact.

Do not generate global dumping grounds named `Shared`, `Common`, `Helpers`,
`Services`, `Models`, `Hooks`, or `Components`. Keep behavior local until proven
identical semantics, ownership, lifecycle, and change reasons justify extraction
to `Platform`, `Ui`, or another explicitly named cohesive concept. Mere syntactic
similarity or a second occurrence is not sufficient.

**Why:** frontend vertical slices keep a user change and its tests local, expose
real coupling, and give implementation agents clear ownership. Allowing a slice
to compose backend capabilities reflects user workflows rather than leaking
server deployment boundaries into information architecture.

**Alternatives rejected:** technical layer folders spread every feature across
the project and become ownerless registries. Mechanical mirroring of Business
Modules couples UI navigation to backend organization. A universal `Shared`
folder hides dependencies and accumulates unrelated code.

### Localization readiness

Every Full Stack generation requires an explicit BCP 47 `defaultCulture` and a
complete resource set for that culture. A second translated culture is not
required, but user-visible text cannot be hard-coded in Razor, JSX, Vue
templates, TypeScript, C#, CSS generated content, or transport adapters. Feature
slices own semantic message keys and resources for their pages, components,
forms, validation, loading/empty/error/denied/offline states, notifications,
document titles, accessible names and descriptions, tooltips, and equivalent
user communication. Shared terms move only to a deliberately owned common UI
resource after semantic identity is proven.

Use stable semantic keys such as `orders.summary.title`, not English source text
as an identifier. Provider-native localization runtimes and native culture/Intl
formatting may differ, but all implement explicit culture negotiation, fallback,
missing-key diagnostics, interpolation encoding, plural and select semantics,
and formatting for dates, times, numbers and currencies. Supported cultures and
the selected culture source are public runtime configuration. A missing key,
invalid resource, unsafe interpolation, or disagreement between declared and
shipped cultures fails applicable CI and release gates.

HTTP routes, JSON property names, identifiers, enum wire values, permission and
error codes, telemetry names, idempotency keys, ETags, and other machine
contracts remain culture-invariant. The UI maps known canonical
`ProblemDetails.code` values to feature-owned localized messages; a safe server
`detail` is a diagnostic fallback for unknown codes, not the translation source
of truth. Never branch business or authorization behavior on browser culture.

Every provider passes pseudolocalization, text expansion and clipping, zoom and
reflow, culture-specific formatting, fallback, missing-resource, and at least one
RTL layout profile. Localized selectors are prohibited in browser tests; locate
by role and stable contract with locale-specific accessible names asserted where
that is the behavior under test.

**Why:** resource ownership from the first string prevents an expensive later
extraction and includes accessibility text that is often forgotten. Requiring
only one complete default resource keeps the initial burden bounded while tests
prove that additional cultures do not require architectural change.

**Alternatives rejected:** hard-coded text until a second language appears makes
localization a rewrite and misses nonvisual content. English text as the key
couples identifiers to copy editing. Localizing API identifiers or trusting
server details as UI copy breaks contract stability and provider independence.

### Theme readiness and branding boundary

Every provider ships attested `light` and `dark` themes plus a `system` selection
that follows the user's platform preference. `system` is the generated default
unless explicit product requirements choose otherwise. Apply the effective theme
before first meaningful paint to avoid a wrong-theme flash, preserve focus and
state when switching, and allow a non-sensitive user preference to persist
locally. High-contrast and `forced-colors` behavior are mandatory accessibility
profiles rather than cosmetic theme choices.

All themes implement MartiX/Fluent semantic tokens. Components consume semantic
roles and never branch behavior on raw color or a theme name. Runtime UI
configuration may select the default and the subset of prebuilt, versioned,
release-tested themes; it cannot inject arbitrary CSS, HTML, external stylesheet
or font URLs, script, or an unbounded token dictionary. Theme artifacts follow
the same immutable promotion and CSP rules as the UI.

Tenant or customer branding is a future separate Capability, not hidden theme
configuration. Before promotion it must define an allowlist and schema for safe
semantic tokens, contrast and interaction-state validation, font and asset
provenance, cache and invalidation, CSP, preview and rollback, tenant isolation,
and behavior when branding is invalid. Branding never changes authorization,
feature enforcement, semantic status meaning, or accessibility requirements.

**Why:** prebuilt light/dark/system support makes future theming real and tested
without accepting CSS injection or unbounded combinations. Separating tenant
branding preserves a small default and creates the security and quality boundary
needed when dynamic visual input becomes a real requirement.

**Alternatives rejected:** a single light theme postpones structural theme work.
Arbitrary runtime CSS or tokens undermine CSP, accessibility, reproducibility,
and release evidence. Treating forced colors as another branded palette ignores
its user-agent accessibility semantics.

### UI performance evidence

All Supported UI providers target the current stable Core Web Vitals "good"
thresholds at p75, segmented by the declared mobile and desktop profiles: LCP no
greater than 2.5 seconds, INP no greater than 200 milliseconds, and CLS no
greater than 0.1. Treat those values as versioned external guidance and review
them when the stable metric set changes. Measure cold load, warm navigation,
representative interaction, constrained network and CPU, dependency latency,
connection loss and recovery, and the selected Authentication Profile against a
pinned reference environment. A real product additionally owns workload-specific
UI SLOs.

React and Vue evidence records compressed initial and lazy route JavaScript,
CSS, font and asset payloads, request counts, load and execution time, long
tasks, memory, route transitions, query waterfalls, and Fluent component tree
shaking. Generated routes are lazy by default unless measurement shows eager
loading improves a critical journey. Do not optimize by removing accessibility,
security, error, or localization behavior.

Blazor Interactive Server evidence separately records time to static content and
interactive circuit, circuit connection and reconnect, render-diff duration and
size, SignalR traffic, event latency, active/connected/disconnected circuits,
per-circuit and process memory under representative multi-tab concurrency,
bounded disconnected-circuit retention, cleanup after disconnect, and behavior
through UI/API rolling deployment. Future standalone WebAssembly evidence owns
compressed boot payload, download/compile/start, time to interaction, browser
memory, trimming, caching, and separate IL versus WebAssembly AOT artifacts.

Do not invent universal JavaScript bundle, circuit-memory, SignalR-byte, or WASM
payload numbers before measurement. Generate the provider variant of the
repository-owned `MartiX.UI.Conformance` application, retain raw repeated
results, establish reviewed provider-specific baselines and practical absolute
budgets, and then apply the previously accepted regression thresholds and
reliability zero-tolerance rules. Budget changes are prospective,
evidence-backed ADRs; historical results are immutable.

**Why:** users can share loading, responsiveness, and stability expectations,
but React/Vue bundles, stateful server circuits, and future WebAssembly payloads
have different cost models. Measured provider budgets make regressions actionable
without pretending an empty template can promise arbitrary application latency.

**Alternatives rejected:** one common bundle-size number is meaningless across
execution models. No absolute user-experience target permits a technically small
but visibly slow UI. Fixed budgets chosen without a baseline create arbitrary
gates, while field metrics without reproducible lab evidence are too slow and
noisy for pre-release diagnosis.

### UI observability and reporting boundary

Every provider implements vendor-neutral route and feature error boundaries,
safe localized accessible fallbacks, stable feature/operation identifiers, UI
release and public environment context, API Problem Details trace correlation,
and a short public support identifier. Stack traces, provider internals, tokens,
cookies, secrets, form values, request or response bodies, dynamic route IDs,
personal query values, and arbitrary exception messages are never rendered or
reported by default.

Composition-based hooks equivalent to a UI error reporter, performance reporter,
and navigation observer normalize safe events, Core Web Vitals, and Blazor
circuit signals without depending on Application Insights, Sentry, or another
vendor. With no exporter selected, capture and accessible recovery still work,
support correlation remains available, tests verify the contract, and no remote
telemetry leaves the browser or UI server. Reporter failure is always isolated
from application behavior.

A remote RUM, error, or performance exporter is an explicit Capability Provider
with classification, consent or lawful-basis, sampling, retention, regional and
endpoint policy, CSP, offline buffering bounds, redaction tests, cost limits, and
failure behavior. Source maps are retained as controlled release artifacts and
are not publicly exposed unless a reviewed deployment profile protects them.
Browser console errors and unhandled promise rejections, Blazor circuit-fatal
exceptions, missing trace correlation, exporter leaks, and error-boundary loops
fail applicable component, browser, and release gates.

**Why:** every application needs diagnosable and humane failure behavior, but
remote telemetry is a privacy, cost, and vendor decision. A stable hook preserves
future integration without silently collecting data or coupling features to one
observability product.

**Alternatives rejected:** console logging alone is neither structured nor safe.
Mandatory vendor telemetry violates optional-provider and privacy boundaries.
Reporting entire URLs, payloads, or exceptions improves convenience at the cost
of data leakage. Public source maps simplify attacker reconnaissance and are not
the default diagnostic delivery mechanism.

### PWA and offline boundary

The Full Stack baseline provides accessible, localized and tested states for
browser offline detection, request timeout, unavailable API or identity service,
stale query data, safe retry, and Blazor circuit disconnect/reconnect. Retry is
operation-aware: safe reads may retry under bounded policy, and a side-effecting
operation retries only with its accepted idempotency contract. TanStack Query
memory state and HTTP caching are not described as offline persistence.

Do not generate or register a service worker, web app manifest, install prompt,
background synchronization, push permission, or persistent offline data cache by
default. PWA/offline is a future explicit Capability with separate React, Vue,
and standalone Blazor WebAssembly profiles. Blazor Interactive Server is never
claimed as an offline runtime; it owns reconnect and recovery only.

Before promotion, a PWA profile defines asset and API cache allowlists, version
activation and rollback, authenticated-user cache isolation and logout purge,
sensitive local-data classification and encryption limits, quota and eviction,
offline mutation ownership, conflict resolution, idempotency and replay, sync
status and user control, browser support, installation, observability, and
multi-version deployment behavior. A service worker must not cache authenticated
API responses or navigation indiscriminately.

**Why:** graceful network failure is universal UI quality, while offline
correctness is a distributed state and security capability. Keeping the seam
without enabling a worker avoids stale deployments, cross-user leakage, and
unreviewed mutation replay in ordinary applications.

**Alternatives rejected:** a default cache-first service worker hides complex
data lifetime and update behavior. Calling query caching "offline support"
overstates durability. Declaring Interactive Server offline-capable confuses a
reconnectable server session with client execution.

### Business real-time delivery

Separate Blazor Interactive Server's framework SignalR circuit from the optional
Business Real-Time Delivery Capability. Selecting Blazor does not select or
expose business SignalR hubs, and components never consume Domain or Integration
Events through the circuit as an in-process shortcut. Every provider retains the
HTTP/OpenAPI query boundary.

When Business Real-Time Delivery is selected, prefer SSE for one-way
notifications, progress hints, and query invalidation. Select SignalR only for
demonstrated bidirectional commands, groups, presence, negotiated invocation, or
backplane requirements. Provider-specific adapters implement one UI connection,
authentication, lifecycle, version, and observability contract without exposing
transport objects throughout feature components.

A real-time message is a transient hint carrying the minimum stable identity and
version needed to invalidate or refresh named authoritative API queries. It is
not the only copy of business state and does not mutate the UI cache as if it
were a durable event log unless a separately designed protocol proves ordering,
replay, and conflict semantics. Reconnect re-establishes subscriptions and
performs bounded catch-up through authoritative queries. Tests cover loss,
duplicates, reordering, reconnect, expiry, logout, deployment-version mismatch,
multi-tab behavior, backpressure, and dependency failure.

**Why:** this preserves one source of truth and equivalent provider behavior
while still supporting efficient freshness. It also prevents Blazor's internal
transport from becoming a privileged business integration path unavailable to
React and Vue.

**Alternatives rejected:** enabling SignalR for every Full Stack solution adds
connection and scale cost without a use case. Sending complete mutable business
state as transient messages creates an unacknowledged replication protocol.
Treating the Blazor circuit as reliable business delivery confuses UI rendering
with durable application communication.

### Forms and validation UX

Use native HTML form, label, fieldset, legend, control, button, and submit
semantics first. Provider abstractions must preserve keyboard submission,
autofill, password-manager, browser validation, accessible naming and
description, disabled versus read-only, and progressive request-state behavior.
Use native input types and safe declarative constraints for immediate structural
feedback. Do not replace semantic controls with clickable generic elements.

The server remains authoritative for every transport rule, Application
invariant, permission, concurrency precondition, and current business-state
decision. Small deterministic constraints may be repeated client-side for UX
when their shared contract examples prove equivalent, but asynchronous
uniqueness, eligibility, authorization, and state-dependent validation are never
claimed from the client alone. OpenAPI constraints may inform generation, but
generated validation does not supersede a server response.

Map canonical `ProblemDetails.errors[].target` and stable codes to feature-owned
localized field messages and an accessible validation summary. Preserve safe
entered values, associate messages programmatically, announce changes without
noise, and move focus according to the documented summary/first-error rule.
Binding and validation failures, business `409`, stale/missing concurrency
preconditions `412`/`428`, authentication expiry, rate limits, and unexpected
failures have distinct recovery UX rather than one generic toast.

Submitting state prevents unintended duplicate activation while retaining an
accessible status and cancellation behavior. Side-effecting operations supply
the accepted idempotency key where required and retain it for a semantic retry
of the same operation/payload rather than creating a duplicate. Client retry
policy never blindly repeats unsafe form submissions.

React Hook Form, Zod or another runtime schema library, VeeValidate, and similar
form frameworks are absent by default. Blazor uses its standard form model where
it satisfies the contract. Promote a provider-specific form/schema Capability
only when demonstrated complex, dynamic, high-volume, or cross-step form needs
outweigh its second validation model, dependency, bundle, and upgrade costs.

**Why:** native forms provide the strongest interoperable accessibility and
browser behavior with the least code, while server authority prevents drift and
security gaps. Optional escalation preserves a path for genuinely complex form
products without burdening every Generated Solution.

**Alternatives rejected:** making a client schema authoritative duplicates
business policy and becomes stale. Adding a form framework universally expands
the baseline for simple forms. Showing every failure as field validation or a
toast loses HTTP semantics, recovery guidance, and accessibility.

### UI security and dependency profile

Every Supported UI artifact self-hosts its scripts, styles, fonts, icons, source
assets, and runtime dependencies. Runtime CDN dependencies and unpinned remote
imports are prohibited. The generated CSP avoids `unsafe-eval` and does not grant
general `unsafe-inline`; use a narrowly generated nonce or hash only for a
minimal reviewed bootstrap that cannot be externalized. Explicitly constrain at
least `default-src`, `script-src`, `style-src`, `connect-src`, `img-src`,
`font-src`, `frame-src`, `frame-ancestors`, `object-src`, `base-uri`, and
`form-action` according to the selected profile. Browser gates fail on unexpected
CSP reports or console violations.

React `dangerouslySetInnerHTML`, Vue `v-html`, Blazor `MarkupString`, direct DOM
HTML sinks, dynamically constructed script/style, and equivalent bypasses are
prohibited for untrusted or merely database-stored input. Rich text/HTML is a
separate Capability defining its source format, sanitization owner and version,
element/attribute/URL allowlist, re-sanitization migration, rendering boundary,
CSP, export, and adversarial corpus. External links and redirects validate
schemes and destinations and apply safe opener/referrer behavior.

Authentication and sensitive responses use `no-store`; public caching is
explicit. Secrets, provider credentials, internal addresses, private feature
rules, source paths, and sensitive diagnostics never enter bundles, public source
maps, runtime UI configuration, browser storage, or error output. Selected
packages cannot broaden CSP merely for convenience.

Pin all direct and transitive dependency resolutions with committed lockfiles.
Supported release gates include restore integrity, vulnerability and malicious-
package review, license policy, provenance where available, SBOM, abandoned-
dependency signals, exact Node/.NET/browser toolchain evidence, and controlled
upgrade diffs. A clean vulnerability scan is necessary but not sufficient;
runtime behavior and supply-chain ownership remain reviewed.

Blazor Interactive Server additionally bounds incoming hub/message and input
sizes, queued renders and events, concurrent expensive operations, circuit count
and disconnected retention, per-circuit state, cancellation, and cleanup. It
does not retain secrets or large sensitive object graphs in component state and
uses safe circuit-fatal error recovery without exposing server detail.

**Why:** self-contained immutable artifacts, strict browser policy, safe render
sinks, and attested dependencies reduce both XSS and supply-chain exposure.
Blazor's server execution requires resource-exhaustion controls beyond ordinary
SPA bundle security.

**Alternatives rejected:** trusting framework escaping while allowing explicit
raw-HTML sinks leaves the main bypass ungoverned. Runtime CDNs weaken provenance,
availability, and CSP. Broad inline/eval exceptions turn CSP into documentation.
Treating package audit output as complete assurance ignores malicious, abandoned,
or behaviorally unsuitable dependencies.

### Baseline data presentation and advanced widgets

The Full Stack baseline includes an accessible semantic table or basic selected
Fluent DataGrid pattern sufficient for ordinary enterprise list and CRUD
workflows. It consumes endpoint-specific allowlisted server pagination, filter,
and sort contracts; it never loads an unbounded collection to simulate database
querying in the browser. Provide localized headings and state, loading/empty/
error/partial states, sort and selection announcements, accessible row actions,
keyboard behavior appropriate to table versus interactive grid semantics, and a
usable narrow-viewport representation.

Do not apply virtualization by default. Introduce it only after measured DOM,
render, memory, and interaction cost justifies the added focus, screen-reader,
dynamic-height, test, and scrolling complexity. A table must not adopt grid ARIA
merely for styling; its interaction model determines its semantics.

Advanced Data Grid, Charts/Data Visualization, Scheduler/Calendar, Rich Text
Editor, File Manager, Diagram/Workflow Designer, Map/GIS, Pivot/Reporting, and
similar suites are separate explicit Capabilities. A provider such as Telerik/
Kendo, Syncfusion, or another commercial/open-source library is selected only
with exact UI-provider coverage, license and cost, support model, accessibility,
localization, Fluent theme integration, server data contract, CSP and export
security, payload/performance budget, upgrade cadence, data portability, and exit
evidence. Do not require equivalent provider support that has not actually been
attested.

**Why:** a bounded accessible data list is a common enterprise starting need;
large widget suites are product-specific dependencies with significant license,
bundle, security, and lifecycle consequences. Explicit capabilities keep the
baseline useful without making every application fund or maintain them.

**Alternatives rejected:** including a full commercial suite by default adds
unused packages and contractual lock-in. Building complex schedulers, editors,
charts, or grids in-house without a product force recreates specialized
accessibility and interaction infrastructure. Client-side processing of
unbounded datasets violates performance and data-ownership boundaries.

### Developer Node version manager boundary

Do not configure, require, or detect Volta in the Generated Solution, template,
bootstrap commands, or CI. The owner currently uses Volta manually to switch
Node.js versions on a development workstation; that is a personal environment
choice rather than part of the MartiX UI architecture or reproducibility
contract. Repository manifests declare the required Node.js compatibility, and
the selected package-manager contract and CI setup enforce their own exact
attested versions independently of any developer version manager.

**Why:** local use of Volta is useful but has no architectural relationship to
CI or to consumers of the template. Keeping it outside the repository avoids
imposing a personal tool, duplicating version authority, or confusing future
implementation agents into adding unsupported Volta bootstrap behavior.

**Alternatives rejected:** committing a `volta` section merely because the
owner uses Volta locally would convert an incidental workstation preference
into a project requirement. Making CI depend on Volta would add an unnecessary
tooling layer and couple reproducibility to a version manager the solution does
not otherwise need.

### JavaScript package-manager contract

Use pnpm as the only Supported JavaScript package manager for React and Vue UI
providers and for any repository-owned JavaScript tooling. Pin one exact,
release-attested pnpm version in the root `package.json` `packageManager` field
and commit `pnpm-lock.yaml` as the sole JavaScript dependency lockfile. Do not
generate or accept `package-lock.json`, `npm-shrinkwrap.json`, `yarn.lock`, or
another package-manager lockfile. The repository's stable build commands and CI
install that same pnpm version explicitly and restore with the frozen lockfile;
ordinary build and test commands must not mutate dependency resolution.

The required Node.js line is declared by repository manifests and pinned to an
exact release-attested version in CI. A developer may satisfy that contract with
Volta or another local version manager, but no such manager becomes part of the
solution contract. An intentional toolchain upgrade updates Node.js, pnpm,
manifest metadata, lockfile, CI setup, evidence, and upgrade notes together.

**Why:** a single package manager and lockfile remove ambiguous resolution,
scripts, caches, and agent instructions. An exact pnpm version plus frozen
restore gives developers, implementation agents, CI, and release builds the
same dependency graph without coupling them to a particular workstation
manager. pnpm also provides strict dependency isolation, efficient shared
storage, workspace support, and current supply-chain controls suitable for the
Supported React and Vue profiles.

**Alternatives rejected:** supporting npm and pnpm simultaneously doubles
bootstrap paths and allows incompatible lockfiles. Relying on whichever pnpm is
globally installed makes the lockfile and install behavior sensitive to the
machine. Using Volta or bundled Corepack as the sole version authority couples
the repository to optional or changing bootstrap tooling. Floating major or
minor package-manager versions makes an otherwise unchanged restore
non-reproducible.

### Strict pnpm supply-chain baseline

Commit a strict `pnpm-workspace.yaml` security profile for every generated React
or Vue solution. The baseline explicitly configures:

```yaml
minimumReleaseAge: 4320
minimumReleaseAgeStrict: true
minimumReleaseAgeIgnoreMissingTime: false

trustPolicy: no-downgrade
trustLockfile: false
blockExoticSubdeps: true

strictPeerDependencies: true
engineStrict: true
verifyDepsBeforeRun: error
strictDepBuilds: true
savePrefix: ""
```

`minimumReleaseAge` is expressed in minutes and therefore enforces a three-day
quarantine for direct and transitive releases. Missing registry publication
time fails resolution rather than bypassing quarantine. A dependency whose
publisher trust/provenance level regresses relative to an earlier release fails
resolution. The supply-chain verification pass is applied to the committed
lockfile instead of treating it as inherently trusted. Transitive dependencies
cannot introduce unreviewed exotic Git or tarball sources.

Every dependency install/build script is denied unless its exact package or
accepted version selector is recorded in `allowBuilds` after review. The final
allowlist is produced from the actual attested dependency graph; documentation
may illustrate a likely Vite requirement such as `esbuild`, but the template
must not copy it as an unverified placeholder. A newly observed script fails the
install. `dangerouslyAllowAllBuilds` is prohibited.

Direct dependencies are saved as exact versions without `^` or `~`. Invalid
peer dependencies, incompatible Node.js engines, and stale dependency state
fail rather than being silently repaired by build or test commands. CI restores
with the frozen lockfile and the same strict policy.

An exception for quarantine, publication metadata, trust, source, or build
script requires the narrowest exact package/version selector, evidence and
owner, reason, risk assessment, approval date, expiry/review trigger, and
removal condition. A time-critical security fix may justify an explicit version
exception; it does not justify disabling a policy globally. Private registries
that omit required metadata must be corrected or isolated behind a separately
approved registry policy rather than weakening all public dependency checks.

**Why:** package installation executes third-party code and is part of the
software supply chain, not a harmless preparation step. Quarantine allows time
for malicious releases to be reported, trust checks detect publisher assurance
regressions, lockfile re-verification protects against weaker contributor
settings, and explicit script permission limits arbitrary code execution.
Strict engines, peers, and dependency state also turn hidden environment drift
into an actionable failure.

**Alternatives rejected:** pnpm's implicit one-day, non-strict compatibility
behavior is weaker than the MartiX quality target. Trusting a reviewed lockfile
forever misses poisoned or policy-incompatible changes. Allowing every install
script grants current and future transitive packages code execution. Broad or
permanent exceptions silently become an alternative insecure baseline.

## Resolution

MartiX Full Stack solutions select exactly one equally Supported UI provider:
`blazor-webapp`, `react`, or `vue`. One generated UI project and deployable
contains the required Application UI role and may compose the optional,
explicitly bounded Admin UI role. Split projects or mixed production providers
require a demonstrated trust, ownership, deployment, release, or technology
boundary. A separate disposable UI Evaluation Workspace supports evidence-based
multi-provider research without entering a production solution.

Blazor initially uses a one-project Blazor Web App with global Interactive
Server, prerendering, and selective static SSR. React uses strict TypeScript,
Vite, React Router Framework Mode, and TanStack Query; Vue uses Vue 3 SFCs,
Composition API, Vite, Vue Router, `vue-tsc`, and TanStack Vue Query. General
client-state and advanced form libraries remain conditional. The `application`
rendering profile serves authenticated application work without an SEO claim;
`hybrid-web` adds public SSR/prerendering while keeping authenticated React/Vue
areas client-rendered behind the ASP.NET Core cookie/BFF session owner.

All providers implement one behavioral UI Design and Capability Contract using
native Fluent 2 implementations, semantic HTML, and component-root-scoped
semantic CSS. Tailwind and utility-class authoring are excluded. Provider-native
unit/component tests and one black-box Playwright suite prove equivalent
accessibility, security, localization, themes, rendering, authentication,
contract, performance, and failure behavior. Feature-first vertical slices
remain provider-idiomatic and do not share a lowest-common-denominator UI
abstraction.

The API's first-party `Microsoft.AspNetCore.OpenApi` pipeline remains the sole
producer of reviewed build-time OpenAPI 3.1 artifacts. React and Vue consume
them through exactly `openapi-typescript` 7.13.0 and `openapi-fetch` 0.17.0;
Blazor consumes ordinary HTTP operations through exactly NSwag.ConsoleCore
14.7.1 in client-only mode. Small handwritten composition adapters own
credentials, antiforgery, Problem Details, ETags, idempotency, safe resilience,
observability, binary/multipart details, and real SSE streaming. Generated code
is checked in, never edited, deterministically regenerated, and verified against
one semantic conformance suite.

React and Vue use pnpm exclusively with an exact release-attested version, one
frozen `pnpm-lock.yaml`, exact direct dependencies, a three-day strict release
quarantine, provenance/trust and lockfile verification, blocked exotic
transitives, strict engines/peers, and an explicit reviewed install-script
allowlist. Volta remains a personal development-machine choice and is absent
from generated repositories and CI.

Generated products contain no fake demonstration business domain. The template
repository instead owns non-product `MartiX.UI.Conformance` variants that prove
the complete provider contract and establish comparable release evidence and
performance baselines without entering generated solutions or deployments.

## Current implementation and migration direction

The current WebApi library, dotnet templates, and any existing UI helpers are
migration input only and do not constrain this clean target. Do not preserve a
current UI abstraction, project, dependency, sample domain, or hosting choice
merely for continuity. Retain code only when it directly satisfies the accepted
provider contract and quality evidence; otherwise replace it deliberately.

Implementation should first establish the provider-neutral Capability Manifest,
OpenAPI/client-generation contract, design tokens, semantic CSS and browser
acceptance journeys. Then implement `MartiX.UI.Conformance` independently for
Blazor, React, and Vue, attest exact dependency graphs, and only afterward expose
the three template provider selections. Add Admin UI, `hybrid-web`, identity,
real-time, advanced widget, PWA, or alternate hosting behavior through their
explicit Capability/Profile boundaries rather than broadening the baseline.

## Material alternatives rejected

- **One preferred UI and secondary Deferred providers:** rejected because
  Blazor and React are equally important and Vue must remain a genuine Supported
  option for suitable applications.
- **Multiple providers or projects in every production solution:** rejected
  because it multiplies security, identity, design, testing, build, deployment,
  and upgrade cost without a demonstrated boundary.
- **A universal UI framework or shared component implementation:** rejected in
  favor of one behavioral contract with provider-native Fluent implementations.
- **Tailwind or pervasive utility classes:** rejected because presentation
  belongs in clean semantic CSS under component roots, not scattered through
  markup and code.
- **Browser-owned access/refresh tokens or authenticated Node SSR by default:**
  rejected to preserve ASP.NET Core as the single hardened session owner and to
  prevent private-data cache leakage.
- **One universal OpenAPI client generator:** rejected because the conformance
  prototype proved materially different language fidelity. Hey API and Kiota
  remain reconsiderable only after their recorded failures disappear.
- **Runtime-only or build-implicit client generation:** rejected because client
  artifacts must be reviewable, deterministic, independently buildable, and
  drift-checked.
- **Fake business samples in generated products:** rejected because they pollute
  new domains and mislead implementation agents; conformance workloads belong
  in repository-owned release fixtures.
- **PWA, offline, SignalR, advanced widgets, rich text, or commercial suites by
  default:** rejected because each introduces product-specific security,
  correctness, licensing, payload, and operational obligations.

## Consequences and promotion triggers

- Ticket 113 must encode the provider build matrix, strict type/lint/browser
  gates, client drift and semantic conformance, accessibility, security, SEO,
  performance, package-supply-chain, and `MartiX.UI.Conformance` evidence.
- Ticket 119 owns only infrastructure providers needed by explicit UI hosting,
  identity, cache, telemetry, or real-time profiles; none becomes mandatory
  merely because a UI provider is selected.
- Ticket 120 must define deployable SPA, Node/Nitro SSR, Blazor Interactive
  Server, same-origin BFF, reverse-proxy, health, scale, and local-development
  profiles consistent with these boundaries.
- Promote Blazor WebAssembly or Interactive Auto only after a real execution or
  hosting force justifies the extra project and full browser/AOT evidence.
- Promote personalized React/Vue SSR only after session ownership, delegation,
  CSRF, cache partitioning, logout/revocation, privacy, and failure tests exist.
- Promote Hey API or Kiota only after unchanged generated output passes the
  strict semantic corpus and improves the selected profile materially.
- Re-run client conformance for every generator/compiler/runtime upgrade;
  NSwag does not earn trimming or Native AOT claims without a real publish and
  behavior test.
- Add PWA/offline, SignalR, advanced form/state libraries, virtualization, or
  widget suites only for a demonstrated product requirement and provider-specific
  evidence.
- Split Application and Admin UI, or admit mixed providers, only when the
  recorded organizational, security, operational, or technology boundary
  outweighs the permanent matrix cost.
