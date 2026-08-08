using OrdersStatus = MartiX.TemplateTestApp.Orders.Contracts.ModuleContracts.IOrdersStatus;
using MartiX.TemplateTestApp.Billing.Contracts.ModuleContracts;
using MartiX.TemplateTestApp.Billing.Domain;
using MartiX.TemplateTestApp.Billing.Infrastructure.Persistence;
using MartiX.Platform.AspNetCore;
using MartiX.Platform.Results;
using MartiX.Platform.EntityFrameworkCore.Specifications;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace MartiX.TemplateTestApp.Billing.Features.Status;

internal sealed class BillingStatusOperation : IBillingStatus
{
    private readonly OrdersStatus ordersStatus;
    public BillingStatusOperation(OrdersStatus ordersStatus)
    {
        this.ordersStatus = ordersStatus;
    }

    public async Task<BillingStatusResponse> GetStatusAsync(
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var aggregate = new BillingAggregate();
        var dependencies = new List<string>();
        dependencies.Add((await ordersStatus.GetStatusAsync(cancellationToken)).Module);
        return new BillingStatusResponse(aggregate.Name, dependencies);
    }
}

internal sealed class BillingPersistenceQuery
{
    private readonly BillingDbContext dbContext;

    public BillingPersistenceQuery(BillingDbContext dbContext)
    {
        this.dbContext = dbContext;
    }

    public Task<BillingAggregate?> FindAsync(
        Guid id,
        CancellationToken cancellationToken)
    {
        return new Specification<BillingAggregate>(
                aggregate => aggregate.Id == id)
            .Apply(dbContext.Aggregates)
            .AsNoTracking()
            .SingleOrDefaultAsync(cancellationToken);
    }
}

internal static class BillingStatusEndpoint
{
    public static void Map(IEndpointRouteBuilder endpoints)
    {
        var group = endpoints
            .MapGroup("/billing")
            .WithTags("Billing");
        group.MapGet(
                "/status",
                static (
                    IBillingStatus status,
                    CancellationToken cancellationToken) =>
                    status.GetStatusAsync(cancellationToken))
            .WithName("MartiX.TemplateTestApp.Billing.Status")
            .WithSummary("Read Billing status")
            .Produces<BillingStatusResponse>(StatusCodes.Status200OK)
            .ProducesMartiXProblemDetails(ErrorKind.Unexpected);
    }
}
