using MartiX.FullStackTestApp.Orders.Contracts.IntegrationEvents;
using MartiX.Platform.EntityFrameworkCore.EntityTimestamps;
using MartiX.Platform.EntityFrameworkCore.ReliableEvents;

namespace MartiX.FullStackTestApp.Orders.Domain;

internal sealed class OrdersAggregate :
    IHasEntityTimestamps,
    IHasConcurrencyToken
{
    public Guid Id { get; private set; } = Guid.NewGuid();

    public string Name { get; private set; } = "Orders";

    public DateTimeOffset CreatedAt { get; private set; }

    public DateTimeOffset UpdatedAt { get; private set; }

    public Guid ConcurrencyToken { get; private set; } = Guid.NewGuid();

    private readonly DomainEventCollection<OrdersSubmittedV1> domainEvents =
        new(static domainEvent => domainEvent.EventId);

    public void RaiseSubmitted(DateTimeOffset occurredAtUtc)
    {
        domainEvents.Add(
            new OrdersSubmittedV1(
                Guid.CreateVersion7(),
                Id,
                occurredAtUtc));
    }

    public void RecordSubmitted(Guid eventId)
    {
        if (eventId == Guid.Empty)
        {
            throw new ArgumentException(
                "A submitted event requires a non-empty event ID.",
                nameof(eventId));
        }

        ConcurrencyToken = eventId;
    }

    internal IReadOnlyList<OrdersSubmittedV1> SnapshotDomainEvents() =>
        domainEvents.Snapshot();

    internal void AcknowledgeDomainEvents(
        IReadOnlyList<OrdersSubmittedV1> events)
    {
        domainEvents.Acknowledge(events);
    }
}
