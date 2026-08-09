# OTLP Export Generated Solution context

OTLP export is an optional provider composed directly into the generated host.
The application owns vendor-neutral `ActivitySource`, `Meter`, and `ILogger`
contracts; the selected provider adds OTLP exporters without changing endpoint
behavior, authorization, health checks, or readiness.

Redaction runs before export, collector failures are bounded and asynchronous,
and no provider residue is allowed when OTLP is unselected.
