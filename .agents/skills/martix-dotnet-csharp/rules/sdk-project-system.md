## SDK-style projects and repository build structure

### Purpose

Provide the default decisions for SDK-style project files, SDK selection, and
repo-wide build settings before changing code or build logic.

### Default guidance

- Inspect `global.json`, `Directory.Build.props`, `Directory.Build.targets`,
  and `Directory.Packages.props` before touching project files.
- Prefer SDK-style projects, central package management, and repo-level
  defaults over repeating the same properties in every project.
- Use `TargetFramework` for single-target projects and `TargetFrameworks` only
  when multi-targeting is required by consumers or packaging.
- When diagnosing imports or inherited values, use
  `dotnet msbuild -preprocess` instead of guessing which file won.

### Avoid

- Do not change SDK version pinning, target framework, or package management
  strategy without an explicit requirement.
- Do not duplicate repository-wide settings inside one project file just to
  make the local edit pass.
- Do not assume a project is isolated from repo build customizations.

### Review checklist

- Verify the effective SDK and inherited build files.
- Change the smallest responsible project scope.
- Keep project configuration portable across Windows, Linux, and macOS unless
  the app is intentionally platform-specific.

### Related files

- [Build, test, pack, and publish](./sdk-build-test-pack-publish.md)
- [Dotnet SDK source map](../references/dotnet-sdk-map.md)
- [Source index](../references/doc-source-index.md)

### Source anchors

- [SDK-style projects overview](https://learn.microsoft.com/en-us/dotnet/core/project-sdk/overview)
- [Select the .NET version to use](https://learn.microsoft.com/en-us/dotnet/core/versions/selection)
- [Customize the build by directory](https://learn.microsoft.com/en-us/visualstudio/msbuild/customize-by-directory?view=vs-2022)
