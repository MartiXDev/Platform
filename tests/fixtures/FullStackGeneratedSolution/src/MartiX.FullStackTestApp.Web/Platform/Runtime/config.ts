export type RuntimeUiConfiguration = {
  apiBasePath: string;
  deploymentVersion: string;
  environment: string;
  defaultCulture: string;
  supportedCultures: readonly string[];
  provider: "blazor-webapp" | "react" | "vue";
};

export function validateRuntimeConfiguration(
  configuration: RuntimeUiConfiguration,
): RuntimeUiConfiguration {
  if (!configuration.apiBasePath.startsWith("/")) {
    throw new Error("The public UI configuration has an invalid API base path.");
  }
  if (!configuration.supportedCultures.includes(configuration.defaultCulture)) {
    throw new Error("The public UI configuration has an unsupported default culture.");
  }
  return configuration;
}
