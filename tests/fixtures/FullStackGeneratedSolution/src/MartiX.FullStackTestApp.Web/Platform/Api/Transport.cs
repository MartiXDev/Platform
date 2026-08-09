using System.Diagnostics;
using System.Net;
using System.Net.Http.Headers;

namespace MartiX.FullStackTestApp.Web.Platform.Api;

public sealed record ApiRequestPolicy(
    string? IdempotencyKey = null,
    string? IfMatch = null,
    bool RetrySafeRead = false,
    int MaxRetries = 2);

public interface IApiCredentialProvider
{
    ValueTask<string?> GetAccessTokenAsync(CancellationToken cancellationToken);
}

public sealed class ApiTransport(
    HttpClient httpClient,
    IApiCredentialProvider? credentialProvider = null)
{
    private static readonly TimeSpan RetryDelay = TimeSpan.FromMilliseconds(100);
    private readonly HttpClient httpClient =
        httpClient ?? throw new ArgumentNullException(nameof(httpClient));
    private readonly IApiCredentialProvider? credentialProvider =
        credentialProvider;

    public async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        ApiRequestPolicy? policy = null,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        var effectivePolicy = policy ?? new ApiRequestPolicy(
            RetrySafeRead: IsSafeRead(request.Method));
        var accessToken = credentialProvider is null
            ? null
            : await credentialProvider.GetAccessTokenAsync(cancellationToken);
        ConfigureHeaders(request, effectivePolicy, accessToken);

        var retries = effectivePolicy.RetrySafeRead &&
            IsSafeRead(request.Method) &&
            request.Content is null
            ? Math.Clamp(effectivePolicy.MaxRetries, 0, 3)
            : 0;
        for (var attempt = 0; ; attempt++)
        {
            var requestToSend = attempt == 0
                ? request
                : CloneSafeReadRequest(request);
            try
            {
                var response = await httpClient.SendAsync(
                    requestToSend,
                    HttpCompletionOption.ResponseHeadersRead,
                    cancellationToken);
                if (attempt < retries && IsTransient(response.StatusCode))
                {
                    response.Dispose();
                    await Task.Delay(RetryDelay, cancellationToken);
                    continue;
                }

                return response;
            }
            catch (HttpRequestException) when (attempt < retries)
            {
                await Task.Delay(RetryDelay, cancellationToken);
            }
            finally
            {
                if (!ReferenceEquals(requestToSend, request))
                {
                    requestToSend.Dispose();
                }
            }
        }
    }

    private static void ConfigureHeaders(
        HttpRequestMessage request,
        ApiRequestPolicy policy,
        string? accessToken)
    {
        if (request.Headers.Accept.Count == 0)
        {
            request.Headers.Accept.Add(
                new MediaTypeWithQualityHeaderValue("application/json"));
            request.Headers.Accept.Add(
                new MediaTypeWithQualityHeaderValue(
                    "application/problem+json",
                    0.5));
        }
        request.Headers.TryAddWithoutValidation(
            "traceparent",
            Activity.Current?.Id
                ?? $"00-{ActivityTraceId.CreateRandom()}-{ActivitySpanId.CreateRandom()}-01");

        if (!string.IsNullOrWhiteSpace(accessToken))
        {
            request.Headers.Authorization =
                new AuthenticationHeaderValue("Bearer", accessToken);
        }
        if (policy.IdempotencyKey is not null)
        {
            request.Headers.TryAddWithoutValidation(
                "Idempotency-Key",
                policy.IdempotencyKey);
        }
        if (policy.IfMatch is not null)
        {
            request.Headers.TryAddWithoutValidation("If-Match", policy.IfMatch);
        }
    }

    private static bool IsSafeRead(HttpMethod method) =>
        method == HttpMethod.Get ||
        method == HttpMethod.Head ||
        method == HttpMethod.Options;

    private static HttpRequestMessage CloneSafeReadRequest(
        HttpRequestMessage request)
    {
        var clone = new HttpRequestMessage(request.Method, request.RequestUri)
        {
            Version = request.Version,
            VersionPolicy = request.VersionPolicy,
        };
        foreach (var header in request.Headers)
        {
            clone.Headers.TryAddWithoutValidation(header.Key, header.Value);
        }

        return clone;
    }

    private static bool IsTransient(HttpStatusCode statusCode) =>
        statusCode == HttpStatusCode.RequestTimeout ||
        statusCode == (HttpStatusCode)429 ||
        (int)statusCode >= 500;
}
