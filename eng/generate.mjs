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
import {
  createFullStackPresetPlan,
  generateFullStackPreset,
} from "./full-stack-preset.mjs";
import { runModularMonolithCli } from "./generate-modular-monolith.mjs";

const PRESET_HANDLERS = new Map([
  [
    "api",
    {
      createPlan: createApiPresetPlan,
      generate: generateApiPreset,
    },
  ],
  [
    "modular-monolith",
    {
      createPlan: createModularMonolithPresetPlan,
      generate: generateModularMonolithPreset,
    },
  ],
  [
    "full-stack",
    {
      createPlan: createFullStackPresetPlan,
      generate: generateFullStackPreset,
    },
  ],
]);

function getPresetHandler(preset) {
  const handler = PRESET_HANDLERS.get(preset);
  if (handler === undefined) {
    throw new Error(`Unsupported Template System preset: ${preset}.`);
  }

  return handler;
}

export function createPresetPlan(options = {}) {
  const preset = options.preset ?? "api";
  return getPresetHandler(preset).createPlan(options);
}

export async function generatePreset(options = {}) {
  const preset = options.preset ?? "api";
  return getPresetHandler(preset).generate(options);
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
  if (preset === "modular-monolith" || preset === "full-stack") {
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
