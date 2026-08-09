using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using MartiX.Platform.EntityFrameworkCore.ReliableEvents;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace MartiX.Platform.IntegrationEvents.RabbitMq;

/// <summary>Callbacks that compose RabbitMQ with module-owned durable state.</summary>
public sealed class RabbitMqReliableEventsCallbacks
{
    /// <summary>Claims fenced Outbox deliveries for publication.</summary>
    public required Func<
        IServiceProvider,
        int,
        CancellationToken,
        ValueTask<IReadOnlyList<ReliableEventDelivery>>> ClaimAsync { get; init; }

    /// <summary>Runs module dispatch and Inbox processing.</summary>
    public required Func<
        IServiceProvider,
        ReliableEventDelivery,
        CancellationToken,
        ValueTask<ReliableEventDeliveryOutcome>> DeliverAsync { get; init; }

    /// <summary>Settles an acknowledged or duplicate durable delivery.</summary>
    public required Func<
        IServiceProvider,
        ReliableEventDelivery,
        CancellationToken,
        ValueTask<bool>> AcknowledgeAsync { get; init; }

    /// <summary>Schedules the next bounded durable retry.</summary>
    public required Func<
        IServiceProvider,
        ReliableEventDelivery,
        string,
        string?,
        CancellationToken,
        ValueTask<bool>> ScheduleRetryAsync { get; init; }

    /// <summary>Marks a fenced delivery as terminal failure.</summary>
    public required Func<
        IServiceProvider,
        ReliableEventDelivery,
        string,
        string?,
        CancellationToken,
        ValueTask<bool>> FailAsync { get; init; }
}

/// <summary>Registers the explicitly selected RabbitMQ transport.</summary>
public static class RabbitMqReliableEventsServiceCollectionExtensions
{
    /// <summary>
    /// Adds the RabbitMQ adapter, durable topology, health check, and worker.
    /// </summary>
    public static IServiceCollection AddRabbitMqReliableEvents(
        this IServiceCollection services,
        IConfiguration configuration,
        IReadOnlyList<string> subscriptions,
        RabbitMqReliableEventsCallbacks callbacks)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);
        ArgumentNullException.ThrowIfNull(subscriptions);
        ArgumentNullException.ThrowIfNull(callbacks);

        var options = new RabbitMqTransportOptions
        {
            ConnectionString = configuration.GetConnectionString("RabbitMq")
                ?? string.Empty,
            Exchange = configuration["RabbitMq:Exchange"]
                ?? "martix.integration-events",
            QueuePrefix = configuration["RabbitMq:QueuePrefix"]
                ?? "martix.integration-events",
            PrefetchCount = ReadUShort(
                configuration["RabbitMq:PrefetchCount"],
                32,
                "RabbitMq:PrefetchCount"),
            PublishBatchSize = ReadInt(
                configuration["RabbitMq:PublishBatchSize"],
                50,
                "RabbitMq:PublishBatchSize"),
            PublishPollInterval = ReadDuration(
                configuration["RabbitMq:PublishPollInterval"],
                TimeSpan.FromSeconds(1),
                "RabbitMq:PublishPollInterval"),
            ReconnectDelay = ReadDuration(
                configuration["RabbitMq:ReconnectDelay"],
                TimeSpan.FromSeconds(5),
                "RabbitMq:ReconnectDelay"),
            ClientProvidedName = configuration["RabbitMq:ClientProvidedName"]
                ?? "martix-reliable-events",
            Subscriptions = subscriptions,
        };
        options.Validate();

        services.AddSingleton(options);
        services.AddSingleton<RabbitMqTransportDiagnostics>();
        services.AddSingleton<RabbitMqConnectionManager>();
        services.AddSingleton<IReliableEventsTransport, RabbitMqReliableEventsTransport>();
        services.AddSingleton(callbacks);
        services.AddSingleton<RabbitMqTransportHealthCheck>();
        services.AddHealthChecks().AddCheck<RabbitMqTransportHealthCheck>(
            "broker-transport",
            failureStatus: HealthStatus.Unhealthy,
            tags: new[] { "ready", "broker-transport" });
        services.AddHostedService<RabbitMqConsumer>();
        return services;
    }

    private static ushort ReadUShort(string? value, ushort fallback, string name)
    {
        if (value is null)
        {
            return fallback;
        }

        return ushort.TryParse(value, out var result)
            ? result
            : throw new InvalidOperationException(
                $"Configuration value {name} must be an unsigned integer.");
    }

    private static int ReadInt(string? value, int fallback, string name)
    {
        if (value is null)
        {
            return fallback;
        }

        return int.TryParse(value, out var result)
            ? result
            : throw new InvalidOperationException(
                $"Configuration value {name} must be an integer.");
    }

    private static TimeSpan ReadDuration(
        string? value,
        TimeSpan fallback,
        string name)
    {
        if (value is null)
        {
            return fallback;
        }

        return TimeSpan.TryParse(value, out var result)
            ? result
            : throw new InvalidOperationException(
                $"Configuration value {name} must be a duration.");
    }
}

/// <summary>Health state for the active RabbitMQ connection.</summary>
public sealed class RabbitMqTransportHealthCheck : IHealthCheck
{
    private readonly RabbitMqTransportDiagnostics diagnostics;

    /// <summary>Initializes the transport health check.</summary>
    public RabbitMqTransportHealthCheck(RabbitMqTransportDiagnostics diagnostics)
    {
        this.diagnostics = diagnostics
            ?? throw new ArgumentNullException(nameof(diagnostics));
    }

    /// <inheritdoc />
    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return Task.FromResult(
            diagnostics.IsConnected
                ? HealthCheckResult.Healthy("RabbitMQ connection is available.")
                : HealthCheckResult.Unhealthy(
                    "RabbitMQ connection is unavailable."));
    }
}

/// <summary>
/// Bridges durable Outbox claims and Inbox settlement to the RabbitMQ adapter.
/// </summary>
public sealed class RabbitMqConsumer : BackgroundService
{
    private readonly IServiceProvider services;
    private readonly IReliableEventsTransport transport;
    private readonly RabbitMqTransportOptions transportOptions;
    private readonly RabbitMqReliableEventsCallbacks callbacks;
    private readonly ReliableEventsOptions reliableEventsOptions;
    private readonly RabbitMqTransportDiagnostics diagnostics;
    private readonly ILogger<RabbitMqConsumer> logger;

    /// <summary>Initializes the RabbitMQ producer and consumer worker.</summary>
    public RabbitMqConsumer(
        IServiceProvider services,
        IReliableEventsTransport transport,
        RabbitMqTransportOptions transportOptions,
        RabbitMqReliableEventsCallbacks callbacks,
        ReliableEventsOptions reliableEventsOptions,
        RabbitMqTransportDiagnostics diagnostics,
        ILogger<RabbitMqConsumer> logger)
    {
        this.services = services ?? throw new ArgumentNullException(nameof(services));
        this.transport = transport
            ?? throw new ArgumentNullException(nameof(transport));
        this.transportOptions = transportOptions
            ?? throw new ArgumentNullException(nameof(transportOptions));
        this.callbacks = callbacks
            ?? throw new ArgumentNullException(nameof(callbacks));
        this.reliableEventsOptions = reliableEventsOptions
            ?? throw new ArgumentNullException(nameof(reliableEventsOptions));
        this.diagnostics = diagnostics
            ?? throw new ArgumentNullException(nameof(diagnostics));
        this.logger = logger ?? throw new ArgumentNullException(nameof(logger));
        reliableEventsOptions.Validate();
    }

    /// <inheritdoc />
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var consumer = transport.ConsumeAsync(
            ProcessConsumedDeliveryAsync,
            stoppingToken);
        var publisher = PublishDueDeliveriesAsync(stoppingToken);
        await Task.WhenAll(consumer, publisher).ConfigureAwait(false);
    }

    /// <inheritdoc />
    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        using var shutdown = CancellationTokenSource.CreateLinkedTokenSource(
            cancellationToken);
        shutdown.CancelAfter(reliableEventsOptions.ShutdownBudget);
        try
        {
            await base.StopAsync(shutdown.Token).ConfigureAwait(false);
        }
        catch (OperationCanceledException) when (shutdown.IsCancellationRequested)
        {
            logger.LogWarning(
                "RabbitMQ reliable-events shutdown exceeded its bounded wait budget; leased work will recover.");
        }
    }

    private async Task PublishDueDeliveriesAsync(CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested)
        {
            IReadOnlyList<ReliableEventDelivery> deliveries;
            try
            {
                deliveries = await callbacks.ClaimAsync(
                    services,
                    transportOptions.PublishBatchSize,
                    cancellationToken).ConfigureAwait(false);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception exception)
            {
                diagnostics.ProviderFailures.Add(1);
                logger.LogWarning(
                    "RabbitMQ Outbox claim failed with {ExceptionType}; retrying after a bounded delay.",
                    exception.GetType().Name);
                await Task.Delay(
                    transportOptions.PublishPollInterval,
                    cancellationToken).ConfigureAwait(false);
                continue;
            }

            if (deliveries.Count == 0)
            {
                await Task.Delay(
                    transportOptions.PublishPollInterval,
                    cancellationToken).ConfigureAwait(false);
                continue;
            }

            foreach (var delivery in deliveries)
            {
                try
                {
                    await transport.PublishAsync(delivery, cancellationToken)
                        .ConfigureAwait(false);
                }
                catch (OperationCanceledException)
                    when (cancellationToken.IsCancellationRequested)
                {
                    return;
                }
                catch (Exception exception)
                {
                    diagnostics.ProviderFailures.Add(1);
                    logger.LogWarning(
                        "RabbitMQ publish failed for event {EventName} with {ExceptionType}; scheduling durable retry.",
                        delivery.Envelope.EventName,
                        exception.GetType().Name);
                    try
                    {
                        await callbacks.ScheduleRetryAsync(
                            services,
                            delivery,
                            "broker-publish-failure",
                            "RabbitMQ did not confirm the durable publication.",
                            cancellationToken).ConfigureAwait(false);
                    }
                    catch (OperationCanceledException)
                        when (cancellationToken.IsCancellationRequested)
                    {
                        return;
                    }
                    catch (Exception settlementException)
                    {
                        logger.LogError(
                            "RabbitMQ publish failure settlement failed with {ExceptionType}; the lease will expire for recovery.",
                            settlementException.GetType().Name);
                    }
                }
            }
        }
    }

    private async ValueTask<ReliableEventDeliveryOutcome> ProcessConsumedDeliveryAsync(
        ReliableEventDelivery delivery,
        CancellationToken cancellationToken)
    {
        using var attemptTimeout = CancellationTokenSource.CreateLinkedTokenSource(
            cancellationToken);
        attemptTimeout.CancelAfter(reliableEventsOptions.AttemptTimeout);
        ReliableEventDeliveryOutcome outcome;
        try
        {
            outcome = await callbacks.DeliverAsync(
                services,
                delivery,
                attemptTimeout.Token).ConfigureAwait(false);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            return ReliableEventDeliveryOutcome.Cancelled;
        }
        catch (OperationCanceledException)
        {
            logger.LogWarning(
                "RabbitMQ reliable-event delivery timed out for event {EventName} at attempt {Attempt}.",
                delivery.Envelope.EventName,
                delivery.Attempt);
            outcome = ReliableEventDeliveryOutcome.TransientFailure;
        }
        catch (Exception exception)
        {
            logger.LogError(
                "RabbitMQ reliable-event consumer failed for event {EventName} at attempt {Attempt} with {ExceptionType}.",
                delivery.Envelope.EventName,
                delivery.Attempt,
                exception.GetType().Name);
            outcome = ReliableEventDeliveryOutcome.TransientFailure;
        }

        switch (outcome)
        {
            case ReliableEventDeliveryOutcome.Acknowledged:
            case ReliableEventDeliveryOutcome.DuplicateSuppressed:
                await callbacks.AcknowledgeAsync(
                    services,
                    delivery,
                    cancellationToken).ConfigureAwait(false);
                return outcome;
            case ReliableEventDeliveryOutcome.TransientFailure:
                if (delivery.Attempt >= reliableEventsOptions.AutomaticAttemptLimit)
                {
                    await callbacks.FailAsync(
                        services,
                        delivery,
                        "automatic-attempt-limit",
                        "The automatic delivery attempt limit was reached.",
                        cancellationToken).ConfigureAwait(false);
                    return outcome;
                }

                await callbacks.ScheduleRetryAsync(
                    services,
                    delivery,
                    "consumer-transient-failure",
                    "The consumer reported a transient failure.",
                    cancellationToken).ConfigureAwait(false);
                return outcome;
            case ReliableEventDeliveryOutcome.PermanentFailure:
                await callbacks.FailAsync(
                    services,
                    delivery,
                    "consumer-permanent-failure",
                    "The consumer reported a permanent failure.",
                    cancellationToken).ConfigureAwait(false);
                return outcome;
            case ReliableEventDeliveryOutcome.Cancelled:
                return outcome;
            default:
                throw new ArgumentOutOfRangeException(nameof(outcome), outcome, null);
        }
    }
}
