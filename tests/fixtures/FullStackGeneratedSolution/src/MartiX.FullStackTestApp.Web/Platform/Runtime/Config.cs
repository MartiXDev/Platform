namespace MartiX.FullStackTestApp.Web.Platform.Runtime;

public sealed record RuntimeConfiguration(
    Uri ApiBaseAddress,
    string Provider,
    string RenderingProfile,
    string DefaultCulture,
    IReadOnlyList<string> Themes)
{
    public static RuntimeConfiguration FromConfiguration(
        IConfiguration configuration)
    {
        var rawAddress = configuration["Api:BaseAddress"];
        if (!Uri.TryCreate(rawAddress, UriKind.Absolute, out var apiBaseAddress))
        {
            throw new InvalidOperationException(
                "Api:BaseAddress must be an absolute URI.");
        }

        return new RuntimeConfiguration(
            apiBaseAddress,
            "blazor-webapp",
            "application",
            "en-US",
            new[] { "light", "dark", "system" });
    }
}
