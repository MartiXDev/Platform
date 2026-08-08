namespace MartiX.Platform.Security;

/// <summary>
/// Describes the outcome recorded by a security audit event.
/// </summary>
public enum SecurityAuditOutcome
{
    Succeeded = 0,
    Denied = 1,
    Failed = 2,
}
