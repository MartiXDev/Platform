
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using MartiX.Platform.Results;

public sealed class ResultContractTests
{
  [Test]
  public async Task ResultsPreserveStateAndErrorOrder()
  {
    var notFound = Error.Create(
        "orders.not-found",
        ErrorKind.NotFound,
        "The order was not found.");
    var conflict = Error.Create(
        "orders.number-conflict",
        ErrorKind.Conflict,
        "The order number is already in use.");

    var success = Result.Success();
    var failureErrors = new[] { conflict };
    var failure = Result.Failure(notFound, failureErrors);

    await Assert.That(success.IsSuccess).IsTrue();
    await Assert.That(success.IsFailure).IsFalse();
    await Assert.That(success.Errors).IsEmpty();

    await Assert.That(failure.IsFailure).IsTrue();
    await Assert.That(failure.IsSuccess).IsFalse();
    await Assert.That(failure.Errors).Count().IsEqualTo(2);
    await Assert.That(ReferenceEquals(failure.Errors[0], notFound)).IsTrue();
    await Assert.That(ReferenceEquals(failure.Errors[1], conflict)).IsTrue();

    failureErrors[0] = Error.Create(
        "orders.number-invalid",
        ErrorKind.Validation,
        "The order number is invalid.",
        target: "number");
    await Assert.That(ReferenceEquals(failure.Errors[1], conflict)).IsTrue();

    await Assert.That(failure.Errors is IList<Error>).IsTrue();
    var readOnlyErrors = (IList<Error>)failure.Errors;
    await Assert.That(() => readOnlyErrors[0] = conflict)
        .Throws<NotSupportedException>();
  }

  [Test]
  public async Task TypedResultsExposeValuesOnlyOnSuccess()
  {
    var typedSuccess = Result<Order>.Success(new Order("order-17"));
    var typedFailure = Result<Order>.Failure(
        Error.Create(
            "orders.number-invalid",
            ErrorKind.Validation,
            "The order number is invalid.",
            target: "number"));

    await Assert.That(typedSuccess.IsSuccess).IsTrue();
    await Assert.That(typedSuccess.Value.Id).IsEqualTo("order-17");
    await Assert.That(typedFailure.IsFailure).IsTrue();
    await Assert.That(() => _ = typedFailure.Value)
        .Throws<InvalidOperationException>();
  }

  [Test]
  public async Task DefinedErrorKindsAreConstructible()
  {
    var validation = Error.Create(
        "orders.validation",
        ErrorKind.Validation,
        "A safe validation description.");
    var unexpected = Error.Create(
        "orders.unexpected",
        ErrorKind.Unexpected,
        "A safe unexpected description.");

    await Assert.That((int)validation.Kind).IsEqualTo(1);
    await Assert.That((int)unexpected.Kind).IsEqualTo(9);

    var categories = new[]
    {
            (ErrorKind.Validation, "orders.validation"),
            (ErrorKind.RuleViolation, "orders.rule-violation"),
            (ErrorKind.NotFound, "orders.not-found"),
            (ErrorKind.Conflict, "orders.conflict"),
            (ErrorKind.AuthenticationRequired, "orders.authentication-required"),
            (ErrorKind.Forbidden, "orders.forbidden"),
            (ErrorKind.RateLimited, "orders.rate-limited"),
            (ErrorKind.Unavailable, "orders.unavailable"),
            (ErrorKind.Unexpected, "orders.unexpected"),
        };

    foreach (var (kind, code) in categories)
    {
      var error = Error.Create(code, kind, "A safe category description.");
      await Assert.That(error.Kind).IsEqualTo(kind);
    }
  }

  [Test]
  public async Task InvalidValuesAreRejected()
  {
    await Assert.That(() => Result<Order>.Success(null!))
        .Throws<ArgumentNullException>();
    await Assert.That(() => Result.Failure(null!))
        .Throws<ArgumentNullException>();
    await Assert.That(() => Error.Create(
            RuntimeCode("Orders.invalid"),
            ErrorKind.Validation,
            "Invalid."))
        .Throws<ArgumentException>();
    await Assert.That(() => Error.Create(
            RuntimeCode("platform.unexpected"),
            ErrorKind.Unexpected,
            "Unexpected."))
        .Throws<ArgumentException>();
    await Assert.That(() => Error.Create(
            "orders.invalid",
            ErrorKind.NotFound,
            "Invalid.",
            target: "id"))
        .Throws<ArgumentException>();
    await Assert.That(() => Error.Create(
            "orders.invalid",
            (ErrorKind)99,
            "Invalid."))
        .Throws<ArgumentOutOfRangeException>();
    await Assert.That(() => Error.Create(
            "orders.invalid",
            ErrorKind.Validation,
            "Invalid.",
            target: ""))
        .Throws<ArgumentException>();
    await Assert.That(() => Error.Create(
            "orders.invalid",
            ErrorKind.Validation,
            "Invalid\nmessage."))
        .Throws<ArgumentException>();
  }

  private sealed record Order(string Id);

  private static string RuntimeCode(string code) => code;
}