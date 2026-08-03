# Active24 hosting variant for ticket 120

## Research scope

Research date: **2026-07-19**.

This document evaluates Active24 Czech hosting as a future MartiX deployment
target. It is evidence for Wayfinder ticket 120, not a blanket support claim.
Only current first-party Active24 and Microsoft documentation was used. The
user has clarified that the existing application runs on a legacy shared
Windows hosting product, not a VPS, and believes that product may no longer be
sold to new customers. Its exact contract and runtime controls remain unknown;
the possible sales status is user-provided context rather than a verified
Active24 claim. Active24's public pages also omit several application-hosting
details. Those unknowns are therefore admission checks, not inferred
capabilities.

The short conclusion is:

- the user's **legacy shared Windows hosting** is current-state migration input,
  not an initial MartiX deployment target; preserve it only while its exact
  runtime remains supported and the existing application requires it;
- an **unmanaged Active24 Linux VPS** is the preferred Active24 migration target
  for systemd, an OCI container, or bounded single-host Compose;
- an **unmanaged Active24 Windows VPS** with Administrator access remains a
  credible alternative `process` host for ASP.NET Core under IIS, provided its
  exact contract permits installing the .NET 10 Hosting Bundle and all
  operational gates pass;
- ordinary Active24 shared webhosting is not currently admissible for a MartiX
  backend because the published specification documents PHP workers,
  Apache/nginx and tightly bounded shell access, but does not document ASP.NET
  Core, a selectable .NET runtime, IIS application-pool control, persistent
  workers, containers, or administrator access
  ([webhosting specification](https://www.active24.cz/webhosting/porovnani-parametru));
- neither a free 28-day VPS snapshot nor provider infrastructure availability
  replaces application-aware backup, restore, disaster recovery, monitoring,
  or rollback.

## Product families and verified facts

| Active24 family | Verified public facts | MartiX disposition |
| --- | --- | --- |
| Shared webhosting | The user's current application uses a legacy shared Windows product. The currently published stack is Apache/nginx, PHP, MariaDB/MySQL/PostgreSQL, WebAdmin and limited shell; the price list still names `Smart Windows` and `Super Windows` add-ons but does not define their runtime or control surface. | Existing legacy deployment only. `Not admitted` for a new ASP.NET Core backend until an exact contract proves every required capability; Linux Smart is not a .NET backend migration target on current public evidence. |
| Unmanaged VPS | Production-oriented KVM/OpenStack VPS, full root/Administrator access, one IPv4 and IPv6 address, selectable resources, snapshot, and current order page offering Windows Server 2022 or supported Debian/Ubuntu images. | `Candidate`: Linux `process`, `container`, or bounded `compose` is the preferred future Active24 path; Windows `process` remains a conditional alternative. |
| Managed server add-on | Active24 can manage updates, performance and security, but retains full root and grants selected `sudo`; it currently states that complete Windows management is not offered. | `Conditional`: primarily a Linux operations option; responsibility and deployment permissions must be contracted explicitly. |
| Dedicated server | Custom hardware/OS with full root/admin access, Linux and Windows options, and optional cross-datacenter arrangements. | `Deferred`: useful when VPS capacity, isolation, licensing or hardware requirements force it; does not by itself provide application HA. |

Active24 describes its VPS as an **unmanaged environment** with full
root/Administrator access and infrastructure/network monitoring, on KVM via
OpenStack
([server specifications](https://www.active24.cz/servery/specifikace)). Its
current VPS order page offers Windows Server 2022 only in the Custom selector,
while the general server-specification page still mentions Windows Server 2016
and 2019. This first-party inconsistency must be resolved against the actual
order and contract; no version should be hard-coded into a MartiX support claim
([VPS offering](https://www.active24.cz/servery/virtualni-privatni-servery),
[server specifications](https://www.active24.cz/servery/specifikace)).

The same order page currently lists Starter at 2 vCPU, 1 GB RAM and 24 GB SSD,
Standard at 4 vCPU, 4 GB RAM and 80 GB SSD, and Custom up to 16 vCPU, 32 GB RAM
and 1 TB SSD. The broader specification page publishes different maximums.
Sizing must therefore use a dated quote and measured workload, not a template
default. Current public prices are recurring subscription prices with monthly
and annual figures; Windows licensing, custom capacity, backup, storage,
monitoring, management, traffic and support terms must be priced from the exact
order or quote
([Active24 price list](https://www.active24.cz/cenik)).

Active24 advertises Czech support 24/7/365. A response within four hours is
mentioned only where agreed in the contract; it is not evidence of a four-hour
repair target, application availability SLO, RPO, or RTO
([VPS offering](https://www.active24.cz/servery/virtualni-privatni-servery),
[dedicated servers](https://www.active24.cz/servery/dedikovany-server)).

## Optional Windows VPS process profile

### Host shape

If Windows remains required, the admissible future Active24 Windows shape is a
VPS rather than the user's legacy shared hosting:

1. consume the attested MartiX `process` archive produced once by CI;
2. provision a supported Windows Server VPS with Administrator access;
3. install and pin the .NET 10 Hosting Bundle, which supplies the runtime and
   ASP.NET Core Module required by IIS, or deliberately publish self-contained
   when runtime independence is worth the larger artifact and servicing duty
   ([publish to IIS](https://learn.microsoft.com/en-us/aspnet/core/tutorials/publish-to-iis?view=aspnetcore-10.0));
4. run the web application in a dedicated IIS application pool, normally using
   the default in-process hosting model for its lower proxy overhead
   ([IIS in-process hosting](https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/iis/in-process-hosting?view=aspnetcore-10.0));
5. terminate public HTTPS at IIS or at an explicitly admitted external reverse
   proxy/edge, expose only required ports, and keep Kestrel or management ports
   non-public; and
6. deploy to versioned directories, run the separately authorized migration
   operation, health-check the new version, switch traffic/path atomically as
   far as the single-host platform allows, and retain a tested previous
   artifact for rollback.

Active24's Windows VPS guide confirms that the customer can manage Windows
Server roles, install IIS, and administer networking through the server, but it
does not document the ASP.NET Core Hosting Bundle, .NET 10, Web Deploy, supported
IIS modules, or automated certificate management
([Active24 Windows VPS guide](https://www.active24.cz/blog/jak-nastavit-vps-server)).
Those are operator responsibilities until the contract says otherwise.

### Durable Jobs and long-running work

IIS can host background work only after its lifecycle is configured and tested.
Microsoft documents `AlwaysRunning`, preload, disabling the in-process idle
timeout, and warns that a background-only out-of-process application should be
hosted as a Windows Service instead
([ASP.NET Core on IIS](https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/iis/?view=aspnetcore-10.0)).

For the MartiX modular monolith with relationally persisted Quartz jobs:

- the smallest valid Windows profile may run Quartz in the same IIS-hosted API
  process only when application-pool idle, recycle, preload, graceful shutdown,
  clock, database connectivity, recovery and deployment-interruption tests pass;
- job correctness must rely on Quartz persistence and idempotency, never IIS
  process continuity;
- a separately hosted Windows Service is a future operational split only when
  workload isolation or reliable always-on execution requires it. Microsoft
  confirms that ASP.NET Core can run as a Windows Service and start after
  reboot
  ([Windows Service hosting](https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/windows-service?view=aspnetcore-10.0)); and
- adding that service must not silently add a generated project. Reuse the
  accepted executable/host composition where feasible, or record a deliberate
  architecture change if a genuine independent worker is required.

Deployment intentionally interrupts a single-host application. The ASP.NET
Core Module uses `app_offline.htm` to request graceful shutdown and release
locked files, and open WebSockets can delay out-of-process shutdown
([App Offline behavior](https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/app-offline?view=aspnetcore-10.0)).
A zero-downtime claim therefore requires another independently serving host and
load balancer, not clever file copying on one VPS.

### WebSockets, SSE, ingress and TLS

Administrator control makes WebSockets and SSE technically plausible, not
automatically Supported. IIS requires the WebSocket Protocol role service for
WebSocket support
([IIS WebSocket configuration](https://learn.microsoft.com/en-us/iis/configuration/system.webserver/websocket)).
The exact Active24 network path must still prove:

- inbound 80/443, DNS and IPv4/IPv6 routing;
- TLS certificate issuance, renewal, cipher/protocol policy and emergency
  replacement;
- WebSocket upgrade and long-lived connection behavior through every firewall,
  reverse proxy and DDoS layer;
- SSE proxy buffering and idle timeouts;
- forwarded-header trust and preservation of scheme, host and client address;
- upload/body size and request/connection timeouts; and
- RDP restricted by source network/VPN or another managed access path rather
  than exposed broadly on port 3389.

Active24 publishes one IPv4 plus one IPv6 address for VPS and states that its
infrastructure includes DDoS protection, but it does not publish the
application-protocol limits above
([server specifications](https://www.active24.cz/servery/specifikace)).

## Preferred Linux VPS migration and exit profile

An unmanaged Active24 Linux VPS is the preferred migration target when the
legacy shared Windows product is retired, or when Windows cost,
licensing, platform support, automation, container operation, filesystem
integration, or full managed-service availability makes Windows unsuitable.
Active24 currently offers minimal Debian and Ubuntu images and full root access
([VPS offering](https://www.active24.cz/servery/virtualni-privatni-servery)).

Three shapes are possible after exact-provider admission:

- `process`: run the same framework-dependent or self-contained publish output
  behind nginx, with systemd responsible for startup, restart and logs.
  Microsoft's .NET 10 guidance explicitly describes Kestrel behind nginx and a
  systemd service for process supervision
  ([Linux with nginx](https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/linux-nginx?view=aspnetcore-10.0));
- `container`: run the immutable MartiX OCI image by digest under a pinned,
  supported container runtime; and
- `compose`: use the accepted single-host Compose topology only, with the same
  non-HA boundary, external secrets, resource limits, health dependencies,
  separately run migrations and stateful-service runbooks defined by ticket
  120.

Active24 does not publicly document or support-claim Docker Engine, the Compose
plugin, a container registry, image scanning, a host firewall baseline, or a
container operations service. Root access makes customer installation feasible,
but MartiX must validate the exact OS/runtime versions, Active24 terms,
networking, disk driver, cgroups, automatic updates and reboot policy before
calling `container` or `compose` Supported.

Active24's optional full server-management service currently covers common
Linux distributions but not complete Windows management. Under that service,
Active24 retains full root and grants selected `sudo`, so the release pipeline,
container runtime, agent installation and emergency-access permissions must be
agreed before selecting it
([server management](https://www.active24.cz/sprava-serveru)).

## Data, storage, backup and recovery

Shared hosting advertises MariaDB 11.4, MySQL 8.4 and PostgreSQL 14 with a
recommended 2 GB maximum database size; this does not establish network access,
extensions, administrative control, backup/RPO, connection limits or suitability
for MartiX EF Core migrations
([webhosting specification](https://www.active24.cz/webhosting/porovnani-parametru)).
For VPS, no bundled database service is documented. A database may be operated
on the same VPS only for an explicitly accepted low-cost single-host profile;
it shares the application's failure, capacity and maintenance domain.

The VPS includes one manual snapshot slot whose image can be retained for up to
28 days. Treat it as a short-lived operational checkpoint, not a database
backup: the public page does not promise application consistency, transaction
consistency, offsite independence, retention automation, granular restore,
RPO/RTO, or protection from operator/account compromise
([VPS snapshot](https://www.active24.cz/servery/virtualni-privatni-servery)).

Active24 separately offers cross-datacenter backups as part of server services,
but schedule, retention, encryption, immutability, restore scope, restore time,
egress and price require a contract
([server management and backup](https://www.active24.cz/sprava-serveru)). Its
extra storage uses NFS for Linux and is explicitly not recommended for Windows;
it is synchronously backed up daily and asynchronously replicated to a second
datacenter according to the published specification
([extra storage](https://www.active24.cz/servery/storage),
[server specifications](https://www.active24.cz/servery/specifikace)). It is not
an automatic substitute for the accepted Azure Blob Object Storage provider or
an S3-compatible application contract.

Every admitted profile requires:

- application-consistent database backups and transaction-log/PITR strategy
  where supported;
- a separate encrypted backup security boundary with least-privilege write and
  restore access;
- documented retention, deletion, legal/privacy and ransomware controls;
- automated backup monitoring plus scheduled restore into an isolated
  environment;
- validation of recovered data through the application, not merely a successful
  disk restore; and
- declared RPO, RTO, host-rebuild and provider-outage runbooks.

## Monitoring, security and responsibility

Active24's optional external monitoring uses an agent, publishes system and
selected application/web checks, collects data every minute, retains history
and sends notifications. The provider page does not state telemetry retention,
SLO evaluation, alert escalation, API/export, OTLP support, or application trace
correlation
([monitoring](https://www.active24.cz/servery/monitoring),
[server specifications](https://www.active24.cz/servery/specifikace)). Use it as
host/external availability evidence alongside, not instead of, MartiX OTLP
telemetry and application SLOs.

For an unmanaged VPS, Active24 owns the physical facility, virtualization and
provider network. The MartiX operator or client owns at least the guest OS,
patching, .NET/runtime, IIS/nginx, container runtime, firewall rules, TLS,
accounts, secrets, application, database, backups, monitoring, capacity,
incident response and deployment. Active24 explicitly labels VPS unmanaged
([server specifications](https://www.active24.cz/servery/specifikace)).

Minimum security posture:

- support-tracked OS and .NET servicing with a tested reboot/redeploy cadence;
- least-privilege application identity, separate deployment identity and no
  interactive Administrator service account;
- RDP/SSH restricted by allowlist, VPN or bastion, with MFA where the access
  plane permits it, key/certificate authentication for automation and audited
  break-glass access;
- deny-by-default guest firewall and only required public ports;
- externally supplied secrets, encrypted storage/backup, key rotation and
  secret-canary tests;
- malware/EDR and vulnerability policy appropriate to the application threat
  model, plus SBOM/provenance verification before deployment;
- independent uptime, certificate, disk, memory, CPU, application health,
  dependency, backup and job-liveness alerts; and
- quarterly restoration and at least annual provider-exit rehearsal for
  important applications.

## Unknowns that require exact-product verification

Do not infer any of these from the Active24 brand or `Windows` label:

1. the exact name, generation, Windows/.NET runtime, resource limits,
   datacenter, lifecycle status and contract of the user's legacy shared
   Windows product;
2. Administrator/root access and whether Active24 or the customer owns guest
   patching;
3. permission to install .NET 10 Hosting Bundle, IIS modules, system services,
   agents, Docker Engine and Compose;
4. supported .NET/ASP.NET Core runtime versions, runtime servicing cadence and
   self-contained deployment policy;
5. IIS application-pool control, `AlwaysRunning`, preload, recycle schedule,
   Web Deploy or alternate atomic deployment access;
6. SFTP/SCP/WinRM/Web Deploy/RDP/SSH access, CI source ranges, outbound registry
   access and immutable-artifact transfer;
7. public and private ports, firewall/DDoS proxy behavior, WebSockets, SSE,
   HTTP/2/3, upload sizes, request and idle timeouts;
8. TLS automation and whether certificates may be managed through ACME or a
   client-owned certificate system;
9. database products, versions, administrative rights, extensions, connection
   limits, network encryption, backups, PITR and restore SLA;
10. disk IOPS/latency, host maintenance, noisy-neighbor policy, quotas and
    vertical-resize interruption;
11. snapshot and backup consistency, schedule, retention, encryption,
    immutability, datacenter separation and tested restore time;
12. monitoring retention, alert channels, escalation, logs/API, custom checks
    on Windows and integration with the client's incident process;
13. availability SLA, service credits, maintenance notification, incident
    response/repair objectives and support escalation;
14. data location, subprocessors, contractual security/compliance evidence and
    exit/data-deletion terms; and
15. Windows Server and other license charges, traffic/egress, IPv4, storage,
    backup, monitoring, management and support costs after promotional periods.

## Provider admission checklist

An exact Active24 profile becomes `Supported` only after all items pass:

- [ ] A named Active24 product, OS image/version, resource size, contract and
      responsibility matrix are frozen for the evidence run.
- [ ] The host consumes the attested `process` archive or OCI digest without a
      target-side source rebuild.
- [ ] Repeatable provisioning/configuration establishes OS hardening, accounts,
      firewall, runtime, host, TLS, directories, permissions and monitoring;
      drift can be detected and repaired.
- [ ] .NET 10 runtime/Hosting Bundle or self-contained servicing is proven, and
      the exact IIS/systemd/container lifecycle passes reboot, crash, idle,
      recycle, update and graceful-shutdown tests.
- [ ] HTTP, HTTPS, WebSockets and SSE pass through the real Active24 network
      path where claimed; forwarded headers and client IP trust are safe.
- [ ] Configuration/secrets follow the accepted external-injection contract and
      no secret appears in artifact, script output, logs, health or evidence.
- [ ] Migrations are a separately authorized, mutually exclusive one-shot
      operation with evidence and backward-compatible rollout rules.
- [ ] Quartz jobs survive process interruption and execute idempotently; no
      deployment relies on continuous IIS process lifetime.
- [ ] Immutable version retention, health-gated promotion and rollback are
      rehearsed, including the honest downtime window of a single host.
- [ ] Database, file and Object Storage placement is explicit; backup and
      isolated restore meet declared RPO/RTO.
- [ ] Active24 host monitoring and MartiX OTLP application telemetry compose
      into actionable alerts, dashboards and incident ownership.
- [ ] Patch, vulnerability, access, certificate, capacity, cost, support and
      provider-deprecation runbooks have named owners.
- [ ] Host loss and rebuild from code, artifacts, configuration and backups are
      rehearsed without undocumented manual state.
- [ ] The Windows-to-Linux and Active24-to-another-provider exit path is tested
      proportionately to application criticality.

Passing the Windows IIS profile does not promote Linux, containers, Compose,
shared hosting or every Active24 VPS size. Each shape has separate evidence.

## Portability and exit path

Active24 remains a thin hosting adapter. Business Modules, HTTP contracts,
EF Core mappings, capability contracts and UI architecture do not reference
Active24, IIS, Windows, systemd or Docker. The application uses standard
configuration, health endpoints, graceful shutdown, OTLP and the accepted
database/provider contracts.

A Windows-to-Linux migration therefore changes deployment and operations, not
Business Module behavior:

1. build both supported `win-x64`/portable and Linux or OCI release artifacts
   from the same source and evidence model;
2. provision the Linux VPS or another provider from repeatable configuration;
3. restore or replicate state through provider-independent database/Object
   Storage procedures and validate it at application level;
4. run compatibility and load tests behind nginx/systemd or the admitted
   container profile;
5. lower DNS TTL, quiesce or synchronize final writes, run the authorized
   migration/cutover, health-check and switch DNS/edge traffic;
6. retain the old host read-only for the bounded rollback window without
   allowing split-brain writes; and
7. revoke credentials, export evidence, securely delete provider data and close
   the old contract after rollback expiry.

The same sequence supports an exit from Active24 to another Windows/Linux VPS,
Azure VM, managed process host or managed container platform. Provider-specific
scripts, firewall rules, TLS automation, backup transport and monitoring agents
are replaceable deployment assets. They must never leak into domain contracts.

## Recommendation for ticket 120

Record the user's **legacy shared Active24 Windows hosting** as current-state
migration input only. Do not use it as the target contract for new MartiX
applications and do not assume that Active24 Linux Smart can replace it: the
current Linux shared-hosting documentation does not establish the ability to
run a custom ASP.NET Core/.NET 10 process, persistent background work, the
Migrator, or the accepted operational controls.

Record **Active24 Linux VPS** as the preferred future Active24 target for:

- nginx plus systemd `process` hosting;
- a single immutable OCI `container`; or
- the already bounded, non-HA single-host `compose` profile.

Retain **Active24 Windows VPS plus IIS** as an alternative when a Windows-
specific requirement remains. Promote either exact VPS only after the admission
checklist proves runtime installation/control, background lifecycle, protocol
path, release/rollback, backup/restore, security, monitoring and contractual
responsibilities.

Reject ordinary shared hosting for MartiX application backends unless Active24
supplies product-specific written evidence that overturns the missing runtime,
process, deployment and operational capabilities. Even then it would require a
separate restricted-host admission lane; a `Windows` price-list add-on alone is
not sufficient evidence.
