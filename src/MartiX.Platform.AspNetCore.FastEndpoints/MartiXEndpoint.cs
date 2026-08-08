using System.Threading;
using System.Threading.Tasks;
using FastEndpoints;
using Microsoft.AspNetCore.Http;

namespace MartiX.Platform.AspNetCore.FastEndpoints;

/// <summary>
/// FastEndpoints base class that translates automatic validation failures to the
/// MartiX Problem Details contract.
/// </summary>
/// <typeparam name="TRequest">The request DTO type.</typeparam>
/// <typeparam name="TResponse">The response type.</typeparam>
public abstract class MartiXEndpoint<TRequest, TResponse>
    : Endpoint<TRequest, TResponse>
    where TRequest : notnull
{
    /// <summary>
    /// Sends automatic validation failures through the canonical ASP.NET Core
    /// Problem Details adapter.
    /// </summary>
    /// <param name="cancellationToken">The request cancellation token.</param>
    public override async Task OnValidationFailedAsync(
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        await ((IResult)MartiXFastEndpointsProblemDetails
            .CreateValidation(ValidationFailures, HttpContext))
            .ExecuteAsync(HttpContext);
    }
}
