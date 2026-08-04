# FluentValidation testing integration boundaries

## Purpose

Define when FluentValidation behavior should be tested through validators
directly versus through framework entrypoints so tests cover application wiring
without re-testing FluentValidation internals.

## Default guidance

- Use direct validator tests when the risk is validator behavior for a model:
  rule outcomes, property paths, custom messages, async checks, and custom
  validator output.
- Use integration tests through the real application entrypoint when the risk is
  validation wiring: DI registration, request handling, model-state population,
  API error translation, filters, or endpoint behavior after validation fails.
- In ASP.NET Core, prefer testing the validation path the application actually
  uses: manual validation inside controllers or minimal APIs, or an async-capable
  filter-based approach if the app adopted one. Keep those tests focused on
  observable boundary outcomes such as `ModelState`, `ValidationProblem`, or the
  returned HTTP status/payload.
- Treat ASP.NET's validation-pipeline auto-validation as a legacy boundary. It
  is synchronous, MVC-only, harder to debug, and not recommended for new
  projects. Validators with async rules should not rely on that path, and tests
  should prove the app uses an async-capable validation flow instead.
- When application code depends on `IValidator<T>` but the test is not about the
  validator itself, prefer a small `InlineValidator<T>` stub over a mocking
  library. This keeps the substitution inside FluentValidation's own failure
  model.
- Prefer real validators in component and integration tests whenever validation
  behavior is part of the scenario. Mocked validators tend to encode brittle
  assumptions about internal rule structure and upgrade-sensitive behavior.
- If a custom validator changes the outward contract, cover its exact failure
  shape in validator tests first. Add an integration test only when the
  application's boundary translation of that failure is itself contractual.

## Avoid

- Do not duplicate validator rule assertions in every controller, endpoint, or
  HTTP test.
- Do not test request-pipeline behavior by bypassing the application's real
  entrypoint and calling validator internals directly.
- Do not use or defend the ASP.NET validation pipeline for async validators.
- Do not default to mocking libraries for `IValidator<T>` when a real validator
  or `InlineValidator<T>` stub is sufficient.
- Do not treat entrypoint integration tests as a replacement for focused
  validator black-box tests.

## Review checklist

- The chosen test layer matches the risk: validator behavior or application
  boundary wiring.
- Async validation paths are exercised asynchronously end to end.
- Boundary tests assert contract outcomes such as `ModelState`,
  `ValidationProblem`, or HTTP responses rather than validator construction
  details.
- Any validator substitution uses `InlineValidator<T>` intentionally and only for
  boundary isolation.
- Validator details are covered once in black-box validator tests instead of
  being copied across multiple higher-level suites.

## Related files

- [Testing map](../references/testing-map.md)
- [Validator test helper rule](./testing-validator-testhelper.md)

## Source anchors

- [Testing: mocking guidance and `InlineValidator<T>`](https://docs.fluentvalidation.net/en/latest/testing.html#mocking)
- [Async validation](https://docs.fluentvalidation.net/en/latest/async.html)
- [ASP.NET Core integration: manual validation](https://docs.fluentvalidation.net/en/latest/aspnet.html#manual-validation)
- [ASP.NET Core integration: automatic validation pipeline](https://docs.fluentvalidation.net/en/latest/aspnet.html#using-the-asp-net-validation-pipeline)
- [ASP.NET Core integration: filter-based validation](https://docs.fluentvalidation.net/en/latest/aspnet.html#using-a-filter)
- [ASP.NET Core integration: minimal APIs](https://docs.fluentvalidation.net/en/latest/aspnet.html#minimal-apis)
