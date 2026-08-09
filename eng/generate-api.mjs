import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  ApiPresetGenerationError,
  createApiPresetPlan,
  generateApiPreset,
} from "./api-preset.mjs";

export * from "./api-preset.mjs";

function fail(message) {
  throw new ApiPresetGenerationError(message);
}

function parseCliArguments(argumentsList) {
  const options = {
    capabilities: [],
    providers: [],
  };
  let dryRun = false;

  for (let index = 0; index < argumentsList.length; index++) {
    const argument = argumentsList[index];
    if (argument === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (argument === "--help" || argument === "-h") {
      return { help: true };
    }

    const separator = argument.indexOf("=");
    const name = separator === -1 ? argument : argument.slice(0, separator);
    const inlineValue =
      separator === -1 ? undefined : argument.slice(separator + 1);
    const value = inlineValue ?? argumentsList[++index];
    if (value === undefined || value.startsWith("--")) {
      fail(`Option ${name} requires a value.`);
    }

    switch (name) {
      case "--name":
        options.applicationName = value;
        break;
      case "--output":
        options.outputDirectory = value;
        break;
      case "--preset":
        options.preset = value;
        break;
      case "--capability":
        options.capabilities.push(value);
        break;
      case "--provider":
        options.providers.push(value);
        break;
      case "--persistence":
        options.persistence = value;
        break;
      case "--auth":
      case "--auth-profile":
      case "--authentication":
      case "--authentication-profile":
        options.authenticationProfile = value;
        break;
      case "--ui":
        options.ui = value;
        break;
      default:
        fail(`Unknown option: ${name}.`);
    }
  }

  return { options, dryRun };
}

export async function runApiPresetCli(
  argumentsList = process.argv.slice(2),
) {
  const parsed = parseCliArguments(argumentsList);
  if (parsed.help) {
    console.log(
      [
        "Usage: node eng/generate-api.mjs --name <Application.Name> --output <directory> [--dry-run]",
        "       [--capability <id>] [--provider <id>] [--persistence none] [--ui none]",
        "       [--authentication-profile <profile>]",
      ].join("\n"),
    );
    return;
  }

  const plan = createApiPresetPlan(parsed.options);
  console.log(JSON.stringify(plan, null, 2));
  if (parsed.dryRun) {
    return;
  }

  await generateApiPreset(parsed.options);
}

const invokedFile = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : null;

if (invokedFile === import.meta.url) {
  runApiPresetCli().catch((error) => {
    console.error(`API preset generation failed: ${error.message}`);
    process.exitCode = 1;
  });
}
