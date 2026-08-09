using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using RabbitMQ.Client;

namespace MartiX.Platform.IntegrationEvents.RabbitMq;

internal static class RabbitMqTopology
{
    public static async Task DeclareAsync(
        IChannel channel,
        RabbitMqTransportOptions options,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(channel);
        ArgumentNullException.ThrowIfNull(options);
        options.Validate();

        await channel.ExchangeDeclareAsync(
            options.Exchange,
            ExchangeType.Topic,
            durable: true,
            autoDelete: false,
            cancellationToken: cancellationToken).ConfigureAwait(false);
        foreach (var subscription in options.GetNormalizedSubscriptions())
        {
            var queue = GetQueueName(options.QueuePrefix, subscription);
            await channel.QueueDeclareAsync(
                queue,
                durable: true,
                exclusive: false,
                autoDelete: false,
                cancellationToken: cancellationToken).ConfigureAwait(false);
            await channel.QueueBindAsync(
                queue,
                options.Exchange,
                subscription,
                cancellationToken: cancellationToken).ConfigureAwait(false);
        }
    }

    public static string GetQueueName(string prefix, string subscription)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(prefix);
        ArgumentException.ThrowIfNullOrWhiteSpace(subscription);
        var normalizedPrefix = prefix.Trim();
        var normalizedSubscription = subscription.Trim();
        var builder = new StringBuilder(normalizedSubscription.Length);
        foreach (var character in normalizedSubscription)
        {
            builder.Append(
                char.IsLetterOrDigit(character) || character is '.' or '-' or '_'
                    ? character
                    : '-');
        }

        var safeSubscription = builder.ToString().Trim('-');
        if (safeSubscription.Length == 0)
        {
            safeSubscription = "subscription";
        }
        var suffix = Convert.ToHexString(
                SHA256.HashData(Encoding.UTF8.GetBytes(normalizedSubscription)))
            .ToLowerInvariant()[..12];
        var availableSubscriptionLength =
            255 - normalizedPrefix.Length - suffix.Length - 2;
        if (safeSubscription.Length > availableSubscriptionLength)
        {
            safeSubscription = safeSubscription[..availableSubscriptionLength]
                .Trim('-');
            if (safeSubscription.Length == 0)
            {
                safeSubscription = "subscription";
            }
        }

        return $"{normalizedPrefix}.{safeSubscription}.{suffix}";
    }
}
