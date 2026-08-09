# Release Candidate Generated Solution

`release-candidate.json` is the temporary, claim-free Release Evidence
Manifest for `1.0.0-rc.1`. It binds the complete release cadence to one clean
reviewed commit and to exact artifact digests.

The candidate is built once, verified against those exact bytes, and promoted
without rebuild. A release-blocking fix invalidates this candidate and creates
a new candidate whose affected gates are rerun; no candidate is patched in
place.

Run the repository-owned verification surface with:

```text
npm run verify:release-candidate
```
