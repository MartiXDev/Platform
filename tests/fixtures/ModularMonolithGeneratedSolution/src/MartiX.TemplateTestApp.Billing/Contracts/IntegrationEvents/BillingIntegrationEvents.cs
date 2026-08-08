using System.Text.Json.Serialization;

namespace MartiX.TemplateTestApp.Billing.Contracts.IntegrationEvents;

public sealed record BillingSubmittedV1(
    Guid EventId,
    Guid AggregateId,
    DateTimeOffset OccurredAtUtc)
{
    public const string EventName = "billing.submitted";
    public const int SchemaVersion = 1;
}

[JsonSourceGenerationOptions(
    PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(BillingSubmittedV1))]
public partial class BillingIntegrationEventJsonContext :
    JsonSerializerContext
{
}
