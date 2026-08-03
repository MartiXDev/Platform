using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;

namespace MartiX.Platform.Results;

/// <summary>
/// An immutable application outcome without a success value.
/// </summary>
public sealed class Result
{
    internal static IReadOnlyList<Error> EmptyErrors { get; } =
        new ReadOnlyCollection<Error>(Array.Empty<Error>());

    private Result(bool isSuccess, IReadOnlyList<Error> errors)
    {
        IsSuccess = isSuccess;
        Errors = errors;
    }

    /// <summary>Gets a value indicating whether the operation succeeded.</summary>
    public bool IsSuccess { get; }

    /// <summary>Gets a value indicating whether the operation failed.</summary>
    public bool IsFailure => !IsSuccess;

    /// <summary>Gets the immutable errors associated with a failed outcome.</summary>
    public IReadOnlyList<Error> Errors { get; }

    /// <summary>Creates a successful outcome without a value or errors.</summary>
    public static Result Success()
    {
        return new Result(isSuccess: true, errors: EmptyErrors);
    }

    /// <summary>
    /// Creates a failed outcome containing one or more validated errors.
    /// </summary>
    /// <param name="firstError">The first error in the failure set.</param>
    /// <param name="additionalErrors">Any additional errors in stable order.</param>
    public static Result Failure(Error firstError, params Error[] additionalErrors)
    {
        return new Result(
            isSuccess: false,
            errors: CopyErrors(firstError, additionalErrors));
    }

    internal static IReadOnlyList<Error> CopyErrors(
        Error firstError,
        Error[] additionalErrors)
    {
        ArgumentNullException.ThrowIfNull(firstError);
        ArgumentNullException.ThrowIfNull(additionalErrors);

        var errors = new Error[additionalErrors.Length + 1];
        errors[0] = firstError;

        for (var index = 0; index < additionalErrors.Length; index++)
        {
            errors[index + 1] = additionalErrors[index]
                ?? throw new ArgumentNullException(
                    nameof(additionalErrors),
                    "Failure errors cannot contain null values.");
        }

        return new ReadOnlyCollection<Error>(errors);
    }
}
