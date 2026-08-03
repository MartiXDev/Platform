namespace MartiX.Platform.Results;

/// <summary>
/// Transport-independent categories for expected application failures.
/// </summary>
public enum ErrorKind
{
    /// <summary>Submitted data is structurally or semantically invalid.</summary>
    Validation = 1,
    /// <summary>The understood request violates an application or domain rule.</summary>
    RuleViolation = 2,
    /// <summary>The requested business resource does not exist or must not be disclosed.</summary>
    NotFound = 3,
    /// <summary>Durable state conflicts with the requested transition.</summary>
    Conflict = 4,
    /// <summary>No acceptable authenticated principal is present.</summary>
    AuthenticationRequired = 5,
    /// <summary>The actor is known but is not authorized.</summary>
    Forbidden = 6,
    /// <summary>An explicit rate policy rejected the operation.</summary>
    RateLimited = 7,
    /// <summary>A required capability or dependency cannot complete expected work.</summary>
    Unavailable = 8,
    /// <summary>A safely translated failure is outside the expected business contract.</summary>
    Unexpected = 9,
}
