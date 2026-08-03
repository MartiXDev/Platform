using System;
using System.Collections.Generic;
using MartiX.Platform.Results;

internal static class Program
{
    private static int Main()
    {
        var notFound = Error.Create(
            "orders.not-found",
            ErrorKind.NotFound,
            "The order was not found.");
        var conflict = Error.Create(
            "orders.number-conflict",
            ErrorKind.Conflict,
            "The order number is already in use.");
        var validation = Error.Create(
            "orders.number-invalid",
            ErrorKind.Validation,
            "The order number is invalid.",
            target: "number");

        var success = Result.Success();
        var failureErrors = new[] { conflict };
        var failure = Result.Failure(notFound, failureErrors);
        var typedSuccess = Result<Order>.Success(new Order("order-17"));
        var typedFailure = Result<Order>.Failure(validation);

        Assert(success.IsSuccess, "A successful result must report success.");
        Assert(!success.IsFailure, "A successful result must not report failure.");
        Assert(success.Errors.Count == 0, "A successful result must have no errors.");

        Assert(failure.IsFailure, "A failed result must report failure.");
        Assert(!failure.IsSuccess, "A failed result must not report success.");
        Assert(failure.Errors.Count == 2, "A failed result must retain all errors.");
        Assert(
            ReferenceEquals(failure.Errors[0], notFound)
                && ReferenceEquals(failure.Errors[1], conflict),
            "A failed result must retain error order.");

        failureErrors[0] = validation;
        Assert(
            ReferenceEquals(failure.Errors[1], conflict),
            "A failed result must defensively copy its errors.");

        Assert(typedSuccess.IsSuccess, "A typed success must report success.");
        Assert(typedSuccess.Value.Id == "order-17", "A typed success must expose its value.");
        Assert(typedFailure.IsFailure, "A typed failure must report failure.");
        Assert(
            Throws<InvalidOperationException>(() => _ = typedFailure.Value),
            "A typed failure must not expose a value.");

        Assert(
            failure.Errors is IList<Error> readOnlyErrors
                && Throws<NotSupportedException>(
                    () => readOnlyErrors[0] = conflict),
            "A failed result must expose an immutable error list.");

        Assert(
            (int)ErrorKind.Validation == 1
                && (int)ErrorKind.Unexpected == 9,
            "Error kinds must retain their transport-independent values.");

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
            Assert(
                Error.Create(code, kind, "A safe category description.").Kind == kind,
                $"Error kind {kind} must be constructible.");
        }

        Assert(
            Throws<ArgumentNullException>(() => Result<Order>.Success(null!)),
            "A typed success must reject a null value.");
        Assert(
            Throws<ArgumentNullException>(() => Result.Failure(null!)),
            "A failed result must reject a null first error.");
        Assert(
            Throws<ArgumentException>(
                () => Error.Create(
                    "Orders.invalid",
                    ErrorKind.Validation,
                    "Invalid.")),
            "Error codes must be lowercase.");
        Assert(
            Throws<ArgumentException>(
                () => Error.Create(
                    "platform.unexpected",
                    ErrorKind.Unexpected,
                    "Unexpected.")),
            "The platform error-code prefix must be reserved.");
        Assert(
            Throws<ArgumentException>(
                () => Error.Create(
                    "orders.invalid",
                    ErrorKind.NotFound,
                    "Invalid.",
                    target: "id")),
            "Only validation errors may identify a target.");
        Assert(
            Throws<ArgumentOutOfRangeException>(
                () => Error.Create(
                    "orders.invalid",
                    (ErrorKind)99,
                    "Invalid.")),
            "Undefined error kinds must be rejected.");
        Assert(
            Throws<ArgumentException>(
                () => Error.Create(
                    "orders.invalid",
                    ErrorKind.Validation,
                    "Invalid.",
                    target: "")),
            "Validation targets must not be empty.");
        Assert(
            Throws<ArgumentException>(
                () => Error.Create(
                    "orders.invalid",
                    ErrorKind.Validation,
                    "Invalid\nmessage.")),
            "Error descriptions must not contain control characters.");

        return 0;
    }

    private static bool Throws<TException>(Action action)
        where TException : Exception
    {
        try
        {
            action();
        }
        catch (TException)
        {
            return true;
        }

        return false;
    }

    private static void Assert(bool condition, string message)
    {
        if (!condition)
        {
            throw new InvalidOperationException(message);
        }
    }

    private sealed record Order(string Id);
}
