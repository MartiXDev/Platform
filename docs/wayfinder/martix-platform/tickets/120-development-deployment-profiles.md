---
title: Design local development and deployment profiles
status: closed
type: wayfinder:grilling
parent: ../map.md
claimed_by: codex-root
resolved: 2026-07-19
blocked_by:
  - 106-generated-solution-topology.md
  - 107-persistence-and-migrations.md
  - 111-security-observability-baseline.md
  - 118-ui-provider-architecture.md
  - 119-infrastructure-provider-catalog.md
---

## Question

Which local-development, Aspire, Docker, Docker Compose, secret-handling, and production-deployment profiles should be Supported, and how should each selected Capability contribute resources, configuration, startup ordering, diagnostics, and immutable artifacts without implying a cloud or orchestrator?

## Resolution

Support ordinary `dotnet run` and a file-based Aspire AppHost for local
development; produce equally governed immutable process and OCI artifacts;
project bounded single-host Compose and every future provider from one validated
Deployment Manifest; keep the first production catalog cloud-neutral while
documenting provider promotion paths; and use standard typed .NET configuration
with external provider-neutral secret delivery. The named future Active24 VPS
reference is Ubuntu 26.04 LTS Minimal after its first point release and complete
admission evidence, with Ubuntu 24.04 as the timing fallback and Debian 13 as a
separately attested client-driven alternative.

## Accepted decisions

### Separate direct execution, local orchestration, and deployment

Every Generated Solution supports a `direct` Local Development Profile through
ordinary `dotnet run`. It requires neither Aspire nor a container runtime and
remains usable when dependencies are supplied through standard validated
configuration. A lean API with no selected external resource therefore incurs
no orchestration tooling or container prerequisite.

The preferred Local Development Profile for Modular Monolith, Full Stack, and
any solution with selected external resources is `aspire`. It uses a
file-based `apphost.cs`, not another `.csproj` or Generated Solution project.
The AppHost declares local processes and containers, resource references,
dependency readiness, injected endpoints and connection configuration, and the
development dashboard. It stays minimal and contains no business behavior.

Aspire is development orchestration and an optional deployment-artifact
publisher, not an application runtime, production control plane, configuration
store, or required production orchestrator. Application code continues to use
standard .NET configuration, health, telemetry, service discovery, and
provider contracts. The AppHost may project the accepted application model
into target-specific artifacts, but those immutable outputs must be reviewable,
attested, and deployable without a running AppHost.

**Why:** this gives multi-resource solutions one observable, correctly ordered
inner loop without charging the smallest API another project or making Docker,
Aspire, a cloud, or an orchestrator part of the Platform Baseline. Keeping
`dotnet run` functional also prevents orchestration metadata from becoming a
second source of application truth.

**Alternatives rejected:** a mandatory project-based AppHost increases project
count without providing a necessary boundary; mandatory containers burden lean
applications; hand-maintained local scripts disperse topology and readiness
logic; and treating the AppHost as a production runtime couples application
lifecycle to development tooling.

### Support process and container deployment artifacts equally

Every deployable Generated Solution supports two equally governed Deployment
Profiles selected according to the client's operating target:

- `process` produces an immutable archive from `dotnet publish` for targets such
  as IIS, Windows Service, systemd, Azure App Service package deployment, or a
  client-managed process host; and
- `container` produces an immutable OCI image for Docker Compose, managed
  container services, Kubernetes, or another OCI-compatible platform.

Both profiles obey one artifact contract. CI builds an artifact once, assigns a
content digest, and promotes that exact artifact through environments without a
production rebuild. The release binds its source revision, exact SDK/runtime and
dependency graph, configuration schema, SBOM, provenance attestations, hashes,
vulnerability results, Capability Manifest, and Release Evidence Manifest.
Environment configuration and secrets are supplied at deployment rather than
baked into either artifact. Database migration remains a separate, explicit
one-shot operation completed before the new serving revision becomes ready.

Native AOT, ReadyToRun, self-contained, framework-dependent, OS and RID choices
are build compatibility variants inside an exact Deployment Profile, not new
deployment architectures. They earn only the combinations accepted by the AOT
and performance matrix. Docker Compose and later orchestrator adapters compose
the same released OCI images; they never rebuild application source or create a
different unofficial image. Neither profile adds a Generated Solution project.

**Why:** clients commonly mandate either non-container process hosting or
container-only delivery. Equal profiles retain that portability without
pretending the artifacts or their security-update responsibilities are
identical. One shared release contract prevents deployment convenience from
weakening provenance, configuration, migration, or rollback guarantees.

**Alternatives rejected:** container-only delivery excludes common IIS,
App Service, and client-managed estates; process-only delivery blocks modern
container platforms and reproducible multi-resource packaging; rebuilding per
environment destroys artifact identity; and treating every publish switch as a
separate architecture obscures the actual compatibility matrix.

### Bound Docker Compose to headless parity and single-host deployment

`compose` is a Supported topology over the accepted `container` artifacts. For
development and CI it is a secondary headless/parity path; Aspire remains the
preferred interactive Local Development Profile. For production it supports
small applications, on-premises installations, and low-cost VPS deployments on
exactly one host. It makes no high-availability, rolling-deployment,
autoscaling, self-healing-cluster, or automatic-failover claim.

The Compose deployment artifact is generated deterministically from the
accepted AppHost application model by the release pipeline and is verified for
drift. It is not a second hand-maintained topology. It references the already
built application images by immutable digest and must not build application
source during deployment. The attested output includes the Compose model,
parameter schema, expected external values, image identities, and deployment
runbook; it contains no production secret values or committed populated
`.env` file.

The profile declares private networks, explicit exposure, health and readiness
relationships, bounded restart behavior, resource constraints, persistent
volume ownership, and graceful shutdown. Database migrations run as a separate
one-shot operation before serving workloads become ready. Every selected
stateful Capability requires documented volume lifecycle, backup, restore,
upgrade, capacity, and disaster-recovery procedures. TLS termination and public
ingress are explicit deployment concerns rather than accidental container port
publication.

**Why:** Compose is a valuable, economical deployment target for clients who do
not need a cluster, and it supplies a reproducible headless topology for CI.
Restricting its support claim prevents a single-host tool from being marketed as
enterprise high availability. Generating rather than hand-maintaining the model
also preserves one topology source and makes drift executable.

**Alternatives rejected:** making Compose the primary inner loop duplicates
Aspire's richer development diagnostics; allowing `build:` in production breaks
artifact promotion; committed secrets or populated `.env` files violate the
secret contract; and presenting restart policies or multiple containers on one
machine as high availability hides the shared host failure domain.

### Keep the initial deployment catalog cloud-neutral

No cloud-specific, cluster-specific, or orchestrator-specific deployment
provider is initially Supported. The first catalog ends at the portable
`process`, `container`, and single-host `compose` profiles. A Generated Solution
therefore does not imply Azure, AWS, Google Cloud, Kubernetes, a managed
container service, or a particular infrastructure-as-code tool.

Enterprise readiness resides in stable application and operational contracts:
immutable artifacts, Capability Manifest resource requirements, validated
external configuration, workload identity seams, separate migrations, explicit
readiness and liveness, graceful shutdown, vendor-neutral telemetry, stateless
serving assumptions where selected, and provider-independent business
contracts. Aspire may be able to publish or deploy to a target, but tool support
alone does not create a MartiX Supported claim.

A future deployment provider must own target-specific infrastructure as code,
identity and least privilege, networking and private connectivity, ingress and
TLS, secret injection, rollout and rollback, autoscaling and capacity,
availability zones and failure domains where claimed, stateful dependencies,
observability integration, cost controls, disaster recovery, live-environment
tests, operator runbooks, and removal/migration guidance. Its exact provider,
region/profile, artifact types, toolchain, and compatibility evidence enter the
Capability Matrix and Release Evidence Manifest.

**Why:** accepting a provider because Aspire or a cloud CLI can emit a manifest
would confuse generation with production assurance. Waiting for a real client
force avoids a false Azure or Kubernetes default while the portable contracts
ensure that adding such a provider does not require Business Module redesign.

**Alternatives Deferred:** Azure App Service and Azure Container Apps are the
leading Azure PaaS candidates; Kubernetes/AKS is appropriate only for genuine
cluster or organizational forces; IIS/Windows Service and systemd remain
process-host adapters; AWS, Google Cloud, other Kubernetes services, and managed
platforms enter through the same admission process. A detailed client-driven
comparison is maintained as linked research rather than pre-installing any
provider.

### Preserve a detailed cloud-provider promotion catalog

The complete provider comparison, current primary-source evidence, UI placement
matrix, Aspire integration maturity, cost and operational considerations, and
16-point admission checklist are maintained in
[the future cloud deployment variants research](../research/120-cloud-deployment-variants.md).
It is a reassessment guide, not a declaration that every listed target is
Supported.

| Client force | First future candidate | Portable artifact and important boundary |
| --- | --- | --- |
| Azure-hosted conventional ASP.NET Core application with minimal platform operations | Azure App Service code deployment | Consume the immutable `process` archive; slots and managed identity are provider behavior, not portable application contracts |
| Azure-hosted API, SSR UI, worker, and finite jobs without cluster ownership | Azure Container Apps | Consume OCI images; distinguish continuously serving apps, finite jobs, and the one-shot Migrator; revisions and scale rules require live tests |
| Client already operates Kubernetes or requires its APIs, policies, operators, or scheduling | AKS | Consume OCI images through a versioned Helm/provider overlay; cluster identity, networking, ingress, scaling, upgrades, and recovery become an infrastructure product |
| Azure or on-premises estate requires OS, Windows, legacy, driver, or network control | Azure VM with IIS/Windows Service, Linux systemd, governed container runtime, or bounded Compose | Preserve the accepted process/container/single-host limits; the operator owns OS hardening, patching, proxy/TLS, capacity, backup, monitoring, and replacement |
| Existing MartiX application on legacy Active24 shared Windows hosting | Preserve only as bounded current-state migration input | Do not turn its provider-controlled runtime and unknown lifecycle into the target Platform contract |
| Continue using Active24 after retirement of legacy Windows hosting | Active24 Linux VPS with nginx/systemd, OCI container, or bounded Compose | Preferred future Active24 path; preserve Business Module contracts and change deployment assets while separately proving Linux operations and single-host limits |
| A concrete requirement still mandates Windows at Active24 | Active24 Windows VPS plus IIS | Consume the immutable `process` archive with Administrator control; exact product, .NET 10/IIS lifecycle, protocols, security, backup/restore, monitoring and responsibility must pass admission |
| AWS needs the smallest stateless HTTP surface | AWS App Runner | Consume an immutable image rather than provider source builds; reject when workers, protocols, or topology need greater control |
| AWS needs API, workers, and one-shot tasks without Kubernetes | Amazon ECS on Fargate | Map serving workloads to services and migrations to awaited tasks; IAM, VPC, load balancing, service discovery, and rollout remain AWS-specific |
| AWS client already operates Kubernetes | Amazon EKS | Reuse the Kubernetes base only with a tested EKS overlay for identity, ingress, storage, networking, scaling, and upgrades |
| Google Cloud needs stateless HTTP, workers, or finite jobs with low platform operations | Google Cloud Run | Consume OCI images; separate services, worker pools, and jobs and test scale-to-zero, CPU, concurrency, cold start, and connection pressure |
| Google Cloud client requires Kubernetes | GKE Autopilot, then Standard when node control is necessary | Test the exact GKE mode; Autopilot restrictions and Standard's larger operator responsibility are different profiles |
| Existing client governance mandates Elastic Beanstalk or App Engine flexible | A compatibility adapter for that existing platform | Admit only against the exact estate; do not prefer a legacy platform shape for greenfield deployment without that force |
| Sovereign, on-premises, OpenShift, Rancher, or another client Kubernetes distribution | Portable base chart plus a tested provider overlay | “Kubernetes compatible” does not standardize ingress, identity, storage, policy, autoscaling, secret delivery, or observability |
| Low-cost deployment in any cloud without HA requirement | Bounded Compose on one VM/VPS | Retain one-host failure semantics and explicit backup/restore; multiple containers do not create HA |
| Public global edge, WAF, CDN, or multi-origin routing | Azure Front Door, CloudFront, Cloud CDN/Armor, or equivalent in front of the chosen host | Edge is independently selected; it is not compute and cannot manufacture origin or data-layer availability |
| Independently released static React/Vue or standalone Blazor WebAssembly UI | Static origin plus CDN | SSR, Blazor server interactivity, authentication, SEO, cache safety, CORS, and release coupling determine whether static placement is valid |

Azure Functions, AWS Lambda, and Google Cloud functions are not drop-in hosting
switches for the ASP.NET Core modular monolith, Blazor server UI, Quartz
scheduler, broker consumer, or long-running worker. A future Function Capability
requires a separately designed trigger, idempotency, bounded execution, retry
and dead-letter, networking, cold-start, cost, and live-cloud profile; container
packaging does not erase those semantics.

Cloud hosting stays separate from edge, databases, cache, broker, Object
Storage, secrets, and telemetry. For example, Front Door may protect a
non-Azure origin and Azure Key Vault may serve an application hosted elsewhere.
A provider preset may recommend a composition, but its Capability Manifest must
expose every selected concern and its exit path.

The likely investigation order is Azure App Service code first for a managed
`process` requirement, Azure Container Apps for managed OCI workloads, Azure
Front Door or static hosting only when public-edge/UI forces exist, and AKS only
for a real Kubernetes force. ECS/Fargate and Cloud Run are the leading managed
container candidates when AWS or Google Cloud is required. Exact client demand
can change this order, but cannot bypass the common admission gates.

### Add Active24 as the user's named VPS deployment candidate

Active24 is not treated as an abstract cloud synonym. The detailed
[Active24 hosting research](../research/120-active24-hosting-variant.md)
separates its current product families and records every unknown that must be
verified against the user's exact contract.

The user's current application runs on a legacy shared Active24 Windows hosting
product, not a VPS. Its possible withdrawal from new sales is recorded as user-
provided context and must be verified before it becomes a migration deadline.
This current runtime is migration input only; it does not constrain the new
MartiX architecture or qualify as a Supported deployment target.

The preferred future Active24 shape is an unmanaged Linux VPS running the
accepted `process` artifact behind nginx/systemd, an immutable OCI container,
or bounded single-host Compose. The currently advertised Linux Smart shared
hosting does not establish permission or control to run a custom ASP.NET Core
.NET 10 process, persistent Quartz/background work, the one-shot Migrator, or
the required health, shutdown and deployment contracts. It may remain relevant
to unrelated PHP or separately verified static content, but it is not the
backend migration target.

An unmanaged Active24 Windows VPS running the accepted `process` artifact under
IIS remains a conditional alternative when a real Windows-specific requirement
exists. Current public information offers full Administrator access and a
Windows Server option, which permits customer-owned .NET and IIS setup.
Promotion still requires the exact server to prove .NET 10
Hosting Bundle or self-contained servicing, dedicated application identity,
IIS application-pool and recycle behavior, `AlwaysRunning` where needed,
graceful shutdown, Quartz recovery, SSE/WebSockets, TLS, firewall, deployment,
rollback, monitoring, patching, backup/restore, capacity and contractual
responsibility. A single VPS has an honest downtime and host-failure boundary.

Active24 describes the VPS as unmanaged, and its optional complete server-
management service currently does not fully manage Windows. Provider support
and infrastructure monitoring therefore do not transfer guest OS, .NET, IIS,
application, database, backup, SLO or incident ownership unless a written
contract explicitly does so. A short-lived VPS snapshot is not an
application-consistent backup or disaster-recovery plan.

The Linux-focused managed-server option may be composed only if deployment
permissions and responsibility are contracted. The legacy-Windows-to-Linux path
changes provider-specific deployment assets, not Business Modules, HTTP
contracts, EF Core mappings or Capability Interfaces.

Ordinary Active24 shared webhosting is not admitted for a MartiX backend on the
current evidence. Its published webhosting surface does not establish
administrator control, a selectable .NET 10 runtime, IIS lifecycle, persistent
background work, containers, one-shot migrations or the operational evidence
required here. A product name or price-list `Windows` add-on cannot substitute
for an exact support contract and live conformance tests.

Active24 Linux Smart may be investigated only as a separate static UI hosting
adapter. It can enter the Supported matrix for an immutable React/Vue static or
prerendered build, or standalone Blazor WebAssembly, only after its exact plan
proves SPA fallback, MIME types, cache and compression headers, HTTPS/custom
domain, deployment atomicity, rollback, asset invalidation, routing, CORS and
authentication behavior, SEO where claimed, and independent release evidence.
It cannot inherit support for Blazor Web App server interactivity, React/Vue
SSR, ASP.NET Core API, Quartz, broker consumers, or the Migrator.

Splitting static UI onto Smart while hosting the API elsewhere is optional, not
the Full Stack default. It creates separate origins and releases and therefore
requires an explicit decision for same-origin proxying or CORS, cookie/BFF
ownership, antiforgery, CSP, API endpoint discovery, coordinated compatibility,
observability and failure behavior. The preferred simple Active24 Full Stack
shape keeps UI and backend together on an admitted Linux VPS unless independent
static delivery provides measurable value.

### Select Ubuntu 26.04 LTS minimal for the future Active24 VPS

The accepted target is **Ubuntu 26.04 LTS minimal** for the future Active24
Linux VPS. The full comparison, source evidence, lifecycle dates, package-
provenance rules, hardening checklist and promotion tests are maintained in
[the Ubuntu versus Debian research](../research/120-ubuntu-vs-debian-active24.md).

The evidence-first recommendation on 19 July 2026 was Ubuntu 24.04 because its
point-release line was mature while Ubuntu 26.04 was only about three months
old. The user then selected Ubuntu 26.04 because the first real production
deployment will occur later rather than during that early-adoption window. This
timing gives the newer LTS a longer useful residence and avoids deliberately
starting a new future host on the preceding LTS only to schedule an earlier OS
replacement.

The selection does not waive production admission. Ubuntu 26.04 becomes the
Supported Active24 reference only after 26.04.1 is released and a fresh
Active24 minimal image passes the full provisioning, .NET, Docker where
selected, AppArmor, nginx, firewall, update/reboot, backup/restore, host-loss
rebuild and application compatibility suite. If those gates have not passed
when a deployment must occur, Ubuntu 24.04 LTS minimal is the tested fallback;
the release must not silently use an unverified 26.04 host.

Ubuntu 26.04 is already supported by .NET 10 and Docker, Canonical supplies
.NET 10 through the built-in Ubuntu feed, and its standard security maintenance
continues through May 2031. Promotion should provision a clean immutable host
rather than preserve undocumented manual state or depend on an in-place OS
upgrade.

**Debian 13** remains a first-class, client-driven candidate. It is appropriate
where the client already has Debian operations, hardening, patching, monitoring
or compliance standards. It must earn an independent support claim because its
.NET packages come from Microsoft's Debian feed, the exact Active24 image is not
documented as minimal, AppArmor state must be proved, and its lifecycle changes
from regular support to Debian LTS in August 2028.

**Debian 12** is migration-only because regular support ended in July 2026 and
Debian recommends Debian 13 for new/current systems. Debian 11 and Active24's
LAMP/LEMP presets are rejected. The presets add unrelated PHP, MariaDB and web-
server state; a MartiX host starts from a clean image and installs only the
admitted nginx/systemd, ASP.NET Core runtime, telemetry or container components.

For the smallest application, nginx plus systemd and the immutable `process`
artifact is the preferred host shape. Docker is installed only when the
`container` or bounded `compose` profile provides a concrete benefit. The OS is
a deployment adapter: Business Modules, HTTP contracts, persistence and UI do
not branch by distribution, and host replacement is preferred over preserving
an undocumented pet server.

**Why:** the original conservative recommendation optimized for an immediate
July 2026 production deployment. The accepted choice optimizes for the user's
actual later deployment date while retaining objective readiness gates. It
captures the benefit of the newer LTS without confusing “latest” with
“production-ready.”

### Keep configuration standard and secret delivery provider-neutral

Generated Solutions use the standard ASP.NET Core/.NET configuration pipeline
and bind configuration owned by each Capability or host concern into narrowly
scoped, immutable Options types. Every required value, format, range and cross-
field invariant is validated at startup. Missing or invalid configuration fails
the process before readiness rather than producing a partially functioning
application. Business Modules consume typed values or Capability Interfaces;
they do not read arbitrary keys from `IConfiguration` and do not depend on a
cloud vault SDK.

The generator emits a machine-readable Configuration Contract and documented
examples containing key names, type/shape, ownership, purpose, required versus
optional status, sensitivity, safe default policy, restart/reload behavior and
the Capabilities and Deployment Profiles that require each value. It never
emits a real secret. Unknown or obsolete security-sensitive keys are diagnosed
so configuration drift cannot remain silently active.

Precedence follows ordinary .NET Configuration with an intentionally small
source set:

1. committed `appsettings.json` contains safe, environment-independent defaults
   only;
2. a committed development settings file may contain safe local endpoints and
   diagnostics defaults, never credentials;
3. `dotnet user-secrets` supplies developer secrets for `direct` execution;
4. the file-based Aspire AppHost declares secret parameters and obtains their
   values from the developer's secret/environment sources without embedding or
   echoing them;
5. deployment injects external configuration through environment variables or
   mounted configuration/secret files supported by the standard configuration
   pipeline; and
6. command-line overrides are limited to explicit operator or test scenarios
   and must not become the ordinary secret channel because process arguments
   are commonly observable.

Production secret values live in the target's admitted secret mechanism, such
as a protected systemd credential/environment source, orchestrator secret,
Azure Key Vault, AWS Secrets Manager, Google Secret Manager, HashiCorp Vault or
an equivalent client platform. A provider adapter owns workload identity,
least-privilege access, injection, audit and operational runbooks. Prefer
workload identity and injected values over long-lived bootstrap credentials.
The portable application contract remains the same regardless of the store.

Actual secret values are forbidden in source-controlled `appsettings*`,
`launchSettings.json`, populated `.env` files, Compose/AppHost definitions,
Capability Manifests, generated examples, build arguments, OCI layers, process
arguments, SBOM/provenance, tests, snapshots, logs, traces, exceptions and
release evidence. Repository and artifact secret scanning is a blocking Quality
Gate. Diagnostic output may report a missing key and its owner but never its
value; Options and configuration objects containing secrets must not be
serialized or logged.

The initial rotation contract is explicit replacement followed by a controlled
restart or rolling replacement, readiness verification and revocation of the
old value. Dynamic reload is not promised globally: it requires an individual
Capability to prove atomic consumption, concurrency behavior, failure fallback,
observability and provider support. This avoids presenting `reloadOnChange` as
safe rotation for clients, connection pools or singleton consumers that retain
old credentials.

Local-development convenience does not weaken production parity. Tests verify
that every Deployment Profile can satisfy the same Configuration Contract from
its permitted sources, that precedence cannot accidentally select a developer
secret, and that generated Compose or deployment artifacts contain references
and schemas only. Production startup records non-sensitive configuration source
metadata and schema/version identity for diagnosis without disclosing values.

**Why:** standard .NET configuration already provides the portable composition
mechanism; typed ownership and startup validation remove stringly typed access
and delayed failures. Separating secret storage from consumption permits Active24
today and a future cloud vault without infecting Business Modules or multiplying
configuration abstractions. Explicit restart-based rotation is simpler and more
truthful until a Capability demonstrates safe live reload.

**Alternatives rejected:** a custom universal configuration service duplicates
the framework and becomes a shallow abstraction; direct vault SDK calls in
Business Modules couple domain/application behavior to deployment; committed
development secrets inevitably escape their intended boundary; populated
production `.env` files are too easily copied, logged or retained; and claiming
automatic dynamic rotation without consumer-specific evidence creates a false
security guarantee.

### Compose every topology from one Deployment Manifest

Generation composes the selected Capability Manifests into one versioned,
machine-readable **Deployment Manifest**. It is the accepted topology model for
the Generated Solution and contains references and requirements, not provider
credentials or runtime-discovered business behavior. The file-based Aspire
AppHost, headless/production Compose artifact, process-host instructions and
future cloud infrastructure adapters are deterministic projections of this
same model.

Each selected Capability contributes only the deployment facts it owns:

- required and optional logical resources and their portable service type;
- Configuration Contract fragments, including secret references but no values;
- executable role, command, ports/protocols and public/private exposure intent;
- startup dependencies expressed as availability or completed one-shot work;
- liveness, readiness and startup checks with declared diagnostic ownership;
- persistent-data ownership, durability, backup, restore and upgrade needs;
- one-shot migrations, seeds or initialization and their concurrency rules;
- resource/capacity assumptions and graceful-shutdown requirements; and
- telemetry signals, dashboard links and operator-facing diagnostic metadata.

The generator validates the composed graph before emitting source. Resource
names, configuration keys, ports, volumes and executable roles must be unique or
explicitly shared under an accepted contract. Cycles, missing providers,
unresolved secret references, conflicting exposure, unsupported Capability and
Deployment Profile combinations, or stateful resources without lifecycle
contracts fail generation. The normalized manifest is deterministic for the
same inputs and receives a schema version and content digest recorded in release
evidence.

Startup edges describe conditions, not elapsed time. A serving workload may
wait for a required dependency's readiness and for its separately authorized
one-shot migration to complete successfully; optional dependencies must declare
their degraded behavior. No projection may replace these conditions with fixed
sleep intervals. Startup ordering improves orchestration but never substitutes
for application-level timeout, retry, idempotency and failure handling because
dependencies can fail after startup.

Deployment projections may add only target-owned mechanics such as systemd
units, nginx configuration, Compose networks/volumes, workload identity,
ingress or provider resource identifiers. They must preserve the manifest's
logical identities and semantics, declare every intentional target override,
and pass drift checks. A projection cannot silently weaken persistence,
readiness, secret delivery, exposure or migration guarantees. Unsupported
provider-specific features remain explicit extension data owned by that adapter,
not fields leaked into Business Modules.

Application and Business Module assemblies do not reference Aspire hosting,
Docker, Compose, Kubernetes or a cloud infrastructure SDK. There is no runtime
scan in which modules register arbitrary infrastructure. Capability selection
and composition happen at generation time; runtime DI registers the already
selected application behavior through ordinary explicit composition roots.

The AppHost may enrich development presentation with dashboard URLs, local
resource lifetimes and developer convenience, while Compose or production
adapters may express restart and placement behavior. Those are projections, not
parallel topology files to maintain manually. Generated outputs either remain
fully reproducible or carry a generated-file policy and drift verification;
operators customize through declared inputs or an owned provider overlay rather
than editing generated output into an untraceable fork.

**Why:** one declarative model keeps local orchestration, CI parity and
production artifacts aligned while allowing each Capability to own its real
requirements. Projection-specific adapters remain replaceable, and validating
the complete graph before code generation exposes invalid combinations earlier
than application startup or deployment.

**Alternatives rejected:** separate hand-authored Aspire and Compose topologies
drift; a lowest-common-denominator manifest hides important lifecycle semantics;
runtime module discovery makes topology and security nondeterministic; fixed
startup sleeps confuse delay with readiness; and allowing provider details into
Business Modules reverses the intended dependency direction.
