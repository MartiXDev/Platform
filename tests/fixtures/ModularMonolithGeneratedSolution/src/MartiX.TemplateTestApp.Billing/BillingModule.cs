using MartiX.TemplateTestApp.Orders.Contracts.IntegrationEvents;
using MartiX.TemplateTestApp.Billing.Contracts.ModuleContracts;
using MartiX.TemplateTestApp.Billing.Features.Status;
using MartiX.TemplateTestApp.Billing.Infrastructure.IntegrationEvents;
using MartiX.TemplateTestApp.Billing.Infrastructure.Persistence;
using MartiX.Platform.EntityFrameworkCore.EntityTimestamps;
using MartiX.Platform.EntityFrameworkCore.ReliableEvents;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace MartiX.TemplateTestApp.Billing;

public static class BillingModule
{
    public static void AddServices(
        IServiceCollection services,
        IConfiguration configuration)
    {
        AddPersistence(services, configuration, "Database");
        services.AddSingleton(new ReliableEventsOptions());
        services.AddSingleton<IBillingStatus, BillingStatusOperation>();
    }

    public static void AddMigrationServices(
        IServiceCollection services,
        IConfiguration configuration)
    {
        AddPersistence(services, configuration, "MigrationDatabase");
    }

    public static void MapEndpoints(IEndpointRouteBuilder endpoints)
    {
        BillingStatusEndpoint.Map(endpoints);
    }

    public static async ValueTask<ReliableEventDeliveryOutcome> DispatchReliableEventAsync(
        IServiceProvider services,
        ReliableEventDelivery delivery,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(services);
        await using var scope = services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider
            .GetRequiredService<BillingDbContext>();
        var timeProvider = scope.ServiceProvider
            .GetRequiredService<TimeProvider>();
        return delivery.Envelope.EventName switch
        {
            OrdersSubmittedV1.EventName =>
                await BillingReliableEvents.ConsumeOrdersSubmittedAsync(
                   dbContext,
                   delivery.Envelope,
                   timeProvider,
                   cancellationToken),
            _ => ReliableEventDeliveryOutcome.PermanentFailure,
        };
    }

    public static async ValueTask<IReadOnlyList<ReliableEventDelivery>> ClaimReliableEventsAsync(
        IServiceProvider services,
        int batchSize,
        TimeProvider timeProvider,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(timeProvider);
        if (batchSize <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(batchSize));
        }

        await using var scope = services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider
            .GetRequiredService<BillingDbContext>();
        return await ReliableEventsLeaseCoordinator.ClaimDueEventsAsync(
            dbContext,
            "billing",
            ReliableEventsProvider.PostgreSql,
            new ReliableEventsOptions { BatchSize = batchSize },
            timeProvider,
            cancellationToken);
    }

    public static async ValueTask<bool> AcknowledgeReliableEventAsync(
        IServiceProvider services,
        ReliableEventDelivery delivery,
        TimeProvider timeProvider,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(timeProvider);
        await using var scope = services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider
            .GetRequiredService<BillingDbContext>();
        return await ReliableEventsLeaseCoordinator.AcknowledgeAsync(
            dbContext,
            delivery.MessageId,
            delivery.SubscriptionId,
            delivery.LeaseId,
            timeProvider,
            cancellationToken);
    }

    public static async ValueTask<bool> ScheduleReliableEventRetryAsync(
        IServiceProvider services,
        ReliableEventDelivery delivery,
        string failureCategory,
        string? failureDetail,
        TimeProvider timeProvider,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(timeProvider);
        ArgumentException.ThrowIfNullOrWhiteSpace(failureCategory);
        await using var scope = services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider
            .GetRequiredService<BillingDbContext>();
        var now = timeProvider.GetUtcNow();
        var delay = new ReliableEventsOptions()
            .GetRetryDelay(delivery.Attempt, Random.Shared);
        if (delay <= TimeSpan.Zero)
        {
            delay = TimeSpan.FromMilliseconds(1);
        }

        return await ReliableEventsLeaseCoordinator.ScheduleRetryAsync(
            dbContext,
            delivery.MessageId,
            delivery.SubscriptionId,
            delivery.LeaseId,
            now.Add(delay),
            failureCategory,
            failureDetail,
            timeProvider,
            cancellationToken);
    }

    public static async ValueTask<bool> FailReliableEventAsync(
        IServiceProvider services,
        ReliableEventDelivery delivery,
        string failureCategory,
        string? failureDetail,
        TimeProvider timeProvider,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(timeProvider);
        ArgumentException.ThrowIfNullOrWhiteSpace(failureCategory);
        await using var scope = services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider
            .GetRequiredService<BillingDbContext>();
        return await ReliableEventsLeaseCoordinator.FailAsync(
            dbContext,
            delivery.MessageId,
            delivery.SubscriptionId,
            delivery.LeaseId,
            failureCategory,
            failureDetail,
            timeProvider,
            cancellationToken);
    }

    public static async Task<string> ExecuteMigrationAsync(
        IServiceProvider services,
        string operation,
        CancellationToken cancellationToken)
    {
        await using var scope = services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider
            .GetRequiredService<BillingDbContext>();
        return operation switch
        {
            "validate" => await ValidateAsync(dbContext, cancellationToken),
            "script" => dbContext.Database.GenerateScript(
                options: MigrationsSqlGenerationOptions.Idempotent),
            "apply" => await ApplyAndValidateAsync(dbContext, cancellationToken),
            _ => throw new ArgumentOutOfRangeException(nameof(operation)),
        };
    }

    public static string MigrationIdentity => "Billing";

    private static void AddPersistence(
        IServiceCollection services,
        IConfiguration configuration,
        string connectionName)
    {
        var connectionString = configuration.GetConnectionString(connectionName);
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                $"Connection string '{connectionName}' is required.");
        }
        services.AddSingleton<TimeProvider>(TimeProvider.System);
        services.AddDbContext<BillingDbContext>(
            (serviceProvider, options) =>
            {
                options.UseNpgsql(
                  connectionString,
                  providerOptions => providerOptions.MigrationsHistoryTable("__ef_migrations_history", "billing"));
                options.AddInterceptors(
                    new EntityTimestampsSaveChangesInterceptor(
                        serviceProvider.GetRequiredService<TimeProvider>()),
                    BillingReliableEvents.CreateInterceptor());
            });
    }

    private static async Task<string> ValidateAsync(
        BillingDbContext dbContext,
        CancellationToken cancellationToken)
    {
        if (!await dbContext.Database.CanConnectAsync(cancellationToken))
        {
            throw new InvalidOperationException(
                "Billing database connectivity validation failed.");
        }

        var availableMigrations = dbContext.Database.GetMigrations().ToArray();
        var appliedMigrations = (await dbContext.Database
                .GetAppliedMigrationsAsync(cancellationToken))
            .ToArray();
        var pendingMigrations = (await dbContext.Database
                .GetPendingMigrationsAsync(cancellationToken))
            .ToArray();
        var unexpectedMigrations = appliedMigrations
            .Except(availableMigrations)
            .ToArray();
        if (unexpectedMigrations.Length > 0)
        {
            throw new InvalidOperationException(
                $"Billing has unexpected migrations: {string.Join(", ", unexpectedMigrations)}");
        }

        if (pendingMigrations.Length > 0)
        {
            throw new InvalidOperationException(
                $"Billing has pending migrations: {string.Join(", ", pendingMigrations)}");
        }

        if (dbContext.Database.HasPendingModelChanges())
        {
            throw new InvalidOperationException(
                "Billing has pending model changes.");
        }

        return "validated: Billing";
    }

    private static async Task<string> ApplyAndValidateAsync(
        BillingDbContext dbContext,
        CancellationToken cancellationToken)
    {
        await dbContext.Database.MigrateAsync(cancellationToken);
        await ValidateAsync(dbContext, cancellationToken);
        return "applied: Billing";
    }
}
