using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace MartiX.Platform.EntityFrameworkCore.ReliableEvents;

/// <summary>The admitted relational provider algorithms for queue claiming.</summary>
public enum ReliableEventsProvider
{
    /// <summary>PostgreSQL queue locking.</summary>
    PostgreSql = 1,

    /// <summary>SQL Server queue locking.</summary>
    SqlServer = 2,
}

/// <summary>Durable claim and fencing operations for Outbox deliveries.</summary>
public static class ReliableEventsLeaseCoordinator
{
    /// <summary>The persisted fencing-token column used by both providers.</summary>
    public const string LeaseIdColumn = "lease_id";

    /// <summary>
    /// Claims a deterministic due batch using provider-specific queue locking.
    /// </summary>
    public static async Task<IReadOnlyList<OutboxDelivery>> ClaimDueAsync(
        DbContext dbContext,
        string schema,
        ReliableEventsProvider provider,
        ReliableEventsOptions options,
        TimeProvider timeProvider,
        ReliableEventsDiagnostics diagnostics,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(dbContext);
        ArgumentException.ThrowIfNullOrWhiteSpace(schema);
        ArgumentNullException.ThrowIfNull(options);
        ArgumentNullException.ThrowIfNull(timeProvider);
        ArgumentNullException.ThrowIfNull(diagnostics);
        options.Validate();

        var now = timeProvider.GetUtcNow();
        await using var transaction =
            await dbContext.Database.BeginTransactionAsync(
                IsolationLevel.ReadCommitted,
                cancellationToken);
        await using var command = CreateClaimCommand(
            dbContext,
            transaction,
            schema,
            provider,
            options.BatchSize,
            now);
        var keys = new List<(Guid MessageId, string SubscriptionId)>();
        await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
        {
            while (await reader.ReadAsync(cancellationToken))
            {
                keys.Add((reader.GetGuid(0), reader.GetString(1)));
            }
        }

        var claimed = new List<OutboxDelivery>(keys.Count);
        var expired = 0;
        var exhausted = 0;
        foreach (var (messageId, subscriptionId) in keys)
        {
            var delivery = await dbContext.Set<OutboxDelivery>()
                .SingleAsync(
                    candidate =>
                        candidate.MessageId == messageId &&
                        candidate.SubscriptionId == subscriptionId,
                    cancellationToken);
            if (delivery.Status == OutboxDeliveryStatus.Leased)
            {
                expired++;
            }
            if (delivery.AttemptCount >= options.AutomaticAttemptLimit &&
                !string.Equals(
                    delivery.LastFailureCategory,
                    "operator-requeue",
                    StringComparison.Ordinal) &&
                delivery.TryFailAfterAttemptLimit(now))
            {
                exhausted++;
                continue;
            }

            delivery.Lease(
                Guid.CreateVersion7(),
                now,
                options.LeaseDuration);
            claimed.Add(delivery);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        diagnostics.Attempted.Add(claimed.Count);
        diagnostics.LeaseExpired.Add(expired);
        diagnostics.PermanentlyFailed.Add(exhausted);
        return claimed;
    }

    /// <summary>Claims due rows and rehydrates their verified envelopes.</summary>
    public static async Task<IReadOnlyList<ReliableEventDelivery>> ClaimDueEventsAsync(
        DbContext dbContext,
        string schema,
        ReliableEventsProvider provider,
        ReliableEventsOptions options,
        TimeProvider timeProvider,
        ReliableEventsDiagnostics diagnostics,
        CancellationToken cancellationToken = default)
    {
        var deliveries = await ClaimDueAsync(
            dbContext,
            schema,
            provider,
            options,
            timeProvider,
            diagnostics,
            cancellationToken);
        var result = new List<ReliableEventDelivery>(deliveries.Count);
        foreach (var delivery in deliveries)
        {
            var message = await dbContext.Set<OutboxMessage>()
                .SingleAsync(
                    candidate => candidate.MessageId == delivery.MessageId,
                    cancellationToken);
            try
            {
                result.Add(
                    new ReliableEventDelivery(
                        delivery.MessageId,
                        delivery.SubscriptionId,
                        delivery.LeaseId
                            ?? throw new InvalidOperationException(
                                "A claimed delivery must have a fencing token."),
                        message.ToEnvelope(),
                        delivery.AttemptCount));
                diagnostics.CaptureToDeliveryLatency.Record(
                    Math.Max(
                        0,
                        (timeProvider.GetUtcNow() - message.CapturedAtUtc)
                            .TotalSeconds));
            }
            catch (InvalidOperationException)
            {
                if (delivery.LeaseId is not Guid leaseId ||
                    !delivery.TryFail(
                        leaseId,
                        timeProvider.GetUtcNow(),
                        "payload-integrity",
                        "The persisted event envelope failed integrity validation."))
                {
                    throw;
                }

                await dbContext.SaveChangesAsync(cancellationToken);
                diagnostics.PermanentlyFailed.Add(1);
            }
        }

        return result;
    }

    /// <summary>Acknowledges only the current fenced lease.</summary>
    public static async Task<bool> AcknowledgeAsync(
        DbContext dbContext,
        Guid messageId,
        string subscriptionId,
        Guid leaseId,
        TimeProvider timeProvider,
        ReliableEventsDiagnostics diagnostics,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(dbContext);
        ArgumentException.ThrowIfNullOrWhiteSpace(subscriptionId);
        ArgumentNullException.ThrowIfNull(timeProvider);
        ArgumentNullException.ThrowIfNull(diagnostics);
        var normalizedSubscriptionId = subscriptionId.Trim();
        var now = timeProvider.GetUtcNow();
        var affected = await dbContext.Set<OutboxDelivery>()
            .Where(candidate =>
                candidate.MessageId == messageId &&
                candidate.SubscriptionId == normalizedSubscriptionId &&
                candidate.Status == OutboxDeliveryStatus.Leased &&
                candidate.LeaseId == leaseId &&
                candidate.LeaseExpiresAtUtc > now)
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(
                        delivery => delivery.Status,
                        OutboxDeliveryStatus.Delivered)
                    .SetProperty(delivery => delivery.DeliveredAtUtc, now)
                    .SetProperty(delivery => delivery.LeaseId, (Guid?)null)
                    .SetProperty(
                        delivery => delivery.LeaseExpiresAtUtc,
                        (DateTimeOffset?)null)
                    .SetProperty(
                        delivery => delivery.LastFailureCategory,
                        (string?)null)
                    .SetProperty(
                        delivery => delivery.LastFailureDetail,
                        (string?)null),
                cancellationToken);
        DetachTrackedDelivery(dbContext, messageId, normalizedSubscriptionId);
        if (affected == 1)
        {
            diagnostics.Acknowledged.Add(1);
        }
        return affected == 1;
    }

    /// <summary>
    /// Returns a fenced delivery to the pending state for another bounded attempt.
    /// </summary>
    public static async Task<bool> ScheduleRetryAsync(
        DbContext dbContext,
        Guid messageId,
        string subscriptionId,
        Guid leaseId,
        DateTimeOffset nextAttemptAtUtc,
        string failureCategory,
        string? failureDetail,
        ReliableEventsOptions options,
        TimeProvider timeProvider,
        ReliableEventsDiagnostics diagnostics,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(dbContext);
        ArgumentException.ThrowIfNullOrWhiteSpace(subscriptionId);
        ArgumentException.ThrowIfNullOrWhiteSpace(failureCategory);
        ArgumentNullException.ThrowIfNull(options);
        ArgumentNullException.ThrowIfNull(timeProvider);
        ArgumentNullException.ThrowIfNull(diagnostics);
        options.Validate();
        var normalizedSubscriptionId = subscriptionId.Trim();
        ValidateFailure(failureCategory, failureDetail, options);
        var now = timeProvider.GetUtcNow();
        if (nextAttemptAtUtc.Offset != TimeSpan.Zero || nextAttemptAtUtc <= now)
        {
            throw new ArgumentException(
                "The next attempt must be a future UTC time.",
                nameof(nextAttemptAtUtc));
        }

        var affected = await dbContext.Set<OutboxDelivery>()
            .Where(candidate =>
                candidate.MessageId == messageId &&
                candidate.SubscriptionId == normalizedSubscriptionId &&
                candidate.Status == OutboxDeliveryStatus.Leased &&
                candidate.LeaseId == leaseId &&
                candidate.LeaseExpiresAtUtc > now)
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(
                        delivery => delivery.Status,
                        OutboxDeliveryStatus.Pending)
                    .SetProperty(
                        delivery => delivery.NextAttemptAtUtc,
                        nextAttemptAtUtc)
                    .SetProperty(delivery => delivery.LeaseId, (Guid?)null)
                    .SetProperty(
                        delivery => delivery.LeaseExpiresAtUtc,
                        (DateTimeOffset?)null)
                    .SetProperty(
                        delivery => delivery.LastFailureCategory,
                        failureCategory.Trim())
                    .SetProperty(
                        delivery => delivery.LastFailureDetail,
                        failureDetail == null ? null : failureDetail.Trim()),
                cancellationToken);
        DetachTrackedDelivery(dbContext, messageId, normalizedSubscriptionId);
        if (affected == 1)
        {
            diagnostics.Retried.Add(1);
            diagnostics.RetryDelay.Record(
                (nextAttemptAtUtc - now).TotalSeconds);
        }
        return affected == 1;
    }

    /// <summary>Marks a fenced delivery as an observable terminal failure.</summary>
    public static async Task<bool> FailAsync(
        DbContext dbContext,
        Guid messageId,
        string subscriptionId,
        Guid leaseId,
        string failureCategory,
        string? failureDetail,
        ReliableEventsOptions options,
        TimeProvider timeProvider,
        ReliableEventsDiagnostics diagnostics,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(dbContext);
        ArgumentException.ThrowIfNullOrWhiteSpace(subscriptionId);
        ArgumentException.ThrowIfNullOrWhiteSpace(failureCategory);
        ArgumentNullException.ThrowIfNull(options);
        ArgumentNullException.ThrowIfNull(timeProvider);
        ArgumentNullException.ThrowIfNull(diagnostics);
        options.Validate();
        var normalizedSubscriptionId = subscriptionId.Trim();
        ValidateFailure(failureCategory, failureDetail, options);
        var now = timeProvider.GetUtcNow();
        var affected = await dbContext.Set<OutboxDelivery>()
            .Where(candidate =>
                candidate.MessageId == messageId &&
                candidate.SubscriptionId == normalizedSubscriptionId &&
                candidate.Status == OutboxDeliveryStatus.Leased &&
                candidate.LeaseId == leaseId &&
                candidate.LeaseExpiresAtUtc > now)
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(
                        delivery => delivery.Status,
                        OutboxDeliveryStatus.Failed)
                    .SetProperty(delivery => delivery.LeaseId, (Guid?)null)
                    .SetProperty(
                        delivery => delivery.LeaseExpiresAtUtc,
                        (DateTimeOffset?)null)
                    .SetProperty(
                        delivery => delivery.LastFailureCategory,
                        failureCategory.Trim())
                    .SetProperty(
                        delivery => delivery.LastFailureDetail,
                        failureDetail == null ? null : failureDetail.Trim()),
                cancellationToken);
        DetachTrackedDelivery(dbContext, messageId, normalizedSubscriptionId);
        if (affected == 1)
        {
            diagnostics.PermanentlyFailed.Add(1);
        }
        return affected == 1;
    }

    /// <summary>Requeues a terminal delivery without resetting its attempt history.</summary>
    public static async Task<bool> RequeueAsync(
        DbContext dbContext,
        Guid messageId,
        string subscriptionId,
        string reason,
        ReliableEventsOptions options,
        TimeProvider timeProvider,
        ReliableEventsDiagnostics diagnostics,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(dbContext);
        ArgumentException.ThrowIfNullOrWhiteSpace(subscriptionId);
        ArgumentException.ThrowIfNullOrWhiteSpace(reason);
        ArgumentNullException.ThrowIfNull(options);
        ArgumentNullException.ThrowIfNull(timeProvider);
        ArgumentNullException.ThrowIfNull(diagnostics);
        options.Validate();
        var normalizedSubscriptionId = subscriptionId.Trim();
        ValidateFailure("operator-requeue", reason, options);
        var now = timeProvider.GetUtcNow();
        var affected = await dbContext.Set<OutboxDelivery>()
            .Where(candidate =>
                candidate.MessageId == messageId &&
                candidate.SubscriptionId == normalizedSubscriptionId &&
                candidate.Status == OutboxDeliveryStatus.Failed)
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(
                        delivery => delivery.Status,
                        OutboxDeliveryStatus.Pending)
                    .SetProperty(delivery => delivery.NextAttemptAtUtc, now)
                    .SetProperty(delivery => delivery.LastFailureCategory, "operator-requeue")
                    .SetProperty(
                        delivery => delivery.LastFailureDetail,
                        reason.Trim()),
                cancellationToken);
        DetachTrackedDelivery(dbContext, messageId, normalizedSubscriptionId);
        if (affected == 1)
        {
            diagnostics.Replayed.Add(1);
        }

        return affected == 1;
    }

    private static void DetachTrackedDelivery(
        DbContext dbContext,
        Guid messageId,
        string subscriptionId)
    {
        var tracked = dbContext.ChangeTracker
            .Entries<OutboxDelivery>()
            .SingleOrDefault(entry =>
                entry.Entity.MessageId == messageId &&
                entry.Entity.SubscriptionId == subscriptionId);
        if (tracked is not null)
        {
            tracked.State = EntityState.Detached;
        }
    }

    private static void ValidateFailure(
        string category,
        string? detail,
        ReliableEventsOptions options)
    {
        var normalizedCategory = category.Trim();
        var normalizedDetail = detail?.Trim();
        if (normalizedCategory.Length > options.FailureCategoryLimit ||
            normalizedDetail?.Length > options.FailureDetailLimit)
        {
            throw new ArgumentException(
                "Reliable-events failure metadata exceeds its persisted bounds.");
        }
    }

    private static DbCommand CreateClaimCommand(
        DbContext dbContext,
        IDbContextTransaction transaction,
        string schema,
        ReliableEventsProvider provider,
        int batchSize,
        DateTimeOffset now)
    {
        var safeSchema = QuoteSchema(schema);
        var connection = dbContext.Database.GetDbConnection();
        var command = connection.CreateCommand();
        command.Transaction = transaction.GetDbTransaction();
        command.CommandText = provider switch
        {
            ReliableEventsProvider.PostgreSql =>
                $"""
                SELECT d.message_id, d.subscription_id
                FROM {safeSchema}."outbox_deliveries" AS d
                INNER JOIN {safeSchema}."outbox_messages" AS m
                    ON m.message_id = d.message_id
                WHERE (d.status = 'Pending' OR
                    (d.status = 'Leased' AND d.lease_expires_at_utc <= @now))
                    AND d.next_attempt_at_utc <= @now
                ORDER BY d.next_attempt_at_utc, m.captured_at_utc, d.message_id
                LIMIT @batch
                FOR UPDATE SKIP LOCKED
                """,
            ReliableEventsProvider.SqlServer =>
                $"""
                SELECT TOP (@batch) d.message_id, d.subscription_id
                FROM {safeSchema}.[outbox_deliveries] AS d WITH (UPDLOCK, READPAST, READCOMMITTEDLOCK, ROWLOCK)
                INNER JOIN {safeSchema}.[outbox_messages] AS m
                    ON m.message_id = d.message_id
                WHERE (d.status = 'Pending' OR
                    (d.status = 'Leased' AND d.lease_expires_at_utc <= @now))
                    AND d.next_attempt_at_utc <= @now
                ORDER BY d.next_attempt_at_utc, m.captured_at_utc, d.message_id
                """,
            _ => throw new ArgumentOutOfRangeException(nameof(provider)),
        };

        var nowParameter = command.CreateParameter();
        nowParameter.ParameterName = "@now";
        nowParameter.DbType = DbType.DateTimeOffset;
        nowParameter.Value = now;
        command.Parameters.Add(nowParameter);
        var batchParameter = command.CreateParameter();
        batchParameter.ParameterName = "@batch";
        batchParameter.DbType = DbType.Int32;
        batchParameter.Value = batchSize;
        command.Parameters.Add(batchParameter);
        return command;
    }

    private static string QuoteSchema(string schema)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(schema);
        if (schema.Any(character =>
                !(char.IsAsciiLetterOrDigit(character) || character == '_')))
        {
            throw new ArgumentException(
                "A reliable-events schema must be an identifier-safe value.",
                nameof(schema));
        }

        return schema;
    }
}
