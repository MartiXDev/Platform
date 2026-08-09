using System;
using System.Linq;

namespace MartiX.Platform.Security;

/// <summary>
/// Stable external identity coordinates for an optional Actor Registry.
/// </summary>
public readonly record struct ActorRegistryKey
{
    private ActorRegistryKey(string issuer, string subject, string? tenantId)
    {
        Issuer = issuer;
        Subject = subject;
        TenantId = tenantId;
    }

    /// <summary>Gets the validated external issuer coordinate.</summary>
    public string Issuer { get; }

    /// <summary>Gets the validated provider subject coordinate.</summary>
    public string Subject { get; }

    /// <summary>Gets the optional tenant coordinate.</summary>
    public string? TenantId { get; }

    /// <summary>
    /// Creates a key from issuer, subject, and optional tenant coordinates.
    /// </summary>
    public static ActorRegistryKey Create(
        string issuer,
        string subject,
        string? tenantId = null)
    {
        var normalizedIssuer = Normalize(issuer, nameof(issuer));
        var normalizedSubject = Normalize(subject, nameof(subject));
        var normalizedTenant = string.IsNullOrWhiteSpace(tenantId)
            ? null
            : Normalize(tenantId, nameof(tenantId));
        return new(normalizedIssuer, normalizedSubject, normalizedTenant);
    }

    private static string Normalize(string value, string parameterName)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(value);
        var normalized = value.Trim();
        if (normalized.Length > 500 || normalized.Any(char.IsControl))
        {
            throw new ArgumentException(
                "Actor registry coordinates must be safe text of at most 500 characters.",
                parameterName);
        }

        return normalized;
    }
}
