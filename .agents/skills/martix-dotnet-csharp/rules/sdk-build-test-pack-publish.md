## Build, test, pack, and publish

### Purpose

Standardize the default .NET CLI workflow for restore, build, test, pack, and
publish so changes stay reproducible and easy to verify.

### Default guidance

- Use `dotnet restore`, `dotnet build`, `dotnet test`, `dotnet pack`, and
  `dotnet publish` as the primary workflow unless the repo documents a custom
  entry point.
- Honor custom scripts or MSBuild targets when the repository uses them as the
  supported path for validation.
- Prefer deterministic, scoped commands that target the project or solution
  under change rather than rebuilding the world by default.
- When packaging or publishing, verify configuration, RID, trimming, AOT, and
  output layout requirements before changing defaults.

### Avoid

- Do not introduce sync-over-async tooling wrappers when the CLI already
  supports the scenario.
- Do not skip tests for changed public APIs or shipped assets.
- Do not treat restore, build, test, pack, and publish as interchangeable; each
  validates a different concern.

### Review checklist

- Run the narrowest useful validation command for the change.
- Capture any repo-specific build entry points that override the generic
  workflow.
- Document pack or publish assumptions when they affect consumers or
  deployment.

### Related files

- [SDK project system](./sdk-project-system.md)
- [Testing guidance](./testing-unit-integration.md)
- [Dotnet SDK source map](../references/dotnet-sdk-map.md)

### Source anchors

- [dotnet build command](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-build)
- [dotnet test command](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-test)
- [The .NET SDK and CLI overview](https://learn.microsoft.com/en-us/dotnet/core/sdk)
