# FastEndpoints testing and versioning map

## Purpose

Provide a compact source map for FastEndpoints testing and API versioning so
rule files can stay decision-oriented while still pointing back to the official
docs and cookbook recipes that justify the guidance.

## Normative core guidance

- Treat the official FastEndpoints docs as the primary authority for default
  testing and versioning behavior.
- Prefer integration tests for endpoint pipeline behavior because
  `FastEndpoints.Testing` plus typed `HttpClient` helpers exercise routing,
  binding, validation, filters, auth, and serialization with less setup than
  hand-rolled endpoint tests.
- Use unit tests with `Factory.Create<TEndpoint>()` only when the handler logic
  is the actual unit under test and a fully prepared request/context is
  acceptable.
- Prefer built-in route-based versioning unless the API contract explicitly
  requires header-based or package-driven version negotiation.
- Treat release groups and Swagger documents as consumer-facing artifacts: they
  should expose the latest intended endpoint version per release and make
  deprecation visible by policy rather than by accident.

## Official docs at a glance

| Topic | Primary source | What to extract |
| --- | --- | --- |
| Integration testing | [Integration & Unit Testing](https://fast-endpoints.com/docs/integration-unit-testing) | `AppFixture<TProgram>`, `TestBase<>`, route-less typed request helpers, fixture caching, `appsettings.Testing.json`, ordering, collection/state fixtures |
| Unit testing | [Integration & Unit Testing](https://fast-endpoints.com/docs/integration-unit-testing) | `Factory.Create<TEndpoint>()`, prepared DTO testing, service registration, route parameter setup, limits of handler-only tests |
| Built-in versioning | [API Versioning](https://fast-endpoints.com/docs/api-versioning) | `Version(n)`, startup versioning options, release groups, release versions, deprecation windows, route placement |
| Header-based versioning | [API Versioning](https://fast-endpoints.com/docs/api-versioning) | `Asp.Versioning.Http` support, version sets, Swagger docs per API version |
| Cookbook expansion | [The Cookbook](https://fast-endpoints.com/docs/the-cookbook) | Linked recipes that deepen testing and versioning scenarios without replacing the official defaults |

## Cookbook-derived advanced patterns

These patterns come from cookbook-linked recipes and should be treated as
second-pass implementation guidance after the official docs.

### Testing patterns

- Use a custom test authentication scheme in the fixture to hit protected
  endpoints without real token issuance, while still exercising auth middleware
  and authorization decisions.
- Use `PreSetupAsync()` in an `AppFixture` to start Testcontainers-backed
  infrastructure before the cached WAF/SUT instance is created.
- Register test command receivers or test event receivers for integration tests
  that need to verify `ExecuteAsync()` or `PublishAsync()` side effects without
  weakening endpoint design.
- Register fake command or event handlers only in unit tests where the handler
  logic is isolated with `Factory.Create<TEndpoint>()`.
- Forward application logs into xUnit's message sink when endpoint failures are
  hard to diagnose through HTTP assertions alone.

#### Versioning patterns

- Use `ShowDeprecatedOps = true` in Swagger documents when consumers need to see
  the current release alongside explicitly deprecated operations during a
  migration window.
- Mark only the last superseded endpoint version with `deprecateAt` instead of
  retrofitting every older type; release-group filtering already suppresses
  earlier iterations.
- Use `FastEndpoints.AspVersioning` with named version sets and
  `MapToApiVersion(...)` when the API must follow header-based or more
  traditional ASP.NET API versioning conventions.

## First-pass boundaries

- This workstream covers the official testing and versioning docs plus the
  cookbook recipes directly linked from the testing and versioning sections.
- Cookbook links are recipe samples, not a formal specification. Re-check the
  latest gist or sample before copying exact API shape into production code.
- Wider cookbook areas such as auth, validation, and Swagger customization are
  indexed separately so they can be pulled in only when a FastEndpoints task
  actually crosses those domains.

## Review checklist

- The map clearly separates official default guidance from cookbook-derived
  advanced patterns.
- Testing guidance distinguishes pipeline/integration coverage from handler-only
  unit coverage.
- Versioning guidance distinguishes built-in route versioning from
  `Asp.Versioning.Http` integration.
- Cross-links point to the rule files that consume this map.

## Related files

- [Cookbook index](./cookbook-index.md)
- [Testing FastEndpoints rule](../rules/testing-fastendpoints.md)
- [Versioning and release groups rule](../rules/versioning-release-groups.md)

## Source anchors

- [FastEndpoints integration and unit testing](https://fast-endpoints.com/docs/integration-unit-testing)
- [FastEndpoints API versioning](https://fast-endpoints.com/docs/api-versioning)
- [FastEndpoints cookbook](https://fast-endpoints.com/docs/the-cookbook)
- [Cookbook recipe: mock/test auth handler](https://gist.github.com/dj-nitehawk/84fe7b3a69d65e92a94f95e42c962f9e)
- [Cookbook recipe: TestContainers with AppFixture](https://gist.github.com/dj-nitehawk/04a78cea10f2239eb81c958c52ec84e0)
- [Cookbook recipe: integration test command execution](https://gist.github.com/dj-nitehawk/abf3fd08bae544ee3bcafb5c5f487c4a)
- [Cookbook recipe: integration test event publishing](https://gist.github.com/dj-nitehawk/ae85c63fefb1e8163fdd37ca6dcb7bfd)
- [Cookbook recipe: unit test command execution](https://gist.github.com/dj-nitehawk/f0c5c95c57ac1f1d15c936e9d87734b0)
- [Cookbook recipe: unit test event publishing](https://gist.github.com/dj-nitehawk/8ab7bb4ce5b69152b07b9186d7c40e40)
- [Cookbook recipe: xUnit log forwarding](https://gist.github.com/dj-nitehawk/58c14fd593cf58fa5e8df95cfb9eb549)
- [Cookbook recipe: Asp.Versioning.Http integration](https://gist.github.com/dj-nitehawk/fbefbcb6273d372e5e5913accb18ab76)
- [Cookbook recipe: show deprecated versions in Swagger](https://gist.github.com/dj-nitehawk/c32e7f887389460c661b955d233b650d)
