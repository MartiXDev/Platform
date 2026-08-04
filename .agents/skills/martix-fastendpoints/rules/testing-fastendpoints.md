# FastEndpoints testing

## Purpose

Set the default testing strategy for FastEndpoints applications so endpoint
behavior is verified at the right layer without losing the framework-specific
benefits of typed endpoints, route-less request helpers, and cached test hosts.

## Default guidance

- Prefer integration tests for endpoint behavior. Use
  `FastEndpoints.Testing` with `AppFixture<TProgram>`, `TestBase<>`, and typed
  `HttpClient` extension methods so tests exercise the real FastEndpoints
  pipeline without hard-coding route strings.
- Keep the SUT stable and reusable. Put shared setup in the app fixture, let the
  fixture cache the WAF/SUT by default, and rely on `appsettings.Testing.json`
  plus fixture service overrides for test-time configuration.
- Use Testcontainers or other real infrastructure only when the behavior depends
  on infrastructure semantics. Start those dependencies in `PreSetupAsync()` so
  the host is built against ready infrastructure exactly once per fixture type.
- Use a test authentication scheme for protected endpoints instead of bypassing
  auth entirely when the scenario needs to prove authentication and
  authorization behavior.
- Use `Factory.Create<TEndpoint>()` for unit tests only when you want to isolate
  handler logic from middleware, binding, validation, auth, and processors.
  Register test services explicitly when the endpoint depends on DI-driven
  collaborators.
- For endpoints that execute commands or publish events, use test command/event
  receivers in integration tests and fake handlers in unit tests so assertions
  stay about observable behavior instead of internal plumbing.
- Forward logs to the test runner only when diagnostics matter; keep the default
  test surface assertion-driven and noise-light.

## Avoid

- Do not default to handler-only unit tests for scenarios where route matching,
  model binding, validation, auth, or serializer behavior is the real risk.
- Do not hard-code endpoint URLs in tests when the FastEndpoints typed request
  helpers can infer the route from the endpoint type.
- Do not assume `Factory.Create<TEndpoint>()` runs middleware, validators,
  processors, or authentication; it does not.
- Do not disable fixture caching or force per-test host creation unless the
  scenario truly requires strict isolation.
- Do not verify command or event behavior by mocking FastEndpoints internals when
  the testing package already provides receiver-based patterns for integration
  coverage.

## Review checklist

- The chosen test layer matches the risk: integration for pipeline behavior,
  unit for isolated handler logic.
- Shared test host setup lives in an `AppFixture` instead of being repeated per
  test class or method.
- Protected-endpoint tests use a deliberate auth strategy rather than skipping
  auth unintentionally.
- Infrastructure-dependent tests use realistic dependencies only where those
  semantics matter.
- Command, event, and logging assertions use cookbook-supported patterns instead
  of ad hoc infrastructure.

## Related files

- [Testing and versioning map](../references/testing-versioning-map.md)
- [Cookbook index](../references/cookbook-index.md)
- [Versioning and release groups rule](./versioning-release-groups.md)

## Source anchors

- [FastEndpoints integration and unit testing](https://fast-endpoints.com/docs/integration-unit-testing)
- [FastEndpoints cookbook](https://fast-endpoints.com/docs/the-cookbook)
- [Cookbook recipe: mock/test auth handler](https://gist.github.com/dj-nitehawk/84fe7b3a69d65e92a94f95e42c962f9e)
- [Cookbook recipe: TestContainers with AppFixture](https://gist.github.com/dj-nitehawk/04a78cea10f2239eb81c958c52ec84e0)
- [Cookbook recipe: integration test command execution](https://gist.github.com/dj-nitehawk/abf3fd08bae544ee3bcafb5c5f487c4a)
- [Cookbook recipe: integration test event publishing](https://gist.github.com/dj-nitehawk/ae85c63fefb1e8163fdd37ca6dcb7bfd)
- [Cookbook recipe: unit test command execution](https://gist.github.com/dj-nitehawk/f0c5c95c57ac1f1d15c936e9d87734b0)
- [Cookbook recipe: unit test event publishing](https://gist.github.com/dj-nitehawk/8ab7bb4ce5b69152b07b9186d7c40e40)
- [Cookbook recipe: xUnit log forwarding](https://gist.github.com/dj-nitehawk/58c14fd593cf58fa5e8df95cfb9eb549)
