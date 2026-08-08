using MartiX.TemplateTestApp.Orders;
using MartiX.TemplateTestApp.Billing;
using MartiX.TemplateTestApp.Infrastructure.IntegrationEvents;
using MartiX.Platform.AspNetCore;
using MartiX.Platform.Results;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

var builder = WebApplication.CreateBuilder(args);
ApiComposition.ConfigureServices(builder.Services, builder.Configuration);

var app = builder.Build();
ApiComposition.Configure(app);
app.Run();

public static class ApiComposition
{
    public static void ConfigureServices(
        IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddMartiXProblemDetails();
        services.AddOpenApi(static options =>
            options.AddMartiXProblemDetailsContract());
        OrdersModule.AddServices(services, configuration);
        BillingModule.AddServices(services, configuration);
        ReliableEventsComposition.AddServices(services);
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
        var versionOne = app
            .MapGroup("/api/v1")
            .WithGroupName("v1");
        OrdersModule.MapEndpoints(versionOne);
        BillingModule.MapEndpoints(versionOne);
    }
}

public sealed record HealthResponse(string Status);
