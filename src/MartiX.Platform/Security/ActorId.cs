using System;

namespace MartiX.Platform.Security;

/// <summary>
/// Identifies an actor without coupling the Kernel to an identity provider.
/// </summary>
public readonly record struct ActorId
{
    private ActorId(Guid value)
    {
        Value = value;
    }

    /// <summary>Gets the underlying non-empty identifier.</summary>
    public Guid Value { get; }

    /// <summary>Creates a new time-sortable actor identifier.</summary>
    public static ActorId New() => new(Guid.CreateVersion7());

    /// <summary>Creates an actor identifier from a non-empty value.</summary>
    public static ActorId Create(Guid value)
    {
        if (value == Guid.Empty)
        {
            throw new ArgumentException(
                "An actor identifier must not be empty.",
                nameof(value));
        }

        return new(value);
    }

    /// <inheritdoc />
    public override string ToString() => Value.ToString("D");
}
