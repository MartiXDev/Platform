namespace MartiX.FullStackTestApp.Web.Platform.Authorization;

public enum AuthorizationState
{
    Anonymous,
    Authenticated,
    Denied,
    Expired,
}

public static class AuthorizationPolicy
{
    public static AuthorizationState Resolve(
        bool isAuthenticated,
        bool hasPermission,
        bool sessionExpired = false)
    {
        if (sessionExpired)
        {
            return AuthorizationState.Expired;
        }
        if (!isAuthenticated)
        {
            return AuthorizationState.Anonymous;
        }
        return hasPermission
            ? AuthorizationState.Authenticated
            : AuthorizationState.Denied;
    }
}
