namespace MartiX.FeatureManagementTestApp;

public static class AuthorizationPolicy
{
    public const string RequiredPermission = "checkout.execute";

    public static bool Allows(IReadOnlySet<string> permissions)
    {
        ArgumentNullException.ThrowIfNull(permissions);
        return permissions.Contains(RequiredPermission);
    }
}
