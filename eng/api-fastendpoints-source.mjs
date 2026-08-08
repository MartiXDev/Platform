function fail(message) {
  throw new Error(message);
}

export function renderFastEndpointsOrdersSource(plan, minimalSource) {
  const endpointMarker = "internal static class OrdersEndpoints";
  const operationsMarker = "    private static Results<Ok<OrderPage>";
  const endpointStart = minimalSource.indexOf(endpointMarker);
  const operationsStart = minimalSource.indexOf(operationsMarker, endpointStart);
  const classEnd = minimalSource.lastIndexOf("\n}");

  if (
    endpointStart === -1 ||
    operationsStart === -1 ||
    classEnd === -1 ||
    operationsStart >= classEnd
  ) {
    fail("The canonical Minimal API endpoint source is incomplete.");
  }

  const sharedSource = minimalSource
    .slice(0, endpointStart)
    .replace(
      "using Microsoft.AspNetCore.Routing;",
       "using MartiX.Platform.AspNetCore.FastEndpoints;",
    );
  const operations = minimalSource
    .slice(operationsStart, classEnd)
    .replaceAll(
      "    private static Results<",
      "    internal static Results<",
    );

  return `${sharedSource}
internal static class OrdersEndpoints
{
${operations}
}

public sealed class ListOrdersRequest
{
    public string? Cursor { get; set; }

    public int? PageSize { get; set; }

    public string? Filter { get; set; }

    public string? Sort { get; set; }
}

public sealed class GetOrderRequest
{
    public Guid Id { get; set; }
}

public sealed class DeleteOrderRequest
{
    public Guid Id { get; set; }
}

internal sealed class ListOrdersEndpoint
    : MartiXEndpoint<ListOrdersRequest, Results<Ok<OrderPage>, ProblemHttpResult>>
{
    private readonly OrderStore store;

    public ListOrdersEndpoint(OrderStore store)
    {
        this.store = store;
    }

    public override void Configure()
    {
        Get("/api/v1/orders");
        AllowAnonymous();
        Options(builder => builder
            .WithName("${plan.applicationName}.Orders.ListV1")
            .WithSummary("List orders")
            .WithTags("Orders")
            .Produces<OrderPage>(StatusCodes.Status200OK)
            .ProducesMartiXProblemDetails(
                ErrorKind.Validation,
                ErrorKind.Unexpected));
    }

    public override Task<Results<Ok<OrderPage>, ProblemHttpResult>> ExecuteAsync(
        ListOrdersRequest request,
        CancellationToken cancellationToken)
    {
        return Task.FromResult(OrdersEndpoints.ListAsync(
            store,
            HttpContext,
            request.Cursor,
            request.PageSize,
            request.Filter,
            request.Sort,
            cancellationToken));
    }
}

internal sealed class GetOrderEndpoint
    : MartiXEndpoint<GetOrderRequest, Results<Ok<OrderResponse>, ProblemHttpResult>>
{
    private readonly OrderStore store;

    public GetOrderEndpoint(OrderStore store)
    {
        this.store = store;
    }

    public override void Configure()
    {
        Get("/api/v1/orders/{id}");
        AllowAnonymous();
        Options(builder => builder
            .WithName("${plan.applicationName}.Orders.GetV1")
            .WithSummary("Get an order")
            .WithTags("Orders")
            .Produces<OrderResponse>(StatusCodes.Status200OK)
            .ProducesMartiXProblemDetails(
                ErrorKind.NotFound,
                ErrorKind.Unexpected));
    }

    public override Task<Results<Ok<OrderResponse>, ProblemHttpResult>> ExecuteAsync(
        GetOrderRequest request,
        CancellationToken cancellationToken)
    {
        return Task.FromResult(OrdersEndpoints.GetAsync(
            store,
            request.Id,
            HttpContext,
            cancellationToken));
    }
}

internal sealed class CreateOrderEndpoint
    : MartiXEndpoint<CreateOrderRequest, Results<Created<OrderResponse>, ProblemHttpResult>>
{
    private readonly OrderStore store;

    public CreateOrderEndpoint(OrderStore store)
    {
        this.store = store;
    }

    public override void Configure()
    {
        Post("/api/v1/orders");
        AllowAnonymous();
        Options(builder => builder
            .WithName("${plan.applicationName}.Orders.CreateV1")
            .WithSummary("Create an order")
            .WithTags("Orders")
            .Produces<OrderResponse>(StatusCodes.Status201Created)
            .ProducesMartiXProblemDetails(
                ErrorKind.Validation,
                ErrorKind.Conflict,
                ErrorKind.Unexpected));
    }

    public override Task<Results<Created<OrderResponse>, ProblemHttpResult>> ExecuteAsync(
        CreateOrderRequest request,
        CancellationToken cancellationToken)
    {
        return Task.FromResult(OrdersEndpoints.CreateAsync(
            store,
            request,
            HttpContext,
            cancellationToken));
    }
}

internal sealed class ReplaceOrderEndpoint
    : MartiXEndpoint<ReplaceOrderRequest, Results<Ok<OrderResponse>, ProblemHttpResult>>
{
    private readonly OrderStore store;

    public ReplaceOrderEndpoint(OrderStore store)
    {
        this.store = store;
    }

    public override void Configure()
    {
        Put("/api/v1/orders/{id}");
        AllowAnonymous();
        Options(builder => builder
            .WithName("${plan.applicationName}.Orders.ReplaceV1")
            .WithSummary("Replace an order")
            .WithTags("Orders")
            .Produces<OrderResponse>(StatusCodes.Status200OK)
            .ProducesMartiXProblemDetails(
                ErrorKind.Validation,
                ErrorKind.NotFound,
                ErrorKind.Unexpected)
            .Produces(
                StatusCodes.Status412PreconditionFailed,
                typeof(Microsoft.AspNetCore.Mvc.ProblemDetails),
                "application/problem+json")
            .Produces(
                StatusCodes.Status428PreconditionRequired,
                typeof(Microsoft.AspNetCore.Mvc.ProblemDetails),
                "application/problem+json"));
    }

    public override Task<Results<Ok<OrderResponse>, ProblemHttpResult>> ExecuteAsync(
        ReplaceOrderRequest request,
        CancellationToken cancellationToken)
    {
        return Task.FromResult(OrdersEndpoints.ReplaceAsync(
            store,
            request.Id,
            request,
            HttpContext,
            cancellationToken));
    }
}

internal sealed class UpdateOrderEndpoint
    : MartiXEndpoint<ReplaceOrderRequest, Results<Ok<OrderResponse>, ProblemHttpResult>>
{
    private readonly OrderStore store;

    public UpdateOrderEndpoint(OrderStore store)
    {
        this.store = store;
    }

    public override void Configure()
    {
        Patch("/api/v1/orders/{id}");
        AllowAnonymous();
        Options(builder => builder
            .WithName("${plan.applicationName}.Orders.UpdateV1")
            .WithSummary("Update an order")
            .WithTags("Orders")
            .Produces<OrderResponse>(StatusCodes.Status200OK)
            .ProducesMartiXProblemDetails(
                ErrorKind.Validation,
                ErrorKind.NotFound,
                ErrorKind.Unexpected)
            .Produces(
                StatusCodes.Status412PreconditionFailed,
                typeof(Microsoft.AspNetCore.Mvc.ProblemDetails),
                "application/problem+json")
            .Produces(
                StatusCodes.Status428PreconditionRequired,
                typeof(Microsoft.AspNetCore.Mvc.ProblemDetails),
                "application/problem+json"));
    }

    public override Task<Results<Ok<OrderResponse>, ProblemHttpResult>> ExecuteAsync(
        ReplaceOrderRequest request,
        CancellationToken cancellationToken)
    {
        return Task.FromResult(OrdersEndpoints.ReplaceAsync(
            store,
            request.Id,
            request,
            HttpContext,
            cancellationToken));
    }
}

internal sealed class DeleteOrderEndpoint
    : MartiXEndpoint<DeleteOrderRequest, Results<NoContent, ProblemHttpResult>>
{
    private readonly OrderStore store;

    public DeleteOrderEndpoint(OrderStore store)
    {
        this.store = store;
    }

    public override void Configure()
    {
        Delete("/api/v1/orders/{id}");
        AllowAnonymous();
        Options(builder => builder
            .WithName("${plan.applicationName}.Orders.DeleteV1")
            .WithSummary("Delete an order")
            .WithTags("Orders")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesMartiXProblemDetails(
                ErrorKind.NotFound,
                ErrorKind.Unexpected)
            .Produces(
                StatusCodes.Status412PreconditionFailed,
                typeof(Microsoft.AspNetCore.Mvc.ProblemDetails),
                "application/problem+json")
            .Produces(
                StatusCodes.Status428PreconditionRequired,
                typeof(Microsoft.AspNetCore.Mvc.ProblemDetails),
                "application/problem+json"));
    }

    public override Task<Results<NoContent, ProblemHttpResult>> ExecuteAsync(
        DeleteOrderRequest request,
        CancellationToken cancellationToken)
    {
        return Task.FromResult(OrdersEndpoints.DeleteAsync(
            store,
            request.Id,
            HttpContext,
            cancellationToken));
    }
}

internal sealed class LegacyListOrdersEndpoint
    : MartiXEndpoint<ListOrdersRequest, Results<Ok<OrderPage>, ProblemHttpResult>>
{
    private readonly OrderStore store;

    public LegacyListOrdersEndpoint(OrderStore store)
    {
        this.store = store;
    }

    public override void Configure()
    {
        Get("/api/v1/legacy-orders");
        AllowAnonymous();
        Options(builder => builder
            .WithName("${plan.applicationName}.Orders.LegacyListV1")
            .WithSummary("List legacy orders")
            .WithTags("Orders")
            .WithMartiXLifecycle(
                DateTimeOffset.Parse("2030-01-01T00:00:00+00:00"),
                new Uri("https://docs.martix.dev/guides/orders-v1"))
            .Produces<OrderPage>(StatusCodes.Status200OK)
            .ProducesMartiXProblemDetails(
                ErrorKind.Validation,
                ErrorKind.Unexpected));
    }

    public override Task<Results<Ok<OrderPage>, ProblemHttpResult>> ExecuteAsync(
        ListOrdersRequest request,
        CancellationToken cancellationToken)
    {
        return Task.FromResult(OrdersEndpoints.ListAsync(
            store,
            HttpContext,
            request.Cursor,
            request.PageSize,
            request.Filter,
            request.Sort,
            cancellationToken));
    }
}

internal sealed class HealthEndpoint
    : FastEndpoints.EndpointWithoutRequest<Ok<HealthResponse>>
{
    public override void Configure()
    {
        Get("/health");
        AllowAnonymous();
        Options(builder => builder
            .WithName("Health")
            .Produces<HealthResponse>(StatusCodes.Status200OK));
    }

    public override Task<Ok<HealthResponse>> ExecuteAsync(
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return Task.FromResult(TypedResults.Ok(new HealthResponse("ok")));
    }
}
`;
}
