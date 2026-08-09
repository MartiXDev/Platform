# Deployment Manifest Generated Solution routing

- Manifest: `martix.platform.json`
- Deployment topology: `deployment-manifest.json`
- Verification: `eng/verify.mjs` from the repository root

This fixture is intentionally limited to the Artifact and Deployment Manifest
acceptance seam. Keep process and OCI identities, external configuration,
readiness/liveness, graceful shutdown, Migrator ordering, promotion, rollback,
and drift evidence explicit. Do not add secrets, production build commands,
Supported claims, or `martix.agent.json`.
