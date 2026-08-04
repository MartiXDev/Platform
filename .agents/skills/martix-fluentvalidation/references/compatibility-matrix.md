# FluentValidation compatibility matrix

## Purpose

Summarize which FluentValidation major line is practically viable for a given
runtime baseline and which migration risks should be cleared before moving
forward.

## Matrix

| Version line | Runtime / platform position | Use this line when | Main upgrade pressure | ASP.NET or integration implications |
| --- | --- | --- | --- | --- |
| `12.x` | Minimum supported runtime is `.NET 8`. Support for .NET Core 3.1, .NET 5, .NET 6, .NET 7, and .NET Standard 2.0/2.1 is removed. | The app and all shared validator-consuming projects are already on .NET 8+ and no package still needs .NET Standard compatibility. | Remove deprecated cascade APIs entirely, stop relying on `EnsureInstanceNotNull`, and update test helper API names. | Review any MVC validation settings or test helpers already changed in 10/11 before taking 12 as the final cleanup release. |
| `11.x` | Transitional line if the codebase cannot yet take the .NET 8-only baseline of 12.x. 12.x docs explicitly say to remain on 11.x when .NET Standard 2.0 compatibility is still required. | You need to finish API cleanup first, or you still have consumers that block a .NET 8 baseline. | Sync-over-async now throws, cascade settings split into rule/class level properties, and previously deprecated APIs are removed. | Revisit `AddFluentValidation(...)` options, especially the removal of `RunDefaultMvcValidationAfterFluentValidationExecutes` in favor of `DisableDataAnnotationsValidation`. |
| `10.x` | Historical bridge release before 11.x removals. Public fluent rule syntax is mostly stable, but custom validators and internals change materially. | The codebase still has custom property validators, `PropertyValidatorContext`, or interceptor/client adaptor code that must be migrated before 11.x. | Generic property validators, `ValidationContext<T>` adoption, internal API tightening, and deprecated `Validate` overload replacements. | ASP.NET integration changed validator registration to `Scoped`; interceptor signatures and client validator adaptor extension points changed. |
| `9.x` | Historical line for older .NET Framework / netstandard2-era solutions. Docs note support for `netstandard2` and `net461+`, while MVC5/WebApi2 integrations stop receiving updates. | You are auditing or migrating older code that still uses removed non-generic validation APIs or older collection validation patterns. | `SetCollectionValidator` removed, non-generic `Validate(object)` and `ValidationContext` removed, default email validation mode changed. | FluentValidation.AspNetCore requires .NET Core 2.1 or 3.1 in this era; MVC5/WebApi2 packages are effectively legacy and should be migration targets, not long-term bets. |
| `8.x` | Historical reference point before 9.x and later removals. | Only when identifying the origin of deprecated APIs still present in legacy code. | Collection validator deprecation, async overloads moving to `CancellationToken`, ValidatorAttribute moving to a separate package, and old custom validation/localization APIs being removed. | Favor DI or an IoC container for validator wiring; attribute-based validator discovery is no longer the recommended direction. |

## Decision notes

- Prefer **12.x** only when runtime modernization is already complete.
- Prefer **11.x** as the last compatibility waypoint when runtime constraints
  block 12.x but deprecated FluentValidation APIs still need to be removed.
- Treat **10.x**, **9.x**, and **8.x** primarily as migration-history guides for
  identifying old APIs that must disappear before the current baseline upgrade
  is safe.

## Review checklist

- The recommended version line matches the solution's lowest supported runtime,
  not just the main web app's target framework.
- Any validators with async rules are audited before recommending 11.x or 12.x.
- Custom property validators and ASP.NET integration code are checked for 10.x
  breaking changes before skipping directly to 11/12.
- Legacy MVC5/WebApi2 references or `ValidatorAttribute`-based wiring are
  treated as migration debt, not as patterns to preserve.

## Related files

- [Upgrade map](./upgrade-map.md)
- [Current baseline upgrade rule](../rules/upgrade-current-baseline.md)
- [Breaking changes history rule](../rules/upgrade-breaking-changes-history.md)

## Source anchors

- [Upgrading to 12 - Changes in supported platforms](https://docs.fluentvalidation.net/en/latest/upgrading-to-12.html#changes-in-supported-platforms)
- [Upgrading to 12 - Removal of CascadeMode.StopOnFirstFailure](https://docs.fluentvalidation.net/en/latest/upgrading-to-12.html#removal-of-cascademode-stoponfirstfailure)
- [Upgrading to 11 - Changes in supported platforms](https://docs.fluentvalidation.net/en/latest/upgrading-to-11.html#changes-in-supported-platforms)
- [Upgrading to 11 - Sync-over-async now throws an exception](https://docs.fluentvalidation.net/en/latest/upgrading-to-11.html#sync-over-async-now-throws-an-exception)
- [Upgrading to 10 - Custom Property Validators](https://docs.fluentvalidation.net/en/latest/upgrading-to-10.html#custom-property-validators)
- [Upgrading to 10 - DI changes](https://docs.fluentvalidation.net/en/latest/upgrading-to-10.html#di-changes)
- [Upgrading to 9 - Supported Platforms](https://docs.fluentvalidation.net/en/latest/upgrading-to-9.html#supported-platforms)
- [Upgrading to 8 - SetCollectionValidator is deprecated](https://docs.fluentvalidation.net/en/latest/upgrading-to-8.html#setcollectionvalidator-is-deprecated)
