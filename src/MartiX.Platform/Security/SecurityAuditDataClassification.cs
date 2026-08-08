namespace MartiX.Platform.Security;

/// <summary>
/// The highest data classification permitted in a security audit value.
/// </summary>
public enum SecurityAuditDataClassification
{
    Public = 0,
    Internal = 1,
    Personal = 2,
    Confidential = 3,
    Secret = 4,
}
