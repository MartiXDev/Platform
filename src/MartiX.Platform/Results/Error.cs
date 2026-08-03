using System;

namespace MartiX.Platform.Results;

/// <summary>
/// An immutable, transport-independent application failure.
/// </summary>
public sealed class Error
{
    private const string ReservedPlatformPrefix = "platform.";

    private Error(
        string code,
        ErrorKind kind,
        string description,
        string? target)
    {
        Code = code;
        Kind = kind;
        Description = description;
        Target = target;
    }

    /// <summary>Gets the stable, machine-readable owner-prefixed code.</summary>
    public string Code { get; }

    /// <summary>Gets the coarse, transport-independent failure category.</summary>
    public ErrorKind Kind { get; }

    /// <summary>Gets the safe human-readable description for the failure.</summary>
    public string Description { get; }

    /// <summary>Gets the optional application-contract member targeted by validation.</summary>
    public string? Target { get; }

    /// <summary>
    /// Creates an immutable application error after validating its contract.
    /// </summary>
    /// <param name="code">A lowercase owner-prefixed error code.</param>
    /// <param name="kind">The transport-independent failure category.</param>
    /// <param name="description">Safe, non-empty descriptive text.</param>
    /// <param name="target">An optional validation target member.</param>
    public static Error Create(
        string code,
        ErrorKind kind,
        string description,
        string? target = null)
    {
        Validate(code, kind, description, target, allowPlatformPrefix: false);
        return new Error(code, kind, description, target);
    }

    internal static Error CreatePlatform(
        string code,
        ErrorKind kind,
        string description,
        string? target = null)
    {
        Validate(code, kind, description, target, allowPlatformPrefix: true);
        return new Error(code, kind, description, target);
    }

    private static void Validate(
        string code,
        ErrorKind kind,
        string description,
        string? target,
        bool allowPlatformPrefix)
    {
        ArgumentNullException.ThrowIfNull(code);
        ArgumentNullException.ThrowIfNull(description);

        if (!IsValidCode(code))
        {
            throw new ArgumentException(
                "Error codes must use lowercase owner-prefixed dot-separated segments.",
                nameof(code));
        }

        if (!allowPlatformPrefix
            && code.StartsWith(ReservedPlatformPrefix, StringComparison.Ordinal))
        {
            throw new ArgumentException(
                "The platform.* error-code prefix is reserved by the Platform.",
                nameof(code));
        }

        if (!Enum.IsDefined(typeof(ErrorKind), kind))
        {
            throw new ArgumentOutOfRangeException(
                nameof(kind),
                kind,
                "The error kind is not defined by the Platform contract.");
        }

        if (string.IsNullOrWhiteSpace(description)
            || ContainsControlCharacter(description))
        {
            throw new ArgumentException(
                "Error descriptions must contain safe, non-empty text.",
                nameof(description));
        }

        if (target is null)
        {
            return;
        }

        if (kind != ErrorKind.Validation)
        {
            throw new ArgumentException(
                "An error target is only valid for validation errors.",
                nameof(target));
        }

        if (string.IsNullOrWhiteSpace(target)
            || ContainsControlCharacter(target))
        {
            throw new ArgumentException(
                "Error targets must contain safe, non-empty text.",
                nameof(target));
        }
    }

    private static bool IsValidCode(string code)
    {
        var segmentCount = 1;
        var segmentLength = 0;
        var previousWasHyphen = false;

        foreach (var character in code)
        {
            if (character == '.')
            {
                if (segmentLength == 0 || previousWasHyphen)
                {
                    return false;
                }

                segmentCount++;
                segmentLength = 0;
                previousWasHyphen = false;
                continue;
            }

            if (character == '-')
            {
                if (segmentLength == 0 || previousWasHyphen)
                {
                    return false;
                }

                segmentLength++;
                previousWasHyphen = true;
                continue;
            }

            if (!IsLowercaseAsciiLetterOrDigit(character))
            {
                return false;
            }

            segmentLength++;
            previousWasHyphen = false;
        }

        return segmentLength > 0
            && !previousWasHyphen
            && segmentCount >= 2;
    }

    private static bool IsLowercaseAsciiLetterOrDigit(char character)
    {
        return character is >= 'a' and <= 'z'
            or >= '0' and <= '9';
    }

    private static bool ContainsControlCharacter(string value)
    {
        foreach (var character in value)
        {
            if (char.IsControl(character))
            {
                return true;
            }
        }

        return false;
    }
}
