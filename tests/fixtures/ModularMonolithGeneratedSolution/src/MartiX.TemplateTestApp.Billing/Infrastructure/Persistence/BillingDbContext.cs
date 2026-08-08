using MartiX.TemplateTestApp.Billing.Domain;
using Microsoft.EntityFrameworkCore;

namespace MartiX.TemplateTestApp.Billing.Infrastructure.Persistence;

internal sealed class BillingDbContext : DbContext
{
    public BillingDbContext(
        DbContextOptions<BillingDbContext> options)
        : base(options)
    {
    }

    public DbSet<BillingAggregate> Aggregates => Set<BillingAggregate>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("billing");
        BillingPersistenceModel.Configure(modelBuilder);
    }
}
