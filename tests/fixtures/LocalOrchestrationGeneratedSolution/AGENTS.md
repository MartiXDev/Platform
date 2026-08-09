# Local Orchestration Generated Solution routing

- Deployment Manifest: `../DeploymentManifestGeneratedSolution/deployment-manifest.json`
- Direct execution: ordinary `dotnet run`
- Aspire projection: `apphost.cs`
- Compose projection: `compose.yaml`
- Verification: `eng/verify.mjs` from the repository root

This fixture proves optional file-based Aspire and bounded single-host Compose
projections without adding orchestration dependencies to the application
baseline. Keep all configuration external, preserve the Migrator and readiness
contracts, and do not add secrets, build directives, high-availability claims,
or `martix.agent.json`.
