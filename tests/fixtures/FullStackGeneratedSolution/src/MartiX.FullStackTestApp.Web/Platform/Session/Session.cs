using System.Security.Claims;
using Microsoft.AspNetCore.Components.Authorization;
using Microsoft.AspNetCore.Http;
using MartiX.FullStackTestApp.Web.Platform.Api;

namespace MartiX.FullStackTestApp.Web.Platform.Session;

public enum SessionStateKind
{
    Anonymous,
    Authenticated,
    Denied,
    Expired,
}

public sealed record SessionState(
    SessionStateKind Kind,
    string? ActorId = null,
    string? DisplayName = null)
{
    public const string Owner = "server-bff";
    public static SessionState Anonymous { get; } = new(SessionStateKind.Anonymous);
    public static SessionState Denied { get; } = new(SessionStateKind.Denied);
    public static SessionState Expired { get; } = new(SessionStateKind.Expired);

    public static SessionState FromPrincipal(ClaimsPrincipal? principal)
    {
        if (principal?.Identity?.IsAuthenticated != true)
        {
            return Anonymous;
        }

        var actorId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return string.IsNullOrWhiteSpace(actorId)
            ? Anonymous
            : new SessionState(
                SessionStateKind.Authenticated,
                actorId,
                principal.FindFirst(ClaimTypes.Name)?.Value);
    }
}

public sealed class ServerSessionAuthenticationStateProvider
    : AuthenticationStateProvider, IApiCredentialProvider
{
    private readonly IHttpContextAccessor httpContextAccessor;
    private SessionState session = SessionState.Anonymous;

    public ServerSessionAuthenticationStateProvider(
        IHttpContextAccessor httpContextAccessor)
    {
        this.httpContextAccessor = httpContextAccessor ??
            throw new ArgumentNullException(nameof(httpContextAccessor));
        session = SessionState.FromPrincipal(httpContextAccessor.HttpContext?.User);
    }

    public SessionState Current => session;

    public override Task<AuthenticationState> GetAuthenticationStateAsync()
    {
        var current = session.Kind == SessionStateKind.Anonymous
            ? SessionState.FromPrincipal(httpContextAccessor.HttpContext?.User)
            : session;
        return Task.FromResult(new AuthenticationState(CreatePrincipal(current)));
    }

    public void Publish(SessionState next)
    {
        ArgumentNullException.ThrowIfNull(next);
        session = next;
        NotifyAuthenticationStateChanged(
            Task.FromResult(new AuthenticationState(CreatePrincipal(next))));
    }

    public ValueTask<string?> GetAccessTokenAsync(
        CancellationToken cancellationToken) =>
        // The BFF keeps delegated credentials on the server. An authentication
        // provider can replace this seam without exposing a token to components.
        ValueTask.FromResult<string?>(null);

    private static ClaimsPrincipal CreatePrincipal(SessionState value)
    {
        var identity = value.Kind == SessionStateKind.Authenticated
            ? new ClaimsIdentity(
                new[]
                {
                    new Claim(
                        ClaimTypes.NameIdentifier,
                        value.ActorId ?? string.Empty),
                    new Claim(ClaimTypes.Name, value.DisplayName ?? string.Empty),
                },
                "server-session")
            : new ClaimsIdentity();
        return new ClaimsPrincipal(identity);
    }
}
