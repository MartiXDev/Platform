# FluentValidation validator test helpers

## Purpose

Set the default unit-testing approach for FluentValidation validators so tests
verify observable failures without coupling themselves to rule construction
details.

## Default guidance

- Treat each validator as a black box. Instantiate the real validator, pass in a
  representative model, call `TestValidate` or `TestValidateAsync`, and assert
  on the resulting failures.
- Use `TestValidate` only for validators that are entirely synchronous. If a
  validator contains `MustAsync`, `CustomAsync`, or `WhenAsync`, use
  `TestValidateAsync` so the test matches the required production validation
  path.
- Assert by property lambda when possible, and use string paths for members that
  are awkward to express as lambdas, such as collection paths like
  `"Addresses[0].Line1"`.
- Chain failure assertions when the contract depends on specific metadata. Use
  `WithErrorMessage(...)`, `WithErrorCode(...)`, `WithSeverity(...)`, or
  `WithCustomState(...)`, and use the inverse helpers when absence matters.
- Use `Only()` when the scenario must prove exclusivity. This keeps tests honest
  when a validator should fail for one property only, or for one narrow failure
  shape only.
- For validators built with `Must`, `Custom`, reusable extension methods, or a
  custom `PropertyValidator<T,TProperty>`, assert the emitted
  `ValidationFailure` behavior: property name, message text or placeholders,
  error code, and any additional metadata that is part of the contract.
- Keep test data explicit and input-driven. Prefer separate tests for distinct
  valid, invalid, and async behaviors over branching logic inside a single test.
- Keep examples focused on observable failures:

```csharp
[Fact]
public void Name_is_required()
{
    var validator = new PersonValidator();

    var result = validator.TestValidate(new Person { Name = "" });

    result.ShouldHaveValidationErrorFor(x => x.Name)
        .WithErrorCode("NotEmptyValidator")
        .Only();
}

[Fact]
public async Task Email_must_be_unique()
{
    var validator = new RegisterUserValidator(new AlwaysTakenEmailDirectory());

    var result = await validator.TestValidateAsync(
        new RegisterUserRequest { Email = "taken@example.com" });

    result.ShouldHaveValidationErrorFor(x => x.Email)
        .WithErrorCode("Users.Email.NotUnique")
        .Only();
}
```

## Avoid

- Do not inspect rule descriptors, cascade setup, or FluentValidation internals
  instead of asserting the validation outcome.
- Do not call `TestValidate` on validators that contain async rules or async
  conditions.
- Do not write assertions that depend on how a custom validator is implemented
  internally when the real contract is the resulting `ValidationFailure`.
- Do not replace validator tests with mocked validators or mocked rule chains.
- Do not skip `Only()` in tests that are supposed to prove there were no extra
  failures.

## Review checklist

- Tests use real validator instances and black-box inputs.
- Async validators are exercised via `TestValidateAsync`.
- Assertions verify the failure metadata that actually matters to the contract.
- `Only()` is used where exclusivity is part of the expected behavior.
- Custom-validator tests assert observable failures rather than implementation
  details.

## Related files

- [Testing map](../references/testing-map.md)
- [Integration boundaries rule](./testing-integration-boundaries.md)

## Source anchors

- [Testing: using `TestValidate`](https://docs.fluentvalidation.net/en/latest/testing.html#using-testvalidate)
- [Testing: asynchronous `TestValidateAsync`](https://docs.fluentvalidation.net/en/latest/testing.html#asynchronous-testvalidate)
- [Testing: failure metadata assertions and `Only()`](https://docs.fluentvalidation.net/en/latest/testing.html#using-testvalidate)
- [Custom validators: predicate validator](https://docs.fluentvalidation.net/en/latest/custom-validators.html#predicate-validator)
- [Custom validators: writing a custom validator](https://docs.fluentvalidation.net/en/latest/custom-validators.html#writing-a-custom-validator)
- [Custom validators: reusable property validators](https://docs.fluentvalidation.net/en/latest/custom-validators.html#reusable-property-validators)
