using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.FeatureManagement;

using MartiX.FeatureManagementTestApp;

var configuration = new ConfigurationBuilder()
    .AddInMemoryCollection(new Dictionary<string, string?>
    {
        [$"{FeatureManagementComposition.ConfigurationSectionName}:feature_flags:0:id"]
            = "CheckoutV2",
        [$"{FeatureManagementComposition.ConfigurationSectionName}:feature_flags:0:enabled"]
            = "true",
    })
    .Build();

var services = new ServiceCollection();
FeatureManagementComposition.AddServices(services, configuration);
using var provider = services.BuildServiceProvider();

var manager = provider.GetRequiredService<IVariantFeatureManager>();
_ = provider.GetRequiredService<IVariantFeatureManagerSnapshot>();
Console.WriteLine(await manager.IsEnabledAsync("CheckoutV2"));
