using System;
using System.Security.Cryptography;

namespace MartiX.Platform.EntityFrameworkCore.ReliableEvents;

/// <summary>
/// Immutable, versioned, serialized integration-event transport envelope.
/// </summary>
public sealed class ReliableEventEnvelope
{
    /// <summary>The initial hard payload limit for durable event messages.</summary>
    public const int PayloadLimitBytes = 256 * 1024;

    private ReliableEventEnvelope(
        Guid messageId,
        string eventName,
        int schemaVersion,
        string publisher,
        DateTimeOffset occurredAtUtc,
        DateTimeOffset capturedAtUtc,
        string? correlationId,
        Guid? causationId,
        string? actorId,
        string? traceParent,
        string contentType,
        byte[] payload,
        string payloadFingerprint)
    {
        MessageId = messageId;
        EventName = eventName;
        SchemaVersion = schemaVersion;
        Publisher = publisher;
        OccurredAtUtc = occurredAtUtc;
        CapturedAtUtc = capturedAtUtc;
        CorrelationId = correlationId;
        CausationId = causationId;
        ActorId = actorId;
        TraceParent = traceParent;
        ContentType = contentType;
        Payload = payload;
        PayloadLength = payload.Length;
        PayloadFingerprint = payloadFingerprint;
    }

    /// <summary>Gets the stable message identity.</summary>
    public Guid MessageId { get; }

    /// <summary>Gets the canonical semantic event name.</summary>
    public string EventName { get; }

    /// <summary>Gets the positive major schema version.</summary>
    public int SchemaVersion { get; }

    /// <summary>Gets the publishing module identity.</summary>
    public string Publisher { get; }

    /// <summary>Gets the UTC occurrence time supplied by the domain event.</summary>
    public DateTimeOffset OccurredAtUtc { get; }

    /// <summary>Gets the UTC capture time supplied by the persistence pipeline.</summary>
    public DateTimeOffset CapturedAtUtc { get; }

    /// <summary>Gets the optional bounded correlation identifier.</summary>
    public string? CorrelationId { get; }

    /// <summary>Gets the optional causating message identifier.</summary>
    public Guid? CausationId { get; }

    /// <summary>Gets the optional provider-independent actor identifier.</summary>
    public string? ActorId { get; }

    /// <summary>Gets the optional bounded W3C trace-parent value.</summary>
    public string? TraceParent { get; }

    /// <summary>Gets the content type of the UTF-8 payload.</summary>
    public string ContentType { get; }

    /// <summary>Gets the read-only UTF-8 payload.</summary>
    public ReadOnlyMemory<byte> Payload { get; }

    /// <summary>Gets the payload length in bytes.</summary>
    public int PayloadLength { get; }

    /// <summary>Gets the lowercase SHA-256 payload fingerprint.</summary>
    public string PayloadFingerprint { get; }

    /// <summary>Creates and validates an immutable envelope.</summary>
    public static ReliableEventEnvelope Create(
        Guid messageId,
        string eventName,
        int schemaVersion,
        string publisher,
        DateTimeOffset occurredAtUtc,
        DateTimeOffset capturedAtUtc,
        ReadOnlySpan<byte> payload,
        string? correlationId = null,
        Guid? causationId = null,
        string? actorId = null,
        string? traceParent = null,
        string contentType = "application/json")
    {
        if (messageId == Guid.Empty)
        {
            throw new ArgumentException(
                "An integration event message ID is required.",
                nameof(messageId));
        }
        ArgumentException.ThrowIfNullOrWhiteSpace(eventName);
        ArgumentException.ThrowIfNullOrWhiteSpace(publisher);
        ArgumentException.ThrowIfNullOrWhiteSpace(contentType);
        if (schemaVersion <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(schemaVersion));
        }
        if (causationId == Guid.Empty)
        {
            throw new ArgumentException(
                "A causation ID must be non-empty when supplied.",
                nameof(causationId));
        }
        if (payload.Length > PayloadLimitBytes)
        {
            throw new ArgumentOutOfRangeException(
                nameof(payload),
                payload.Length,
                $"Integration event payloads cannot exceed {PayloadLimitBytes} bytes.");
        }

        var occurredAt = RequireUtc(occurredAtUtc, nameof(occurredAtUtc));
        var capturedAt = RequireUtc(capturedAtUtc, nameof(capturedAtUtc));
        var normalizedEventName = RequireBounded(eventName, nameof(eventName), 200);
        var normalizedPublisher = RequireBounded(publisher, nameof(publisher), 200);
        var normalizedContentType = RequireBounded(contentType, nameof(contentType), 100);
        var normalizedCorrelationId = NormalizeOptional(correlationId, nameof(correlationId), 200);
        var normalizedActorId = NormalizeOptional(actorId, nameof(actorId), 200);
        var normalizedTraceParent = NormalizeOptional(traceParent, nameof(traceParent), 200);
        var payloadCopy = payload.ToArray();
        var fingerprint = Convert.ToHexString(SHA256.HashData(payloadCopy))
            .ToLowerInvariant();

        return new ReliableEventEnvelope(
            messageId,
            normalizedEventName,
            schemaVersion,
            normalizedPublisher,
            occurredAt,
            capturedAt,
            normalizedCorrelationId,
            causationId,
            normalizedActorId,
            normalizedTraceParent,
            normalizedContentType,
            payloadCopy,
            fingerprint);
    }

    /// <summary>
    /// Rehydrates a persisted envelope and verifies its stored payload fingerprint.
    /// </summary>
    public static ReliableEventEnvelope Rehydrate(
        Guid messageId,
        string eventName,
        int schemaVersion,
        string publisher,
        DateTimeOffset occurredAtUtc,
        DateTimeOffset capturedAtUtc,
        ReadOnlySpan<byte> payload,
        string payloadFingerprint,
        string? correlationId = null,
        Guid? causationId = null,
        string? actorId = null,
        string? traceParent = null,
        string contentType = "application/json")
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(payloadFingerprint);
        var envelope = Create(
            messageId,
            eventName,
            schemaVersion,
            publisher,
            occurredAtUtc,
            capturedAtUtc,
            payload,
            correlationId,
            causationId,
            actorId,
            traceParent,
            contentType);
        if (!string.Equals(
                envelope.PayloadFingerprint,
                payloadFingerprint,
                StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "The persisted reliable-event payload fingerprint does not match its payload.");
        }

        return envelope;
    }

    /// <summary>Returns whether an envelope has the supplied integrity identity.</summary>
    public bool HasIdentity(
        string eventName,
        int schemaVersion,
        string publisher,
        string payloadFingerprint)
    {
        return string.Equals(EventName, eventName, StringComparison.Ordinal) &&
            SchemaVersion == schemaVersion &&
            string.Equals(Publisher, publisher, StringComparison.Ordinal) &&
            string.Equals(
                PayloadFingerprint,
                payloadFingerprint,
                StringComparison.OrdinalIgnoreCase);
    }

    private static DateTimeOffset RequireUtc(DateTimeOffset value, string parameterName)
    {
        if (value.Offset != TimeSpan.Zero)
        {
            throw new ArgumentException(
                "Reliable event timestamps must use UTC.",
                parameterName);
        }

        return value;
    }

    private static string RequireBounded(string value, string parameterName, int maximumLength)
    {
        var normalized = value.Trim();
        if (normalized.Length == 0 || normalized.Length > maximumLength)
        {
            throw new ArgumentException(
                $"The value must contain between 1 and {maximumLength} characters.",
                parameterName);
        }

        return normalized;
    }

    private static string? NormalizeOptional(
        string? value,
        string parameterName,
        int maximumLength)
    {
        return value is null
            ? null
            : RequireBounded(value, parameterName, maximumLength);
    }
}
