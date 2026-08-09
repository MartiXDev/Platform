using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using MartiX.Platform.Security;

namespace MartiX.TemplateTestApp.Api.Infrastructure.Identity;

internal static class ActorAuthorization
{
    public static ActorContext Resolve(
        ClaimsPrincipal? principal,
        string? fallbackIssuer = null)
    {
        if (principal?.Identity?.IsAuthenticated != true)
        {
            return ActorContext.Anonymous();
        }

        var subject = principal.FindFirst("sub")?.Value?.Trim()
            ?? principal.FindFirst(ClaimTypes.NameIdentifier)?.Value?.Trim();
        var issuer = principal.FindFirst("iss")?.Value?.Trim()
            ?? fallbackIssuer?.Trim();
        if (string.IsNullOrWhiteSpace(subject)
            || string.IsNullOrWhiteSpace(issuer))
        {
            return ActorContext.Unresolved();
        }

        var key = Encoding.UTF8.GetBytes($"{issuer}\0{subject}");
        var digest = SHA256.HashData(key);
        var actorId = ActorId.Create(new Guid(digest.AsSpan(0, 16)));
        var displayName = SafeDisplayName(
            principal.FindFirst("name")?.Value
                ?? principal.FindFirst(ClaimTypes.DisplayName)?.Value);
        return ActorContext.Create(
            ActorSnapshot.Human(actorId, displayName),
            MapPermissions(principal));
    }

    private static PermissionSet MapPermissions(ClaimsPrincipal principal)
    {
        var permissions = new List<Permission>();
        var claimCount = 0;
        foreach (var claim in principal.Claims.Where(claim =>
                     claim.Type is "permissions" or "scope" or "scp" or "roles"
                         || claim.Type == ClaimTypes.Role))
        {
            if (++claimCount > 64)
            {
                return PermissionSet.Empty;
            }

            foreach (var value in claim.Value.Split(
                         new[] { ' ', ',', ';' },
                         StringSplitOptions.RemoveEmptyEntries))
            {
                if (Permission.TryCreate(value, out var permission))
                {
                    permissions.Add(permission);
                }
            }
        }

        return PermissionSet.Create(permissions);
    }

    private static string? SafeDisplayName(string? value)
    {
        var normalized = value?.Trim();
        return string.IsNullOrWhiteSpace(normalized)
            || normalized.Length > 200
            || normalized.Any(char.IsControl)
            ? null
            : normalized;
    }
}
