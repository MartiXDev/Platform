import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  createApiPresetPlan,
  generateApiPreset,
} from "./api-preset.mjs";
import { runApiPresetCli } from "./generate-api.mjs";
import {
  createModularMonolithPresetPlan,
  generateModularMonolithPreset,
} from "./modular-monolith-preset.mjs";
import { runModularMonolithCli } from "./generate-modular-monolith.mjs";

export function createPresetPlan(options = {}) {
  const preset = options.preset ?? "api";
  switch (preset) {
    case "api":
      return createApiPresetPlan(options);
    case "modular-monolith":
      return createModularMonolithPresetPlan(options);
    default:
      throw new Error(`Unsupported Template System preset: ${preset}.`);
  }
}

export async function generatePreset(options = {}) {
  const preset = options.preset ?? "api";
  switch (preset) {
    case "api":
      return generateApiPreset(options);
    case "modular-monolith":
      return generateModularMonolithPreset(options);
    default:
      throw new Error(`Unsupported Template System preset: ${preset}.`);
  }
}

function readPreset(argumentsList) {
  const presetIndex = argumentsList.findIndex(
    (argument) => argument === "--preset" || argument.startsWith("--preset="),
  );
  if (presetIndex === -1) {
    return "api";
  }
  const argument = argumentsList[presetIndex];
  if (argument.startsWith("--preset=")) {
    return argument.slice("--preset=".length);
  }
  return argumentsList[presetIndex + 1] ?? "api";
}

export async function runTemplateCli(
  argumentsList = process.argv.slice(2),
) {
  const preset = readPreset(argumentsList);
  if (preset === "modular-monolith") {
    return runModularMonolithCli(argumentsList);
  }
  return runApiPresetCli(argumentsList);
}

const invokedFile = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : null;

if (invokedFile === import.meta.url) {
  runTemplateCli().catch((error) => {
    console.error(`Template System generation failed: ${error.message}`);
    process.exitCode = 1;
  });
}
