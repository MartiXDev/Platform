using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace MartiX.Platform.IntegrationEvents.RabbitMq;

/// <summary>Validated RabbitMQ transport settings.</summary>
public sealed class RabbitMqTransportOptions
{
    /// <summary>AMQP or AMQPS connection URI supplied by external configuration.</summary>
    public string ConnectionString { get; init; } = string.Empty;

    /// <summary>Durable topic exchange used by the adapter.</summary>
    public string Exchange { get; init; } = "martix.integration-events";

    /// <summary>Prefix used for durable subscription queues.</summary>
    public string QueuePrefix { get; init; } = "martix.integration-events";

    /// <summary>Bounded unacknowledged delivery count per consumer channel.</summary>
    public ushort PrefetchCount { get; init; } = 32;

    /// <summary>Maximum durable deliveries claimed per publishing poll.</summary>
    public int PublishBatchSize { get; init; } = 50;

    /// <summary>Delay between publishing polls with no due work.</summary>
    public TimeSpan PublishPollInterval { get; init; } = TimeSpan.FromSeconds(1);

    /// <summary>Delay before reconnecting after a provider outage.</summary>
    public TimeSpan ReconnectDelay { get; init; } = TimeSpan.FromSeconds(5);

    /// <summary>Human-readable client name shown by RabbitMQ management tools.</summary>
    public string ClientProvidedName { get; init; } = "martix-reliable-events";

    /// <summary>Explicit subscription identities served by this host.</summary>
    public IReadOnlyList<string> Subscriptions { get; init; } =
        Array.Empty<string>();

    /// <summary>Validates provider, topology, and bounded operational settings.</summary>
    public void Validate()
    {
        _ = GetNormalizedSubscriptions();
    }

    internal IReadOnlyList<string> GetNormalizedSubscriptions()
    {
        ValidateSettings();
        return NormalizeSubscriptions(Subscriptions);
    }

    internal string NormalizeConfiguredSubscription(string subscription)
    {
        var normalized = NormalizeSubscription(subscription);
        if (!GetNormalizedSubscriptions().Contains(
                normalized,
                StringComparer.Ordinal))
        {
            throw new InvalidOperationException(
                "RabbitMQ subscription is not configured.");
        }

        return normalized;
    }

    private void ValidateSettings()
    {
        if (!Uri.TryCreate(ConnectionString, UriKind.Absolute, out var uri) ||
            (uri.Scheme != "amqp" && uri.Scheme != "amqps") ||
            string.IsNullOrWhiteSpace(uri.Host))
        {
            throw new InvalidOperationException(
                "RabbitMQ requires an external amqp:// or amqps:// connection URI.");
        }

        ValidateBounded(Exchange, nameof(Exchange), 200);
        ValidateBounded(QueuePrefix, nameof(QueuePrefix), 120);
        ValidateBounded(ClientProvidedName, nameof(ClientProvidedName), 128);
        if (PrefetchCount == 0 || PrefetchCount > 1000)
        {
            throw new InvalidOperationException(
                "RabbitMQ prefetch must be between 1 and 1000.");
        }
        if (PublishBatchSize <= 0 || PublishBatchSize > 1000)
        {
            throw new InvalidOperationException(
                "RabbitMQ publish batch size must be between 1 and 1000.");
        }
        if (PublishPollInterval <= TimeSpan.Zero ||
            ReconnectDelay <= TimeSpan.Zero)
        {
            throw new InvalidOperationException(
                "RabbitMQ polling and reconnect delays must be positive.");
        }
    }

    /// <summary>Returns a copy with the generated subscription identities.</summary>
    public RabbitMqTransportOptions WithSubscriptions(
        IReadOnlyList<string> subscriptions)
    {
        ArgumentNullException.ThrowIfNull(subscriptions);
        return new RabbitMqTransportOptions
        {
            ConnectionString = ConnectionString,
            Exchange = Exchange,
            QueuePrefix = QueuePrefix,
            PrefetchCount = PrefetchCount,
            PublishBatchSize = PublishBatchSize,
            PublishPollInterval = PublishPollInterval,
            ReconnectDelay = ReconnectDelay,
            ClientProvidedName = ClientProvidedName,
            Subscriptions = NormalizeSubscriptions(subscriptions),
        };
    }

    private static string[] NormalizeSubscriptions(
        IReadOnlyList<string> subscriptions)
    {
        ArgumentNullException.ThrowIfNull(subscriptions);
        if (subscriptions.Count == 0)
        {
            throw new InvalidOperationException(
                "RabbitMQ requires at least one explicit subscription.");
        }

        var normalizedSubscriptions = subscriptions
            .Select(subscription => NormalizeSubscription(subscription))
            .ToArray();
        if (normalizedSubscriptions.Distinct(StringComparer.Ordinal).Count() !=
            normalizedSubscriptions.Length)
        {
            throw new InvalidOperationException(
                "RabbitMQ subscription identities must be unique.");
        }

        return normalizedSubscriptions;
    }

    private static string NormalizeSubscription(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException(
                "RabbitMQ subscription identities must be non-empty.");
        }

        var normalized = value.Trim();
        if (normalized.Length > 200)
        {
            throw new InvalidOperationException(
                "RabbitMQ subscription identities cannot exceed 200 characters.");
        }
        if (normalized.Contains('*') || normalized.Contains('#'))
        {
            throw new InvalidOperationException(
                "RabbitMQ subscription identities cannot contain topic wildcards.");
        }
        if (Encoding.UTF8.GetByteCount(normalized) > 255)
        {
            throw new InvalidOperationException(
                "RabbitMQ subscription identities cannot exceed 255 UTF-8 bytes.");
        }

        return normalized;
    }

    private static void ValidateBounded(
        string value,
        string name,
        int maximumLength)
    {
        if (string.IsNullOrWhiteSpace(value) ||
            value.Trim().Length > maximumLength)
        {
            throw new InvalidOperationException(
                $"RabbitMQ {name} must be non-empty and at most {maximumLength} characters.");
        }
    }
}
