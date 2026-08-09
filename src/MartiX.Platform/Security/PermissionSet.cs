using System;
using System.Collections.Generic;
using System.Collections.Frozen;
using System.Linq;

namespace MartiX.Platform.Security;

/// <summary>
/// An immutable set of normalized application permissions.
/// </summary>
public sealed class PermissionSet
{
    private PermissionSet(FrozenSet<Permission> permissions)
    {
        Permissions = permissions;
    }

    /// <summary>Gets an empty permission set.</summary>
    public static PermissionSet Empty { get; } =
        new(Array.Empty<Permission>().ToFrozenSet());

    /// <summary>Gets the immutable permission values.</summary>
    public IReadOnlySet<Permission> Permissions { get; }

    /// <summary>Gets the number of permissions in the set.</summary>
    public int Count => Permissions.Count;

    /// <summary>Creates an immutable set from normalized permission values.</summary>
    public static PermissionSet Create(IEnumerable<Permission> permissions)
    {
        ArgumentNullException.ThrowIfNull(permissions);
        return new(permissions.ToFrozenSet());
    }

    /// <summary>Checks whether the set contains a permission.</summary>
    public bool Contains(Permission permission) => Permissions.Contains(permission);
}
