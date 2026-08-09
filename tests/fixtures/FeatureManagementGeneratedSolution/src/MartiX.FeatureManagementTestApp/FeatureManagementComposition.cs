using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.FeatureManagement;

namespace MartiX.FeatureManagementTestApp;

public static class FeatureManagementComposition
{
    public const string ConfigurationSectionName = "feature_management";

    public static IServiceCollection AddServices(
        IServiceCollection services,
        IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);

        services.AddFeatureManagement(configuration);
        services.AddOptions<FeatureManagementOptions>().Configure(options =>
        {
            options.IgnoreMissingFeatureFilters = false;
            options.IgnoreMissingFeatures = false;
        });

        return services;
    }
}
