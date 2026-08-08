using System.Diagnostics;
using System.Diagnostics.Metrics;
using Microsoft.Extensions.Diagnostics.Metrics;

namespace MartiX.Platform.EntityFrameworkCore.ReliableEvents;

/// <summary>Vendor-neutral, bounded reliable-events observability instruments.</summary>
public sealed class ReliableEventsDiagnostics
{
    /// <summary>Stable meter identity.</summary>
    public const string MeterName = "MartiX.Platform.ReliableEvents";

    /// <summary>Stable activity source identity.</summary>
    public const string ActivitySourceName = "MartiX.Platform.ReliableEvents";

    /// <summary>Shared activity source for producer and consumer spans.</summary>
    public static readonly ActivitySource ActivitySource = new(ActivitySourceName);

    /// <summary>Creates reliable-events instruments through the host meter factory.</summary>
    public ReliableEventsDiagnostics(IMeterFactory meterFactory)
    {
        ArgumentNullException.ThrowIfNull(meterFactory);
        Meter = meterFactory.Create(MeterName);
        Captured = Meter.CreateCounter<long>("captured");
        Attempted = Meter.CreateCounter<long>("attempted");
        Acknowledged = Meter.CreateCounter<long>("acknowledged");
        Retried = Meter.CreateCounter<long>("retried");
        PermanentlyFailed = Meter.CreateCounter<long>("permanently-failed");
        DuplicateSuppressed = Meter.CreateCounter<long>("duplicate-suppressed");
        LeaseExpired = Meter.CreateCounter<long>("lease-expired");
        Replayed = Meter.CreateCounter<long>("replayed");
        Cleaned = Meter.CreateCounter<long>("cleaned");
        CaptureToDeliveryLatency =
            Meter.CreateHistogram<double>("capture-to-delivery-latency");
        AttemptDuration = Meter.CreateHistogram<double>("attempt-duration");
        RetryDelay = Meter.CreateHistogram<double>("retry-delay");
    }

    /// <summary>Meter created by the host's meter factory.</summary>
    public Meter Meter { get; }

    /// <summary>Messages captured atomically with business state.</summary>
    public Counter<long> Captured { get; }

    /// <summary>Delivery attempts claimed.</summary>
    public Counter<long> Attempted { get; }

    /// <summary>Deliveries acknowledged by a consumer.</summary>
    public Counter<long> Acknowledged { get; }

    /// <summary>Retries scheduled.</summary>
    public Counter<long> Retried { get; }

    /// <summary>Terminal delivery failures.</summary>
    public Counter<long> PermanentlyFailed { get; }

    /// <summary>Duplicate deliveries suppressed by an Inbox Receipt.</summary>
    public Counter<long> DuplicateSuppressed { get; }

    /// <summary>Leases recovered after expiry.</summary>
    public Counter<long> LeaseExpired { get; }

    /// <summary>Operator or migration replays.</summary>
    public Counter<long> Replayed { get; }

    /// <summary>Rows removed by bounded retention cleanup.</summary>
    public Counter<long> Cleaned { get; }

    /// <summary>Capture-to-delivery latency.</summary>
    public Histogram<double> CaptureToDeliveryLatency { get; }

    /// <summary>Attempt duration.</summary>
    public Histogram<double> AttemptDuration { get; }

    /// <summary>Retry delay.</summary>
    public Histogram<double> RetryDelay { get; }

    /// <summary>Registers a bounded pending-row observable for one host.</summary>
    public ObservableGauge<long> CreatePendingGauge(Func<long> measurement)
    {
        ArgumentNullException.ThrowIfNull(measurement);
        return Meter.CreateObservableGauge("pending", measurement);
    }

    /// <summary>Registers a bounded failed-row observable for one host.</summary>
    public ObservableGauge<long> CreateFailedGauge(Func<long> measurement)
    {
        ArgumentNullException.ThrowIfNull(measurement);
        return Meter.CreateObservableGauge("failed", measurement);
    }

    /// <summary>Registers the oldest pending age observable in seconds.</summary>
    public ObservableGauge<double> CreateOldestPendingAgeGauge(
        Func<double> measurement)
    {
        ArgumentNullException.ThrowIfNull(measurement);
        return Meter.CreateObservableGauge("oldest-pending-age", measurement);
    }
}
