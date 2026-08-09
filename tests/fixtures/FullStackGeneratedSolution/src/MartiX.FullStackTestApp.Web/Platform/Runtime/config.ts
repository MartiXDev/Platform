export type RuntimeUiConfiguration = {
  apiBasePath: string;
  deploymentVersion: string;
  environment: string;
  defaultCulture: string;
  supportedCultures: readonly string[];
  provider: "blazor-webapp" | "react" | "vue";
};

const culturePattern = /^[A-Za-z]{2,8}(?:[-_][A-Za-z0-9]{1,8})*$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isProvider(
  value: unknown,
): value is RuntimeUiConfiguration["provider"] {
  return value === "blazor-webapp" || value === "react" || value === "vue";
}

export function validateRuntimeConfiguration(
  value: unknown,
): RuntimeUiConfiguration {
  if (!isRecord(value)) {
    throw new Error("The public UI configuration must be an object.");
  }
  const {
    apiBasePath,
    deploymentVersion,
    environment,
    defaultCulture,
    supportedCultures,
    provider,
  } = value;
  if (
    typeof apiBasePath !== "string" ||
    !apiBasePath.startsWith("/") ||
    apiBasePath.startsWith("//")
  ) {
    throw new Error("The public UI configuration has an invalid API base path.");
  }
  if (
    typeof deploymentVersion !== "string" ||
    deploymentVersion.length === 0 ||
    typeof environment !== "string" ||
    environment.length === 0 ||
    typeof defaultCulture !== "string" ||
    !culturePattern.test(defaultCulture) ||
    !Array.isArray(supportedCultures) ||
    !supportedCultures.every(
      (culture): culture is string =>
        typeof culture === "string" && culturePattern.test(culture),
    ) ||
    !isProvider(provider)
  ) {
    throw new Error("The public UI configuration has invalid values.");
  }
  if (!supportedCultures.includes(defaultCulture)) {
    throw new Error("The public UI configuration has an unsupported default culture.");
  }
  return {
    apiBasePath,
    deploymentVersion,
    environment,
    defaultCulture,
    supportedCultures,
    provider,
  };
}

export async function loadRuntimeConfiguration(
  fetcher: typeof fetch = fetch,
): Promise<RuntimeUiConfiguration> {
  const response = await fetcher("/ui-config.json", {
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error("The public UI configuration could not be loaded.");
  }
  return validateRuntimeConfiguration(await response.json());
}
