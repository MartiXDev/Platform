using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using MartiX.TemplateTestApp.Api.Infrastructure.Identity;
using MartiX.Platform.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace MartiX.TemplateTestApp.Api.Infrastructure.Identity;

internal static class AuthenticationComposition
{
    public const string Profile = "none";
    public const string Provider = "none";

    public static void ValidateStartup(
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        ArgumentNullException.ThrowIfNull(configuration);
        ArgumentNullException.ThrowIfNull(environment);
    }

    public static void AddServices(
        IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        ArgumentNullException.ThrowIfNull(services);
        ValidateStartup(configuration, environment);
        services.AddHttpContextAccessor();
        services.AddScoped(serviceProvider =>
        {
            var accessor = serviceProvider.GetRequiredService<IHttpContextAccessor>();
            return ActorAuthorization.Resolve(
                accessor.HttpContext?.User,
                Profile == "identity:interactive" ? "identity" : null);
        });
        AddAuthorization(services);
    }

    public const string PermissionPolicyName = "permission:platform-access";

    public static void AddAuthorization(
        IServiceCollection services)
    {
        services.AddSingleton<IAuthorizationHandler, PermissionAuthorizationHandler>();
        services.AddAuthorizationBuilder()
            .AddPolicy(
                PermissionPolicyName,
                policy => policy
                    .RequireAuthenticatedUser()
                    .AddRequirements(
                        new PermissionAuthorizationRequirement(
                            Permission.Create("platform.access"))));
    }

    private sealed class PermissionAuthorizationRequirement : IAuthorizationRequirement
    {
        public PermissionAuthorizationRequirement(Permission permission)
        {
            Permission = permission;
        }

        public Permission Permission { get; }
    }

    private sealed class PermissionAuthorizationHandler :
        AuthorizationHandler<PermissionAuthorizationRequirement>
    {
        protected override Task HandleRequirementAsync(
            AuthorizationHandlerContext context,
            PermissionAuthorizationRequirement requirement)
        {
            if (ActorAuthorization.Resolve(
                    context.User,
                    Profile == "identity:interactive" ? "identity" : null)
                .Authorize(requirement.Permission)
                .IsAllowed)
            {
                context.Succeed(requirement);
            }

            return Task.CompletedTask;
        }
    }
    private static string RequireConfiguration(
        IConfiguration configuration,
        string key)
    {
        var value = configuration[key]?.Trim();
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException(
                $"Authentication configuration value '{key}' is required.");
        }

        return value;
    }

    private static string RequireHttpsUri(
        IConfiguration configuration,
        string key)
    {
        var value = RequireConfiguration(configuration, key);
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri)
            || !string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                $"Authentication configuration value '{key}' must be an HTTPS URI.");
        }

        return uri.AbsoluteUri.TrimEnd('/');
    }
}
