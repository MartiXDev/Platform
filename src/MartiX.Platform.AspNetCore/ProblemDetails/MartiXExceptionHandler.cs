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
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        if (exception is OperationCanceledException
            && httpContext.RequestAborted.IsCancellationRequested)
        {
            return false;
        }

        logger.LogError(
            exception,
            "Unhandled HTTP request exception. TraceId: {TraceId}",
            httpContext.TraceIdentifier);

        var problem = MartiXProblemDetailsFactory.CreateUnexpected(httpContext);
        await problem.ExecuteAsync(httpContext);
        return true;
    }
}
