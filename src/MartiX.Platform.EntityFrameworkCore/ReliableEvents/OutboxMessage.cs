using System;
using System.Collections.Generic;
using System.Linq;

namespace MartiX.Platform.EntityFrameworkCore.ReliableEvents;

/// <summary>Durable state for an independent fan-out delivery.</summary>
public enum OutboxDeliveryStatus
{
    /// <summary>The delivery is due for a lease.</summary>
    Pending = 1,

    /// <summary>The delivery is owned by a lease holder.</summary>
    Leased = 2,

    /// <summary>The consumer acknowledged the delivery.</summary>
    Delivered = 3,

    /// <summary>The delivery reached an observable terminal failure.</summary>
    Failed = 4,
}

/// <summary>
/// Immutable persisted event envelope state. Delivery state is kept separately.
/// </summary>
public sealed class OutboxMessage
{
    private readonly List<OutboxDelivery> deliveries = new();
    private byte[] payload = Array.Empty<byte>();

    private OutboxMessage()
    {
    }

    /// <summary>Gets the stable message identity.</summary>
    public Guid MessageId { get; private set; }

    /// <summary>Gets the canonical event name.</summary>
    public string EventName { get; private set; } = string.Empty;

    /// <summary>Gets the positive event schema version.</summary>
    public int SchemaVersion { get; private set; }

    /// <summary>Gets the publishing module.</summary>
    public string Publisher { get; private set; } = string.Empty;

    /// <summary>Gets the UTC domain occurrence time.</summary>
    public DateTimeOffset OccurredAtUtc { get; private set; }

    /// <summary>Gets the UTC capture time.</summary>
    public DateTimeOffset CapturedAtUtc { get; private set; }

    /// <summary>Gets the optional correlation identifier.</summary>
    public string? CorrelationId { get; private set; }

    /// <summary>Gets the optional causation message identifier.</summary>
    public Guid? CausationId { get; private set; }

    /// <summary>Gets the optional actor identifier.</summary>
    public string? ActorId { get; private set; }

    /// <summary>Gets the optional trace parent.</summary>
    public string? TraceParent { get; private set; }

    /// <summary>Gets the payload content type.</summary>
    public string ContentType { get; private set; } = string.Empty;

    /// <summary>Gets the immutable UTF-8 payload bytes.</summary>
    public byte[] Payload
    {
        get => payload.ToArray();
        private set => payload = value ?? throw new ArgumentNullException(nameof(value));
    }

    /// <summary>Gets the payload byte length.</summary>
    public int PayloadLength { get; private set; }

    /// <summary>Gets the payload SHA-256 fingerprint.</summary>
    public string PayloadFingerprint { get; private set; } = string.Empty;

    /// <summary>Gets the independent fan-out delivery rows.</summary>
    public IReadOnlyCollection<OutboxDelivery> Deliveries => deliveries;

    /// <summary>Rehydrates the immutable transport envelope for delivery.</summary>
    public ReliableEventEnvelope ToEnvelope()
    {
        var persistedPayload = Payload;
        if (PayloadLength != persistedPayload.Length)
        {
            throw new InvalidOperationException(
                "The persisted reliable-event payload length does not match its payload.");
        }

        return ReliableEventEnvelope.Rehydrate(
            MessageId,
            EventName,
            SchemaVersion,
            Publisher,
            OccurredAtUtc,
            CapturedAtUtc,
            persistedPayload,
            PayloadFingerprint,
            CorrelationId,
            CausationId,
            ActorId,
            TraceParent,
            ContentType);
    }

    /// <summary>Creates one immutable message and its captured subscriptions.</summary>
    public static OutboxMessage Create(
        ReliableEventEnvelope envelope,
        IEnumerable<string> subscriptionIds)
    {
        ArgumentNullException.ThrowIfNull(envelope);
        ArgumentNullException.ThrowIfNull(subscriptionIds);

        var subscriptions = subscriptionIds
            .Select(subscription => RequireSubscription(subscription))
            .Distinct(StringComparer.Ordinal)
            .ToArray();
        var message = new OutboxMessage
        {
            MessageId = envelope.MessageId,
            EventName = envelope.EventName,
            SchemaVersion = envelope.SchemaVersion,
            Publisher = envelope.Publisher,
            OccurredAtUtc = envelope.OccurredAtUtc,
            CapturedAtUtc = envelope.CapturedAtUtc,
            CorrelationId = envelope.CorrelationId,
            CausationId = envelope.CausationId,
            ActorId = envelope.ActorId,
            TraceParent = envelope.TraceParent,
            ContentType = envelope.ContentType,
            Payload = envelope.Payload.ToArray(),
            PayloadLength = envelope.PayloadLength,
            PayloadFingerprint = envelope.PayloadFingerprint,
        };
        foreach (var subscription in subscriptions)
        {
            message.deliveries.Add(
                OutboxDelivery.Create(message.MessageId, subscription, envelope.CapturedAtUtc));
        }

        return message;
    }

    private static string RequireSubscription(string value)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(value);
        var normalized = value.Trim();
        if (normalized.Length > 200)
        {
            throw new ArgumentException(
                "Subscription identifiers cannot exceed 200 characters.",
                nameof(value));
        }

        return normalized;
    }
}

/// <summary>One fenced, independently retryable delivery attempt.</summary>
public sealed class OutboxDelivery
{
    private const int FailureCategoryMaximumLength = 200;
    private const int FailureDetailMaximumLength = 1000;

    private OutboxDelivery()
    {
    }

    private OutboxDelivery(
        Guid messageId,
        string subscriptionId,
        DateTimeOffset capturedAtUtc)
    {
        MessageId = messageId;
        SubscriptionId = subscriptionId;
        NextAttemptAtUtc = capturedAtUtc;
        Status = OutboxDeliveryStatus.Pending;
    }

    /// <summary>Gets the immutable message identity.</summary>
    public Guid MessageId { get; private set; }

    /// <summary>Gets the stable subscription identity.</summary>
    public string SubscriptionId { get; private set; } = string.Empty;

    /// <summary>Gets the current durable state.</summary>
    public OutboxDeliveryStatus Status { get; private set; }

    /// <summary>Gets the cumulative automatic attempt count.</summary>
    public int AttemptCount { get; private set; }

    /// <summary>Gets the next UTC time at which a claim may occur.</summary>
    public DateTimeOffset NextAttemptAtUtc { get; private set; }

    /// <summary>Gets the current opaque fencing token.</summary>
    public Guid? LeaseId { get; private set; }

    /// <summary>Gets the UTC lease expiry.</summary>
    public DateTimeOffset? LeaseExpiresAtUtc { get; private set; }

    /// <summary>Gets the UTC acknowledgement time.</summary>
    public DateTimeOffset? DeliveredAtUtc { get; private set; }

    /// <summary>Gets the bounded sanitized failure category.</summary>
    public string? LastFailureCategory { get; private set; }

    /// <summary>Gets the bounded sanitized failure detail.</summary>
    public string? LastFailureDetail { get; private set; }

    /// <summary>Creates a pending delivery row for one subscription.</summary>
    public static OutboxDelivery Create(
        Guid messageId,
        string subscriptionId,
        DateTimeOffset capturedAtUtc)
    {
        if (messageId == Guid.Empty)
        {
            throw new ArgumentException(
                "A delivery requires a message ID.",
                nameof(messageId));
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(subscriptionId);
        if (capturedAtUtc.Offset != TimeSpan.Zero)
        {
            throw new ArgumentException(
                "Delivery timestamps must use UTC.",
                nameof(capturedAtUtc));
        }

        return new OutboxDelivery(
            messageId,
            subscriptionId.Trim(),
            capturedAtUtc);
    }

    /// <summary>Claims a due row with a new fencing token.</summary>
    public void Lease(Guid leaseId, DateTimeOffset nowUtc, TimeSpan leaseDuration)
    {
        if (leaseId == Guid.Empty)
        {
            throw new ArgumentException(
                "A lease requires a non-empty fencing token.",
                nameof(leaseId));
        }
        if (nowUtc.Offset != TimeSpan.Zero)
        {
            throw new ArgumentException("Lease time must use UTC.", nameof(nowUtc));
        }
        if (leaseDuration <= TimeSpan.Zero)
        {
            throw new ArgumentOutOfRangeException(nameof(leaseDuration));
        }
        if (Status is OutboxDeliveryStatus.Delivered or OutboxDeliveryStatus.Failed)
        {
            throw new InvalidOperationException(
                "Terminal deliveries cannot be leased.");
        }
        if (Status == OutboxDeliveryStatus.Leased &&
            LeaseExpiresAtUtc > nowUtc)
        {
            throw new InvalidOperationException(
                "A delivery with an active lease cannot be claimed.");
        }

        Status = OutboxDeliveryStatus.Leased;
        AttemptCount++;
        LeaseId = leaseId;
        LeaseExpiresAtUtc = nowUtc.Add(leaseDuration);
        NextAttemptAtUtc = nowUtc;
        if (string.Equals(
                LastFailureCategory,
                "operator-requeue",
                StringComparison.Ordinal))
        {
            LastFailureCategory = null;
            LastFailureDetail = null;
        }
    }

    /// <summary>Acknowledges a delivery only when its lease still fences it.</summary>
    public bool TryAcknowledge(Guid leaseId, DateTimeOffset nowUtc)
    {
        if (!OwnsLease(leaseId, nowUtc))
        {
            return false;
        }

        Status = OutboxDeliveryStatus.Delivered;
        DeliveredAtUtc = nowUtc;
        LeaseId = null;
        LeaseExpiresAtUtc = null;
        LastFailureCategory = null;
        LastFailureDetail = null;
        return true;
    }

    /// <summary>Schedules a bounded retry only when its lease still fences it.</summary>
    public bool TryScheduleRetry(
        Guid leaseId,
        DateTimeOffset nowUtc,
        DateTimeOffset nextAttemptAtUtc,
        string failureCategory,
        string? failureDetail)
    {
        if (!OwnsLease(leaseId, nowUtc))
        {
            return false;
        }
        if (nextAttemptAtUtc.Offset != TimeSpan.Zero ||
            nextAttemptAtUtc <= nowUtc)
        {
            throw new ArgumentException(
                "The next attempt must be a future UTC time.",
                nameof(nextAttemptAtUtc));
        }

        Status = OutboxDeliveryStatus.Pending;
        NextAttemptAtUtc = nextAttemptAtUtc;
        LeaseId = null;
        LeaseExpiresAtUtc = null;
        SetFailure(failureCategory, failureDetail);
        return true;
    }

    /// <summary>Marks a delivery terminally failed with its lease fence.</summary>
    public bool TryFail(
        Guid leaseId,
        DateTimeOffset nowUtc,
        string failureCategory,
        string? failureDetail)
    {
        if (!OwnsLease(leaseId, nowUtc))
        {
            return false;
        }

        Status = OutboxDeliveryStatus.Failed;
        LeaseId = null;
        LeaseExpiresAtUtc = null;
        SetFailure(failureCategory, failureDetail);
        return true;
    }

    /// <summary>Closes due work that exhausted its automatic attempt budget.</summary>
    public bool TryFailAfterAttemptLimit(
        DateTimeOffset nowUtc,
        string failureCategory = "automatic-attempt-limit",
        string? failureDetail = "The automatic delivery attempt limit was reached.")
    {
        if (nowUtc.Offset != TimeSpan.Zero ||
            Status is OutboxDeliveryStatus.Delivered or OutboxDeliveryStatus.Failed ||
            (Status == OutboxDeliveryStatus.Leased &&
             LeaseExpiresAtUtc > nowUtc))
        {
            return false;
        }

        Status = OutboxDeliveryStatus.Failed;
        LeaseId = null;
        LeaseExpiresAtUtc = null;
        SetFailure(failureCategory, failureDetail);
        return true;
    }

    private bool OwnsLease(Guid leaseId, DateTimeOffset nowUtc)
    {
        return leaseId != Guid.Empty &&
            nowUtc.Offset == TimeSpan.Zero &&
            Status == OutboxDeliveryStatus.Leased &&
            LeaseId == leaseId &&
            LeaseExpiresAtUtc > nowUtc;
    }

    private void SetFailure(string failureCategory, string? failureDetail)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(failureCategory);
        var normalizedCategory = failureCategory.Trim();
        if (normalizedCategory.Length > FailureCategoryMaximumLength)
        {
            throw new ArgumentException(
                $"Failure categories cannot exceed {FailureCategoryMaximumLength} characters.",
                nameof(failureCategory));
        }

        var normalizedDetail = failureDetail?.Trim();
        if (normalizedDetail?.Length > FailureDetailMaximumLength)
        {
            throw new ArgumentException(
                $"Failure details cannot exceed {FailureDetailMaximumLength} characters.",
                nameof(failureDetail));
        }

        LastFailureCategory = normalizedCategory;
        LastFailureDetail = normalizedDetail;
    }
}

/// <summary>One consumer-side deduplication receipt.</summary>
public sealed class InboxReceipt
{
    private InboxReceipt()
    {
    }

    /// <summary>Gets the stable subscription identity.</summary>
    public string SubscriptionId { get; private set; } = string.Empty;

    /// <summary>Gets the stable message identity.</summary>
    public Guid MessageId { get; private set; }

    /// <summary>Gets the event name captured by the receipt.</summary>
    public string EventName { get; private set; } = string.Empty;

    /// <summary>Gets the publishing module captured by the receipt.</summary>
    public string Publisher { get; private set; } = string.Empty;

    /// <summary>Gets the event schema version captured by the receipt.</summary>
    public int SchemaVersion { get; private set; }

    /// <summary>Gets the payload fingerprint captured by the receipt.</summary>
    public string PayloadFingerprint { get; private set; } = string.Empty;

    /// <summary>Gets the UTC completion time.</summary>
    public DateTimeOffset CompletedAtUtc { get; private set; }

    /// <summary>Creates a receipt for an envelope in the consumer transaction.</summary>
    public static InboxReceipt Create(
        string subscriptionId,
        ReliableEventEnvelope envelope,
        DateTimeOffset completedAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(subscriptionId);
        ArgumentNullException.ThrowIfNull(envelope);
        var normalizedSubscription = subscriptionId.Trim();
        if (normalizedSubscription.Length > 200)
        {
            throw new ArgumentException(
                "Subscription identifiers cannot exceed 200 characters.",
                nameof(subscriptionId));
        }
        if (completedAtUtc.Offset != TimeSpan.Zero)
        {
            throw new ArgumentException(
                "Inbox receipt times must use UTC.",
                nameof(completedAtUtc));
        }

        return new InboxReceipt
        {
            SubscriptionId = normalizedSubscription,
            MessageId = envelope.MessageId,
            EventName = envelope.EventName,
            Publisher = envelope.Publisher,
            SchemaVersion = envelope.SchemaVersion,
            PayloadFingerprint = envelope.PayloadFingerprint,
            CompletedAtUtc = completedAtUtc,
        };
    }

    /// <summary>Checks whether a receipt proves the same event identity.</summary>
    public bool Matches(ReliableEventEnvelope envelope)
    {
        ArgumentNullException.ThrowIfNull(envelope);
        return MessageId == envelope.MessageId &&
            string.Equals(EventName, envelope.EventName, StringComparison.Ordinal) &&
            string.Equals(Publisher, envelope.Publisher, StringComparison.Ordinal) &&
            SchemaVersion == envelope.SchemaVersion &&
            string.Equals(
                PayloadFingerprint,
                envelope.PayloadFingerprint,
                StringComparison.OrdinalIgnoreCase);
    }
}
