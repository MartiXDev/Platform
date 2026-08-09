# Quality and release architecture

> Status: **Approved target with implemented bootstrap, Beta integration,
> Experimental alpha, and Release Candidate evidence**. The current repository
> exposes bootstrap gates, a claim-free Beta integration profile, the
> claim-free Modular Monolith alpha profile, and a digest-bound Release
> Candidate profile; none is a Supported Capability claim.

## Current bootstrap evidence

The current machine-readable authorities are [`eng/quality-gates.json`](../../eng/quality-gates.json),
[`eng/verify.mjs`](../../eng/verify.mjs), [`eng/verify-modular-monolith-alpha.mjs`](../../eng/verify-modular-monolith-alpha.mjs),
[`eng/deployment-manifest.mjs`](../../eng/deployment-manifest.mjs), and
[`martix.platform.json`](../../martix.platform.json).
They define four cadences and the required bootstrap gates while keeping
`supportClaims` empty:

- `fast`
- `pull-request`
- `main-nightly`
- `release-candidate`

The current repository verification commands are:

```text
npm run verify:fast
npm run verify:pr
npm run verify:api
npm run verify:fastendpoints
npm run verify:beta-integration
npm run verify:release-candidate
```

The `modular-monolith-alpha` profile is release-candidate-only and requires
separate PostgreSQL and SQL Server application and migration database inputs.
`npm run verify:modular-monolith-alpha` packs the first-party artifacts once,
restores each generated variant from the isolated feed into its own cache, runs
migration and real-provider reliability evidence for rollback, optimistic
concurrency, lease expiry, and Inbox deduplication, and writes immutable
Experimental candidate evidence. Its `supportClaims` remain empty.

The `beta-integration` profile is also release-candidate-only. It verifies the
named `BetaIntegrationGeneratedSolution` fixture and its
[`beta-integration.schema.json`](../../schemas/beta-integration.schema.json)
evidence manifest. The risk-based covering array covers the three Presets,
Minimal API and FastEndpoints, both relational providers, all admitted
authentication and UI profiles, the complete infrastructure-provider catalog,
and process/OCI/direct/Aspire/Compose deployment profiles. It records
threat-model and supply-chain reviews, controlled performance baselines,
compatibility inputs, reconciled Change Fragments, and matrix/evidence
digests. Active24-specific deployment and native-mobile remain explicit
Not Attested scope, and the manifest keeps `supportClaims` empty.

The 1.0 Capability and public-contract scope is frozen at Beta. Post-freeze
changes are limited to defects, evidence gaps, and release blockers; new
features and providers require a later scope decision and independent
attestation.

The `release-candidate` profile uses the named
`ReleaseCandidateGeneratedSolution` fixture and
[`release-candidate.schema.json`](../../schemas/release-candidate.schema.json).
Its evidence manifest binds every release artifact kind, all bootstrap/alpha/
Beta/Release Candidate gates and retained attempts, compatibility and
reproducibility evidence, provider/migration/security/performance/deployment
evidence, documentation, and agent readiness to one canonical content digest.
The candidate is clean, reviewed, claim-free, built once, promoted without
rebuild, and verified against exact bytes. A release-blocking fix creates a
new candidate, reruns affected gates, and invalidates the prior candidate;
in-place patching is rejected.

The target roadmap later calls for one .NET file-based Verification Entrypoint
with the same cadence contract. Until that tracer is implemented, the
JavaScript entrypoint and its machine policy remain the current truth.

The internal `0.1.0-preview.1` API release loop is an executable release
profile alongside the bootstrap cadence checks. It packs each first-party
artifact once, restores the generated API from an isolated feed, runs the
generated TUnit consumer and JIT/OpenAPI probes, publishes and probes the
declared Native AOT artifact, and writes content-addressed candidate evidence.
The profile remains persistence-free, provider-free, and claim-free.

The `bootstrap.deployment-manifest` gate uses the named
`DeploymentManifestGeneratedSolution` fixture and
[`schemas/deployment-manifest.schema.json`](../../schemas/deployment-manifest.schema.json).
Its normalized topology produces both process/archive and container/OCI
projections from one identity. The gate verifies external-only configuration,
startup/readiness/liveness checks, graceful shutdown, Migrator completion
ordering, immutable promotion and rollback, and content-addressed drift
evidence without embedding secrets or production build steps.

The `bootstrap.portable-host-conformance` gate uses the named
`PortableHostConformanceGeneratedSolution` fixture and
[`schemas/portable-host-conformance.schema.json`](../../schemas/portable-host-conformance.schema.json).
It binds admitted Windows/Linux process and OCI host coordinates, including
generic Ubuntu 26.04, to the same manifest identity and checks external
configuration, migration ordering, lifecycle, permissions, networking, and
failure behavior. Unsupported coordinates fail closed; Active24 remains
Planned / Not Attested and `supportClaims` stays empty.

The optional FastEndpoints adapter is verified separately from the canonical
Minimal API release loop. Its named Generated Solution proves the declared
JIT/TUnit/OpenAPI combination against the same HTTP contract. Trimmed and
Native AOT combinations are explicit `Invalid` outcomes because endpoint
reflection discovery and AOT support are not declared for this preview.

## Quality Gate model

A Quality Gate is an executable, release-blocking check with a stable identity,
owner, cadence, prerequisites, command, threshold, evidence, and fail-closed
outcome. The policy is not duplicated in CI orchestration.

The target distinguishes these concepts:

- **Quality Gate Family** owns stable semantic categories independently of tools.
- **Gate Outcome** is passed, failed, unstable, infrastructure-error,
  cancelled, or policy-derived not-applicable; omission is not success.
- **Quality Gate Profile** selects gates for a Platform Library, Preset,
  Capability, provider, or migration.
- **Composed Quality Profile** combines the common baseline with every selected
  artifact, Preset, provider, runtime, and operating-system profile.
- **Gate Run Manifest** binds exact inputs, environment, attempts, outcome, and
  content-addressed evidence.

Required gates cannot be waived, hidden, quarantined, or retried to green. The
verification surface is strict, deterministic, cross-platform, and non-mutating
unless a gate explicitly owns an isolated disposable resource.

## Coverage and evidence

The compatibility plan uses canonical Presets, provider conformance, named
high-risk interactions, deterministic covering arrays, and every Invalid
Combination. It is not a naive Cartesian product and it does not infer
composition correctness from isolated unit tests.

Target evidence includes:

- public API, package content, dependency direction, and analyzer conformance;
- generated template output and a healthy running Generated Solution;
- HTTP metadata, host behavior, OpenAPI, client artifacts, and negative cases;
- real PostgreSQL and SQL Server persistence, migrations, transactions,
  concurrency, Outbox/Inbox, and provider failures;
- security controls, Threat Models, authorization behavior, redaction, and
  supply-chain integrity;
- UI provider, browser accessibility, identity/session, localization, and
  deployment-artifact behavior;
- performance and Native AOT only for exact declared combinations; and
- immutable release evidence, provenance, SBOM, signatures, and publication
  receipts.

The `bootstrap.full-stack` gate uses the named
`FullStackGeneratedSolution` fixture as a non-product acceptance seam. It
requires exactly one selected Blazor Web App, React, or Vue provider and checks
the shared client, failure, session, authorization, accessibility,
localization, theme, browser, build, security, deployment, and observability
contracts. The selected UI client is derived from the same OpenAPI artifact as
the standalone client, and the gate rejects missing operations or drifted UI
contract metadata; shared styling remains a provider-neutral semantic-token
seam.

The `bootstrap.mailkit-smtp` gate uses the named
`MailKitSmtpGeneratedSolution` fixture to prove durable notification intent,
MailKit TLS/authentication, cancellation, classified outcomes, bounded
recovery, redaction, observability, and selected-provider absence evidence.

Generated solution tests use TUnit on Microsoft.Testing.Platform with isolated
real resources and parallel execution by default. The current Kernel consumer
fixture provides the first repository evidence for that executable test
direction; generated solutions will add the complete composed profiles.

## Security, reliability, and performance

Every production Preset receives an OWASP ASVS 5.0 Level 2 security profile.
Critical Modules and high-assurance applications add relevant Level 3 controls.
The Security Control Manifest maps controls and Threat Model mitigations to
owners, gates, and evidence. A Risk Exception is time-limited and cannot waive
authentication, authorization, tenant isolation, data integrity, remote code
execution, or secret exposure defects.

Reliability gates prove deterministic state transitions, graceful shutdown,
bounded retries, recovery, readiness, migration safety, and durable delivery.
Performance gates compare pinned reference runners, retain raw evidence, apply
noise floors and relative budgets, and treat leaks, starvation, unboundedness,
security failure, correctness failure, or declared JIT/AOT divergence as
release-blocking.

Native AOT and trimming are exact package, Preset, provider, runtime, OS, and
RID claims. The persistence-free `api` Preset is the primary target profile;
EF Core modular/full-stack profiles are JIT-first until executable evidence
proves more.

## Release train and Platform Migrations

One synchronized Platform Version covers first-party packages, templates, the
Tool, migrations, Skills, schemas, documentation, and evidence. Keep Installed
Platform Version, Platform Contract Version, and Manifest Schema Version
distinct.

The exact-version Platform Tool inspects first, produces a deterministic
reviewable migration plan, stops on ambiguity, applies only an unchanged
approved plan, and verifies postconditions. Templates are never reapplied over
application code. Migration recovery is classified honestly; universal rollback
is not promised.

Release candidates are built once, signed, verified, and promoted without
rebuild. The executable `npm run verify:release-candidate` surface fails closed
when an artifact, gate attempt, evidence category, exact-byte policy, schema,
fixture path, or candidate digest is missing or changed. A release-blocking fix
creates a new candidate and reruns affected gates; the prior candidate is
invalidated rather than patched. The trust chain binds author identity, OIDC
publishing identity, SBOM, provenance, content-addressed Candidate Evidence,
Promotion Receipts, and final Release Evidence.

The first production line starts at `1.0.0`. The support model retains the
current Active major and the immediately previous Maintenance major, subject to
upstream support and the evidence required by the release policy.

## Canonical knowledge and documentation

Each authority has one job:

| Authority | Owns |
| --- | --- |
| `CONTEXT.md` | Platform vocabulary |
| `docs/architecture/` | Current and approved target structure |
| `docs/adr/` | New hard-to-reverse or surprising implementation decisions |
| `martix.platform.json` | Exact Generated Solution composition and migration state |
| `schemas/` and `eng/quality-gates.json` | Machine contracts and quality policy |
| Change fragments and task/PR records | Observable release intent, rationale, evidence, and consequences |
| `AGENTS.md` and the Platform Skill | Routing and workflow guidance |

The Platform Tool may generate ephemeral secret-free agent context from these
authorities. A second committed architecture or agent manifest is not created.

## Decision sources

- [AOT and performance matrix](../wayfinder/martix-platform/tickets/112-aot-performance-matrix.md)
- [Executable quality gates](../wayfinder/martix-platform/tickets/113-quality-gates.md)
- [Release and Platform Migration policy](../wayfinder/martix-platform/tickets/114-release-migration-policy.md)
- [Agent guidance package](../wayfinder/martix-platform/tickets/115-agent-guidance.md)
- [Prioritized implementation roadmap](../wayfinder/martix-platform/migration-roadmap.md)
