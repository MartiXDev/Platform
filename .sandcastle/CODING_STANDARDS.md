# Coding Standards

Distilled from `docs/wayfinder/martix-platform/`. Wayfinder is historical
provenance; current architecture, manifests, and gates are authoritative.

## Architecture

- MUST prefer composition over inheritance; keep types internal/sealed by
  default. Reject universal bases, marker interfaces, service locators,
  pass-through wrappers, generic repositories/UoW, and speculative abstractions.
- MUST compose behavior explicitly at compile time. No assembly scanning,
  reflection discovery, hidden startup hooks, global mutable registries, or
  broad `AddDefaults` methods.
- MUST use first-party .NET APIs unless a concrete force and evidence justify a
  dependency, wrapper, package, or project.
- MUST keep dependency direction and ownership visible; avoid catch-all
  `Core`, `Common`, `Shared`, or `Abstractions` surfaces.

## Generation

- The Capability Matrix and `martix.platform.json` are executable truth. Reject
  invalid selections, generate deterministically, and emit nothing unselected.
- `api` is lean; `modular-monolith` is the default persistence/events topology;
  `full-stack` adds exactly one UI provider. Generate only real boundaries.
- Generated source becomes application-owned. Use explicit Platform Migrations;
  never overwrite it with a template rerun.
- Do not generate placeholders, fake modules, empty projects, or sample identity.

## Modules

- A Business Module owns its domain, persistence, migrations, contracts, and
  Integration Events. Modules form an acyclic graph and cannot access another
  module's internals, tables, EF model, or migrations.
- Use thin endpoints over internal sealed Application Operations. Endpoints own
  binding, transport validation, metadata, typed responses, and mapping;
  Operations own use cases, domain rules, persistence, cancellation, and
  transport-neutral `Result` values.
- Cross-module calls use immutable, provider-owned Module Contracts. Never expose
  entities, EF, `IQueryable`, repositories, transactions, HTTP, or SDK types.

## Data and Events

- Each persistent module owns one `DbContext`, schema, model, and migrations.
  Compose EF explicitly; do not use scanning, lazy loading, hidden providers, or
  InMemory as relational/concurrency evidence.
- The one-shot Migrator is the only production schema path. The serving API must
  not run `Migrate`, `EnsureCreated`, or implicit production seeding at startup.
- Business state and Outbox capture commit atomically. Events are immutable,
  versioned, publisher-owned, bounded source-generated JSON; no CLR names,
  secrets, exceptions, or SDK types on the wire.
- Delivery is at-least-once, never exactly-once transport. Use durable leases
  with fencing, bounded retries/concurrency, terminal failures, and atomic Inbox
  Receipts. Expect duplicates; external effects require a new durable intent.

## HTTP and Identity

- Minimal APIs are canonical. Map endpoints explicitly with `/api/v{major}`
  routes, endpoint DTOs, typed results, exact metadata, and cancellation.
- Use one RFC 9457 Problem Details contract and build-generated OpenAPI 3.1.
  Never expose entities, `Result` types, raw exceptions, SQL, secrets, or fake
  `Location` values.
- Idempotency, `If-Match`, caching, pagination, deprecation, and sunset are
  explicit capabilities, not global defaults.
- Authentication provider and flow are explicit. Application code receives an
  immutable `ActorSnapshot`, never `HttpContext`, raw claims, provider roles,
  `IdentityUser`, or ambient current-user state.
- Authorization fails closed: endpoint admission plus operation-level resource
  and business checks. Anonymous intent and background/service Actors are
  explicit; unresolved Actor context is denied.
- Production security is mandatory without authentication: trusted HTTPS/proxy,
  explicit hosts/CORS, antiforgery for cookie writes, limits, safe secrets, and
  startup rejection of unsafe configuration.

## UI, Providers, Operations

- Full Stack selects exactly one UI provider. UI references only HTTP/OpenAPI,
  never API or Business Module assemblies. Remote API state has one owner.
- Provider support requires exact versions, configuration, security, operations,
  and evidence. A listed or client-requested provider is not automatically
  Supported; Deferred providers stay absent.
- An absent capability contributes no dependency, registration, worker, health
  check, telemetry, container, or deployment resource. Adapters must not leak SDK
  types inward.
- `dotnet run` remains usable. Aspire, Docker, Compose, clouds, and orchestrators
  are optional; artifacts are immutable and built once. Compose makes no HA claim.

## Security and Quality

- Libraries use `ILogger<T>`, `ActivitySource`, and `IMeterFactory`; hosts own
  exporters. Signals have stable names, bounded dimensions, and W3C context.
- Treat unknown data as sensitive. Never emit secrets, credentials, tokens,
  cookies, raw payloads, SQL, unrestricted exception text, or high-cardinality
  identifiers in logs, traces, metrics, errors, health, or audit.
- `/alive` does no downstream I/O; `/ready` checks only work-critical dependencies.
  Probes do not migrate, recover, scan, or expose secrets. User-controlled URLs
  require SSRF validation; outbound calls are bounded, cancellable, and typed.
- Test invariants, failures, authorization negatives, cancellation, rollback,
  concurrency, restart, migrations, contracts, generated output, and real
  providers. Required gates fail closed: no skips, waivers, or retry-to-green.
- AOT/trimming claims are exact published-artifact claims across package,
  capability, provider, SDK, OS, and RID. Compilation or `IsAotCompatible` is
  insufficient; declared profiles need warning-free black-box parity.

## Changes

- Keep Platform artifacts on one synchronized SemVer train. Build once and
  promote immutable, attested artifacts with release evidence.
- Put durable truth in its owner: `CONTEXT.md` vocabulary, architecture/ADRs,
  manifests, quality policy, and `AGENTS.md`/Skills for routing. Do not duplicate
  architecture decisions in prompts.
- Record each meaningful change's intent, alternatives, migration, evidence,
  risks, deferred scope, and supersession in the appropriate canonical artifact.
