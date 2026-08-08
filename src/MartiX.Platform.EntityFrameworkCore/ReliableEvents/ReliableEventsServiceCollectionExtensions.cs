using System;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace MartiX.Platform.EntityFrameworkCore.ReliableEvents;

/// <summary>Registers the reliable-events diagnostics seam for a host.</summary>
public static class ReliableEventsServiceCollectionExtensions
{
    /// <summary>
    /// Adds host-created metrics and the reliable-events instrumentation instance.
    /// </summary>
    public static IServiceCollection AddReliableEvents(
        this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);
        services.AddMetrics();
        services.TryAddSingleton<ReliableEventsOptions>();
        services.TryAddSingleton<ReliableEventsDiagnostics>();
        return services;
    }
}
