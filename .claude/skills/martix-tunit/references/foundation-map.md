# TUnit foundation map

## Purpose

Map the TUnit foundation topics covered by this workstream so rule files stay
aligned with the official docs and point agents at the right companion guidance.
Foundation covers installation, project shape, the `OutputType=Exe` model,
source-generator wiring, `Microsoft.Testing.Platform` integration, runner
commands, IDE configuration, test filters, CLI flags, environment variables,
configuration files, and platform constraints.

## Rule coverage

- **Installation and project shape**
  - Rule file: `rules/foundation-installation-project.md`
  - Primary sources:
    - [Installation](https://tunit.dev/docs/getting-started/installation)
    - [Writing your first test](https://tunit.dev/docs/getting-started/writing-your-first-test)
    - [Running tests](https://tunit.dev/docs/getting-started/running-your-tests)
    - [Things to know](https://tunit.dev/docs/writing-tests/things-to-know)
  - Notes: Use for NuGet package selection (`TUnit`, `TUnit.Assertions`),
    the `OutputType=Exe` project model, the absence of
    `Microsoft.NET.Test.Sdk`, Coverlet incompatibility, built-in coverage
    and TRX flags, and the requirement to use `dotnet run` as the preferred
    execution surface over `dotnet test`.

- **Microsoft.Testing.Platform and runner wiring**
  - Rule file: `rules/foundation-installation-project.md`
  - Primary sources:
    - [Running tests](https://tunit.dev/docs/getting-started/running-your-tests)
    - [Engine modes](https://tunit.dev/docs/execution/engine-modes)
    - [Microsoft.Testing.Platform docs](https://learn.microsoft.com/en-us/dotnet/core/testing/microsoft-testing-platform-intro)
  - Notes: Use for `dotnet run` vs `dotnet test` semantics, the `--`
    separator for runner flags under `dotnet test`, in-process vs
    out-of-process engine mode selection, and TRX/coverage flag syntax
    (`--report-trx`, `--coverage`).

- **IDE configuration**
  - Rule file: `rules/foundation-installation-project.md`
  - Primary sources:
    - [Things to know](https://tunit.dev/docs/writing-tests/things-to-know)
    - [Installation](https://tunit.dev/docs/getting-started/installation)
  - Notes: Use for Visual Studio preview feature toggle, JetBrains Rider
    Testing Platform setting, and VS Code C# Dev Kit protocol requirement.
    These are non-obvious configuration steps that block test discovery
    if skipped.

- **Test filters**
  - Rule file: `rules/foundation-installation-project.md`
  - Primary sources:
    - [Test filters](https://tunit.dev/docs/execution/test-filters)
  - Notes: TUnit uses its own tree-node filter syntax, not VSTest
    `--filter` syntax. Use for filter expression format, category/display
    name filtering, and the `--` separator when invoking via `dotnet test`.

- **CLI flags and environment variables**
  - Rule file: `rules/foundation-installation-project.md`
  - Primary sources:
    - [Command-line flags](https://tunit.dev/docs/reference/command-line-flags)
    - [Environment variables](https://tunit.dev/docs/reference/environment-variables)
    - [Test configuration](https://tunit.dev/docs/reference/test-configuration)
  - Notes: Use for the full `dotnet run --` flag set, environment variable
    overrides, and `testconfig.json` schema.

- **AOT constraints**
  - Rule file: `rules/foundation-installation-project.md`
  - Primary sources:
    - [Native AOT](https://tunit.dev/docs/writing-tests/aot)
  - Notes: Use for the AOT publish model, reflection constraints, source
    generator reliance for test discovery, and the AOT-compatible project
    property set.

- **CI/CD reporting**
  - Rule file: `rules/foundation-installation-project.md`
  - Primary sources:
    - [CI/CD reporting](https://tunit.dev/docs/execution/ci-cd-reporting)
  - Notes: Use for GitHub Actions integration, TRX output, code coverage
    artifact patterns, and the distinction between built-in coverage and
    Coverlet (Coverlet is incompatible).

- **Troubleshooting**
  - Rule file: `rules/foundation-installation-project.md`
  - Primary sources:
    - [Troubleshooting](https://tunit.dev/docs/troubleshooting)
  - Notes: Use for runner-startup failures, discovery problems caused by
    wrong project shape or missing source-generator output, and output
    format issues in CI environments.

## Related files

- [Foundation and project setup rule](../rules/foundation-installation-project.md)
- [Execution map](./execution-map.md)
- [Cookbook index](./cookbook-index.md)
- [Source index and guardrails](./doc-source-index.md)

## Source anchors

- [TUnit installation](https://tunit.dev/docs/getting-started/installation)
  - NuGet packages, project file setup, source generator wiring.
- [Running tests](https://tunit.dev/docs/getting-started/running-your-tests)
  - `dotnet run`, `dotnet test`, TRX and coverage flag syntax.
- [Things to know](https://tunit.dev/docs/writing-tests/things-to-know)
  - Core project model concepts, no-class-attribute rule, async test model,
    IDE configuration requirements.
- [Engine modes](https://tunit.dev/docs/execution/engine-modes)
  - In-process vs out-of-process execution model selection.
- [Test filters](https://tunit.dev/docs/execution/test-filters)
  - TUnit tree-node filter syntax; not VSTest syntax.
- [Command-line flags](https://tunit.dev/docs/reference/command-line-flags)
  - Full flag reference for the `dotnet run --` surface.
- [Environment variables](https://tunit.dev/docs/reference/environment-variables)
  - Runtime configuration via environment variables.
- [Test configuration](https://tunit.dev/docs/reference/test-configuration)
  - `testconfig.json` structure and supported keys.
- [Native AOT](https://tunit.dev/docs/writing-tests/aot)
  - AOT-safe project setup and discovery constraints.
- [CI/CD reporting](https://tunit.dev/docs/execution/ci-cd-reporting)
  - Pipeline output formats and GitHub Actions integration.
- [Troubleshooting](https://tunit.dev/docs/troubleshooting)
  - Common runner, discovery, and output problems.
- [Microsoft.Testing.Platform intro](https://learn.microsoft.com/en-us/dotnet/core/testing/microsoft-testing-platform-intro)
  - Underlying runner platform documentation.

## Maintenance notes

- Keep this map TUnit-specific. Generic .NET project-setup guidance belongs
  in `martix-dotnet-csharp`, not here.
- When the foundation rule splits into more than one file, add new entries to
  `## Rule coverage` and update `## Related files` before shipping the split.
- If TUnit adopts or drops `Microsoft.NET.Test.Sdk` support in a future
  release, update this map and the foundation rule together so no cross-link
  goes stale.
- The `OutputType=Exe` requirement is the most common adoption blocker; keep
  it prominent in both this map and the rule.
