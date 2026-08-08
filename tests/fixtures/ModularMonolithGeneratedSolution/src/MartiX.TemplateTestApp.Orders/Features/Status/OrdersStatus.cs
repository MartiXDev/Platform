
using MartiX.TemplateTestApp.Orders.Contracts.ModuleContracts;
using MartiX.TemplateTestApp.Orders.Domain;
using MartiX.TemplateTestApp.Orders.Infrastructure.Persistence;
using MartiX.Platform.AspNetCore;
using MartiX.Platform.Results;
using MartiX.Platform.EntityFrameworkCore.Specifications;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace MartiX.TemplateTestApp.Orders.Features.Status;

internal sealed class OrdersStatusOperation : IOrdersStatus
{


    public Task<OrdersStatusResponse> GetStatusAsync(
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var aggregate = new OrdersAggregate();
        return Task.FromResult(
            new OrdersStatusResponse(
                aggregate.Name,
                Array.Empty<string>()));
    }
}

internal sealed class OrdersPersistenceQuery
{
    private readonly OrdersDbContext dbContext;

    public OrdersPersistenceQuery(OrdersDbContext dbContext)
    {
        this.dbContext = dbContext;
    }

    public Task<OrdersAggregate?> FindAsync(
        Guid id,
        CancellationToken cancellationToken)
    {
        return new Specification<OrdersAggregate>(
                aggregate => aggregate.Id == id)
            .Apply(dbContext.Aggregates)
            .AsNoTracking()
            .SingleOrDefaultAsync(cancellationToken);
    }
}

internal static class OrdersStatusEndpoint
{
    public static void Map(IEndpointRouteBuilder endpoints)
    {
        var group = endpoints
            .MapGroup("/orders")
            .WithTags("Orders");
        group.MapGet(
                "/status",
                static (
                    IOrdersStatus status,
                    CancellationToken cancellationToken) =>
                    status.GetStatusAsync(cancellationToken))
            .WithName("MartiX.TemplateTestApp.Orders.Status")
            .WithSummary("Read Orders status")
            .Produces<OrdersStatusResponse>(StatusCodes.Status200OK)
            .ProducesMartiXProblemDetails(ErrorKind.Unexpected);
    }
}
