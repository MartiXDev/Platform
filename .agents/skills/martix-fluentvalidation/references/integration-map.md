# FluentValidation integration map

## Purpose

Map the FluentValidation integration guidance in this workstream back to the
official docs first, while clearly separating legacy or third-party ecosystem
guidance.

## Start here when

- The main hesitation is validation-boundary choice rather than DI mechanics.
- You need a fast route for manual validation versus filter integration versus
  legacy MVC auto-validation before opening the linked rules.

## Quick decision aid

| If this is true | Prefer | Why |
| --- | --- | --- |
| New application code, explicit controller or endpoint ownership, or any validator may use async rules | Manual validation in application code | First-party default, keeps `ValidateAsync(...)` available, and makes `ValidationProblem` or `Results.ValidationProblem(...)` mapping explicit |
| You want automatic HTTP-boundary execution but still need async-capable validation at controllers or Minimal APIs | Async-capable filter integration (ecosystem option) | Keeps validation close to the web boundary without falling back to the synchronous MVC validation pipeline |
| You are maintaining an existing MVC or Razor Pages app that already depends on the old pipeline and all validators stay synchronous | Legacy MVC auto-validation only as a migration or legacy path | MVC-only, not async-capable, and no longer the preferred route for new work |

## Rule coverage

- **Async rule execution and application call paths**
  - Rule files: `rules/integration-async-validation.md`
  - Primary sources:
    - [FluentValidation async validation](https://docs.fluentvalidation.net/en/latest/async.html)
    - [FluentValidation ASP.NET integration](https://docs.fluentvalidation.net/en/latest/aspnet.html)
  - Notes: Use for `ValidateAsync`, async conditions, cancellation flow,
    sync-over-async hazards, and why ASP.NET MVC auto-validation is incompatible
    with async rules.
- **Dependency injection registration and scanning**
  - Rule files: `rules/integration-di-registration.md`
  - Primary sources:
    - [FluentValidation dependency injection](https://docs.fluentvalidation.net/en/latest/di.html)
    - [FluentValidation ASP.NET integration](https://docs.fluentvalidation.net/en/latest/aspnet.html)
  - Notes: Use for `IValidator<T>` registration, assembly scanning, filtering,
    lifetimes, and when to prefer compile-time registration over reflection.
- **ASP.NET Core, MVC, Razor Pages, and Minimal API integration**
  - Rule files: `rules/integration-aspnet-core.md`
  - Primary sources:
    - [FluentValidation ASP.NET integration](https://docs.fluentvalidation.net/en/latest/aspnet.html)
  - Ecosystem anchors:
    - [FluentValidation.AspNetCore (unsupported legacy package)](https://github.com/FluentValidation/FluentValidation.AspNetCore)
    - [SharpGrip.FluentValidation.AutoValidation](https://github.com/SharpGrip/FluentValidation.AutoValidation)
    - [ForEvolve.FluentValidation.AspNetCore.Http](https://github.com/Carl-Hugo/FluentValidation.AspNetCore.Http)
  - Notes: Use for manual validation as the default, deprecated MVC pipeline
    auto-validation, filter-based alternatives, Minimal API patterns, and
    client-side metadata adapters.
- **Blazor ecosystem status**
  - Reference files: `references/blazor-ecosystem-note.md`
  - Primary sources:
    - [FluentValidation Blazor docs](https://docs.fluentvalidation.net/en/latest/blazor.html)
  - Notes: Use when deciding whether to integrate a third-party Blazor adapter
    or stay with server-side/manual validation only.

## Related files

- [Async validation rule](../rules/integration-async-validation.md)
- [DI registration rule](../rules/integration-di-registration.md)
- [ASP.NET Core integration rule](../rules/integration-aspnet-core.md)
- [Blazor ecosystem note](./blazor-ecosystem-note.md)

## Source anchors

- [FluentValidation async validation](https://docs.fluentvalidation.net/en/latest/async.html)
  - `MustAsync`, `CustomAsync`, `WhenAsync`, `ValidateAsync`, and the rule that
    async validators must not be invoked with `Validate`.
- [FluentValidation dependency injection](https://docs.fluentvalidation.net/en/latest/di.html)
  - `IValidator<T>` registration, assembly scanning, lifetimes, scanning filters,
    and source-generator registration note.
- [FluentValidation ASP.NET integration](https://docs.fluentvalidation.net/en/latest/aspnet.html)
  - Manual validation, deprecated MVC pipeline auto-validation, filter-based
    integration, client-side metadata adapters, Razor Pages, and Minimal APIs.
- [FluentValidation Blazor docs](https://docs.fluentvalidation.net/en/latest/blazor.html)
  - Official status: no built-in Blazor integration, with third-party libraries
    listed for evaluation.
- [FluentValidation.AspNetCore (unsupported legacy package)](https://github.com/FluentValidation/FluentValidation.AspNetCore)
  - Legacy reference for `AddFluentValidationAutoValidation`,
    `AddFluentValidationClientsideAdapters`, MVC-only auto-validation, and
    client-side metadata adapter behavior.
- [AutoRegisterInject](https://github.com/patrickklaeren/AutoRegisterInject)
  - Compile-time DI registration alternative referenced by the official DI docs.
- [SharpGrip.FluentValidation.AutoValidation](https://github.com/SharpGrip/FluentValidation.AutoValidation)
  - Third-party async auto-validation for MVC controllers and Minimal APIs.
- [ForEvolve.FluentValidation.AspNetCore.Http](https://github.com/Carl-Hugo/FluentValidation.AspNetCore.Http)
  - Third-party Minimal API endpoint-filter integration.

## Maintenance notes

- Keep recommendations anchored in the official FluentValidation docs first.
  Third-party packages should stay clearly labeled as ecosystem options rather
  than default guidance.
- Revisit this map when FluentValidation changes the support status of
  `FluentValidation.AspNetCore`, adds first-party Blazor guidance, or updates
  ASP.NET integration recommendations.
- If later work adds separate rule files for Blazor, client-side metadata, or
  legacy migration guidance, link them here instead of overloading the existing
  rule set.
