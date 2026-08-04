using MartiX.TemplateTestApp.Orders.Contracts.ModuleContracts;
using MartiX.TemplateTestApp.Orders.Features.Status;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace MartiX.TemplateTestApp.Orders;

public static class OrdersModule
{
    public static void AddServices(IServiceCollection services)
    {
        services.AddSingleton<IOrdersStatus, OrdersStatusOperation>();
    }

    public static void MapEndpoints(IEndpointRouteBuilder endpoints)
    {
        OrdersStatusEndpoint.Map(endpoints);
    }

    public static string MigrationIdentity => "Orders";
}
