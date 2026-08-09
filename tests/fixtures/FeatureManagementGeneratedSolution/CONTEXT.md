# Feature Management Generated Solution context

The selected provider is `Microsoft.FeatureManagement` 4.6.0. Configuration
uses the current `feature_management` section and the application composes
`IVariantFeatureManager` directly. Missing features, missing filters, and
malformed settings are rejected rather than silently enabled.

The acceptance tests cover contextual targeting, variants, bounded
`Microsoft.FeatureManagement` telemetry, reload behavior and scoped snapshot
consistency. Feature decisions are captured separately from authorization and
durable checkout state.
