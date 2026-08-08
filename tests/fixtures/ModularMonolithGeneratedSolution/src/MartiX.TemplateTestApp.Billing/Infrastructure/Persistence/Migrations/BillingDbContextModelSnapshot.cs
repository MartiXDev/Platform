using MartiX.TemplateTestApp.Billing.Domain;
using MartiX.TemplateTestApp.Billing.Infrastructure.Persistence;
using MartiX.Platform.EntityFrameworkCore.ReliableEvents;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace MartiX.TemplateTestApp.Billing.Infrastructure.Persistence.Migrations;

[DbContext(typeof(BillingDbContext))]
internal partial class BillingDbContextModelSnapshot : ModelSnapshot
{
    protected override void BuildModel(ModelBuilder modelBuilder)
    {
        modelBuilder
            .HasDefaultSchema("billing")
            .HasAnnotation("ProductVersion", "10.0.10");

        modelBuilder.HasReliableEvents("billing");

        modelBuilder.Entity<BillingAggregate>(entity =>
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
                .HasName("pk_billing_aggregate");
            entity.HasIndex("Name")
                .IsUnique()
                .HasDatabaseName("ix_billing_aggregate_name");
            entity.ToTable("billing_aggregate", "billing");
        });
    }
}
