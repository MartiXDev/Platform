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
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry): entry is string =>
        typeof entry === "string" && entry.length > 0,
    )
  );
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
  if (
    typeof value.apiBasePath !== "string" ||
    !value.apiBasePath.startsWith("/") ||
    value.apiBasePath.startsWith("//")
  ) {
    throw new Error("The public UI configuration has an invalid API base path.");
  }
  if (
    typeof value.deploymentVersion !== "string" ||
    value.deploymentVersion.length === 0 ||
    typeof value.environment !== "string" ||
    value.environment.length === 0 ||
    typeof value.defaultCulture !== "string" ||
    !culturePattern.test(value.defaultCulture) ||
    !isStringArray(value.supportedCultures) ||
    !value.supportedCultures.every((culture) => culturePattern.test(culture)) ||
    !value.supportedCultures.includes(value.defaultCulture) ||
    !isProvider(value.provider)
  ) {
    throw new Error("The public UI configuration is incomplete.");
  }
  return {
    apiBasePath: value.apiBasePath,
    deploymentVersion: value.deploymentVersion,
    environment: value.environment,
    defaultCulture: value.defaultCulture,
    supportedCultures: value.supportedCultures,
    provider: value.provider,
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
