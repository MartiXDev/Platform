using MartiX.TemplateTestApp.Billing.Contracts.IntegrationEvents;
using MartiX.Platform.EntityFrameworkCore.EntityTimestamps;
using MartiX.Platform.EntityFrameworkCore.ReliableEvents;

namespace MartiX.TemplateTestApp.Billing.Domain;

internal sealed class BillingAggregate :
    IHasEntityTimestamps,
    IHasConcurrencyToken
{
    public Guid Id { get; private set; } = Guid.NewGuid();

    public string Name { get; private set; } = "Billing";

    public DateTimeOffset CreatedAt { get; private set; }

    public DateTimeOffset UpdatedAt { get; private set; }

    public Guid ConcurrencyToken { get; private set; } = Guid.NewGuid();

    private readonly DomainEventCollection<BillingSubmittedV1> domainEvents =
        new(static domainEvent => domainEvent.EventId);

    public void RaiseSubmitted(DateTimeOffset occurredAtUtc)
    {
        domainEvents.Add(
            new BillingSubmittedV1(
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

    internal IReadOnlyList<BillingSubmittedV1> SnapshotDomainEvents() =>
        domainEvents.Snapshot();

    internal void AcknowledgeDomainEvents(
        IReadOnlyList<BillingSubmittedV1> events)
    {
        domainEvents.Acknowledge(events);
    }
}
