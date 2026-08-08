using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace MartiX.Platform.EntityFrameworkCore.EntityTimestamps;

/// <summary>
/// Updates timestamps and concurrency tokens before an EF Core save operation.
/// </summary>
public sealed class EntityTimestampsSaveChangesInterceptor : SaveChangesInterceptor
{
    private readonly TimeProvider timeProvider;

    /// <summary>Initializes the interceptor with a UTC time provider.</summary>
    /// <param name="timeProvider">The time provider used for entity timestamps.</param>
    public EntityTimestampsSaveChangesInterceptor(TimeProvider timeProvider)
    {
        ArgumentNullException.ThrowIfNull(timeProvider);
        this.timeProvider = timeProvider;
    }

    /// <inheritdoc />
    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData,
        InterceptionResult<int> result)
    {
        ApplyAuditValues(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    /// <inheritdoc />
    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        ApplyAuditValues(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private void ApplyAuditValues(DbContext? context)
    {
        if (context is null)
        {
            return;
        }

        var now = timeProvider.GetUtcNow();
        foreach (var entry in context.ChangeTracker.Entries<IHasEntityTimestamps>())
        {
            var createdAt = entry.Property<DateTimeOffset>(
                nameof(IHasEntityTimestamps.CreatedAt));
            var updatedAt = entry.Property<DateTimeOffset>(
                nameof(IHasEntityTimestamps.UpdatedAt));
            if (entry.State == EntityState.Added)
            {
                createdAt.CurrentValue = now;
                updatedAt.CurrentValue = now;
            }
            else if (entry.State == EntityState.Modified)
            {
                createdAt.CurrentValue = createdAt.OriginalValue;
                createdAt.IsModified = false;
                updatedAt.CurrentValue = now;
                updatedAt.IsModified = true;
            }
        }

        foreach (var entry in context.ChangeTracker.Entries<IHasConcurrencyToken>())
        {
            if (entry.State is EntityState.Added or EntityState.Modified)
            {
                entry.Property(nameof(IHasConcurrencyToken.ConcurrencyToken)).CurrentValue =
                    Guid.NewGuid();
                entry.Property(nameof(IHasConcurrencyToken.ConcurrencyToken)).IsModified = true;
            }
        }
    }
}
