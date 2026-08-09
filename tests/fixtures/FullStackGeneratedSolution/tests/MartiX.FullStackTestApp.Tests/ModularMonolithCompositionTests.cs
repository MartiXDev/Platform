using System.Net;
using System.Text.Json;
using MartiX.FullStackTestApp.Client;
using MartiX.FullStackTestApp.Orders.Contracts.ModuleContracts;

using MartiX.Platform.Security;
using MartiX.Platform.EntityFrameworkCore.ReliableEvents;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

public sealed class ModularMonolithCompositionTests
{
    [Test, NotInParallel("modular-monolith-alpha-database")]
    public async Task The_generated_host_composes_every_business_module()
    {
        await using var host = await ApiHost.StartAsync();

        using var ordersResponse =
            await host.Client.GetAsync("/api/v1/orders/status");
        using var ordersDocument =
            JsonDocument.Parse(await ordersResponse.Content.ReadAsStringAsync());
        await Assert.That(ordersResponse.StatusCode)
            .IsEqualTo(HttpStatusCode.OK);
        await Assert.That(
            ordersDocument.RootElement
                .GetProperty("module").GetString())
            .IsEqualTo("Orders");
    }

    [Test]
    public async Task The_generated_host_exposes_minimal_health_and_security_headers()
    {
        await using var host = await ApiHost.StartAsync();

        foreach (var path in new[] { "/alive", "/ready" })
        {
            using var response = await host.Client.GetAsync(path);
            using var document = JsonDocument.Parse(
                await response.Content.ReadAsStringAsync());

            await Assert.That(response.StatusCode).IsEqualTo(HttpStatusCode.OK);
            await Assert.That(document.RootElement.GetProperty("status").GetString())
                .IsEqualTo("ok");
            await Assert.That(document.RootElement.EnumerateObject().Count())
                .IsEqualTo(1);
        }

        using var healthResponse = await host.Client.GetAsync("/health");
        await Assert.That(
                healthResponse.Headers.GetValues("X-Content-Type-Options").Single())
            .IsEqualTo("nosniff");
        await Assert.That(healthResponse.Headers.Contains("Server")).IsFalse();
    }

    [Test]
    public async Task Production_startup_rejects_missing_trust_configuration()
    {
        var builder = WebApplication.CreateBuilder(
            new WebApplicationOptions
            {
                EnvironmentName = Environments.Production,
            });
        var rejected = false;
        try
        {
            ApiComposition.ConfigureBuilder(builder);
        }
        catch (InvalidOperationException)
        {
            rejected = true;
        }

        await Assert.That(rejected).IsTrue();
    }

    [Test]
    public async Task Unannotated_endpoints_fail_closed_with_safe_authorization_errors()
    {
        await using var host = await ApiHost.StartAsync();

        using var response = await host.Client.GetAsync("/test/protected");
        using var document = JsonDocument.Parse(
            await response.Content.ReadAsStringAsync());

        await Assert.That(response.StatusCode).IsEqualTo(HttpStatusCode.Unauthorized);
        await Assert.That(response.Content.Headers.ContentType?.MediaType)
            .IsEqualTo("application/problem+json");
        await Assert.That(document.RootElement.GetProperty("code").GetString())
            .IsEqualTo("platform.authentication-required");
        await Assert.That(document.RootElement.GetProperty("detail").GetString())
            .IsEqualTo("Authentication is required.");
    }

    [Test]
    public async Task Permissioned_operations_fail_closed_without_the_required_actor_permission()
    {
        await using var host = await ApiHost.StartAsync();

        using var response = await host.Client.GetAsync("/test/permissioned");
        using var document = JsonDocument.Parse(
            await response.Content.ReadAsStringAsync());

        await Assert.That(response.StatusCode).IsEqualTo(HttpStatusCode.Unauthorized);
        await Assert.That(document.RootElement.GetProperty("code").GetString())
            .IsEqualTo("platform.authentication-required");
    }

    [Test]
    public async Task Business_module_permissioned_operations_fail_closed_without_the_required_actor_permission()
    {
        await using var host = await ApiHost.StartAsync();

        using var response = await host.Client.GetAsync(
            "/api/v1/orders/status/permissioned");
        using var document = JsonDocument.Parse(
            await response.Content.ReadAsStringAsync());

        await Assert.That(response.StatusCode).IsEqualTo(HttpStatusCode.Unauthorized);
        await Assert.That(document.RootElement.GetProperty("code").GetString())
            .IsEqualTo("platform.authentication-required");
    }

    [Test]
    public async Task Kernel_authorization_uses_immutable_actor_and_permission_semantics()
    {
        var read = Permission.Create("orders.read");
        var actor = ActorSnapshot.Human(ActorId.New());
        var context = ActorContext.Create(
            actor,
            PermissionSet.Create(new[] { read }));

        await Assert.That(context.Authorize(read).IsAllowed).IsTrue();
        await Assert.That(
                context.Authorize(Permission.Create("orders.write")).Reason)
            .IsEqualTo("permission-required");
        await Assert.That(ActorContext.Anonymous().Authorize(read).Reason)
            .IsEqualTo("authentication-required");
        await Assert.That(ActorContext.Unresolved().Authorize(read).Reason)
            .IsEqualTo("actor-unresolved");
    }


    [Test]
    public async Task The_first_module_contract_is_resolvable_at_the_declared_seam()
    {
        await using var host = await ApiHost.StartAsync();

        var status = host.Services.GetRequiredService<IOrdersStatus>();
        var result = await status.GetStatusAsync(CancellationToken.None);

        await Assert.That(result.Module).IsEqualTo("Orders");
    }

    [Test]
    public async Task The_generated_client_consumes_the_versioned_module_contract()
    {
        await using var host = await ApiHost.StartAsync();
        var client = new GeneratedApiClient(host.Client);
        var result = await client.GetOrdersStatusAsync(
            CancellationToken.None);

        await Assert.That(result.Module).IsEqualTo("Orders");
    }

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

        public static async Task<ApiHost> StartAsync()
        {
            var builder = WebApplication.CreateBuilder(
                new WebApplicationOptions
                {
                    EnvironmentName = Environments.Development,
                });
            builder.WebHost.UseTestServer();
            builder.Configuration["ConnectionStrings:Database"] =
                Environment.GetEnvironmentVariable(
                    "MARTIX_MODULAR_MONOLITH_DATABASE")
                ?? "Host=localhost;Database=martix_test";
            ApiComposition.ConfigureBuilder(builder);
            ApiComposition.ConfigureServices(
                builder.Services,
                builder.Configuration,
                builder.Environment);

            var app = builder.Build();
            ApiComposition.Configure(app);
            app.MapGet(
                    "/test/protected",
                    static () => Results.Ok(new { Status = "protected" }))
                .WithName("ConformanceProtected");
            app.MapGet(
                    "/test/permissioned",
                    static () => Results.Ok(new { Status = "permissioned" }))
                .WithName("ConformancePermissioned")
                .RequireAuthorization("permission:platform-access");
            await app.StartAsync();

            return new ApiHost(app, app.GetTestClient());
        }

        public async ValueTask DisposeAsync()
        {
            await App.DisposeAsync();
            Client.Dispose();
        }
    }
}
