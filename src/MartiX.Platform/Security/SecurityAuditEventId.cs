using System;

namespace MartiX.Platform.Security;

/// <summary>
/// A strongly typed UUID version 7 security audit event identifier.
/// </summary>
public readonly record struct SecurityAuditEventId
{
    private SecurityAuditEventId(Guid value)
    {
        Value = value;
    }

    /// <summary>Gets the UUID value.</summary>
    public Guid Value { get; }

    /// <summary>Creates a new UUID version 7 event identifier.</summary>
    public static SecurityAuditEventId New() =>
        new(Guid.CreateVersion7());

    /// <summary>Creates an event identifier from a UUID version 7 value.</summary>
    public static SecurityAuditEventId Create(Guid value)
    {
        if (value == Guid.Empty || !IsVersion7(value))
        {
            throw new ArgumentException(
                "Security audit event identifiers must be non-empty UUID version 7 values.",
                nameof(value));
        }

        return new(value);
    }

    /// <inheritdoc />
    public override string ToString() => Value.ToString("D");

    private static bool IsVersion7(Guid value)
    {
        var bytes = value.ToByteArray();
        return (bytes[7] & 0xF0) == 0x70
            && (bytes[8] & 0xC0) == 0x80;
    }
}
