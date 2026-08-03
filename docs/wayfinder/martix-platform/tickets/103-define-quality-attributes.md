---
title: Define measurable platform quality attributes
status: closed
type: wayfinder:grilling
parent: ../map.md
blocked_by: []
resolved: 2026-07-15
---

## Question

What measurable acceptance thresholds should translate top quality, performance, security, maintainability, simplicity, and enterprise readiness into release gates for Platform Libraries, generated Presets, and Platform Migrations?

## Resolution

Use strict, composable Quality Gate Profiles. A capability is either **Supported**—every required gate passes for every declared supported combination before release—or **Experimental**—clearly labelled, excluded from production Presets, and carrying no compatibility or production-readiness guarantee. Do not create ambiguous intermediate support labels. Verification cadence may differ by cost, but every Supported profile must be green before release.

The complete release contract is:

`common baseline + artifact profile + Preset profile + selected Capability profiles + provider/runtime/OS matrix`

Platform Libraries, generated Presets, and Platform Migrations therefore receive different evidence appropriate to their risks while sharing the same non-negotiable baseline. Unsupported combinations fail during generation. High-risk capability interactions receive explicit combination tests.

## Common baseline

Every required lane has:

- 100% passing deterministic tests, zero skips, zero retry-to-green acceptance, and zero known flaky tests;
- clean restore and Release build with zero compiler, nullable, code-style, platform-analyzer, and approved custom-analyzer warnings;
- zero formatting, Markdown, generated-file-consistency, architecture-dependency, or documentation-link violations;
- zero blanket suppressions; any necessary suppression is narrow and justified;
- deterministic package output and validation of actual packed contents;
- API compatibility comparison with the latest Supported stable release; and
- actual Windows and Linux generation, restore, build, and test evidence for generated Presets. Other operating systems are required only when declared Supported.

High-confidence external-tool findings may block releases, but the Platform does not pursue an arbitrary zero score across every SonarQube, Qodana, or similar rule.

## Correctness profile

- Platform Libraries require at least 90% line coverage, 85% branch coverage, and 95% changed-line coverage.
- Critical Modules—Result/error, security, authorization, outbox, idempotency, migrations, and concurrency behavior—directly test every documented invariant, error path, and concurrency guarantee regardless of aggregate coverage.
- Deterministic core logic requires at least an 80% mutation score, measured nightly and before release.
- Generated Presets are judged by Supported Capability scenarios rather than boilerplate coverage. Every selected capability has success, failure, misconfiguration, and composition scenarios at the appropriate host/integration seam.
- Platform Migrations have before/after fixtures for every supported source version and capability combination and pass the complete target profile.

Universal 100% line coverage was rejected because it encourages low-value tests and does not prove invariants, integration behavior, or concurrency correctness.

## Build and compatibility profile

- Accidental source or binary compatibility breaks block a release.
- Intentional breaking changes require a major version, migration guide, and impact tests. Type forwarding or an equivalent bridge is used only when semantics remain identical.
- Every public API change is reviewed against an approved API baseline; every public member is documented and every new public contract has behavior and compatibility tests.
- Architecture tests enforce declared dependency direction, no cycles, and no access to another Business Module's internals, EF model, or tables.

## Security profile

- Apply [OWASP ASVS 5.0](https://owasp.org/www-project-application-security-verification-standard/) Level 2 to all production Presets and relevant Level 3 controls to Critical Modules and high-assurance applications. Universal Level 3 is not the default because some controls depend on application risk and business context.
- Maintain threat models for authentication, authorization, tenant isolation, sensitive data, file handling, webhooks, messaging, and other material trust boundaries.
- Block any confirmed critical/high vulnerability, reachable or exploitable moderate vulnerability, committed secret, unreviewed authorization change, or failing security test.
- Permit only owner-assigned, time-limited Risk Exceptions for non-reachable moderate or low findings. Never waive authentication, authorization, tenant-isolation, data-integrity, remote-code-execution, or secret-exposure defects.
- Audit direct and transitive packages with `NuGetAuditMode=all`; .NET 10 audits transitive dependencies by default, but the Platform declares this explicitly to prevent weakening ([Microsoft](https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/10.0/nugetaudit-transitive-packages)). Require dependency review, deterministic restore, license checks, SAST, secret scanning, and security integration tests.
- Every protected resource has positive and negative authorization tests. Anonymous access is explicit and missing or uncertain policy fails closed.
- Release artifacts carry an SPDX SBOM and verifiable provenance/attestation. GitHub documents attestations as signed claims tying an artifact to its source and build workflow ([GitHub](https://docs.github.com/en/code-security/concepts/supply-chain-security/supply-chain-security)).
- Use [NIST SSDF 1.1](https://csrc.nist.gov/pubs/sp/800/218/final) for the secure-development process and ASVS for application verification.
- Obtain an independent penetration test before the first stable Platform release, after material trust-boundary changes, and periodically for production-critical deployments—not mechanically for every patch.
- Published-vulnerability response targets are 24 hours for actively exploited/critical issues, 7 days for high, 30 days for moderate, and 90 days for low. Stop or revoke an affected release when exploitation risk requires it.

## Performance profile

Use relative Platform regressions plus application-owned absolute SLOs. Universal latency or throughput promises are invalid without a declared workload and environment.

- Platform Library hot paths use repeatable BenchmarkDotNet baselines. Block a repeatable regression of at least 5% in execution time/throughput or allocations, and any new allocation on a deliberately zero-allocation path, after accounting for the validated noise floor.
- Controlled generated-host scenarios block more than 5% p50/p95 latency regression, 10% p99 latency regression, 5% throughput regression, unexpected request failures, thread-pool starvation, sustained resource leakage, or unbounded queues.
- Cold-start scenarios block more than 10% regression in startup time, working set, or published artifact size unless a deliberately selected capability justifies it.
- Every combination later declared trimming/Native-AOT Supported must publish without relevant warnings and pass startup and HTTP contract tests; compilation alone is not AOT evidence.
- Run fast relevant smoke checks on pull requests and stable isolated benchmark/load scenarios nightly and before release. Intentional regressions require profiling evidence and an architectural decision.
- Each production Generated Solution declares its own latency, throughput, availability, resource, and scaling SLOs. The Platform supplies instrumentation and load-test hooks.

The current WebApi BenchmarkDotNet project becomes useful only when its decision-relevant cases have stored baselines and release gates; producing benchmark numbers alone is not evidence. BenchmarkDotNet supports repeatable timing and memory comparison ([Microsoft](https://learn.microsoft.com/en-us/visualstudio/profiling/profiling-with-benchmark-dotnet?view=visualstudio)).

## Reliability and data-integrity profile

- Business state and its Integration Events commit atomically. Failure injection before commit, after commit, during publication, and before acknowledgement proves zero lost committed events.
- Integration Event transport guarantees at-least-once delivery. Duplicate delivery is expected, observable, and tested; idempotency provides exactly-once business effects where required without claiming exactly-once transport.
- Concurrent repetitions of an idempotency-protected request create one business effect. The same key and payload return the recorded outcome; the same key with a different payload is rejected; records survive restart and multiple instances.
- Every declared atomic operation has commit/rollback tests. Optimistic-concurrency conflicts have explicit outcomes. Retries are bounded and used only for transient, idempotent, or transactionally safe operations; cancellation and timeouts propagate. EF Core transaction and retry interactions require deliberate verification ([Microsoft](https://learn.microsoft.com/en-us/ef/core/saving/transactions)).
- Database migrations test realistic before/after data for every supported source, preserve/transform data, produce reviewed deployment scripts or bundles, prove claimed idempotency, and include roll-forward or rollback recovery. Use expand/contract when versions overlap. Do not give the normal production host schema-modification privileges or apply migrations during ordinary startup ([Microsoft](https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations/applying)).
- Durable workers stop predictably, leave incomplete work recoverable, bound retries, and expose poison work in an observable terminal state.
- Separate liveness from readiness and test startup, dependency loss/recovery, shutdown, and multi-replica behavior ([Microsoft](https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/health-checks?view=aspnetcore-10.0)).
- Acceptance requires zero lost committed data/events, zero unintended duplicate effects on protected operations, and 100% passing deterministic failure-matrix scenarios. Recovery-time and availability objectives remain application SLOs.

## Maintainability and simplicity profile

- Every Platform abstraction must be a Deep Module that hides meaningful policy or volatile provider complexity. Reject interface-per-class, pass-through services, and wrappers that merely rename .NET APIs.
- Every new production dependency records why .NET is insufficient, maintenance health, license, security, AOT/trimming implications, and exit cost. Versions remain centrally managed; unused references and unintended transitive API exposure are forbidden.
- Cognitive complexity above 15 per non-generated method blocks acceptance until simplified or narrowly justified. Changed-code duplication remains at or below 3% as an automated signal. Duplication of business knowledge is forbidden regardless of percentage; superficially similar code may remain separate when concepts evolve independently.
- No unresolved production TODO/FIXME exists without a linked, accepted tracked item. Changed code leaves its affected Module at least as simple and well-tested as before.
- A Preset contains no unused project, package, registration, worker, provider, or deployment resource. Optional capabilities appear only when selected and can later be added through a documented Platform Migration.

Enterprise-Ready means verified boundaries, provider seams, operational hooks, compatibility contracts, and migration paths—not preinstalled enterprise infrastructure or speculative abstractions.

## Operability and observability profile

- All Platform options are strongly typed, validated at startup, and tested for missing, malformed, contradictory, and insecure values. Invalid configuration fails before traffic is accepted. .NET supports this through `ValidateOnStart` ([Microsoft](https://learn.microsoft.com/en-us/dotnet/core/extensions/options)).
- Platform Libraries emit vendor-neutral telemetry using `ILogger`, `ActivitySource`, and `IMeterFactory`; exporters remain host capabilities. .NET treats library instrumentation and application collection as separate responsibilities ([Microsoft](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/distributed-tracing)).
- External calls, durable/background operations, Integration Events, and declared Critical Module operations propagate trace context and have contract-tested activity names, metrics, log event IDs, dimensions, and failure correlation.
- Zero secrets or unredacted classified data may enter logs, traces, metrics, or errors. Metric dimensions have bounded cardinality and payload logging is disabled by default. Use standard classification/redaction facilities where needed ([Microsoft](https://learn.microsoft.com/en-us/dotnet/core/extensions/data-redaction)).
- Repeated/hot logging paths use source-generated `LoggerMessage` APIs to avoid runtime parsing, boxing, and temporary allocations ([Microsoft](https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/source-generation)). Disabled telemetry has negligible measured overhead; duplicate spans and duplicate failure logs are rejected.
- Every production Preset provides health semantics, configuration diagnostics, logs, traces, metrics, deployment smoke tests, and baseline runbook/alert templates without forcing a vendor. Multi-instance tests prove correctness does not rely on process-local state.
- Acceptance requires all declared operational scenarios to be diagnosable, zero sensitive-data/cardinality violations, zero invalid configurations accepted at startup, and zero mandatory monitoring-vendor dependencies in Platform Libraries.

## Developer experience, documentation, and agent readiness

Canonical Knowledge is divided by purpose: terminology in `CONTEXT.md`; complete Wayfinder rationale in resolution tickets; hard-to-reverse decisions in ADRs; current state in architecture documents; task guidance in guides; concise rules and pointers in `AGENTS.md`; repeatable procedures in Skills. A future Plugin may distribute Skills and tools but is not an architectural source of truth.

- Every Supported combination installs, generates, restores, builds, tests, and starts on clean Windows and Linux runners with zero unresolved tokens, placeholder code, or manual search-and-replace. Invalid combinations fail before generation; output is deterministic after normalizing declared variable identifiers and includes a valid Capability Manifest.
- On the controlled reference environment, the default API Preset generates and reaches a successful health request within five minutes including restore/build. Other Presets declare reference budgets.
- Commands, snippets, links, schemas, and generated examples are verified where technically possible. Every Supported Capability documents purpose, selection, configuration, security, operational signals, compatibility, tests, and migration/removal.
- Skills inspect the Capability Manifest and repository state, consume Canonical Knowledge rather than duplicating it, and rely on deterministic gates rather than agent confidence.
- Versioned agent evaluations cover Preset generation, vertical slices, provider capabilities, Module Contracts, Platform Migrations, and seeded diagnosis. Before stable Platform/Skill release, at least two supported LLM configurations perform the tasks; resulting artifacts pass the normal gates. The workflow remains provider-neutral.

## Release evidence and exceptions

Every Supported Release has an immutable, machine-readable Release Evidence Manifest containing source/tree state, toolchain and dependencies, complete supported matrix, gate/report locations, coverage/mutation and benchmark evidence, security results, SBOM, hashes, attestations, API compatibility, and migration results.

- Build the candidate once, sign/attest it, and promote the same bytes.
- A failing required gate cannot be waived. Fix it, delay release, remove the combination from the Supported matrix, or classify the capability as Experimental before release.
- A rerun does not erase a failure; infrastructure failures and flakiness require recorded disposition and root-cause action.
- Do not weaken a threshold retroactively to make a failed release pass. Policy changes require an ADR and apply prospectively unless explicitly reviewed as the purpose of the change.
- Retain immutable evidence and artifacts for the support period. An escaped defect receives root-cause analysis, a regression test, and an improved gate where the process failed.
- Packages, Presets, Platform Migrations, documentation, Skills, changelog, and evidence must describe the same release behavior.

## Rationale

One universal score cannot prove different artifacts: a reusable library risks compatibility and hot-path regressions; a Generated Preset risks invalid composition and host behavior; a Platform Migration risks data loss and incomplete transformation. Composable profiles make support strict without forcing unused capabilities into applications.

Percentage-only quality targets, universal latency promises, mandatory enterprise infrastructure, and scan-only security create confidence theater. The chosen profiles combine numeric regression limits with direct invariant, failure, compatibility, composition, and operational evidence.

## Alternatives considered

- Allow tolerated failures, quarantine, or retry-to-green for Supported combinations. Rejected because Supported would cease to be a reliable contract.
- Require a universal 100% line-coverage target. Rejected because it rewards incidental execution instead of invariant and failure evidence.
- Apply one Quality Gate Profile to every artifact. Rejected because libraries, generated hosts, and migrations have different failure modes.
- Require ASVS Level 3 for every application. Rejected because many Level 3 controls require application-specific risk and business context; Level 2 plus relevant Level 3 controls is stricter and more honest.
- Set universal absolute latency, throughput, availability, or recovery objectives. Rejected because those depend on workload and infrastructure; Platform regressions are gated and applications own absolute SLOs.
- Preinstall all enterprise capabilities. Rejected because unused infrastructure increases attack surface, cost, and conceptual load; tested extension paths provide enterprise readiness.
- Put all decisions and workflows in `AGENTS.md` or a Skill. Rejected because canonical knowledge, concise routing, and executable procedures have different audiences and change rates.
- Permit maintainer or deadline overrides for failed gates. Rejected because the Experimental label and supported-matrix adjustment provide honest alternatives.

## Consequences for downstream tickets

- [Design the supported capability and preset matrix](104-capability-preset-matrix.md) must assign the common, Preset, Capability, and combination profiles.
- [Define the security and observability baseline](111-security-observability-baseline.md) must turn the accepted ASVS, threat-model, data-safety, and telemetry contracts into concrete Platform behavior.
- [Define the AOT and performance compatibility matrix](112-aot-performance-matrix.md) must select the exact controlled environments, benchmark cases, AOT combinations, and stored baselines.
- [Define executable quality gates and template verification](113-quality-gates.md) must encode these thresholds, evidence, cadence, and failure semantics in CI.
- [Define release, compatibility, and Platform Migration policy](114-release-migration-policy.md) must define the Release Evidence Manifest schema, support windows, candidate promotion, and migration governance.
- [Design the MartiX agent guidance package](115-agent-guidance.md) must implement the documentation hierarchy, manifest-aware workflows, and provider-neutral agent evaluation suite.
