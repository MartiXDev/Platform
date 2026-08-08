using MartiX.TemplateTestApp.Orders.Contracts.ModuleContracts;
using MartiX.TemplateTestApp.Orders.Features.Status;
using MartiX.TemplateTestApp.Orders.Infrastructure.IntegrationEvents;
using MartiX.TemplateTestApp.Orders.Infrastructure.Persistence;
using MartiX.Platform.EntityFrameworkCore.EntityTimestamps;
using MartiX.Platform.EntityFrameworkCore.ReliableEvents;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace MartiX.TemplateTestApp.Orders;

public static class OrdersModule
{
    public static void AddServices(
        IServiceCollection services,
        IConfiguration configuration)
    {
        AddPersistence(services, configuration, "Database");
        services.AddSingleton<IOrdersStatus, OrdersStatusOperation>();
    }

    public static void AddMigrationServices(
        IServiceCollection services,
        IConfiguration configuration)
    {
        AddPersistence(services, configuration, "MigrationDatabase");
    }

    public static void MapEndpoints(IEndpointRouteBuilder endpoints)
    {
        OrdersStatusEndpoint.Map(endpoints);
    }

    public static ValueTask<ReliableEventDeliveryOutcome> DispatchReliableEventAsync(
        IServiceProvider services,
        ReliableEventDelivery delivery,
        CancellationToken cancellationToken)
    {
        _ = services;
        _ = delivery;
        cancellationToken.ThrowIfCancellationRequested();
        return new ValueTask<ReliableEventDeliveryOutcome>(
            ReliableEventDeliveryOutcome.PermanentFailure);
    }

    public static async ValueTask<IReadOnlyList<ReliableEventDelivery>> ClaimReliableEventsAsync(
        IServiceProvider services,
        int batchSize,
        ReliableEventsOptions options,
        TimeProvider timeProvider,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(options);
        ArgumentNullException.ThrowIfNull(timeProvider);
        if (batchSize <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(batchSize));
        }

        await using var scope = services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider
            .GetRequiredService<OrdersDbContext>();
        var diagnostics = scope.ServiceProvider
            .GetRequiredService<ReliableEventsDiagnostics>();
        return await ReliableEventsLeaseCoordinator.ClaimDueEventsAsync(
            dbContext,
            "orders",
            ReliableEventsProvider.PostgreSql,
            options.WithBatchSize(batchSize),
            timeProvider,
            diagnostics,
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
            .GetRequiredService<OrdersDbContext>();
        var diagnostics = scope.ServiceProvider
            .GetRequiredService<ReliableEventsDiagnostics>();
        return await ReliableEventsLeaseCoordinator.AcknowledgeAsync(
            dbContext,
            delivery.MessageId,
            delivery.SubscriptionId,
            delivery.LeaseId,
            timeProvider,
            diagnostics,
            cancellationToken);
    }

    public static async ValueTask<bool> ScheduleReliableEventRetryAsync(
        IServiceProvider services,
        ReliableEventDelivery delivery,
        string failureCategory,
        string? failureDetail,
        ReliableEventsOptions options,
        TimeProvider timeProvider,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(options);
        ArgumentNullException.ThrowIfNull(timeProvider);
        ArgumentException.ThrowIfNullOrWhiteSpace(failureCategory);
        await using var scope = services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider
            .GetRequiredService<OrdersDbContext>();
        var diagnostics = scope.ServiceProvider
            .GetRequiredService<ReliableEventsDiagnostics>();
        var now = timeProvider.GetUtcNow();
        var delay = options.GetRetryDelay(delivery.Attempt, Random.Shared);
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
            options,
            timeProvider,
            diagnostics,
            cancellationToken);
    }

    public static async ValueTask<bool> FailReliableEventAsync(
        IServiceProvider services,
        ReliableEventDelivery delivery,
        string failureCategory,
        string? failureDetail,
        ReliableEventsOptions options,
        TimeProvider timeProvider,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(options);
        ArgumentNullException.ThrowIfNull(timeProvider);
        ArgumentException.ThrowIfNullOrWhiteSpace(failureCategory);
        await using var scope = services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider
            .GetRequiredService<OrdersDbContext>();
        var diagnostics = scope.ServiceProvider
            .GetRequiredService<ReliableEventsDiagnostics>();
        return await ReliableEventsLeaseCoordinator.FailAsync(
            dbContext,
            delivery.MessageId,
            delivery.SubscriptionId,
            delivery.LeaseId,
            failureCategory,
            failureDetail,
            options,
            timeProvider,
            diagnostics,
            cancellationToken);
    }

    public static async Task<string> ExecuteMigrationAsync(
        IServiceProvider services,
        string operation,
        CancellationToken cancellationToken)
    {
        await using var scope = services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider
            .GetRequiredService<OrdersDbContext>();
        return operation switch
        {
            "validate" => await ValidateAsync(dbContext, cancellationToken),
            "script" => dbContext.Database.GenerateScript(
                options: MigrationsSqlGenerationOptions.Idempotent),
            "apply" => await ApplyAndValidateAsync(dbContext, cancellationToken),
            _ => throw new ArgumentOutOfRangeException(nameof(operation)),
        };
    }

    public static string MigrationIdentity => "Orders";

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
        services.AddDbContext<OrdersDbContext>(
            (serviceProvider, options) =>
            {
                options.UseNpgsql(
                  connectionString,
                  providerOptions => providerOptions.MigrationsHistoryTable("__ef_migrations_history", "orders"));
                options.AddInterceptors(
                    new EntityTimestampsSaveChangesInterceptor(
                        serviceProvider.GetRequiredService<TimeProvider>()),
                    OrdersReliableEvents.CreateInterceptor(
                        serviceProvider.GetRequiredService<ReliableEventsDiagnostics>()));
            });
    }

    private static async Task<string> ValidateAsync(
        OrdersDbContext dbContext,
        CancellationToken cancellationToken)
    {
        if (!await dbContext.Database.CanConnectAsync(cancellationToken))
        {
            throw new InvalidOperationException(
                "Orders database connectivity validation failed.");
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
                $"Orders has unexpected migrations: {string.Join(", ", unexpectedMigrations)}");
        }

        if (pendingMigrations.Length > 0)
        {
            throw new InvalidOperationException(
                $"Orders has pending migrations: {string.Join(", ", pendingMigrations)}");
        }

        if (dbContext.Database.HasPendingModelChanges())
        {
            throw new InvalidOperationException(
                "Orders has pending model changes.");
        }

        return "validated: Orders";
    }

    private static async Task<string> ApplyAndValidateAsync(
        OrdersDbContext dbContext,
        CancellationToken cancellationToken)
    {
        await dbContext.Database.MigrateAsync(cancellationToken);
        await ValidateAsync(dbContext, cancellationToken);
        return "applied: Orders";
    }
}
