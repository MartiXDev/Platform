using MartiX.TemplateTestApp.Billing.Domain;
using MartiX.Platform.EntityFrameworkCore.ReliableEvents;
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

    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();

    public DbSet<OutboxDelivery> OutboxDeliveries => Set<OutboxDelivery>();

    public DbSet<InboxReceipt> InboxReceipts => Set<InboxReceipt>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("billing");
        BillingPersistenceModel.Configure(modelBuilder);
    }
}
