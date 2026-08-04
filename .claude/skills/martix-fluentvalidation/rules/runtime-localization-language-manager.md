# FluentValidation localization and language manager

## Purpose

Guide review of how FluentValidation produces localized validation messages at
rule level and application level.

## Default guidance

- Let FluentValidation use `CultureInfo.CurrentUICulture` for default message
  translation unless the application has a clear requirement to force a specific
  culture or disable localization.
- Use `WithMessage(...)` for per-rule localized messages when the wording is
  specific to a validator or domain concept. Keep message selection next to the
  rule so reviewers can see the exact override.
- Prefer the `WithMessage(x => ...)` overload when the message must come from a
  resource wrapper, database, or another runtime lookup. That keeps localization
  dynamic and culture-aware.
- In ASP.NET Core applications, inject `IStringLocalizer<T>` into the validator
  and use it inside a `WithMessage(...)` callback when the project already uses
  the platform localization stack.
- Use a custom `LanguageManager` implementation when the application wants to
  replace FluentValidation's default validator messages globally. Register it in
  startup with `ValidatorOptions.Global.LanguageManager = ...`.
- If the default `LanguageManager` base class is still useful, inherit from
  `FluentValidation.Resources.LanguageManager` and add overrides with
  `AddTranslation(...)`.
- If translations come from a different store entirely, implement
  `ILanguageManager` directly instead of forcing the built-in translation model
  to behave like an external repository.
- When overriding English messages globally, review locale precedence. The docs
  call out that `en-US` and `en-GB` take precedence over `en`, so override those
  locales too when consistent English output matters.
- Disable FluentValidation localization only intentionally. Setting
  `ValidatorOptions.Global.LanguageManager.Enabled = false` forces the default
  English messages regardless of `CurrentUICulture`.
- If the application must always emit a specific language, set
  `ValidatorOptions.Global.LanguageManager.Culture` explicitly and confirm the
  chosen culture is available for all relevant validator messages.
- Keep localization strategy aligned with error codes. If `WithErrorCode(...)`
  introduces a custom lookup key, provide the corresponding localized message or
  accept the documented fallback behavior.

## Avoid

- Do not hardcode user-facing validator messages inline when the project already
  standardizes on resources or `IStringLocalizer`.
- Do not replace global validator messages for one special case when a single
  `WithMessage(...)` override would be narrower and easier to review.
- Do not override only `en` and assume all English-speaking users will see that
  translation if `en-US` or `en-GB` are still present.
- Do not disable localization just to simplify testing or logging unless the
  product intentionally requires invariant English output.
- Do not confuse message localization with validation semantics. Localized copy
  may change by culture, but error codes and custom state should remain stable.
- Do not depend on localized message text for programmatic branching when
  FluentValidation already exposes `ErrorCode`, `Severity`, and `CustomState`.

## Review checklist

- [ ] Per-rule message overrides use `WithMessage(...)` intentionally and keep the
      localized source obvious to reviewers.
- [ ] Validators using ASP.NET Core localization inject and use
      `IStringLocalizer<T>` rather than building ad-hoc translation plumbing.
- [ ] Global message replacement uses a custom `LanguageManager` or
      `ILanguageManager` registered through `ValidatorOptions.Global.LanguageManager`.
- [ ] Locale precedence is covered when overriding English defaults, especially
      `en`, `en-US`, and `en-GB`.
- [ ] Any decision to disable localization or force a specific culture is
      explicit in startup configuration and matches product requirements.

## Related files

- [FluentValidation runtime metadata and localization map](../references/runtime-metadata-map.md)
- [FluentValidation severity, error codes, and custom state](./runtime-severity-error-codes-state.md)

## Source anchors

- [FluentValidation localization](https://docs.fluentvalidation.net/en/latest/localization.html)
  - Default translations follow `CultureInfo.CurrentUICulture`, `WithMessage(...)`
    supports localized per-rule overrides, `IStringLocalizer` can be injected
    into validators, a custom `LanguageManager` can replace default messages,
    and localization can be disabled or forced to a specific culture.
- [FluentValidation `WithMessage` localization pattern](https://docs.fluentvalidation.net/en/latest/localization.html#withmessage)
  - Use lambda-based `WithMessage(...)` for resource-backed or runtime-loaded
    localized messages.
- [FluentValidation `IStringLocalizer` pattern](https://docs.fluentvalidation.net/en/latest/localization.html#istringlocalizer)
  - Validators can inject `IStringLocalizer<T>` and resolve localized strings
    inside the message callback.
- [FluentValidation default message replacement](https://docs.fluentvalidation.net/en/latest/localization.html#default-messages)
  - Replace default validator messages with a custom `LanguageManager` or
    `ILanguageManager`, and account for `en`, `en-US`, and `en-GB` precedence.
- [FluentValidation disabling localization](https://docs.fluentvalidation.net/en/latest/localization.html#disabling-localization)
  - Disable localization through `ValidatorOptions.Global.LanguageManager.Enabled`
    or force a specific display language through `Culture`.
- [FluentValidation error code and message lookup](https://docs.fluentvalidation.net/en/latest/error-codes.html#errorcode-and-error-messages)
  - Error codes also act as lookup keys for localized default messages.
