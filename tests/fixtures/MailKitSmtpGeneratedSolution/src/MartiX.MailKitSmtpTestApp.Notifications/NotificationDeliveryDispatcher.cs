using System.Diagnostics;
using System.Diagnostics.Metrics;
using Microsoft.EntityFrameworkCore;

namespace MartiX.MailKitSmtpTestApp.Notifications;

public sealed class NotificationDeliveryDbContext(
    DbContextOptions<NotificationDeliveryDbContext> options) : DbContext(options)
{
    public DbSet<NotificationDeliveryIntent> NotificationDeliveryIntents =>
        Set<NotificationDeliveryIntent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var intent = modelBuilder.Entity<NotificationDeliveryIntent>();
        intent.HasKey(candidate => candidate.Id);
        intent.HasIndex(candidate => candidate.IdempotencyKey).IsUnique();
        intent.Property(candidate => candidate.Recipient).HasMaxLength(320).IsRequired();
        intent.Property(candidate => candidate.Subject).HasMaxLength(998).IsRequired();
        intent.Property(candidate => candidate.Body).IsRequired();
        intent.Property(candidate => candidate.Culture).HasMaxLength(20).IsRequired();
        intent.Property(candidate => candidate.AttachmentReferences).IsRequired();
        intent.Property(candidate => candidate.IdempotencyKey).HasMaxLength(200).IsRequired();
        intent.Property(candidate => candidate.CorrelationId).HasMaxLength(200);
        intent.Property(candidate => candidate.Status).HasConversion<string>().HasMaxLength(32);
        intent.Property(candidate => candidate.LastFailureClass).HasMaxLength(80);
    }
}

public sealed class NotificationDeliveryDispatcher
{
    private static readonly Meter Meter = new(
        "MartiX.MailKitSmtp.NotificationDelivery",
        "0.1.0");
    private static readonly Counter<long> AcceptedCounter =
        Meter.CreateCounter<long>("notification_delivery_accepted");
    private static readonly Counter<long> TransientCounter =
        Meter.CreateCounter<long>("notification_delivery_transient_failure");
    private static readonly Counter<long> PermanentCounter =
        Meter.CreateCounter<long>("notification_delivery_permanent_failure");
    private static readonly Counter<long> CancelledCounter =
        Meter.CreateCounter<long>("notification_delivery_cancelled");
    private static readonly Histogram<double> Latency =
        Meter.CreateHistogram<double>("notification_delivery_latency_ms");

    private readonly NotificationDeliveryDbContext _db;
    private readonly INotificationDeliveryAdapter _adapter;
    private readonly SmtpDeliveryOptions _options;
    private readonly TimeProvider _clock;

    public NotificationDeliveryDispatcher(
        NotificationDeliveryDbContext db,
        INotificationDeliveryAdapter adapter,
        SmtpDeliveryOptions options,
        TimeProvider? clock = null)
    {
        _db = db;
        _adapter = adapter;
        _options = options;
        _clock = clock ?? TimeProvider.System;
    }

    public async Task<Guid> EnqueueAsync(
        NotificationDeliveryIntent intent,
        CancellationToken cancellationToken)
    {
        _db.NotificationDeliveryIntents.Add(intent);
        await _db.SaveChangesAsync(cancellationToken);
        return intent.Id;
    }

    public async Task<SmtpDeliveryResult> DeliverAsync(
        Guid intentId,
        CancellationToken cancellationToken)
    {
        var intent = await _db.NotificationDeliveryIntents
            .SingleOrDefaultAsync(candidate => candidate.Id == intentId, cancellationToken)
            ?? throw new InvalidOperationException($"Notification intent {intentId} was not found.");
        var now = _clock.GetUtcNow();
        if (!intent.TryBeginAttempt(now))
        {
            throw new InvalidOperationException(
                $"Notification intent {intentId} is not ready for delivery.");
        }

        await _db.SaveChangesAsync(cancellationToken);
        var stopwatch = Stopwatch.StartNew();
        SmtpDeliveryResult result;
        try
        {
            result = await _adapter.DeliverAsync(intent, cancellationToken);
        }
        catch (OperationCanceledException)
        {
            result = SmtpDeliveryResult.Cancelled();
        }

        switch (result.Outcome)
        {
            case SmtpDeliveryOutcome.Accepted:
                intent.MarkAccepted(_clock.GetUtcNow());
                AcceptedCounter.Add(1);
                break;
            case SmtpDeliveryOutcome.TransientFailure:
                if (intent.AttemptCount >= _options.AutomaticAttemptLimit)
                {
                    intent.MarkPermanentFailure("automatic-attempt-limit");
                    PermanentCounter.Add(1);
                }
                else
                {
                    intent.MarkTransientFailure(
                        result.FailureClass ?? "smtp-transient",
                        _clock.GetUtcNow() + _options.GetRetryDelay(intent.AttemptCount));
                    TransientCounter.Add(1);
                }
                break;
            case SmtpDeliveryOutcome.PermanentFailure:
                intent.MarkPermanentFailure(result.FailureClass ?? "smtp-permanent");
                PermanentCounter.Add(1);
                break;
            case SmtpDeliveryOutcome.Cancelled:
                CancelledCounter.Add(1);
                Latency.Record(stopwatch.Elapsed.TotalMilliseconds);
                return result;
            default:
                throw new InvalidOperationException("Unknown SMTP delivery outcome.");
        }

        Latency.Record(stopwatch.Elapsed.TotalMilliseconds);
        await _db.SaveChangesAsync(CancellationToken.None);
        return result;
    }

    public async Task RequeueAsync(Guid intentId, CancellationToken cancellationToken)
    {
        var intent = await _db.NotificationDeliveryIntents
            .SingleOrDefaultAsync(candidate => candidate.Id == intentId, cancellationToken)
            ?? throw new InvalidOperationException($"Notification intent {intentId} was not found.");
        intent.Requeue(_clock.GetUtcNow());
        await _db.SaveChangesAsync(cancellationToken);
    }

    public static string Redact(string? value) =>
        value is null ? "<none>" : $"<redacted:{value.Length}>";
}
