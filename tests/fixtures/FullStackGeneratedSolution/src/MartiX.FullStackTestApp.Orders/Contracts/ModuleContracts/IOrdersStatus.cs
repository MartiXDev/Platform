namespace MartiX.FullStackTestApp.Orders.Contracts.ModuleContracts;

public interface IOrdersStatus
{
    Task<OrdersStatusResponse> GetStatusAsync(
        CancellationToken cancellationToken);
}

public sealed record OrdersStatusResponse(
    string Module,
    IReadOnlyList<string> Dependencies);
