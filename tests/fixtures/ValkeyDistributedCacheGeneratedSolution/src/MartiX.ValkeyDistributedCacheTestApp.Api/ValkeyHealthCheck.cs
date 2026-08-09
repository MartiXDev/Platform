using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using StackExchange.Redis;

internal sealed class ValkeyHealthCheck : IHealthCheck
{
    private readonly IDistributedCache cache;

    public ValkeyHealthCheck(IDistributedCache cache)
    {
        this.cache = cache;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        _ = context;
        try
        {
            _ = await cache.GetAsync(
                ValkeyComposition.HealthProbeKey,
                cancellationToken);
            return HealthCheckResult.Healthy();
        }
        catch (RedisException)
        {
            return HealthCheckResult.Unhealthy(
                "The distributed cache is unavailable.");
        }
        catch (TimeoutException)
        {
            return HealthCheckResult.Unhealthy(
                "The distributed cache timed out.");
        }
    }
}
