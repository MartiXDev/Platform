using MartiX.TemplateTestApp.Billing.Contracts.ModuleContracts;
using MartiX.TemplateTestApp.Billing.Features.Status;
using MartiX.TemplateTestApp.Billing.Infrastructure.Persistence;
using MartiX.Platform.EntityFrameworkCore.EntityTimestamps;
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
                        serviceProvider.GetRequiredService<TimeProvider>()));
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

        var migrations = dbContext.Database.GetMigrations().ToArray();
        var applied = (await dbContext.Database
                .GetAppliedMigrationsAsync(cancellationToken))
            .ToArray();
        var pending = (await dbContext.Database
                .GetPendingMigrationsAsync(cancellationToken))
            .ToArray();
        var unexpected = applied.Except(migrations).ToArray();
        if (unexpected.Length > 0)
        {
            throw new InvalidOperationException(
                $"Billing has unexpected migrations: {string.Join(", ", unexpected)}");
        }

        if (pending.Length > 0)
        {
            throw new InvalidOperationException(
                $"Billing has pending migrations: {string.Join(", ", pending)}");
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
