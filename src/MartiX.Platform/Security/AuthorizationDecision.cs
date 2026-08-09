using System;

namespace MartiX.Platform.Security;

/// <summary>
/// Provider-independent result of an authorization decision.
/// </summary>
public readonly record struct AuthorizationDecision
{
    private AuthorizationDecision(bool isAllowed, string reason)
    {
        IsAllowed = isAllowed;
        Reason = reason;
    }

    /// <summary>Gets whether the requested action is allowed.</summary>
    public bool IsAllowed { get; }

    /// <summary>Gets a safe, stable reason for the decision.</summary>
    public string Reason { get; }

    /// <summary>Creates an allowed decision.</summary>
    public static AuthorizationDecision Allow() =>
        new(true, "allowed");

    /// <summary>Creates a denied decision.</summary>
    public static AuthorizationDecision Deny(string reason = "denied")
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(reason);
        return new(false, reason.Trim());
    }
}
