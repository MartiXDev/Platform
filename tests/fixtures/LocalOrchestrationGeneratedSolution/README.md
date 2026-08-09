# Local Orchestration Generated Solution

This temporary Generated Solution is the primary acceptance seam for issue 36.
The projections are derived from
`../DeploymentManifestGeneratedSolution/deployment-manifest.json`; the
Deployment Manifest remains the only topology source.

Direct execution remains available without Aspire or a container runtime:

```text
dotnet run --project ../ModularMonolithGeneratedSolution/src/MartiX.TemplateTestApp.Api
dotnet run --project ../ModularMonolithGeneratedSolution/src/MartiX.TemplateTestApp.Migrator -- apply
```

Optional local projections are declared explicitly:

```text
aspire run apphost.cs
docker compose -f compose.yaml up --wait
```

`apphost.cs` is file-based and has no AppHost project. `compose.yaml` consumes
digest-addressed application images, requires external configuration and
database adapter inputs, runs the Migrator before serving, and is bounded to
one host. It contains no production build directive, populated environment file,
secret value, or availability claim.
