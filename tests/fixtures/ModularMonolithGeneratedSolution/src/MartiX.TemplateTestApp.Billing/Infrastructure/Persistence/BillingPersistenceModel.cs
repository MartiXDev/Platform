using MartiX.TemplateTestApp.Billing.Domain;
using MartiX.Platform.EntityFrameworkCore.EntityTimestamps;
using MartiX.TemplateTestApp.Billing.Infrastructure.IntegrationEvents;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MartiX.TemplateTestApp.Billing.Infrastructure.Persistence;

internal sealed class BillingAggregateConfiguration :
    IEntityTypeConfiguration<BillingAggregate>
{
    public void Configure(EntityTypeBuilder<BillingAggregate> entity)
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
            .ValueGeneratedNever()
            .IsRequired();
        entity.HasIndex(aggregate => aggregate.Name)
            .HasDatabaseName("ix_billing_aggregate_name")
            .IsUnique();
    }
}

internal static class BillingPersistenceModel
{
    public static void Configure(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfiguration(new BillingAggregateConfiguration());
        BillingReliableEvents.Configure(modelBuilder);
    }
}
