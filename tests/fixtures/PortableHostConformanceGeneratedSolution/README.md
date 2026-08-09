# Portable Host Conformance Generated Solution

This temporary Generated Solution is the primary acceptance seam for issue 37.
`portable-host-conformance.json` binds Windows/Linux process and OCI host
combinations, including generic Ubuntu 26.04, to the validated Deployment
Manifest from issue 35.

The evidence requires immutable artifact identity, external configuration,
Migrator ordering, readiness, liveness, graceful shutdown, restart,
permissions, networking, and failure behavior. Unsupported OS, RID, runtime,
and adapter combinations fail closed. Active24 is intentionally
**Planned / Not Attested** and the fixture makes no Supported claim.
