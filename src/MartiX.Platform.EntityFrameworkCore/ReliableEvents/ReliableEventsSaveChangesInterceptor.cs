using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace MartiX.Platform.EntityFrameworkCore.ReliableEvents;

/// <summary>One explicit domain-event snapshot supplied by a Business Module.</summary>
public sealed record DomainEventCapture(
    object Event,
    Guid EventId,
    DateTimeOffset OccurredAtUtc)
{
    /// <summary>Creates and validates a domain-event capture.</summary>
    public static DomainEventCapture Create(
        object domainEvent,
        Guid eventId,
        DateTimeOffset occurredAtUtc)
    {
        ArgumentNullException.ThrowIfNull(domainEvent);
        if (eventId == Guid.Empty)
        {
            throw new ArgumentException(
                "A domain event capture requires an event ID.",
                nameof(eventId));
        }
        if (occurredAtUtc.Offset != TimeSpan.Zero)
        {
            throw new ArgumentException(
                "Domain event capture times must use UTC.",
                nameof(occurredAtUtc));
        }

        return new DomainEventCapture(domainEvent, eventId, occurredAtUtc);
    }
}

/// <summary>
/// Captures explicitly mapped module events before SaveChanges and acknowledges
/// the exact snapshot only after EF reports a successful commit.
/// </summary>
public sealed class ReliableEventsSaveChangesInterceptor : SaveChangesInterceptor
{
    private readonly Func<DbContext, IReadOnlyList<DomainEventCapture>> snapshot;
    private readonly Func<
        DbContext,
        IReadOnlyList<DomainEventCapture>,
        IReadOnlyList<OutboxMessage>> stage;
    private readonly Action<DbContext, IReadOnlyList<DomainEventCapture>> acknowledge;
    private readonly ReliableEventsDiagnostics diagnostics;
    private readonly ConditionalWeakTable<DbContext, PendingCapture> pending = new();

    /// <summary>Initializes the module-owned event capture pipeline.</summary>
    public ReliableEventsSaveChangesInterceptor(
        Func<DbContext, IReadOnlyList<DomainEventCapture>> snapshot,
        Func<
            DbContext,
            IReadOnlyList<DomainEventCapture>,
            IReadOnlyList<OutboxMessage>> stage,
        Action<DbContext, IReadOnlyList<DomainEventCapture>> acknowledge,
        ReliableEventsDiagnostics diagnostics)
    {
        ArgumentNullException.ThrowIfNull(snapshot);
        ArgumentNullException.ThrowIfNull(stage);
        ArgumentNullException.ThrowIfNull(acknowledge);
        ArgumentNullException.ThrowIfNull(diagnostics);
        this.snapshot = snapshot;
        this.stage = stage;
        this.acknowledge = acknowledge;
        this.diagnostics = diagnostics;
    }

    /// <inheritdoc />
    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData,
        InterceptionResult<int> result)
    {
        Prepare(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    /// <inheritdoc />
    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        Prepare(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    /// <inheritdoc />
    public override int SavedChanges(
        SaveChangesCompletedEventData eventData,
        int result)
    {
        Acknowledge(eventData.Context);
        return base.SavedChanges(eventData, result);
    }

    /// <inheritdoc />
    public override ValueTask<int> SavedChangesAsync(
        SaveChangesCompletedEventData eventData,
        int result,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        Acknowledge(eventData.Context);
        return base.SavedChangesAsync(eventData, result, cancellationToken);
    }

    /// <inheritdoc />
    public override void SaveChangesFailed(DbContextErrorEventData eventData)
    {
        DiscardPending(eventData.Context);
        base.SaveChangesFailed(eventData);
    }

    /// <inheritdoc />
    public override Task SaveChangesFailedAsync(
        DbContextErrorEventData eventData,
        CancellationToken cancellationToken = default)
    {
        DiscardPending(eventData.Context);
        return base.SaveChangesFailedAsync(eventData, cancellationToken);
    }

    /// <inheritdoc />
    public override void SaveChangesCanceled(DbContextEventData eventData)
    {
        DiscardPending(eventData.Context);
        base.SaveChangesCanceled(eventData);
    }

    /// <inheritdoc />
    public override Task SaveChangesCanceledAsync(
        DbContextEventData eventData,
        CancellationToken cancellationToken = default)
    {
        DiscardPending(eventData.Context);
        return base.SaveChangesCanceledAsync(eventData, cancellationToken);
    }

    private void Prepare(DbContext? context)
    {
        if (context is null || pending.TryGetValue(context, out _))
        {
            return;
        }

        var captures = snapshot(context);
        ArgumentNullException.ThrowIfNull(captures);
        if (captures.Count == 0)
        {
            return;
        }

        var messages = stage(context, captures);
        ArgumentNullException.ThrowIfNull(messages);
        if (messages.Any(message => message is null))
        {
            throw new InvalidOperationException(
                "Reliable-events capture cannot stage a null Outbox Message.");
        }

        foreach (var message in messages)
        {
            context.Set<OutboxMessage>().Add(message);
        }

        diagnostics.Captured.Add(messages.Count);
        pending.Add(context, new PendingCapture(captures, messages));
    }

    private void Acknowledge(DbContext? context)
    {
        if (context is null || !pending.TryGetValue(context, out var capture))
        {
            return;
        }

        acknowledge(context, capture.Events);
        pending.Remove(context);
    }

    private void DiscardPending(DbContext? context)
    {
        if (context is null || !pending.TryGetValue(context, out var capture))
        {
            return;
        }

        var messageIds = capture.Messages
            .Select(message => message.MessageId)
            .ToHashSet();
        foreach (var entry in context.ChangeTracker
                     .Entries<OutboxDelivery>()
                     .Where(entry => messageIds.Contains(entry.Entity.MessageId))
                     .ToArray())
        {
            if (entry.State == EntityState.Added)
            {
                entry.State = EntityState.Detached;
            }
        }

        foreach (var message in capture.Messages)
        {
            var entry = context.Entry(message);
            if (entry.State == EntityState.Added)
            {
                entry.State = EntityState.Detached;
            }
        }

        pending.Remove(context);
    }

    private sealed record PendingCapture(
        IReadOnlyList<DomainEventCapture> Events,
        IReadOnlyList<OutboxMessage> Messages);
}
