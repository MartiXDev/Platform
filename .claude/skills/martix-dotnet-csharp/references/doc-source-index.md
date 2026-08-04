## Source index and guardrails

### Purpose

This index records which sources are approved for the first-pass standalone
skill library and which source families are intentionally excluded.

### Source priority

1. [Project brief](../../../docs/martix-dotnet-csharp/martix-dotnet-csharp.md)
1. Official documentation families:
   - [Agent Skills specification](https://agentskills.io/specification)
   - [GitHub Copilot skill docs](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/create-skills)
   - [Microsoft Learn for .NET and C#](https://learn.microsoft.com/en-us/dotnet/)
   - [Microsoft Learn for ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/)
   - [Microsoft Learn for EF Core](https://learn.microsoft.com/en-us/ef/core/)

### Approved local artifacts

| Artifact | Role in this package | Notes |
| --- | --- | --- |
| `docs/martix-dotnet-csharp/martix-dotnet-csharp.md` | Canonical brief and direction | Highest-priority local source |
| `docs/martix-dotnet-csharp/*.md` | Comparisons and active planning | Historical comparisons are context; the phase-two plan is the active backlog. |

The package does not retain the temporary first-pass research notes that
informed its initial design. Treat the source anchors in each rule and map as
the traceable technical source trail; add a local artifact here only when it is
committed with its provenance and review date.

### Excluded in-repo sources

- `docs/martix-csharp`
- `src/plugins/martix-dotnet-library`
- `src/plugins/martix-webapi`
- Other non-approved repo content unless a later task explicitly approves it

### Maintenance notes

- Treat this library as standalone-first under `skills`.
- Keep reference maps traceable back to official docs and the approved research
  artifacts.
- Add new sources here before using them to expand the rule set.
