export const OTLP_EXPORTER_CAPABILITY = "observability-export";
export const OTLP_EXPORTER_ID = "otlp";
export const OTLP_EXPORTER_PACKAGE = Object.freeze({
  id: "OpenTelemetry.Exporter.OpenTelemetryProtocol",
  version: "1.17.0",
});

export const OTLP_EXPORTER_PROVIDER = Object.freeze({
  id: OTLP_EXPORTER_ID,
  capability: OTLP_EXPORTER_CAPABILITY,
  packageReference: OTLP_EXPORTER_PACKAGE,
});

export function hasOtlpExporter(providers) {
  return providers.includes(OTLP_EXPORTER_ID);
}
