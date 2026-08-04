using System;
using System.Collections.Generic;
using MartiX.Platform.Results;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;

namespace MartiX.Platform.AspNetCore;

/// <summary>
/// Converts failed Kernel outcomes to concrete ASP.NET Core Problem Details results.
/// </summary>
public static class MartiXResultExtensions
{
    private const string SuccessfulResultMessage =
        "A successful result cannot be mapped to Problem Details.";

    /// <summary>
    /// Converts an expected failure to an RFC 9457 Problem Details result.
    /// </summary>
    /// <param name="result">The application result.</param>
    /// <param name="httpContext">The current HTTP context.</param>
    /// <returns>A typed Problem Details HTTP result.</returns>
    /// <exception cref="InvalidOperationException">
    /// Thrown when the result is successful.
    /// </exception>
    public static ProblemHttpResult ToProblemDetails(
        this Result result,
        HttpContext httpContext)
    {
        ArgumentNullException.ThrowIfNull(result);
        ArgumentNullException.ThrowIfNull(httpContext);

        return MapFailure(result.IsSuccess, result.Errors, httpContext);
    }

    /// <summary>
    /// Converts an expected failure to an RFC 9457 Problem Details result.
    /// </summary>
    /// <typeparam name="T">The application success value type.</typeparam>
    /// <param name="result">The application result.</param>
    /// <param name="httpContext">The current HTTP context.</param>
    /// <returns>A typed Problem Details HTTP result.</returns>
    /// <exception cref="InvalidOperationException">
    /// Thrown when the result is successful.
    /// </exception>
    public static ProblemHttpResult ToProblemDetails<T>(
        this Result<T> result,
        HttpContext httpContext)
    {
        ArgumentNullException.ThrowIfNull(result);
        ArgumentNullException.ThrowIfNull(httpContext);

        return MapFailure(result.IsSuccess, result.Errors, httpContext);
    }

    /// <summary>
    /// Converts one expected application error to an RFC 9457 Problem Details result.
    /// </summary>
    /// <param name="error">The application error.</param>
    /// <param name="httpContext">The current HTTP context.</param>
    /// <returns>A typed Problem Details HTTP result.</returns>
    public static ProblemHttpResult ToProblemDetails(
        this Error error,
        HttpContext httpContext)
    {
        ArgumentNullException.ThrowIfNull(error);
        ArgumentNullException.ThrowIfNull(httpContext);

        return MartiXProblemDetailsFactory.CreateFailure(
            new[] { error },
            httpContext);
    }

    private static ProblemHttpResult MapFailure(
        bool isSuccess,
        IReadOnlyList<Error> errors,
        HttpContext httpContext)
    {
        if (isSuccess)
        {
            throw new InvalidOperationException(SuccessfulResultMessage);
        }

        return MartiXProblemDetailsFactory.CreateFailure(errors, httpContext);
    }
}
