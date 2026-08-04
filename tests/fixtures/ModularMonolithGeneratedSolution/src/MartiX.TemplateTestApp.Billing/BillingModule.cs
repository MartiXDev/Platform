using MartiX.TemplateTestApp.Billing.Contracts.ModuleContracts;
using MartiX.TemplateTestApp.Billing.Features.Status;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace MartiX.TemplateTestApp.Billing;

public static class BillingModule
{
    public static void AddServices(IServiceCollection services)
    {
        services.AddSingleton<IBillingStatus, BillingStatusOperation>();
    }

    public static void MapEndpoints(IEndpointRouteBuilder endpoints)
    {
        BillingStatusEndpoint.Map(endpoints);
    }

    public static string MigrationIdentity => "Billing";
}
