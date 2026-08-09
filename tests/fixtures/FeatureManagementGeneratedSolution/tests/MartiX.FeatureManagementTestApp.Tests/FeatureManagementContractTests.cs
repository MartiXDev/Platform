using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.FeatureManagement;
using Microsoft.FeatureManagement.FeatureFilters;

using MartiX.FeatureManagementTestApp;

public sealed class FeatureManagementContractTests
{
    [Test]
    public async Task Direct_variant_manager_evaluates_enabled_and_disabled_flags()
    {
        using var provider = CreateProvider(out _);
        var manager = provider.GetRequiredService<IVariantFeatureManager>();

        await Assert.That(await manager.IsEnabledAsync("CheckoutV2")).IsTrue();
        await Assert.That(await manager.IsEnabledAsync("DisabledCheckout")).IsFalse();
    }

    [Test]
    public async Task Targeting_and_variants_are_deterministic_for_the_same_context()
    {
        using var provider = CreateProvider(out _);
        var manager = provider.GetRequiredService<IVariantFeatureManager>();
        var context = new TargetingContext
        {
            UserId = "pilot-user",
            Groups = Array.Empty<string>(),
        };

        var targeted = await manager.IsEnabledAsync(
            "TargetedCheckout",
            context,
            CancellationToken.None);
        var repeatedTargeted = await manager.IsEnabledAsync(
            "TargetedCheckout",
            context,
            CancellationToken.None);
        await Assert.That(targeted).IsTrue();
        await Assert.That(repeatedTargeted).IsEqualTo(targeted);
        var variant = await manager.GetVariantAsync(
            "CheckoutVariant",
            context,
            CancellationToken.None);
        var repeatedVariant = await manager.GetVariantAsync(
            "CheckoutVariant",
            context,
            CancellationToken.None);
        await Assert.That(variant?.Name).IsEqualTo("Experiment");
        await Assert.That(repeatedVariant?.Name).IsEqualTo(variant?.Name);
    }

    [Test]
    public async Task Missing_features_filters_and_malformed_settings_fail_closed()
    {
        using var provider = CreateProvider(out _);
        var manager = provider.GetRequiredService<IVariantFeatureManager>();

        var missingFeature = await CaptureFeatureManagementFailureAsync(
            () => manager.IsEnabledAsync("NotConfigured").AsTask());
        await Assert.That(missingFeature?.Error)
            .IsEqualTo(FeatureManagementError.MissingFeature);

        using var unavailableProvider = CreateProvider(
            new ConfigurationBuilder().Build());
        var unavailableFeature = await CaptureFeatureManagementFailureAsync(
            () => unavailableProvider
                .GetRequiredService<IVariantFeatureManager>()
                .IsEnabledAsync("CheckoutV2")
                .AsTask());
        await Assert.That(unavailableFeature?.Error)
            .IsEqualTo(FeatureManagementError.MissingFeature);

        var missingFilter = await CaptureFeatureManagementFailureAsync(
            () => manager.IsEnabledAsync("MissingFilter").AsTask());
        await Assert.That(missingFilter?.Error)
            .IsEqualTo(FeatureManagementError.MissingFeatureFilter);

        var malformedSetting = await CaptureFeatureManagementFailureAsync(
            () => manager.IsEnabledAsync("MalformedFlag").AsTask());
        await Assert.That(malformedSetting?.Error)
            .IsEqualTo(FeatureManagementError.InvalidConfigurationSetting);
    }

    [Test]
    public async Task Telemetry_is_bounded_and_contains_no_targeting_identifiers()
    {
        using var observer = new FeatureEvaluationObserver();
        using var provider = CreateProvider(out _);
        var manager = provider.GetRequiredService<IVariantFeatureManager>();

        for (var index = 0; index < 64; index++)
        {
            _ = await manager.IsEnabledAsync("TelemetryProbe");
        }

        await Assert.That(observer.Events.Count).IsEqualTo(32);
        await Assert.That(observer.Events.All(
                entry => entry.FeatureName == "TelemetryProbe"
                    && entry.FeatureName.Length <= 64
                    && entry.Variant is null))
            .IsTrue();
    }

    [Test]
    public async Task Reloads_update_new_evaluations_but_snapshot_remains_consistent()
    {
        var configuration = CreateConfiguration();
        using var provider = CreateProvider(configuration);

        using (var scope = provider.CreateScope())
        {
            var snapshot = scope.ServiceProvider
                .GetRequiredService<IVariantFeatureManagerSnapshot>();
            await Assert.That(
                    await snapshot.IsEnabledAsync(
                        "RefreshProbe",
                        CancellationToken.None))
                .IsTrue();

            configuration["feature_management:feature_flags:4:enabled"] = "false";
            configuration.Reload();

            await Assert.That(
                    await snapshot.IsEnabledAsync(
                        "RefreshProbe",
                        CancellationToken.None))
                .IsTrue();
        }

        using var refreshedScope = provider.CreateScope();
        var refreshedManager = refreshedScope.ServiceProvider
            .GetRequiredService<IVariantFeatureManager>();
        await Assert.That(await refreshedManager.IsEnabledAsync("RefreshProbe"))
            .IsFalse();
    }

    [Test]
    public async Task Authorization_and_durable_state_do_not_delegate_to_flags()
    {
        var configuration = CreateConfiguration();
        using var provider = CreateProvider(configuration);
        var manager = provider.GetRequiredService<IVariantFeatureManager>();
        var variant = await manager.GetVariantAsync(
            "CheckoutVariant",
            new TargetingContext
            {
                UserId = "pilot-user",
                Groups = Array.Empty<string>(),
            },
            CancellationToken.None);

        await Assert.That(AuthorizationPolicy.Allows(
                new HashSet<string>(StringComparer.Ordinal)))
            .IsFalse();
        await Assert.That(AuthorizationPolicy.Allows(
                new HashSet<string>(
                    [AuthorizationPolicy.RequiredPermission],
                    StringComparer.Ordinal)))
            .IsTrue();

        var decision = DurableCheckoutState.Capture(
            "order-17",
            variant?.Name ?? "Control",
            authorized: true);
        configuration["feature_management:feature_flags:3:allocation:user:0:variant"]
            = "Control";
        configuration.Reload();

        await Assert.That(decision.Variant).IsEqualTo("Experiment");
        await Assert.That(decision.Authorized).IsTrue();
    }

    private static ServiceProvider CreateProvider(
        out IConfigurationRoot configuration)
    {
        configuration = CreateConfiguration();
        return CreateProvider(configuration);
    }

    private static ServiceProvider CreateProvider(
        IConfigurationRoot configuration)
    {
        var services = new ServiceCollection();
        FeatureManagementComposition.AddServices(services, configuration);
        return services.BuildServiceProvider();
    }

    private static IConfigurationRoot CreateConfiguration()
    {
        return new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["feature_management:feature_flags:0:id"] = "CheckoutV2",
                ["feature_management:feature_flags:0:enabled"] = "true",
                ["feature_management:feature_flags:1:id"] = "DisabledCheckout",
                ["feature_management:feature_flags:1:enabled"] = "false",
                ["feature_management:feature_flags:2:id"] = "TargetedCheckout",
                ["feature_management:feature_flags:2:enabled"] = "true",
                ["feature_management:feature_flags:2:conditions:client_filters:0:name"]
                    = "Microsoft.Targeting",
                ["feature_management:feature_flags:2:conditions:client_filters:0:parameters:Audience:Users:0"]
                    = "pilot-user",
                ["feature_management:feature_flags:2:conditions:client_filters:0:parameters:Audience:DefaultRolloutPercentage"]
                    = "0",
                ["feature_management:feature_flags:3:id"] = "CheckoutVariant",
                ["feature_management:feature_flags:3:enabled"] = "true",
                ["feature_management:feature_flags:3:allocation:default_when_enabled"]
                    = "Control",
                ["feature_management:feature_flags:3:allocation:user:0:variant"]
                    = "Experiment",
                ["feature_management:feature_flags:3:allocation:user:0:users:0"]
                    = "pilot-user",
                ["feature_management:feature_flags:3:variants:0:name"] = "Control",
                ["feature_management:feature_flags:3:variants:0:status_override"] = "Enabled",
                ["feature_management:feature_flags:3:variants:1:name"] = "Experiment",
                ["feature_management:feature_flags:3:variants:1:status_override"] = "Enabled",
                ["feature_management:feature_flags:4:id"] = "RefreshProbe",
                ["feature_management:feature_flags:4:enabled"] = "true",
                ["feature_management:feature_flags:5:id"] = "MissingFilter",
                ["feature_management:feature_flags:5:enabled"] = "true",
                ["feature_management:feature_flags:5:conditions:client_filters:0:name"]
                    = "UnavailableFilter",
                ["feature_management:feature_flags:6:id"] = "MalformedFlag",
                ["feature_management:feature_flags:6:enabled"] = "not-a-boolean",
                ["feature_management:feature_flags:7:id"] = "TelemetryProbe",
                ["feature_management:feature_flags:7:enabled"] = "true",
                ["feature_management:feature_flags:7:telemetry:enabled"] = "true",
                ["feature_management:feature_flags:7:telemetry:metadata:surface"]
                    = "feature-management",
            })
            .Build();
    }

    private static async Task<FeatureManagementException?>
        CaptureFeatureManagementFailureAsync(Func<Task> action)
    {
        try
        {
            await action();
            return null;
        }
        catch (FeatureManagementException exception)
        {
            return exception;
        }
    }
}
