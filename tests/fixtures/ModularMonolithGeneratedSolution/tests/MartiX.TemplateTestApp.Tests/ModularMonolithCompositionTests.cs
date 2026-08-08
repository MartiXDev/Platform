using System.Net;
using System.Text.Json;
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
        var redeliveryDeadline = timeProvider.GetUtcNow().AddSeconds(15);
        ReliableEventDelivery? secondDelivery = null;
        while (secondDelivery is null)
        {
            var redeliveries = await OrdersModule.ClaimReliableEventsAsync(
                services,
                10,
                options,
                timeProvider,
                CancellationToken.None);
            secondDelivery = redeliveries.SingleOrDefault(
                delivery => delivery.MessageId == messageId);
            if (secondDelivery is not null)
            {
                break;
            }
            if (timeProvider.GetUtcNow() >= redeliveryDeadline)
            {
                throw new InvalidOperationException(
                    "The leased delivery did not become available for redelivery within the evidence budget.");
            }
            await Task.Delay(TimeSpan.FromMilliseconds(100));
        }
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
