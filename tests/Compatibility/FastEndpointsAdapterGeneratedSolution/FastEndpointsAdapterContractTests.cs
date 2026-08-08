using System.Net;
using System.Text.Json;
using FastEndpoints;
using FluentValidation;
using MartiX.Platform.AspNetCore;
using MartiX.Platform.AspNetCore.FastEndpoints;
using MartiX.Platform.Results;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

public sealed class FastEndpointsAdapterContractTests
{
    [Test]
    public async Task Successful_results_and_lifecycle_headers_match_the_contract()
    {
        await using var host = await TestHost.StartAsync();

        using var response = await host.Client.GetAsync("/api/v1/orders");
        using var document = JsonDocument.Parse(
            await response.Content.ReadAsStringAsync());

        await Assert.That(response.StatusCode).IsEqualTo(HttpStatusCode.OK);
        await Assert.That(document.RootElement.GetProperty("items").GetArrayLength())
            .IsEqualTo(0);

        using var legacyResponse =
            await host.Client.GetAsync("/api/v1/legacy-orders");
        await Assert.That(legacyResponse.Headers.GetValues("Deprecation").Single())
            .IsEqualTo("@1893456000");
        await Assert.That(legacyResponse.Headers.GetValues("Link").Single())
            .IsEqualTo(
                "<https://docs.martix.dev/guides/orders-v1>; rel=\"deprecation\"");
    }

    [Test]
    public async Task Validation_uses_the_canonical_problem_details_shape()
    {
        await using var host = await TestHost.StartAsync();

        using var response = await host.Client.PostAsJsonAsync(
            "/test/validation",
            new ValidationRequest(string.Empty));
        using var document = JsonDocument.Parse(
            await response.Content.ReadAsStringAsync());

        await Assert.That(response.StatusCode)
            .IsEqualTo(HttpStatusCode.BadRequest);
        await Assert.That(response.Content.Headers.ContentType?.MediaType)
            .IsEqualTo("application/problem+json");
        await Assert.That(document.RootElement.GetProperty("type").GetString())
            .IsEqualTo("/problems/validation-failed");
        await Assert.That(document.RootElement.GetProperty("code").GetString())
            .IsEqualTo("api.validation");
        await Assert.That(
                document.RootElement.GetProperty("errors")[0]
                    .GetProperty("target")
                    .GetString())
            .IsEqualTo("name");
    }

    [Test]
    public async Task Unexpected_failures_are_safe_and_correlated()
    {
        await using var host = await TestHost.StartAsync();

        using var response = await host.Client.GetAsync("/test/unexpected");
        using var document = JsonDocument.Parse(
            await response.Content.ReadAsStringAsync());

        await Assert.That(response.StatusCode)
            .IsEqualTo(HttpStatusCode.InternalServerError);
        await Assert.That(document.RootElement.GetProperty("code").GetString())
            .IsEqualTo("platform.unexpected");
        await Assert.That(document.RootElement.GetProperty("traceId").GetString())
            .IsNotNull();
        await Assert.That(
                document.RootElement.GetProperty("detail").GetString())
            .DoesNotContain("sensitive-backend-details");
    }

    [Test]
    public async Task FastEndpoints_openapi_is_served_at_the_canonical_document_route()
    {
        await using var host = await TestHost.StartAsync();

        using var response = await host.Client.GetAsync("/openapi/v1.json");
        using var document = JsonDocument.Parse(
            await response.Content.ReadAsStringAsync());

        await Assert.That(response.StatusCode).IsEqualTo(HttpStatusCode.OK);
        await Assert.That(document.RootElement.GetProperty("openapi").GetString())
            .StartsWith("3.1.");
        await Assert.That(
                document.RootElement.GetProperty("paths")
                    .TryGetProperty("/api/v1/orders", out _))
            .IsTrue();
    }

    private sealed class TestHost : IAsyncDisposable
    {
        private TestHost(WebApplication app)
        {
            App = app;
            Client = app.GetTestClient();
        }

        private WebApplication App { get; }

        public HttpClient Client { get; }

        public static async Task<TestHost> StartAsync()
        {
            var builder = WebApplication.CreateBuilder();
            builder.WebHost.UseTestServer();
            builder.Services.AddMartiXProblemDetails();
            builder.Services.AddMartiXFastEndpoints(new List<Type>
            {
                typeof(ListOrdersEndpoint),
                typeof(LegacyOrdersEndpoint),
                typeof(ValidationEndpoint),
                typeof(ValidationValidator),
                typeof(UnexpectedEndpoint),
            });

            var app = builder.Build();
            app.UseExceptionHandler();
            app.UseMartiXFastEndpoints();
            app.MapOpenApi();
            await app.StartAsync();
            return new TestHost(app);
        }

        public async ValueTask DisposeAsync()
        {
            Client.Dispose();
            await App.DisposeAsync();
        }
    }
}

public sealed record OrderPage(IReadOnlyList<object> Items);

public sealed record ValidationRequest(string Name);

internal sealed class ValidationValidator : Validator<ValidationRequest>
{
    public ValidationValidator()
    {
        RuleFor(request => request.Name)
            .NotEmpty()
            .WithErrorCode("api.validation");
    }
}

internal sealed class ListOrdersEndpoint
    : MartiXEndpoint<
        EmptyRequest,
        Results<Ok<OrderPage>, ProblemHttpResult>>
{
    public override void Configure()
    {
        Get("/api/v1/orders");
        AllowAnonymous();
        Options(builder => builder
            .WithName("Orders.ListV1")
            .Produces<OrderPage>(StatusCodes.Status200OK)
            .ProducesMartiXProblemDetails(ErrorKind.Unexpected));
    }

    public override Task<Results<Ok<OrderPage>, ProblemHttpResult>> ExecuteAsync(
        EmptyRequest request,
        CancellationToken cancellationToken)
    {
        return Task.FromResult<
            Results<Ok<OrderPage>, ProblemHttpResult>>(
            TypedResults.Ok(new OrderPage(Array.Empty<object>())));
    }
}

internal sealed class LegacyOrdersEndpoint
    : MartiXEndpoint<
        EmptyRequest,
        Results<Ok<OrderPage>, ProblemHttpResult>>
{
    public override void Configure()
    {
        Get("/api/v1/legacy-orders");
        AllowAnonymous();
        Options(builder => builder
            .WithName("Orders.LegacyListV1")
            .WithMartiXLifecycle(
                DateTimeOffset.Parse("2030-01-01T00:00:00+00:00"),
                new Uri("https://docs.martix.dev/guides/orders-v1"))
            .Produces<OrderPage>(StatusCodes.Status200OK)
            .ProducesMartiXProblemDetails(ErrorKind.Unexpected));
    }

    public override Task<Results<Ok<OrderPage>, ProblemHttpResult>> ExecuteAsync(
        EmptyRequest request,
        CancellationToken cancellationToken)
    {
        return Task.FromResult<
            Results<Ok<OrderPage>, ProblemHttpResult>>(
            TypedResults.Ok(new OrderPage(Array.Empty<object>())));
    }
}

internal sealed class ValidationEndpoint
    : MartiXEndpoint<ValidationRequest, Ok<ProbeResponse>>
{
    public override void Configure()
    {
        Post("/test/validation");
        AllowAnonymous();
        Validator<ValidationValidator>();
        Options(builder => builder
            .WithName("Validation")
            .Produces<ProbeResponse>(StatusCodes.Status200OK)
            .ProducesMartiXProblemDetails(ErrorKind.Validation));
    }

    public override Task<Ok<ProbeResponse>> ExecuteAsync(
        ValidationRequest request,
        CancellationToken cancellationToken)
    {
        return Task.FromResult(TypedResults.Ok(new ProbeResponse("ok")));
    }
}

internal sealed class UnexpectedEndpoint
    : EndpointWithoutRequest<ProblemHttpResult>
{
    public override void Configure()
    {
        Get("/test/unexpected");
        AllowAnonymous();
    }

    public override Task<ProblemHttpResult> ExecuteAsync(
        CancellationToken cancellationToken)
    {
        throw new InvalidOperationException("sensitive-backend-details");
    }
}

public sealed record ProbeResponse(string Status);
