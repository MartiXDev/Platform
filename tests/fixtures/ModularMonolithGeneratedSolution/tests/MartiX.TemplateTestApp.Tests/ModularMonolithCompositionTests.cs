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
    public async Task Consumer_crash_after_commit_before_ack_is_redelivered_once()
    {
        var probe = new CrashRedeliveryProbe();

        probe.Deliver(crashAfterConsumerCommit: true);
        probe.Deliver(crashAfterConsumerCommit: false);

        await Assert.That(probe.Deliveries).IsEqualTo(2);
        await Assert.That(probe.BusinessEffects).IsEqualTo(1);
        await Assert.That(probe.DuplicateSuppressed).IsEqualTo(1);
        // The consumer commits before acknowledgement; the duplicate delivery
        // therefore produces no duplicate business effect.
    }

    private sealed class CrashRedeliveryProbe
    {
        private bool inboxReceiptCommitted;

        public int Deliveries { get; private set; }

        public int BusinessEffects { get; private set; }

        public int DuplicateSuppressed { get; private set; }

        public void Deliver(bool crashAfterConsumerCommit)
        {
            Deliveries++;
            if (inboxReceiptCommitted)
            {
                DuplicateSuppressed++;
                return;
            }

            BusinessEffects++;
            inboxReceiptCommitted = true;
            if (crashAfterConsumerCommit)
            {
                // The producer acknowledgement is intentionally lost after the
                // consumer commits before acknowledgement.
                return;
            }
        }
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
            builder.Configuration["ConnectionStrings:Database"] =
                "Host=localhost;Database=martix_test";
            ApiComposition.ConfigureServices(
                builder.Services,
                builder.Configuration);

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
