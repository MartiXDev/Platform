using MartiX.FullStackTestApp.Web;
using MartiX.FullStackTestApp.Web.Platform.Api;
using MartiX.FullStackTestApp.Web.Platform.Runtime;
using MartiX.FullStackTestApp.Web.Platform.Session;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Components.Authorization;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.FluentUI.AspNetCore.Components;

var builder = WebApplication.CreateBuilder(args);
var runtimeConfiguration =
    RuntimeConfiguration.FromConfiguration(builder.Configuration);
builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents();
builder.Services.AddFluentUIComponents();
builder.Services.AddCascadingAuthenticationState();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ServerSessionAuthenticationStateProvider>();
builder.Services.AddScoped<AuthenticationStateProvider>(
    static services => services.GetRequiredService<
        ServerSessionAuthenticationStateProvider>());
builder.Services.AddScoped<IApiCredentialProvider>(
    static services => services.GetRequiredService<
        ServerSessionAuthenticationStateProvider>());
builder.Services.AddHttpClient<ApiTransport>(client =>
{
    client.BaseAddress = runtimeConfiguration.ApiBaseAddress;
});
builder.Services.AddScoped<GeneratedClient>();

var app = builder.Build();
app.UseExceptionHandler("/error");
app.UseHttpsRedirection();
app.UseAntiforgery();
app.MapStaticAssets();
app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode();
app.MapGet("/error", () => Results.Problem(
    statusCode: StatusCodes.Status500InternalServerError,
    title: "The request could not be completed.",
    type: "/problems/unexpected"));
app.MapGet("/ui-config.json", (HttpResponse response) =>
{
    response.Headers.CacheControl = "no-store";
    return Results.Json(new
    {
        apiBasePath = "/api/v1",
        deploymentVersion = "external",
        environment = "external",
        defaultCulture = "en-US",
        supportedCultures = new[] { "en-US" },
        provider = "blazor-webapp",
        renderingProfile = "application",
    });
});
app.Run();
