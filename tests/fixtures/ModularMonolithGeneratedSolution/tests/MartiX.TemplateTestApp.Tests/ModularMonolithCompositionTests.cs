using System.Net;
using System.Text.Json;
using MartiX.TemplateTestApp.Orders.Contracts.ModuleContracts;
using MartiX.TemplateTestApp.Billing.Contracts.ModuleContracts;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

public sealed class ModularMonolithCompositionTests
{
    [Test]
    public async Task The_generated_host_composes_every_business_module()
    {
        await using var host = await ApiHost.StartAsync();

        using var ordersResponse =
            await host.Client.GetAsync("/orders/status");
        using var ordersDocument =
            JsonDocument.Parse(await ordersResponse.Content.ReadAsStringAsync());
        await Assert.That(ordersResponse.StatusCode)
            .IsEqualTo(HttpStatusCode.OK);
        using var billingResponse =
            await host.Client.GetAsync("/billing/status");
        using var billingDocument =
            JsonDocument.Parse(await billingResponse.Content.ReadAsStringAsync());
        await Assert.That(billingResponse.StatusCode)
            .IsEqualTo(HttpStatusCode.OK);
        await Assert.That(
            ordersDocument.RootElement
                .GetProperty("module").GetString())
            .IsEqualTo("Orders");
        await Assert.That(
            billingDocument.RootElement
                .GetProperty("module").GetString())
            .IsEqualTo("Billing");
    }

    [Test]
    public async Task The_first_module_contract_is_resolvable_at_the_declared_seam()
    {
        await using var host = await ApiHost.StartAsync();

        var status = host.Services.GetRequiredService<IOrdersStatus>();
        var result = await status.GetStatusAsync(CancellationToken.None);

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
            ApiComposition.ConfigureServices(builder.Services);

            var app = builder.Build();
            ApiComposition.Configure(app);
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
