namespace MartiX.FeatureManagementTestApp;

public sealed record CheckoutDecision(
    string OrderId,
    string Variant,
    bool Authorized);

public static class DurableCheckoutState
{
    public static CheckoutDecision CaptureDecision(
        string orderId,
        string variant,
        bool authorized)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(orderId);
        ArgumentException.ThrowIfNullOrWhiteSpace(variant);
        return new CheckoutDecision(orderId, variant, authorized);
    }
}
