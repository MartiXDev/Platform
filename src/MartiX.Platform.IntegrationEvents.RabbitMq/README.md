# MartiX.Platform.IntegrationEvents.RabbitMq

RabbitMQ is an explicit transport adapter for the durable reliable-events
Outbox and Inbox protocol. The adapter is not registered unless the generated
solution selects the RabbitMQ broker provider.

The adapter declares a durable topic exchange and one durable queue per
subscription, uses persistent messages, publisher confirms, bounded prefetch,
and manual acknowledgements. The database-owned Outbox lease and Inbox receipt
remain authoritative for fencing, deduplication, retry, and terminal failure.

Supply `ConnectionStrings:RabbitMq` externally as an `amqp://` or `amqps://`
URI. Credentials, connection values, and broker containers are never generated
by the adapter.
