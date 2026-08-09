using MartiX.QuartzTestApp.Orders.Domain;
using MartiX.Platform.EntityFrameworkCore.EntityTimestamps;
using MartiX.QuartzTestApp.Orders.Infrastructure.IntegrationEvents;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MartiX.QuartzTestApp.Orders.Infrastructure.Persistence;

internal sealed class OrdersAggregateConfiguration :
    IEntityTypeConfiguration<OrdersAggregate>
{
    public void Configure(EntityTypeBuilder<OrdersAggregate> entity)
    {
        entity.ToTable("orders_aggregate", "orders");
        entity.HasKey(aggregate => aggregate.Id)
            .HasName("pk_orders_aggregate");
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
            .HasDatabaseName("ix_orders_aggregate_name")
            .IsUnique();
    }
}

internal static class OrdersPersistenceModel
{
    public static void Configure(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfiguration(new OrdersAggregateConfiguration());
        OrdersReliableEvents.Configure(modelBuilder);
    }
}
