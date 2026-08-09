using System;
using System.Diagnostics;
using System.Diagnostics.Metrics;
using System.Threading;

namespace MartiX.Platform.IntegrationEvents.RabbitMq;

/// <summary>Bounded RabbitMQ transport metrics, activities, and health state.</summary>
public sealed class RabbitMqTransportDiagnostics : IDisposable
{
    /// <summary>Stable meter identity.</summary>
    public const string MeterName = "MartiX.Platform.RabbitMq";

    /// <summary>Stable activity source identity.</summary>
    public const string ActivitySourceName = "MartiX.Platform.RabbitMq";

    private int connected;

    /// <summary>Creates the provider diagnostics instruments.</summary>
    public RabbitMqTransportDiagnostics()
    {
        Meter = new Meter(MeterName);
        ActivitySource = new ActivitySource(ActivitySourceName);
        Published = Meter.CreateCounter<long>("published");
        Consumed = Meter.CreateCounter<long>("consumed");
        Acknowledged = Meter.CreateCounter<long>("acknowledged");
        Requeued = Meter.CreateCounter<long>("requeued");
        ProviderFailures = Meter.CreateCounter<long>("provider-failures");
        PoisonMessages = Meter.CreateCounter<long>("poison-messages");
    }

    /// <summary>Provider meter.</summary>
    public Meter Meter { get; }

    /// <summary>Provider activity source.</summary>
    public ActivitySource ActivitySource { get; }

    /// <summary>Confirmed durable publishes.</summary>
    public Counter<long> Published { get; }

    /// <summary>Messages handed to the durable Inbox pipeline.</summary>
    public Counter<long> Consumed { get; }

    /// <summary>Messages acknowledged after durable settlement.</summary>
    public Counter<long> Acknowledged { get; }

    /// <summary>Messages returned to the broker for redelivery.</summary>
    public Counter<long> Requeued { get; }

    /// <summary>Connection, topology, or publish failures.</summary>
    public Counter<long> ProviderFailures { get; }

    /// <summary>Malformed messages rejected without requeue.</summary>
    public Counter<long> PoisonMessages { get; }

    /// <summary>Whether the most recent connection attempt is healthy.</summary>
    public bool IsConnected => Volatile.Read(ref connected) == 1;

    /// <summary>Records provider connection state for health checks.</summary>
    public void SetConnected(bool value)
    {
        Volatile.Write(ref connected, value ? 1 : 0);
    }

    /// <inheritdoc />
    public void Dispose()
    {
        ActivitySource.Dispose();
        Meter.Dispose();
    }
}
