# FluentValidation testing map

## Purpose

Provide a compact source map for FluentValidation testing so rule files can stay
decision-oriented while still pointing back to the official docs that justify
validator-level and application-boundary testing guidance.

## Start here when

- The main hesitation is test-layer choice rather than assertion syntax.
- You need a quick route for validator tests versus framework-boundary tests.

## Normative core guidance

- Treat validators as black boxes. Pass representative models into a real
  validator instance and assert on the resulting validation failures instead of
  inspecting rule-chain construction or FluentValidation internals.
- Use `TestValidate` / `TestValidateAsync` from `FluentValidation.TestHelper`
  for validator-focused tests. Match the async path when the validator contains
  async rules or async conditions.
- Assert the failure details that matter to the contract: property path, error
  message, error code, severity, and custom state. Use `Only()` when the test
  needs to prove there were no extra failures beyond the asserted conditions.
- Do not mock validators for routine tests. If a higher-level test truly needs
  an `IValidator<T>` stub, prefer `InlineValidator<T>` so the stub still creates
  real FluentValidation failures.
- Verify registration, request-pipeline wiring, and HTTP/model-state translation
  through the real application entrypoints instead of re-testing validator
  internals inside controller, endpoint, or minimal API tests.
- Treat async validation as an end-to-end concern. Validators with
  `MustAsync`, `CustomAsync`, or `WhenAsync` must be exercised with
  `ValidateAsync`/`TestValidateAsync`, and ASP.NET's legacy validation-pipeline
  auto-validation is the wrong boundary for those validators.

## Use this test layer when...

| Need | Prefer | Why |
| --- | --- | --- |
| Prove rule behavior, property paths, or failure metadata for one validator | Validator test with `TestValidate` or `TestValidateAsync` | Fastest black-box coverage with the least framework noise |
| Prove DI registration, endpoint or controller wiring, filter behavior, or HTTP/model-state translation | Application-boundary integration test | Exercises the real entrypoint and keeps framework behavior in one place |
| Keep a higher-level test focused while substituting `IValidator<T>` intentionally | `InlineValidator<T>` boundary stub | Produces real FluentValidation failures without mocking validator internals |
| The validator contains `MustAsync`, `CustomAsync`, or `WhenAsync` | The async version of the chosen layer | Keeps the test path aligned with `ValidateAsync(...)` and catches sync-over-async mistakes |

## Official docs at a glance

| Topic | Primary source | What to extract |
| --- | --- | --- |
| Validator black-box testing | [Testing](https://docs.fluentvalidation.net/en/latest/testing.html) | `TestValidate`, property-path assertions, metadata assertions, `Only()`, and the black-box testing stance |
| Async rule boundaries | [Asynchronous Validation](https://docs.fluentvalidation.net/en/latest/async.html) | `ValidateAsync` requirement, async rule/condition behavior, and the warning about ASP.NET automatic validation |
| Custom validator outputs | [Custom Validators](https://docs.fluentvalidation.net/en/latest/custom-validators.html) | Observable failure behavior from `Must`, `Custom`, and reusable property validators, including messages and custom property names |
| ASP.NET integration boundaries | [ASP.NET Core integration](https://docs.fluentvalidation.net/en/latest/aspnet.html) | Manual validation, legacy automatic validation-pipeline limitations, filter-based auto-validation, and minimal API validation responses |

## Boundary decisions

- Use validator tests when the risk is rule behavior for a single model type:
  required values, cross-property checks, collection paths, async uniqueness
  checks, custom message placeholders, or custom validator output.
- Use application integration tests when the risk is framework wiring: DI
  registration, whether validation runs at the chosen entrypoint, how failures
  land in `ModelState`, or how a web API turns failures into
  `ValidationProblemDetails`-style responses.
- Keep validator tests specific about failure shape, then keep integration tests
  specific about boundary behavior. Do not duplicate every rule assertion at
  both layers.

## Review checklist

- The map clearly separates validator black-box tests from application entrypoint
  integration tests.
- Async guidance consistently points to `TestValidateAsync` /
  `ValidateAsync` and calls out the ASP.NET validation-pipeline limitation.
- Mocking guidance prefers real validators and uses `InlineValidator<T>` only
  as an intentional boundary stub.
- Cross-links point to the FluentValidation testing rules that consume this map.

## Related files

- [Validator test helper rule](../rules/testing-validator-testhelper.md)
- [Integration boundaries rule](../rules/testing-integration-boundaries.md)

## Source anchors

- [Testing: using `TestValidate`](https://docs.fluentvalidation.net/en/latest/testing.html#using-testvalidate)
- [Testing: asynchronous `TestValidateAsync`](https://docs.fluentvalidation.net/en/latest/testing.html#asynchronous-testvalidate)
- [Testing: mocking guidance and `InlineValidator<T>`](https://docs.fluentvalidation.net/en/latest/testing.html#mocking)
- [Async validation](https://docs.fluentvalidation.net/en/latest/async.html)
- [Custom validators: predicate validator](https://docs.fluentvalidation.net/en/latest/custom-validators.html#predicate-validator)
- [Custom validators: writing a custom validator](https://docs.fluentvalidation.net/en/latest/custom-validators.html#writing-a-custom-validator)
- [Custom validators: reusable property validators](https://docs.fluentvalidation.net/en/latest/custom-validators.html#reusable-property-validators)
- [ASP.NET Core integration: manual validation](https://docs.fluentvalidation.net/en/latest/aspnet.html#manual-validation)
- [ASP.NET Core integration: automatic validation pipeline](https://docs.fluentvalidation.net/en/latest/aspnet.html#using-the-asp-net-validation-pipeline)
- [ASP.NET Core integration: filter-based validation](https://docs.fluentvalidation.net/en/latest/aspnet.html#using-a-filter)
- [ASP.NET Core integration: minimal APIs](https://docs.fluentvalidation.net/en/latest/aspnet.html#minimal-apis)
