using System.Collections.Immutable;
using System.Diagnostics;
using System.Diagnostics.Metrics;
using System.Globalization;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using OpenTelemetry.Metrics;
using OpenTelemetry.Trace;
using Quartz;
using Quartz.Impl.AdoJobStore;

namespace MartiX.QuartzTestApp.Api.Infrastructure.DurableJobs;

public sealed record JobInvocation
{
    public JobInvocation(
        string operationName,
        int schemaVersion,
        IReadOnlyDictionary<string, string> arguments)
    {
        if (!DurableJobValidation.IsValidOperationName(operationName))
        {
            throw new ArgumentException(
                "A durable job operation name must be a bounded identifier.",
                nameof(operationName));
        }

        if (!DurableJobValidation.IsValidSchemaVersion(schemaVersion))
        {
            throw new ArgumentOutOfRangeException(nameof(schemaVersion));
        }

        ArgumentNullException.ThrowIfNull(arguments);
        if (arguments.Count > 16)
        {
            throw new ArgumentException(
                "A durable job invocation may contain at most 16 scalar arguments.",
                nameof(arguments));
        }

        var copiedArguments = new Dictionary<string, string>(
            StringComparer.Ordinal);
        foreach (var (key, value) in arguments)
        {
            if (string.IsNullOrWhiteSpace(key) ||
                key.Length > 64 ||
                string.IsNullOrWhiteSpace(value) ||
                value.Length > 1024)
            {
                throw new ArgumentException(
                    "Durable job arguments must be bounded non-empty scalars.",
                    nameof(arguments));
            }

            copiedArguments.Add(key, value);
        }

        OperationName = operationName;
        SchemaVersion = schemaVersion;
        Arguments = copiedArguments.ToImmutableDictionary(
            StringComparer.Ordinal);
    }

    public string OperationName { get; }

    public int SchemaVersion { get; }

    public IReadOnlyDictionary<string, string> Arguments { get; }
}

internal static class DurableJobValidation
{
    internal static bool IsValidOperationName(string? operationName) =>
        !string.IsNullOrWhiteSpace(operationName) &&
        operationName.Length <= 128 &&
        operationName.All(character =>
            char.IsAsciiLetterOrDigit(character) ||
            character is '.' or '-' or '_');

    internal static bool IsValidSchemaVersion(int schemaVersion) =>
        schemaVersion > 0;
}

public interface IDurableJobDispatcher
{
    ValueTask ExecuteAsync(
        JobInvocation invocation,
        CancellationToken cancellationToken);
}

internal sealed class UnconfiguredDurableJobDispatcher : IDurableJobDispatcher
{
    public ValueTask ExecuteAsync(
        JobInvocation invocation,
        CancellationToken cancellationToken)
    {
        _ = invocation;
        cancellationToken.ThrowIfCancellationRequested();
        throw new InvalidOperationException(
            "Register an application-owned IDurableJobDispatcher before scheduling durable jobs.");
    }
}

[DisallowConcurrentExecution]
public sealed class DurableJobAdapter : IJob
{
    private const string OperationKey = "operation";
    private const string SchemaVersionKey = "schema-version";
    private const string ArgumentsKey = "arguments";
    private readonly IDurableJobDispatcher dispatcher;

    public DurableJobAdapter(IDurableJobDispatcher dispatcher)
    {
        this.dispatcher = dispatcher;
    }

    public async ValueTask Execute(IJobExecutionContext context)
    {
        ArgumentNullException.ThrowIfNull(context);
        var operation = context.MergedJobDataMap.GetString(OperationKey);
        var schemaVersionValue = context.MergedJobDataMap.GetString(SchemaVersionKey);
        var argumentsJson = context.MergedJobDataMap.GetString(ArgumentsKey);
        if (!int.TryParse(
                schemaVersionValue,
                NumberStyles.None,
                CultureInfo.InvariantCulture,
                out var schemaVersion) ||
            string.IsNullOrWhiteSpace(operation) ||
            string.IsNullOrWhiteSpace(argumentsJson))
        {
            throw new JobExecutionException(
                "The durable job payload is missing its stable invocation fields.");
        }

        var arguments =
            JsonSerializer.Deserialize<Dictionary<string, string>>(argumentsJson)
            ?? throw new JobExecutionException(
                "The durable job payload arguments were invalid.");
        var invocation = new JobInvocation(operation, schemaVersion, arguments);
        var stopwatch = Stopwatch.StartNew();
        using var activity =
            DurableJobsTelemetry.ActivitySource.StartActivity(
                "durable-job.execute",
                ActivityKind.Internal);
        activity?.SetTag("martix.job.operation", invocation.OperationName);
        activity?.SetTag("martix.job.schema_version", invocation.SchemaVersion);
        try
        {
            context.CancellationToken.ThrowIfCancellationRequested();
            await dispatcher.ExecuteAsync(
                invocation,
                context.CancellationToken);
            DurableJobsTelemetry.Executions.Add(
                1,
                new KeyValuePair<string, object?>("outcome", "success"));
        }
        catch (OperationCanceledException)
            when (context.CancellationToken.IsCancellationRequested)
        {
            DurableJobsTelemetry.Executions.Add(
                1,
                new KeyValuePair<string, object?>("outcome", "cancelled"));
            throw;
        }
        catch
        {
            DurableJobsTelemetry.Executions.Add(
                1,
                new KeyValuePair<string, object?>("outcome", "failure"));
            throw;
        }
        finally
        {
            DurableJobsTelemetry.Duration.Record(
                stopwatch.Elapsed.TotalMilliseconds);
        }
    }

    internal static string OperationDataKey => OperationKey;

    internal static string SchemaVersionDataKey => SchemaVersionKey;

    internal static string ArgumentsDataKey => ArgumentsKey;
}

public static class DurableJobsComposition
{
    public const string SchedulerNameConfigurationKey = "Quartz:SchedulerName";
    public const string JobConnectionStringName = "Quartz";
    public const string JobGroup = "application";

    public static JobKey CreateJobKey(
        string operationName,
        int schemaVersion)
    {
        if (!DurableJobValidation.IsValidOperationName(operationName))
        {
            throw new ArgumentException(
                "A durable job requires a bounded operation name.",
                nameof(operationName));
        }
        if (!DurableJobValidation.IsValidSchemaVersion(schemaVersion))
        {
            throw new ArgumentOutOfRangeException(nameof(schemaVersion));
        }

        return new JobKey(
            operationName + ":v" +
                schemaVersion.ToString(CultureInfo.InvariantCulture),
            JobGroup);
    }

    public static void AddServices(
        IServiceCollection services,
        IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);
        var connectionString = configuration.GetConnectionString(
            JobConnectionStringName);
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "Connection string 'Quartz' is required when durable jobs are selected.");
        }

        var schedulerName = configuration[SchedulerNameConfigurationKey];
        if (string.IsNullOrWhiteSpace(schedulerName))
        {
            throw new InvalidOperationException(
                "Configuration key 'Quartz:SchedulerName' is required when durable jobs are selected.");
        }

        services.TryAddSingleton<IDurableJobDispatcher,
            UnconfiguredDurableJobDispatcher>();
        services.AddSingleton<DurableJobOperator>();
        services.AddHealthChecks()
            .AddCheck<DurableJobsHealthCheck>(
                "durable-jobs",
                tags: new[] { "ready" },
                timeout: TimeSpan.FromSeconds(5));
        services.AddOpenTelemetry()
            .WithTracing(tracing =>
                tracing.AddSource(DurableJobsTelemetry.ActivitySourceName))
            .WithMetrics(metrics =>
                metrics.AddMeter(DurableJobsTelemetry.MeterName));
        services.AddQuartz(options =>
        {
            options.SchedulerName = schedulerName;
            options.MaxBatchSize = 10;
            options.InterruptJobsOnShutdown = true;
            options.InterruptJobsOnShutdownWithWait = true;
            options.UseDefaultThreadPool(
                threadPool => threadPool.MaxConcurrency = 8);
            options.UsePersistentStore(store =>
            {
                store.UseProperties = true;
                store.RetryInterval = TimeSpan.FromSeconds(15);
                store.MaxTransientRetries = 3;
                store.UseGenericDatabase<Quartz.Impl.AdoJobStore.PostgreSQLDelegate>(
                "Npgsql",
                provider => provider.ConnectionString = connectionString);
                store.UseClustering(cluster =>
                {
                    cluster.CheckinInterval =
                        TimeSpan.FromMilliseconds(7500);
                    cluster.CheckinMisfireThreshold =
                        TimeSpan.FromMilliseconds(7500);
                });
                store.UseSystemTextJsonSerializer();
            });
        });
        services.AddQuartzHostedService(options =>
        {
            options.WaitForJobsToComplete = true;
        });
    }

    public static async Task<DateTimeOffset> ScheduleAsync(
        IScheduler scheduler,
        JobInvocation invocation,
        DateTimeOffset runAtUtc,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(scheduler);
        ArgumentNullException.ThrowIfNull(invocation);
        cancellationToken.ThrowIfCancellationRequested();
        var jobKey = CreateJobKey(
            invocation.OperationName,
            invocation.SchemaVersion);
        var job = JobBuilder.Create<DurableJobAdapter>()
            .WithIdentity(jobKey)
            .UsingJobData(
                DurableJobAdapter.OperationDataKey,
                invocation.OperationName)
            .UsingJobData(
                DurableJobAdapter.SchemaVersionDataKey,
                invocation.SchemaVersion.ToString(
                    CultureInfo.InvariantCulture))
            .UsingJobData(
                DurableJobAdapter.ArgumentsDataKey,
                JsonSerializer.Serialize(invocation.Arguments))
            .StoreDurably(true)
            .RequestRecovery(true)
            .Build();
        var trigger = TriggerBuilder.Create()
            .WithIdentity(
                jobKey.Name + ":trigger",
                JobGroup)
            .ForJob(jobKey)
            .StartAt(runAtUtc)
            .WithSimpleSchedule(schedule =>
                schedule.WithMisfireHandlingInstructionFireNow())
            .Build();
        await scheduler.ScheduleJob(job, trigger, cancellationToken);
        return runAtUtc;
    }
}

public sealed class DurableJobOperator
{
    private readonly IScheduler scheduler;

    public DurableJobOperator(IScheduler scheduler)
    {
        this.scheduler = scheduler;
    }

    public Task PauseAsync(
        string operationName,
        int schemaVersion,
        CancellationToken cancellationToken = default) =>
        scheduler.PauseJob(
            DurableJobsComposition.CreateJobKey(operationName, schemaVersion),
            cancellationToken);

    public Task ResumeAsync(
        string operationName,
        int schemaVersion,
        CancellationToken cancellationToken = default) =>
        scheduler.ResumeJob(
            DurableJobsComposition.CreateJobKey(operationName, schemaVersion),
            cancellationToken);

    public Task<bool> InterruptAsync(
        string operationName,
        int schemaVersion,
        CancellationToken cancellationToken = default) =>
        scheduler.Interrupt(
            DurableJobsComposition.CreateJobKey(operationName, schemaVersion),
            cancellationToken);

    public Task<bool> DeleteAsync(
        string operationName,
        int schemaVersion,
        CancellationToken cancellationToken = default) =>
        scheduler.DeleteJob(
            DurableJobsComposition.CreateJobKey(operationName, schemaVersion),
            cancellationToken);
}

internal sealed class DurableJobsHealthCheck : IHealthCheck
{
    private readonly IScheduler scheduler;

    public DurableJobsHealthCheck(IScheduler scheduler)
    {
        this.scheduler = scheduler;
    }

    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        _ = context;
        cancellationToken.ThrowIfCancellationRequested();
        return Task.FromResult(
            scheduler.IsStarted && !scheduler.IsShutdown
                ? HealthCheckResult.Healthy()
                : HealthCheckResult.Unhealthy(
                    "Quartz scheduler is not started."));
    }
}

internal static class DurableJobsTelemetry
{
    public const string ActivitySourceName =
        "MartiX.QuartzTestApp.DurableJobs";
    public const string MeterName =
        "MartiX.QuartzTestApp.DurableJobs";
    public static readonly ActivitySource ActivitySource =
        new(ActivitySourceName);
    public static readonly Meter Meter = new(MeterName);
    public static readonly Counter<long> Executions =
        Meter.CreateCounter<long>("martix.durable_jobs.executions");
    public static readonly Histogram<double> Duration =
        Meter.CreateHistogram<double>(
            "martix.durable_jobs.duration_ms",
            unit: "ms");
}
