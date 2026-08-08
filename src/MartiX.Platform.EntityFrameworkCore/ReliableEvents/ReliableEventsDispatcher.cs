using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace MartiX.Platform.EntityFrameworkCore.ReliableEvents;

/// <summary>One persisted delivery selected for an explicit transport operation.</summary>
public sealed record ReliableEventDelivery(
    Guid MessageId,
    string SubscriptionId,
    Guid LeaseId,
    ReliableEventEnvelope Envelope,
    int Attempt);

/// <summary>
/// Bounded durable dispatcher loop. Correctness state remains in the database;
/// local wakeups and task scheduling are only latency optimizations.
/// </summary>
public sealed class ReliableEventsDispatcher : BackgroundService
{
    private readonly ReliableEventsOptions options;
    private readonly Func<
        int,
        CancellationToken,
        ValueTask<IReadOnlyList<ReliableEventDelivery>>> claim;
    private readonly Func<
        ReliableEventDelivery,
        CancellationToken,
        ValueTask<ReliableEventDeliveryOutcome>> deliver;
    private readonly Func<
        ReliableEventDelivery,
        CancellationToken,
        ValueTask<bool>> acknowledge;
    private readonly Func<
        ReliableEventDelivery,
        string,
        string?,
        CancellationToken,
        ValueTask<bool>> scheduleRetry;
    private readonly Func<
        ReliableEventDelivery,
        string,
        string?,
        CancellationToken,
        ValueTask<bool>> fail;
    private readonly ILogger<ReliableEventsDispatcher> logger;
    private readonly ReliableEventsDiagnostics diagnostics;

    /// <summary>Initializes one bounded dispatcher.</summary>
    public ReliableEventsDispatcher(
        ReliableEventsOptions options,
        Func<
            int,
            CancellationToken,
            ValueTask<IReadOnlyList<ReliableEventDelivery>>> claim,
        Func<
            ReliableEventDelivery,
            CancellationToken,
            ValueTask<ReliableEventDeliveryOutcome>> deliver,
        ILogger<ReliableEventsDispatcher> logger,
        ReliableEventsDiagnostics diagnostics,
        Func<
            ReliableEventDelivery,
            CancellationToken,
            ValueTask<bool>> acknowledge,
        Func<
            ReliableEventDelivery,
            string,
            string?,
            CancellationToken,
            ValueTask<bool>> scheduleRetry,
        Func<
            ReliableEventDelivery,
            string,
            string?,
            CancellationToken,
            ValueTask<bool>> fail)
    {
        ArgumentNullException.ThrowIfNull(options);
        ArgumentNullException.ThrowIfNull(claim);
        ArgumentNullException.ThrowIfNull(deliver);
        ArgumentNullException.ThrowIfNull(logger);
        ArgumentNullException.ThrowIfNull(diagnostics);
        ArgumentNullException.ThrowIfNull(acknowledge);
        ArgumentNullException.ThrowIfNull(scheduleRetry);
        ArgumentNullException.ThrowIfNull(fail);
        options.Validate();
        this.options = options;
        this.claim = claim;
        this.deliver = deliver;
        this.acknowledge = acknowledge;
        this.scheduleRetry = scheduleRetry;
        this.fail = fail;
        this.diagnostics = diagnostics;
        this.logger = logger;
    }

    /// <inheritdoc />
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var limiter = new SemaphoreSlim(options.MaxConcurrentDeliveries);
        while (!stoppingToken.IsCancellationRequested)
        {
            IReadOnlyList<ReliableEventDelivery> deliveries;
            try
            {
                deliveries = await claim(options.BatchSize, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception exception)
            {
                logger.LogWarning(
                    "Reliable event claim failed with {ExceptionType}; durable work remains recoverable and the dispatcher will poll again.",
                    exception.GetType().Name);
                await Task.Delay(options.IdlePollInterval, stoppingToken);
                continue;
            }

            if (deliveries.Count == 0)
            {
                await Task.Delay(options.IdlePollInterval, stoppingToken);
                continue;
            }

            var work = new List<Task>(deliveries.Count);
            foreach (var delivery in deliveries)
            {
                work.Add(ProcessAsync(delivery, limiter, stoppingToken));
            }

            await Task.WhenAll(work);
        }
    }

    /// <inheritdoc />
    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        using var shutdown = CancellationTokenSource.CreateLinkedTokenSource(
            cancellationToken);
        shutdown.CancelAfter(options.ShutdownBudget);
        try
        {
            await base.StopAsync(shutdown.Token);
        }
        catch (OperationCanceledException) when (shutdown.IsCancellationRequested)
        {
            logger.LogWarning(
                "Reliable event dispatcher shutdown exceeded its bounded wait budget; leased work will recover.");
        }
    }

    private async Task ProcessAsync(
        ReliableEventDelivery delivery,
        SemaphoreSlim limiter,
        CancellationToken stoppingToken)
    {
        await limiter.WaitAsync(stoppingToken);
        var attemptStarted = Stopwatch.GetTimestamp();
        try
        {
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(
                stoppingToken);
            timeout.CancelAfter(options.AttemptTimeout);
            ReliableEventDeliveryOutcome outcome;
            try
            {
                outcome = await deliver(delivery, timeout.Token);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                logger.LogInformation(
                    "Reliable event delivery was cancelled during host shutdown for event {EventName} v{SchemaVersion}, attempt {Attempt}.",
                    delivery.Envelope.EventName,
                    delivery.Envelope.SchemaVersion,
                    delivery.Attempt);
                return;
            }
            catch (OperationCanceledException)
            {
                logger.LogWarning(
                    "Reliable event delivery timed out for event {EventName} v{SchemaVersion}, attempt {Attempt}.",
                    delivery.Envelope.EventName,
                    delivery.Envelope.SchemaVersion,
                    delivery.Attempt);
                outcome = ReliableEventDeliveryOutcome.TransientFailure;
            }
            catch (Exception exception)
            {
                logger.LogError(
                    "Reliable event consumer failed unexpectedly for event {EventName} v{SchemaVersion}, attempt {Attempt}, exception type {ExceptionType}.",
                    delivery.Envelope.EventName,
                    delivery.Envelope.SchemaVersion,
                    delivery.Attempt,
                    exception.GetType().Name);
                outcome = ReliableEventDeliveryOutcome.TransientFailure;
            }

            if (stoppingToken.IsCancellationRequested)
            {
                return;
            }

            try
            {
                await SettleAsync(delivery, outcome, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception exception)
            {
                logger.LogError(
                    "Reliable event settlement failed for event {EventName} v{SchemaVersion}, attempt {Attempt}, exception type {ExceptionType}.",
                    delivery.Envelope.EventName,
                    delivery.Envelope.SchemaVersion,
                    delivery.Attempt,
                    exception.GetType().Name);
            }
        }
        finally
        {
            diagnostics.AttemptDuration.Record(
                Stopwatch.GetElapsedTime(attemptStarted).TotalSeconds);
            limiter.Release();
        }
    }

    private async ValueTask SettleAsync(
        ReliableEventDelivery delivery,
        ReliableEventDeliveryOutcome outcome,
        CancellationToken cancellationToken)
    {
        switch (outcome)
        {
            case ReliableEventDeliveryOutcome.Acknowledged:
            case ReliableEventDeliveryOutcome.DuplicateSuppressed:
                if (!await acknowledge(delivery, cancellationToken))
                {
                    logger.LogWarning(
                        "Reliable event acknowledgement was fenced for event {EventName} v{SchemaVersion}, attempt {Attempt}.",
                        delivery.Envelope.EventName,
                        delivery.Envelope.SchemaVersion,
                        delivery.Attempt);
                }

                return;
            case ReliableEventDeliveryOutcome.TransientFailure:
                if (delivery.Attempt >= options.AutomaticAttemptLimit)
                {
                    await SettleTerminalFailureAsync(
                        delivery,
                        "automatic-attempt-limit",
                        "The automatic delivery attempt limit was reached.",
                        cancellationToken);
                    return;
                }

                if (!await scheduleRetry(
                        delivery,
                        "consumer-transient-failure",
                        "The consumer reported a transient failure.",
                        cancellationToken))
                {
                    logger.LogWarning(
                        "Reliable event retry was fenced for event {EventName} v{SchemaVersion}, attempt {Attempt}.",
                        delivery.Envelope.EventName,
                        delivery.Envelope.SchemaVersion,
                        delivery.Attempt);
                }
                else
                {
                    logger.LogWarning(
                        "Reliable event delivery requires retry for event {EventName} v{SchemaVersion}, attempt {Attempt}.",
                        delivery.Envelope.EventName,
                        delivery.Envelope.SchemaVersion,
                        delivery.Attempt);
                }

                return;
            case ReliableEventDeliveryOutcome.PermanentFailure:
                await SettleTerminalFailureAsync(
                    delivery,
                    "consumer-permanent-failure",
                    "The consumer reported a permanent failure.",
                    cancellationToken);
                return;
            case ReliableEventDeliveryOutcome.Cancelled:
                logger.LogInformation(
                    "Reliable event delivery was cancelled before acknowledgement for event {EventName} v{SchemaVersion}, attempt {Attempt}.",
                    delivery.Envelope.EventName,
                    delivery.Envelope.SchemaVersion,
                    delivery.Attempt);
                return;
            default:
                throw new ArgumentOutOfRangeException(nameof(outcome), outcome, null);
        }
    }

    private async ValueTask SettleTerminalFailureAsync(
        ReliableEventDelivery delivery,
        string failureCategory,
        string failureDetail,
        CancellationToken cancellationToken)
    {
        if (!await fail(delivery, failureCategory, failureDetail, cancellationToken))
        {
            logger.LogWarning(
                "Reliable event terminal failure was fenced for event {EventName} v{SchemaVersion}, attempt {Attempt}.",
                delivery.Envelope.EventName,
                delivery.Envelope.SchemaVersion,
                delivery.Attempt);
            return;
        }

        logger.LogError(
            "Reliable event delivery reached terminal failure for event {EventName} v{SchemaVersion}, attempt {Attempt}.",
            delivery.Envelope.EventName,
            delivery.Envelope.SchemaVersion,
            delivery.Attempt);
    }
}
