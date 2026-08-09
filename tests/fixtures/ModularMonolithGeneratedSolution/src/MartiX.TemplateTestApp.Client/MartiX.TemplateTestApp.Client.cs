using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

namespace MartiX.TemplateTestApp.Client;

public sealed record BillingStatusResponse(
    string Module,
    IReadOnlyList<string> Dependencies);

public sealed record OrdersStatusResponse(
    string Module,
    IReadOnlyList<string> Dependencies);

public sealed class ApiProblemDetailsException : Exception
{
    public ApiProblemDetailsException(
        HttpStatusCode statusCode,
        ProblemDetails problemDetails)
        : base(problemDetails.Detail)
    {
        StatusCode = statusCode;
        Problem = problemDetails;
    }

    public HttpStatusCode StatusCode { get; }

    public ProblemDetails Problem { get; }
}

public sealed record ProblemDetails(
    string Type,
    string Title,
    int Status,
    string Detail,
    string? Instance,
    string Code,
    string TraceId,
    IReadOnlyList<ProblemError> Errors);

public sealed record ProblemError(string Code, string Message, string? Target);

public sealed class GeneratedApiClient
{
    private static readonly JsonSerializerOptions JsonOptions =
        new(JsonSerializerDefaults.Web);

    private readonly HttpClient client;

    public GeneratedApiClient(HttpClient client)
    {
        this.client = client ?? throw new ArgumentNullException(nameof(client));
    }

    public async Task<BillingStatusResponse> GetBillingStatusAsync(
        CancellationToken cancellationToken = default)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, BuildUri("/api/v1/billing/status"));
        return await SendAsync<BillingStatusResponse>(request, cancellationToken);
    }

    public async Task<BillingStatusResponse> GetBillingPermissionedStatusAsync(
        CancellationToken cancellationToken = default)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, BuildUri("/api/v1/billing/status/permissioned"));
        return await SendAsync<BillingStatusResponse>(request, cancellationToken);
    }

    public async Task<OrdersStatusResponse> GetOrdersStatusAsync(
        CancellationToken cancellationToken = default)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, BuildUri("/api/v1/orders/status"));
        return await SendAsync<OrdersStatusResponse>(request, cancellationToken);
    }

    public async Task<OrdersStatusResponse> GetOrdersPermissionedStatusAsync(
        CancellationToken cancellationToken = default)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, BuildUri("/api/v1/orders/status/permissioned"));
        return await SendAsync<OrdersStatusResponse>(request, cancellationToken);
    }

    private async Task<T> SendAsync<T>(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        using var response = await client.SendAsync(
            request,
            HttpCompletionOption.ResponseHeadersRead,
            cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            await ThrowProblemAsync(response, cancellationToken);
        }

        var value = await response.Content.ReadFromJsonAsync<T>(
            JsonOptions,
            cancellationToken);
        return value ?? throw new InvalidOperationException(
            "The generated API returned an empty success body.");
    }

    private async Task SendNoContentAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        using var response = await client.SendAsync(
            request,
            HttpCompletionOption.ResponseHeadersRead,
            cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            await ThrowProblemAsync(response, cancellationToken);
        }
    }

    private static async Task ThrowProblemAsync(
        HttpResponseMessage response,
        CancellationToken cancellationToken)
    {
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>(
            JsonOptions,
            cancellationToken);
        throw new ApiProblemDetailsException(
            response.StatusCode,
            problem ?? new ProblemDetails(
                "/problems/unknown",
                "Unknown problem",
                (int)response.StatusCode,
                "The server returned an invalid problem response.",
                null,
                "client.invalid-problem",
                string.Empty,
                Array.Empty<ProblemError>()));
    }

    private static string BuildUri(string path, params string?[] queryValues)
    {
        var query = queryValues
            .Where(value => value is not null)
            .ToArray();
        return query.Length == 0
            ? path
            : $"{path}?{string.Join("&", query)}";
    }

}
