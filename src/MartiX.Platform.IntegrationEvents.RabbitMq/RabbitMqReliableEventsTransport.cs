using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using MartiX.Platform.EntityFrameworkCore.ReliableEvents;
using Microsoft.Extensions.Logging;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace MartiX.Platform.IntegrationEvents.RabbitMq;

internal sealed class RabbitMqReliableEventsTransport : IReliableEventsTransport
{
    private readonly RabbitMqTransportOptions options;
    private readonly RabbitMqTransportDiagnostics diagnostics;
    private readonly RabbitMqConnectionManager connections;
    private readonly ILogger<RabbitMqReliableEventsTransport> logger;

    public RabbitMqReliableEventsTransport(
        RabbitMqTransportOptions options,
        RabbitMqTransportDiagnostics diagnostics,
        RabbitMqConnectionManager connections,
        ILogger<RabbitMqReliableEventsTransport> logger)
    {
        this.options = options ?? throw new ArgumentNullException(nameof(options));
        this.diagnostics = diagnostics
            ?? throw new ArgumentNullException(nameof(diagnostics));
        this.connections = connections
            ?? throw new ArgumentNullException(nameof(connections));
        this.logger = logger
            ?? throw new ArgumentNullException(nameof(logger));
        options.Validate();
    }

    public async ValueTask PublishAsync(
        ReliableEventDelivery delivery,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(delivery);
        await using var lease = await connections
            .CreateChannelAsync(publisherConfirms: true, cancellationToken)
            .ConfigureAwait(false);
        await RabbitMqTopology
            .DeclareAsync(lease.Channel, options, cancellationToken)
            .ConfigureAwait(false);

        using var activity = diagnostics.ActivitySource.StartActivity(
            "reliable-events.publish",
            ActivityKind.Producer);
        activity?.SetTag("messaging.system", "rabbitmq");
        activity?.SetTag("messaging.destination.name", options.Exchange);
        activity?.SetTag("messaging.rabbitmq.routing_key", delivery.SubscriptionId);
        activity?.SetTag("messaging.message.id", delivery.MessageId);
        activity?.SetTag("martix.reliable_events.event_name", delivery.Envelope.EventName);
        activity?.SetTag("martix.reliable_events.schema_version", delivery.Envelope.SchemaVersion);

        var headers = new Dictionary<string, object?>
        {
            ["martix-event-name"] = delivery.Envelope.EventName,
            ["martix-schema-version"] = delivery.Envelope.SchemaVersion,
            ["martix-publisher"] = delivery.Envelope.Publisher,
            ["martix-lease-id"] = delivery.LeaseId.ToString("D"),
        };
        if (delivery.Envelope.TraceParent is not null)
        {
            headers["traceparent"] = delivery.Envelope.TraceParent;
        }

        var properties = new BasicProperties
        {
            ContentType = "application/json",
            DeliveryMode = DeliveryModes.Persistent,
            MessageId = delivery.MessageId.ToString("D"),
            Type = delivery.Envelope.EventName,
            Headers = headers,
        };

        await lease.Channel.BasicPublishAsync(
            options.Exchange,
            delivery.SubscriptionId,
            mandatory: true,
            properties,
            RabbitMqEnvelopeSerializer.Serialize(delivery),
            cancellationToken).ConfigureAwait(false);
        diagnostics.Published.Add(1);
    }

    public async Task ConsumeAsync(
        Func<
            ReliableEventDelivery,
            CancellationToken,
            ValueTask<ReliableEventDeliveryOutcome>> handler,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(handler);
        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                await using var lease = await connections
                    .CreateChannelAsync(
                        publisherConfirms: false,
                        cancellationToken)
                    .ConfigureAwait(false);
                await RabbitMqTopology
                    .DeclareAsync(lease.Channel, options, cancellationToken)
                    .ConfigureAwait(false);
                await lease.Channel.BasicQosAsync(
                    prefetchSize: 0,
                    prefetchCount: options.PrefetchCount,
                    global: false,
                    cancellationToken).ConfigureAwait(false);

                var stopped = new TaskCompletionSource(
                    TaskCreationOptions.RunContinuationsAsynchronously);
                var consumer = new AsyncEventingBasicConsumer(lease.Channel);
                consumer.ReceivedAsync += (_, args) =>
                    HandleDeliveryAsync(
                        lease.Channel,
                        args,
                        handler,
                        cancellationToken);
                consumer.ShutdownAsync += (_, _) =>
                {
                    stopped.TrySetResult();
                    return Task.CompletedTask;
                };

                foreach (var subscription in options.Subscriptions)
                {
                    await lease.Channel.BasicConsumeAsync(
                        RabbitMqTopology.GetQueueName(
                            options.QueuePrefix,
                            subscription),
                        autoAck: false,
                        consumerTag: string.Empty,
                        noLocal: false,
                        exclusive: false,
                        arguments: null,
                        consumer,
                        cancellationToken).ConfigureAwait(false);
                }

                await stopped.Task.WaitAsync(cancellationToken).ConfigureAwait(false);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception exception)
            {
                diagnostics.ProviderFailures.Add(1);
                diagnostics.SetConnected(false);
                logger.LogWarning(
                    "RabbitMQ consumer connection failed with {ExceptionType}; retrying after a bounded delay.",
                    exception.GetType().Name);
                await Task.Delay(options.ReconnectDelay, cancellationToken)
                    .ConfigureAwait(false);
            }
        }
    }

    private async Task HandleDeliveryAsync(
        IChannel channel,
        BasicDeliverEventArgs args,
        Func<
            ReliableEventDelivery,
            CancellationToken,
            ValueTask<ReliableEventDeliveryOutcome>> handler,
        CancellationToken cancellationToken)
    {
        using var activity = diagnostics.ActivitySource.StartActivity(
            "reliable-events.consume",
            ActivityKind.Consumer);
        activity?.SetTag("messaging.system", "rabbitmq");
        activity?.SetTag("messaging.rabbitmq.routing_key", args.RoutingKey);
        activity?.SetTag("messaging.message.redelivered", args.Redelivered);

        ReliableEventDelivery delivery;
        try
        {
            delivery = RabbitMqEnvelopeSerializer.Deserialize(args.Body);
            if (string.IsNullOrWhiteSpace(delivery.SubscriptionId))
            {
                throw new InvalidOperationException(
                    "RabbitMQ delivered an empty reliable-event subscription.");
            }
            if (!string.Equals(
                    args.RoutingKey,
                    delivery.SubscriptionId,
                    StringComparison.Ordinal))
            {
                throw new InvalidOperationException(
                    "RabbitMQ routing key did not match the reliable-event subscription.");
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            await RequeueAsync(channel, args.DeliveryTag).ConfigureAwait(false);
            return;
        }
        catch (JsonException)
        {
            diagnostics.PoisonMessages.Add(1);
            await RejectAsync(channel, args.DeliveryTag).ConfigureAwait(false);
            return;
        }
        catch (ArgumentException exception)
        {
            diagnostics.PoisonMessages.Add(1);
            logger.LogError(
                "RabbitMQ rejected a malformed reliable-event message: {Detail}",
                exception.Message);
            await RejectAsync(channel, args.DeliveryTag).ConfigureAwait(false);
            return;
        }
        catch (InvalidOperationException exception)
        {
            diagnostics.PoisonMessages.Add(1);
            logger.LogError(
                "RabbitMQ rejected a malformed reliable-event message: {Detail}",
                exception.Message);
            await RejectAsync(channel, args.DeliveryTag).ConfigureAwait(false);
            return;
        }

        try
        {
            diagnostics.Consumed.Add(1);
            var outcome = await handler(delivery, cancellationToken)
                .ConfigureAwait(false);
            if (outcome == ReliableEventDeliveryOutcome.Cancelled)
            {
                await RequeueAsync(channel, args.DeliveryTag)
                    .ConfigureAwait(false);
                return;
            }

            await channel.BasicAckAsync(
                args.DeliveryTag,
                multiple: false,
                CancellationToken.None).ConfigureAwait(false);
            diagnostics.Acknowledged.Add(1);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            await RequeueAsync(channel, args.DeliveryTag).ConfigureAwait(false);
        }
        catch (Exception exception)
        {
            diagnostics.ProviderFailures.Add(1);
            logger.LogWarning(
                "RabbitMQ reliable-event processing failed with {ExceptionType}; requeueing the delivery.",
                exception.GetType().Name);
            await RequeueAsync(channel, args.DeliveryTag).ConfigureAwait(false);
        }
    }

    private async Task RequeueAsync(IChannel channel, ulong deliveryTag)
    {
        diagnostics.Requeued.Add(1);
        try
        {
            await channel.BasicNackAsync(
                deliveryTag,
                multiple: false,
                requeue: true,
                CancellationToken.None).ConfigureAwait(false);
        }
        catch (Exception exception)
        {
            logger.LogWarning(
                "RabbitMQ could not requeue delivery {DeliveryTag} because of {ExceptionType}; channel recovery will decide redelivery.",
                deliveryTag,
                exception.GetType().Name);
        }
    }

    private async Task RejectAsync(IChannel channel, ulong deliveryTag)
    {
        try
        {
            await channel.BasicNackAsync(
                deliveryTag,
                multiple: false,
                requeue: false,
                CancellationToken.None).ConfigureAwait(false);
        }
        catch (Exception exception)
        {
            logger.LogWarning(
                "RabbitMQ could not reject poison delivery {DeliveryTag} because of {ExceptionType}.",
                deliveryTag,
                exception.GetType().Name);
        }
    }
}
