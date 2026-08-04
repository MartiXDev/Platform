# FluentValidation breaking changes history

## Purpose

Provide the migration order for FluentValidation codebases that are jumping
across several major versions so deprecated APIs can be removed in the sequence
the project actually broke them.

## Default guidance

- Start with the **oldest deprecated patterns still present** in the codebase,
  then move forward by major version. This is easier than debugging the latest
  error messages after several layers of removals have stacked up.
- From **8.x to 9.x**, remove old collection-validation and non-generic entry
  points first. `SetCollectionValidator` is gone, non-generic
  `Validate(object)` is gone, and the non-generic `ValidationContext` type is
  gone. Older MVC5/WebApi2 integrations are also no longer a strategic target.
- From **9.x to 10.x**, prioritize **custom validator migration**. Replace
  non-generic `PropertyValidator` implementations with
  `PropertyValidator<T, TProperty>` or `AsyncPropertyValidator<T, TProperty>`,
  replace `PropertyValidatorContext` usage with `ValidationContext<T>`, and
  stop depending on internals such as `RuleBuilder`, `PropertyRule`,
  `CollectionPropertyRule`, or `IncludeRule` being public extension points.
- While taking **10.x**, also review **ASP.NET integration hooks**. Validator
  registrations switched to `Scoped`, interceptor signatures moved to
  `ActionContext`, and client-side adaptor registration now keys from rule
  components and non-generic validator interfaces rather than the old property
  validator types.
- From **10.x to 11.x**, eliminate deprecated surface area that 11 removes:
  `OnFailure`, `OnAnyFailure`, old test-helper extension syntax on the validator
  itself, and the non-generic compatibility property validator layer.
- Treat **11.x** as the point where async misuse becomes explicit. Validators
  that contain async rules can no longer be forced through sync validation
  without throwing, so every sync bridge around async rules must be removed.
- Treat **11.x to 12.x** as final cleanup and baseline enforcement. 12 removes
  the deprecated cascade properties, removes `StopOnFirstFailure`, removes the
  `EnsureInstanceNotNull` override hook, and requires .NET 8.
- When reviewing test code across 9-12, expect helper evolution. Older
  `ShouldHaveValidationErrorFor` patterns moved toward `TestValidate(...)`, and
  12 renames `ShouldHaveAnyValidationError` to `ShouldHaveValidationErrors`
  while moving some helpers onto `TestValidationResult` instance methods.

## Avoid

- Do not jump straight to fixing package references without grepping for removed
  APIs from earlier upgrade guides.
- Do not preserve use of FluentValidation internals when metadata interfaces or
  public extension points are the documented replacement.
- Do not keep attribute-based validator wiring, legacy MVC5/WebApi2 packages, or
  removed collection-validation patterns as if they were current guidance.
- Do not postpone async-rule cleanup until after the package bump; 11.x turns
  this into a runtime exception rather than a silent behavior change.
- Do not assume old test helper syntax or custom validator base classes will
  survive a multi-major upgrade.

## Review checklist

- Searches for `SetCollectionValidator`, `Validate(` overloads taking `object`,
  `ValidationContext`, `PropertyValidatorContext`, `OnFailure`,
  `OnAnyFailure`, `StopOnFirstFailure`, and `EnsureInstanceNotNull` have been
  completed.
- Custom validators inherit from the generic property validator base classes and
  no longer depend on removed non-generic compatibility layers.
- ASP.NET integration code is reviewed for DI lifetime, interceptor, and
  client-side adaptor changes introduced in 10.x and 11.x.
- Test code uses current helper APIs and no longer relies on removed extension
  methods on the validator itself.
- Runtime targeting is reviewed last, after API-level cleanup has made the
  package line choice from [`compatibility-matrix.md`](../references/compatibility-matrix.md)
  clear.

## Related files

- [Current baseline upgrade rule](./upgrade-current-baseline.md)
- [Compatibility matrix](../references/compatibility-matrix.md)
- [Upgrade map](../references/upgrade-map.md)

## Source anchors

- [Upgrading to 10 - PropertyValidatorContext Deprecated](https://docs.fluentvalidation.net/en/latest/upgrading-to-10.html#propertyvalidatorcontext-deprecated)
- [Upgrading to 10 - Custom Property Validators](https://docs.fluentvalidation.net/en/latest/upgrading-to-10.html#custom-property-validators)
- [Upgrading to 10 - Changes to Interceptors](https://docs.fluentvalidation.net/en/latest/upgrading-to-10.html#changes-to-interceptors)
- [Upgrading to 10 - Changes to ASP.NET client validator adaptors](https://docs.fluentvalidation.net/en/latest/upgrading-to-10.html#changes-to-asp-net-client-validator-adaptors)
- [Upgrading to 10 - Removal of deprecated code](https://docs.fluentvalidation.net/en/latest/upgrading-to-10.html#removal-of-deprecated-code)
- [Upgrading to 9 - Supported Platforms](https://docs.fluentvalidation.net/en/latest/upgrading-to-9.html#supported-platforms)
- [Upgrading to 9 - Removal of non-generic Validate overload](https://docs.fluentvalidation.net/en/latest/upgrading-to-9.html#removal-of-non-generic-validate-overload)
- [Upgrading to 9 - Removal of non-generic ValidationContext](https://docs.fluentvalidation.net/en/latest/upgrading-to-9.html#removal-of-non-generic-validationcontext)
- [Upgrading to 9 - SetCollectionValidator removed](https://docs.fluentvalidation.net/en/latest/upgrading-to-9.html#setcollectionvalidator-removed)
- [Upgrading to 8 - SetCollectionValidator is deprecated](https://docs.fluentvalidation.net/en/latest/upgrading-to-8.html#setcollectionvalidator-is-deprecated)
- [Upgrading to 8 - ValidatorAttribute and AttributedValidatorFactory have been moved to a separate package](https://docs.fluentvalidation.net/en/latest/upgrading-to-8.html#validatorattribute-and-attributedvalidatorfactory-have-been-moved-to-a-separate-package)
- [Upgrading to 11 - OnFailure and OnAnyFailure removed](https://docs.fluentvalidation.net/en/latest/upgrading-to-11.html#onfailure-and-onanyfailure-removed)
- [Upgrading to 11 - Test Helper changes](https://docs.fluentvalidation.net/en/latest/upgrading-to-11.html#test-helper-changes)
- [Upgrading to 11 - Cascade Mode Changes](https://docs.fluentvalidation.net/en/latest/upgrading-to-11.html#cascade-mode-changes)
- [Upgrading to 11 - Removal of backwards compatibility property validator layer](https://docs.fluentvalidation.net/en/latest/upgrading-to-11.html#removal-of-backwards-compatibility-property-validator-layer)
- [Upgrading to 12 - Removal of CascadeMode.StopOnFirstFailure](https://docs.fluentvalidation.net/en/latest/upgrading-to-12.html#removal-of-cascademode-stoponfirstfailure)
- [Upgrading to 12 - Removal of AbstractValidator.EnsureInstanceNotNull](https://docs.fluentvalidation.net/en/latest/upgrading-to-12.html#removal-of-abstractvalidator-ensureinstancenotnull)
