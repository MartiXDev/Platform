# MartiX Platform 1.0.0

Stable `1.0.0` promotes the accepted `1.0.0-rc.1` artifact bytes without a
rebuild. The synchronized packages, template, Tool, documentation, schema,
Skill, generated client, process and OCI evidence, SBOM, provenance, evidence
bundle, and migration artifact are identified by the stable promotion evidence
digest.

This is the first stable major, so `1.0.0` establishes the immutable Major
Floor compatibility baseline. There is no preceding stable release,
predecessor-major claim, provider claim, deployment claim, or migration claim
in this release evidence.

The repository-owned verification command is:

```text
npm run verify:stable-promotion
```

The machine-readable Release Evidence is the
[`stable-promotion.json`](../../../tests/fixtures/StablePromotionGeneratedSolution/stable-promotion.json)
fixture and is verified against the accepted Release Candidate evidence.
