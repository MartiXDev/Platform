# OTLP Export Generated Solution routing

- Manifest: `martix.platform.json`
- Acceptance record: `otlp-export.json`
- Verification: `eng/verify.mjs` from the repository root

This fixture is limited to the OTLP export acceptance seam. Keep provider
selection, all three signal contracts, privacy, bounded failure, business
isolation, and unselected absence evidence explicit. Do not add secrets,
Supported claims, or `martix.agent.json`.
