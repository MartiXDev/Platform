using MartiX.TemplateTestApp.Orders;
using MartiX.TemplateTestApp.Billing;
using MartiX.Platform.EntityFrameworkCore.ReliableEvents;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace MartiX.TemplateTestApp.Infrastructure.IntegrationEvents;

internal static class ReliableEventsComposition
{
    public static void AddServices(IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);
        services.AddSingleton<IHostedService>(serviceProvider =>
        {
            var options = serviceProvider
                .GetRequiredService<ReliableEventsOptions>();
            var timeProvider = serviceProvider
                .GetRequiredService<TimeProvider>();
            return new ReliableEventsDispatcher(
                options,
                (batchSize, cancellationToken) =>
                    ClaimAsync(
                        serviceProvider,
                        batchSize,
                        timeProvider,
                        cancellationToken),
                (delivery, cancellationToken) =>
                    DispatchAsync(
                        serviceProvider,
                        delivery,
                        cancellationToken),
                serviceProvider
                    .GetRequiredService<ILogger<ReliableEventsDispatcher>>(),
                (delivery, cancellationToken) =>
                    AcknowledgeAsync(
                        serviceProvider,
                        delivery,
                        timeProvider,
                        cancellationToken),
                (delivery, failureCategory, failureDetail, cancellationToken) =>
                    ScheduleRetryAsync(
                        serviceProvider,
                        delivery,
                        failureCategory,
                        failureDetail,
                        timeProvider,
                        cancellationToken),
                (delivery, failureCategory, failureDetail, cancellationToken) =>
                    FailAsync(
                        serviceProvider,
                        delivery,
                        failureCategory,
                        failureDetail,
                        timeProvider,
                        cancellationToken));
        });
    }

    private static async ValueTask<IReadOnlyList<ReliableEventDelivery>> ClaimAsync(
        IServiceProvider services,
        int batchSize,
        TimeProvider timeProvider,
        CancellationToken cancellationToken)
    {
        var result = new List<ReliableEventDelivery>(batchSize);
        var remaining = batchSize;
        if (remaining > 0)
        {
            var claimedOrders =
                await OrdersModule.ClaimReliableEventsAsync(
                    services,
                    remaining,
                    timeProvider,
                    cancellationToken);
            result.AddRange(claimedOrders);
            remaining -= claimedOrders.Count;
        }
        if (remaining > 0)
        {
            var claimedBilling =
                await BillingModule.ClaimReliableEventsAsync(
                    services,
                    remaining,
                    timeProvider,
                    cancellationToken);
            result.AddRange(claimedBilling);
            remaining -= claimedBilling.Count;
        }
        return result;
    }

    private static ValueTask<ReliableEventDeliveryOutcome> DispatchAsync(
        IServiceProvider services,
        ReliableEventDelivery delivery,
        CancellationToken cancellationToken)
    {
        return delivery.SubscriptionId switch
        {
            "Orders" =>
                OrdersModule.DispatchReliableEventAsync(
                    services,
                    delivery,
                    cancellationToken),
            "Billing" =>
                BillingModule.DispatchReliableEventAsync(
                    services,
                    delivery,
                    cancellationToken),
            _ => new ValueTask<ReliableEventDeliveryOutcome>(
                ReliableEventDeliveryOutcome.PermanentFailure),
        };
    }

    private static ValueTask<bool> AcknowledgeAsync(
        IServiceProvider services,
        ReliableEventDelivery delivery,
        TimeProvider timeProvider,
        CancellationToken cancellationToken)
    {
        return delivery.Envelope.Publisher switch
        {
            "Orders" =>
                OrdersModule.AcknowledgeReliableEventAsync(
                    services,
                    delivery,
                    timeProvider,
                    cancellationToken),
            "Billing" =>
                BillingModule.AcknowledgeReliableEventAsync(
                    services,
                    delivery,
                    timeProvider,
                    cancellationToken),
            _ => new ValueTask<bool>(false),
        };
    }

    private static ValueTask<bool> ScheduleRetryAsync(
        IServiceProvider services,
        ReliableEventDelivery delivery,
        string failureCategory,
        string? failureDetail,
        TimeProvider timeProvider,
        CancellationToken cancellationToken)
    {
        return delivery.Envelope.Publisher switch
        {
            "Orders" =>
                OrdersModule.ScheduleReliableEventRetryAsync(
                    services,
                    delivery,
                    failureCategory,
                    failureDetail,
                    timeProvider,
                    cancellationToken),
            "Billing" =>
                BillingModule.ScheduleReliableEventRetryAsync(
                    services,
                    delivery,
                    failureCategory,
                    failureDetail,
                    timeProvider,
                    cancellationToken),
            _ => new ValueTask<bool>(false),
        };
    }

    private static ValueTask<bool> FailAsync(
        IServiceProvider services,
        ReliableEventDelivery delivery,
        string failureCategory,
        string? failureDetail,
        TimeProvider timeProvider,
        CancellationToken cancellationToken)
    {
        return delivery.Envelope.Publisher switch
        {
            "Orders" =>
                OrdersModule.FailReliableEventAsync(
                    services,
                    delivery,
                    failureCategory,
                    failureDetail,
                    timeProvider,
                    cancellationToken),
            "Billing" =>
                BillingModule.FailReliableEventAsync(
                    services,
                    delivery,
                    failureCategory,
                    failureDetail,
                    timeProvider,
                    cancellationToken),
            _ => new ValueTask<bool>(false),
        };
    }
}
