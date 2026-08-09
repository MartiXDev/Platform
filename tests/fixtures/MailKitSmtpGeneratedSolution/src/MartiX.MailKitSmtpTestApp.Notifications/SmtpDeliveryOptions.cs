namespace MartiX.MailKitSmtpTestApp.Notifications;

public sealed class SmtpDeliveryOptions
{
    public const string SecretPolicy = "external-only";

    public required string Host { get; init; }

    public int Port { get; init; } = 587;

    public required string FromAddress { get; init; }

    public string Username { get; init; } = string.Empty;

    public string Password { get; init; } = string.Empty;

    public bool RequireTls { get; init; } = true;

    public bool UseAuthentication { get; init; } = true;

    public int AutomaticAttemptLimit { get; init; } = 5;

    public TimeSpan AttemptTimeout { get; init; } = TimeSpan.FromSeconds(30);

    public TimeSpan RetryBaseDelay { get; init; } = TimeSpan.FromSeconds(5);

    public TimeSpan MaxRetryDelay { get; init; } = TimeSpan.FromMinutes(5);

    public int MaxMessageSizeBytes { get; init; } = 1_000_000;

    public int MaxAttachmentBytes { get; init; } = 5_000_000;

    public void Validate(bool isProduction = true)
    {
        if (string.IsNullOrWhiteSpace(Host))
        {
            throw new InvalidOperationException("Mail:Smtp:Host is required.");
        }

        if (Port is < 1 or > 65_535)
        {
            throw new InvalidOperationException("Mail:Smtp:Port is outside the valid TCP range.");
        }

        if (string.IsNullOrWhiteSpace(FromAddress))
        {
            throw new InvalidOperationException("Mail:Smtp:FromAddress is required.");
        }

        if (isProduction && !RequireTls)
        {
            throw new InvalidOperationException(
                "Mail:Smtp:RequireTls must be true for production delivery.");
        }

        if (UseAuthentication && (string.IsNullOrWhiteSpace(Username) || string.IsNullOrWhiteSpace(Password)))
        {
            throw new InvalidOperationException(
                "Mail:Smtp:Username and Mail:Smtp:Password are required when authentication is enabled.");
        }

        if (AutomaticAttemptLimit is < 1 or > 10)
        {
            throw new InvalidOperationException("Automatic SMTP attempts must be bounded between 1 and 10.");
        }

        if (
            AttemptTimeout <= TimeSpan.Zero
            || RetryBaseDelay <= TimeSpan.Zero
            || MaxRetryDelay < RetryBaseDelay
            || MaxMessageSizeBytes <= 0
            || MaxAttachmentBytes <= 0)
        {
            throw new InvalidOperationException("SMTP timeout, retry, and size bounds must be positive.");
        }
    }

    public TimeSpan GetRetryDelay(int attempt)
    {
        var exponent = Math.Clamp(attempt - 1, 0, 6);
        var multiplier = Math.Pow(2, exponent);
        var milliseconds = Math.Min(
            RetryBaseDelay.TotalMilliseconds * multiplier,
            MaxRetryDelay.TotalMilliseconds);
        return TimeSpan.FromMilliseconds(milliseconds);
    }

    public string RedactedSummary =>
        $"host={Host};port={Port};tls={RequireTls};authentication={UseAuthentication}";
}
