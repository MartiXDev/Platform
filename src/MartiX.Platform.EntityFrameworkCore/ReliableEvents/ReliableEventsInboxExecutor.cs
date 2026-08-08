using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;

namespace MartiX.Platform.EntityFrameworkCore.ReliableEvents;

/// <summary>Semantic result of an Inbox-backed delivery.</summary>
public enum ReliableEventDeliveryOutcome
{
    /// <summary>The consumer transaction committed.</summary>
    Acknowledged = 1,

    /// <summary>A matching receipt proved a duplicate delivery.</summary>
    DuplicateSuppressed = 2,

    /// <summary>The delivery can be retried.</summary>
    TransientFailure = 3,

    /// <summary>The delivery must enter terminal failure.</summary>
    PermanentFailure = 4,

    /// <summary>Shutdown cancelled the operation before acknowledgement.</summary>
    Cancelled = 5,
}

/// <summary>
/// Executes one consumer operation with an atomic Inbox Receipt transaction.
/// </summary>
public static class ReliableEventsInboxExecutor
{
    /// <summary>
    /// Inserts the receipt, runs the operation, saves its effects, and commits
    /// them together. A matching concurrent receipt is acknowledged as a duplicate.
    /// </summary>
    public static async Task<ReliableEventDeliveryOutcome> ExecuteAsync(
        DbContext dbContext,
        string subscriptionId,
        ReliableEventEnvelope envelope,
        Func<
            DbContext,
            ReliableEventEnvelope,
            CancellationToken,
            Task> operation,
        TimeProvider timeProvider,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(dbContext);
        ArgumentException.ThrowIfNullOrWhiteSpace(subscriptionId);
        ArgumentNullException.ThrowIfNull(envelope);
        ArgumentNullException.ThrowIfNull(operation);
        ArgumentNullException.ThrowIfNull(timeProvider);
        var normalizedSubscriptionId = subscriptionId.Trim();

        await using var transaction =
            await dbContext.Database.BeginTransactionAsync(cancellationToken);
        var existing = await dbContext.Set<InboxReceipt>()
            .SingleOrDefaultAsync(
                receipt =>
                    receipt.SubscriptionId == normalizedSubscriptionId &&
                    receipt.MessageId == envelope.MessageId,
                cancellationToken);
        if (existing is not null)
        {
            if (!existing.Matches(envelope))
            {
                await transaction.RollbackAsync(cancellationToken);
                ReliableEventsDiagnostics.PermanentlyFailed.Add(1);
                return ReliableEventDeliveryOutcome.PermanentFailure;
            }

            await transaction.RollbackAsync(cancellationToken);
            ReliableEventsDiagnostics.DuplicateSuppressed.Add(1);
            return ReliableEventDeliveryOutcome.DuplicateSuppressed;
        }

        var receipt = InboxReceipt.Create(
            normalizedSubscriptionId,
            envelope,
            timeProvider.GetUtcNow());
        dbContext.Set<InboxReceipt>().Add(receipt);
        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            dbContext.Entry(receipt).State = EntityState.Detached;
            await transaction.RollbackAsync(cancellationToken);
            var concurrentReceipt = await dbContext.Set<InboxReceipt>()
                .SingleOrDefaultAsync(
                    receipt =>
                        receipt.SubscriptionId == normalizedSubscriptionId &&
                        receipt.MessageId == envelope.MessageId,
                    cancellationToken);
            if (concurrentReceipt?.Matches(envelope) == true)
            {
                ReliableEventsDiagnostics.DuplicateSuppressed.Add(1);
                return ReliableEventDeliveryOutcome.DuplicateSuppressed;
            }

            throw;
        }

        await operation(dbContext, envelope, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return ReliableEventDeliveryOutcome.Acknowledged;
    }
}
