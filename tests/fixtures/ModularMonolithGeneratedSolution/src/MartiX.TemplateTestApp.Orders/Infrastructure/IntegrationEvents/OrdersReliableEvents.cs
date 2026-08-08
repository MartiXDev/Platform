using System.Text.Json;
using MartiX.TemplateTestApp.Orders.Contracts.IntegrationEvents;
using MartiX.TemplateTestApp.Orders.Domain;
using MartiX.TemplateTestApp.Orders.Infrastructure.Persistence;
using MartiX.Platform.EntityFrameworkCore.ReliableEvents;
using Microsoft.EntityFrameworkCore;

namespace MartiX.TemplateTestApp.Orders.Infrastructure.IntegrationEvents;

internal static class OrdersReliableEvents
{
    private static readonly IReadOnlyList<string> activeSubscriptions =
        Array.AsReadOnly(new[] { "Billing" });

    public static IReadOnlyList<string> ActiveSubscriptions =>
        activeSubscriptions;

    public static void Configure(ModelBuilder modelBuilder)
    {
        modelBuilder.HasReliableEvents("orders");
    }

    public static ReliableEventsSaveChangesInterceptor CreateInterceptor(
        ReliableEventsDiagnostics diagnostics)
    {
        return new ReliableEventsSaveChangesInterceptor(
            Snapshot,
            Stage,
            Acknowledge,
            diagnostics);
    }

    public static OutboxMessage CreateSubmittedMessage(
        OrdersSubmittedV1 integrationEvent)
    {
        ArgumentNullException.ThrowIfNull(integrationEvent);
        var payload = JsonSerializer.SerializeToUtf8Bytes(
            integrationEvent,
            OrdersIntegrationEventJsonContext.Default.OrdersSubmittedV1);
        var envelope = ReliableEventEnvelope.Create(
            integrationEvent.EventId,
            OrdersSubmittedV1.EventName,
            OrdersSubmittedV1.SchemaVersion,
            "Orders",
            integrationEvent.OccurredAtUtc,
            DateTimeOffset.UtcNow,
            payload);
        return OutboxMessage.Create(envelope, activeSubscriptions);
    }

    private static IReadOnlyList<DomainEventCapture> Snapshot(
        DbContext dbContext)
    {
        return dbContext.ChangeTracker
            .Entries<OrdersAggregate>()
            .SelectMany(entry => entry.Entity.SnapshotDomainEvents())
            .Select(integrationEvent =>
                DomainEventCapture.Create(
                    integrationEvent,
                    integrationEvent.EventId,
                    integrationEvent.OccurredAtUtc))
            .ToArray();
    }

    private static IReadOnlyList<OutboxMessage> Stage(
        DbContext _,
        IReadOnlyList<DomainEventCapture> captures)
    {
        return captures
            .Select(capture => capture.Event switch
            {
                OrdersSubmittedV1 integrationEvent =>
                    CreateSubmittedMessage(integrationEvent),
                _ => throw new InvalidOperationException(
                    "An unregistered Orders domain event cannot cross the integration seam."),
            })
            .ToArray();
    }

    private static void Acknowledge(
        DbContext dbContext,
        IReadOnlyList<DomainEventCapture> captures)
    {
        foreach (var entry in dbContext.ChangeTracker
                     .Entries<OrdersAggregate>())
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
}
