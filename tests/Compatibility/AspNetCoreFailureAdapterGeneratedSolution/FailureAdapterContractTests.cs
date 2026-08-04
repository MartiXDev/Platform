using System.Net;
using System.Text.Json;
using MartiX.Platform.AspNetCore;
using MartiX.Platform.Results;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;

public sealed class FailureAdapterContractTests
{
  [Test]
  public async Task Successful_application_result_uses_the_declared_typed_response()
  {
    await using var host = await ApiHost.StartAsync();

    using var response = await host.Client.GetAsync("/api/v1/orders/1");
    await Assert.That(response.StatusCode).IsEqualTo(HttpStatusCode.OK);
    await Assert.That(response.Content.Headers.ContentType?.MediaType)
        .IsEqualTo("application/json");

    using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
    await Assert.That(document.RootElement.GetProperty("id").GetString())
        .IsEqualTo("order-1");
  }

  [Test]
  [Arguments(400, 400, "validation-failed", "orders.validation")]
  [Arguments(422, 422, "rule-violation", "orders.rule-violation")]
  [Arguments(404, 404, "not-found", "orders.not-found")]
  [Arguments(409, 409, "conflict", "orders.conflict")]
  [Arguments(401, 401, "authentication-required", "orders.authentication-required")]
  [Arguments(403, 403, "forbidden", "orders.forbidden")]
  [Arguments(429, 429, "rate-limited", "orders.rate-limited")]
  [Arguments(503, 503, "unavailable", "orders.unavailable")]
  [Arguments(500, 500, "unexpected", "orders.unexpected")]
  public async Task Expected_application_errors_use_safe_problem_details(
      int routeId,
      int expectedStatus,
      string expectedType,
      string expectedCode)
  {
    await using var host = await ApiHost.StartAsync();

    using var response = await host.Client.GetAsync($"/api/v1/orders/{routeId}");
    using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
    var problem = document.RootElement;

    await Assert.That((int)response.StatusCode).IsEqualTo(expectedStatus);
    await Assert.That(response.Content.Headers.ContentType?.MediaType)
        .IsEqualTo("application/problem+json");
    await Assert.That(problem.GetProperty("type").GetString())
        .IsEqualTo($"/problems/{expectedType}");
    await Assert.That(problem.GetProperty("status").GetInt32())
        .IsEqualTo(expectedStatus);
    await Assert.That(problem.GetProperty("code").GetString())
        .IsEqualTo(expectedCode);
    await Assert.That(problem.GetProperty("traceId").GetString())
        .IsNotNull();
    await Assert.That(problem.GetProperty("instance").GetString())
        .IsEqualTo($"/api/v1/orders/{routeId}");

    var errors = problem.GetProperty("errors");
    await Assert.That(errors.GetArrayLength()).IsEqualTo(1);
    await Assert.That(errors[0].GetProperty("code").GetString())
        .IsEqualTo(expectedCode);
    await Assert.That(errors[0].GetProperty("message").GetString())
        .IsNotNull();
  }

  [Test]
  public async Task Unexpected_exceptions_are_redacted_and_correlated()
  {
    await using var host = await ApiHost.StartAsync();

    using var response = await host.Client.GetAsync("/api/v1/orders/exception");
    var body = await response.Content.ReadAsStringAsync();
    using var document = JsonDocument.Parse(body);
    var problem = document.RootElement;

    await Assert.That(response.StatusCode).IsEqualTo(HttpStatusCode.InternalServerError);
    await Assert.That(response.Content.Headers.ContentType?.MediaType)
        .IsEqualTo("application/problem+json");
    await Assert.That(problem.GetProperty("code").GetString())
        .IsEqualTo("platform.unexpected");
    await Assert.That(problem.GetProperty("detail").GetString())
        .IsEqualTo("The server could not complete the request.");
    await Assert.That(problem.GetProperty("traceId").GetString())
        .IsNotNull();
    await Assert.That(body.Contains("database-password", StringComparison.Ordinal))
        .IsFalse();
    await Assert.That(body.Contains("Npgsql", StringComparison.Ordinal))
        .IsFalse();
    await Assert.That(body.Contains("at FailureAdapterContractTests", StringComparison.Ordinal))
        .IsFalse();
  }

  [Test]
  public async Task OpenApi_describes_the_problem_details_contract()
  {
    await using var host = await ApiHost.StartAsync();

    using var response = await host.Client.GetAsync("/openapi/v1.json");
    var body = await response.Content.ReadAsStringAsync();
    using var document = JsonDocument.Parse(body);
    var root = document.RootElement;
    var responses = root
        .GetProperty("paths")
        .GetProperty("/api/v1/orders/{id}")
        .GetProperty("get")
        .GetProperty("responses");

    await Assert.That(root.GetProperty("openapi").GetString())
        .StartsWith("3.1.");
    await Assert.That(responses.GetProperty("200").GetProperty("content")
        .GetProperty("application/json")).IsNotNull();
    await Assert.That(responses.GetProperty("404").GetProperty("content")
        .GetProperty("application/problem+json")).IsNotNull();
    await Assert.That(responses.GetProperty("500").GetProperty("content")
        .GetProperty("application/problem+json")).IsNotNull();
    await Assert.That(body.Contains("\"code\"", StringComparison.Ordinal))
        .IsTrue();
    await Assert.That(body.Contains("\"traceId\"", StringComparison.Ordinal))
        .IsTrue();
    await Assert.That(body.Contains("\"errors\"", StringComparison.Ordinal))
        .IsTrue();
  }

  private sealed record OrderResponse(string Id);

  private sealed class ApiHost : IAsyncDisposable
  {
    private ApiHost(WebApplication app, HttpClient client)
    {
      App = app;
      Client = client;
    }

    private WebApplication App { get; }

    public HttpClient Client { get; }

    public static async Task<ApiHost> StartAsync()
    {
      var builder = WebApplication.CreateBuilder(new WebApplicationOptions
      {
        EnvironmentName = Environments.Development,
      });
      builder.WebHost.UseTestServer();
      builder.Services.AddMartiXProblemDetails();
      builder.Services.AddOpenApi(options =>
          options.AddMartiXProblemDetailsContract());

      var app = builder.Build();
      app.UseExceptionHandler();
      app.MapOpenApi();
      MapEndpoints(app);
      await app.StartAsync();

      return new ApiHost(app, app.GetTestClient());
    }

    public async ValueTask DisposeAsync()
    {
      await App.DisposeAsync();
      Client.Dispose();
    }

    private static void MapEndpoints(WebApplication app)
    {
      var orders = app.MapGroup("/api/v1")
          .WithGroupName("v1")
          .WithTags("Orders");

      orders.MapGet(
              "/orders/{id:int}",
              static Results<Ok<OrderResponse>, ProblemHttpResult> (
                  int id,
                  HttpContext httpContext) =>
              {
                var result = GetOrder(id);
                if (result.IsSuccess)
                {
                  return TypedResults.Ok(result.Value);
                }

                return result.ToProblemDetails(httpContext);
              })
          .WithName("GetOrder")
          .Produces<OrderResponse>(StatusCodes.Status200OK)
          .ProducesMartiXProblemDetails(
              ErrorKind.Validation,
              ErrorKind.RuleViolation,
              ErrorKind.NotFound,
              ErrorKind.Conflict,
              ErrorKind.AuthenticationRequired,
              ErrorKind.Forbidden,
              ErrorKind.RateLimited,
              ErrorKind.Unavailable,
              ErrorKind.Unexpected);

      orders.MapGet(
              "/orders/exception",
              static Results<Ok<OrderResponse>, ProblemHttpResult> () =>
              {
                throw new InvalidOperationException(
                    "database-password=do-not-return provider=Npgsql");
              })
          .WithName("GetOrderWithUnexpectedFailure")
          .Produces<ProblemDetails>(StatusCodes.Status500InternalServerError, "application/problem+json")
          .ProducesMartiXProblemDetails(ErrorKind.Unexpected);
    }

    private static Result<OrderResponse> GetOrder(int id)
    {
      return id switch
      {
        1 => Result<OrderResponse>.Success(new OrderResponse("order-1")),
        400 => Result<OrderResponse>.Failure(Error.Create(
            "orders.validation",
            ErrorKind.Validation,
            "The order identifier is invalid.",
            target: "id")),
        422 => Result<OrderResponse>.Failure(Error.Create(
            "orders.rule-violation",
            ErrorKind.RuleViolation,
            "The order cannot be returned in its current state.")),
        404 => Result<OrderResponse>.Failure(Error.Create(
            "orders.not-found",
            ErrorKind.NotFound,
            "The order was not found.")),
        409 => Result<OrderResponse>.Failure(Error.Create(
            "orders.conflict",
            ErrorKind.Conflict,
            "The order conflicts with the requested change.")),
        401 => Result<OrderResponse>.Failure(Error.Create(
            "orders.authentication-required",
            ErrorKind.AuthenticationRequired,
            "Authentication is required.")),
        403 => Result<OrderResponse>.Failure(Error.Create(
            "orders.forbidden",
            ErrorKind.Forbidden,
            "The current actor is not allowed to access the order.")),
        429 => Result<OrderResponse>.Failure(Error.Create(
            "orders.rate-limited",
            ErrorKind.RateLimited,
            "The request rate is limited.")),
        503 => Result<OrderResponse>.Failure(Error.Create(
            "orders.unavailable",
            ErrorKind.Unavailable,
            "The order service is temporarily unavailable.")),
        500 => Result<OrderResponse>.Failure(Error.Create(
            "orders.unexpected",
            ErrorKind.Unexpected,
            "The order could not be processed safely.")),
        _ => Result<OrderResponse>.Failure(Error.Create(
            "orders.not-found",
            ErrorKind.NotFound,
            "The order was not found.")),
      };
    }
  }
}
