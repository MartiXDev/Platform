using System;

namespace MartiX.Platform.EntityFrameworkCore.EntityTimestamps;

/// <summary>Provides application-managed UTC entity timestamps.</summary>
public interface IHasEntityTimestamps
{
    /// <summary>Gets the creation timestamp.</summary>
    DateTimeOffset CreatedAt { get; }

    /// <summary>Gets the most recent update timestamp.</summary>
    DateTimeOffset UpdatedAt { get; }
}
