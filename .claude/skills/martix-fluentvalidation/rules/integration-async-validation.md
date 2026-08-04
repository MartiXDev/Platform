# FluentValidation async validation integration

## Purpose

Set the default rule for async validators: if any rule or condition is
asynchronous, the application must invoke FluentValidation through
`ValidateAsync` and keep the whole call path async.

## Default guidance

- Treat `MustAsync`, `CustomAsync`, and `WhenAsync` as an application-level
  contract change, not just a validator implementation detail.
- If a validator contains any asynchronous rule or condition, always call
  `ValidateAsync`. The official docs state that calling `Validate` in this case
  throws an exception.
- Prefer `ValidateAsync(model, cancellationToken)` in request handlers, services,
  controllers, endpoint filters, and background flows so cancellation can reach
  external calls made by validation rules.
- Assume `ValidateAsync` runs both synchronous and asynchronous rules. Do not add
  a separate synchronous pass before it.
- Keep the boundary, validator, and downstream service on the same async path:

```csharp
public sealed class RegisterUserValidator : AbstractValidator<RegisterUserRequest>
{
    public RegisterUserValidator(IEmailDirectory emailDirectory)
    {
        RuleFor(x => x.Email)
            .NotEmpty()
            .MustAsync(async (email, cancellationToken) =>
                !await emailDirectory.ExistsAsync(email, cancellationToken))
            .WithMessage("Email is already registered.");
    }
}

app.MapPost("/users", async (
    RegisterUserRequest request,
    IValidator<RegisterUserRequest> validator,
    UserService service,
    CancellationToken cancellationToken) =>
{
    var result = await validator.ValidateAsync(request, cancellationToken);
    if (!result.IsValid)
    {
        return Results.ValidationProblem(result.ToDictionary());
    }

    await service.CreateAsync(request, cancellationToken);
    return Results.Accepted();
});
```
- Keep async validation near the application boundary so failures are converted
  into the right HTTP or UI result without blocking threads.
- In ASP.NET Core, prefer manual validation or async-capable filter integration
  whenever async rules are present. The official docs explicitly warn that the
  MVC validation pipeline is not asynchronous.
- In Blazor, verify that the chosen third-party adapter waits for async work to
  finish before treating the form as valid. See the
  [Blazor ecosystem note](../references/blazor-ecosystem-note.md).

## Avoid

- Do not call `.Validate(...)` on validators that use async rules or async
  conditions.
- Do not block on validation with `.Result`, `.Wait()`, or
  `.GetAwaiter().GetResult()`.
- Do not hide async validation behind synchronous wrappers that force
  sync-over-async behavior.
- Do not enable legacy MVC auto-validation when validators depend on async I/O.
- Do not duplicate rules into separate sync and async validators just to satisfy
  a synchronous framework hook; change the integration path instead.

## Review checklist

- [ ] Any validator using `MustAsync`, `CustomAsync`, or `WhenAsync` is only
      invoked through `ValidateAsync`.
- [ ] The calling layer passes a `CancellationToken` when one is available.
- [ ] No sync-over-async calls exist around validation entry points.
- [ ] MVC pipeline auto-validation is not being used for async validators.
- [ ] Result handling stays at the boundary layer: controller, endpoint, filter,
      or UI submit flow.

## Related files

- [DI registration rule](./integration-di-registration.md)
- [ASP.NET Core integration rule](./integration-aspnet-core.md)
- [FluentValidation integration map](../references/integration-map.md)
- [Blazor ecosystem note](../references/blazor-ecosystem-note.md)

## Source anchors

- [FluentValidation async validation](https://docs.fluentvalidation.net/en/latest/async.html)
  - Async rule APIs, `ValidateAsync`, and the rule that validators with async
    rules must not be invoked with `Validate`.
- [FluentValidation ASP.NET integration](https://docs.fluentvalidation.net/en/latest/aspnet.html)
  - Manual validation examples and the warning that ASP.NET MVC auto-validation
    is not asynchronous.
- [Blazilla](https://github.com/loresoft/Blazilla)
  - Third-party Blazor example that documents `OnSubmit` plus
    `EditContext.ValidateAsync()` for async form validation.
- [vNext.BlazorComponents.FluentValidation](https://github.com/Liero/vNext.BlazorComponents.FluentValidation)
  - Third-party Blazor example showing explicit async result retrieval in the
    submit flow.
