using System.IO;
using System.Net.Sockets;
using System.Security.Authentication;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace MartiX.MailKitSmtpTestApp.Notifications;

public enum SmtpDeliveryOutcome
{
    Accepted = 1,
    TransientFailure = 2,
    PermanentFailure = 3,
    Cancelled = 4
}

public sealed record SmtpDeliveryResult(
    SmtpDeliveryOutcome Outcome,
    string? FailureClass = null)
{
    public static SmtpDeliveryResult Accepted() =>
        new(SmtpDeliveryOutcome.Accepted);

    public static SmtpDeliveryResult TransientFailure(string failureClass) =>
        new(SmtpDeliveryOutcome.TransientFailure, failureClass);

    public static SmtpDeliveryResult PermanentFailure(string failureClass) =>
        new(SmtpDeliveryOutcome.PermanentFailure, failureClass);

    public static SmtpDeliveryResult Cancelled() =>
        new(SmtpDeliveryOutcome.Cancelled);
}

public sealed record NotificationAttachment(
    string FileName,
    string ContentType,
    byte[] Content);

public interface INotificationAttachmentSource
{
    ValueTask<NotificationAttachment> ReadAsync(
        string reference,
        CancellationToken cancellationToken);
}

public interface INotificationDeliveryAdapter
{
    Task<SmtpDeliveryResult> DeliverAsync(
        NotificationDeliveryIntent intent,
        CancellationToken cancellationToken);
}

public sealed class MailKitSmtpDelivery : INotificationDeliveryAdapter
{
    private readonly SmtpDeliveryOptions _options;
    private readonly INotificationAttachmentSource? _attachmentSource;

    public MailKitSmtpDelivery(
        SmtpDeliveryOptions options,
        INotificationAttachmentSource? attachmentSource = null)
    {
        _options = options;
        _attachmentSource = attachmentSource;
    }

    public async Task<SmtpDeliveryResult> DeliverAsync(
        NotificationDeliveryIntent intent,
        CancellationToken cancellationToken)
    {
        _options.Validate();
        cancellationToken.ThrowIfCancellationRequested();
        if (intent.EstimatedMessageSizeBytes > _options.MaxMessageSizeBytes)
        {
            return SmtpDeliveryResult.PermanentFailure("message-too-large");
        }

        using var client = new SmtpClient();
        var connected = false;
        try
        {
            var socketOptions = _options.RequireTls
                ? _options.Port == 465
                    ? SecureSocketOptions.SslOnConnect
                    : SecureSocketOptions.StartTls
                : SecureSocketOptions.Auto;

            await client.ConnectAsync(
                _options.Host,
                _options.Port,
                socketOptions,
                cancellationToken);
            connected = true;

            if (_options.UseAuthentication)
            {
                await client.AuthenticateAsync(
                    _options.Username,
                    _options.Password,
                    cancellationToken);
            }

            var message = await ComposeMessageAsync(intent, cancellationToken);
            await client.SendAsync(message, cancellationToken);
            return SmtpDeliveryResult.Accepted();
        }
        catch (OperationCanceledException)
        {
            return SmtpDeliveryResult.Cancelled();
        }
        catch (AttachmentResolutionException)
        {
            return SmtpDeliveryResult.PermanentFailure("attachment-invalid");
        }
        catch (SmtpCommandException exception)
        {
            return ClassifyStatusCode((int)exception.StatusCode);
        }
        catch (AuthenticationException)
        {
            return SmtpDeliveryResult.PermanentFailure("smtp-authentication");
        }
        catch (SmtpProtocolException)
        {
            return SmtpDeliveryResult.TransientFailure("smtp-protocol");
        }
        catch (SocketException)
        {
            return SmtpDeliveryResult.TransientFailure("smtp-network");
        }
        catch (IOException)
        {
            return SmtpDeliveryResult.TransientFailure("smtp-network");
        }
        finally
        {
            if (connected && client.IsConnected)
            {
                try
                {
                    await client.DisconnectAsync(true, cancellationToken);
                }
                catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
                {
                }
            }
        }
    }

    public static SmtpDeliveryResult ClassifyStatusCode(int statusCode)
    {
        if (statusCode is >= 200 and < 400)
        {
            return SmtpDeliveryResult.Accepted();
        }

        if (statusCode is >= 400 and < 500)
        {
            return SmtpDeliveryResult.TransientFailure("smtp-4xx");
        }

        if (statusCode == 535)
        {
            return SmtpDeliveryResult.PermanentFailure("smtp-authentication");
        }

        return SmtpDeliveryResult.PermanentFailure("smtp-5xx");
    }

    private async Task<MimeMessage> ComposeMessageAsync(
        NotificationDeliveryIntent intent,
        CancellationToken cancellationToken)
    {
        var message = new MimeMessage();
        message.From.Add(MailboxAddress.Parse(_options.FromAddress));
        message.To.Add(MailboxAddress.Parse(intent.Recipient));
        message.Subject = intent.Subject;

        var builder = new BodyBuilder
        {
            TextBody = intent.Body
        };
        foreach (var reference in intent.AttachmentReferenceValues)
        {
            if (_attachmentSource is null)
            {
                throw new AttachmentResolutionException("An attachment source is required.");
            }

            var attachment = await _attachmentSource.ReadAsync(
                reference,
                cancellationToken);
            if (
                attachment.Content.Length > _options.MaxAttachmentBytes
                || string.IsNullOrWhiteSpace(attachment.FileName)
                || string.IsNullOrWhiteSpace(attachment.ContentType))
            {
                throw new AttachmentResolutionException("The attachment is invalid or too large.");
            }

            builder.Attachments.Add(
                attachment.FileName,
                attachment.Content,
                ContentType.Parse(attachment.ContentType));
        }

        message.Body = builder.ToMessageBody();
        return message;
    }

    private sealed class AttachmentResolutionException : Exception
    {
        public AttachmentResolutionException(string message)
            : base(message)
        {
        }
    }
}
