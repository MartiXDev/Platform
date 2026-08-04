# FluentValidation Blazor ecosystem note

## Purpose

Capture the official FluentValidation Blazor position and summarize the
third-party ecosystem links the docs send agents to evaluate.

## Current status

- The official FluentValidation docs state that FluentValidation does **not**
  provide built-in Blazor integration.
- The official docs instead list third-party libraries. Treat them as ecosystem
  options, not as first-party FluentValidation features.
- Because Blazor form validation has synchronous defaults, async validation
  behavior should be reviewed carefully before standardizing on any adapter.

## Ecosystem snapshot

- **Blazilla**
  - Position: third-party library listed by the official docs.
  - Material notes: README documents DI-based validator resolution, nested object
    support, and explicit async handling through `OnSubmit` plus
    `EditContext.ValidateAsync()` when async rules are present.
  - Fit: strongest match when the team wants a modern Blazor-specific adapter and
    explicit async guidance.
- **Blazored.FluentValidation**
  - Position: third-party library listed by the official docs.
  - Material notes: official docs label it as listed ecosystem guidance; its
    repository is archived, and the README says it is no longer maintained and
    points users to Blazilla.
  - Fit: legacy codebases only; do not choose it for new standard guidance.
- **Blazor-Validation / Morris.Blazor.FluentValidation**
  - Position: third-party library listed by the official docs.
  - Material notes: validation-provider model that can compose DataAnnotations and
    FluentValidation, with assembly scanning registration examples.
  - Fit: useful when the app wants a broader Blazor validation abstraction rather
    than a FluentValidation-only adapter.
- **Accelist.FluentValidation.Blazor**
  - Position: third-party library listed by the official docs.
  - Material notes: README emphasizes zero-config `EditForm` integration, DI
    registration of `IValidator<T>`, nested validator support, and warns about
    repeated remote-call costs during interactive validation.
  - Fit: viable when simple component substitution is preferred, but async and
    maintenance posture should be reviewed before adoption.
- **vNext.BlazorComponents.FluentValidation**
  - Position: third-party library listed by the official docs.
  - Material notes: README highlights async validation support, severity levels,
    and validator discovery through `IValidatorFactory` with DI-first behavior.
  - Fit: candidate when advanced Blazor validation features matter more than a
    minimal setup story.

## Default guidance

- Prefer treating Blazor integration as an explicit application decision instead
  of assuming a first-party FluentValidation path exists.
- If the app uses async validators, choose a Blazor library only after verifying
  its submit flow waits for async validation to finish.
- Prefer DI-based validator resolution over implicit assembly scanning when the
  application already has a deliberate service registration strategy.
- Keep validator logic in normal `AbstractValidator<T>` classes so the same
  validators can still be used from server-side/manual validation paths.

## Review checklist

- The selected Blazor package is clearly labeled third-party in code comments,
  ADRs, or package documentation.
- Async submit behavior is documented and tested when any validator uses
  `MustAsync`, `CustomAsync`, or `WhenAsync`.
- Validator discovery behavior is understood: DI only, DI plus scanning, or a
  custom factory abstraction.
- The team has reviewed package maintenance status before standardizing on it.
- Shared validators remain usable outside Blazor-specific components.

## Related files

- [FluentValidation integration map](./integration-map.md)
- [Async validation rule](../rules/integration-async-validation.md)
- [DI registration rule](../rules/integration-di-registration.md)
- [ASP.NET Core integration rule](../rules/integration-aspnet-core.md)

## Source anchors

- [FluentValidation Blazor docs](https://docs.fluentvalidation.net/en/latest/blazor.html)
  - Official statement that there is no built-in Blazor integration, plus the
    approved ecosystem links.
- [Blazilla](https://github.com/loresoft/Blazilla)
  - Third-party Blazor adapter with explicit async validation guidance and DI
    integration.
- [Blazored.FluentValidation (archived)](https://github.com/Blazored/FluentValidation)
  - Third-party adapter whose README says it is no longer maintained.
- [Blazor-Validation](https://github.com/mrpmorris/blazor-validation)
  - Third-party validation-provider model with a FluentValidation add-on.
- [Accelist.FluentValidation.Blazor](https://github.com/ryanelian/FluentValidation.Blazor)
  - Third-party `EditForm` adapter with DI-first validator usage notes.
- [vNext.BlazorComponents.FluentValidation](https://github.com/Liero/vNext.BlazorComponents.FluentValidation)
  - Third-party adapter documenting async validation and `IValidatorFactory`
    usage.

## Maintenance notes

- Keep this note descriptive rather than prescriptive. The official docs list
  these libraries, but they do not endorse one as the canonical choice.
- Re-check repository maintenance state when updating this note, especially for
  Blazored, Blazilla, and other packages with changing support posture.
- If this skill later adds a dedicated Blazor rule, move package-selection
  guidance there and keep this file as the lightweight ecosystem snapshot.
