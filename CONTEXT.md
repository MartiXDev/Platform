# MartiX Application Platform

The reusable foundation for creating and maintaining MartiX .NET applications. It includes the libraries, template system, architectural governance, and agent guidance that keep generated solutions consistent over time.

## Language

**Platform**:
The complete MartiX foundation: reusable libraries, templates, governance documents, executable checks, and agent guidance.
_Avoid_: WebApi library, starter kit, template (when referring to the complete foundation)

**Platform Baseline**:
The cohesive set of Platform Capabilities automatically present in every supported Generated Solution, even when implemented across dependency-layered Platform Libraries.
_Avoid_: Default package, mandatory add-ons, everything package

**Platform Library**:
A reusable, independently versioned package that supplies one focused part of the Platform to generated solutions.
_Avoid_: WebApi library (when referring to packages that are not specifically HTTP-related)

**Platform Kernel**:
The deliberately small, framework-independent set of deep contracts shared across Platform Libraries and Generated Solutions, admitted only when their semantics are universal and stable.
_Avoid_: Core utilities, common abstractions, shared dumping ground

**Application Result**:
A transport-independent success or failure outcome whose failure state contains one or more Application Errors and whose success semantics are chosen by the caller's transport.
_Avoid_: HTTP result, status response, exception replacement for exceptional failures

**Application Error**:
A safe semantic failure identified by a stable machine-readable code and category independently of its eventual HTTP, UI, job, or messaging representation.
_Avoid_: Problem Details, HTTP status, exception message

**Template System**:
The single composable source from which supported MartiX solution variants are generated.
_Avoid_: Template collection, separate templates

**Preset**:
A named, supported, and tested selection of Platform Capabilities for a common starting point, such as API, Modular Monolith, or Full Stack.
_Avoid_: Template, flavor

**Platform Capability**:
An explicitly selectable feature of the Template System with declared compatibility rules and verification coverage.
_Avoid_: Add-on, optional code

**Capability Provider**:
A named implementation choice for a Platform Capability that satisfies the capability's common contract and carries its own compatibility and verification profile.
_Avoid_: Implementation detail, package choice, provider hidden by a Preset

**Application UI**:
The user-facing interface for an application's business workflows, required by the Full Stack Preset and implemented by an explicitly selected UI Capability Provider.
_Avoid_: Frontend (when its role is ambiguous), dashboard (unless that is the product term)

**Native Mobile Application**:
An installed Android or iOS application delivered through the platform's native distribution and lifecycle model with direct access to platform APIs, whether implemented separately with platform-native technology or through an admitted cross-platform native framework.
_Avoid_: PWA, responsive website, WebView wrapper by default, platform-native implementation only

**Platform-Native Mobile Application**:
A Native Mobile Application implemented directly in the platform's primary language, UI framework, SDK, and lifecycle: Swift and SwiftUI for iOS or Kotlin and Jetpack Compose for Android.
_Avoid_: The only meaning of native, cross-platform native application, PWA

**Admin UI**:
An optional operator-facing interface for administering the application or its Platform Capabilities, independently selectable from the Application UI.
_Avoid_: Application UI, mandatory admin portal, back office (unless that is the domain term)

**UI Capability Contract**:
The provider-independent configuration, HTTP/error, identity, authorization, accessibility, localization, observability, browser-testing, and deployment expectations shared by Blazor Web App, React, and Vue providers.
_Avoid_: Shared UI framework, lowest-common-denominator frontend

**Localization Readiness**:
The Full Stack foundation in which user-visible text, formatting, culture fallback, and layout verification can add supported cultures without restructuring application contracts, while machine identifiers remain invariant.
_Avoid_: Multiple languages required, localized error codes, browser culture as business policy

**Theme Readiness**:
The Full Stack foundation in which semantic design tokens, accessible interaction states, and isolated branding allow later visual variants without coupling business UI components to one raw style implementation.
_Avoid_: Tenant theming by default, CSS framework as contract, color swap only

**Required Capability**:
A Platform Capability selected by a Preset that cannot be removed, although the Preset may supply a documented default Capability Provider or require an explicit provider choice.
_Avoid_: Hidden dependency, always-on package

**Deferred Capability**:
A potential Platform Capability that is intentionally absent from the Template System until its contract and Quality Gate Profile are decision-ready.
_Avoid_: Experimental Capability, unsupported switch, roadmap promise

**Invalid Combination**:
A selection of Preset, Platform Capabilities, or Capability Providers that the Template System rejects before generation because their contracts conflict or required compatibility evidence does not exist.
_Avoid_: Generated but unsupported, best-effort combination

**Authentication Capability**:
An optional Platform Capability that establishes an actor's identity through one or more explicitly selected and verified authentication providers without defining business authorization policy.
_Avoid_: Identity (when only authentication is meant), authorization provider, mandatory login

**Authentication Profile**:
One verified pairing of an Authentication Capability Provider with an explicit host role and flow, such as interactive cookie/BFF, bearer API, or machine-to-machine access.
_Avoid_: Authentication provider switch, universal OIDC mode, interchangeable token flow

**Actor**:
A provider-independent immutable operation snapshot representing an anonymous context, human, service, or background process; a durable application identity is present only when the selected policy resolves an Actor ID.
_Avoid_: Current user, `ClaimsPrincipal`, `IdentityUser`, authenticated user (when anonymous or non-human principals are also valid)

**Actor ID**:
An opaque strongly typed application identifier allocated to a durably resolved Actor and stored without a foreign key or navigation to an authentication provider.
_Avoid_: Provider subject, email address, user name, Identity user navigation

**Actor Registry**:
An optional application-owned mapping from validated provider principal keys to durable Actor IDs, selected when attribution, local permissions, audit correlation, provider migration, or account linking requires stable continuity.
_Avoid_: ASP.NET Core Identity store, automatic email linking, mandatory user database

**Local Identity Capability**:
An Authentication Capability that owns application-managed accounts, credentials, recovery, sessions, and related persistence independently of Business Module data.
_Avoid_: Current user, mandatory ASP.NET Core Identity, business customer record

**Permission Capability**:
An optional Platform Capability that maps stable application permissions from actor claims or locally administered assignments through the Platform's authorization seam without requiring a particular Authentication Capability.
_Avoid_: Role checks throughout business code, identity provider, authorization itself

**Relational Persistence Capability**:
A provider-selected EF Core Platform Capability in which Business Modules own their contexts and migrations while the Generated Solution uses one verified relational database provider and a separate migration operation.
_Avoid_: Generic repository layer, provider-neutral database, mixed storage by default

**Hosted Background Work**:
Process-bound work executed with first-party .NET hosting primitives whose authoritative input remains recoverable outside the worker and whose shutdown, backpressure, and multi-instance behavior are explicit.
_Avoid_: Fire-and-forget task, durable job, in-memory queue as storage

**Durable Job**:
Persisted delayed, recurring, or queued work whose scheduling, retries, operator control, and recovery survive process restarts through an explicitly selected job Capability Provider.
_Avoid_: Hosted service, Integration Event, workflow by default

**Broker Transport Capability**:
An optional transport for publishing committed Integration Events to, and consuming external messages from, a selected queue or topic broker while retaining outbox/inbox and at-least-once semantics.
_Avoid_: Integration Event itself, transactional outbox replacement, event-streaming platform

**Distributed Cache Capability**:
An optional provider-selected shared cache whose entries may be observed across application instances but never become authoritative business state.
_Avoid_: In-memory cache, source of truth, output cache

**Object Storage Capability**:
An optional provider-selected capability for durable opaque blobs whose credentials, lifecycle policy, and deployment topology remain outside Business Module contracts.
_Avoid_: File Management, database blob by default, storage SDK in business code

**File Management Capability**:
An optional application capability that governs authorized upload, ownership, validation, scanning, visibility, retention, recovery, and download over a selected Object Storage Capability.
_Avoid_: Upload endpoint only, object storage provider, public file server

**Notification Inbox Capability**:
An optional durable record of user-addressed notifications whose read state and lifecycle remain authoritative independently of any transient or external delivery channel.
_Avoid_: SignalR message, email provider, Integration Event inbox

**External Notification Delivery Capability**:
An optional channel-specific attempt to deliver an application-owned notification through an external provider without claiming that provider acceptance proves human receipt.
_Avoid_: Notification Inbox, generic notification service, guaranteed recipient delivery

**Real-Time Delivery Capability**:
An optional transient SSE or SignalR transport that informs connected clients of current activity without becoming the authoritative record of the delivered information.
_Avoid_: Durable notification, message broker, guaranteed delivery

**Webhook Ingestion Capability**:
An optional capability that authenticates, replay-protects, deduplicates, and translates inbound events from an external HTTP provider according to that provider's delivery contract.
_Avoid_: Public endpoint without verification, outbound webhook, message-broker consumer

**Webhook Delivery Capability**:
An optional capability that reliably sends versioned, signed public event payloads to authorized external HTTP subscriptions with protected destinations, secrets, retries, and delivery history.
_Avoid_: Internal Integration Event serialization, synchronous callback, message broker

**Idempotent Execution Capability**:
An optional durable protocol that atomically claims a caller-scoped operation key and replays or conflicts according to the matching request contract so retries cannot create duplicate business effects.
_Avoid_: Output cache, Integration Event inbox, in-memory request lock

**Feature Management Capability**:
An optional, lifecycle-governed mechanism for temporary rollout, canary, replacement, or kill-switch decisions that remains separate from authorization, isolation, configuration, and commercial entitlements.
_Avoid_: Permanent conditional architecture, permission flag, unfinished-feature hiding

**Security Audit Event**:
A stable fact describing a security-sensitive action and its actor, target, outcome, and correlation context independently of the storage used to retain it.
_Avoid_: Diagnostic log, entity change, arbitrary HTTP request

**Durable Security Audit Trail**:
An optional append-oriented, access-controlled retention of Security Audit Events with integrity, export, and lifecycle policies appropriate to privileged and impersonated actions.
_Avoid_: Application log, primary business state, universal request capture

**Entity Change History**:
An optional, explicitly scoped record of selected persisted field changes that remains distinct from meaningful Business Module audit facts and security events.
_Avoid_: Universal EF interceptor, domain history, soft deletion

**Supported Capability**:
A Platform Capability whose required quality gates pass for every declared supported combination before release, with no allowed failures, hidden skips, quarantine, or retry-to-green acceptance.
_Avoid_: Partially supported, best effort, usually works

**Experimental Capability**:
A clearly labelled Platform Capability that is excluded from production Presets and carries no compatibility or production-readiness guarantee while its Interface and verification mature.
_Avoid_: Supported preview, optional supported feature

**Quality Gate**:
An executable, release-blocking check that proves one declared aspect of a Supported Capability or Platform artifact meets its acceptance threshold.
_Avoid_: Quality guideline, advisory check, best-effort validation

**Quality Gate Family**:
One stable semantic ownership category for a Quality Gate, used consistently across policy, execution, reporting and release evidence independently of the tool or project that implements it.
_Avoid_: Test project, tool name, miscellaneous gate bucket

**Gate Outcome**:
The fail-closed terminal result of one selected Quality Gate: passed, failed, unstable, infrastructure-error, cancelled, or policy-derived not-applicable; cadence omission is not an outcome.
_Avoid_: Skipped required gate, retry-to-green, CI-provider conclusion as release truth

**Gate Run Manifest**:
The machine-readable record of one Quality Gate execution, tying its stable identity and policy to exact inputs, environment, matrix coordinate, all attempts, terminal outcome, and content-addressed evidence.
_Avoid_: CI job status, mutable report link, latest retry only, release-wide summary

**Quality Gate Profile**:
The artifact-specific set of Quality Gates and thresholds applied to a Platform Library, generated Preset, or Platform Migration on top of the common non-negotiable baseline.
_Avoid_: Universal quality score, one coverage target for everything

**Composed Quality Profile**:
The complete release contract formed from the common baseline, the artifact and Preset profiles, every selected Capability profile, and the declared provider, runtime, and operating-system combinations.
_Avoid_: One-size-fits-all gate, testing capabilities only in isolation

**Verification Cadence**:
The declared schedule and execution context in which a Quality Gate runs—fast local, pull request, main/nightly, or release candidate—without changing whether that gate is required for a Supported Release.
_Avoid_: Quality level, permission to skip a required gate, CI workflow as policy

**Compatibility Coverage Plan**:
The versioned, reviewable proof plan combining canonical Presets, Capability Provider conformance, explicit risk-based interaction profiles, deterministic covering arrays, and invalid-combination checks for one Supported Release matrix.
_Avoid_: Naive Cartesian product, pairwise-only proof, undocumented CI sample

**Verification Entrypoint**:
The single repository-owned cross-platform command surface that validates Quality Gate Policy, executes a requested Verification Cadence, and emits structured evidence identically for humans, agents, and CI.
_Avoid_: CI-only workflow, duplicated shell implementations, quality policy embedded in orchestration code

**Quality Gate Policy**:
The versioned machine-readable declaration of Quality Gate identities, ownership, cadence, prerequisites, matrix selection, commands, evidence and failure semantics consumed by the Verification Entrypoint.
_Avoid_: CI YAML as policy, test-result file, duplicated quality thresholds

**Critical Module**:
A Module whose failure could compromise security, authorization, data integrity, reliable delivery, migration safety, or concurrency correctness and therefore requires direct evidence for every declared invariant and failure guarantee beyond aggregate coverage percentages.
_Avoid_: Important code, high coverage area, complicated module

**Security Gate Profile**:
The Quality Gate Profile that applies OWASP ASVS 5.0 Level 2 to every production Preset, adds relevant Level 3 controls for Critical Modules and high-assurance applications, and verifies secure development, dependencies, authorization, supply-chain integrity, and vulnerability response.
_Avoid_: Security checklist, scan-only security, universal ASVS Level 3

**Security Control Manifest**:
The versioned traceability record mapping applicable security-standard controls and Threat Model mitigations to owners, executable Quality Gates, evidence, and explicit non-applicability rules.
_Avoid_: Security checklist without evidence, scanner report as complete security proof, undocumented control omission

**Threat Model**:
The maintained analysis of assets, actors, trust boundaries, abuse cases, and mitigations for security-sensitive Platform Capabilities and Generated Solutions, updated whenever a material trust boundary changes.
_Avoid_: One-time security diagram, generic threat list

**Risk Exception**:
A documented, owner-assigned, time-limited acceptance of a non-reachable moderate or low security finding; it cannot waive authentication, authorization, tenant-isolation, data-integrity, remote-code-execution, or secret-exposure defects.
_Avoid_: Suppression, permanent waiver, accepted vulnerability

**Performance Baseline**:
The repeatable measurements of Platform Library hot paths and controlled generated-host scenarios against which time, throughput, allocation, startup, working-set, and artifact-size regressions are release-gated.
_Avoid_: One-off benchmark, universal response-time target, performance claim without a reference environment

**Performance Runner Profile**:
The versioned controlled hardware, operating-system, runtime, topology, tool and noise contract under which a Performance Baseline and candidate can be compared validly.
_Avoid_: Runner label without specifications, comparison across changed environments, application SLO

**Application SLO**:
An application-owned, measurable objective for production latency, throughput, availability, resource use, or scaling under a declared workload; the Platform supplies instrumentation and test hooks but does not invent the objective.
_Avoid_: Platform benchmark, generic fast-response requirement

**Reliability Gate Profile**:
The Quality Gate Profile that proves transaction atomicity, concurrency behavior, bounded safe retries, migration safety, durable background processing, health semantics, and recovery under deterministic failure injection and multi-instance execution.
_Avoid_: Happy-path integration test, retry policy as reliability, uptime promise without a workload

**At-Least-Once Delivery**:
The Integration Event delivery guarantee in which every committed event is eventually offered to its consumer but may be offered more than once, requiring observable duplicate handling.
_Avoid_: Exactly-once delivery, fire-and-forget event

**Exactly-Once Business Effect**:
The application-level guarantee that retries or duplicate deliveries produce one intended durable business outcome through idempotency, without claiming exactly-once transport or message delivery.
_Avoid_: Exactly-once message, duplicate-free transport

**Deep Module**:
A Module or Platform abstraction whose small, stable Interface hides materially greater implementation complexity or volatile provider details and supplies meaningful policy rather than merely renaming an underlying API.
_Avoid_: Interface per class, pass-through service, convenience wrapper without policy

**Enterprise-Ready**:
Having verified architectural boundaries, provider seams, operational hooks, compatibility contracts, and Platform Migrations that permit later growth without enabling or pre-installing unused enterprise infrastructure.
_Avoid_: Enterprise features enabled by default, abstraction for possible future use, maximum-complexity baseline

**Observability Contract**:
The stable, tested activity names, metric names and units, structured log event identifiers, required dimensions, context-propagation behavior, and data-safety rules emitted by a Platform Capability independently of any telemetry vendor.
_Avoid_: Monitoring dashboard, exporter configuration, unversioned telemetry

**Operational Readiness**:
The verified ability of a Preset to reject invalid configuration, expose safe diagnostic signals, distinguish readiness from liveness, shut down predictably, recover durable work, and operate correctly across multiple instances.
_Avoid_: Health endpoint only, production-ready without failure tests

**Local Development Profile**:
A verified way to run a Generated Solution during development with its selected resources, configuration, startup relationships, and diagnostics without defining its production topology.
_Avoid_: Deployment Profile, personal development-machine convention, production environment

**Deployment Profile**:
A verified contract for producing and operating immutable Generated Solution artifacts in one declared topology independently of local development tooling.
_Avoid_: Local Development Profile, cloud provider, environment name

**Active24 Linux VPS Reference Profile**:
The future provider-specific deployment adapter targeting Ubuntu 26.04 LTS Minimal after its first point release and successful target admission; Ubuntu 24.04 LTS Minimal is the safety fallback and Debian 13 is a separately attested client-driven alternative.
_Avoid_: Active24 Linux Smart shared hosting, automatic support for every Ubuntu or Debian image, production readiness based only on an OS version label

**Configuration Contract**:
The generated, machine-readable and documented declaration of every configuration key's shape, owner, requirement, sensitivity and lifecycle, consumed through standard .NET Configuration and validated typed Options without containing values that are secret.
_Avoid_: Configuration value dump, custom universal configuration service, direct arbitrary `IConfiguration` access from Business Modules

**Secret Delivery Adapter**:
A deployment-specific mechanism that uses an admitted store and identity to inject secret values into the portable Configuration Contract without exposing the provider SDK to Business Modules.
_Avoid_: Secret value in a manifest, vault SDK as a domain dependency, populated source-controlled `.env` file

**Deployment Manifest**:
The deterministic, versioned composition of selected Capability deployment requirements from which Aspire, process-host, Compose and future provider artifacts are projected without containing secret values or provider behavior in Business Modules.
_Avoid_: Hand-maintained parallel topology, runtime infrastructure discovery, cloud-specific domain contract

**Deployment Projection**:
A deterministic target-owned transformation of the Deployment Manifest into an Aspire, process-host, Compose or admitted provider artifact while preserving logical resource, readiness, persistence, migration and secret-delivery semantics.
_Avoid_: Independent topology source, manual generated-file fork, weakening the Deployment Manifest silently

**Canonical Knowledge**:
The version-controlled source of architectural truth divided by purpose: terminology in `CONTEXT.md`, decisions in ADRs, current structure in architecture documentation, task guidance in guides, and concise repository rules and pointers in `AGENTS.md`.
_Avoid_: Conversation history as truth, duplicated instructions, architecture embedded only in a Skill

**Canonical Platform Repository**:
The sole actively maintained repository in which Platform source, Canonical Knowledge, release policy, Schemas, Skills, and evidence definitions evolve together against one Platform Version.
_Avoid_: Legacy POC, Marketplace catalog, package registry, editable repository mirror

**Distribution Authority**:
The one approved public destination for discovering and consuming a particular Platform artifact kind, whose published identity and provenance participate in the Release Trust Chain.
_Avoid_: Client mirror, CI artifact store, duplicate public feed, source repository alone

**Marketplace Copy**:
A digest-verified, one-way publication of a released Platform-owned Skill into a discovery catalog, optionally wrapped in catalog metadata but never maintained as an independent behavioral source.
_Avoid_: Skill fork, second canonical source, manually synchronized copy

**Official Platform Distribution**:
A MartiX-branded artifact promoted from the Canonical Platform Repository through the approved Release Trust Chain to its Distribution Authority.
_Avoid_: Public fork, private rebuild, source checkout, unpromoted candidate

**Agent Readiness**:
The measured ability of supported LLM configurations to discover Canonical Knowledge and complete representative Platform workflows whose resulting artifacts pass the same deterministic Quality Gates as human-authored work.
_Avoid_: Has an AGENTS.md, model-specific prompt, self-reported agent confidence

**Agent Guidance Package**:
The layered agent-facing Interface formed by a Generated Solution's compact self-sufficient `AGENTS.md`, Canonical Knowledge, machine-readable manifests and quality policy, deterministic Platform Tool and Verification Entrypoint, plus the optional synchronized `martix-platform` router Skill.
_Avoid_: One large prompt, Skill as architecture authority, mandatory plugin, model-specific instruction collection

**Agent Context Projection**:
A deterministic ephemeral and secret-free machine representation derived by the exact Platform Tool from existing repository authorities for one agent run, without becoming another committed source of truth.
_Avoid_: Agent manifest, copied documentation, prompt context dump, committed generated state

**Release Evidence Manifest**:
The final small signed trust root created only after complete promotion, linking the approved Candidate Evidence Manifest, verified Promotion Receipts, stable release identity, support dates, and offline verification instructions.
_Avoid_: CI summary, release checklist, latest green run, pre-publication candidate record

**Candidate Evidence Manifest**:
The signed pre-publication evidence graph binding one Candidate ID to its exact source, policy, verification matrix, Gate Run Manifests, artifacts, compatibility, migration, security, performance, SBOM, provenance, changes, support intent, and destination plan.
_Avoid_: Final release evidence, mutable approval checklist, publication receipt

**Promotion Receipt**:
The signed append-only observation that one publication destination received and verified exact candidate artifact identities, including publisher identity, timestamps, retries, and partial or terminal outcome.
_Avoid_: Upload log, mutable registry status, successful job badge, rebuilt retry

**Candidate ID**:
The immutable identity binding one reserved stable Platform Version, source commit, build attempt, final artifact digest set, and Release Evidence before promotion.
_Avoid_: CI run number, mutable tag, package version reused across builds, latest candidate

**Release Trust Chain**:
The combined OIDC publishing identity, timestamped author signatures, digest-bound build provenance, signed source identity, and offline verification material required for a public MartiX release.
_Avoid_: API key alone, CI badge, repository signature only, checksum without provenance

**Change Fragment**:
A repository-owned Markdown record of one observable Platform change, its minimum SemVer impact, affected audiences, migration disposition, WHAT, WHY, and required consumer action, later archived under its exact release.
_Avoid_: Commit message, PR label, manually reconstructed changelog entry, deleted release note input

**Platform Version**:
The single SemVer 2.0 identity shared by every first-party package and associated migration, template, documentation, Skill, manifest, and evidence artifact in one synchronized Platform release train.
_Avoid_: Package-specific version, template version, release date, source commit

**Compatible Upgrade**:
A same-major Platform upgrade that preserves every applicable Supported contract without requiring changes to application-owned source, configuration, database schema, or deployment topology.
_Avoid_: Migration-required minor, compiles after code fix, package-API-only compatibility

**Migrated Upgrade**:
A Platform upgrade, normally across a major boundary, whose target contract is reached through an explicit and verified Platform Migration from a declared Supported source release.
_Avoid_: Compatible upgrade, template reapplication, undocumented manual rewrite

**Supported Line**:
The latest serviced stable release of either the current Active Platform major or the immediately previous Maintenance major, with an explicit support phase and End-of-Support date.
_Avoid_: Every historical minor, prerelease channel, indefinite LTS branch

**Deprecated Platform Contract**:
A still-Supported public Platform contract with a ready Supported replacement, documented migration path, earliest major-only removal, and at least one stable minor plus six months of migration time.
_Avoid_: Unsupported feature, error-level warning, immediate removal notice, quality-gate exemption

**Compatibility Baseline Set**:
The immutable previous-release, major-floor, minor-cohort, and escaped-defect artifacts against which a Platform candidate proves its cumulative same-major compatibility.
_Avoid_: Previous package only, mutable golden files, every historical patch

**Supported Release**:
An immutable set of packages, Presets, Platform Migrations, documentation, Skills, and Release Evidence produced from one attested candidate for which every required Quality Gate passes; a required failure cannot be waived.
_Avoid_: Mostly green release, maintainer override, rebuilt production artifact

**Generated Solution**:
An application codebase created by the Template System and thereafter owned by its application team.
_Avoid_: Template instance, scaffold

**Capability Manifest**:
The application-owned `martix.platform.json` record of a Generated Solution's immutable Platform origin, current Platform Contract Version, Preset, selected Capabilities/providers, schema version, and applied Platform Migration ledger.
_Avoid_: Template state, package lock, generated-file inventory, multiple state files

**Platform Contract Version**:
The Platform Version whose source, configuration, repository structure, and extension-seam contract a Generated Solution most recently adopted through generation or a successful Platform Migration, independently of its currently installed compatible package version.
_Avoid_: Installed package version, manifest schema version, template version

**Capability Matrix**:
The versioned source of truth that classifies each Platform Capability and Capability Provider as required, optional, Experimental, Deferred, or invalid for every Preset and declares their prerequisites and conflicts.
_Avoid_: Feature list, undocumented template conditions, full Cartesian product

**Platform Migration**:
A versioned, reviewable change that brings an existing Generated Solution into alignment with a newer Platform contract without regenerating application-owned source.
_Avoid_: Template reapplication, automatic overwrite

**Migration Plan**:
The deterministic read-only output of an exact-version Platform Tool that binds source repository state, target Platform Version, ordered recipes, preconditions, intended changes, conflicts, verification, recovery, and a content digest before mutation.
_Avoid_: Migration script output, LLM proposal, mutable checklist, implicit latest target

**Migration Catalog**:
The immutable attested directed graph embedded in an exact target Platform Tool that contains every typed Migration Step required from the declared Supported source cohorts.
_Avoid_: Downloaded recipe feed, runtime plugins, historical tool chain, script directory

**Migration Step**:
A stable `MXM`-identified typed repository transformation with explicit applicability, ownership, prerequisites, intended diff, postconditions, verification, recovery classification, and recipe digest.
_Avoid_: Arbitrary script, regex rewrite, heuristic fix, unversioned code fix

**Migration Conflict Report**:
The structured fail-closed explanation of a Migration Step whose intent cannot be applied safely, including the exact precondition mismatch, target invariant, supported resolution choices, and evidence needed before replanning.
_Avoid_: Merge marker, force flag, LLM guess, suppressible warning

**Migration Recovery Strategy**:
The tested source-revert, artifact-rollback, expand-contract, backup-restore, roll-forward-only, or manual-recovery contract governing how a Migration Step or composed Migration Plan responds after failure or deployment.
_Avoid_: Automatic inverse, EF `Down()` assumption, package downgrade, untested backup

**Business Module**:
A bounded business area in a Generated Solution that owns its internal model and exposes only deliberate contracts to other Business Modules.
_Avoid_: Layer, feature folder, service

**Module Contract**:
The deliberately exposed interface through which one Business Module can synchronously request information or behavior from another without accessing its internals.
_Avoid_: Internal reference, shared service

**Domain Event**:
A uniquely identified immutable fact raised and handled within the Business Module that owns the relevant domain model; it is not itself a public delivery contract.
_Avoid_: Integration event, message (when the event remains internal)

**Integration Event**:
A versioned immutable public fact through which another Business Module or external system can react independently with explicitly accepted eventual consistency.
_Avoid_: Domain event, callback

**Transactional Outbox**:
The module-owned durable Messages and Delivery Attempts committed atomically with their producing business changes, enabling reliable later Integration Event delivery.
_Avoid_: In-memory queue, event dispatcher, message broker

**Outbox Message**:
The immutable durable envelope and serialized payload of one Integration Event, identified independently of its transport and shared by all of its Delivery Attempts.
_Avoid_: Delivery Attempt, mutable queue item, Domain Event object

**Delivery Attempt**:
The durable per-Subscription operational state through which one Outbox Message is leased, retried, acknowledged or terminally failed.
_Avoid_: Outbox Message, consumer business state, exactly-once delivery

**Integration Event Subscription**:
An explicitly named relationship in which one consumer independently reacts to a supported Integration Event contract.
_Avoid_: Runtime handler discovery, broker queue only, project reference without behavior

**Inbox Receipt**:
The consumer-owned durable evidence that one Subscription committed the effects of one Outbox Message with a matching payload identity.
_Avoid_: Notification Inbox, output cache, proof of exactly-once transport

**Application Operation**:
A single application use case implemented within a vertical slice, invoked directly by default rather than through a mandatory mediator abstraction.
_Avoid_: Handler (when no mediator contract is involved), service method
