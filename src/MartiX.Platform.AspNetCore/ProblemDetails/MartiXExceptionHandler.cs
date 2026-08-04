using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace MartiX.Platform.AspNetCore;

internal sealed class MartiXExceptionHandler(
    ILogger<MartiXExceptionHandler> logger) : IExceptionHandler
{
    private static readonly EventId UnhandledRequestExceptionEvent = new(
        1,
        "UnhandledHttpRequestException");

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken _)
    {
        if (exception is OperationCanceledException
            && httpContext.RequestAborted.IsCancellationRequested)
        {
            return false;
        }

        logger.LogError(
            UnhandledRequestExceptionEvent,
            "Unhandled HTTP request exception.");

        var problem = MartiXProblemDetailsFactory.CreateUnexpected(httpContext);
        await problem.ExecuteAsync(httpContext);
        return true;
    }
}
