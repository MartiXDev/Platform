## Dotnet SDK and build map

### Purpose

Connect SDK-style project guidance and CLI workflows to the official .NET SDK
and MSBuild documentation used by this package.

### Rule coverage

- **Project files, SDK selection, and repo-wide props or targets**
  - Rule files: `rules/sdk-project-system.md`
  - Primary sources:
    - [SDK-style projects overview](https://learn.microsoft.com/en-us/dotnet/core/project-sdk/overview)
    - [Select the .NET version to use](https://learn.microsoft.com/en-us/dotnet/core/versions/selection)
    - [Customize the build by directory](https://learn.microsoft.com/en-us/visualstudio/msbuild/customize-by-directory?view=vs-2022)
  - Notes: Use before editing `.csproj`, `global.json`, or shared build files.
- **Restore, build, test, pack, and publish workflow**
  - Rule files: `rules/sdk-build-test-pack-publish.md`
  - Primary sources:
    - [The .NET SDK and CLI overview](https://learn.microsoft.com/en-us/dotnet/core/sdk)
    - [dotnet build command](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-build)
    - [dotnet test command](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-test)
  - Notes: Use to choose the narrowest useful validation command and packaging
    flow.

### Maintenance notes

- The approved `dotnet-platform.md` memo contains a larger candidate
  inventory; this first pass intentionally keeps only the approved file names
  from the future structure.
- Add publish-specific or AOT-specific maps later only if the approved future
  structure grows.
