using System;
using System.Text.Json;
using MartiX.Platform.EntityFrameworkCore.ReliableEvents;

namespace MartiX.Platform.IntegrationEvents.RabbitMq;

internal static class RabbitMqEnvelopeSerializer
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
    };

    public static byte[] Serialize(ReliableEventDelivery delivery)
    {
        ArgumentNullException.ThrowIfNull(delivery);
        if (delivery.LeaseId == Guid.Empty)
        {
            throw new InvalidOperationException(
                "RabbitMQ cannot publish a delivery without a fencing token.");
        }

        return JsonSerializer.SerializeToUtf8Bytes(
            new WireMessage(
                delivery.MessageId,
                delivery.SubscriptionId,
                delivery.LeaseId,
                delivery.Envelope.MessageId,
                delivery.Envelope.EventName,
                delivery.Envelope.SchemaVersion,
                delivery.Envelope.Publisher,
                delivery.Envelope.OccurredAtUtc,
                delivery.Envelope.CapturedAtUtc,
                delivery.Envelope.CorrelationId,
                delivery.Envelope.CausationId,
                delivery.Envelope.ActorId,
                delivery.Envelope.TraceParent,
                delivery.Envelope.ContentType,
                delivery.Envelope.Payload.ToArray(),
                delivery.Envelope.PayloadFingerprint,
                delivery.Attempt),
            JsonOptions);
    }

    public static ReliableEventDelivery Deserialize(ReadOnlyMemory<byte> body)
    {
        var message = JsonSerializer.Deserialize<WireMessage>(body.Span, JsonOptions)
            ?? throw new InvalidOperationException(
                "RabbitMQ delivered an empty reliable-event envelope.");
        if (message.LeaseId == Guid.Empty ||
            message.MessageId == Guid.Empty ||
            message.EnvelopeMessageId == Guid.Empty ||
            message.MessageId != message.EnvelopeMessageId)
        {
            throw new InvalidOperationException(
                "RabbitMQ delivered an invalid reliable-event identity.");
        }
        if (message.Payload is null)
        {
            throw new InvalidOperationException(
                "RabbitMQ delivered a reliable-event envelope without a payload.");
        }
        if (message.Attempt <= 0)
        {
            throw new InvalidOperationException(
                "RabbitMQ delivered an invalid reliable-event attempt.");
        }

        var envelope = ReliableEventEnvelope.Rehydrate(
            message.EnvelopeMessageId,
            message.EventName,
            message.SchemaVersion,
            message.Publisher,
            message.OccurredAtUtc,
            message.CapturedAtUtc,
            message.Payload,
            message.PayloadFingerprint,
            message.CorrelationId,
            message.CausationId,
            message.ActorId,
            message.TraceParent,
            message.ContentType);
        return new ReliableEventDelivery(
            message.MessageId,
            message.SubscriptionId,
            message.LeaseId,
            envelope,
            message.Attempt);
    }

    private sealed record WireMessage(
        Guid MessageId,
        string SubscriptionId,
        Guid LeaseId,
        Guid EnvelopeMessageId,
        string EventName,
        int SchemaVersion,
        string Publisher,
        DateTimeOffset OccurredAtUtc,
        DateTimeOffset CapturedAtUtc,
        string? CorrelationId,
        Guid? CausationId,
        string? ActorId,
        string? TraceParent,
        string ContentType,
        byte[] Payload,
        string PayloadFingerprint,
        int Attempt);
}
