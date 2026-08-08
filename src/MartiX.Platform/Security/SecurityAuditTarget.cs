using System;
using System.Linq;

namespace MartiX.Platform.Security;

/// <summary>
/// An opaque, safe target reference for a security audit event.
/// </summary>
public sealed record SecurityAuditTarget
{
    private SecurityAuditTarget(
        string resourceType,
        string identifier,
        SecurityAuditDataClassification classification)
    {
        ResourceType = resourceType;
        Identifier = identifier;
        Classification = classification;
    }

    /// <summary>Gets the application-owned resource type.</summary>
    public string ResourceType { get; }

    /// <summary>Gets the opaque resource identifier.</summary>
    public string Identifier { get; }

    /// <summary>Gets the classification of the target reference.</summary>
    public SecurityAuditDataClassification Classification { get; }

    /// <summary>Creates a safe target reference.</summary>
    public static SecurityAuditTarget Create(
        string resourceType,
        string identifier,
        SecurityAuditDataClassification classification =
            SecurityAuditDataClassification.Internal)
    {
        ValidateText(resourceType, nameof(resourceType), 100);
        ValidateText(identifier, nameof(identifier), 200);
        if (!Enum.IsDefined(classification))
        {
            throw new ArgumentOutOfRangeException(nameof(classification));
        }

        return new SecurityAuditTarget(resourceType, identifier, classification);
    }

    private static void ValidateText(string value, string parameterName, int maxLength)
    {
        ArgumentNullException.ThrowIfNull(value);
        if (value.Length == 0
            || value.Length > maxLength
            || value.Any(char.IsControl))
        {
            throw new ArgumentException(
                $"Audit target values must be safe text of at most {maxLength} characters.",
                parameterName);
        }
    }
}
