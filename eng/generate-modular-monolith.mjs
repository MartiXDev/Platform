import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  createModularMonolithPresetPlan,
  generateModularMonolithPreset,
  ModularMonolithPresetGenerationError,
} from "./modular-monolith-preset.mjs";

export * from "./modular-monolith-preset.mjs";

function fail(message) {
  throw new ModularMonolithPresetGenerationError(message);
}

function appendBusinessModules(options, value) {
  options.businessModules.push(
    ...value
      .split(",")
      .map((moduleName) => moduleName.trim())
      .filter((moduleName) => moduleName.length > 0),
  );
}

function appendModuleDependency(options, value) {
  const separator = value.includes(":")
    ? value.indexOf(":")
    : value.indexOf("=");
  if (separator <= 0 || separator === value.length - 1) {
    fail(
      "Option --module-dependency requires <consumer>:<provider>[,<provider>...].",
    );
  }

  const consumer = value.slice(0, separator).trim();
  const providers = value
    .slice(separator + 1)
    .split(",")
    .map((provider) => provider.trim())
    .filter((provider) => provider.length > 0);
  if (providers.length === 0) {
    fail(
      "Option --module-dependency requires <consumer>:<provider>[,<provider>...].",
    );
  }

  options.moduleDependencies[consumer] = [
    ...(options.moduleDependencies[consumer] ?? []),
    ...providers,
  ];
}

function parseCliArguments(argumentsList) {
  const options = {
    businessModules: [],
    capabilities: [],
    moduleDependencies: {},
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
      case "--module":
      case "--business-module":
      case "--business-modules":
        appendBusinessModules(options, value);
        break;
      case "--module-dependency":
        appendModuleDependency(options, value);
        break;
      case "--capability":
        options.capabilities.push(value);
        break;
      case "--provider":
      case "--database-provider":
      case "--relational-provider":
        options.relationalProvider = value;
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
      default:
        fail(`Unknown option: ${name}.`);
    }
  }

  if (options.businessModules.length === 0) {
    delete options.businessModules;
  }
  if (Object.keys(options.moduleDependencies).length === 0) {
    delete options.moduleDependencies;
  }
  if (options.capabilities.length === 0) {
    delete options.capabilities;
  }
  if (options.providers.length === 0) {
    delete options.providers;
  }

  return { options, dryRun };
}

export async function runModularMonolithCli(
  argumentsList = process.argv.slice(2),
) {
  const parsed = parseCliArguments(argumentsList);
  if (parsed.help) {
    console.log(
      [
        "Usage: node eng/generate-modular-monolith.mjs --name <Application.Name> --output <directory>",
        "       --module <BusinessModule> [--module <BusinessModule> ...]",
        "       [--module-dependency <Consumer>:<Provider>[,<Provider>...]]",
        "       [--relational-provider postgresql|sqlserver] [--dry-run]",
        "       [--authentication-profile <profile>]",
      ].join("\n"),
    );
    return;
  }

  const plan = createModularMonolithPresetPlan(parsed.options);
  console.log(JSON.stringify(plan, null, 2));
  if (parsed.dryRun) {
    return;
  }

  await generateModularMonolithPreset(parsed.options);
}

const invokedFile = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : null;

if (invokedFile === import.meta.url) {
  runModularMonolithCli().catch((error) => {
    if (error instanceof ModularMonolithPresetGenerationError) {
      console.error(`Modular Monolith generation failed: ${error.message}`);
    } else {
      console.error(
        "Modular Monolith generation failed due to an unexpected error.",
      );
    }
    process.exitCode = 1;
  });
}
