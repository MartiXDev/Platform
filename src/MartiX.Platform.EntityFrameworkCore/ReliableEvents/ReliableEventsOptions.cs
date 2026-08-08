using System;

namespace MartiX.Platform.EntityFrameworkCore.ReliableEvents;

/// <summary>Validated bounded defaults for durable in-process delivery.</summary>
public sealed class ReliableEventsOptions
{
    private const int DefaultBatchSize = 50;
    private const int DefaultAutomaticAttemptLimit = 10;
    private static readonly TimeSpan DefaultLeaseDuration = TimeSpan.FromSeconds(60);

    /// <summary>Maximum rows claimed per poll.</summary>
    public int BatchSize { get; init; } = DefaultBatchSize;

    /// <summary>Maximum deliveries executing concurrently in one host.</summary>
    public int MaxConcurrentDeliveries { get; init; } = 4;

    /// <summary>Delay between empty durable polls.</summary>
    public TimeSpan IdlePollInterval { get; init; } = TimeSpan.FromSeconds(1);

    /// <summary>Maximum time allowed for one delivery operation.</summary>
    public TimeSpan AttemptTimeout { get; init; } = TimeSpan.FromSeconds(30);

    /// <summary>Lease duration and fencing window.</summary>
    public TimeSpan LeaseDuration { get; init; } = DefaultLeaseDuration;

    /// <summary>Maximum automatic attempts before terminal failure.</summary>
    public int AutomaticAttemptLimit { get; init; } = DefaultAutomaticAttemptLimit;

    /// <summary>Initial full-jitter retry delay.</summary>
    public TimeSpan RetryBaseDelay { get; init; } = TimeSpan.FromSeconds(1);

    /// <summary>Maximum full-jitter retry delay.</summary>
    public TimeSpan MaxRetryDelay { get; init; } = TimeSpan.FromMinutes(5);

    /// <summary>Bounded host shutdown wait budget.</summary>
    public TimeSpan ShutdownBudget { get; init; } = TimeSpan.FromSeconds(30);

    /// <summary>Retention for delivered Outbox Messages and Deliveries.</summary>
    public TimeSpan OutboxRetention { get; init; } = TimeSpan.FromDays(7);

    /// <summary>Retention for Inbox Receipts.</summary>
    public TimeSpan InboxReceiptRetention { get; init; } = TimeSpan.FromDays(30);

    /// <summary>Maximum persisted failure category length.</summary>
    public int FailureCategoryLimit { get; init; } = 200;

    /// <summary>Maximum persisted failure detail length.</summary>
    public int FailureDetailLimit { get; init; } = 1000;

    /// <summary>Validates all bounds and the recovery horizon relationship.</summary>
    public void Validate()
    {
        if (BatchSize <= 0 ||
            MaxConcurrentDeliveries <= 0 ||
            AutomaticAttemptLimit <= 0)
        {
            throw new InvalidOperationException(
                "Reliable-events batch, concurrency, and attempt limits must be positive.");
        }
        if (IdlePollInterval <= TimeSpan.Zero ||
            AttemptTimeout <= TimeSpan.Zero ||
            LeaseDuration <= TimeSpan.Zero ||
            ShutdownBudget <= TimeSpan.Zero ||
            RetryBaseDelay <= TimeSpan.Zero ||
            MaxRetryDelay < RetryBaseDelay)
        {
            throw new InvalidOperationException(
                "Reliable-events timing bounds must be positive and ordered.");
        }
        if (LeaseDuration <= AttemptTimeout + TimeSpan.FromSeconds(5))
        {
            throw new InvalidOperationException(
                "The delivery lease must outlive the attempt timeout and shutdown margin.");
        }
        if (OutboxRetention <= TimeSpan.Zero ||
            InboxReceiptRetention <= TimeSpan.Zero ||
            InboxReceiptRetention < OutboxRetention)
        {
            throw new InvalidOperationException(
                "Inbox retention must outlive the Outbox delivery replay horizon.");
        }
        if (FailureCategoryLimit <= 0 || FailureDetailLimit <= 0)
        {
            throw new InvalidOperationException(
                "Reliable-events failure fields must be bounded and positive.");
        }
        if (FailureCategoryLimit > 200 || FailureDetailLimit > 1000)
        {
            throw new InvalidOperationException(
                "Reliable-events failure fields cannot exceed their persisted column bounds.");
        }
    }

    /// <summary>Calculates a bounded full-jitter exponential retry delay.</summary>
    public TimeSpan GetRetryDelay(int attempt, Random random)
    {
        ArgumentNullException.ThrowIfNull(random);
        if (attempt <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(attempt));
        }

        var exponent = Math.Min(attempt - 1, 30);
        var exponential = Math.Min(
            MaxRetryDelay.TotalMilliseconds,
            RetryBaseDelay.TotalMilliseconds * Math.Pow(2, exponent));
        return TimeSpan.FromMilliseconds(random.NextDouble() * exponential);
    }
}
