using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using MartiX.Platform.Results;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;

namespace MartiX.Platform.AspNetCore;

internal static class MartiXProblemDetailsFactory
{
    private const string UnexpectedCode = "platform.unexpected";
    private const string UnexpectedDetail = "The server could not complete the request.";

    internal static ProblemHttpResult CreateFailure(
        IReadOnlyList<Error> errors,
        HttpContext httpContext)
    {
        if (errors.Count == 0)
        {
            throw new ArgumentException(
                "Problem Details require at least one application error.",
                nameof(errors));
        }

        var descriptor = ErrorMapping.GetDescriptor(errors[0].Kind);
        var problemDetails = CreateProblemDetails(
            descriptor,
            errors[0].Code,
            errors[0].Description,
            errors.Select(CreateErrorExtension).ToArray(),
            httpContext);

        return TypedResults.Problem(problemDetails);
    }

    internal static ProblemHttpResult CreateUnexpected(HttpContext httpContext)
    {
        var descriptor = ErrorMapping.GetDescriptor(ErrorKind.Unexpected);
        var problemDetails = CreateProblemDetails(
            descriptor,
            UnexpectedCode,
            UnexpectedDetail,
            new[]
            {
                new Dictionary<string, object?>
                {
                    ["code"] = UnexpectedCode,
                    ["message"] = UnexpectedDetail,
                },
            },
            httpContext);

        return TypedResults.Problem(problemDetails);
    }

    private static ProblemDetails CreateProblemDetails(
        ProblemDescriptor descriptor,
        string code,
        string detail,
        IReadOnlyList<Dictionary<string, object?>> errorExtensions,
        HttpContext httpContext)
    {
        var problemDetails = new ProblemDetails
        {
            Type = descriptor.Type,
            Title = descriptor.Title,
            Status = descriptor.StatusCode,
            Detail = detail,
            Instance = httpContext.Request.Path.HasValue
                ? httpContext.Request.Path.Value
                : null,
        };

        problemDetails.Extensions["code"] = code;
        problemDetails.Extensions["traceId"] = GetTraceId(httpContext);
        problemDetails.Extensions["errors"] = errorExtensions;

        return problemDetails;
    }

    private static Dictionary<string, object?> CreateErrorExtension(Error error)
    {
        var extension = new Dictionary<string, object?>
        {
            ["code"] = error.Code,
            ["message"] = error.Description,
        };

        if (error.Target is not null)
        {
            extension["target"] = error.Target;
        }

        return extension;
    }

    private static string GetTraceId(HttpContext httpContext)
    {
        return Activity.Current?.TraceId.ToString()
            ?? httpContext.TraceIdentifier;
    }
}
