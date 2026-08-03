# Future cloud deployment variants for ticket 120

## Research scope

Research date: **2026-07-19**.

This document evaluates credible future cloud and managed-hosting profiles for
MartiX applications. It is evidence for Wayfinder ticket 120, not a support
declaration. None of the named cloud or cluster targets is initially
`Supported`. A target may be promoted only when its exact profile passes the
admission gates below.

Only current primary sources were used: official Microsoft, AWS, Google Cloud,
Kubernetes, and Aspire documentation. Service features and limits change; every
promotion and release therefore has to revalidate the exact region, tier,
runtime, control-plane version, and IaC provider version.

The accepted portable inputs remain:

- a `process` artifact produced by `dotnet publish`;
- a `container` artifact published as an immutable OCI image; and
- a `compose` topology limited to a single host.

Cloud deployment consumes one of those artifacts. It must not rebuild source in
the target environment or silently replace the accepted migration, health,
configuration, secret, telemetry, and release-evidence contracts.

## Keep deployment concerns separate

A **hosting target** runs an application process or container. It is not a
synonym for an entire cloud architecture. A deployment profile composes
independently selected concerns:

| Concern | Examples | Independent decision required |
| --- | --- | --- |
| Compute host | App Service, Container Apps, ECS, Cloud Run, Kubernetes, VM | Artifact shape, lifecycle, scaling, rollout, health |
| Edge and public ingress | Front Door, CloudFront, Cloud CDN, external gateway | DNS, TLS, WAF, CDN, rate limits, origin protection |
| Identity and secrets | Managed identity, workload identity, IAM role, secret store | Least privilege, rotation, tenant/account boundary |
| Database and state | Managed PostgreSQL/SQL Server, Object Storage, cache | Availability, backup, restore, encryption, capacity |
| Messaging | RabbitMQ or a promoted cloud broker | Delivery, retry, dead-letter, network and identity |
| Observability | OTLP Collector and selected backend | Export path, retention, access, sampling, cost |
| Delivery control plane | CI/CD, GitOps, cloud deployment service | Approval, provenance, drift, rollback, separation of duties |

This separation permits, for example, Azure Front Door in front of an origin
outside Azure, an Azure database with an on-premises process host, or OTLP to a
client-selected backend. A preset may compose a recommended combination, but it
must expose each selected capability and its consequences.

## Candidate classification

The classifications describe future investigation priority, not current
support.

| Candidate profile | Portable input | Future classification | Best fit |
| --- | --- | --- | --- |
| Azure App Service, code | `process` | Leading Azure process candidate | Conventional .NET web app with low platform-operations appetite |
| Azure App Service, custom container | `container` | Conditional alternative | Client standardizes on App Service but requires an owned image |
| Azure Container Apps | `container` | Leading managed-container candidate | APIs, web apps, workers, and one-shot jobs without cluster ownership |
| AKS | `container` | Enterprise cluster candidate | Kubernetes is an organizational or workload requirement |
| Azure VM / VM Scale Set | `process`, `container`, or bounded `compose` | Compatibility and control fallback | OS control, legacy integration, unusual networking, regulated estate |
| Legacy Active24 shared Windows hosting | Existing provider-controlled artifact only | Current-state migration input, not a new target | User's current legacy application only; exact contract is not a portable MartiX deployment profile |
| Active24 Linux VPS | `process`, `container`, or bounded `compose` | Preferred future Active24 migration candidate | systemd/nginx, OCI, or single-host Compose with customer-owned operations |
| Active24 Windows VPS | `process` | Conditional Windows alternative | ASP.NET Core under IIS with full Administrator control after exact-contract admission |
| AWS App Runner | `container` | Simple AWS web candidate | Stateless HTTP service with a minimal AWS operations surface |
| Amazon ECS on Fargate | `container` | Leading AWS managed-container candidate | Multiple services/workers with AWS-native networking and IAM |
| Amazon EKS | `container` | Enterprise cluster candidate | Existing Kubernetes platform or Kubernetes-specific requirements |
| AWS Elastic Beanstalk | `process` bundle or `container` | Compatibility candidate | Client already operates Beanstalk; not the preferred greenfield target |
| Google Cloud Run | `container` | Leading Google managed-container candidate | Stateless HTTP, workers, and one-shot jobs with minimal operations |
| GKE Autopilot or Standard | `container` | Enterprise cluster candidate | Kubernetes requirement in Google Cloud |
| Google App Engine flexible | `container` | Compatibility candidate | Existing App Engine organization or feature dependency |
| Generic managed Kubernetes | `container` | Portable cluster family | Client supplies a conforming Kubernetes platform and operations team |
| Generic VM/VPS | `process`, `container`, or bounded `compose` | Portable fallback | Cloud-neutral or on-premises single-host and controlled-server estates |

## Azure profiles

### Azure App Service: code deployment

This is the leading future Azure profile for a conventional modular monolith or
full-stack ASP.NET Core application that does not need container-specific
control. App Service is a managed PaaS for .NET web applications
([App Service documentation](https://learn.microsoft.com/en-us/azure/app-service/)).
The profile consumes the immutable `process` archive. CI should use package
deployment and record the package digest rather than use source-based build in
Azure.

Fit and boundaries:

- Host the API, Blazor Web App, React/Vue SSR server, or a backend-for-frontend
  as a normal long-running ASP.NET Core process.
- A React or Vue SPA can be served by ASP.NET Core from the same artifact, but a
  separate static origin is preferable when independent release cadence, edge
  caching, or global static delivery is required.
- Use an App Service managed identity for Azure resource access. Microsoft
  documents system-assigned and user-assigned identities and notes that slot
  identity configuration is slot-specific
  ([managed identity](https://learn.microsoft.com/en-us/azure/app-service/overview-managed-identity)).
- Configure VNet integration, private endpoints for dependencies, public
  ingress, custom DNS, TLS, and origin restrictions explicitly. A public
  `azurewebsites.net` endpoint is not an accepted security architecture by
  itself.
- Map MartiX liveness and readiness deliberately. App Service Health Check
  removes persistently unhealthy instances from its load balancer, but it needs
  a configured application path and enough instances to provide availability
  ([Health Check](https://learn.microsoft.com/en-us/azure/app-service/monitor-instances-health-check)).

App Service plans share compute among their apps and slots, and all applications
in a plan scale with the plan. Slots, diagnostics, backups, and WebJobs also use
the plan's resources
([plan scaling model](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans)).
Capacity, noisy-neighbor boundaries, minimum instance count, zone redundancy,
and per-app isolation must therefore be profile inputs rather than defaults.

Use a staging slot and health-gated swap for low-risk rollout where the selected
tier supports it. Slot swap is not a database rollback. Run EF Core migrations
as a separately authorized one-shot pipeline operation before traffic promotion;
keep schema changes backward-compatible across old and new revisions. Durable
Jobs may run in the application only when multi-instance coordination and
shutdown are proven; deployment migrations must never be an App Service startup
side effect.

This profile has low-to-medium operational complexity and relatively strong
Azure coupling in identity, networking, slots, and IaC. It is a good default for
clients already governed around App Service, but not a portable abstraction over
all PaaS hosts.

### Azure App Service: custom container

This variant consumes the same MartiX OCI image as other container targets while
retaining the App Service plan, ingress, slot, health, scaling, and identity
model. It is useful when the client requires image scanning, an exact OS/user
space, or one container artifact across environments. App Service documents
custom-container hosting alongside code hosting
([custom-container entry point](https://learn.microsoft.com/en-us/azure/app-service/)).

Do not select it merely to say the application is containerized. Compared with
code deployment, it adds registry, image pull identity, base-image servicing,
container startup, port, filesystem, and architecture validation without adding
a general multi-container orchestrator. Persistent application state must not
depend on the container filesystem. The release must reference an immutable
image digest, not a mutable tag.

Choose between App Service code and container once per deployment preset. They
are two artifact adapters to the same hosting service, not two simultaneous
production paths.

### Azure Container Apps

Azure Container Apps (ACA) is the leading future Azure managed-container
profile. It consumes the immutable OCI image and is a stronger fit than App
Service where the solution has independently scaled API, worker, or scheduled
and one-shot workloads but does not justify owning Kubernetes.

ACA revisions are immutable snapshots. Multiple-revision mode supports active
revisions, labels, and traffic splitting, providing a basis for canary and
rollback workflows
([revisions](https://learn.microsoft.com/en-us/azure/container-apps/revisions)).
Its scaling model uses HTTP, TCP, or KEDA-based custom rules, can use managed
identity for supported Azure scalers, and can scale to zero
([scaling](https://learn.microsoft.com/en-us/azure/container-apps/scale-app)).

Model three distinct resource roles:

- a **Container App** serves HTTP or runs a continuously available worker;
- an **ACA Job** runs manual, scheduled, or event-triggered work to completion;
  and
- a dedicated migration Job performs the release's one-shot database migration.

ACA documents jobs as finite executions and distinguishes event-driven jobs
from continuously processing app replicas
([Container Apps jobs](https://learn.microsoft.com/en-us/azure/container-apps/jobs)).
Quartz Durable Jobs normally belong in an always-available app/worker with a
nonzero minimum replica count. Translating every Quartz job into an ACA Job
would change scheduling ownership and is not a deployment-only substitution.

The promoted profile must define Container Apps Environment topology, internal
versus external ingress, TLS and custom domains, workload profile or consumption
choice, managed identity, registry pull, private networking, egress, secret
references, resource limits, probes, replica bounds, and downstream protection.
Scale-to-zero is unsuitable where low first-request latency, WebSocket/session
continuity, or continuously polled work is required unless measured mitigation
is accepted.

ACA has lower cluster operations than AKS, but meaningful Azure lock-in in
revisions, environments, KEDA configuration, identity, networking, and jobs.
Promote it only with Bicep or Terraform, live Azure tests, controlled revision
traffic, rollback rehearsal, and cost tests covering idle and burst behavior.

### Azure Kubernetes Service

AKS is a future enterprise profile only when Kubernetes supplies concrete value:
an established client platform, multi-team scheduling, policy and admission,
special networking, sidecars/operators, heterogeneous workloads, portability
requirements, or scale that justifies a cluster control plane. It is not the
automatic meaning of “enterprise-ready.”

The profile consumes MartiX OCI images and maps serving workloads to
Deployments, finite migrations to Jobs, configuration to ConfigMaps and secret
references, and endpoints to Services/Gateway resources. Kubernetes supports
rolling Deployment updates and rollback, but safe behavior still depends on
readiness, termination grace, disruption budgets, capacity, and compatible
database evolution
([rolling updates](https://kubernetes.io/docs/tasks/run-application/update-deployment-rolling/)).
Horizontal Pod Autoscaling requires a metrics source and does not itself supply
node capacity
([HPA](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/)).

Microsoft's AKS baseline architecture demonstrates that a production cluster is
an infrastructure product: identity, private networking, ingress, DNS/TLS,
registry access, node and pod autoscaling, policy, observability, upgrades, and
disaster recovery all require design. It recommends managed identities and
describes Workload Identity for namespace-scoped workload access
([AKS baseline](https://learn.microsoft.com/en-us/azure/architecture/reference-architectures/containers/aks/baseline-aks)).

Promotion requires at least:

- a versioned Helm chart or equivalent Kubernetes manifests plus Azure IaC;
- a private-cluster/public-ingress decision, Gateway API implementation, WAF
  placement, certificates, DNS, network policies, and controlled egress;
- Microsoft Entra Workload Identity with least-privilege identities per
  workload rather than node-wide application credentials;
- resource requests/limits, HPA/KEDA where justified, node autoscaling,
  topology spread, disruption budgets, and availability-zone planning;
- Pod Security, admission policy, image verification, registry controls, secret
  delivery, and no privileged/root workload without an exception;
- upgrade channels, supported Kubernetes skew, node image upgrades, backup,
  restore, regional recovery, and cluster recreation evidence; and
- live AKS conformance for rollout, rollback, node drain, dependency failure,
  telemetry, and workload identity.

AKS normally has the highest Azure operational complexity and fixed platform
surface among these candidates. A client Kubernetes platform team can reduce
MartiX ownership, but the responsibility boundary must be contractual and the
application profile must still be tested on that platform.

### Azure VM, IIS, systemd, and single-host Compose

Azure VMs are the control and compatibility fallback, not the preferred managed
cloud target. They can host:

- the `process` artifact under IIS on Windows or systemd on Linux;
- the `container` artifact under a governed container runtime; or
- the accepted single-host `compose` topology.

This route is justified for client-mandated OS control, Windows-integrated or
legacy dependencies, unusual agents/drivers, network appliances, disconnected
operations, or a direct lift of an established runbook. It transfers OS
hardening, patching, runtime installation, certificate renewal, reverse proxy,
firewall, capacity, backup, monitoring, and application rollout to the operator.

A single VM remains a single failure domain. Azure recommends VM Scale Sets for
centrally managed, scalable high availability and availability zones for
datacenter fault isolation
([VM availability](https://learn.microsoft.com/en-us/azure/virtual-machines/availability-set-overview)).
Moving from one Compose host to multiple VMs is not “HA Compose”; it requires a
load balancer and a designed replication/failover model for every stateful
dependency, or promotion to a real orchestrator/managed service.

IaC must build the VM, network, identity, disks, load balancer, patch policy,
backup, monitoring, and bootstrap. Configuration-management drift scanning and
an image/update strategy are mandatory. Never bake production secrets into a VM
image or cloud-init/custom-script payload.

### Azure edge and static UI adjuncts

Azure Front Door is an optional global edge, CDN, TLS, routing, health-probe,
and WAF layer in front of one or more origins. It is not a compute host and does
not make a single-region or stateful origin highly available. Microsoft
documents acceleration, managed TLS, origin health, and integrated WAF/DDoS
capabilities
([Front Door overview](https://learn.microsoft.com/en-us/azure/frontdoor/front-door-overview)).
Promotion needs origin authentication/restriction, end-to-end TLS, correct
forwarded headers, cache rules that never expose personalized/API responses,
WAF tuning, false-positive handling, logs, failover tests, and DNS runbooks.

Azure Static Web Apps is a candidate static frontend origin for independently
released React/Vue SPAs or Blazor WebAssembly. Microsoft explicitly positions it
for React, Vue, and Blazor WebAssembly and supports linked API backends
([Static Web Apps overview](https://learn.microsoft.com/en-us/azure/static-web-apps/overview)).
It must remain separate from the MartiX API hosting target. A Blazor Web App
using server interactivity and an ASP.NET Core SSR application still require a
server host. React/Vue SSR also require a compatible server runtime; hybrid
Next.js support in Static Web Apps has distinct platform behavior and has been
documented as preview, so it cannot inherit a general React support claim
([Next.js support](https://learn.microsoft.com/en-us/azure/static-web-apps/nextjs)).

For public sites, select rendering explicitly:

- static generation or prerendered React/Vue can use a static origin and CDN;
- client-only SPA and Blazor WebAssembly can use static hosting, but SEO,
  metadata, social previews, startup cost, and crawler behavior must be tested;
- Blazor SSR/server interactivity and React/Vue SSR use App Service, ACA, AKS,
  or another process/container host; and
- edge caching must distinguish versioned static assets, anonymous HTML, and
  authenticated/personalized output.

## AWS profiles

### AWS App Runner

App Runner is the simplest future AWS candidate for a stateless public or
private HTTP service. AWS describes it as a fully managed service that deploys
source or a container image to a scalable web application
([App Runner documentation](https://docs.aws.amazon.com/apprunner/)). MartiX
must use the immutable `container` image path, disable source builds, and use an
explicit release digest. App Runner provides automatic scaling configuration
([autoscaling](https://docs.aws.amazon.com/apprunner/latest/dg/manage-autoscaling.html)).

The promotion profile must validate VPC egress/connectors, public/private access,
custom domain and TLS, ECR access, instance IAM role, secret injection, health,
minimum/maximum concurrency, cold-start behavior, deployment rollback, logs,
and downstream connection pressure. It is a poor fit for arbitrary protocols,
complex multi-service topology, privileged containers, or a continuously
polling worker without exact service support and cost evidence.

### Amazon ECS on AWS Fargate

ECS/Fargate is the leading AWS managed-container candidate. It consumes the same
OCI image while allowing separately scaled services and one-shot tasks without
operating EC2 nodes. Application Load Balancers support HTTP/HTTPS routing for
ECS services
([ECS load balancing](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-load-balancing.html)).
ECS deployment circuit breaker can use load-balancer, Cloud Map, and container
health checks and can roll back a failed service deployment
([deployment circuit breaker](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-circuit-breaker.html)).

Map API/SSR and long-running workers to ECS services. Run migrations as a
separate, awaited ECS task before service traffic promotion. Do not duplicate a
Quartz schedule in EventBridge Scheduler unless scheduling ownership is
explicitly redesigned.

Promotion needs IaC for VPC/subnets/security groups, ALB/NLB and TLS, ECR digest
deployment, task execution and least-privilege task roles, Secrets Manager or
mounted secret selection, service discovery, autoscaling, deployment policy,
availability-zone placement, logs/OTLP, egress, and disaster recovery. Fargate
reduces host operations but retains substantial AWS lock-in in task definitions,
IAM, networking, load balancing, and delivery control plane.

### Amazon EKS

EKS is the AWS Kubernetes profile and should be admitted under the same
Kubernetes forces and gates as AKS. It adds AWS-specific cluster/node mode,
VPC CNI, load-balancer controller, ECR, DNS/TLS, KMS, CloudWatch/OTLP, upgrade,
and IAM design. AWS supports fine-grained workload access through EKS Pod
Identity or IAM Roles for Service Accounts
([EKS workload identity](https://docs.aws.amazon.com/eks/latest/userguide/service-accounts.html)).
Node and pod scaling remain separate concerns; AWS documents EKS Auto Mode,
Karpenter, and Cluster Autoscaler as choices
([cluster autoscaling](https://docs.aws.amazon.com/eks/latest/best-practices/cluster-autoscaling.html)).

Do not claim generic Kubernetes portability after an AKS-only test. A shared
chart can reduce application drift, but EKS promotion needs live EKS identity,
ingress, storage, network, autoscaling, upgrade, and failure evidence.

### AWS Elastic Beanstalk

Elastic Beanstalk is a credible compatibility profile for organizations that
already standardize on it, not the recommended greenfield MartiX AWS target.
It can host application bundles or Docker workloads and supports several rollout
policies, including rolling, immutable, and traffic splitting
([deployment policies](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/using-features.rolling-version-deploy.html)).

Its environment/platform-version conventions, EC2/Auto Scaling internals, proxy
configuration, extensions, and deployment bundle form a distinct adapter. It
still requires health, IAM, VPC, load balancer, secrets, managed platform
updates, logs, and rollback evidence. Prefer App Runner for a simple HTTP
service and ECS/Fargate for a greenfield multi-workload container topology unless
a client requirement makes Beanstalk's established operational model valuable.

### AWS edge and static UI equivalents

An AWS profile may compose CloudFront, AWS WAF, Route 53, and ACM in front of an
ALB/App Runner origin or an S3 static site. These are edge/static capabilities,
not ECS/EKS/App Runner features. React/Vue static builds and standalone Blazor
WebAssembly may use an S3/CloudFront origin; SSR and Blazor server workloads
remain on compute. Origin Access Control, cache keys, WAF rules, TLS, invalidation,
logs, regional failover, and API versus static routing require separate live
tests.

## Google Cloud profiles

### Google Cloud Run

Cloud Run is the leading Google Cloud managed-container candidate. Google
documents three resource forms: request/event-serving services, finite jobs,
and worker pools for always-on pull workloads. Services use stateless instances,
managed HTTPS, autoscaling and revisions; traffic can be split or rolled back
between revisions
([Cloud Run overview](https://cloud.google.com/run/docs/overview/what-is-cloud-run)).

Use a service for API/SSR traffic, a worker pool only for an accepted continuous
worker scenario, and a Job for migrations or genuinely finite batch work. Each
revision has a service account for Google API access. The profile must define
Artifact Registry digest, ingress, load balancer/CDN and TLS where needed,
service identity, Secret Manager, VPC access, Cloud SQL connectivity, min/max
instances, concurrency, CPU allocation, startup/readiness, rollout, logging and
OTLP, and downstream connection limits. Scale-to-zero and request-driven CPU
semantics require explicit tests for latency and background work.

### Google Kubernetes Engine

GKE follows the common Kubernetes gates. Autopilot is the leading GKE mode when
the workload satisfies its restrictions and the goal is to reduce node
operations; Standard is appropriate when the client needs node-level control,
special agents, or unsupported workload settings. Google manages Autopilot node
infrastructure, scaling, security defaults, repairs, and upgrades
([GKE Autopilot overview](https://cloud.google.com/kubernetes-engine/docs/concepts/autopilot-overview)).
Autopilot always enables Workload Identity Federation for GKE
([workload identity](https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity)).

Promotion must test the exact mode. Autopilot security restrictions can reject
workloads that run on Standard clusters; Standard transfers more node,
autoscaling, upgrade, and security responsibility to the operator. Neither mode
turns an untested generic chart into a Supported GKE profile.

### Google App Engine flexible

App Engine flexible is a compatibility candidate for an existing Google estate.
It supports .NET/custom container runtimes, managed VMs, health, autoscaling,
versioning, and traffic splitting
([flexible environment](https://cloud.google.com/appengine/docs/flexible/overview)).
Its `app.yaml`, version/service model, platform updates, network integration, and
deployment behavior form a provider-specific adapter. Cloud Run is normally the
clearer greenfield container target; select App Engine when client governance or
a required App Engine feature outweighs that additional legacy platform shape.

### Google edge and static UI equivalents

Cloud Load Balancing, Cloud CDN, Cloud Armor, Cloud DNS, Certificate Manager,
and a Cloud Storage or Firebase Hosting origin may compose the public edge and
static frontend. As with Azure and AWS, static React/Vue or standalone Blazor
WebAssembly can be separated from the API, while SSR and Blazor server remain on
Cloud Run, GKE, or another compute host. Treat Firebase-specific routing and
authentication as optional provider semantics, not as the MartiX UI contract.

## Generic managed Kubernetes

A generic Kubernetes output is valuable for clients with an established
OpenShift, Rancher-managed, VMware, sovereign-cloud, or other conforming
platform. It is a **family of candidates**, not one Supported environment.
Kubernetes API compatibility does not standardize ingress/Gateway controller,
load balancer, persistent storage, secret delivery, workload identity,
autoscaler, policy engine, service mesh, registry, or observability.

A portable base chart should use stable Kubernetes APIs and avoid a mandatory
cloud annotation. Provider overlays then bind these platform facilities. Each
admitted distribution/version needs a live conformance lane and a declared
responsibility matrix. A client-supplied cluster can be accepted as an external
prerequisite only when its SLO, upgrades, policies, supported APIs, incident
ownership, and test environment are contractually available.

## Generic VM, VPS, and client-managed process host

The cloud-neutral fallback applies the accepted process/container/Compose
runbooks to a client-managed Windows or Linux host. It maximizes placement
portability but transfers the largest responsibility set to MartiX or the client:
OS and runtime patching, reverse proxy, TLS, firewall, service manager, image
registry/runtime, backups, monitoring agent, capacity, host replacement, and
disaster recovery.

Define separate adapters for IIS, Windows Service, and systemd only where their
service account, shutdown, environment, logging, binding, and upgrade semantics
differ. Do not hide them behind one “VM provider.” The single-host Compose
support boundary remains unchanged in every cloud.

### Active24 Czech VPS candidate

The user has clarified that the current application uses a legacy shared
Windows hosting product, not a VPS, and that the product may no longer be sold
to new customers. That is current-state migration input rather than a future
Platform contract. Active24's current official VPS offering includes
an unmanaged KVM VPS, full Administrator/root control, Windows Server 2022 in
the current order selector, and current Debian/Ubuntu images. That makes an
Active24 Windows VPS credible for the accepted `process` artifact under IIS and
an Active24 Linux VPS credible—and preferred for the likely migration—for
systemd/nginx, OCI, or bounded single-host Compose. It does not make either
shape Supported without live evidence.

Ordinary Active24 shared hosting, including the currently advertised Linux
Smart family, is not an admissible MartiX backend target on
current public evidence: the documented control surface centers on
Apache/nginx, PHP, databases and restricted shell access, while a price-list
`Windows` add-on does not establish .NET 10 runtime control, IIS application-
pool policy, persistent workers, administrator access, migrations, WebSockets,
or operational ownership.

Active24 explicitly describes VPS as unmanaged. Its optional server-management
service currently does not provide complete Windows management, so the Windows
profile must assign guest OS and .NET servicing, IIS, firewall, TLS, access,
deployment, backups, monitoring, capacity and incident response to MartiX or
the client. Active24's free short-retention snapshot is an operational
checkpoint, not evidence of application-consistent backup, PITR, isolated
restore, RPO or RTO. Its additional NFS storage is documented for Linux and is
explicitly not recommended for Windows.

The exact product/contract must prove the .NET 10 Hosting Bundle or an accepted
self-contained servicing model, IIS lifecycle and `AlwaysRunning` behavior,
Quartz interruption recovery, SSE/WebSockets and proxy timeouts, immutable
deployment and honest single-host downtime, backup/restore, monitoring, SLA,
resource sizing and exit. Full current evidence and the provider-admission
checklist are recorded in
[the Active24 hosting variant research](120-active24-hosting-variant.md).

## Serverless functions are not drop-in general hosts

Azure Functions, AWS Lambda, and Google Cloud functions are event-execution
platforms. They are not alternate packaging switches for an arbitrary ASP.NET
Core modular monolith, Blazor server UI, Quartz scheduler, broker consumer, or
long-running HTTP application. Their trigger/binding model, execution lifetime,
concurrency, cold start, networking, local storage, scaling, retry, and delivery
semantics can change application behavior. For example, Azure requires a
Functions-specific hosting plan and runtime model
([Azure Functions hosting options](https://learn.microsoft.com/en-us/azure/azure-functions/functions-scale)).

A function profile is admissible only for a separately designed stateless
endpoint or event handler with:

- an explicit trigger contract and idempotency model;
- bounded execution and payload size;
- no reliance on in-process scheduling, local state, or sticky connection;
- provider retry/dead-letter behavior reconciled with MartiX Outbox/Inbox; and
- dedicated cost, scale, timeout, failure, local-emulation, and live-cloud tests.

Do not decompose a modular monolith into functions merely to claim serverless
readiness. Container-based function packaging also does not erase the provider's
execution contract.

## Aspire publication and deployment maturity

Aspire is a useful application-model source and artifact generator, but its
integration is not the MartiX production support boundary. Current Aspire
documentation distinguishes:

- `aspire publish`, which transforms an AppHost model into target artifacts
  with parameter placeholders; and
- `aspire deploy`, which resolves parameters and applies a target-specific
  deployment pipeline
  ([Aspire deployment overview](https://aspire.dev/deployment/)).

The current documentation lists publish/deploy integrations for Azure Container
Apps and Kubernetes, with Kubernetes output as Helm and AKS output adding Bicep;
it also documents Docker Compose and Azure App Service targets
([deployment pipeline](https://aspire.dev/deployment/deploy-with-aspire/),
[Kubernetes deployment](https://aspire.dev/deployment/kubernetes/)). These
capabilities are evolving integration surfaces, not evidence that every emitted
topology is production-complete.

MartiX should therefore:

1. pin the Aspire CLI and hosting-integration versions;
2. use `aspire publish` as a one-way, reviewable generation step where it
   produces suitable artifacts;
3. prevent `aspire deploy` from rebuilding a different production image when
   the release contract already identifies an immutable OCI digest;
4. commit a schema/template source or retain generated release artifacts and
   verify deterministic drift;
5. layer explicit IaC for resources, policies, private networking, identity,
   edge, backups, and controls not fully represented by AppHost;
6. scan, lint, policy-test, and live-test generated Bicep/Helm/Compose output;
7. permit a hand-maintained provider adapter when Aspire cannot express the
   accepted architecture without unsafe post-generation mutation; and
8. re-evaluate integration maturity at every supported Aspire upgrade.

The AppHost remains local orchestration and an optional deployment-model input.
It is never the production runtime, cloud control plane, secret authority, or
only recoverable copy of infrastructure.

## Decision matrix by client force

| Client force | First candidate to investigate | Why | Important disqualifier |
| --- | --- | --- | --- |
| Azure, ordinary .NET monolith, minimal operations | App Service code | Direct `process` fit and managed web platform | Needs arbitrary sidecars, protocols, or independently scaled workers |
| Azure, immutable container plus API/workers/jobs | Container Apps | Managed revisions, scaling, and finite jobs | Requires Kubernetes APIs/operators or unsupported networking/control |
| Azure, organization already operates Kubernetes | AKS | Fits established platform and policy plane | No platform team, one simple application, or no cluster-specific need |
| Azure/on-premises Windows integration | VM plus IIS/Windows Service | Full OS and legacy integration control | Client expects PaaS operations or automatic HA without funding it |
| User's current legacy shared Windows hosting | Preserve only during bounded migration | Avoids pretending an existing provider-controlled runtime is the new Platform target | New application, unsupported runtime, missing lifecycle controls, or product retirement requires migration |
| User wants to remain at Active24 after legacy Windows hosting | Active24 Linux VPS with systemd, OCI, or bounded Compose | Preserves provider relationship while gaining runtime/process control | Client expects shared-hosting simplicity, managed PaaS, HA, or provider-owned application operations |
| A real requirement still mandates Windows at Active24 | Active24 Windows VPS plus IIS | Provides the Administrator control required by the `process` profile | Windows is only historical preference, or operator responsibilities are unacceptable |
| Low-cost single host in any cloud | Bounded Compose on VM/VPS | Uses accepted single-host topology | HA, rolling rollout, autoscaling, or host-failure tolerance required |
| AWS, simple stateless HTTP application | App Runner | Lowest AWS service topology | Long-running worker, complex topology, or detailed network control |
| AWS, API plus workers and one-shot tasks | ECS/Fargate | Managed container scheduling without Kubernetes | Client mandates Kubernetes or needs Kubernetes ecosystem features |
| AWS, established Kubernetes platform | EKS | Kubernetes plus AWS identity/network integration | Kubernetes only as speculative future readiness |
| Google Cloud, HTTP/jobs/workers, minimal operations | Cloud Run | Managed container service with distinct workload roles | Unsupported runtime behavior or cluster-specific requirement |
| Google Cloud, established Kubernetes platform | GKE Autopilot then Standard | Managed Kubernetes spectrum | Workload violates Autopilot constraints or Kubernetes adds no value |
| Existing Beanstalk/App Engine estate | Existing platform adapter | Reuses client governance and skills | Greenfield with no platform dependency |
| Public global site/API | Add edge/CDN/WAF to chosen origin | TLS, caching, routing, WAF, global entry point | Treating edge as compute or as a substitute for origin HA |
| Independently released static React/Vue/Blazor WASM | Static origin plus CDN | Efficient immutable asset delivery | SSR/server interactivity or coupled release is required |
| Sovereign/on-premises Kubernetes | Generic chart plus tested overlay | Reuses client-operated cluster | Distribution facilities and responsibility are unspecified |
| Strict portability with small operations budget | App Service/ACA/Cloud Run-style managed host by required cloud | Application contract stays portable while operations stay managed | Requiring identical provider behavior or zero IaC adaptation |

There is no universally best cloud target. The correct target minimizes the sum
of application constraints, client governance, operational ownership, reliability
needs, security/compliance controls, available skills, and total cost of
ownership. “Enterprise” does not imply Kubernetes; “serverless” does not imply
cheaper; and “container” does not imply portable operations.

## UI placement matrix

| UI shape | Valid placement | Notes |
| --- | --- | --- |
| Blazor Web App with SSR/server interactivity | Same process/container host as ASP.NET Core or a separately scaled web host | Requires server lifecycle, connection and scale tests; static hosting alone is invalid |
| Blazor WebAssembly standalone | Static origin/CDN or ASP.NET Core host | Test SEO, startup, cache invalidation, API origin/CORS and authentication |
| React/Vue SPA | Static origin/CDN or ASP.NET Core host | Separate origin enables independent releases; same origin simplifies routing/auth |
| React/Vue static generation or prerender | Static origin/CDN | Strong public-site candidate; dynamic metadata and revalidation need explicit design |
| React/Vue SSR | Node-compatible process/container or accepted framework-specific managed runtime | Do not classify all React/Vue builds as static; health, cache and rollout apply to SSR host |

Fluent UI and semantic CSS do not constrain the cloud target. Rendering mode,
release coupling, authentication, SEO, and edge-cache behavior do.

## Stateful services and availability

No compute profile should host production database, broker, cache, or Object
Storage state on its ephemeral filesystem. Prefer separately selected managed
or client-operated capability providers with exact backup, point-in-time restore,
encryption, private networking, identity, capacity, regional availability, and
disaster-recovery evidence. Kubernetes StatefulSets and VM disks are not an
automatic substitute for a database operations capability.

For every target, prove:

- multi-instance safety and no process-local correctness dependency;
- database connection budgeting under autoscale and rollout overlap;
- provider outage, throttling, DNS, certificate, and credential rotation;
- region/zone failure behavior matching the declared SLO;
- restore into an isolated environment and application-level data validation;
- explicit RPO/RTO, dependency-region alignment, and failback procedure; and
- no rollback that starts old code against an incompatible migrated schema.

## Cost and operational assessment

Avoid durable numeric cost promises. Cost depends on region, tier, reservations,
traffic, egress, log volume, minimum replicas, build/storage, support plan, and
managed dependencies. Each promotion must produce at least three workload
estimates: normal, idle/minimum, and burst/failure-overlap. Validate them with
the official
[Azure pricing calculator](https://azure.microsoft.com/en-us/pricing/calculator/),
[AWS Pricing Calculator](https://calculator.aws/), and
[Google Cloud Pricing Calculator](https://cloud.google.com/products/calculator)
as applicable, followed by a measured preproduction run.

Relative operational tendency, before client platform capabilities are counted:

| Family | Platform operations | Typical lock-in | Hidden cost risks |
| --- | --- | --- | --- |
| Managed web PaaS | Low to medium | Medium | Always-on plan, shared-plan scaling, slots, network tiers |
| Managed container service | Medium | Medium to high | Minimum replicas, egress, logs, burst concurrency, connectors |
| Managed Kubernetes | High | Medium at workload API, high in platform integrations | Cluster baseline, nodes, ingress, observability, upgrades, specialists |
| VM / VPS | High | Low at application layer, medium in IaC/operations | Idle capacity, patching, backups, licenses, manual incident work |
| Static origin plus CDN | Low for static UI | Medium | Requests/egress, invalidation, WAF/log volume, multiple release paths |

Portability means retaining standard application contracts and immutable
artifacts while accepting thin, explicit deployment adapters. Avoid a lowest-
common-denominator cloud abstraction that hides identity, networking, rollout,
and failure semantics; it would reduce safety without eliminating IaC work.

## Promotion and admission gates

A cloud profile becomes `Supported` only after all of the following exist for
an exact provider, region class, service tier, runtime, and IaC toolchain:

1. **Accepted force:** at least one real client/application requirement and a
   written decision explaining why existing Supported profiles are insufficient.
2. **Artifact fidelity:** deployment consumes the attested `process` archive or
   OCI digest without rebuilding or mutable tags.
3. **Versioned IaC:** repeatable Bicep, Terraform, CloudFormation/CDK, or another
   accepted IaC implementation with linting, policy tests, preview/plan review,
   drift detection, and safe destroy protections.
4. **Identity:** separate deployment and runtime identities, least-privilege
   workload identity, registry access, no long-lived cloud key by default, and
   live rotation/revocation tests.
5. **Network and edge:** explicit ingress, TLS, DNS, WAF/CDN choice, private
   dependency access, egress control, forwarded-header trust, and origin
   restriction.
6. **Configuration and secrets:** validated parameter schema, provider-specific
   secret delivery and reload behavior, redaction canaries, and no secret in
   image, IaC state output, logs, health, or manifests.
7. **Lifecycle:** liveness/readiness/startup mapping, graceful shutdown, minimum
   capacity, autoscale bounds, downstream load protection, and cold-start tests.
8. **Delivery:** health-gated rollout, canary/slot/revision strategy where
   claimed, immutable promotion, automatic stop conditions, and rehearsed
   rollback that respects database compatibility.
9. **Migrations and jobs:** separately authorized one-shot migrations, mutual
   exclusion, evidence capture, finite-job semantics, and no duplicated Durable
   Job scheduler.
10. **Reliability:** zone/instance failure, platform maintenance, dependency
    outage, capacity exhaustion, backup/restore, regional recovery, and declared
    RPO/RTO tests proportional to the support claim.
11. **Observability:** standard OTLP path or documented alternative, platform
    logs/metrics correlation, bounded cost/cardinality, alerts, dashboards, and
    incident runbook.
12. **Security and supply chain:** image/package/IaC scanning, SBOM, provenance,
    signature verification where available, platform threat model, tenant/account
    isolation, and penetration/WAF validation for public profiles.
13. **UI evidence:** every claimed Blazor, React, and Vue rendering/deployment
    mode passes routing, authentication, caching, SEO where applicable, rollback,
    and independent/coupled release tests.
14. **Live-cloud CI:** disposable or isolated preproduction environment plus
    scheduled live tests. Emulator-only evidence is insufficient for identity,
    networking, scaling, rollout, and managed-service failure behavior.
15. **Operations:** ownership matrix, SLO/SLI, monitoring, on-call escalation,
    upgrade/deprecation tracking, quota/capacity review, cost model, backup,
    disaster recovery, and client handover documentation.
16. **Portability record:** provider-specific assumptions, exit path, data and
    DNS migration, artifact reuse, and the application changes actually needed
    to move to the closest alternative.

Passing these gates promotes only the tested profile. It does not promote every
tier, region, operating system, Kubernetes distribution, UI mode, or adjacent
cloud capability.

## Recommended future order

Retain the initial cloud-neutral `process`, `container`, and bounded `compose`
profiles. Document this investigation order without committing implementation:

1. **Azure App Service code** when the first Azure process-hosted application
   needs a managed target.
2. **Azure Container Apps** when independently scaled containers/workers/jobs or
   an OCI-only Azure requirement appears.
3. **Azure Front Door plus WAF** for a public multi-region, global, or
   edge-security requirement; use a simpler regional ingress when those forces
   are absent.
4. **Azure Static Web Apps or an equivalent static origin** only for an
   independently deployed static React/Vue/Blazor WebAssembly frontend.
5. **AKS** only for an explicit Kubernetes/client-platform requirement.
6. **AWS ECS/Fargate or Google Cloud Run** as the leading cross-cloud managed
   container additions when a real client requires that cloud.
7. **EKS/GKE/generic Kubernetes** only against a named operated platform.
8. **VM/IIS/systemd/Compose adapters** whenever client hosting constraints make
   managed PaaS unsuitable; retain their honest single-host or explicitly
   engineered multi-host support boundary.
9. **Active24 Linux VPS** as the user's preferred future Active24 migration
   candidate after exact-product admission, with **Active24 Windows VPS plus
   IIS** retained only when a Windows-specific force survives. Treat the legacy
   shared Windows product as migration input and Linux Smart as static/PHP
   hosting, not a .NET backend target, unless a written contract proves
   otherwise.

This order aligns likely Microsoft-oriented demand with KISS. It keeps all
alternatives discoverable and supplies client-triggered promotion paths without
preinstalling clouds, multiplying Generated Solution projects, or making
untested production claims.
