using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MartiX.Platform.EntityFrameworkCore.EntityTimestamps;

/// <summary>Provides explicit timestamp mapping for EF Core entities.</summary>
public static class EntityTimestampsModelBuilderExtensions
{
    /// <summary>Maps entity timestamps to required database columns.</summary>
    /// <typeparam name="TEntity">The timestamped entity type.</typeparam>
    /// <param name="entityTypeBuilder">The entity type builder.</param>
    /// <param name="createdAtColumnName">The creation column name.</param>
    /// <param name="updatedAtColumnName">The update column name.</param>
    /// <returns>The same builder for fluent configuration.</returns>
    public static EntityTypeBuilder<TEntity> HasEntityTimestamps<TEntity>(
        this EntityTypeBuilder<TEntity> entityTypeBuilder,
        string createdAtColumnName = "created_at",
        string updatedAtColumnName = "updated_at")
        where TEntity : class, IHasEntityTimestamps
    {
        ArgumentNullException.ThrowIfNull(entityTypeBuilder);
        ArgumentException.ThrowIfNullOrWhiteSpace(createdAtColumnName);
        ArgumentException.ThrowIfNullOrWhiteSpace(updatedAtColumnName);

        entityTypeBuilder.Property(entity => entity.CreatedAt)
            .HasColumnName(createdAtColumnName)
            .IsRequired();
        entityTypeBuilder.Property(entity => entity.UpdatedAt)
            .HasColumnName(updatedAtColumnName)
            .IsRequired();

        return entityTypeBuilder;
    }
}
