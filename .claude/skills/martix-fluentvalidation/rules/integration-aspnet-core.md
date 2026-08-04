# FluentValidation ASP.NET Core application integration

## Purpose

Set the default ASP.NET Core integration path for FluentValidation: manual
validation first, deprecated MVC pipeline auto-validation only for legacy code,
and filter-based automation only when the application deliberately opts in.

## Default guidance

- Prefer manual validation in controllers, Razor Pages handlers, and Minimal API
  endpoints. The official docs call this the most straightforward approach and
  the easiest to debug.
- Register validators with DI, inject `IValidator<T>`, call
  `await validator.ValidateAsync(model, cancellationToken)`, and translate
  failures at the boundary:
  - MVC / Razor Pages: copy failures into `ModelState` and return the view or a
    problem response.
  - APIs / Minimal APIs: return `ValidationProblem` or
    `Results.ValidationProblem(...)`.
- For Minimal APIs, keep validation explicit in the route handler unless the team
  has intentionally standardized on endpoint filters. This preserves async
  support and keeps the validation trigger visible.
- If using FluentValidation 11.1 or newer, `ValidationResult.ToDictionary()` can
  power `Results.ValidationProblem(...)`. For older versions, provide the
  equivalent dictionary mapping explicitly.
- A compact manual boundary keeps the validation trigger and HTTP translation
  explicit:

```csharp
[HttpPost("/people")]
public async Task<IActionResult> Create(
    [FromBody] CreatePersonRequest request,
    [FromServices] IValidator<CreatePersonRequest> validator,
    CancellationToken cancellationToken)
{
    var result = await validator.ValidateAsync(request, cancellationToken);

    if (!result.IsValid)
    {
        foreach (var error in result.Errors)
        {
            ModelState.AddModelError(error.PropertyName, error.ErrorMessage);
        }

        return ValidationProblem(ModelState);
    }

    return Accepted();
}

app.MapPost("/people", async (
    CreatePersonRequest request,
    IValidator<CreatePersonRequest> validator,
    CancellationToken cancellationToken) =>
{
    var result = await validator.ValidateAsync(request, cancellationToken);

    return !result.IsValid
        ? Results.ValidationProblem(result.ToDictionary())
        : Results.Accepted();
});
```
- Treat the MVC validation-pipeline integration from
  `FluentValidation.AspNetCore` as legacy-only guidance:
  - it is MVC and Razor Pages only,
  - it is not asynchronous,
  - the package is unsupported,
  - and the official docs no longer recommend it for new projects.
- If an application still uses legacy MVC auto-validation, isolate the choice and
  document it. Review related settings such as client-side adapters,
  DataAnnotations interaction, and deprecated implicit child or collection
  validation behavior.
- When using Razor Pages, remember the doc-specific limitation for auto-validation:
  validators can target models exposed as page properties, but not the whole Page
  Model itself.
- If the team wants automatic validation with async support, prefer an explicit
  filter-based ecosystem package over the deprecated MVC pipeline hook:
  - `SharpGrip.FluentValidation.AutoValidation` for MVC controllers and Minimal
    APIs.
  - `ForEvolve.FluentValidation.AspNetCore.Http` for Minimal API endpoint
    filters.
- Treat client-side validation metadata as a narrow legacy capability. The
  official docs note that FluentValidation itself is server-side only, and the
  unsupported `FluentValidation.AspNetCore` adapters cover only a subset of
  rule types.

## Avoid

- Do not use MVC pipeline auto-validation for new projects.
- Do not expect MVC pipeline auto-validation to run async rules.
- Do not assume MVC-only auto-validation applies to Minimal APIs or Blazor.
- Do not hide validation behavior in unsupported legacy packages without
  documenting the maintenance risk.
- Do not promise full client-side parity with server-side validators; conditions,
  custom validators, `Must`, and rulesets have documented limitations.

## Review checklist

- [ ] Manual validation is the default integration path unless a documented
      filter strategy replaces it.
- [ ] Async validators are never routed through deprecated MVC pipeline
      auto-validation.
- [ ] Minimal API handlers either validate explicitly or use a clearly chosen
      endpoint-filter package.
- [ ] Any use of `FluentValidation.AspNetCore` is labeled legacy/unsupported.
- [ ] Client-side metadata usage is limited to scenarios that accept its partial
      rule coverage.

## Related files

- [Async validation rule](./integration-async-validation.md)
- [DI registration rule](./integration-di-registration.md)
- [FluentValidation integration map](../references/integration-map.md)
- [Blazor ecosystem note](../references/blazor-ecosystem-note.md)

## Source anchors

- [FluentValidation ASP.NET integration](https://docs.fluentvalidation.net/en/latest/aspnet.html)
  - Manual validation, deprecated MVC pipeline auto-validation, filter-based
    validation, client-side metadata notes, Minimal APIs, and Razor Pages.
- [FluentValidation.AspNetCore (unsupported legacy package)](https://github.com/FluentValidation/FluentValidation.AspNetCore)
  - Legacy details for `AddFluentValidationAutoValidation`,
    `AddFluentValidationClientsideAdapters`, DataAnnotations interaction, and
    deprecated implicit child/collection validation settings.
- [SharpGrip.FluentValidation.AutoValidation](https://github.com/SharpGrip/FluentValidation.AutoValidation)
  - Third-party async auto-validation for MVC controllers and Minimal APIs.
- [ForEvolve.FluentValidation.AspNetCore.Http](https://github.com/Carl-Hugo/FluentValidation.AspNetCore.Http)
  - Third-party Minimal API endpoint-filter integration.
- [FormHelper](https://github.com/sinanbozkus/FormHelper)
  - Ecosystem option referenced by the official docs when full server-side rules
    are preferred over limited client-side metadata adapters.
