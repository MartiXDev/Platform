using System;
using System.Threading;
using System.Threading.Tasks;

namespace MartiX.Platform.EntityFrameworkCore.ReliableEvents;

/// <summary>
/// Provider-neutral transport boundary for leased reliable-event deliveries.
/// </summary>
/// <remarks>
/// Implementations publish the leased delivery identity and invoke the supplied
/// handler before acknowledging their provider delivery. Durable Outbox and
/// Inbox state remains authoritative for acknowledgement and recovery.
/// </remarks>
public interface IReliableEventsTransport
{
    /// <summary>Publishes one leased delivery with provider durability.</summary>
    ValueTask PublishAsync(
        ReliableEventDelivery delivery,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Runs the provider consumer until cancellation or an unrecoverable
    /// provider failure.
    /// </summary>
    Task ConsumeAsync(
        Func<
            ReliableEventDelivery,
            CancellationToken,
            ValueTask<ReliableEventDeliveryOutcome>> handler,
        CancellationToken cancellationToken = default);
}
