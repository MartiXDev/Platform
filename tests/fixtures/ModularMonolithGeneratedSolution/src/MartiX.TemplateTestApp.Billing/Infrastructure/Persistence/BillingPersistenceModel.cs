using MartiX.TemplateTestApp.Billing.Domain;
using MartiX.Platform.EntityFrameworkCore.EntityTimestamps;
using Microsoft.EntityFrameworkCore;

namespace MartiX.TemplateTestApp.Billing.Infrastructure.Persistence;

internal static class BillingPersistenceModel
{
    public static void Configure(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<BillingAggregate>(entity =>
        {
            entity.ToTable("billing_aggregate", "billing");
            entity.HasKey(aggregate => aggregate.Id)
                .HasName("pk_billing_aggregate");
            entity.Property(aggregate => aggregate.Id)
                .HasColumnName("id")
                .ValueGeneratedNever();
            entity.Property(aggregate => aggregate.Name)
                .HasColumnName("name")
                .HasMaxLength(200)
                .IsRequired();
            entity.HasEntityTimestamps();
            entity.Property(aggregate => aggregate.ConcurrencyToken)
                .HasColumnName("concurrency_token")
                .IsConcurrencyToken()
                .IsRequired();
            entity.HasIndex(aggregate => aggregate.Name)
                .HasDatabaseName("ix_billing_aggregate_name")
                .IsUnique();
        });
    }
}
