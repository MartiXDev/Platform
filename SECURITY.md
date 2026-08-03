# Security policy

MartiX Platform is in repository bootstrap and does not make a Supported
Capability or production security-support claim yet.

## Reporting a vulnerability

Do not open a public issue with exploit details. Use the repository's private
GitHub security-advisory reporting channel:

<https://github.com/MartiXDev/Platform/security/advisories/new>

Include the affected commit, reproduction steps, impact, and any proposed
mitigation. Remove credentials and personal data from the report.

## Repository controls

- Secrets are delivered externally and are forbidden in manifests and source.
- Security-sensitive changes require the `pull-request` verification cadence.
- Historical provenance and current repository authority are kept separate;
  report any unexplained source or dependency change as a security concern.
