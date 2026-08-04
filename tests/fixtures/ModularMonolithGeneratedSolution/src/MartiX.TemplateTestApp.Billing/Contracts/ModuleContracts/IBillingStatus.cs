namespace MartiX.TemplateTestApp.Billing.Contracts.ModuleContracts;

public interface IBillingStatus
{
    Task<BillingStatusResponse> GetStatusAsync(
        CancellationToken cancellationToken);
}

public sealed record BillingStatusResponse(
    string Module,
    IReadOnlyList<string> Dependencies);
