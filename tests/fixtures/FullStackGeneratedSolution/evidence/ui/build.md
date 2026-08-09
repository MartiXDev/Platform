# UI build evidence

Provider: `blazor-webapp`
Rendering profile: `application`

The checked-in OpenAPI client is generated deterministically and is consumed
without a generation step in ordinary builds. The `blazor-webapp` provider build
uses the `interactive-server-prerendered` rendering profile, a clean output
directory, and no unreviewed generated-source edits. Client drift fails the gate.
