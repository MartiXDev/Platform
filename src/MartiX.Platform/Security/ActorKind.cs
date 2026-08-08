namespace MartiX.Platform.Security;

/// <summary>
/// Describes the provider-independent kind of an actor.
/// </summary>
public enum ActorKind
{
    Anonymous = 0,
    Human = 1,
    Service = 2,
    Background = 3,
}
