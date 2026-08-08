using MartiX.TemplateTestApp.Orders.Domain;
using Microsoft.EntityFrameworkCore;

namespace MartiX.TemplateTestApp.Orders.Infrastructure.Persistence;

internal sealed class OrdersDbContext : DbContext
{
    public OrdersDbContext(
        DbContextOptions<OrdersDbContext> options)
        : base(options)
    {
    }

    public DbSet<OrdersAggregate> Aggregates => Set<OrdersAggregate>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("orders");
        OrdersPersistenceModel.Configure(modelBuilder);
    }
}
