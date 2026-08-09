using MartiX.TemplateTestApp.Orders;
using MartiX.TemplateTestApp.Billing;
using MartiX.TemplateTestApp.Api.Infrastructure.Host;
using MartiX.TemplateTestApp.Api.Infrastructure.Identity;
using MartiX.TemplateTestApp.Infrastructure.IntegrationEvents;
using MartiX.Platform.AspNetCore;
using MartiX.Platform.Results;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var builder = WebApplication.CreateBuilder(args);
ApiComposition.ConfigureBuilder(builder);
ApiComposition.ConfigureServices(
    builder.Services,
    builder.Configuration,
    builder.Environment);

var app = builder.Build();
ApiComposition.Configure(app);
app.Run();

public static class ApiComposition
{
    public static void ConfigureBuilder(WebApplicationBuilder builder)
    {
        AuthenticationComposition.ValidateStartup(
            builder.Configuration,
            builder.Environment);
        HostSecurity.ValidateStartup(
            builder.Configuration,
            builder.Environment);
        HostSecurity.ConfigureBuilder(builder);
    }

    public static void ConfigureServices(
        IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        services.AddMartiXProblemDetails();
        services.AddOpenApi(static options =>
            options.AddMartiXProblemDetailsContract());
        HostSecurity.AddServices(services, configuration, environment);
        AuthenticationComposition.AddServices(
            services,
            configuration,
            environment);
        OrdersModule.AddServices(services, configuration);
        BillingModule.AddServices(services, configuration);
        ReliableEventsComposition.AddServices(services);
    }

    public static void Configure(WebApplication app)
    {
        app.UseForwardedHeaders();
        app.UseExceptionHandler();
        if (app.Environment.IsProduction())
        {
            app.UseHsts();
            app.UseHttpsRedirection();
        }
        app.UseMiddleware<HostHeaderPolicyMiddleware>();
        app.UseMiddleware<SecurityHeadersMiddleware>();
        app.UseCors(HostSecurity.CorsPolicyName);
        app.UseRateLimiter();
        app.UseAntiforgery();
        app.UseAuthorization();
        app.MapOpenApi().AllowAnonymous();
        app.MapHealthChecks(
                "/alive",
                new HealthCheckOptions
                {
                    Predicate = HostSecurity.IsLive,
                    ResponseWriter = HostSecurity.WriteHealthResponseAsync,
                })
            .AllowAnonymous();
        app.MapHealthChecks(
                "/ready",
                new HealthCheckOptions
                {
                    Predicate = HostSecurity.IsReady,
                    ResponseWriter = HostSecurity.WriteHealthResponseAsync,
                })
            .AllowAnonymous();
        app.MapGet(
                "/health",
                static () => TypedResults.Ok(new HealthResponse("ok")))
            .WithName("Health")
            .AllowAnonymous()
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
