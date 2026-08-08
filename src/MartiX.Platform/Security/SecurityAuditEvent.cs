using System;
using System.Linq;
using System.Text.RegularExpressions;

namespace MartiX.Platform.Security;

/// <summary>
/// An immutable security audit record independent from diagnostic logs and
/// entity change history.
/// </summary>
public sealed record SecurityAuditEvent
{
    private static readonly Regex NamePattern = new(
        "^[a-z0-9]+(?:[.-][a-z0-9]+)*$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private SecurityAuditEvent(
        SecurityAuditEventId eventId,
        string name,
        int version,
        DateTimeOffset occurredAtUtc,
        ActorSnapshot initiatingActor,
        ActorSnapshot? effectiveActor,
        string action,
        SecurityAuditTarget? target,
        SecurityAuditOutcome outcome,
        string? reason,
        string source,
        SecurityAuditOrigin? origin,
        string? traceIdentity)
    {
        EventId = eventId;
        Name = name;
        Version = version;
        OccurredAtUtc = occurredAtUtc;
        InitiatingActor = initiatingActor;
        EffectiveActor = effectiveActor;
        Action = action;
        Target = target;
        Outcome = outcome;
        Reason = reason;
        Source = source;
        Origin = origin;
        TraceIdentity = traceIdentity;
    }

    /// <summary>Gets the UUID version 7 event identifier.</summary>
    public SecurityAuditEventId EventId { get; }

    /// <summary>Gets the stable event name.</summary>
    public string Name { get; }

    /// <summary>Gets the event schema version.</summary>
    public int Version { get; }

    /// <summary>Gets the UTC occurrence time.</summary>
    public DateTimeOffset OccurredAtUtc { get; }

    /// <summary>Gets the actor that initiated the action.</summary>
    public ActorSnapshot InitiatingActor { get; }

    /// <summary>Gets the effective actor after any explicit delegation.</summary>
    public ActorSnapshot? EffectiveActor { get; }

    /// <summary>Gets the application-owned action name.</summary>
    public string Action { get; }

    /// <summary>Gets the optional safe target reference.</summary>
    public SecurityAuditTarget? Target { get; }

    /// <summary>Gets the event outcome.</summary>
    public SecurityAuditOutcome Outcome { get; }

    /// <summary>Gets the optional safe reason code.</summary>
    public string? Reason { get; }

    /// <summary>Gets the application-owned event source.</summary>
    public string Source { get; }

    /// <summary>Gets the optional classified origin.</summary>
    public SecurityAuditOrigin? Origin { get; }

    /// <summary>Gets the optional W3C trace identity.</summary>
    public string? TraceIdentity { get; }

    /// <summary>
    /// Creates an immutable security audit event without arbitrary metadata.
    /// </summary>
    public static SecurityAuditEvent Create(
        string name,
        int version,
        DateTimeOffset occurredAtUtc,
        ActorSnapshot initiatingActor,
        string action,
        SecurityAuditOutcome outcome,
        string source,
        string? reason = null,
        SecurityAuditTarget? target = null,
        ActorSnapshot? effectiveActor = null,
        SecurityAuditOrigin? origin = null,
        string? traceIdentity = null,
        SecurityAuditEventId? eventId = null)
    {
        ArgumentNullException.ThrowIfNull(initiatingActor);
        ValidateName(name, nameof(name));
        if (version <= 0)
        {
            throw new ArgumentOutOfRangeException(
                nameof(version),
                "Audit event versions must be positive.");
        }

        if (occurredAtUtc.Offset != TimeSpan.Zero)
        {
            throw new ArgumentException(
                "Security audit event times must use UTC.",
                nameof(occurredAtUtc));
        }

        ValidateText(action, nameof(action), 100);
        ValidateText(source, nameof(source), 100);
        ValidateOptionalText(reason, nameof(reason), 200);
        ValidateTraceIdentity(traceIdentity);
        if (!Enum.IsDefined(outcome))
        {
            throw new ArgumentOutOfRangeException(nameof(outcome));
        }

        var resolvedEventId = eventId is { } suppliedEventId
            ? SecurityAuditEventId.Create(suppliedEventId.Value)
            : SecurityAuditEventId.New();

        return new SecurityAuditEvent(
            resolvedEventId,
            name,
            version,
            occurredAtUtc,
            initiatingActor,
            effectiveActor,
            action,
            target,
            outcome,
            reason,
            source,
            origin,
            traceIdentity);
    }

    private static void ValidateName(string value, string parameterName)
    {
        ArgumentNullException.ThrowIfNull(value);
        if (value.Length == 0 || value.Length > 100 || !NamePattern.IsMatch(value))
        {
            throw new ArgumentException(
                "Audit event names must use lowercase dot or hyphen separated segments.",
                parameterName);
        }
    }

    private static void ValidateText(string value, string parameterName, int maxLength)
    {
        ArgumentNullException.ThrowIfNull(value);
        if (value.Length == 0
            || value.Length > maxLength
            || value.Any(char.IsControl))
        {
            throw new ArgumentException(
                $"Audit values must be safe text of at most {maxLength} characters.",
                parameterName);
        }
    }

    private static void ValidateOptionalText(
        string? value,
        string parameterName,
        int maxLength)
    {
        if (value is not null)
        {
            ValidateText(value, parameterName, maxLength);
        }
    }

    private static void ValidateTraceIdentity(string? traceIdentity)
    {
        if (traceIdentity is null)
        {
            return;
        }

        if (traceIdentity.Length != 32
            || traceIdentity.Any(character => !Uri.IsHexDigit(character)))
        {
            throw new ArgumentException(
                "Trace identities must be 32 hexadecimal W3C trace-id characters.",
                nameof(traceIdentity));
        }
    }
}
