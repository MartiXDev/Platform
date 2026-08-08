using MartiX.Platform.EntityFrameworkCore.EntityTimestamps;

namespace MartiX.TemplateTestApp.Billing.Domain;

internal sealed class BillingAggregate :
    IHasEntityTimestamps,
    IHasConcurrencyToken
{
    public Guid Id { get; private set; } = Guid.NewGuid();

    public string Name { get; private set; } = "Billing";

    public DateTimeOffset CreatedAt { get; private set; }

    public DateTimeOffset UpdatedAt { get; private set; }

    public Guid ConcurrencyToken { get; private set; } = Guid.NewGuid();
}
