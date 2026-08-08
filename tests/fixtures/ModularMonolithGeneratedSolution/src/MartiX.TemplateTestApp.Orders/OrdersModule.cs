using MartiX.TemplateTestApp.Orders.Contracts.ModuleContracts;
using MartiX.TemplateTestApp.Orders.Features.Status;
using MartiX.TemplateTestApp.Orders.Infrastructure.Persistence;
using MartiX.Platform.EntityFrameworkCore.EntityTimestamps;
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
            "apply" => await ApplyAsync(dbContext, cancellationToken),
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
                        serviceProvider.GetRequiredService<TimeProvider>()));
            });
    }

    private static async Task<string> ValidateAsync(
        OrdersDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var pending = (await dbContext.Database
                .GetPendingMigrationsAsync(cancellationToken))
            .ToArray();
        if (pending.Length > 0)
        {
            throw new InvalidOperationException(
                $"Orders has pending migrations: {string.Join(", ", pending)}");
        }

        return "validated: Orders";
    }

    private static async Task<string> ApplyAsync(
        OrdersDbContext dbContext,
        CancellationToken cancellationToken)
    {
        await dbContext.Database.MigrateAsync(cancellationToken);
        return "applied: Orders";
    }
}
