# FluentValidation runtime metadata and localization map

## Purpose

Map the FluentValidation runtime metadata and localization behaviors in this
workstream to the official documentation pages that justify the rules.

## Start here when

- The main hesitation is which validation output field should carry user-facing
  text versus machine-readable metadata.
- You need a fast answer for message text versus error code versus severity
  versus custom state before opening the linked rules.

## Quick metadata summary

| Concern | Prefer | Why |
| --- | --- | --- |
| User-facing or localized explanation with placeholders | Error message text via `WithMessage(...)` | Display-oriented and culture-sensitive; do not parse it for machine logic |
| Stable machine-readable reason or integration key | Error code via `WithErrorCode(...)` | Durable contract for consumers and also participates in message lookup |
| Triage level or handling emphasis | Severity via `WithSeverity(...)` | Distinguishes `Error`, `Warning`, or `Info` without changing the underlying error code |
| Structured extra context for downstream handling | Custom state via `WithState(...)` | Carries machine-readable payload without overloading message text or error codes |

## Rule coverage

- **Severity, error codes, and custom state**
  - Rule files: `rules/runtime-severity-error-codes-state.md`
  - Primary sources:
    - [FluentValidation severity](https://docs.fluentvalidation.net/en/latest/severity.html)
    - [FluentValidation custom error codes](https://docs.fluentvalidation.net/en/latest/error-codes.html)
    - [FluentValidation custom state](https://docs.fluentvalidation.net/en/latest/custom-state.html)
  - Notes: Use for deciding whether rule failures are treated as `Error`,
    `Warning`, or `Info`; for reviewing `WithErrorCode(...)` usage and message
    lookup behavior; and for keeping `WithState(...)` metadata machine-readable
    and operationally useful.
- **Localized messages and language manager behavior**
  - Rule files: `rules/runtime-localization-language-manager.md`
  - Primary sources:
    - [FluentValidation localization](https://docs.fluentvalidation.net/en/latest/localization.html)
    - [FluentValidation custom error codes](https://docs.fluentvalidation.net/en/latest/error-codes.html#errorcode-and-error-messages)
  - Notes: Use for localized `WithMessage(...)` patterns, `IStringLocalizer`
    injection, custom `LanguageManager` or `ILanguageManager` replacement,
    message-culture control, and disabling FluentValidation localization.

## Maintenance notes

- Keep these files FluentValidation-specific. Only mention ASP.NET Core
  localization services when FluentValidation explicitly integrates with them,
  such as `IStringLocalizer`.
- Keep guidance reviewable at validator and startup level. Prefer concrete
  checks like `WithSeverity(...)`, `WithErrorCode(...)`, `WithState(...)`,
  `WithMessage(...)`, and `ValidatorOptions.Global.LanguageManager` over broad
  localization advice.
- Treat metadata fields as part of the validation contract. Severity, error
  code, and custom state should support downstream handling without requiring
  fragile parsing of error-message text.
- If later work adds dedicated FluentValidation guidance for ASP.NET Core
  integration, client adapters, or testing, link those files here instead of
  broadening this map beyond runtime metadata and localization scope.
