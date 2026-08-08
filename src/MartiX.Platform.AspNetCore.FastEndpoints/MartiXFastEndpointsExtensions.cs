using System;
using System.Collections.Generic;
using System.Globalization;
using System.Threading.Tasks;
using FastEndpoints;
using FastEndpoints.OpenApi;
using MartiX.Platform.AspNetCore;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;

namespace MartiX.Platform.AspNetCore.FastEndpoints;

/// <summary>
/// Explicit FastEndpoints registration and MartiX HTTP metadata.
/// </summary>
public static class MartiXFastEndpointsExtensions
{
    /// <summary>
    /// Registers FastEndpoints and its OpenAPI document using the MartiX
    /// Problem Details schema contract.
    /// </summary>
    /// <param name="services">The application service collection.</param>
    /// <returns>The same service collection for further composition.</returns>
    public static IServiceCollection AddMartiXFastEndpoints(
        this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        return ConfigureFastEndpoints(
            services.AddFastEndpoints());
    }

    /// <summary>
    /// Registers FastEndpoints from explicit discovered type lists.
    /// </summary>
    /// <param name="services">The application service collection.</param>
    /// <param name="discoveredTypes">
    /// One or more source-generated or explicitly discovered type lists.
    /// </param>
    /// <returns>The same service collection for further composition.</returns>
    public static IServiceCollection AddMartiXFastEndpoints(
        this IServiceCollection services,
        params List<Type>[] discoveredTypes)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(discoveredTypes);

        return ConfigureFastEndpoints(
            services.AddFastEndpoints(discoveredTypes));
    }

    private static IServiceCollection ConfigureFastEndpoints(
        IServiceCollection services)
    {
        services
            .OpenApiDocument(options =>
            {
                options.DocumentName = "v1";
                options.Version = "1.0";
                options.ExcludeNonFastEndpoints = true;
                options.ConfigureOpenApi = openApi =>
                    openApi.AddMartiXProblemDetailsContract();
            });
        return services;
    }

    /// <summary>
    /// Maps FastEndpoints after installing the MartiX lifecycle response
    /// headers and validation Problem Details defaults.
    /// </summary>
    /// <param name="app">The application pipeline.</param>
    /// <param name="configure">Optional FastEndpoints configuration.</param>
    /// <returns>The same application builder for further composition.</returns>
    public static IApplicationBuilder UseMartiXFastEndpoints(
        this IApplicationBuilder app,
        Action<Config>? configure = null)
    {
        ArgumentNullException.ThrowIfNull(app);

        app.Use(
            (context, next) =>
            {
                context.Response.OnStarting(
                    static state =>
                    {
                        var httpContext = (HttpContext)state;
                        if (httpContext.GetEndpoint()?.Metadata
                                .GetMetadata<MartiXLifecycleMetadata>()
                            is not { } lifecycle)
                        {
                            return Task.CompletedTask;
                        }

                        httpContext.Response.Headers["Deprecation"] =
                            $"@{lifecycle.Deprecation.ToUnixTimeSeconds().ToString(
                                CultureInfo.InvariantCulture)}";
                        httpContext.Response.Headers["Link"] =
                            $"<{lifecycle.MigrationLink.AbsoluteUri}>; rel=\"deprecation\"";
                        if (lifecycle.Sunset is not null)
                        {
                            httpContext.Response.Headers["Sunset"] =
                                lifecycle.Sunset.Value.ToUniversalTime().ToString(
                                    "R",
                                    CultureInfo.InvariantCulture);
                        }

                        return Task.CompletedTask;
                    },
                    context);
                return next();
            });

        return app.UseFastEndpoints(
            config =>
            {
                config.Errors.UseProblemDetails(
                    problemDetails => problemDetails.IndicateErrorCode = true);
                configure?.Invoke(config);
            });
    }

}
