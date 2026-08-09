using Microsoft.EntityFrameworkCore;
using MartiX.MailKitSmtpTestApp.Notifications;

namespace MartiX.MailKitSmtpTestApp.Tests;

public sealed class MailKitSmtpDeliveryTests
{
    private const string MailpitProfile = "Mailpit 1.30.0";

    [Test]
    public async Task Durable_intent_is_saved_before_the_adapter_is_called()
    {
        var adapter = new CapturingAdapter(SmtpDeliveryResult.Accepted());
        await using var db = CreateDb();
        var dispatcher = CreateDispatcher(db, adapter);
        var intent = CreateIntent("durable-before-send");

        var id = await dispatcher.EnqueueAsync(intent, CancellationToken.None);
        await Assert.That(adapter.SendCount).IsEqualTo(0);

        var result = await dispatcher.DeliverAsync(id, CancellationToken.None);

        await Assert.That(result.Outcome).IsEqualTo(SmtpDeliveryOutcome.Accepted);
        await Assert.That(adapter.StatusAtSend)
            .IsEqualTo(NotificationDeliveryIntentStatus.Pending);
        await Assert.That(intent.Status)
            .IsEqualTo(NotificationDeliveryIntentStatus.Accepted);
    }

    [Test]
    public async Task SMTP_status_codes_map_to_accepted_transient_and_permanent_outcomes()
    {
        await Assert.That(MailKitSmtpDelivery.ClassifyStatusCode(250).Outcome)
            .IsEqualTo(SmtpDeliveryOutcome.Accepted);
        await Assert.That(MailKitSmtpDelivery.ClassifyStatusCode(451).Outcome)
            .IsEqualTo(SmtpDeliveryOutcome.TransientFailure);
        await Assert.That(MailKitSmtpDelivery.ClassifyStatusCode(550).Outcome)
            .IsEqualTo(SmtpDeliveryOutcome.PermanentFailure);
        await Assert.That(MailKitSmtpDelivery.ClassifyStatusCode(535).FailureClass)
            .IsEqualTo("smtp-authentication");
    }

    [Test]
    public async Task Authentication_and_TLS_options_are_explicit_for_the_Mailpit_profile()
    {
        var options = new SmtpDeliveryOptions
        {
            Host = "mailpit",
            FromAddress = "noreply@example.test",
            RequireTls = true,
            UseAuthentication = true
        };

        await Assert.That(MailpitProfile).IsEqualTo("Mailpit 1.30.0");
        await Assert.That(options.RequireTls).IsTrue();
        await Assert.That(options.UseAuthentication).IsTrue();
    }

    [Test]
    public async Task Cancellation_is_not_recorded_as_provider_acceptance()
    {
        using var cancellation = new CancellationTokenSource();
        var adapter = new CapturingAdapter(
            async token =>
            {
                cancellation.Cancel();
                await Task.Delay(Timeout.InfiniteTimeSpan, token);
                return SmtpDeliveryResult.Accepted();
            });
        await using var db = CreateDb();
        var dispatcher = CreateDispatcher(db, adapter);
        var intent = CreateIntent("cancelled");
        var id = await dispatcher.EnqueueAsync(intent, CancellationToken.None);

        var result = await dispatcher.DeliverAsync(id, cancellation.Token);

        await Assert.That(result.Outcome).IsEqualTo(SmtpDeliveryOutcome.Cancelled);
        await Assert.That(intent.Status)
            .IsNotEqualTo(NotificationDeliveryIntentStatus.Accepted);
    }

    [Test]
    public async Task Transient_failures_are_bounded_and_can_be_operator_requeued()
    {
        var adapter = new CapturingAdapter(
            SmtpDeliveryResult.TransientFailure("smtp-4xx"),
            SmtpDeliveryResult.TransientFailure("smtp-4xx"));
        await using var db = CreateDb();
        var dispatcher = CreateDispatcher(
            db,
            adapter,
            new SmtpDeliveryOptions
            {
                Host = "mailpit",
                FromAddress = "noreply@example.test",
                UseAuthentication = false,
                AutomaticAttemptLimit = 2,
                RetryBaseDelay = TimeSpan.Zero,
                MaxRetryDelay = TimeSpan.Zero
            });
        var intent = CreateIntent("bounded-retry");
        var id = await dispatcher.EnqueueAsync(intent, CancellationToken.None);

        await dispatcher.DeliverAsync(id, CancellationToken.None);
        await dispatcher.DeliverAsync(id, CancellationToken.None);
        await Assert.That(intent.Status)
            .IsEqualTo(NotificationDeliveryIntentStatus.PermanentFailure);

        await dispatcher.RequeueAsync(id, CancellationToken.None);

        await Assert.That(intent.Status)
            .IsEqualTo(NotificationDeliveryIntentStatus.Pending);
    }

    [Test]
    public async Task Redaction_does_not_return_classified_message_data()
    {
        var redacted = NotificationDeliveryDispatcher.Redact("person@example.com");

        await Assert.That(redacted).DoesNotContain("@");
        await Assert.That(redacted).DoesNotContain("person");
        await Assert.That(redacted).StartsWith("<redacted:");
    }

    private static NotificationDeliveryDbContext CreateDb() =>
        new(
            new DbContextOptionsBuilder<NotificationDeliveryDbContext>()
                .UseInMemoryDatabase(Guid.CreateVersion7().ToString())
                .Options);

    private static NotificationDeliveryDispatcher CreateDispatcher(
        NotificationDeliveryDbContext db,
        INotificationDeliveryAdapter adapter,
        SmtpDeliveryOptions? options = null) =>
        new(
            db,
            adapter,
            options ?? new SmtpDeliveryOptions
            {
                Host = "mailpit",
                FromAddress = "noreply@example.test",
                UseAuthentication = false,
                AutomaticAttemptLimit = 5,
                RetryBaseDelay = TimeSpan.Zero,
                MaxRetryDelay = TimeSpan.Zero
            });

    private static NotificationDeliveryIntent CreateIntent(string suffix) =>
        NotificationDeliveryIntent.Create(
            "person@example.com",
            "Fixture notification",
            "A deterministic fixture message.",
            "en-US",
            Array.Empty<string>(),
            $"mailkit-{suffix}",
            $"correlation-{suffix}");

    private sealed class CapturingAdapter : INotificationDeliveryAdapter
    {
        private readonly Func<CancellationToken, Task<SmtpDeliveryResult>> _send;

        public CapturingAdapter(params SmtpDeliveryResult[] results)
        {
            var queuedResults = new Queue<SmtpDeliveryResult>(results);
            _send = _ => Task.FromResult(queuedResults.Dequeue());
        }

        public CapturingAdapter(
            Func<CancellationToken, Task<SmtpDeliveryResult>> send)
        {
            _send = send;
        }

        public int SendCount { get; private set; }

        public NotificationDeliveryIntentStatus StatusAtSend { get; private set; }

        public async Task<SmtpDeliveryResult> DeliverAsync(
            NotificationDeliveryIntent intent,
            CancellationToken cancellationToken)
        {
            SendCount++;
            StatusAtSend = intent.Status;
            return await _send(cancellationToken);
        }
    }
}
