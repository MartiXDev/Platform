using System.Diagnostics;

namespace MartiX.FeatureManagementTestApp;

public sealed record FeatureEvaluationObservation(
    string FeatureName,
    bool Enabled,
    string? Variant);

public sealed class FeatureEvaluationObserver : IDisposable
{
    private const int MaxEvents = 32;
    private readonly object gate = new();
    private readonly List<FeatureEvaluationObservation> events = [];
    private readonly ActivityListener listener;

    public FeatureEvaluationObserver()
    {
        listener = new ActivityListener
        {
            ShouldListenTo = static source =>
                source.Name == "Microsoft.FeatureManagement",
            Sample = static (ref ActivityCreationOptions<ActivityContext> _) =>
                ActivitySamplingResult.AllData,
            ActivityStopped = Capture,
        };
        ActivitySource.AddActivityListener(listener);
    }

    public IReadOnlyList<FeatureEvaluationObservation> Events
    {
        get
        {
            lock (gate)
            {
                return events.ToArray();
            }
        }
    }

    public void Dispose()
    {
        listener.Dispose();
    }

    private void Capture(Activity activity)
    {
        foreach (var featureEvent in activity.Events)
        {
            if (!string.Equals(
                    featureEvent.Name,
                    "FeatureFlag",
                    StringComparison.Ordinal))
            {
                continue;
            }

            var featureName = ReadTag(featureEvent, "FeatureName");
            if (string.IsNullOrWhiteSpace(featureName))
            {
                continue;
            }

            lock (gate)
            {
                if (Events.Count >= MaxEvents)
                {
                    return;
                }

                _ = bool.TryParse(
                    ReadTag(featureEvent, "Enabled"),
                    out var enabled);
                events.Add(new FeatureEvaluationObservation(
                    featureName,
                    enabled,
                    ReadTag(featureEvent, "Variant")));
            }
        }
    }

    private static string? ReadTag(ActivityEvent featureEvent, string name)
    {
        foreach (var tag in featureEvent.Tags)
        {
            if (string.Equals(tag.Key, name, StringComparison.Ordinal))
            {
                return tag.Value?.ToString();
            }
        }

        return null;
    }
}
