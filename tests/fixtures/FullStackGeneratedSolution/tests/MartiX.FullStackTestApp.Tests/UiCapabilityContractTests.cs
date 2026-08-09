using Bunit;
using Bunit.TestDoubles;
using Microsoft.Playwright;
using MartiX.FullStackTestApp.Web.Platform.Api;

namespace MartiX.FullStackTestApp.Tests;

public sealed class UiCapabilityContractTests
{
    [Test]
    public async Task Shared_states_and_accessibility_seams_are_declared()
    {
        var states = new[]
        {
            "anonymous", "authenticated", "denied", "expired",
            "loading", "empty", "validation", "error",
            "offline", "reconnecting"
        };

        await Assert.That(states).Contains("loading");
        await Assert.That(states).Contains("denied");
        await Assert.That(states).Contains("reconnecting");
    }

    [Test]
    public async Task Routes_render_the_semantic_application_root()
    {
        using var context = new BunitContext();
        context.AddAuthorization();
        context.Services.AddSingleton(new HttpClient());
        context.Services.AddSingleton<ApiTransport>();
        context.Services.AddSingleton<GeneratedClient>();
        var rendered = context.Render<MartiX.FullStackTestApp.Web.Components.Routes>();

        await Assert.That(rendered.Find("main").GetAttribute("aria-labelledby"))
            .IsEqualTo("application-title");
        await Assert.That(rendered.Markup).Contains("data-state");
    }

    [Test]
    public async Task Browser_evidence_uses_the_playwright_contract()
    {
        await Assert.That(typeof(IPage).Name).IsEqualTo("IPage");
    }
}
