
using MartiX.TemplateTestApp.Orders.Contracts.ModuleContracts;
using MartiX.TemplateTestApp.Orders.Domain;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

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
            .Produces<OrdersStatusResponse>(StatusCodes.Status200OK);
    }
}
