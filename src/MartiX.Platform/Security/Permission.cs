using System;

namespace MartiX.Platform.Security;

/// <summary>
/// A normalized application permission capability.
/// </summary>
public readonly record struct Permission
{
    private Permission(string value)
    {
        Value = value;
    }

    /// <summary>Gets the lowercase stable permission code.</summary>
    public string Value { get; }

    /// <summary>Creates and validates a permission code.</summary>
    public static Permission Create(string value)
    {
        if (!TryCreate(value, out var permission))
        {
            throw new ArgumentException(
                "A permission must contain lowercase-safe dotted or hyphenated segments.",
                nameof(value));
        }

        return permission;
    }

    /// <summary>
    /// Attempts to create a permission without throwing for hostile input.
    /// </summary>
    public static bool TryCreate(string? value, out Permission permission)
    {
        permission = default;
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        var normalized = value.Trim().ToLowerInvariant();
        if (normalized.Length > 100)
        {
            return false;
        }

        var previousWasSeparator = true;
        foreach (var character in normalized)
        {
            var isSeparator = character is '.' or '-';
            var isSafeCharacter =
                character is >= 'a' and <= 'z'
                || character is >= '0' and <= '9';
            if ((!isSafeCharacter && !isSeparator) || isSeparator && previousWasSeparator)
            {
                return false;
            }

            previousWasSeparator = isSeparator;
        }

        if (previousWasSeparator)
        {
            return false;
        }

        permission = new Permission(normalized);
        return true;
    }

    /// <inheritdoc />
    public override string ToString() => Value ?? string.Empty;
}
