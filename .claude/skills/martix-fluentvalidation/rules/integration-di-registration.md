# FluentValidation DI registration and discovery

## Purpose

Define the default DI shape for FluentValidation so validator discovery stays
predictable, lifetime-safe, and easy to trace during application integration.

## Default guidance

- Register validators as `IValidator<T>` where `T` is the model being validated.
  Do not rely on resolving validators by concrete type unless the application has
  a separate explicit reason to do so.
- Use explicit registration for a small number of validators or when the
  application wants complete startup visibility:
  `services.AddScoped<IValidator<Person>, PersonValidator>();`
- Use `AddValidatorsFromAssemblyContaining<TValidator>()` or
  `AddValidatorsFromAssembly(...)` when the solution already treats validators as
  a discoverable convention.
- Remember what the official scanning API registers: public, non-abstract
  validators in the target assembly. If discovery seems incomplete, check type
  visibility and assembly selection first.
- Use the optional scanning filter when one or more validators should be excluded
  from automatic registration.
- Keep validator lifetimes conservative. The official docs say scanning defaults
  to `Scoped`, while `Transient` is the safest simple option and `Singleton`
  requires lifetime-aware dependency design.
- If a validator must be singleton, ensure every injected dependency is singleton
  safe. Never inject scoped or transient state into singleton validators.
- When reflection-based scanning is undesirable, consider the compile-time
  alternative explicitly mentioned by the official docs, such as
  AutoRegisterInject.

## Avoid

- Do not register validators only by concrete type when the application consumes
  them as `IValidator<T>`.
- Do not choose `Singleton` casually. Lifetime mismatches in validators are easy
  to miss and hard to debug.
- Do not mix multiple registration strategies for the same validator without a
  documented reason.
- Do not assume assembly scanning finds internal validators.
- Do not treat source-generator registration as equivalent to reflection without
  confirming how the generator maps interfaces and concrete types.

## Review checklist

- [ ] Each validator is reachable as `IValidator<T>` for the model it validates.
- [ ] The registration strategy is intentional: explicit, reflection scanning, or
      compile-time generation.
- [ ] Selected lifetimes are compatible with injected dependencies.
- [ ] Any automatic registration filter exclusions are documented.
- [ ] Validator discovery behavior is easy to explain from startup code.

## Related files

- [Async validation rule](./integration-async-validation.md)
- [ASP.NET Core integration rule](./integration-aspnet-core.md)
- [FluentValidation integration map](../references/integration-map.md)
- [Blazor ecosystem note](../references/blazor-ecosystem-note.md)

## Source anchors

- [FluentValidation dependency injection](https://docs.fluentvalidation.net/en/latest/di.html)
  - `IValidator<T>` registration, assembly scanning APIs, filter overloads, and
    lifetime guidance.
- [FluentValidation ASP.NET integration](https://docs.fluentvalidation.net/en/latest/aspnet.html)
  - ASP.NET examples showing validator registration and the link back to the DI
    page for assembly scanning.
- [AutoRegisterInject](https://github.com/patrickklaeren/AutoRegisterInject)
  - Compile-time registration alternative referenced by the official DI docs.
  - Important ecosystem note: the generator registers implemented interfaces, so
    validator resolution should still be reviewed as `IValidator<T>`.
- [Blazilla](https://github.com/loresoft/Blazilla)
  - Third-party Blazor example that prefers DI-based validator resolution.
- [Accelist.FluentValidation.Blazor](https://github.com/ryanelian/FluentValidation.Blazor)
  - Third-party Blazor example that requires validators to be registered in the
    ASP.NET Core service provider for DI-backed validation.
