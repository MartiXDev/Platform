using MartiX.TemplateTestApp.Orders;
using MartiX.TemplateTestApp.Billing;
using MartiX.Platform.AspNetCore;
using MartiX.Platform.Results;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.Extensions.DependencyInjection;

var builder = WebApplication.CreateBuilder(args);
ApiComposition.ConfigureServices(builder.Services);

var app = builder.Build();
ApiComposition.Configure(app);
app.Run();

public static class ApiComposition
{
    public static void ConfigureServices(IServiceCollection services)
    {
        services.AddMartiXProblemDetails();
        services.AddOpenApi(static options =>
            options.AddMartiXProblemDetailsContract());
        OrdersModule.AddServices(services);
        BillingModule.AddServices(services);
    }

    public static void Configure(WebApplication app)
    {
        app.UseExceptionHandler();
        app.MapOpenApi();
        app.MapGet(
                "/health",
                static () => TypedResults.Ok(new HealthResponse("ok")))
            .WithName("Health")
            .Produces<HealthResponse>(StatusCodes.Status200OK)
            .ProducesMartiXProblemDetails(ErrorKind.Unexpected);
        OrdersModule.MapEndpoints(app);
        BillingModule.MapEndpoints(app);
    }
}

public sealed record HealthResponse(string Status);
