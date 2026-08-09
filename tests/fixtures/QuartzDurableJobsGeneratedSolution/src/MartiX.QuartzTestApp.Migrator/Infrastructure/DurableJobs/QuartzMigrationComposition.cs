using System.Data;
using System.Data.Common;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace MartiX.QuartzTestApp.Migrator.Infrastructure.DurableJobs;

internal sealed record QuartzMigrationOptions(
    string ProviderInvariantName,
    string ConnectionString);

public static class QuartzMigrationComposition
{
    private const string QuartzConnectionName = "Quartz";
    private static readonly string[] RequiredTables =
    [
        "QRTZ_JOB_DETAILS",
        "QRTZ_TRIGGERS",
        "QRTZ_SIMPLE_TRIGGERS",
        "QRTZ_SIMPROP_TRIGGERS",
        "QRTZ_CRON_TRIGGERS",
        "QRTZ_BLOB_TRIGGERS",
        "QRTZ_CALENDARS",
        "QRTZ_PAUSED_TRIGGER_GRPS",
        "QRTZ_FIRED_TRIGGERS",
        "QRTZ_SCHEDULER_STATE",
        "QRTZ_LOCKS"
    ];

    public static void AddMigrationServices(
        IServiceCollection services,
        IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);
        var connectionString = configuration.GetConnectionString(
            QuartzConnectionName);
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "Connection string 'Quartz' is required for Quartz migration.");
        }

        services.AddSingleton(
            new QuartzMigrationOptions(
                "Npgsql",
                connectionString));
    }

    public static async Task<string> ExecuteMigrationAsync(
        IServiceProvider services,
        string operation,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(services);
        var options = services.GetRequiredService<QuartzMigrationOptions>();
        if (operation == "script")
        {
            return SchemaScript;
        }

        await using var connection = CreateConnection(options);
        await connection.OpenAsync(cancellationToken);
        return operation switch
        {
            "validate" => await ValidateAsync(
                connection,
                options.ProviderInvariantName,
                cancellationToken),
            "apply" => await ApplyAndValidateAsync(
                connection,
                options.ProviderInvariantName,
                cancellationToken),
            _ => throw new ArgumentOutOfRangeException(nameof(operation)),
        };
    }

    private static DbConnection CreateConnection(
        QuartzMigrationOptions options)
    {
        var factory = DbProviderFactories.GetFactory(
            options.ProviderInvariantName);
        var connection = factory.CreateConnection()
            ?? throw new InvalidOperationException(
                "The selected Quartz database provider could not create a connection.");
        connection.ConnectionString = options.ConnectionString;
        return connection;
    }

    private static async Task<string> ValidateAsync(
        DbConnection connection,
        string providerInvariantName,
        CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        foreach (var tableName in RequiredTables)
        {
            var qualifiedTableName =
                providerInvariantName == "Microsoft.Data.SqlClient"
                    ? $"[dbo].[{tableName}]"
                    : tableName;
            command.CommandText =
                $"SELECT 1 FROM {qualifiedTableName} WHERE 1 = 0";
            await command.ExecuteScalarAsync(cancellationToken);
        }
        return "validated: Quartz durable-jobs schema";
    }

    private static async Task<string> ApplyAndValidateAsync(
        DbConnection connection,
        string providerInvariantName,
        CancellationToken cancellationToken)
    {
        await using (var command = connection.CreateCommand())
        {
            command.CommandText = SchemaScript;
            await command.ExecuteNonQueryAsync(cancellationToken);
        }

        await ValidateAsync(
            connection,
            providerInvariantName,
            cancellationToken);
        return "applied: Quartz durable-jobs schema";
    }

    private static string SchemaScript =>
        """
        CREATE TABLE IF NOT EXISTS qrtz_job_details
        (
            sched_name TEXT NOT NULL,
            job_name TEXT NOT NULL,
            job_group TEXT NOT NULL,
            description TEXT NULL,
            job_class_name TEXT NOT NULL,
            is_durable BOOLEAN NOT NULL,
            is_nonconcurrent BOOLEAN NOT NULL,
            is_update_data BOOLEAN NOT NULL,
            requests_recovery BOOLEAN NOT NULL,
            job_data BYTEA NULL,
            PRIMARY KEY (sched_name, job_name, job_group)
        );
        CREATE TABLE IF NOT EXISTS qrtz_triggers
        (
            sched_name TEXT NOT NULL,
            trigger_name TEXT NOT NULL,
            trigger_group TEXT NOT NULL,
            job_name TEXT NOT NULL,
            job_group TEXT NOT NULL,
            description TEXT NULL,
            next_fire_time BIGINT NULL,
            prev_fire_time BIGINT NULL,
            priority INTEGER NULL,
            trigger_state TEXT NOT NULL,
            trigger_type TEXT NOT NULL,
            start_time BIGINT NOT NULL,
            end_time BIGINT NULL,
            calendar_name TEXT NULL,
            misfire_instr SMALLINT NULL,
            misfire_orig_fire_time BIGINT NULL,
            execution_group VARCHAR(200) NULL,
            job_data BYTEA NULL,
            PRIMARY KEY (sched_name, trigger_name, trigger_group),
            FOREIGN KEY (sched_name, job_name, job_group)
                REFERENCES qrtz_job_details (sched_name, job_name, job_group)
        );
        CREATE TABLE IF NOT EXISTS qrtz_simple_triggers
        (
            sched_name TEXT NOT NULL,
            trigger_name TEXT NOT NULL,
            trigger_group TEXT NOT NULL,
            repeat_count BIGINT NOT NULL,
            repeat_interval BIGINT NOT NULL,
            times_triggered BIGINT NOT NULL,
            PRIMARY KEY (sched_name, trigger_name, trigger_group),
            FOREIGN KEY (sched_name, trigger_name, trigger_group)
                REFERENCES qrtz_triggers (sched_name, trigger_name, trigger_group)
                ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS qrtz_simprop_triggers
        (
            sched_name TEXT NOT NULL,
            trigger_name TEXT NOT NULL,
            trigger_group TEXT NOT NULL,
            str_prop_1 TEXT NULL,
            str_prop_2 TEXT NULL,
            str_prop_3 TEXT NULL,
            int_prop_1 INTEGER NULL,
            int_prop_2 INTEGER NULL,
            long_prop_1 BIGINT NULL,
            long_prop_2 BIGINT NULL,
            dec_prop_1 NUMERIC NULL,
            dec_prop_2 NUMERIC NULL,
            bool_prop_1 BOOLEAN NULL,
            bool_prop_2 BOOLEAN NULL,
            time_zone_id TEXT NULL,
            PRIMARY KEY (sched_name, trigger_name, trigger_group),
            FOREIGN KEY (sched_name, trigger_name, trigger_group)
                REFERENCES qrtz_triggers (sched_name, trigger_name, trigger_group)
                ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS qrtz_cron_triggers
        (
            sched_name TEXT NOT NULL,
            trigger_name TEXT NOT NULL,
            trigger_group TEXT NOT NULL,
            cron_expression TEXT NOT NULL,
            time_zone_id TEXT NULL,
            PRIMARY KEY (sched_name, trigger_name, trigger_group),
            FOREIGN KEY (sched_name, trigger_name, trigger_group)
                REFERENCES qrtz_triggers (sched_name, trigger_name, trigger_group)
                ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS qrtz_blob_triggers
        (
            sched_name TEXT NOT NULL,
            trigger_name TEXT NOT NULL,
            trigger_group TEXT NOT NULL,
            blob_data BYTEA NULL,
            PRIMARY KEY (sched_name, trigger_name, trigger_group),
            FOREIGN KEY (sched_name, trigger_name, trigger_group)
                REFERENCES qrtz_triggers (sched_name, trigger_name, trigger_group)
                ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS qrtz_calendars
        (
            sched_name TEXT NOT NULL,
            calendar_name TEXT NOT NULL,
            calendar BYTEA NOT NULL,
            PRIMARY KEY (sched_name, calendar_name)
        );
        CREATE TABLE IF NOT EXISTS qrtz_paused_trigger_grps
        (
            sched_name TEXT NOT NULL,
            trigger_group TEXT NOT NULL,
            PRIMARY KEY (sched_name, trigger_group)
        );
        CREATE TABLE IF NOT EXISTS qrtz_fired_triggers
        (
            sched_name TEXT NOT NULL,
            entry_id TEXT NOT NULL,
            trigger_name TEXT NOT NULL,
            trigger_group TEXT NOT NULL,
            instance_name TEXT NOT NULL,
            fired_time BIGINT NOT NULL,
            sched_time BIGINT NOT NULL,
            priority INTEGER NOT NULL,
            state TEXT NOT NULL,
            job_name TEXT NULL,
            job_group TEXT NULL,
            is_nonconcurrent BOOLEAN NOT NULL,
            requests_recovery BOOLEAN NULL,
            execution_group VARCHAR(200) NULL,
            PRIMARY KEY (sched_name, entry_id)
        );
        CREATE TABLE IF NOT EXISTS qrtz_scheduler_state
        (
            sched_name TEXT NOT NULL,
            instance_name TEXT NOT NULL,
            last_checkin_time BIGINT NOT NULL,
            checkin_interval BIGINT NOT NULL,
            PRIMARY KEY (sched_name, instance_name)
        );
        CREATE TABLE IF NOT EXISTS qrtz_locks
        (
            sched_name TEXT NOT NULL,
            lock_name TEXT NOT NULL,
            PRIMARY KEY (sched_name, lock_name)
        );
        CREATE INDEX IF NOT EXISTS idx_qrtz_j_req_recovery
            ON qrtz_job_details (requests_recovery);
        CREATE INDEX IF NOT EXISTS idx_qrtz_t_next_fire_time
            ON qrtz_triggers (next_fire_time);
        CREATE INDEX IF NOT EXISTS idx_qrtz_t_state
            ON qrtz_triggers (trigger_state);
        CREATE INDEX IF NOT EXISTS idx_qrtz_t_nft_st
            ON qrtz_triggers (next_fire_time, trigger_state);
        CREATE INDEX IF NOT EXISTS idx_qrtz_ft_trig_name
            ON qrtz_fired_triggers (trigger_name);
        CREATE INDEX IF NOT EXISTS idx_qrtz_ft_trig_group
            ON qrtz_fired_triggers (trigger_group);
        CREATE INDEX IF NOT EXISTS idx_qrtz_ft_trig_nm_gp
            ON qrtz_fired_triggers (sched_name, trigger_name, trigger_group);
        CREATE INDEX IF NOT EXISTS idx_qrtz_ft_trig_inst_name
            ON qrtz_fired_triggers (instance_name);
        CREATE INDEX IF NOT EXISTS idx_qrtz_ft_job_name
            ON qrtz_fired_triggers (job_name);
        CREATE INDEX IF NOT EXISTS idx_qrtz_ft_job_group
            ON qrtz_fired_triggers (job_group);
        CREATE INDEX IF NOT EXISTS idx_qrtz_ft_job_req_recovery
            ON qrtz_fired_triggers (requests_recovery);
        """;
}
