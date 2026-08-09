using System.Threading;
using System.Threading.Tasks;

namespace MartiX.Platform.Security;

/// <summary>
/// Optional persistence seam for mapping stable external keys to Actor IDs.
/// </summary>
public interface IActorRegistry
{
    /// <summary>
    /// Resolves or creates the durable application Actor ID for a stable key.
    /// </summary>
    ValueTask<ActorId> ResolveAsync(
        ActorRegistryKey key,
        CancellationToken cancellationToken = default);
}
