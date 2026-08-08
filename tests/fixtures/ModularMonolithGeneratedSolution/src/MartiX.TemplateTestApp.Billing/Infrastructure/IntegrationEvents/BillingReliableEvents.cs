using System.Text.Json;
using OrdersSubmittedEvent =
    MartiX.TemplateTestApp.Orders.Contracts.IntegrationEvents.OrdersSubmittedV1;
using OrdersJsonContext =
    MartiX.TemplateTestApp.Orders.Contracts.IntegrationEvents.OrdersIntegrationEventJsonContext;
using MartiX.TemplateTestApp.Billing.Contracts.IntegrationEvents;
using MartiX.TemplateTestApp.Billing.Domain;
using MartiX.TemplateTestApp.Billing.Infrastructure.Persistence;
using MartiX.Platform.EntityFrameworkCore.ReliableEvents;
using Microsoft.EntityFrameworkCore;

namespace MartiX.TemplateTestApp.Billing.Infrastructure.IntegrationEvents;

internal static class BillingReliableEvents
{
    private static readonly string[] durableTables =
    {
        "outbox_messages",
        "outbox_deliveries",
        "inbox_receipts",
    };

    private static readonly IReadOnlyList<string> activeSubscriptions =
        Array.Empty<string>();

    public static IReadOnlyList<string> ActiveSubscriptions =>
        activeSubscriptions;

    public static void Configure(ModelBuilder modelBuilder)
    {
        _ = durableTables;
        modelBuilder.HasReliableEvents("billing");
    }

    public static ReliableEventsSaveChangesInterceptor CreateInterceptor()
    {
        return new ReliableEventsSaveChangesInterceptor(
            Snapshot,
            Stage,
            Acknowledge);
    }

    public static OutboxMessage CreateSubmittedMessage(
        BillingSubmittedV1 integrationEvent)
    {
        ArgumentNullException.ThrowIfNull(integrationEvent);
        var payload = JsonSerializer.SerializeToUtf8Bytes(
            integrationEvent,
            BillingIntegrationEventJsonContext.Default.BillingSubmittedV1);
        var envelope = ReliableEventEnvelope.Create(
            integrationEvent.EventId,
            BillingSubmittedV1.EventName,
            BillingSubmittedV1.SchemaVersion,
            "Billing",
            integrationEvent.OccurredAtUtc,
            DateTimeOffset.UtcNow,
            payload);
        return OutboxMessage.Create(envelope, activeSubscriptions);
    }

    private static IReadOnlyList<DomainEventCapture> Snapshot(
        DbContext dbContext)
    {
        return dbContext.ChangeTracker
            .Entries<BillingAggregate>()
            .SelectMany(entry => entry.Entity.SnapshotDomainEvents())
            .Select(integrationEvent =>
                DomainEventCapture.Create(
                    integrationEvent,
                    integrationEvent.EventId,
                    integrationEvent.OccurredAtUtc))
            .ToArray();
    }

    private static IReadOnlyList<OutboxMessage> Stage(
        DbContext dbContext,
        IReadOnlyList<DomainEventCapture> captures)
    {
        _ = dbContext;
        return captures
            .Select(capture => capture.Event switch
            {
                BillingSubmittedV1 integrationEvent =>
                    CreateSubmittedMessage(integrationEvent),
                _ => throw new InvalidOperationException(
                    "An unregistered Billing domain event cannot cross the integration seam."),
            })
            .ToArray();
    }

    private static void Acknowledge(
        DbContext dbContext,
        IReadOnlyList<DomainEventCapture> captures)
    {
        foreach (var entry in dbContext.ChangeTracker
                     .Entries<BillingAggregate>())
        {
            var acknowledgedEvents = entry.Entity
                .SnapshotDomainEvents()
                .Where(integrationEvent =>
                    captures.Any(capture =>
                        ReferenceEquals(capture.Event, integrationEvent)))
                .ToArray();
            if (acknowledgedEvents.Length > 0)
            {
                entry.Entity.AcknowledgeDomainEvents(acknowledgedEvents);
            }
        }
    }

    public static Task<ReliableEventDeliveryOutcome> ConsumeOrdersSubmittedAsync(
        BillingDbContext dbContext,
        ReliableEventEnvelope envelope,
        TimeProvider timeProvider,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(dbContext);
        ArgumentNullException.ThrowIfNull(envelope);
        ArgumentNullException.ThrowIfNull(timeProvider);
        if (!string.Equals(
                envelope.EventName,
                OrdersSubmittedEvent.EventName,
                StringComparison.Ordinal) ||
            envelope.SchemaVersion != OrdersSubmittedEvent.SchemaVersion ||
            !string.Equals(
                envelope.Publisher,
                "Orders",
                StringComparison.Ordinal))
        {
            return Task.FromResult(ReliableEventDeliveryOutcome.PermanentFailure);
        }

        return ReliableEventsInboxExecutor.ExecuteAsync(
            dbContext,
            "Billing",
            envelope,
            static async (context, consumedEnvelope, token) =>
            {
                token.ThrowIfCancellationRequested();
                var integrationEvent = JsonSerializer.Deserialize(
                    consumedEnvelope.Payload.Span,
                    OrdersJsonContext.Default.OrdersSubmittedV1);
                if (integrationEvent is null)
                {
                    throw new InvalidOperationException(
                        "The Orders integration event payload was empty.");
                }

                var aggregate = await context.Set<BillingAggregate>()
                    .SingleOrDefaultAsync(
                        candidate => candidate.Name == "Billing",
                        token);
                if (aggregate is null)
                {
                    aggregate = new BillingAggregate();
                    context.Set<BillingAggregate>().Add(aggregate);
                }

                aggregate.RecordSubmitted(integrationEvent.EventId);
                return Task.CompletedTask;
            },
            timeProvider,
            cancellationToken);
    }
}
