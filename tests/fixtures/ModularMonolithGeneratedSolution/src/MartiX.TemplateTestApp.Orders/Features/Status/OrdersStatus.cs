
using MartiX.TemplateTestApp.Orders.Contracts.ModuleContracts;
using MartiX.TemplateTestApp.Orders.Domain;
using MartiX.TemplateTestApp.Orders.Infrastructure.Persistence;
using MartiX.Platform.AspNetCore;
using MartiX.Platform.Results;
using MartiX.Platform.EntityFrameworkCore.Specifications;
using MartiX.Platform.Security;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace MartiX.TemplateTestApp.Orders.Features.Status;

internal sealed class OrdersStatusOperation : IOrdersStatus
{


    public Task<OrdersStatusResponse> GetStatusAsync(
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var aggregate = new OrdersAggregate();
        return Task.FromResult(
            new OrdersStatusResponse(
                aggregate.Name,
                Array.Empty<string>()));
    }
    public async Task<Result<OrdersStatusResponse>>
        GetPermissionedStatusAsync(
            ActorContext actor,
            CancellationToken cancellationToken)
    {
        if (!actor.Authorize(Permission.Create("platform.access")).IsAllowed)
        {
            return Result<OrdersStatusResponse>.Failure(Error.Create(
                "orders.permission-required",
                ErrorKind.Forbidden,
                "The current actor is not allowed."));
        }

        return Result<OrdersStatusResponse>.Success(
            await GetStatusAsync(cancellationToken));
    }
}

internal sealed class OrdersPersistenceQuery
{
    private readonly OrdersDbContext dbContext;

    public OrdersPersistenceQuery(OrdersDbContext dbContext)
    {
        this.dbContext = dbContext;
    }

    public Task<OrdersAggregate?> FindAsync(
        Guid id,
        CancellationToken cancellationToken)
    {
        return new Specification<OrdersAggregate>(
                aggregate => aggregate.Id == id)
            .Apply(dbContext.Aggregates)
            .AsNoTracking()
            .SingleOrDefaultAsync(cancellationToken);
    }
}

internal static class OrdersStatusEndpoint
{
    public static void Map(IEndpointRouteBuilder endpoints)
    {
        var group = endpoints
            .MapGroup("/orders")
            .WithTags("Orders")
            .AllowAnonymous();
        group.MapGet(
                "/status",
                static (
                    IOrdersStatus status,
                    CancellationToken cancellationToken) =>
                    status.GetStatusAsync(cancellationToken))
            .WithName("MartiX.TemplateTestApp.Orders.Status")
            .WithSummary("Read Orders status")
            .Produces<OrdersStatusResponse>(StatusCodes.Status200OK)
            .ProducesMartiXProblemDetails(ErrorKind.Unexpected);
        var permissioned = endpoints
            .MapGroup("/orders")
            .WithTags("Orders");
        permissioned.MapGet(
                "/status/permissioned",
                GetPermissionedStatusAsync)
            .WithName("MartiX.TemplateTestApp.Orders.PermissionedStatus")
            .WithSummary("Read Orders status with application permission")
            .RequireAuthorization("permission:platform-access")
            .Produces<OrdersStatusResponse>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status403Forbidden)
            .ProducesMartiXProblemDetails(ErrorKind.Unexpected);
    }

    private static async Task<Results<Ok<OrdersStatusResponse>, ForbidHttpResult>>
        GetPermissionedStatusAsync(
            ActorContext actor,
            OrdersStatusOperation operation,
            CancellationToken cancellationToken)
    {
        var result = await operation.GetPermissionedStatusAsync(
            actor,
            cancellationToken);
        if (!result.IsSuccess)
        {
            return TypedResults.Forbid();
        }

        return TypedResults.Ok(result.Value);
    }
}
