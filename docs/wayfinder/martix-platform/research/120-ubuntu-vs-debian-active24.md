# Ubuntu versus Debian for an Active24 Linux VPS

## Research scope

Research date: **2026-07-19**.

This document compares the Linux images currently offered for an Active24 VPS
as a future MartiX .NET 10 backend host. It supports Wayfinder ticket 120; it
does not by itself promote any Active24 profile to `Supported`.

Only first-party sources from Active24, Canonical/Ubuntu, Debian, Microsoft,
Docker and the relevant upstream projects are used. Image contents and provider
catalogues can change without preserving a MartiX contract. Every provisioned
host therefore needs to record the exact image identifier, installation date,
package sources and post-provision evidence rather than relying only on a
marketing label such as `Ubuntu 24.04`.

## Accepted decision after deployment-timing clarification

The user selected **Active24 Ubuntu 26.04 LTS minimal** as the future production
target because the first production deployment is planned for a later date,
not during the release's July 2026 early-adoption window.

This supersedes Ubuntu 24.04 as the intended default but does not remove the
research gates. Ubuntu 26.04 must not receive a MartiX Supported claim until
26.04.1 is available and the exact fresh Active24 image passes the complete
admission suite in this document. Ubuntu 24.04 remains the safe fallback if a
deployment is required before those gates pass. Debian 13 remains the client-
driven alternative.

**Reason for the override:** selecting the mature 24.04 line was the lowest-risk
answer for an immediate deployment on the research date. Given a later real
deployment, 26.04 can complete its initial stabilization and evidence run while
providing standard security maintenance through May 2031 and avoiding an
unnecessarily early future OS replacement. This is a timing-based decision,
not a relaxation of quality or a general rule to choose the newest OS.

## Original evidence-first recommendation

Adopt **Active24 Ubuntu 24.04 LTS minimal base** as the initial MartiX Linux VPS
reference target.

This is a deliberately time-bounded choice, not a claim that Ubuntu is
universally better than Debian:

- Active24 explicitly offers a clean minimal Ubuntu 24.04 image, while its
  Debian choices do not describe whether the supplied image is minimal
  ([Active24 VPS catalogue](https://www.active24.cz/servery/virtualni-privatni-servery)).
- Ubuntu 24.04 has been in production since April 2024 and the current release
  catalogue lists 24.04.4; its standard security maintenance continues through
  May 2029
  ([Ubuntu releases](https://wiki.ubuntu.com/Releases)).
- Microsoft lists .NET 10 as supported on Ubuntu 24.04. The ASP.NET Core 10
  runtime is in Ubuntu's built-in feed, and Microsoft recommends the Ubuntu
  feed rather than mixing package sources
  ([.NET on Ubuntu](https://learn.microsoft.com/en-us/dotnet/core/install/linux-ubuntu-decision)).
- Docker currently supports both Ubuntu 24.04 and 26.04, so choosing the mature
  LTS does not block the `container` or bounded `compose` profiles
  ([Docker Engine on Ubuntu](https://docs.docker.com/engine/install/ubuntu/)).
- Ubuntu loads AppArmor by default. That supplies an explicit mandatory-access-
  control baseline which can be verified and retained during provisioning
  ([Ubuntu AppArmor](https://documentation.ubuntu.com/server/how-to/security/apparmor/)).

**Debian 13 is a fully credible, client-driven alternative**, not a lower-
quality fallback. Select it when the client already standardizes and operates
Debian, requires its package-policy model, or wants .NET from Microsoft's Debian
package feed. Microsoft supports .NET 10 on Debian 13, Docker supports Debian
13, and Debian 13 has regular support to August 2028 followed by LTS to June
2030
([.NET on Debian](https://learn.microsoft.com/en-us/dotnet/core/install/linux-debian),
[Docker Engine on Debian](https://docs.docker.com/engine/install/debian/),
[Debian 13 lifecycle](https://www.debian.org/releases/trixie/)).

Do **not** select Ubuntu 26.04 as the default on this research date even though
it is already an LTS release and both .NET 10 and Docker officially support it.
It was released on 23 April 2026 and its first point release is still scheduled
for August 2026. Ubuntu's own server guidance makes LTS-to-LTS upgrades generally
available only after the new LTS's first point release
([Ubuntu 26.04 release notes](https://documentation.ubuntu.com/release-notes/26.04/),
[Ubuntu release catalogue](https://wiki.ubuntu.com/Releases),
[Ubuntu release upgrade guidance](https://documentation.ubuntu.com/server/how-to/software/upgrade-your-release/)).
The extra support horizon is valuable, but it does not justify making a
three-month-old base the first MartiX production baseline before the exact
Active24 image and all dependencies complete an evidence run.

Promote **Ubuntu 26.04 LTS minimal** after 26.04.1 is available and the admission
suite below passes on a fresh Active24 VPS. Prefer replacement/reprovisioning
over an in-place upgrade for the first promotion. Keep Ubuntu 24.04 supported
for an explicit migration window rather than switching existing hosts
automatically.

## Candidate comparison

| Active24 choice | Upstream status on 2026-07-19 | .NET 10 and Docker | MartiX disposition |
| --- | --- | --- | --- |
| Ubuntu 24.04 minimal | LTS; standard maintenance through May 2029; current catalogue includes 24.04.4 | .NET 10 from built-in Ubuntu feed; Docker officially supports Noble | **Initial reference target** |
| Ubuntu 26.04 minimal | LTS released 23 April 2026; standard maintenance through May 2031; 26.04.1 scheduled for August 2026 | .NET 10 from built-in Ubuntu feed; Docker officially supports Resolute | **Next target after promotion gates** |
| Debian 13 | Current stable; 13.6 released 11 July 2026; regular support to August 2028 and LTS to June 2030 | .NET 10 from Microsoft feed; Docker officially supports Trixie | **Supported candidate when client-driven and separately attested** |
| Debian 12 | Oldstable; regular support ended July 2026; LTS to June 2028 | .NET 10 and Docker still officially documented | **Migration-only; reject for new hosts** |
| Debian 11 | Oldoldstable; LTS ends August 2026 | Not in the current Microsoft .NET 10 supported Debian table | **Reject** |
| Ubuntu LAMP/LEMP | Provider image adds Apache or nginx, MariaDB and PHP with provider-selected versions | Unrelated stack does not establish .NET support | **Reject; use a minimal image** |

Lifecycle facts above come from the current
[Ubuntu release catalogue](https://wiki.ubuntu.com/Releases),
[Debian releases table](https://www.debian.org/releases/), and
[Active24 VPS catalogue](https://www.active24.cz/servery/virtualni-privatni-servery).
Debian announced on 12 July 2026 that Debian 12 regular support had ended and
recommended upgrading to Debian 13 where possible
([Debian 12 LTS handover](https://www.debian.org/News/2026/20260712)).

## Evidence by decision factor

### .NET runtime and package provenance

All three forward-looking candidates can run a framework-dependent ASP.NET
Core 10 application:

- Ubuntu 24.04 and 26.04 contain `aspnetcore-runtime-10.0` in their built-in
  Ubuntu feeds. Canonical publishes and supports those builds; Microsoft no
  longer publishes .NET packages for Ubuntu 24.04 and later. Mixing the Ubuntu
  and Microsoft .NET feeds is explicitly discouraged
  ([Microsoft's Ubuntu decision guide](https://learn.microsoft.com/en-us/dotnet/core/install/linux-ubuntu-decision)).
- Debian 13 uses Microsoft's signed Debian package repository and installs the
  same package name, `aspnetcore-runtime-10.0`. Debian 12 remains technically
  supported by the current Microsoft table but is already oldstable/LTS, so a
  new deployment would buy an avoidable OS migration
  ([Microsoft's Debian installation guide](https://learn.microsoft.com/en-us/dotnet/core/install/linux-debian)).
- A runtime-only production host should not install the .NET SDK. The SDK
  remains in CI; the VPS consumes an attested `dotnet publish` archive or OCI
  image.
- Framework-dependent deployment uses the distribution's selected .NET feed
  and receives runtime servicing through APT. Self-contained deployment moves
  runtime servicing into the MartiX release artifact. This is an artifact-policy
  decision, not a reason to select a distribution.

.NET 10 is an LTS release whose Microsoft support ends on 14 November 2028, and
supported installations must remain current on patch releases
([.NET support policy](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core)).
The OS's longer lifecycle does not permit running an unsupported MartiX runtime;
the application must upgrade to a later accepted .NET version before .NET 10
ends support.

### Security maintenance and update behavior

Ubuntu LTS and Debian stable both apply conservative stable-release policies.
Ubuntu's SRU process requires justification, verification and regression
controls; Debian stable generally uses minimal backported changes and treats
its stable archive as quasi-static
([Ubuntu SRU process](https://documentation.ubuntu.com/sru/en/latest/),
[Debian package management](https://www.debian.org/doc/manuals/debian-reference/ch02)).
There is no primary-source basis here for declaring either distribution
inherently more stable.

The operational differences relevant to MartiX are:

- Ubuntu installs `unattended-upgrades` by default and applies security updates
  daily. Automatic reboot is disabled by default and must be governed
  explicitly
  ([Ubuntu automatic updates](https://documentation.ubuntu.com/server/how-to/software/automatic-updates/)).
- Debian supports the same `unattended-upgrades` mechanism, but the exact
  Active24 image may omit or disable it. Provisioning must install, configure
  and test it rather than assume its state
  ([Debian security information](https://www.debian.org/security/),
  [Debian periodic updates](https://wiki.debian.org/PeriodicUpdates)).
- Neither profile may reboot unpredictably. Apply security packages promptly,
  report failures and `reboot-required`, then perform health-gated reboots in a
  declared maintenance window. A single VPS necessarily has downtime during a
  host reboot; high availability needs another host and traffic control.
- Major OS upgrades are supervised release operations, not unattended package
  updates. Ubuntu supports only sequential LTS upgrades and Debian likewise
  requires the applicable release notes; both require backups, capacity and
  explicit downtime planning
  ([Ubuntu release upgrades](https://documentation.ubuntu.com/server/how-to/software/upgrade-your-release/),
  [Debian 13 upgrade notes](https://www.debian.org/releases/stable/release-notes/upgrading.en.html)).

Ubuntu has the longer no-subscription standard-maintenance runway among the
initial choices. Ubuntu 24.04 reaches May 2029, Ubuntu 26.04 reaches May 2031,
while Debian 13 transitions from regular support to its LTS team after August
2028 and completes LTS in June 2030. Debian LTS is valid support, but package and
architecture coverage must still be checked; the project explicitly notes that
the supported architecture set is reduced during LTS
([Debian 13 lifecycle](https://www.debian.org/releases/trixie/)).

### Docker Engine and Compose

Docker officially lists Ubuntu 24.04, Ubuntu 26.04, Debian 13 and Debian 12 as
supported installation targets. Its APT repositories supply Docker Engine,
containerd, Buildx and the Compose plugin for each relevant distribution
([Docker on Ubuntu](https://docs.docker.com/engine/install/ubuntu/),
[Docker on Debian](https://docs.docker.com/engine/install/debian/),
[Compose plugin](https://docs.docker.com/compose/install/linux/)).

This is functional parity, not permission to use an unpinned install script:

- use Docker's signed APT repository and pin an attested package set;
- do not use Docker's convenience script in production; Docker documents it as
  a development/testing path with limited version control;
- do not add ordinary users to the root-equivalent Docker control surface
  without an explicit threat model;
- verify firewall behavior because Docker warns that published ports can bypass
  `ufw`/`firewalld`, and enforce policy in the supported packet-filter path; and
- verify the `docker-default` AppArmor profile where containers are enabled.
  Docker creates that container profile automatically when AppArmor is loaded
  ([Docker AppArmor](https://docs.docker.com/engine/security/apparmor/)).

The distribution choice therefore does not decide whether MartiX uses the
`process`, `container`, or bounded `compose` profile. A small application can
prefer nginx plus systemd and avoid an additional container daemon attack
surface; a topology requiring packaged dependencies can use the accepted OCI
and Compose profiles after their own admission checks.

### AppArmor and host hardening

Ubuntu's clear advantage is a documented, enabled-by-default AppArmor baseline.
Starting with Ubuntu 24.04, AppArmor is integrated into the Ubuntu kernel and
requires an explicit kernel parameter to disable fully
([Ubuntu AppArmor](https://documentation.ubuntu.com/server/how-to/security/apparmor/)).

Debian's standard kernel supports AppArmor, but Debian documentation describes
enabling the userspace and profiles by installing the relevant packages. The
Active24 Debian image must therefore prove its actual state; absence of enabled
profiles is not an acceptable silent difference
([Debian AppArmor](https://www.debian.org/doc/manuals/debian-handbook/sect.apparmor.en.html)).

AppArmor presence alone is not full confinement. The admission evidence must
list loaded/enforced profiles, exercise the application and container paths,
and fail if a required profile silently enters complain or disabled mode.

### systemd, nginx and operational tooling

All candidates use systemd and can host Kestrel behind nginx. The MartiX service
unit and nginx configuration must be owned by reproducible provisioning rather
than inherited from the provider image. Microsoft's Linux hosting guidance
uses nginx as reverse proxy and systemd as process supervisor for ASP.NET Core
([ASP.NET Core on Linux with nginx](https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/linux-nginx?view=aspnetcore-10.0)).

Active24 calls its VPS an unmanaged environment with full root access. Its
optional management service explicitly covers both Debian and Ubuntu, while
the customer continues to own application code
([Active24 server specification](https://www.active24.cz/servery/specifikace),
[Active24 server management](https://www.active24.cz/sprava-serveru)).
The provider therefore gives neither candidate a documented managed-service
advantage. If Active24 will manage the server, the contract must identify the
exact supported release, patch/reboot responsibility, permitted `sudo`
operations, nginx/.NET/Docker ownership and response objectives.

Microsoft and Docker publish current, version-specific installation pages for
both Ubuntu and Debian. Ubuntu has the extra integration of .NET in its built-in
archive and more explicitly documented default AppArmor posture. These are
verifiable operational conveniences; this research does not use unmeasured
claims about popularity or a supposedly larger ecosystem.

### Footprint and reproducibility

Do not select a distribution from folklore such as “Debian is always smaller.”
Active24 documents `minimal base, clean installation` for Ubuntu but publishes
no package manifest or analogous qualifier for Debian. The actual installed
packages, enabled units, disk use, listening sockets and memory after boot must
be captured from each dated image before any footprint comparison is valid.

Ubuntu 24.04's official release notes do document a reduced minimal cloud-image
package count, but that is not evidence that Active24 uses the same cloud image
or that it is smaller than Active24's Debian image
([Ubuntu 24.04 release notes](https://documentation.ubuntu.com/release-notes/24.04/)).

Reproducibility comes from treating the provider image as a narrow bootstrap:

1. record the Active24 image selection and initial `/etc/os-release`;
2. patch it before exposure to application traffic;
3. apply idempotent, version-controlled provisioning;
4. record repository definitions, signing-key fingerprints and installed
   package versions;
5. verify systemd units, AppArmor, firewall, users, filesystem permissions and
   listening sockets; and
6. prove that a fresh VPS can be rebuilt from artifacts, external configuration
   and restored data without undocumented manual state.

## Reject LAMP and LEMP provider images

Active24 offers LAMP and LEMP variants for Ubuntu 24.04 and 26.04. They include
Apache or nginx plus MariaDB and PHP versions selected by Active24
([Active24 VPS catalogue](https://www.active24.cz/servery/virtualni-privatni-servery)).

Reject both for a MartiX backend:

- PHP and the bundled database are not MartiX runtime dependencies;
- LAMP installs a second web server when the accepted Linux `process` profile
  calls for nginx;
- LEMP includes a useful nginx binary but also installs unrelated PHP and
  MariaDB packages, services, configuration and patch obligations;
- the prebuilt stack obscures the desired ports, accounts, database placement,
  configuration history and version-selection evidence; and
- removing an unknown preset is less reproducible than installing only the
  admitted packages onto a clean minimal base.

Start from the minimal image, then install and configure nginx, the ASP.NET Core
runtime, telemetry/monitoring agents and optionally Docker through the accepted
provisioning source. If a client requires Apache or a locally operated database,
admit that as an explicit profile rather than inheriting it accidentally.

## Provisioning and hardening checklist

An implementation ticket should turn this policy into idempotent automation.
An exact Active24 Ubuntu or Debian host becomes admissible only when all items
pass.

### Image and supply chain

- [ ] Select a minimal Active24 image; record distribution, version, image ID or
      provider label, creation time, architecture and initial package manifest.
- [ ] Confirm the release remains supported by its distributor, Microsoft .NET
      and every required third-party agent.
- [ ] Configure only first-party distribution repositories plus explicitly
      admitted, signed vendor repositories. Store signing keys in dedicated
      keyrings, never use deprecated global trust or an unaudited download
      script.
- [ ] Pin an attested .NET runtime and, if applicable, Docker/Compose package
      set. Never mix Ubuntu and Microsoft .NET feeds.
- [ ] Apply all security updates before opening public ingress and capture the
      resulting package inventory as release evidence.

### Identity and remote administration

- [ ] Disable direct remote root login and password authentication after a
      tested key-based administrative path exists.
- [ ] Use named operator identities, least-privilege `sudo`, a separately scoped
      deployment identity and an audited break-glass path.
- [ ] Restrict SSH to a client-controlled allowlist, VPN or bastion where
      feasible; rate limiting is defense in depth, not the primary access rule.
- [ ] Remove or lock provider/image accounts and keys that are not required.
- [ ] Synchronize time and verify the timezone/UTC policy needed by logs,
      certificates, Quartz and audit evidence.

### Network and reverse proxy

- [ ] Establish deny-by-default inbound policy; expose only the admitted SSH
      path and public 80/443 endpoints.
- [ ] Bind Kestrel and management endpoints only to the intended local/private
      interface; never expose them accidentally beside nginx.
- [ ] Configure nginx TLS, forwarding, request limits, timeouts, WebSockets/SSE
      behavior and trusted proxy boundaries from version control.
- [ ] Automate certificate issuance, renewal monitoring and emergency
      replacement; test expiry alerts.
- [ ] If Docker is installed, verify actual nftables/iptables and `DOCKER-USER`
      behavior from an external host; do not assume `ufw` protects published
      container ports.

### Process and filesystem isolation

- [ ] Run the MartiX application as a dedicated non-login user with no root,
      `sudo` or Docker-socket access.
- [ ] Grant write access only to declared runtime directories; keep executable,
      configuration and release directories owned by deployment/root identities.
- [ ] Harden the systemd unit with the least privilege compatible with verified
      application behavior; set restart, startup timeout, graceful shutdown,
      environment-file/credential and resource-limit policy explicitly.
- [ ] Verify AppArmor is loaded and required profiles are enforced. Record and
      review every local exception rather than disabling the LSM globally.
- [ ] Disable and remove unnecessary services/packages; compare listening
      sockets and enabled units with the approved baseline.

### Updates, reboot and lifecycle

- [ ] Enable security-update automation from approved origins and alert when it
      fails or packages are held back.
- [ ] Disable uncontrolled automatic reboot; monitor `reboot-required`, schedule
      a maintenance window and health-check the complete application after boot.
- [ ] Patch .NET to the latest supported servicing release and prove the running
      runtime version after every maintenance cycle.
- [ ] Define an OS replacement/upgrade date before the earliest relevant OS,
      .NET or third-party dependency support deadline.
- [ ] Rehearse rebuilding a fresh VPS and switching/rolling back traffic instead
      of treating an in-place distribution upgrade as the only recovery path.

### Application operations

- [ ] Deploy the immutable `process` archive or OCI digest produced by CI; never
      compile source on the VPS.
- [ ] Inject configuration and secrets externally, validate on startup and prove
      that logs, process arguments, environment inspection and evidence do not
      disclose them.
- [ ] Run database migrations as the separately authorized, mutually exclusive
      one-shot operation accepted by ticket 120.
- [ ] Prove health, graceful shutdown, rollback, Quartz interruption/recovery,
      backup, isolated restore and full host-loss rebuild.
- [ ] Export MartiX telemetry through OTLP and compose it with external host,
      disk, certificate, backup and uptime monitoring.
- [ ] Record owner, RPO/RTO, maintenance window, dependency inventory,
      vulnerability response, capacity thresholds and provider escalation.

## Admission tests for each candidate

Passing Ubuntu 24.04 does not automatically pass Ubuntu 26.04 or Debian 13.
Run the same target-specific test suite on each exact image:

1. provision twice from a clean VPS and assert idempotence plus no configuration
   drift;
2. verify the .NET package origin, latest patch and application startup;
3. validate nginx HTTP/1.1, HTTP/2, TLS, forwarded headers, upload limits,
   WebSockets and SSE through the real Active24 network path where claimed;
4. crash, stop, restart and reboot the host while requests and durable jobs are
   active; verify graceful behavior, persisted recovery and idempotency;
5. apply representative security, kernel, nginx, .NET and Docker updates,
   including a required reboot, then rerun health and compatibility tests;
6. scan the host and artifact, inventory open ports and enabled services, inspect
   AppArmor denies/profiles, and resolve every unexplained deviation;
7. exhaust disk/memory/CPU within safe test bounds and prove alerts, service
   limits and recovery;
8. restore application state into a fresh replacement VPS and cut over using
   only documented artifacts, configuration and backups; and
9. capture duration, downtime, operator decisions and rollback evidence so the
   support claim is reproducible.

Promote Ubuntu 26.04 only after its first point release is available, Active24's
minimal image is rebuilt or fully patched, the exact .NET/Docker/monitoring
package sources are current, all tests above pass, and no unresolved release
note affects the MartiX profiles. The current 26.04 release notes already record
system-level changes such as removal of cgroup v1 support; container admission
must explicitly verify cgroup v2 rather than assuming compatibility
([Ubuntu 26.04 changes](https://documentation.ubuntu.com/release-notes/26.04/changes-since-previous-interim/)).

## Client-driven selection rules

Choose **Ubuntu 24.04 minimal** when there is no client standard and deployment
happens before Ubuntu 26.04 completes its promotion. It is the lowest-risk
initial MartiX baseline because its exact Active24 minimal image, mature point
release line, built-in .NET 10 packaging and default AppArmor posture align
without adding another OS family to the first evidence matrix.

Choose **Debian 13** instead when at least one real requirement applies:

- the client has a Debian operating standard, existing hardening baseline,
  patching fleet, monitoring/EDR agents and operators;
- support or compliance requires the Microsoft Debian package feed for .NET;
- the client accepts Debian's regular-to-LTS support transition and validates
  package coverage for the entire planned residence; or
- a measured Active24 image comparison demonstrates a material operational
  advantage, rather than relying on a general reputation for minimalism.

Choose **Ubuntu 26.04 minimal** after promotion when creating a fresh, long-lived
host whose expected residence benefits from standard maintenance through May
2031. New MartiX template versions may then make it the default while retaining
24.04 as a bounded compatibility profile.

Do not choose **Debian 12** for a new host. Use it only as a temporary migration
source when a client already runs it and has an approved move to Debian 13 or
another admitted target before June 2028. Do not choose Debian 11 or any
unsupported/interim distribution.

## Portability and migration

The Ubuntu/Debian choice is a deployment adapter. Business Modules, EF Core
mappings, HTTP contracts, UI architecture, capability contracts and release
artifacts must not branch on the distribution.

Portability depends on these rules:

- use standard ASP.NET Core configuration, health, graceful shutdown and OTLP;
- keep systemd, nginx, AppArmor, firewall, repository and monitoring-agent
  assets in an OS-specific provisioning layer;
- build portable Linux artifacts or the same OCI image once in CI;
- keep application state in admitted database/Object Storage contracts and
  external backups rather than undocumented host paths; and
- test provider exit by restoring onto a fresh host with a different image.

The preferred OS migration is blue/green host replacement:

1. provision and attest the destination image independently;
2. deploy the same immutable application version;
3. restore/replicate state through documented provider-independent procedures;
4. run compatibility, security and load checks behind the destination ingress;
5. quiesce or synchronize writes, run the authorized cutover and switch DNS or
   edge routing;
6. retain one bounded, read-only rollback path without permitting split-brain
   writes; and
7. revoke credentials and securely retire the old VPS after rollback expiry.

In-place Ubuntu 24.04-to-26.04 and Debian 12-to-13 upgrades remain rehearsable
alternatives for client constraints, but they are not the primary MartiX
upgrade mechanism. Replacement proves disaster recovery and limits hidden host
drift at the same time.

## Decision summary for ticket 120

- Accepted future Active24 Linux target: **Ubuntu 26.04 LTS minimal**, admitted
  only after 26.04.1 and the full target evidence suite.
- Safety fallback if deployment precedes admission: **Ubuntu 24.04 LTS minimal
  base**.
- Client-driven alternative: **Debian 13**, with an independent support claim
  and the same operational gates.
- Migration-only legacy: **Debian 12**; no new hosts.
- Rejected: **Debian 11**, unsupported/interim releases, and Active24 **LAMP or
  LEMP presets**.
- Default host shape: prefer nginx/systemd `process` for the smallest operational
  surface; retain the independently admitted OCI `container` and bounded
  `compose` choices when their benefits are required.
- No distribution selection changes the cloud-neutral application architecture
  or adds a generated .NET project.
