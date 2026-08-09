using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Testcontainers.Redis;

public sealed class ValkeyDistributedCacheConformanceTests
{
    private static readonly RedisContainer valkeyContainer = new RedisBuilder()
        .WithImage("valkey/valkey:9.1.0")
        .Build();

    [Before(Class)]
    public static async Task StartValkeyAsync()
    {
        await valkeyContainer.StartAsync();
    }

    [After(Class)]
    public static async Task StopValkeyAsync()
    {
        await valkeyContainer.DisposeAsync();
    }

    [Test, NotInParallel("valkey-conformance")]
    public async Task The_framework_cache_preserves_serialization_and_expiry()
    {
        await using var host = await ApiHost.StartAsync(
            valkeyContainer.GetConnectionString());
        var cache = host.Services.GetRequiredService<IDistributedCache>();
        var value = new CachedValue("json", 42);
        var options = new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(1),
            SlidingExpiration = null,
        };

        await cache.SetStringAsync(
            "conformance:serialization",
            JsonSerializer.Serialize(value),
            options);
        var cached = await cache.GetStringAsync("conformance:serialization");

        await Assert.That(cached).IsNotNull();
        await Assert.That(JsonSerializer.Deserialize<CachedValue>(cached!))
            .IsEqualTo(value);
        await Task.Delay(TimeSpan.FromSeconds(2));
        await Assert.That(
                await cache.GetStringAsync("conformance:serialization"))
            .IsNull();
    }

    [Test, NotInParallel("valkey-conformance")]
    public async Task A_second_host_observes_the_first_host_entry()
    {
        await using var firstHost = await ApiHost.StartAsync(
            valkeyContainer.GetConnectionString());
        await using var secondHost = await ApiHost.StartAsync(
            valkeyContainer.GetConnectionString());
        var firstCache = firstHost.Services.GetRequiredService<IDistributedCache>();
        var secondCache = secondHost.Services.GetRequiredService<IDistributedCache>();

        await firstCache.SetStringAsync(
            "conformance:multi-instance",
            "shared-value");

        await Assert.That(
                await secondCache.GetStringAsync("conformance:multi-instance"))
            .IsEqualTo("shared-value");
    }

    [Test, NotInParallel("valkey-conformance")]
    public async Task Cache_keys_do_not_overwrite_each_other()
    {
        await using var host = await ApiHost.StartAsync(
            valkeyContainer.GetConnectionString());
        var cache = host.Services.GetRequiredService<IDistributedCache>();

        await cache.SetStringAsync("conformance:key-isolation:a", "value-a");
        await cache.SetStringAsync("conformance:key-isolation:b", "value-b");

        await Assert.That(
                await cache.GetStringAsync("conformance:key-isolation:a"))
            .IsEqualTo("value-a");
        await Assert.That(
                await cache.GetStringAsync("conformance:key-isolation:b"))
            .IsEqualTo("value-b");
    }

    [Test, NotInParallel("valkey-conformance")]
    public async Task Cache_outage_preserves_business_authorization_and_readiness()
    {
        await using var host = await ApiHost.StartAsync(
            valkeyContainer.GetConnectionString());
        await valkeyContainer.StopAsync();
        try
        {
            using var businessResponse = await host.Client.GetAsync(
                "/api/v1/status/orders");
            using var readyResponse = await host.Client.GetAsync("/ready");
            using var cacheReadyResponse = await host.Client.GetAsync(
                "/cache/ready");
            using var protectedResponse = await host.Client.GetAsync(
                "/api/v1/protected-status/orders");

            await Assert.That(businessResponse.StatusCode)
                .IsEqualTo(HttpStatusCode.OK);
            await Assert.That(
                    await businessResponse.Content.ReadAsStringAsync())
                .Contains("\"business:orders\"");
            await Assert.That(readyResponse.StatusCode)
                .IsEqualTo(HttpStatusCode.OK);
            await Assert.That(cacheReadyResponse.StatusCode)
                .IsEqualTo(HttpStatusCode.ServiceUnavailable);
            await Assert.That(protectedResponse.StatusCode)
                .IsEqualTo(HttpStatusCode.Unauthorized);
        }
        finally
        {
            await valkeyContainer.StartAsync();
        }

        var cache = host.Services.GetRequiredService<IDistributedCache>();
        await cache.SetStringAsync("conformance:reconnect", "reconnected");
        await Assert.That(
                await cache.GetStringAsync("conformance:reconnect"))
            .IsEqualTo("reconnected");
    }

    [Test, NotInParallel("valkey-conformance")]
    public async Task Cancellation_reaches_the_framework_cache_call()
    {
        await using var host = await ApiHost.StartAsync(
            valkeyContainer.GetConnectionString());
        var cache = host.Services.GetRequiredService<IDistributedCache>();
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();

        await Assert.That(
                async () => await cache.GetAsync(
                    "conformance:cancellation",
                    cancellation.Token))
            .Throws<OperationCanceledException>();
    }

    private sealed record CachedValue(string Name, int Number);

    private sealed class ApiHost : IAsyncDisposable
    {
        private ApiHost(WebApplication app, HttpClient client)
        {
            App = app;
            Client = client;
            Services = app.Services;
        }

        private WebApplication App { get; }

        public HttpClient Client { get; }

        public IServiceProvider Services { get; }

        public static async Task<ApiHost> StartAsync(string connectionString)
        {
            var builder = WebApplication.CreateBuilder(
                new WebApplicationOptions
                {
                    EnvironmentName = "ValkeyConformance",
                });
            builder.WebHost.UseTestServer();
            builder.Configuration["ConnectionStrings:DistributedCache"] =
                connectionString;
            builder.Configuration["DistributedCache:Provider"] = "valkey";
            ValkeyComposition.ConfigureBuilder(builder);
            ValkeyComposition.ConfigureServices(
                builder.Services,
                builder.Configuration);

            var app = builder.Build();
            ValkeyComposition.Configure(app);
            await app.StartAsync();
            return new ApiHost(app, app.GetTestClient());
        }

        public async ValueTask DisposeAsync()
        {
            Client.Dispose();
            await App.DisposeAsync();
        }
    }
}
