using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;

namespace MartiX.Platform.EntityFrameworkCore.ReliableEvents;

/// <summary>
/// Ordered, idempotent staging for a module-owned aggregate's domain events.
/// </summary>
/// <typeparam name="TEvent">The module-owned domain event type.</typeparam>
public sealed class DomainEventCollection<TEvent>
    where TEvent : class
{
    private readonly Func<TEvent, Guid> eventIdSelector;
    private readonly List<TEvent> events = new();
    private readonly HashSet<Guid> eventIds = new();

    /// <summary>Initializes a collection with its explicit event identity policy.</summary>
    /// <param name="eventIdSelector">The selector for the application-assigned event ID.</param>
    public DomainEventCollection(Func<TEvent, Guid> eventIdSelector)
    {
        ArgumentNullException.ThrowIfNull(eventIdSelector);
        this.eventIdSelector = eventIdSelector;
    }

    /// <summary>Stages one event unless the same event ID is already staged.</summary>
    /// <param name="domainEvent">The immutable event to stage.</param>
    public void Add(TEvent domainEvent)
    {
        ArgumentNullException.ThrowIfNull(domainEvent);
        var eventId = eventIdSelector(domainEvent);
        if (eventId == Guid.Empty)
        {
            throw new ArgumentException(
                "A domain event must have a non-empty event ID.",
                nameof(domainEvent));
        }

        if (eventIds.Add(eventId))
        {
            events.Add(domainEvent);
        }
    }

    /// <summary>Returns a read-only snapshot in raised order.</summary>
    /// <returns>An immutable snapshot of currently staged events.</returns>
    public IReadOnlyList<TEvent> Snapshot()
    {
        return new ReadOnlyCollection<TEvent>(events.ToArray());
    }

    /// <summary>
    /// Acknowledges exactly a previously captured snapshot after its save succeeds.
    /// </summary>
    /// <param name="snapshot">The snapshot whose events were persisted.</param>
    public void Acknowledge(IReadOnlyList<TEvent> snapshot)
    {
        ArgumentNullException.ThrowIfNull(snapshot);
        var snapshotIds = snapshot
            .Select(eventIdSelector)
            .ToHashSet();
        if (snapshotIds.Count != snapshot.Count)
        {
            throw new InvalidOperationException(
                "A domain event snapshot contains duplicate event IDs.");
        }

        if (snapshotIds.Any(eventId => !eventIds.Contains(eventId)))
        {
            throw new InvalidOperationException(
                "Only events from this collection can be acknowledged.");
        }
        if (snapshot.Any(snapshotEvent =>
                !events.Any(currentEvent => ReferenceEquals(currentEvent, snapshotEvent))))
        {
            throw new InvalidOperationException(
                "Only the captured event instances can be acknowledged.");
        }

        events.RemoveAll(domainEvent => snapshotIds.Contains(eventIdSelector(domainEvent)));
        foreach (var eventId in snapshotIds)
        {
            eventIds.Remove(eventId);
        }
    }
}
