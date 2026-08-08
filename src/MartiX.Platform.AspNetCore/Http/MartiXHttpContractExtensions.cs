using System;
using System.Globalization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;

namespace MartiX.Platform.AspNetCore;

/// <summary>
/// Explicit HTTP contract metadata and protocol-failure helpers.
/// </summary>
public static class MartiXHttpContractExtensions
{
    /// <summary>
    /// Creates the canonical Problem Details response for an HTTP protocol failure.
    /// </summary>
    public static ProblemHttpResult ToMartiXProtocolProblem(
        this HttpContext httpContext,
        int statusCode,
        string type,
        string title,
        string code,
        string detail)
    {
        ArgumentNullException.ThrowIfNull(httpContext);
        ArgumentException.ThrowIfNullOrWhiteSpace(type);
        ArgumentException.ThrowIfNullOrWhiteSpace(title);
        ArgumentException.ThrowIfNullOrWhiteSpace(code);
        ArgumentException.ThrowIfNullOrWhiteSpace(detail);
        if (statusCode is < 400 or > 599)
        {
            throw new ArgumentOutOfRangeException(nameof(statusCode));
        }

        return MartiXProblemDetailsFactory.CreateProtocolFailure(
            httpContext,
            statusCode,
            type,
            title,
            code,
            detail);
    }

    /// <summary>
    /// Emits RFC 9745 deprecation metadata and an optional approved RFC 8594 sunset.
    /// </summary>
    public static RouteHandlerBuilder WithMartiXLifecycle(
        this RouteHandlerBuilder builder,
        DateTimeOffset deprecation,
        Uri migrationLink,
        DateTimeOffset? sunset = null)
    {
        ArgumentNullException.ThrowIfNull(builder);
        ArgumentNullException.ThrowIfNull(migrationLink);
        if (!migrationLink.IsAbsoluteUri)
        {
            throw new ArgumentException(
                "The migration link must be an absolute URI.",
                nameof(migrationLink));
        }
        if (sunset is not null && sunset.Value <= deprecation)
        {
            throw new ArgumentException(
                "An approved sunset must occur after deprecation.",
                nameof(sunset));
        }

        builder.WithMetadata(
            new MartiXLifecycleMetadata(deprecation, migrationLink, sunset));
        return builder.AddEndpointFilter(
            static async (context, next) =>
            {
                if (context.HttpContext.GetEndpoint()?.Metadata
                    .GetMetadata<MartiXLifecycleMetadata>() is { } lifecycle)
                {
                    context.HttpContext.Response.Headers["Deprecation"] =
                        $"@{lifecycle.Deprecation.ToUnixTimeSeconds().ToString(CultureInfo.InvariantCulture)}";
                    context.HttpContext.Response.Headers["Link"] =
                        $"<{lifecycle.MigrationLink.AbsoluteUri}>; rel=\"deprecation\"";
                    if (lifecycle.Sunset is not null)
                    {
                        context.HttpContext.Response.Headers["Sunset"] =
                            lifecycle.Sunset.Value.ToUniversalTime().ToString(
                                "R",
                                CultureInfo.InvariantCulture);
                    }
                }

                return await next(context);
            });
    }
}

/// <summary>
/// Lifecycle metadata attached to a deprecated HTTP endpoint.
/// </summary>
public sealed record MartiXLifecycleMetadata(
    DateTimeOffset Deprecation,
    Uri MigrationLink,
    DateTimeOffset? Sunset);
