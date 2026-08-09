using System.Diagnostics.Metrics;
using System.Security.Claims;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.StackExchangeRedis;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using StackExchange.Redis;

var builder = WebApplication.CreateBuilder(args);
ValkeyComposition.ConfigureBuilder(builder);
ValkeyComposition.ConfigureServices(
    builder.Services,
    builder.Configuration,
    builder.Environment);

var app = builder.Build();
ValkeyComposition.Configure(app);
app.Run();

public static class ValkeyComposition
{
    public const string AuthenticationScheme = "conformance";
    public const string CacheProvider = "valkey";
    public const string CacheInstanceName = "martix:valkey:";
    public const string CacheReaderPolicy = "cache-reader";
    public const string MeterName = "MartiX.ValkeyDistributedCache";
    public const string HealthProbeKey = "__martix/health";

    private static readonly Meter Meter = new(MeterName);
    private static readonly Counter<long> CacheFailures =
        Meter.CreateCounter<long>("martix.cache.failures");

    public static void ConfigureBuilder(WebApplicationBuilder builder)
    {
        ValidateStartup(builder.Configuration, builder.Environment);
    }

    public static void ValidateStartup(
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        _ = environment;
        _ = RequireConnectionString(configuration);
        if (!string.Equals(
                configuration["DistributedCache:Provider"],
                CacheProvider,
                StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "DistributedCache:Provider must be valkey.");
        }
    }

    public static void ConfigureServices(
        IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        ValidateStartup(configuration, environment);
        var options = CreateConfigurationOptions(
            RequireConnectionString(configuration));

        services.AddStackExchangeRedisCache(redis =>
        {
            redis.ConfigurationOptions = options;
            redis.InstanceName = CacheInstanceName;
        });
        services.AddAuthentication(AuthenticationScheme)
            .AddScheme<AuthenticationSchemeOptions, ConformanceAuthenticationHandler>(
                AuthenticationScheme,
                static _ => { });
        services.AddAuthorizationBuilder()
            .AddPolicy(
                CacheReaderPolicy,
                policy => policy.RequireAuthenticatedUser());
        services.AddSingleton<BusinessStatusStore>();
        services.AddHealthChecks()
            .AddCheck<ValkeyHealthCheck>(
                "distributed-cache",
                tags: new[] { "cache" },
                timeout: TimeSpan.FromSeconds(2))
            .AddCheck(
                "business",
                () => HealthCheckResult.Healthy(),
                tags: new[] { "live", "ready" });
        services.AddMetrics().AddMeter(MeterName);
    }

    public static void Configure(WebApplication app)
    {
        app.UseAuthentication();
        app.UseAuthorization();

        app.MapHealthChecks(
                "/alive",
                new HealthCheckOptions
                {
                    Predicate = check => check.Tags.Contains("live"),
                })
            .AllowAnonymous();
        app.MapHealthChecks(
                "/ready",
                new HealthCheckOptions
                {
                    Predicate = check => check.Tags.Contains("ready"),
                })
            .AllowAnonymous();
        app.MapHealthChecks(
                "/cache/ready",
                new HealthCheckOptions
                {
                    Predicate = check => check.Tags.Contains("cache"),
                })
            .AllowAnonymous();

        var versionOne = app.MapGroup("/api/v1");
        versionOne.MapGet(
                "/status/{key}",
                ReadStatusAsync)
            .AllowAnonymous();
        versionOne.MapGet(
                "/protected-status/{key}",
                ReadStatusAsync)
            .RequireAuthorization(CacheReaderPolicy);
    }

    private static async Task<IResult> ReadStatusAsync(
        string key,
        IDistributedCache cache,
        BusinessStatusStore store,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        var logger = loggerFactory.CreateLogger("ValkeyDistributedCache");
        var normalizedKey = NormalizeKey(key);
        var cacheKey = $"{CacheInstanceName}status:v1:{normalizedKey}";
        var cached = await TryGetAsync(
            cache,
            cacheKey,
            logger,
            cancellationToken);
        if (cached is not null)
        {
            try
            {
                var cachedStatus = JsonSerializer.Deserialize<BusinessStatus>(
                    cached,
                    JsonOptions);
                if (cachedStatus is not null)
                {
                    return TypedResults.Ok(cachedStatus);
                }
            }
            catch (JsonException exception)
            {
                logger.LogWarning(
                    exception,
                    "The distributed cache returned an invalid status payload.");
            }
        }

        var businessStatus = store.Read(normalizedKey);
        var serialized = JsonSerializer.SerializeToUtf8Bytes(
            businessStatus,
            JsonOptions);
        await TrySetAsync(
            cache,
            cacheKey,
            serialized,
            logger,
            cancellationToken);
        return TypedResults.Ok(businessStatus);
    }

    private static readonly JsonSerializerOptions JsonOptions = new(
        JsonSerializerDefaults.Web);

    private static async Task<byte[]?> TryGetAsync(
        IDistributedCache cache,
        string cacheKey,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        try
        {
            return await cache.GetAsync(cacheKey, cancellationToken);
        }
        catch (RedisException exception)
        {
            RecordCacheFailure(logger, exception, "get");
            return null;
        }
        catch (TimeoutException exception)
        {
            RecordCacheFailure(logger, exception, "get");
            return null;
        }
    }

    private static async Task TrySetAsync(
        IDistributedCache cache,
        string cacheKey,
        byte[] value,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        try
        {
            await cache.SetAsync(
                cacheKey,
                value,
                new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(30),
                    SlidingExpiration = null,
                },
                cancellationToken);
        }
        catch (RedisException exception)
        {
            RecordCacheFailure(logger, exception, "set");
        }
        catch (TimeoutException exception)
        {
            RecordCacheFailure(logger, exception, "set");
        }
    }

    private static void RecordCacheFailure(
        ILogger logger,
        Exception exception,
        string operation)
    {
        CacheFailures.Add(
            1,
            new KeyValuePair<string, object?>("operation", operation));
        logger.LogWarning(
            exception,
            "Distributed cache {CacheOperation} failed; the business result remains authoritative.",
            operation);
    }

    private static ConfigurationOptions CreateConfigurationOptions(
        string connectionString)
    {
        var options = ConfigurationOptions.Parse(connectionString);
        options.AbortOnConnectFail = false;
        options.ConnectRetry = 3;
        options.ConnectTimeout = 1000;
        options.AsyncTimeout = 1000;
        options.SyncTimeout = 1000;
        return options;
    }

    private static string RequireConnectionString(IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DistributedCache");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "ConnectionStrings:DistributedCache is required.");
        }

        return connectionString;
    }

    private static string NormalizeKey(string key)
    {
        var normalized = key.Trim();
        if (normalized.Length is 0 or > 100 || normalized.Any(char.IsControl))
        {
            throw new BadHttpRequestException("Cache key is invalid.");
        }

        return normalized;
    }
}

public sealed record BusinessStatus(string Key, string Value);

public sealed class BusinessStatusStore
{
    public BusinessStatus Read(string key)
    {
        return new BusinessStatus(key, $"business:{key}");
    }
}

internal sealed class ConformanceAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public ConformanceAuthenticationHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder)
        : base(options, logger, encoder)
    {
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue("X-Conformance-Actor", out var actor)
            || string.IsNullOrWhiteSpace(actor.ToString()))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var identity = new ClaimsIdentity(
            new[] { new Claim(ClaimTypes.NameIdentifier, actor.ToString()) },
            Scheme.Name);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, Scheme.Name);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
