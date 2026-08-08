using System;
using System.Linq;

namespace MartiX.Platform.Security;

/// <summary>
/// An immutable, provider-independent snapshot of an actor.
/// </summary>
public sealed class ActorSnapshot : IEquatable<ActorSnapshot>
{
    private ActorSnapshot(
        ActorKind kind,
        ActorId? id,
        bool isAuthenticated,
        string? displayName,
        bool isImpersonating)
    {
        Kind = kind;
        Id = id;
        IsAuthenticated = isAuthenticated;
        DisplayName = displayName;
        IsImpersonating = isImpersonating;
    }

    /// <summary>Gets the provider-independent actor kind.</summary>
    public ActorKind Kind { get; }

    /// <summary>Gets the optional stable actor identifier.</summary>
    public ActorId? Id { get; }

    /// <summary>Gets whether the actor was authenticated for the action.</summary>
    public bool IsAuthenticated { get; }

    /// <summary>Gets the optional safe presentation label.</summary>
    public string? DisplayName { get; }

    /// <summary>Gets whether the actor is acting on behalf of another actor.</summary>
    public bool IsImpersonating { get; }

    /// <summary>Creates an immutable actor snapshot after validating its invariants.</summary>
    public static ActorSnapshot Create(
        ActorKind kind,
        ActorId? id,
        bool isAuthenticated,
        string? displayName = null,
        bool isImpersonating = false)
    {
        if (!Enum.IsDefined(kind))
        {
            throw new ArgumentOutOfRangeException(
                nameof(kind),
                kind,
                "The actor kind is not defined by the Platform contract.");
        }

        if (kind == ActorKind.Anonymous)
        {
            if (id is not null || isAuthenticated || isImpersonating)
            {
                throw new ArgumentException(
                    "Anonymous actors cannot have an identifier, authentication, or impersonation state.",
                    nameof(kind));
            }
        }
        else
        {
            if (!isAuthenticated)
            {
                throw new ArgumentException(
                    "Non-anonymous actors must be authenticated.",
                    nameof(isAuthenticated));
            }

            if (id is { } actorId && actorId.Value == Guid.Empty)
            {
                throw new ArgumentException(
                    "Actor identifiers must not be empty.",
                    nameof(id));
            }

            if (kind is ActorKind.Human or ActorKind.Service
                && id is null)
            {
                throw new ArgumentException(
                    "Human and service actors require an identifier.",
                    nameof(id));
            }
        }

        if (!string.IsNullOrEmpty(displayName)
            && (displayName.Length > 200 || displayName.Any(char.IsControl)))
        {
            throw new ArgumentException(
                "Actor display names must be safe text of at most 200 characters.",
                nameof(displayName));
        }

        if (isImpersonating && kind != ActorKind.Human)
        {
            throw new ArgumentException(
                "Only human actors may be marked as impersonating.",
                nameof(isImpersonating));
        }

        return new ActorSnapshot(
            kind,
            id,
            isAuthenticated,
            displayName,
            isImpersonating);
    }

    /// <summary>Creates the unauthenticated actor snapshot.</summary>
    public static ActorSnapshot Anonymous() =>
        Create(ActorKind.Anonymous, null, isAuthenticated: false);

    /// <summary>Creates an authenticated human actor snapshot.</summary>
    public static ActorSnapshot Human(
        ActorId id,
        string? displayName = null,
        bool isImpersonating = false) =>
        Create(
            ActorKind.Human,
            id,
            isAuthenticated: true,
            displayName,
            isImpersonating);

    /// <summary>Creates an authenticated service actor snapshot.</summary>
    public static ActorSnapshot Service(
        ActorId id,
        string? displayName = null) =>
        Create(
            ActorKind.Service,
            id,
            isAuthenticated: true,
            displayName);

    /// <summary>Creates an authenticated background actor snapshot.</summary>
    public static ActorSnapshot Background(
        ActorId? id = null,
        string? displayName = null) =>
        Create(
            ActorKind.Background,
            id,
            isAuthenticated: true,
            displayName);

    /// <inheritdoc />
    public bool Equals(ActorSnapshot? other)
    {
        return other is not null
            && Kind == other.Kind
            && Id == other.Id
            && IsAuthenticated == other.IsAuthenticated
            && string.Equals(DisplayName, other.DisplayName, StringComparison.Ordinal)
            && IsImpersonating == other.IsImpersonating;
    }

    /// <inheritdoc />
    public override bool Equals(object? obj) => Equals(obj as ActorSnapshot);

    /// <inheritdoc />
    public override int GetHashCode() =>
        HashCode.Combine(Kind, Id, IsAuthenticated, DisplayName, IsImpersonating);
}
