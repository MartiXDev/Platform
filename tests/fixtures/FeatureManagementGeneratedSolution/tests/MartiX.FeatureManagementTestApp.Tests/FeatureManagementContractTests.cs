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
        var context = CreateTargetingContext();

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

        var missingFeature = await CaptureFeatureManagementExceptionAsync(
            () => manager.IsEnabledAsync("NotConfigured").AsTask());
        await Assert.That(missingFeature?.Error)
            .IsEqualTo(FeatureManagementError.MissingFeature);

        using var unavailableProvider = CreateProvider(
            new ConfigurationBuilder().Build());
        var unavailableFeature = await CaptureFeatureManagementExceptionAsync(
            () => unavailableProvider
                .GetRequiredService<IVariantFeatureManager>()
                .IsEnabledAsync("CheckoutV2")
                .AsTask());
        await Assert.That(unavailableFeature?.Error)
            .IsEqualTo(FeatureManagementError.MissingFeature);

        var missingFilter = await CaptureFeatureManagementExceptionAsync(
            () => manager.IsEnabledAsync("MissingFilter").AsTask());
        await Assert.That(missingFilter?.Error)
            .IsEqualTo(FeatureManagementError.MissingFeatureFilter);

        var malformedSetting = await CaptureFeatureManagementExceptionAsync(
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

            configuration[FeatureFlagKey(4, "enabled")] = "false";
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
            CreateTargetingContext(),
            CancellationToken.None);

        var anonymousPermissions = new HashSet<string>(StringComparer.Ordinal);
        await Assert.That(AuthorizationPolicy.Allows(anonymousPermissions))
            .IsFalse();
        var authorizedPermissions = new HashSet<string>(
            [AuthorizationPolicy.RequiredPermission],
            StringComparer.Ordinal);
        var authorized = AuthorizationPolicy.Allows(authorizedPermissions);
        await Assert.That(authorized)
            .IsTrue();

        var decision = DurableCheckoutState.CaptureDecision(
            "order-17",
            variant?.Name ?? "Control",
            authorized);
        configuration[
            FeatureFlagKey(3, "allocation:user:0:variant")] = "Control";
        configuration.Reload();

        await Assert.That(decision.Variant).IsEqualTo("Experiment");
        await Assert.That(decision.Authorized).IsEqualTo(authorized);
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

    private static TargetingContext CreateTargetingContext() =>
        new()
        {
            UserId = "pilot-user",
            Groups = Array.Empty<string>(),
        };

    private static string FeatureFlagKey(int index, string propertyPath) =>
        $"{FeatureManagementComposition.ConfigurationSectionName}:feature_flags:{index}:{propertyPath}";

    private static IConfigurationRoot CreateConfiguration()
    {
        return new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                [FeatureFlagKey(0, "id")] = "CheckoutV2",
                [FeatureFlagKey(0, "enabled")] = "true",
                [FeatureFlagKey(1, "id")] = "DisabledCheckout",
                [FeatureFlagKey(1, "enabled")] = "false",
                [FeatureFlagKey(2, "id")] = "TargetedCheckout",
                [FeatureFlagKey(2, "enabled")] = "true",
                [FeatureFlagKey(2, "conditions:client_filters:0:name")]
                    = "Microsoft.Targeting",
                [FeatureFlagKey(
                    2,
                    "conditions:client_filters:0:parameters:Audience:Users:0")]
                    = "pilot-user",
                [FeatureFlagKey(
                    2,
                    "conditions:client_filters:0:parameters:Audience:DefaultRolloutPercentage")]
                    = "0",
                [FeatureFlagKey(3, "id")] = "CheckoutVariant",
                [FeatureFlagKey(3, "enabled")] = "true",
                [FeatureFlagKey(3, "allocation:default_when_enabled")]
                    = "Control",
                [FeatureFlagKey(3, "allocation:user:0:variant")]
                    = "Experiment",
                [FeatureFlagKey(3, "allocation:user:0:users:0")]
                    = "pilot-user",
                [FeatureFlagKey(3, "variants:0:name")] = "Control",
                [FeatureFlagKey(3, "variants:0:status_override")] = "Enabled",
                [FeatureFlagKey(3, "variants:1:name")] = "Experiment",
                [FeatureFlagKey(3, "variants:1:status_override")] = "Enabled",
                [FeatureFlagKey(4, "id")] = "RefreshProbe",
                [FeatureFlagKey(4, "enabled")] = "true",
                [FeatureFlagKey(5, "id")] = "MissingFilter",
                [FeatureFlagKey(5, "enabled")] = "true",
                [FeatureFlagKey(5, "conditions:client_filters:0:name")]
                    = "UnavailableFilter",
                [FeatureFlagKey(6, "id")] = "MalformedFlag",
                [FeatureFlagKey(6, "enabled")] = "not-a-boolean",
                [FeatureFlagKey(7, "id")] = "TelemetryProbe",
                [FeatureFlagKey(7, "enabled")] = "true",
                [FeatureFlagKey(7, "telemetry:enabled")] = "true",
                [FeatureFlagKey(7, "telemetry:metadata:surface")]
                    = "feature-management",
            })
            .Build();
    }

    private static async Task<FeatureManagementException?>
        CaptureFeatureManagementExceptionAsync(Func<Task> action)
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
