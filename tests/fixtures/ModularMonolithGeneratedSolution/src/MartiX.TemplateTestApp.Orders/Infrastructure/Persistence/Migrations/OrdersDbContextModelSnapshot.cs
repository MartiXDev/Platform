using MartiX.TemplateTestApp.Orders.Domain;
using MartiX.TemplateTestApp.Orders.Infrastructure.Persistence;
using MartiX.Platform.EntityFrameworkCore.ReliableEvents;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace MartiX.TemplateTestApp.Orders.Infrastructure.Persistence.Migrations;

[DbContext(typeof(OrdersDbContext))]
internal partial class OrdersDbContextModelSnapshot : ModelSnapshot
{
    protected override void BuildModel(ModelBuilder modelBuilder)
    {
        modelBuilder
            .HasDefaultSchema("orders")
            .HasAnnotation("ProductVersion", "10.0.10");

        modelBuilder.HasReliableEvents("orders");

        modelBuilder.Entity<OrdersAggregate>(entity =>
        {
            entity.Property<Guid>("Id")
                .HasColumnName("id")
                .ValueGeneratedNever();
            entity.Property<Guid>("ConcurrencyToken")
                .HasColumnName("concurrency_token")
                .IsConcurrencyToken()
                .ValueGeneratedNever()
                .IsRequired();
            entity.Property<DateTimeOffset>("CreatedAt")
                .HasColumnName("created_at")
                .IsRequired();
            entity.Property<string>("Name")
                .HasColumnName("name")
                .HasMaxLength(200)
                .IsRequired();
            entity.Property<DateTimeOffset>("UpdatedAt")
                .HasColumnName("updated_at")
                .IsRequired();
            entity.HasKey("Id")
                .HasName("pk_orders_aggregate");
            entity.HasIndex("Name")
                .IsUnique()
                .HasDatabaseName("ix_orders_aggregate_name");
            entity.ToTable("orders_aggregate", "orders");
        });
    }
}
