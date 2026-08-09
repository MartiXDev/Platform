# UI build evidence

The checked-in OpenAPI client is generated deterministically and is consumed
without a generation step in ordinary builds. The `react` provider build
uses strict types, a frozen lockfile where applicable, and a clean output
directory. Client drift and generated-source edits fail the gate.
