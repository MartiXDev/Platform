using System;
using System.Collections.Generic;
using MartiX.Platform.Results;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.OpenApi;

namespace MartiX.Platform.AspNetCore;

/// <summary>
/// Explicit ASP.NET Core registration and endpoint metadata for MartiX failures.
/// </summary>
public static class MartiXProblemDetailsExtensions
{
    /// <summary>
    /// Registers RFC 9457 Problem Details and safe exception translation.
    /// </summary>
    /// <param name="services">The application service collection.</param>
    /// <returns>The same service collection for further composition.</returns>
    public static IServiceCollection AddMartiXProblemDetails(
        this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        services.AddProblemDetails();
        services.AddExceptionHandler<MartiXExceptionHandler>();
        return services;
    }

    /// <summary>
    /// Adds the MartiX Problem Details extensions to generated OpenAPI schemas.
    /// </summary>
    /// <param name="options">The OpenAPI options for the application document.</param>
    /// <returns>The same options instance for further composition.</returns>
    public static OpenApiOptions AddMartiXProblemDetailsContract(
        this OpenApiOptions options)
    {
        ArgumentNullException.ThrowIfNull(options);

        options.AddSchemaTransformer(new MartiXProblemDetailsSchemaTransformer());
        return options;
    }

    /// <summary>
    /// Documents the concrete Problem Details responses for the supplied error kinds.
    /// </summary>
    /// <param name="builder">The route handler builder.</param>
    /// <param name="kinds">The expected application error kinds.</param>
    /// <returns>The same builder for further endpoint composition.</returns>
    public static RouteHandlerBuilder ProducesMartiXProblemDetails(
        this RouteHandlerBuilder builder,
        params ErrorKind[] kinds)
    {
        ArgumentNullException.ThrowIfNull(builder);
        ArgumentNullException.ThrowIfNull(kinds);

        if (kinds.Length == 0)
        {
            throw new ArgumentException(
                "At least one error kind must be documented.",
                nameof(kinds));
        }

        var statusCodes = new HashSet<int>();
        foreach (var kind in kinds)
        {
            var statusCode = ErrorMapping.GetDescriptor(kind).StatusCode;
            if (statusCodes.Add(statusCode))
            {
                builder.Produces<ProblemDetails>(
                    statusCode,
                    "application/problem+json");
            }
        }

        return builder;
    }
}
