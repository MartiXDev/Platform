using System.Net;
using System.Text.Json;
using MartiX.TemplateTestApp.Client;
using MartiX.TemplateTestApp.Orders.Contracts.ModuleContracts;
using MartiX.TemplateTestApp.Billing.Contracts.ModuleContracts;
using MartiX.TemplateTestApp.Orders;
using MartiX.TemplateTestApp.Orders.Domain;
using MartiX.TemplateTestApp.Orders.Infrastructure.Persistence;
using MartiX.TemplateTestApp.Billing;
using MartiX.TemplateTestApp.Billing.Infrastructure.Persistence;

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
        using var billingResponse =
            await host.Client.GetAsync("/api/v1/billing/status");
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

    [Test, NotInParallel("modular-monolith-alpha-database")]
    public async Task Real_provider_transaction_and_crash_redelivery_are_idempotent()
    {
        await using var services = BuildEvidenceServices();
        var timeProvider = services.GetRequiredService<TimeProvider>();
        var options = new ReliableEventsOptions
        {
            AttemptTimeout = TimeSpan.FromMilliseconds(100),
            LeaseDuration = TimeSpan.FromSeconds(6),
            ShutdownBudget = TimeSpan.FromMilliseconds(100)
        };
        Guid messageId;
        int inboxReceiptsBefore;

        await using (var scope = services.CreateAsyncScope())
        {
            var dbContext = scope.ServiceProvider
                .GetRequiredService<OrdersDbContext>();
            var aggregate = await dbContext.Aggregates
                .SingleOrDefaultAsync(candidate => candidate.Name == "Orders");
            if (aggregate is null)
            {
                aggregate = new OrdersAggregate();
                dbContext.Aggregates.Add(aggregate);
                await dbContext.SaveChangesAsync();
            }

            var originalToken = aggregate.ConcurrencyToken;
            var rollbackToken = Guid.CreateVersion7();
            await using (var transaction = await dbContext.Database.BeginTransactionAsync())
            {
                aggregate.RecordSubmitted(rollbackToken);
                await dbContext.SaveChangesAsync();
                await transaction.RollbackAsync();
            }
            dbContext.ChangeTracker.Clear();
            aggregate = await dbContext.Aggregates
                .SingleAsync(candidate => candidate.Name == "Orders");
            await Assert.That(aggregate.ConcurrencyToken).IsEqualTo(originalToken);

            await using (var firstConcurrencyScope = services.CreateAsyncScope())
            await using (var secondConcurrencyScope = services.CreateAsyncScope())
            {
                var firstConcurrencyContext = firstConcurrencyScope.ServiceProvider
                    .GetRequiredService<OrdersDbContext>();
                var secondConcurrencyContext = secondConcurrencyScope.ServiceProvider
                    .GetRequiredService<OrdersDbContext>();
                var firstConcurrencyAggregate = await firstConcurrencyContext.Aggregates
                    .SingleAsync(candidate => candidate.Name == "Orders");
                var secondConcurrencyAggregate = await secondConcurrencyContext.Aggregates
                    .SingleAsync(candidate => candidate.Name == "Orders");
                firstConcurrencyAggregate.RecordSubmitted(Guid.CreateVersion7());
                secondConcurrencyAggregate.RecordSubmitted(Guid.CreateVersion7());
                await firstConcurrencyContext.SaveChangesAsync();

                var concurrencyConflictObserved = false;
                try
                {
                    await secondConcurrencyContext.SaveChangesAsync();
                }
                catch (DbUpdateConcurrencyException)
                {
                    concurrencyConflictObserved = true;
                }

                await Assert.That(concurrencyConflictObserved).IsTrue();
            }
            dbContext.ChangeTracker.Clear();
            aggregate = await dbContext.Aggregates
                .SingleAsync(candidate => candidate.Name == "Orders");
            aggregate.RaiseSubmitted(DateTimeOffset.UtcNow);
            await dbContext.SaveChangesAsync();
            messageId = await dbContext.OutboxMessages
                .OrderByDescending(message => message.CapturedAtUtc)
                .ThenByDescending(message => message.MessageId)
                .Select(message => message.MessageId)
                .FirstAsync();

            var billingDbContext = scope.ServiceProvider
                .GetRequiredService<BillingDbContext>();
            inboxReceiptsBefore = await billingDbContext.InboxReceipts.CountAsync();
        }

        var firstClaims = await OrdersModule.ClaimReliableEventsAsync(
            services,
            10,
            options,
            timeProvider,
            CancellationToken.None);
        var firstDelivery = firstClaims.Single(delivery => delivery.MessageId == messageId);
        var firstOutcome = await BillingModule.DispatchReliableEventAsync(
            services,
            firstDelivery,
            CancellationToken.None);

        // The consumer commits before acknowledgement; redelivery has no
        // duplicate business effect after the producer crash.
        async Task<ReliableEventDelivery> WaitForRedeliveryAsync()
        {
            var redeliveryDeadline = timeProvider.GetUtcNow().AddSeconds(15);
            while (true)
            {
                var redeliveries = await OrdersModule.ClaimReliableEventsAsync(
                    services,
                    10,
                    options,
                    timeProvider,
                    CancellationToken.None);
                var delivery = redeliveries.SingleOrDefault(
                    candidate => candidate.MessageId == messageId);
                if (delivery is not null)
                {
                    return delivery;
                }
                if (timeProvider.GetUtcNow() >= redeliveryDeadline)
                {
                    throw new InvalidOperationException(
                        "The leased delivery did not become available for redelivery within the evidence budget.");
                }
                await Task.Delay(TimeSpan.FromMilliseconds(100));
            }
        }
        var secondDelivery = await WaitForRedeliveryAsync();
        var duplicateOutcome = await BillingModule.DispatchReliableEventAsync(
            services,
            secondDelivery,
            CancellationToken.None);
        var acknowledged = await OrdersModule.AcknowledgeReliableEventAsync(
            services,
            secondDelivery,
            timeProvider,
            CancellationToken.None);

        await using (var scope = services.CreateAsyncScope())
        {
            var dbContext = scope.ServiceProvider
                .GetRequiredService<BillingDbContext>();
            var aggregate = await dbContext.Aggregates
                .SingleAsync(candidate => candidate.Name == "Billing");
            var inboxReceiptsAfter = await dbContext.InboxReceipts.CountAsync();

            await Assert.That(firstOutcome)
                .IsEqualTo(ReliableEventDeliveryOutcome.Acknowledged);
            await Assert.That(duplicateOutcome)
                .IsEqualTo(ReliableEventDeliveryOutcome.DuplicateSuppressed);
            await Assert.That(firstDelivery.Attempt).IsEqualTo(1);
            await Assert.That(secondDelivery.Attempt).IsEqualTo(2);
            await Assert.That(acknowledged).IsTrue();
            await Assert.That(inboxReceiptsAfter).IsEqualTo(inboxReceiptsBefore + 1);
            await Assert.That(aggregate.ConcurrencyToken).IsEqualTo(messageId);
        }
    }

    private static ServiceProvider BuildEvidenceServices()
    {
        var connectionString = Environment.GetEnvironmentVariable(
            "MARTIX_MODULAR_MONOLITH_DATABASE");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "MARTIX_MODULAR_MONOLITH_DATABASE is required for provider evidence.");
        }

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:Database"] = connectionString
            })
            .Build();
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddReliableEvents();
        OrdersModule.AddServices(services, configuration);
        BillingModule.AddServices(services, configuration);
        return services.BuildServiceProvider();
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
