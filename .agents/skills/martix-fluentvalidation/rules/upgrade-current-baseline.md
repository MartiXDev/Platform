# FluentValidation current upgrade baseline

## Purpose

Set the default upgrade stance for modern FluentValidation codebases: when to
target 12.x, when to remain on 11.x temporarily, and which breaking changes
must be handled before a current-baseline migration is considered safe.

## Default guidance

- Treat **FluentValidation 12.x** as the default target only when the entire
  solution is already on **.NET 8 or later**. FluentValidation 12 removes
  support for .NET Core 3.1, .NET 5, .NET 6, .NET 7, and .NET Standard 2.0/2.1.
- If any app, shared library, or downstream package still needs
  **.NET Standard 2.0/2.1** or otherwise blocks a .NET 8 baseline, hold on
  **11.x** while you remove deprecated APIs and finish runtime modernization.
- Audit validators for **async rules before upgrading to 11.x or 12.x**. Any
  use of `MustAsync`, `WhenAsync`, `UnlessAsync`, `CustomAsync`, or custom async
  validators means callers must switch to `ValidateAsync(...)` and keep the
  call path async end-to-end.
- Migrate off the old **cascade mode** API before taking 12.x. Replace
  `AbstractValidator.CascadeMode` and `ValidatorOptions.Global.CascadeMode` with
  `ClassLevelCascadeMode`, `RuleLevelCascadeMode`,
  `ValidatorOptions.Global.DefaultClassLevelCascadeMode`, and
  `ValidatorOptions.Global.DefaultRuleLevelCascadeMode`.
- Replace `.Cascade(CascadeMode.StopOnFirstFailure)` with
  `.Cascade(CascadeMode.Stop)`. If old code used validator/global
  `StopOnFirstFailure`, the practical replacement is usually
  `ClassLevelCascadeMode = CascadeMode.Continue` plus
  `RuleLevelCascadeMode = CascadeMode.Stop`.
- Treat 12.x as a **cleanup release rather than a feature release**. Its main
  practical effect is enforcing the modern runtime baseline and finally removing
  APIs that were already deprecated in 11.x.
- Review **ASP.NET integration** explicitly during upgrade planning. The upgrade
  path already changed validator lifetimes to `Scoped` in 10.x, removed the old
  `RunDefaultMvcValidationAfterFluentValidationExecutes` option in 11.x, and
  expects `DisableDataAnnotationsValidation` instead when you want FluentValidation
  to suppress the MVC DataAnnotations pass.
- Prefer a staged migration for older codebases: first make the code
  **11-compatible** by fixing async invocation, cascade settings, removed
  helpers, and ASP.NET options; then move to **12.x** after the runtime baseline
  is ready.

## Avoid

- Do not recommend FluentValidation 12 for a solution that still targets
  anything below .NET 8 or that still ships .NET Standard validator libraries.
- Do not invoke validators synchronously if they contain async rules. In 11.x
  and later this throws `AsyncValidatorInvokedSynchronouslyException`.
- Do not carry forward deprecated cascade configuration such as
  `AbstractValidator.CascadeMode`,
  `ValidatorOptions.Global.CascadeMode`, or
  `CascadeMode.StopOnFirstFailure`.
- Do not assume ASP.NET integration settings or extension points from older
  versions still exist unchanged after the upgrade.
- Do not treat 12.x as a safe package-only bump; it is a runtime and API
  baseline decision.

## Review checklist

- The solution's lowest required runtime is verified before recommending 12.x.
- All async validators and async conditions are called through
  `ValidateAsync(...)`, with no remaining sync wrappers.
- Validator-level and global cascade settings use the rule/class-level
  replacements instead of deprecated members.
- ASP.NET integration code is checked for 10.x/11.x changes, including DI
  lifetime assumptions and MVC validation configuration flags.
- Test code no longer depends on removed or renamed helper APIs carried forward
  from older versions.

## Related files

- [Breaking changes history](./upgrade-breaking-changes-history.md)
- [Compatibility matrix](../references/compatibility-matrix.md)
- [Upgrade map](../references/upgrade-map.md)

## Source anchors

- [Upgrading to 12 - Changes in supported platforms](https://docs.fluentvalidation.net/en/latest/upgrading-to-12.html#changes-in-supported-platforms)
- [Upgrading to 12 - Removal of CascadeMode.StopOnFirstFailure](https://docs.fluentvalidation.net/en/latest/upgrading-to-12.html#removal-of-cascademode-stoponfirstfailure)
- [Upgrading to 12 - Removal of AbstractValidator.EnsureInstanceNotNull](https://docs.fluentvalidation.net/en/latest/upgrading-to-12.html#removal-of-abstractvalidator-ensureinstancenotnull)
- [Upgrading to 12 - Other breaking API changes](https://docs.fluentvalidation.net/en/latest/upgrading-to-12.html#other-breaking-api-changes)
- [Upgrading to 11 - Sync-over-async now throws an exception](https://docs.fluentvalidation.net/en/latest/upgrading-to-11.html#sync-over-async-now-throws-an-exception)
- [Upgrading to 11 - Cascade Mode Changes](https://docs.fluentvalidation.net/en/latest/upgrading-to-11.html#cascade-mode-changes)
- [Upgrading to 11 - ASP.NET Core Integration changes](https://docs.fluentvalidation.net/en/latest/upgrading-to-11.html#asp-net-core-integration-changes)
- [Upgrading to 10 - DI changes](https://docs.fluentvalidation.net/en/latest/upgrading-to-10.html#di-changes)
