using System;

namespace MartiX.Platform.EntityFrameworkCore.EntityTimestamps;

/// <summary>Provides an application-managed optimistic concurrency token.</summary>
public interface IHasConcurrencyToken
{
    /// <summary>Gets the current concurrency token.</summary>
    Guid ConcurrencyToken { get; }
}
