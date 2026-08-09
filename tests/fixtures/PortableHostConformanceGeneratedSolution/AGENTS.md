# Portable Host Conformance Generated Solution routing

- Deployment Manifest: `../DeploymentManifestGeneratedSolution/deployment-manifest.json`
- Host evidence: `portable-host-conformance.json`
- Verification: `eng/verify.mjs` from the repository root

This fixture is the claim-free host acceptance seam. Keep every artifact bound
to the validated Deployment Manifest, keep configuration external, and preserve
the explicit migration and lifecycle checks. Do not add secrets, provider
attestation, Supported claims, or `martix.agent.json`.
