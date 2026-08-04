using OrdersStatus = MartiX.TemplateTestApp.Orders.Contracts.ModuleContracts.IOrdersStatus;
using MartiX.TemplateTestApp.Billing.Contracts.ModuleContracts;
using MartiX.TemplateTestApp.Billing.Domain;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

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
            .Produces<BillingStatusResponse>(StatusCodes.Status200OK);
    }
}
