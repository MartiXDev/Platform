using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text.Json;
using FluentValidation.Results;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;

namespace MartiX.Platform.AspNetCore.FastEndpoints;

internal static class MartiXFastEndpointsProblemDetails
{
    internal static ProblemHttpResult CreateValidation(
        IReadOnlyList<ValidationFailure> failures,
        HttpContext httpContext)
    {
        ArgumentNullException.ThrowIfNull(failures);
        ArgumentNullException.ThrowIfNull(httpContext);
        if (failures.Count == 0)
        {
            throw new ArgumentException(
                "Problem Details require at least one validation failure.",
                nameof(failures));
        }

        var problemDetails = new ProblemDetails
        {
            Type = "/problems/validation-failed",
            Title = "Validation failed",
            Status = StatusCodes.Status400BadRequest,
            Detail = failures.Count == 1
                ? failures[0].ErrorMessage
                : null,
            Instance = httpContext.Request.Path.HasValue
                ? httpContext.Request.Path.Value
                : null,
        };

        problemDetails.Extensions["code"] = "api.validation";
        problemDetails.Extensions["traceId"] =
            Activity.Current?.TraceId.ToString() ?? httpContext.TraceIdentifier;
        problemDetails.Extensions["errors"] = failures
            .Select(CreateErrorExtension)
            .ToArray();

        return TypedResults.Problem(problemDetails);
    }

    private static Dictionary<string, object?> CreateErrorExtension(
        ValidationFailure failure)
    {
        var extension = new Dictionary<string, object?>
        {
            ["code"] = "api.validation",
            ["message"] = failure.ErrorMessage,
        };
        if (!string.IsNullOrWhiteSpace(failure.PropertyName))
        {
            extension["target"] =
                JsonNamingPolicy.CamelCase.ConvertName(failure.PropertyName);
        }

        return extension;
    }
}
