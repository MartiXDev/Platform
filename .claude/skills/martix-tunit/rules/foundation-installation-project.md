# TUnit foundation — installation and project shape

## Purpose

Establish the project model every TUnit test project must follow so that
discovery, execution, coverage, and IDE integration all work reliably.
TUnit's `Microsoft.Testing.Platform` architecture differs fundamentally
from the VSTest-based model used by xUnit, NUnit, and MSTest; applying
the wrong assumptions from those frameworks is the most common source of
broken setups.

## Default guidance

### Project file shape

- Set `<OutputType>Exe</OutputType>`. TUnit generates a `Program` entry point
  via source generation. The project **must** be an executable, not a class
  library.
- Target `.NET 8` or higher for all new projects. TUnit's minimum supported
  TFM is `.NET 8`.
- Install the single `TUnit` meta package; it pulls in `TUnit.Core`,
  `TUnit.Assertions`, `TUnit.Assertions.Extensions`, and the bundled
  `Microsoft.Testing.Extensions.CodeCoverage` and
  `Microsoft.Testing.Extensions.TrxReport` extensions automatically.
- Remove any auto-generated `Program.cs` or top-level statements after project
  creation; TUnit's source generator supplies the `Main` entry point.
- A minimal `.csproj` looks exactly like this — keep it that way:

  ```xml
  <Project Sdk="Microsoft.NET.Sdk">
    <PropertyGroup>
      <OutputType>Exe</OutputType>
      <TargetFramework>net8.0</TargetFramework>
      <ImplicitUsings>enable</ImplicitUsings>
      <Nullable>enable</Nullable>
    </PropertyGroup>
    <ItemGroup>
      <PackageReference Include="TUnit" Version="*" />
    </ItemGroup>
  </Project>
  ```

### Test class shape

- No class-level attribute is required or expected. Do not add `[TestClass]`
  (MSTest) or `[TestFixture]` (NUnit).
- Each test method is decorated with `[Test]`.
- TUnit injects global usings for `TUnit.Core`, `TUnit.Assertions`, and
  `TUnit.Assertions.Extensions`; test files need no explicit `using` statements
  for these namespaces.
- Follow the `[ProjectName].Tests` naming convention for test projects.

### Running tests

- **Primary surface: `dotnet run`**. This is the command the official TUnit
  docs lead with. Coverage and TRX flags are passed directly:

  ```bash
  dotnet run --configuration Release
  dotnet run --configuration Release --coverage
  dotnet run --configuration Release --report-trx
  dotnet run --configuration Release --coverage --report-trx
  ```

- **Secondary surface: `dotnet test`**. Works, but all TUnit-specific flags
  must follow `--` or the runner rejects them as unknown switches:

  ```bash
  dotnet test --configuration Release -- --coverage --report-trx
  ```

- **Direct binary execution** after a build: invoke the compiled `.dll` with
  `dotnet exec` or the published `.exe` directly on Windows.

### Bundled extensions

- `Microsoft.Testing.Extensions.CodeCoverage` provides the `--coverage` flag
  and outputs Cobertura/XML. It is installed automatically with the `TUnit`
  meta package.
- `Microsoft.Testing.Extensions.TrxReport` provides the `--report-trx` flag
  for Azure DevOps-compatible TRX output. Also installed automatically.
- No additional NuGet packages are needed for coverage or TRX reporting.

### IDE configuration (required)

All three major IDEs require a one-time settings change to recognise TUnit's
`Microsoft.Testing.Platform` runner:

| IDE | Setting |
| --- | --- |
| **Visual Studio** | Tools → Manage Preview Features → enable **Use testing platform server mode** |
| **Rider** | Settings → Build, Execution, Deployment → Unit Testing → Testing Platform → enable **Enable Testing Platform support** |
| **VS Code** | C# Dev Kit extension settings → Dotnet → Test Window → enable **Use Testing Platform Protocol** |

Without these changes the IDE test runner will not discover or run TUnit tests.

### .NET Framework polyfill

- TUnit adds polyfill types (for example `ModuleInitialiserAttribute`) to
  projects targeting .NET Framework automatically.
- If another library in the solution also defines these types and you get
  duplicate-definition errors, suppress TUnit's polyfill generation by adding
  `<EnableTUnitPolyfills>false</EnableTUnitPolyfills>` to the project file.
- With NuGet Central Package Management (CPM) active, TUnit injects the
  `Polyfill` package using `VersionOverride` automatically; you do not need to
  add it to `Directory.Packages.props` unless you want to pin a specific
  version explicitly.
- TUnit sets `<PolyUseEmbeddedAttribute>true</PolyUseEmbeddedAttribute>` to
  embed polyfill types per project and avoid `InternalsVisibleTo` conflicts.
  Override with `false` only if your solution already manages this.

## Avoid

- **Do not add `Microsoft.NET.Test.Sdk`**. This package hooks the VSTest
  platform and breaks TUnit discovery. It must never appear in a TUnit test
  project's dependencies.
- **Do not install `coverlet.collector` or `coverlet.msbuild`**. Coverlet
  requires the VSTest platform. It is incompatible with `Microsoft.Testing.Platform`
  and will produce missing-coverage or broken-run errors.
- **Do not set `<OutputType>Library</OutputType>`** in a TUnit project. The
  source-generated entry point requires the project to be an executable.
- **Do not pass TUnit flags directly to `dotnet test`** without the `--`
  separator. Flags like `--coverage` or `--report-trx` before `--` are parsed
  by the `dotnet test` host as its own arguments and rejected.
- **Do not leave a hand-authored `Program.cs`**. It conflicts with the
  source-generated entry point.
- **Do not skip the IDE settings step**. Tests will not appear in the Test
  Explorer until the "testing platform server mode" or equivalent toggle is
  enabled, regardless of whether `dotnet run` works on the command line.
- **Do not assume `dotnet test` flag syntax from xUnit or NUnit projects
  carries over** unchanged. TUnit's flag set is different and must follow `--`.

## Review checklist

- [ ] Project file sets `<OutputType>Exe</OutputType>`.
- [ ] `TUnit` meta package is present; `Microsoft.NET.Test.Sdk` and all
      `coverlet.*` packages are absent.
- [ ] No hand-authored `Program.cs` or top-level statements conflict with the
      source-generated entry point.
- [ ] The preferred execution command is `dotnet run`; `dotnet test` usage is
      documented with the `--` separator.
- [ ] Coverage and TRX reporting use the bundled extensions via flags, not
      separate packages.
- [ ] IDE configuration has been applied in all relevant developer environments.
- [ ] Any `.NET Framework` polyfill conflict is resolved with
      `<EnableTUnitPolyfills>false</EnableTUnitPolyfills>` before falling back
      to other workarounds.

## Related files

- [Foundation map](../references/foundation-map.md)
- [Data-inline and method sources](./data-inline-method-sources.md)
- [Migration and framework comparison](./migration-comparison.md)

## Source anchors

- [TUnit installation](https://tunit.dev/docs/getting-started/installation)
  — `OutputType=Exe`, NuGet package, bundled extensions, polyfill, CPM notes,
  and the `Microsoft.NET.Test.Sdk` danger callout.
- [Running your tests](https://tunit.dev/docs/getting-started/running-your-tests)
  — `dotnet run` as primary surface, `dotnet test` with `--` separator, IDE
  setup for Visual Studio, Rider, and VS Code.
- [Writing your first test](https://tunit.dev/docs/getting-started/writing-your-first-test)
  — No class attribute, `[Test]` method attribute, global usings.
- [Built-in extensions](https://tunit.dev/docs/extending/built-in-extensions)
  — Code coverage and TRX report extension details.
- [Microsoft.Testing.Platform introduction](https://learn.microsoft.com/en-us/dotnet/core/testing/microsoft-testing-platform-intro)
  — Underlying runner platform that TUnit builds on.
