using System.Globalization;
using System.Text;

namespace MartiX.MailKitSmtpTestApp.Notifications;

public enum NotificationDeliveryIntentStatus
{
    Pending = 1,
    Accepted = 2,
    TransientFailure = 3,
    PermanentFailure = 4,
    Cancelled = 5
}

public sealed class NotificationDeliveryIntent
{
    private const int MaxAttachmentReferences = 8;
    private const int MaxBodyBytes = 1_000_000;
    private const int MaxIdentifierLength = 200;

    private NotificationDeliveryIntent()
    {
    }

    private NotificationDeliveryIntent(
        Guid id,
        string recipient,
        string subject,
        string body,
        string culture,
        string attachmentReferences,
        string idempotencyKey,
        string? correlationId,
        DateTimeOffset createdAtUtc)
    {
        Id = id;
        Recipient = recipient;
        Subject = subject;
        Body = body;
        Culture = culture;
        AttachmentReferences = attachmentReferences;
        IdempotencyKey = idempotencyKey;
        CorrelationId = correlationId;
        CreatedAtUtc = createdAtUtc;
        Status = NotificationDeliveryIntentStatus.Pending;
        NextAttemptAtUtc = createdAtUtc;
    }

    public Guid Id { get; private set; }

    public string Recipient { get; private set; } = string.Empty;

    public string Subject { get; private set; } = string.Empty;

    public string Body { get; private set; } = string.Empty;

    public string Culture { get; private set; } = string.Empty;

    public string AttachmentReferences { get; private set; } = string.Empty;

    public string IdempotencyKey { get; private set; } = string.Empty;

    public string? CorrelationId { get; private set; }

    public NotificationDeliveryIntentStatus Status { get; private set; }

    public int AttemptCount { get; private set; }

    public DateTimeOffset CreatedAtUtc { get; private set; }

    public DateTimeOffset? NextAttemptAtUtc { get; private set; }

    public DateTimeOffset? AcceptedAtUtc { get; private set; }

    public string? LastFailureClass { get; private set; }

    public IReadOnlyList<string> AttachmentReferenceValues =>
        AttachmentReferences.Length == 0
            ? Array.Empty<string>()
            : AttachmentReferences.Split(
                '\n',
                StringSplitOptions.RemoveEmptyEntries |
                StringSplitOptions.TrimEntries);

    public int EstimatedMessageSizeBytes =>
        Encoding.UTF8.GetByteCount(Subject) + Encoding.UTF8.GetByteCount(Body);

    public static NotificationDeliveryIntent Create(
        string recipient,
        string subject,
        string body,
        string culture,
        IEnumerable<string> attachmentReferences,
        string idempotencyKey,
        string? correlationId = null,
        DateTimeOffset? createdAtUtc = null)
    {
        ValidateRecipient(recipient);
        ValidateRequiredText(subject, nameof(subject), 998);
        ValidateRequiredText(body, nameof(body), MaxBodyBytes);
        ValidateRequiredText(idempotencyKey, nameof(idempotencyKey), MaxIdentifierLength);
        ValidateOptionalText(correlationId, nameof(correlationId), MaxIdentifierLength);

        var normalizedCulture = ValidateCulture(culture);
        var references = attachmentReferences?.ToArray()
            ?? throw new ArgumentNullException(nameof(attachmentReferences));
        if (references.Length > MaxAttachmentReferences)
        {
            throw new ArgumentOutOfRangeException(
                nameof(attachmentReferences),
                $"At most {MaxAttachmentReferences} attachment references are allowed.");
        }

        foreach (var reference in references)
        {
            ValidateRequiredText(reference, nameof(attachmentReferences), 200);
        }

        var intent = new NotificationDeliveryIntent(
            Guid.CreateVersion7(),
            recipient.Trim(),
            subject.Trim(),
            body,
            normalizedCulture,
            string.Join('\n', references.Select(reference => reference.Trim())),
            idempotencyKey.Trim(),
            correlationId?.Trim(),
            createdAtUtc ?? DateTimeOffset.UtcNow);

        if (intent.EstimatedMessageSizeBytes > MaxBodyBytes)
        {
            throw new ArgumentOutOfRangeException(
                nameof(body),
                $"The composed message must not exceed {MaxBodyBytes} UTF-8 bytes.");
        }

        return intent;
    }

    public bool TryBeginAttempt(DateTimeOffset nowUtc)
    {
        if (
            Status is not
                (NotificationDeliveryIntentStatus.Pending
                or NotificationDeliveryIntentStatus.TransientFailure)
            || NextAttemptAtUtc > nowUtc)
        {
            return false;
        }

        AttemptCount++;
        NextAttemptAtUtc = null;
        return true;
    }

    public void MarkAccepted(DateTimeOffset acceptedAtUtc)
    {
        EnsureDeliverable();
        Status = NotificationDeliveryIntentStatus.Accepted;
        AcceptedAtUtc = acceptedAtUtc;
        NextAttemptAtUtc = null;
        LastFailureClass = null;
    }

    public void MarkTransientFailure(string failureClass, DateTimeOffset retryAtUtc)
    {
        EnsureDeliverable();
        LastFailureClass = NormalizeFailureClass(failureClass);
        Status = NotificationDeliveryIntentStatus.TransientFailure;
        NextAttemptAtUtc = retryAtUtc;
    }

    public void MarkPermanentFailure(string failureClass)
    {
        EnsureDeliverable();
        LastFailureClass = NormalizeFailureClass(failureClass);
        Status = NotificationDeliveryIntentStatus.PermanentFailure;
        NextAttemptAtUtc = null;
    }

    public void MarkCancelled()
    {
        EnsureDeliverable();
        Status = NotificationDeliveryIntentStatus.Cancelled;
        NextAttemptAtUtc = null;
    }

    public void Requeue(DateTimeOffset nowUtc)
    {
        if (
            Status is not
                (NotificationDeliveryIntentStatus.Cancelled
                or NotificationDeliveryIntentStatus.PermanentFailure
                or NotificationDeliveryIntentStatus.TransientFailure))
        {
            throw new InvalidOperationException(
                "Only a cancelled or failed notification intent can be requeued.");
        }

        Status = NotificationDeliveryIntentStatus.Pending;
        NextAttemptAtUtc = nowUtc;
        LastFailureClass = null;
    }

    private static void ValidateRecipient(string value)
    {
        ValidateRequiredText(value, nameof(Recipient), 320);
        var trimmed = value.Trim();
        var at = trimmed.IndexOf('@');
        if (
            at <= 0
            || at != trimmed.LastIndexOf('@')
            || at == trimmed.Length - 1
            || trimmed.Any(char.IsWhiteSpace)
            || trimmed.Any(char.IsControl))
        {
            throw new ArgumentException("The recipient must be a single valid email address.", nameof(value));
        }
    }

    private static string ValidateCulture(string value)
    {
        ValidateRequiredText(value, nameof(Culture), 20);
        try
        {
            return CultureInfo.GetCultureInfo(value.Trim()).Name;
        }
        catch (CultureNotFoundException exception)
        {
            throw new ArgumentException("The culture must be a valid BCP 47 name.", nameof(value), exception);
        }
    }

    private static void ValidateRequiredText(string value, string name, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Length > maxLength || value.Any(char.IsControl))
        {
            throw new ArgumentException($"The {name} value is empty, too long, or contains control characters.", name);
        }
    }

    private static void ValidateOptionalText(string? value, string name, int maxLength)
    {
        if (value is not null)
        {
            ValidateRequiredText(value, name, maxLength);
        }
    }

    private static string NormalizeFailureClass(string value)
    {
        ValidateRequiredText(value, nameof(value), 80);
        return value.Trim().ToLowerInvariant();
    }

    private void EnsureDeliverable()
    {
        if (
            Status is not
                (NotificationDeliveryIntentStatus.Pending
                or NotificationDeliveryIntentStatus.TransientFailure))
        {
            throw new InvalidOperationException(
                $"Notification intent {Id} is not deliverable in status {Status}.");
        }
    }
}
