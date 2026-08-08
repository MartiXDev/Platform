using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;

namespace MartiX.Platform.EntityFrameworkCore.ReliableEvents;

/// <summary>Bounded cleanup for terminal reliable-events records.</summary>
public static class ReliableEventsRetention
{
    /// <summary>
    /// Deletes only delivered rows and Inbox Receipts past their configured
    /// replay horizon; failed rows and referenced Messages remain durable.
    /// </summary>
    public static async Task<int> CleanupAsync(
        DbContext dbContext,
        ReliableEventsOptions options,
        TimeProvider timeProvider,
        int batchSize,
        ReliableEventsDiagnostics diagnostics,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(dbContext);
        ArgumentNullException.ThrowIfNull(options);
        ArgumentNullException.ThrowIfNull(timeProvider);
        ArgumentNullException.ThrowIfNull(diagnostics);
        if (batchSize <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(batchSize));
        }
        options.Validate();

        var now = timeProvider.GetUtcNow();
        var deliveryCutoff = now - options.OutboxRetention;
        var inboxCutoff = now - options.InboxReceiptRetention;
        await using var transaction =
            await dbContext.Database.BeginTransactionAsync(cancellationToken);
        var oldDeliveries = await dbContext.Set<OutboxDelivery>()
            .Where(delivery =>
                delivery.Status == OutboxDeliveryStatus.Delivered &&
                delivery.DeliveredAtUtc < deliveryCutoff)
            .OrderBy(delivery => delivery.DeliveredAtUtc)
            .Take(batchSize)
            .ToListAsync(cancellationToken);
        dbContext.Set<OutboxDelivery>().RemoveRange(oldDeliveries);

        var oldReceipts = await dbContext.Set<InboxReceipt>()
            .Where(receipt => receipt.CompletedAtUtc < inboxCutoff)
            .OrderBy(receipt => receipt.CompletedAtUtc)
            .Take(batchSize)
            .ToListAsync(cancellationToken);
        dbContext.Set<InboxReceipt>().RemoveRange(oldReceipts);
        await dbContext.SaveChangesAsync(cancellationToken);

        var orphanedMessages = await dbContext.Set<OutboxMessage>()
            .Where(message =>
                message.CapturedAtUtc < deliveryCutoff &&
                !message.Deliveries.Any())
            .OrderBy(message => message.CapturedAtUtc)
            .Take(batchSize)
            .ToListAsync(cancellationToken);
        dbContext.Set<OutboxMessage>().RemoveRange(orphanedMessages);
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        var cleaned = oldDeliveries.Count + oldReceipts.Count + orphanedMessages.Count;
        diagnostics.Cleaned.Add(cleaned);
        return cleaned;
    }
}
