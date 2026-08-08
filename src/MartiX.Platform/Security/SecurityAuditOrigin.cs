using System;
using System.Linq;

namespace MartiX.Platform.Security;

/// <summary>
/// A classified, provider-independent origin for a security audit event.
/// </summary>
public sealed record SecurityAuditOrigin
{
    private SecurityAuditOrigin(
        string channel,
        SecurityAuditDataClassification classification)
    {
        Channel = channel;
        Classification = classification;
    }

    /// <summary>Gets the application-owned origin channel.</summary>
    public string Channel { get; }

    /// <summary>Gets the classification of the origin value.</summary>
    public SecurityAuditDataClassification Classification { get; }

    /// <summary>Creates a classified origin without accepting arbitrary metadata.</summary>
    public static SecurityAuditOrigin Create(
        string channel,
        SecurityAuditDataClassification classification =
            SecurityAuditDataClassification.Internal)
    {
        ArgumentNullException.ThrowIfNull(channel);
        if (channel.Length == 0
            || channel.Length > 100
            || channel.Any(char.IsControl))
        {
            throw new ArgumentException(
                "Audit origin channels must be safe text of at most 100 characters.",
                nameof(channel));
        }

        if (!Enum.IsDefined(classification))
        {
            throw new ArgumentOutOfRangeException(nameof(classification));
        }

        return new SecurityAuditOrigin(channel, classification);
    }
}
