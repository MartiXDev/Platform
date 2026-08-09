using System;

namespace MartiX.Platform.Security;

/// <summary>
/// Explicit application context carrying an immutable Actor and permissions.
/// </summary>
public sealed class ActorContext
{
    private ActorContext(
        ActorSnapshot actor,
        PermissionSet permissions,
        bool isResolved)
    {
        Actor = actor;
        Permissions = permissions;
        IsResolved = isResolved;
    }

    /// <summary>Gets the immutable provider-independent Actor snapshot.</summary>
    public ActorSnapshot Actor { get; }

    /// <summary>Gets the immutable application permission set.</summary>
    public PermissionSet Permissions { get; }

    /// <summary>
    /// Gets whether provider-to-Actor resolution succeeded for this context.
    /// </summary>
    public bool IsResolved { get; }

    /// <summary>Creates an explicitly resolved application context.</summary>
    public static ActorContext Create(
        ActorSnapshot actor,
        PermissionSet permissions)
    {
        ArgumentNullException.ThrowIfNull(actor);
        ArgumentNullException.ThrowIfNull(permissions);
        return new(actor, permissions, isResolved: true);
    }

    /// <summary>Creates a deliberately anonymous application context.</summary>
    public static ActorContext Anonymous() =>
        new(ActorSnapshot.Anonymous(), PermissionSet.Empty, isResolved: true);

    /// <summary>Creates a failed-resolution context that cannot authorize.</summary>
    public static ActorContext Unresolved() =>
        new(ActorSnapshot.Anonymous(), PermissionSet.Empty, isResolved: false);

    /// <summary>Evaluates one application permission for this Actor.</summary>
    public AuthorizationDecision Authorize(Permission permission)
    {
        if (!IsResolved)
        {
            return AuthorizationDecision.Deny("actor-unresolved");
        }

        if (!Actor.IsAuthenticated)
        {
            return AuthorizationDecision.Deny("authentication-required");
        }

        return Permissions.Contains(permission)
            ? AuthorizationDecision.Allow()
            : AuthorizationDecision.Deny("permission-required");
    }
}
