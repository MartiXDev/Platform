using System.Diagnostics;
using System.Diagnostics.Metrics;

namespace MartiX.Platform.EntityFrameworkCore.ReliableEvents;

/// <summary>Vendor-neutral, bounded reliable-events observability instruments.</summary>
public static class ReliableEventsDiagnostics
{
    /// <summary>Stable meter identity.</summary>
    public const string MeterName = "MartiX.Platform.ReliableEvents";

    /// <summary>Stable activity source identity.</summary>
    public const string ActivitySourceName = "MartiX.Platform.ReliableEvents";

    /// <summary>Shared meter for host-owned exporter configuration.</summary>
    public static readonly Meter Meter = new(MeterName);

    /// <summary>Shared activity source for producer and consumer spans.</summary>
    public static readonly ActivitySource ActivitySource = new(ActivitySourceName);

    /// <summary>Messages captured atomically with business state.</summary>
    public static readonly Counter<long> Captured =
        Meter.CreateCounter<long>("captured");

    /// <summary>Delivery attempts claimed.</summary>
    public static readonly Counter<long> Attempted =
        Meter.CreateCounter<long>("attempted");

    /// <summary>Deliveries acknowledged by a consumer.</summary>
    public static readonly Counter<long> Acknowledged =
        Meter.CreateCounter<long>("acknowledged");

    /// <summary>Retries scheduled.</summary>
    public static readonly Counter<long> Retried =
        Meter.CreateCounter<long>("retried");

    /// <summary>Terminal delivery failures.</summary>
    public static readonly Counter<long> PermanentlyFailed =
        Meter.CreateCounter<long>("permanently-failed");

    /// <summary>Duplicate deliveries suppressed by an Inbox Receipt.</summary>
    public static readonly Counter<long> DuplicateSuppressed =
        Meter.CreateCounter<long>("duplicate-suppressed");

    /// <summary>Leases recovered after expiry.</summary>
    public static readonly Counter<long> LeaseExpired =
        Meter.CreateCounter<long>("lease-expired");

    /// <summary>Operator or migration replays.</summary>
    public static readonly Counter<long> Replayed =
        Meter.CreateCounter<long>("replayed");

    /// <summary>Rows removed by bounded retention cleanup.</summary>
    public static readonly Counter<long> Cleaned =
        Meter.CreateCounter<long>("cleaned");

    /// <summary>Capture-to-delivery latency.</summary>
    public static readonly Histogram<double> CaptureToDeliveryLatency =
        Meter.CreateHistogram<double>("capture-to-delivery-latency");

    /// <summary>Attempt duration.</summary>
    public static readonly Histogram<double> AttemptDuration =
        Meter.CreateHistogram<double>("attempt-duration");

    /// <summary>Retry delay.</summary>
    public static readonly Histogram<double> RetryDelay =
        Meter.CreateHistogram<double>("retry-delay");

    /// <summary>Registers a bounded pending-row observable for one host.</summary>
    public static ObservableGauge<long> CreatePendingGauge(Func<long> measurement)
    {
        ArgumentNullException.ThrowIfNull(measurement);
        return Meter.CreateObservableGauge("pending", measurement);
    }

    /// <summary>Registers a bounded failed-row observable for one host.</summary>
    public static ObservableGauge<long> CreateFailedGauge(Func<long> measurement)
    {
        ArgumentNullException.ThrowIfNull(measurement);
        return Meter.CreateObservableGauge("failed", measurement);
    }

    /// <summary>Registers the oldest pending age observable in seconds.</summary>
    public static ObservableGauge<double> CreateOldestPendingAgeGauge(
        Func<double> measurement)
    {
        ArgumentNullException.ThrowIfNull(measurement);
        return Meter.CreateObservableGauge("oldest-pending-age", measurement);
    }
}
