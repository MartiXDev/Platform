export const HOST_BASELINE_CAPABILITIES = Object.freeze([
  "host.security",
  "host.authorization",
  "host.observability",
  "host.health-readiness",
  "host.overload-resilience",
]);

export const HOST_BASELINE_SOURCE_PATH =
  "Infrastructure/Host/HostSecurity.cs";

export function renderHostSecurityFile(
  applicationName,
  authenticationProfile = "none",
  otlpExporter = false,
) {
  const openTelemetryRegistration = otlpExporter
    ? String.raw`        services.AddOpenTelemetry()
            .WithTracing(tracing =>
                tracing
                    .AddAspNetCoreInstrumentation()
                    .AddHttpClientInstrumentation()
                    .AddSource(HostTelemetry.ActivitySourceName)
                    .AddProcessor(new OtlpActivityRedactionProcessor())
                    .AddOtlpExporter(options =>
                    {
                        OtlpExportConfiguration.Configure(options, configuration);
                    }))
            .WithMetrics(metrics =>
                metrics
                    .AddMeter(
                        HostTelemetry.MeterName,
                        "Microsoft.AspNetCore.Hosting",
                        "Microsoft.AspNetCore.Server.Kestrel",
                        "Microsoft.Extensions.Diagnostics.HealthChecks",
                        "System.Net.Http",
                        "System.Net.NameResolution",
                        "System.Runtime")
                    .AddOtlpExporter((options, readerOptions) =>
                    {
                        OtlpExportConfiguration.Configure(options, configuration);
                        readerOptions.PeriodicExportingMetricReaderOptions
                            .ExportIntervalMilliseconds =
                            OtlpExportConfiguration.ScheduledDelayMilliseconds;
                        readerOptions.PeriodicExportingMetricReaderOptions
                            .ExportTimeoutMilliseconds =
                            OtlpExportConfiguration.ExporterTimeoutMilliseconds;
                    }))
            .WithLogging(logging =>
            {
                logging.AddProcessor(new OtlpLogRedactionProcessor());
                logging.AddOtlpExporter((options, processorOptions) =>
                {
                    OtlpExportConfiguration.Configure(options, configuration);
                    processorOptions.ExportProcessorType =
                        ExportProcessorType.Batch;
                    processorOptions.BatchExportProcessorOptions.MaxQueueSize =
                        OtlpExportConfiguration.MaxQueueSize;
                    processorOptions.BatchExportProcessorOptions.MaxExportBatchSize =
                        OtlpExportConfiguration.MaxExportBatchSize;
                    processorOptions.BatchExportProcessorOptions.ScheduledDelayMilliseconds =
                        OtlpExportConfiguration.ScheduledDelayMilliseconds;
                    processorOptions.BatchExportProcessorOptions.ExporterTimeoutMilliseconds =
                        OtlpExportConfiguration.ExporterTimeoutMilliseconds;
                });
            },
            loggingOptions =>
            {
                loggingOptions.IncludeFormattedMessage = false;
                loggingOptions.IncludeScopes = false;
                loggingOptions.ParseStateValues = true;
            });`
    : String.raw`        services.AddOpenTelemetry()
            .WithTracing(tracing =>
                tracing
                    .AddAspNetCoreInstrumentation()
                    .AddHttpClientInstrumentation()
                    .AddSource(HostTelemetry.ActivitySourceName))
            .WithMetrics(metrics =>
                metrics
                    .AddMeter(
                        HostTelemetry.MeterName,
                        "Microsoft.AspNetCore.Hosting",
                        "Microsoft.AspNetCore.Server.Kestrel",
                        "Microsoft.Extensions.Diagnostics.HealthChecks",
                        "System.Net.Http",
                        "System.Net.NameResolution",
                        "System.Runtime"));`;
  const otlpUsings = otlpExporter
    ? String.raw`using OpenTelemetry;
using OpenTelemetry.Exporter;
using OpenTelemetry.Logs;
`
    : "";
  const otlpSupport = otlpExporter
    ? String.raw`
internal static class OtlpExportConfiguration
{
    public const int MaxQueueSize = 2048;
    public const int MaxExportBatchSize = 512;
    public const int ScheduledDelayMilliseconds = 5000;
    public const int ExporterTimeoutMilliseconds = 30000;

    public static void Validate(IConfiguration configuration)
    {
        _ = ReadEndpoint(configuration);
    }

    public static void Configure(
        OtlpExporterOptions options,
        IConfiguration configuration)
    {
        options.Endpoint = ReadEndpoint(configuration);
        options.Protocol = OtlpExportProtocol.Grpc;
        options.TimeoutMilliseconds = ExporterTimeoutMilliseconds;
        options.ExportProcessorType = ExportProcessorType.Batch;
        options.BatchExportProcessorOptions.MaxQueueSize = MaxQueueSize;
        options.BatchExportProcessorOptions.MaxExportBatchSize =
            MaxExportBatchSize;
        options.BatchExportProcessorOptions.ScheduledDelayMilliseconds =
            ScheduledDelayMilliseconds;
        options.BatchExportProcessorOptions.ExporterTimeoutMilliseconds =
            ExporterTimeoutMilliseconds;
    }

    private static Uri ReadEndpoint(IConfiguration configuration)
    {
        var value = configuration["OTEL_EXPORTER_OTLP_ENDPOINT"];
        if (string.IsNullOrWhiteSpace(value)
            || value.Any(char.IsControl)
            || !Uri.TryCreate(value, UriKind.Absolute, out var endpoint)
            || endpoint.Scheme is not (Uri.UriSchemeHttp or Uri.UriSchemeHttps)
            || endpoint.Host.Length == 0
            || endpoint.UserInfo.Length > 0)
        {
            throw new InvalidOperationException(
                "OTEL_EXPORTER_OTLP_ENDPOINT must be an absolute HTTP(S) URI without user information.");
        }

        return endpoint;
    }
}

internal sealed class OtlpActivityRedactionProcessor : BaseProcessor<Activity>
{
    private static readonly string[] SensitiveTagFragments =
    [
        "authorization",
        "client.address",
        "client.port",
        "cookie",
        "exception",
        "http.request.header",
        "http.response.header",
        "http.target",
        "http.url",
        "network.peer.address",
        "network.peer.port",
        "password",
        "secret",
        "token",
        "url.full",
        "url.path",
        "url.query",
        "user_agent.original",
    ];

    public override void OnEnd(Activity activity)
    {
        foreach (var tag in activity.TagObjects.ToArray())
        {
            if (SensitiveTagFragments.Any(fragment =>
                    tag.Key.Contains(fragment, StringComparison.OrdinalIgnoreCase)))
            {
                activity.SetTag(
                    tag.Key,
                    HostRedactor.Redact(
                        tag.Value?.ToString() ?? string.Empty,
                        HostDataClassification.Secret));
            }
        }
    }
}

internal sealed class OtlpLogRedactionProcessor : BaseProcessor<LogRecord>
{
    public override void OnEnd(LogRecord logRecord)
    {
        var attributes = logRecord.Attributes?
            .Select(attribute =>
                Sensitive(attribute.Key)
                    ? new KeyValuePair<string, object?>(
                        attribute.Key,
                        HostRedactor.Redact(
                            attribute.Value?.ToString() ?? string.Empty,
                            HostDataClassification.Secret))
                    : attribute)
            .ToArray();
        logRecord.Attributes = attributes;

        if (attributes is null
            || !attributes.Any(attribute => attribute.Key == "{OriginalFormat}"))
        {
            logRecord.Body = logRecord.Body is null
                ? null
                : HostRedactor.Redact(
                    logRecord.Body,
                    HostDataClassification.Secret);
        }
        if (logRecord.FormattedMessage is not null)
        {
            logRecord.FormattedMessage = HostRedactor.Redact(
                logRecord.FormattedMessage,
                HostDataClassification.Secret);
        }
        if (logRecord.Exception is { } exception)
        {
            logRecord.Attributes = (attributes ?? [])
                .Append(new KeyValuePair<string, object?>(
                    "error.type",
                    exception.GetType().FullName ?? exception.GetType().Name))
                .ToArray();
            logRecord.Exception = null;
        }
    }

    private static bool Sensitive(string key) =>
        key.Contains("authorization", StringComparison.OrdinalIgnoreCase)
        || key.Contains("client.address", StringComparison.OrdinalIgnoreCase)
        || key.Contains("client.port", StringComparison.OrdinalIgnoreCase)
        || key.Contains("cookie", StringComparison.OrdinalIgnoreCase)
        || key.Contains("exception", StringComparison.OrdinalIgnoreCase)
        || key.Contains("http.request.header", StringComparison.OrdinalIgnoreCase)
        || key.Contains("http.response.header", StringComparison.OrdinalIgnoreCase)
        || key.Contains("http.target", StringComparison.OrdinalIgnoreCase)
        || key.Contains("http.url", StringComparison.OrdinalIgnoreCase)
        || key.Contains("network.peer.address", StringComparison.OrdinalIgnoreCase)
        || key.Contains("network.peer.port", StringComparison.OrdinalIgnoreCase)
        || key.Contains("password", StringComparison.OrdinalIgnoreCase)
        || key.Contains("secret", StringComparison.OrdinalIgnoreCase)
        || key.Contains("token", StringComparison.OrdinalIgnoreCase)
        || key.Contains("url.full", StringComparison.OrdinalIgnoreCase)
        || key.Contains("url.path", StringComparison.OrdinalIgnoreCase)
        || key.Contains("url.query", StringComparison.OrdinalIgnoreCase)
        || key.Contains("user_agent.original", StringComparison.OrdinalIgnoreCase);
}
`
    : "";
  return String.raw`using System.Diagnostics;
using System.Diagnostics.Metrics;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Sockets;
using System.Security.Authentication;
using System.Security.Cryptography.X509Certificates;
using System.Threading.Channels;
using System.Threading.RateLimiting;
using ${applicationName}.Api.Infrastructure.Identity;
using MartiX.Platform.Security;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Policy;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Compliance.Classification;
using Microsoft.Extensions.Compliance.Redaction;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.Metrics;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Net.Http.Headers;
${otlpUsings}using OpenTelemetry.Metrics;
using OpenTelemetry.Trace;

namespace ${applicationName}.Api.Infrastructure.Host;

${otlpSupport}
internal static class HostSecurity
{
    public const string CorsPolicyName = "host-cors";
    public const string RateLimitPolicyName = "host-concurrency";
    public const string SafeOutboundClientName = "safe-outbound";

    public static void ValidateStartup(
        IConfiguration configuration,
        IHostEnvironment environment)
    {
${otlpExporter ? "        OtlpExportConfiguration.Validate(configuration);\n" : ""}        ReadOptions(configuration).Validate(environment);
    }

    public static void ConfigureBuilder(WebApplicationBuilder builder)
    {
        var options = ReadOptions(builder.Configuration);
        builder.WebHost.ConfigureKestrel(kestrel =>
        {
            kestrel.AddServerHeader = false;
            kestrel.Limits.MaxRequestBodySize = options.RequestLimits.MaxBodyBytes;
            kestrel.Limits.MaxRequestHeadersTotalSize =
                options.RequestLimits.MaxRequestHeadersBytes;
            kestrel.Limits.MaxRequestLineSize =
                options.RequestLimits.MaxRequestLineBytes;
            kestrel.Limits.RequestHeadersTimeout =
                TimeSpan.FromSeconds(options.RequestLimits.RequestHeadersTimeoutSeconds);
            kestrel.ConfigureHttpsDefaults(https =>
            {
                https.SslProtocols = SslProtocols.Tls12 | SslProtocols.Tls13;
            });
        });
        builder.Services.Configure<HostOptions>(hostOptions =>
        {
            hostOptions.ShutdownTimeout =
                TimeSpan.FromSeconds(options.RequestLimits.ShutdownTimeoutSeconds);
        });

        if (builder.Environment.IsProduction())
        {
            builder.Logging.ClearProviders();
            builder.Logging.AddJsonConsole(logging =>
            {
                logging.IncludeScopes = true;
                logging.TimestampFormat = "O";
                logging.UseUtcTimestamp = true;
            });
        }
    }

    public static void AddServices(
        IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        var options = ReadOptions(configuration);
        services.AddOptions<HostSecurityOptions>()
            .Bind(configuration.GetSection("Host:Security"))
            .Validate(
                current => current.IsValid(environment),
                "Host security configuration is invalid.")
            .ValidateOnStart();

        services.AddAuthorizationBuilder()
            .SetFallbackPolicy(
                new AuthorizationPolicyBuilder()
                    .RequireAuthenticatedUser()
                    .Build());
        services.AddSingleton<IAuthorizationMiddlewareResultHandler,
            SecurityAuthorizationResultHandler>();

        services.AddAntiforgery(antiforgery =>
        {
            antiforgery.HeaderName = "X-CSRF-TOKEN";
            antiforgery.SuppressXFrameOptionsHeader = true;
        });
        services.Configure<FormOptions>(form =>
        {
            form.MultipartBodyLengthLimit = options.RequestLimits.MaxBodyBytes;
            form.MultipartHeadersLengthLimit =
                options.RequestLimits.MaxMultipartHeadersBytes;
            form.ValueLengthLimit =
                checked((int)Math.Min(
                    options.RequestLimits.MaxBodyBytes,
                    int.MaxValue));
        });
        services.AddCors(cors =>
        {
            cors.AddPolicy(CorsPolicyName, policy =>
            {
                if (!options.Cors.Enabled)
                {
                    policy.SetIsOriginAllowed(_ => false);
                    return;
                }

                policy.WithOrigins(options.Cors.AllowedOrigins)
                    .WithMethods(options.Cors.AllowedMethods)
                    .WithHeaders(options.Cors.AllowedHeaders);
                if (options.Cors.AllowCredentials)
                {
                    policy.AllowCredentials();
                }
            });
        });
        services.Configure<ForwardedHeadersOptions>(forwarded =>
        {
            forwarded.ForwardedHeaders =
                ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
            forwarded.ForwardLimit = options.ForwardedHeaders.ForwardLimit;
            forwarded.KnownNetworks.Clear();
            forwarded.KnownProxies.Clear();
            foreach (var proxy in options.ForwardedHeaders.KnownProxies)
            {
                forwarded.KnownProxies.Add(IPAddress.Parse(proxy));
            }

            foreach (var network in options.ForwardedHeaders.KnownNetworks)
            {
                forwarded.KnownNetworks.Add(ParseNetwork(network));
            }
        });

        services.AddHealthChecks()
            .AddCheck(
                "self",
                () => HealthCheckResult.Healthy(),
                tags: new[] { "live", "ready" })
            .AddCheck<ReadyHostHealthCheck>(
                "host-readiness",
                tags: new[] { "ready" },
                timeout: TimeSpan.FromSeconds(5));

        services.AddRateLimiter(rateLimiter =>
        {
            rateLimiter.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            var fixedWindowLimiter =
                PartitionedRateLimiter.Create<HttpContext, string>(context =>
                IsHealthProbe(context)
                    ? RateLimitPartition.GetNoLimiter<string>("health")
                    : RateLimitPartition.GetFixedWindowLimiter(
                        "host",
                        _ => new FixedWindowRateLimiterOptions
                        {
                            PermitLimit = options.RateLimiting.PermitLimit,
                            Window = TimeSpan.FromSeconds(
                                options.RateLimiting.WindowSeconds),
                            QueueLimit = options.RateLimiting.QueueLimit,
                            QueueProcessingOrder =
                                QueueProcessingOrder.OldestFirst,
                            AutoReplenishment = true,
                        }));
            var concurrencyLimiter =
                PartitionedRateLimiter.Create<HttpContext, string>(context =>
                IsHealthProbe(context)
                    ? RateLimitPartition.GetNoLimiter<string>("health")
                    : RateLimitPartition.GetConcurrencyLimiter(
                        "host",
                        _ => new ConcurrencyLimiterOptions
                        {
                            PermitLimit = options.RateLimiting.PermitLimit,
                            QueueLimit = options.RateLimiting.QueueLimit,
                            QueueProcessingOrder =
                                QueueProcessingOrder.OldestFirst,
                        }));
            rateLimiter.GlobalLimiter = PartitionedRateLimiter.CreateChained(
                fixedWindowLimiter,
                concurrencyLimiter);
            rateLimiter.OnRejected = OnRateLimitRejectedAsync;
        });

        services.AddSingleton<SecurityAuditSink>();
        services.AddSingleton<IHostedService>(
            serviceProvider => serviceProvider.GetRequiredService<SecurityAuditSink>());
        services.AddSingleton<HostTelemetry>();
        services.AddMetrics();
        services.AddRedaction(redaction =>
            redaction.SetFallbackRedactor<ErasingRedactor>());
${openTelemetryRegistration}
        services.AddHttpClient(SafeOutboundClientName, client =>
            {
                client.Timeout = TimeSpan.FromSeconds(
                    options.Outbound.TimeoutSeconds);
            })
            .ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler
            {
                AllowAutoRedirect = false,
                ConnectTimeout = TimeSpan.FromSeconds(
                    options.Outbound.ConnectTimeoutSeconds),
                PooledConnectionLifetime = TimeSpan.FromMinutes(5),
                UseProxy = false,
                ConnectCallback = HostSecurityOptionsOutbound.ConnectAsync,
            })
            .AddHttpMessageHandler<SafeOutboundHandler>();
        services.AddTransient<SafeOutboundHandler>();

        if (options.DataProtection.Enabled)
        {
            var dataProtection = services.AddDataProtection()
                .SetApplicationName(options.DataProtection.ApplicationName);
            dataProtection.PersistKeysToFileSystem(
                new DirectoryInfo(options.DataProtection.KeyRingPath));

            if (!string.IsNullOrWhiteSpace(
                    options.DataProtection.CertificateThumbprint))
            {
                dataProtection.ProtectKeysWithCertificate(
                    LoadCertificate(
                        options.DataProtection.CertificateThumbprint));
            }
        }
    }

    public static bool IsLive(HealthCheckRegistration registration) =>
        registration.Tags.Contains("live", StringComparer.Ordinal);

    public static bool IsReady(HealthCheckRegistration registration) =>
        registration.Tags.Contains("ready", StringComparer.Ordinal);

    private static bool IsHealthProbe(HttpContext context) =>
        context.Request.Path.StartsWithSegments("/alive")
        || context.Request.Path.StartsWithSegments("/ready");

    public static Task WriteHealthResponseAsync(
        HttpContext context,
        HealthReport report)
    {
        context.Response.ContentType = "application/json";
        var status = report.Status == HealthStatus.Unhealthy
            ? "unhealthy"
            : "ok";
        return context.Response.WriteAsJsonAsync(
            new HealthResponse(status),
            context.RequestAborted);
    }

    private static ValueTask OnRateLimitRejectedAsync(
        OnRejectedContext rejected,
        CancellationToken cancellationToken)
    {
        var httpContext = rejected.HttpContext;
        var telemetry = httpContext.RequestServices.GetRequiredService<HostTelemetry>();
        telemetry.RecordRateLimitRejection();
        var activity = HostTelemetry.ActivitySource.StartActivity(
            "host.rate_limit",
            ActivityKind.Internal);
        activity?.SetTag("martix.outcome", "denied");

        var sink = httpContext.RequestServices.GetRequiredService<SecurityAuditSink>();
        if (!sink.TryPublish(CreateAuditEvent(
                httpContext,
                "security.rate-limit.denied",
                "request.rate-limit",
                SecurityAuditOutcome.Denied,
                "rate-limit.exceeded")))
        {
            telemetry.RecordAuditDrop();
        }

        httpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        httpContext.Response.ContentType = "application/problem+json";
        httpContext.Response.Headers["Retry-After"] = "1";
        var problem = new ProblemDetails
        {
            Type = "/problems/rate-limited",
            Title = "Too Many Requests",
            Status = StatusCodes.Status429TooManyRequests,
            Detail = "The request rate is temporarily limited.",
            Instance = httpContext.Request.Path.Value,
        };
        problem.Extensions["code"] = "platform.rate-limited";
        problem.Extensions["traceId"] =
            Activity.Current?.Id ?? httpContext.TraceIdentifier;
        return new ValueTask(
            httpContext.Response.WriteAsJsonAsync(
                problem,
                cancellationToken));
    }

    private static SecurityAuditEvent CreateAuditEvent(
        HttpContext context,
        string name,
        string action,
        SecurityAuditOutcome outcome,
        string reason)
    {
        var target = SecurityAuditTarget.Create(
            "http.route",
            HostRedactor.Redact(
                context.Request.Path.Value ?? "/",
                HostDataClassification.Public),
            SecurityAuditDataClassification.Public);
        var traceIdentity = Activity.Current?.TraceId.ToHexString();
        return SecurityAuditEvent.Create(
            name,
            version: 1,
            occurredAtUtc: DateTimeOffset.UtcNow,
            initiatingActor: ActorAuthorization.Resolve(
                context.User,
                "${authenticationProfile}" == "identity:interactive"
                    ? "identity"
                    : null).Actor,
            action: action,
            outcome: outcome,
            source: "${applicationName}.Api",
            reason: reason,
            target: target,
            origin: SecurityAuditOrigin.Create("http", SecurityAuditDataClassification.Internal),
            traceIdentity: traceIdentity);
    }

    private static HostSecurityOptions ReadOptions(IConfiguration configuration)
    {
        var options = new HostSecurityOptions();
        configuration.GetSection("Host:Security").Bind(options);
        return options;
    }

    internal static IPNetwork ParseNetwork(string value)
    {
        var segments = value.Split('/', 2, StringSplitOptions.TrimEntries);
        if (segments.Length != 2
            || !IPAddress.TryParse(segments[0], out var address)
            || !int.TryParse(segments[1], out var prefixLength))
        {
            throw new InvalidOperationException(
                "Host:Security:ForwardedHeaders:KnownNetworks contains an invalid CIDR.");
        }

        var maximumPrefixLength = address.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork
            ? 32
            : 128;
        if (prefixLength < 0 || prefixLength > maximumPrefixLength)
        {
            throw new InvalidOperationException(
                "Host:Security:ForwardedHeaders:KnownNetworks contains an invalid prefix length.");
        }

        return new IPNetwork(address, prefixLength);
    }

    private static X509Certificate2 LoadCertificate(string thumbprint)
    {
        using var store = new X509Store(
            StoreName.My,
            StoreLocation.CurrentUser);
        store.Open(OpenFlags.ReadOnly);
        var matches = store.Certificates.Find(
            X509FindType.FindByThumbprint,
            thumbprint,
            validOnly: false);
        return matches.Count == 1
            ? matches[0]
            : throw new InvalidOperationException(
                "The configured Data Protection certificate was not found.");
    }
}

internal sealed class HostSecurityOptions
{
    public bool RequireHttps { get; set; } = true;
    public string? PublicOrigin { get; set; }
    public string[] AllowedHosts { get; set; } = Array.Empty<string>();
    public ForwardedHeadersConfiguration ForwardedHeaders { get; set; } = new();
    public CorsConfiguration Cors { get; set; } = new();
    public RateLimitingConfiguration RateLimiting { get; set; } = new();
    public RequestLimitsConfiguration RequestLimits { get; set; } = new();
    public DataProtectionConfiguration DataProtection { get; set; } = new();
    public OutboundConfiguration Outbound { get; set; } = new();

    public bool IsValid(IHostEnvironment environment)
    {
        try
        {
            Validate(environment);
            return true;
        }
        catch (InvalidOperationException)
        {
            return false;
        }
    }

    public void Validate(IHostEnvironment environment)
    {
        if (!environment.IsProduction())
        {
            return;
        }

        if (!RequireHttps)
        {
            throw new InvalidOperationException(
                "Production hosts must require HTTPS.");
        }

        if (!IsSafeHttpsOrigin(PublicOrigin))
        {
            throw new InvalidOperationException(
                "Host:Security:PublicOrigin must be an HTTPS origin without user information.");
        }

        RequireSafeList(AllowedHosts, "Host:Security:AllowedHosts");
        if (AllowedHosts.Contains("*", StringComparer.Ordinal))
        {
            throw new InvalidOperationException(
                "Production hosts must not allow every Host header.");
        }

        RequireSafeList(
            ForwardedHeaders.KnownProxies,
            "Host:Security:ForwardedHeaders:KnownProxies",
            allowEmpty: true);
        foreach (var proxy in ForwardedHeaders.KnownProxies)
        {
            if (!IPAddress.TryParse(proxy, out _))
            {
                throw new InvalidOperationException(
                    "Forwarded header trusted proxies must be IP addresses.");
            }
        }

        RequireSafeList(
            ForwardedHeaders.KnownNetworks,
            "Host:Security:ForwardedHeaders:KnownNetworks",
            allowEmpty: true);
        if (ForwardedHeaders.KnownProxies.Length == 0
            && ForwardedHeaders.KnownNetworks.Length == 0)
        {
            throw new InvalidOperationException(
                "Production forwarded headers require explicit trusted proxies or networks.");
        }
        foreach (var network in ForwardedHeaders.KnownNetworks)
        {
            HostSecurity.ParseNetwork(network);
        }

        if (ForwardedHeaders.ForwardLimit is < 1 or > 5)
        {
            throw new InvalidOperationException(
                "Forwarded header trust must use a bounded forward limit.");
        }

        if (Cors.Enabled)
        {
            RequireSafeList(Cors.AllowedOrigins, "Host:Security:Cors:AllowedOrigins");
            RequireSafeList(Cors.AllowedMethods, "Host:Security:Cors:AllowedMethods");
            RequireSafeList(Cors.AllowedHeaders, "Host:Security:Cors:AllowedHeaders");
            foreach (var origin in Cors.AllowedOrigins)
            {
                if (!IsSafeHttpsOrigin(origin))
                {
                    throw new InvalidOperationException(
                        "Production CORS origins must be explicit HTTPS origins.");
                }
            }
            if (Cors.AllowedOrigins.Contains("*", StringComparer.Ordinal)
                || (Cors.AllowCredentials
                    && Cors.AllowedOrigins.Contains("*", StringComparer.Ordinal)))
            {
                throw new InvalidOperationException(
                    "CORS must use explicit origins and cannot combine wildcard origins with credentials.");
            }
        }

        if (RateLimiting.PermitLimit is < 1 or > 10000
            || RateLimiting.QueueLimit is < 0 or > 1000
            || RateLimiting.WindowSeconds is < 1 or > 60)
        {
            throw new InvalidOperationException(
                "Host rate limiting must use bounded permits, queue, and window values.");
        }

        if (RequestLimits.MaxBodyBytes is < 1 or > 104857600
            || RequestLimits.MaxRequestHeadersBytes is < 1024 or > 131072
            || RequestLimits.MaxRequestLineBytes is < 1024 or > 32768
            || RequestLimits.MaxMultipartHeadersBytes is < 1024 or > 65536
            || RequestLimits.RequestHeadersTimeoutSeconds is < 1 or > 300
            || RequestLimits.ShutdownTimeoutSeconds is < 1 or > 300)
        {
            throw new InvalidOperationException(
                "Host request and shutdown limits must be positive and bounded.");
        }

        if (DataProtection.Enabled)
        {
            RequireText(
                DataProtection.KeyRingPath,
                "Host:Security:DataProtection:KeyRingPath");
            RequireText(
                DataProtection.ApplicationName,
                "Host:Security:DataProtection:ApplicationName");
            if (DataProtection.KeyRingPath.StartsWith(
                    Path.GetTempPath(),
                    StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    "Production Data Protection keys must not use a temporary path.");
            }
            if (!Path.IsPathRooted(DataProtection.KeyRingPath))
            {
                throw new InvalidOperationException(
                    "Production Data Protection keys must use an absolute path.");
            }

            if (DataProtection.ProtectKeysAtRest
                && string.IsNullOrWhiteSpace(
                    DataProtection.CertificateThumbprint))
            {
                throw new InvalidOperationException(
                    "Production Data Protection keys require an explicit at-rest certificate.");
            }
        }

        if (Outbound.Enabled)
        {
            RequireSafeList(
                Outbound.AllowedHosts,
                "Host:Security:Outbound:AllowedHosts");
            if (Outbound.AllowedHosts.Contains("*", StringComparer.Ordinal))
            {
                throw new InvalidOperationException(
                    "Production outbound HTTP must use explicit destination hosts.");
            }
        }

        if (Outbound.TimeoutSeconds is < 1 or > 120
            || Outbound.ConnectTimeoutSeconds is < 1 or > 30)
        {
            throw new InvalidOperationException(
                "Outbound HTTP timeouts must be bounded.");
        }
    }

    private static bool IsSafeHttpsOrigin(string? value)
    {
        return Uri.TryCreate(value, UriKind.Absolute, out var origin)
            && origin.Scheme == Uri.UriSchemeHttps
            && origin.UserInfo.Length == 0
            && origin.AbsolutePath == "/"
            && origin.Query.Length == 0
            && origin.Fragment.Length == 0;
    }

    private static void RequireText(string? value, string path)
    {
        if (string.IsNullOrWhiteSpace(value)
            || value.Any(char.IsControl))
        {
            throw new InvalidOperationException(
                path + " must be explicit safe text.");
        }
    }

    private static void RequireSafeList(
        string[] values,
        string path,
        bool allowEmpty = false)
    {
        if ((!allowEmpty && values.Length == 0)
            || values.Any(value => string.IsNullOrWhiteSpace(value)
                || value.Any(char.IsControl)))
        {
            throw new InvalidOperationException(
                path + " must contain explicit safe values.");
        }
    }
}

internal sealed class HostHeaderPolicyMiddleware
{
    private readonly RequestDelegate next;
    private readonly IOptions<HostSecurityOptions> options;

    public HostHeaderPolicyMiddleware(
        RequestDelegate next,
        IOptions<HostSecurityOptions> options)
    {
        this.next = next;
        this.options = options;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var allowedHosts = options.Value.AllowedHosts;
        if (allowedHosts.Length > 0
            && !allowedHosts.Contains(
                context.Request.Host.Host,
                StringComparer.OrdinalIgnoreCase))
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await context.Response.WriteAsync(
                "Invalid Host header.",
                context.RequestAborted);
            return;
        }

        await next(context);
    }
}

internal sealed class SecurityHeadersMiddleware
{
    private readonly RequestDelegate next;

    public SecurityHeadersMiddleware(RequestDelegate next)
    {
        this.next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        context.Response.OnStarting(() =>
        {
            context.Response.Headers.Remove(HeaderNames.Server);
            context.Response.Headers["X-Content-Type-Options"] = "nosniff";
            context.Response.Headers["X-Frame-Options"] = "DENY";
            context.Response.Headers["Referrer-Policy"] = "no-referrer";
            context.Response.Headers["Content-Security-Policy"] =
                "default-src 'none'; frame-ancestors 'none'; base-uri 'none'";
            context.Response.Headers["Permissions-Policy"] =
                "camera=(), geolocation=(), microphone=()";
            return Task.CompletedTask;
        });
        await next(context);
    }
}

internal sealed class SecurityAuditSink : BackgroundService
{
    private readonly ILogger<SecurityAuditSink> logger;
    private readonly Channel<SecurityAuditEvent> channel =
        Channel.CreateBounded<SecurityAuditEvent>(
            new BoundedChannelOptions(2048)
            {
                FullMode = BoundedChannelFullMode.DropWrite,
                SingleReader = false,
                SingleWriter = false,
            });

    public SecurityAuditSink(ILogger<SecurityAuditSink> logger)
    {
        this.logger = logger;
    }

    public bool TryPublish(SecurityAuditEvent auditEvent) =>
        channel.Writer.TryWrite(auditEvent);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var auditEvent in channel.Reader.ReadAllAsync(stoppingToken))
        {
            logger.LogInformation(
                "Security audit event {EventId} {EventName} {Version} {Action} {Outcome} {Source} {Reason} {TraceIdentity}",
                auditEvent.EventId,
                auditEvent.Name,
                auditEvent.Version,
                auditEvent.Action,
                auditEvent.Outcome,
                auditEvent.Source,
                auditEvent.Reason,
                auditEvent.TraceIdentity);
        }
    }
}

internal sealed class HostTelemetry
{
    public const string ActivitySourceName = "${applicationName}.Api.Host";
    public const string MeterName = "${applicationName}.Api.Host";

    public static readonly ActivitySource ActivitySource =
        new(ActivitySourceName);

    private readonly Counter<long> auditDrops;
    private readonly Counter<long> rateLimitRejections;

    public HostTelemetry(IMeterFactory meterFactory)
    {
        var meter = meterFactory.Create(MeterName);
        rateLimitRejections = meter.CreateCounter<long>(
            "martix.host.rate_limit.rejections",
            description: "Rejected requests due to the bounded host limiter.");
        auditDrops = meter.CreateCounter<long>(
            "martix.host.audit.drops",
            description: "Security audit events that could not enter the bounded sink.");
    }

    public void RecordRateLimitRejection() => rateLimitRejections.Add(1);

    public void RecordAuditDrop() => auditDrops.Add(1);
}

internal enum HostDataClassification
{
    Public = 0,
    Operational = 1,
    Personal = 2,
    Confidential = 3,
    Secret = 4,
}

internal static class HostRedactor
{
    public static string Redact(
        string value,
        HostDataClassification classification) =>
        classification == HostDataClassification.Public
            ? value
            : "[REDACTED]";
}

internal static class HostCompliance
{
    public const string TaxonomyName = "${applicationName}.Host";

    public static DataClassification Public =>
        new(TaxonomyName, "Public");

    public static DataClassification Internal =>
        new(TaxonomyName, "Internal");

    public static DataClassification Personal =>
        new(TaxonomyName, "Personal");

    public static DataClassification Confidential =>
        new(TaxonomyName, "Confidential");

    public static DataClassification Secret =>
        new(TaxonomyName, "Secret");
}

internal sealed class SecurityAuthorizationResultHandler :
    IAuthorizationMiddlewareResultHandler
{
    public async Task HandleAsync(
        RequestDelegate next,
        HttpContext context,
        AuthorizationPolicy policy,
        PolicyAuthorizationResult authorizeResult)
    {
        if (authorizeResult.Succeeded)
        {
            await next(context);
            return;
        }

        var statusCode = authorizeResult.Challenged
            ? StatusCodes.Status401Unauthorized
            : StatusCodes.Status403Forbidden;
        var telemetry = context.RequestServices.GetRequiredService<HostTelemetry>();
        using var activity = HostTelemetry.ActivitySource.StartActivity(
            "host.authorization",
            ActivityKind.Internal);
        activity?.SetTag("martix.outcome", "denied");

        var sink = context.RequestServices.GetRequiredService<SecurityAuditSink>();
        if (!sink.TryPublish(SecurityAuditEvent.Create(
                "security.authorization.denied",
                version: 1,
                occurredAtUtc: DateTimeOffset.UtcNow,
                initiatingActor: ActorAuthorization.Resolve(
                    context.User,
                    "${authenticationProfile}" == "identity:interactive"
                        ? "identity"
                        : null).Actor,
                action: "request.authorize",
                outcome: SecurityAuditOutcome.Denied,
                source: "${applicationName}.Api",
                reason: authorizeResult.Challenged
                    ? "authentication.required"
                    : "authorization.forbidden",
                origin: SecurityAuditOrigin.Create(
                    "http",
                    SecurityAuditDataClassification.Internal),
                traceIdentity: Activity.Current?.TraceId.ToHexString())))
        {
            telemetry.RecordAuditDrop();
        }

        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/problem+json";
        var problem = new ProblemDetails
        {
            Type = authorizeResult.Challenged
                ? "/problems/authentication-required"
                : "/problems/forbidden",
            Title = authorizeResult.Challenged
                ? "Authentication Required"
                : "Forbidden",
            Status = statusCode,
            Detail = authorizeResult.Challenged
                ? "Authentication is required."
                : "The current actor is not allowed.",
        };
        problem.Extensions["code"] = authorizeResult.Challenged
            ? "platform.authentication-required"
            : "platform.forbidden";
        problem.Extensions["traceId"] =
            Activity.Current?.Id ?? context.TraceIdentifier;
        await context.Response.WriteAsJsonAsync(
            problem,
            context.RequestAborted);
    }
}

internal sealed class ReadyHostHealthCheck : IHealthCheck
{
    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return Task.FromResult(HealthCheckResult.Healthy());
    }
}

internal sealed class SafeOutboundHandler : DelegatingHandler
{
    private readonly IOptions<HostSecurityOptions> options;

    public SafeOutboundHandler(IOptions<HostSecurityOptions> options)
    {
        this.options = options;
    }

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        if (request.RequestUri is null
            || !await HostSecurityOptionsOutbound.IsAllowedAsync(
                request.RequestUri,
                options.Value.Outbound,
                cancellationToken))
        {
            throw new InvalidOperationException(
                "Outbound requests must use an allowed HTTPS destination.");
        }

        return await base.SendAsync(request, cancellationToken);
    }
}

internal static class HostSecurityOptionsOutbound
{
    public static async ValueTask<bool> IsAllowedAsync(
        Uri uri,
        OutboundConfiguration configuration,
        CancellationToken cancellationToken)
    {
        if (!configuration.Enabled
            || !uri.IsAbsoluteUri
            || uri.Scheme != Uri.UriSchemeHttps
            || uri.Port != 443
            || !configuration.AllowedHosts.Contains(
                uri.DnsSafeHost,
                StringComparer.OrdinalIgnoreCase))
        {
            return false;
        }

        var addresses = await Dns.GetHostAddressesAsync(
            uri.DnsSafeHost,
            cancellationToken);
        return addresses.Length > 0 && addresses.All(IsPublicAddress);
    }

    public static async ValueTask<Stream> ConnectAsync(
        SocketsHttpConnectionContext context,
        CancellationToken cancellationToken)
    {
        var addresses = await Dns.GetHostAddressesAsync(
            context.DnsEndPoint.Host,
            cancellationToken);
        foreach (var address in addresses)
        {
            if (!IsPublicAddress(address))
            {
                continue;
            }

            var socket = new Socket(
                address.AddressFamily,
                SocketType.Stream,
                ProtocolType.Tcp);
            try
            {
                await socket.ConnectAsync(
                    new IPEndPoint(address, context.DnsEndPoint.Port),
                    cancellationToken);
                return new NetworkStream(socket, ownsSocket: true);
            }
            catch (SocketException)
            {
                socket.Dispose();
            }
        }

        throw new HttpRequestException(
            "The outbound destination did not resolve to a public address.");
    }

    private static bool IsPublicAddress(IPAddress address)
    {
        if (address.IsIPv4MappedToIPv6)
        {
            address = address.MapToIPv4();
        }

        if (address.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)
        {
            return !IPAddress.IsLoopback(address)
                && !IsPrivateIpv4(address);
        }

        return address.AddressFamily == System.Net.Sockets.AddressFamily.InterNetworkV6
            && !IPAddress.IsLoopback(address)
            && !IsIpv6LinkLocal(address)
            && !IsIpv6SiteLocal(address)
            && !IsUniqueLocal(address)
            && IsGlobalIpv6(address);
    }

    private static bool IsIpv6LinkLocal(IPAddress address)
    {
        if (address.AddressFamily != System.Net.Sockets.AddressFamily.InterNetworkV6)
        {
            return false;
        }

        var bytes = address.GetAddressBytes();
        return bytes[0] == 0xFE && (bytes[1] & 0xC0) == 0x80;
    }

    private static bool IsIpv6SiteLocal(IPAddress address)
    {
        if (address.AddressFamily != System.Net.Sockets.AddressFamily.InterNetworkV6)
        {
            return false;
        }

        var bytes = address.GetAddressBytes();
        return bytes[0] == 0xFE && (bytes[1] & 0xC0) == 0xC0;
    }

    private static bool IsPrivateIpv4(IPAddress address)
    {
        var bytes = address.GetAddressBytes();
        return address.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork
            && (bytes[0] == 0
                || bytes[0] == 10
                || bytes[0] == 127
                || (bytes[0] == 169 && bytes[1] == 254)
                || (bytes[0] == 172 && bytes[1] is >= 16 and <= 31)
                || (bytes[0] == 192 && bytes[1] == 168)
                || (bytes[0] == 192 && bytes[1] == 0)
                || (bytes[0] == 198 && bytes[1] is 18 or 19)
                || (bytes[0] == 100 && bytes[1] is >= 64 and <= 127)
                || bytes[0] >= 224);
    }

    private static bool IsUniqueLocal(IPAddress address)
    {
        if (address.AddressFamily != System.Net.Sockets.AddressFamily.InterNetworkV6)
        {
            return false;
        }

        return (address.GetAddressBytes()[0] & 0xFE) == 0xFC;
    }

    private static bool IsGlobalIpv6(IPAddress address)
    {
        var firstByte = address.GetAddressBytes()[0];
        return firstByte is >= 0x20 and < 0xFC;
    }
}

internal sealed class ForwardedHeadersConfiguration
{
    public string[] KnownProxies { get; set; } = Array.Empty<string>();
    public string[] KnownNetworks { get; set; } = Array.Empty<string>();
    public int ForwardLimit { get; set; } = 1;
}

internal sealed class CorsConfiguration
{
    public bool Enabled { get; set; }
    public string[] AllowedOrigins { get; set; } = Array.Empty<string>();
    public string[] AllowedMethods { get; set; } = Array.Empty<string>();
    public string[] AllowedHeaders { get; set; } = Array.Empty<string>();
    public bool AllowCredentials { get; set; }
}

internal sealed class RateLimitingConfiguration
{
    public int PermitLimit { get; set; } = 100;
    public int QueueLimit { get; set; }
    public int WindowSeconds { get; set; } = 1;
}

internal sealed class RequestLimitsConfiguration
{
    public long MaxBodyBytes { get; set; } = 10485760;
    public int MaxRequestHeadersBytes { get; set; } = 32768;
    public int MaxRequestLineBytes { get; set; } = 8192;
    public int MaxMultipartHeadersBytes { get; set; } = 16384;
    public int RequestHeadersTimeoutSeconds { get; set; } = 30;
    public int ShutdownTimeoutSeconds { get; set; } = 30;
}

internal sealed class DataProtectionConfiguration
{
    public bool Enabled { get; set; }
    public string KeyRingPath { get; set; } = string.Empty;
    public string ApplicationName { get; set; } = string.Empty;
    public bool ProtectKeysAtRest { get; set; } = true;
    public string? CertificateThumbprint { get; set; }
}

internal sealed class OutboundConfiguration
{
    public bool Enabled { get; set; }
    public string[] AllowedHosts { get; set; } = Array.Empty<string>();
    public int TimeoutSeconds { get; set; } = 10;
    public int ConnectTimeoutSeconds { get; set; } = 5;
}

internal sealed record HealthResponse(string Status);
`;
}
