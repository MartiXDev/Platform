using System.Text.Json.Serialization;

namespace MartiX.FullStackTestApp.Orders.Contracts.IntegrationEvents;

public sealed record OrdersSubmittedV1(
    Guid EventId,
    Guid AggregateId,
    DateTimeOffset OccurredAtUtc)
{
    public const string EventName = "orders.submitted";
    public const int SchemaVersion = 1;
}

[JsonSourceGenerationOptions(
    PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(OrdersSubmittedV1))]
public partial class OrdersIntegrationEventJsonContext :
    JsonSerializerContext
{
}
