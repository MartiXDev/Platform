using System;
using System.Collections.Generic;

namespace MartiX.Platform.Results;

/// <summary>
/// An immutable application outcome with a non-null success value.
/// </summary>
/// <typeparam name="T">The success value type.</typeparam>
public sealed class Result<T>
{
    private readonly T _value = default!;

    private Result(T value, IReadOnlyList<Error> errors, bool isSuccess)
    {
        _value = value;
        Errors = errors;
        IsSuccess = isSuccess;
    }

    /// <summary>Gets a value indicating whether the operation succeeded.</summary>
    public bool IsSuccess { get; }

    /// <summary>Gets a value indicating whether the operation failed.</summary>
    public bool IsFailure => !IsSuccess;

    /// <summary>
    /// Gets the success value, or throws when this outcome is a failure.
    /// </summary>
    public T Value
    {
        get
        {
            if (IsFailure)
            {
                throw new InvalidOperationException(
                    "A failed result does not contain a value.");
            }

            return _value;
        }
    }

    /// <summary>Gets the immutable errors associated with a failed outcome.</summary>
    public IReadOnlyList<Error> Errors { get; }

    /// <summary>Creates a successful outcome with a non-null value.</summary>
    /// <param name="value">The success value.</param>
    public static Result<T> Success(T value)
    {
        ArgumentNullException.ThrowIfNull(value);
        return new Result<T>(value, Result.EmptyErrors, isSuccess: true);
    }

    /// <summary>
    /// Creates a failed outcome containing one or more validated errors.
    /// </summary>
    /// <param name="firstError">The first error in the failure set.</param>
    /// <param name="additionalErrors">Any additional errors in stable order.</param>
    public static Result<T> Failure(
        Error firstError,
        params Error[] additionalErrors)
    {
        return new Result<T>(
            default!,
            Result.CopyErrors(firstError, additionalErrors),
            isSuccess: false);
    }
}
