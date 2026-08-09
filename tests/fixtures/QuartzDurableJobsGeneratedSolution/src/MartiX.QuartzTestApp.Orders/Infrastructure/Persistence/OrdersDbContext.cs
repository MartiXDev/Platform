using MartiX.QuartzTestApp.Orders.Domain;
using MartiX.Platform.EntityFrameworkCore.ReliableEvents;
using Microsoft.EntityFrameworkCore;

namespace MartiX.QuartzTestApp.Orders.Infrastructure.Persistence;

internal sealed class OrdersDbContext : DbContext
{
    public OrdersDbContext(
        DbContextOptions<OrdersDbContext> options)
        : base(options)
    {
    }

    public DbSet<OrdersAggregate> Aggregates => Set<OrdersAggregate>();

    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();

    public DbSet<OutboxDelivery> OutboxDeliveries => Set<OutboxDelivery>();

    public DbSet<InboxReceipt> InboxReceipts => Set<InboxReceipt>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("orders");
        OrdersPersistenceModel.Configure(modelBuilder);
    }
}
