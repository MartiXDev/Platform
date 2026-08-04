using System;
using MartiX.Platform.Results;

namespace MartiX.Platform.AspNetCore;

internal static class ErrorMapping
{
    internal static ProblemDescriptor GetDescriptor(ErrorKind kind)
    {
        return kind switch
        {
            ErrorKind.Validation => new(
                StatusCode: 400,
                Type: "/problems/validation-failed",
                Title: "Validation failed"),
            ErrorKind.RuleViolation => new(
                StatusCode: 422,
                Type: "/problems/rule-violation",
                Title: "Rule violation"),
            ErrorKind.NotFound => new(
                StatusCode: 404,
                Type: "/problems/not-found",
                Title: "Resource not found"),
            ErrorKind.Conflict => new(
                StatusCode: 409,
                Type: "/problems/conflict",
                Title: "Conflict"),
            ErrorKind.AuthenticationRequired => new(
                StatusCode: 401,
                Type: "/problems/authentication-required",
                Title: "Authentication required"),
            ErrorKind.Forbidden => new(
                StatusCode: 403,
                Type: "/problems/forbidden",
                Title: "Forbidden"),
            ErrorKind.RateLimited => new(
                StatusCode: 429,
                Type: "/problems/rate-limited",
                Title: "Rate limit exceeded"),
            ErrorKind.Unavailable => new(
                StatusCode: 503,
                Type: "/problems/unavailable",
                Title: "Service unavailable"),
            ErrorKind.Unexpected => new(
                StatusCode: 500,
                Type: "/problems/unexpected",
                Title: "Unexpected server error"),
            _ => throw new ArgumentOutOfRangeException(
                nameof(kind),
                kind,
                "The error kind is not defined by the Platform contract."),
        };
    }
}

internal sealed record ProblemDescriptor(
    int StatusCode,
    string Type,
    string Title);
