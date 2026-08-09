using System;
using System.Threading;
using System.Threading.Tasks;
using RabbitMQ.Client;
using Microsoft.Extensions.Logging;

namespace MartiX.Platform.IntegrationEvents.RabbitMq;

internal sealed class RabbitMqConnectionManager
{
    private readonly RabbitMqTransportOptions options;
    private readonly RabbitMqTransportDiagnostics diagnostics;
    private readonly ILogger<RabbitMqConnectionManager> logger;

    public RabbitMqConnectionManager(
        RabbitMqTransportOptions options,
        RabbitMqTransportDiagnostics diagnostics,
        ILogger<RabbitMqConnectionManager> logger)
    {
        this.options = options ?? throw new ArgumentNullException(nameof(options));
        this.diagnostics = diagnostics
            ?? throw new ArgumentNullException(nameof(diagnostics));
        this.logger = logger ?? throw new ArgumentNullException(nameof(logger));
        options.Validate();
    }

    public async Task<RabbitMqChannelLease> CreateChannelAsync(
        bool publisherConfirms,
        CancellationToken cancellationToken)
    {
        try
        {
            var factory = new ConnectionFactory
            {
                Uri = new Uri(options.ConnectionString, UriKind.Absolute),
                AutomaticRecoveryEnabled = true,
                TopologyRecoveryEnabled = true,
                ConsumerDispatchConcurrency = 1,
                ClientProvidedName = options.ClientProvidedName,
            };
            var connection = await factory
                .CreateConnectionAsync(cancellationToken)
                .ConfigureAwait(false);
            var channel = await connection
                .CreateChannelAsync(
                    new CreateChannelOptions(
                        publisherConfirmationsEnabled: publisherConfirms,
                        publisherConfirmationTrackingEnabled: publisherConfirms,
                        consumerDispatchConcurrency: 1),
                    cancellationToken)
                .ConfigureAwait(false);
            diagnostics.SetConnected(true);
            return new RabbitMqChannelLease(connection, channel);
        }
        catch
        {
            diagnostics.ProviderFailures.Add(1);
            diagnostics.SetConnected(false);
            logger.LogWarning(
                "RabbitMQ connection or channel creation failed; durable reliable-event state remains recoverable.");
            throw;
        }
    }
}

internal sealed class RabbitMqChannelLease : IAsyncDisposable
{
    public RabbitMqChannelLease(IConnection connection, IChannel channel)
    {
        Connection = connection ?? throw new ArgumentNullException(nameof(connection));
        Channel = channel ?? throw new ArgumentNullException(nameof(channel));
    }

    public IConnection Connection { get; }

    public IChannel Channel { get; }

    public async ValueTask DisposeAsync()
    {
        await Channel.DisposeAsync().ConfigureAwait(false);
        await Connection.DisposeAsync().ConfigureAwait(false);
    }
}
