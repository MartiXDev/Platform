import { execFile } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { z } from "zod";
import {
  FORBIDDEN_RELIABLE_EVENT_PROVIDER_IMPLEMENTATIONS,
  MODULAR_MONOLITH_ALPHA_INVALID_SELECTIONS,
  MODULAR_MONOLITH_ALPHA_PROVIDERS,
  RELIABLE_EVENT_PROVIDER_IMPLEMENTATIONS,
  canonicalJson,
  createModularMonolithAlphaEvidence,
  ModularMonolithAlphaEvidenceError,
  sha256,
  verifyModularMonolithAlphaEvidence,
} from "./modular-monolith-alpha.mjs";
import {
  MODULAR_MONOLITH_MANIFEST_SCHEMA_URI,
  MODULAR_MONOLITH_PLATFORM_VERSION,
  generateModularMonolithPreset,
} from "./modular-monolith-preset.mjs";
import {
  listZipEntries,
  runDotnet,
} from "./package-verification.mjs";
import {
  BootstrapVerificationError,
  validateQualityGatePolicy,
} from "./verify.mjs";

const execFileAsync = promisify(execFile);
const PUBLIC_PACKAGE_SOURCE = "https://api.nuget.org/v3/index.json";
const APPLICATION_NAME = "MartiX.Alpha";
const BUSINESS_MODULES = Object.freeze(["Orders", "Billing"]);
const MODULE_DEPENDENCIES = Object.freeze([
  { consumer: "Billing", provider: "Orders", access: "Contracts" },
]);
const PACKAGE_DEFINITIONS = Object.freeze([
  {
    id: "MartiX.Platform",
    projectPath: "src/MartiX.Platform/MartiX.Platform.csproj",
    targetFramework: "net10.0",
  },
  {
    id: "MartiX.Platform.AspNetCore",
    projectPath: "src/MartiX.Platform.AspNetCore/MartiX.Platform.AspNetCore.csproj",
    targetFramework: "net10.0",
  },
  {
    id: "MartiX.Platform.Analyzers",
    projectPath: "src/MartiX.Platform.Analyzers/MartiX.Platform.Analyzers.csproj",
    targetFramework: "netstandard2.0",
  },
  {
    id: "MartiX.Platform.EntityFrameworkCore",
    projectPath:
      "src/MartiX.Platform.EntityFrameworkCore/MartiX.Platform.EntityFrameworkCore.csproj",
    targetFramework: "net10.0",
  },
]);
const PROVIDER_PACKAGE_IDS = Object.freeze({
  postgresql: "Npgsql.EntityFrameworkCore.PostgreSQL",
  sqlserver: "Microsoft.EntityFrameworkCore.SqlServer",
});
const PROVIDER_APIS = Object.freeze({
  postgresql: "UseNpgsql",
  sqlserver: "UseSqlServer",
});
const FORBIDDEN_PROVIDER_APIS = Object.freeze({
  postgresql: "UseSqlServer",
  sqlserver: "UseNpgsql",
});
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;

export class ModularMonolithAlphaVerificationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ModularMonolithAlphaVerificationError";
  }
}

function fail(message) {
  throw new ModularMonolithAlphaVerificationError(message);
}

function requireString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(`${label} is required.`);
  }

  return value.trim();
}

function requireDigest(value, label) {
  if (typeof value !== "string" || !DIGEST_PATTERN.test(value)) {
    fail(`${label} must be a sha256 digest.`);
  }

  return value;
}

async function listFiles(root) {
  const files = [];

  async function visit(directory, relativeDirectory = "") {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const relativePath = relativeDirectory
        ? join(relativeDirectory, entry.name)
        : entry.name;
      const absolutePath = join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(absolutePath, relativePath);
      } else {
        files.push(relativePath.replaceAll("\\", "/"));
      }
    }
  }

  await visit(root);
  return files.sort();
}

async function digestFile(path) {
  return sha256(await readFile(path));
}

async function digestDirectory(root, files) {
  const entries = [];
  for (const relativePath of [...files].sort()) {
    entries.push({
      path: relativePath.replaceAll("\\", "/"),
      digest: await digestFile(join(root, relativePath)),
    });
  }

  return {
    digest: sha256(canonicalJson(entries)),
    files: entries,
  };
}

async function readJson(path, label) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error instanceof SyntaxError) {
      fail(`Invalid JSON in ${label}: ${error.message}`);
    }

    throw error;
  }
}

async function validateAlphaQualityPolicy(repositoryRoot) {
  const policy = await readJson(
    join(repositoryRoot, "eng", "quality-gates.json"),
    "eng/quality-gates.json",
  );
  try {
    validateQualityGatePolicy(policy);
  } catch (error) {
    if (error instanceof BootstrapVerificationError) {
      fail(error.message);
    }
    throw error;
  }
}

async function resolveSourceCommit(rootDir, requestedCommit) {
  const value =
    requestedCommit ?? process.env.GITHUB_SHA ?? process.env.SOURCE_COMMIT;
  let commit;
  if (value === undefined) {
    const result = await execFileAsync("git", ["rev-parse", "HEAD"], {
      cwd: rootDir,
    });
    commit = result.stdout.trim();
  } else {
    commit = requireString(value, "sourceCommit").toLowerCase();
  }

  if (!/^[0-9a-f]{40}$/.test(commit)) {
    fail("sourceCommit must be a 40-character hexadecimal commit.");
  }
  try {
    const result = await execFileAsync(
      "git",
      ["rev-parse", "--verify", `${commit}^{commit}`],
      { cwd: rootDir },
    );
    if (result.stdout.trim() !== commit) {
      fail("sourceCommit does not resolve to the requested commit.");
    }
  } catch (error) {
    if (error instanceof ModularMonolithAlphaVerificationError) {
      throw error;
    }
    if (error?.code === "ENOENT") {
      throw error;
    }
    fail("sourceCommit does not resolve to the requested commit.");
  }

  return commit;
}

function providerEnvironmentName(provider, suffix) {
  return `MARTIX_MODULAR_MONOLITH_${provider.toUpperCase()}_${suffix}`;
}

function requireProviderInputs(environment) {
  return Object.fromEntries(
    MODULAR_MONOLITH_ALPHA_PROVIDERS.map((provider) => {
      const databaseName = providerEnvironmentName(provider, "DATABASE");
      const migrationDatabaseName = providerEnvironmentName(
        provider,
        "MIGRATION_DATABASE",
      );
      const database = environment[databaseName];
      const migrationDatabase = environment[migrationDatabaseName];
      if (typeof database !== "string" || database.trim().length === 0) {
        fail(`Missing required provider evidence input: ${databaseName}.`);
      }
      if (
        typeof migrationDatabase !== "string" ||
        migrationDatabase.trim().length === 0
      ) {
        fail(
          `Missing required provider evidence input: ${migrationDatabaseName}.`,
        );
      }
      if (database === migrationDatabase) {
        fail(
          `${databaseName} and ${migrationDatabaseName} must be separate connection inputs.`,
        );
      }

      return [
        provider,
        {
          database,
          migrationDatabase,
          databaseEnvironmentVariable: databaseName,
          migrationDatabaseEnvironmentVariable: migrationDatabaseName,
        },
      ];
    }),
  );
}

function packageBuildProperties(buildRoot) {
  return [
    "-p:ContinuousIntegrationBuild=true",
    "-p:Deterministic=true",
    `-p:BaseOutputPath=${join(buildRoot, "bin")}${"/"}`,
    `-p:BaseIntermediateOutputPath=${join(buildRoot, "obj")}${"/"}`,
  ];
}

async function writeNuGetConfig(directory, packageFeed) {
  const escapeXml = (value) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  const configPath = join(directory, "NuGet.Config");
  const feed = escapeXml(packageFeed);
  await writeFile(
    configPath,
    `<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <packageSources>
    <clear />
    <add key="candidate" value="${feed}" />
    <add key="public" value="${PUBLIC_PACKAGE_SOURCE}" />
  </packageSources>
  <packageSourceMapping>
    <packageSource key="candidate">
      <package pattern="MartiX.*" />
    </packageSource>
    <packageSource key="public">
      <package pattern="Microsoft.*" />
      <package pattern="Npgsql" />
      <package pattern="Npgsql.*" />
      <package pattern="System.*" />
      <package pattern="TUnit*" />
      <package pattern="runtime.*" />
    </packageSource>
  </packageSourceMapping>
</configuration>
`,
    "utf8",
  );
  return configPath;
}

function packagePath(packageFeed, definition) {
  return join(
    packageFeed,
    `${definition.id}.${MODULAR_MONOLITH_PLATFORM_VERSION}.nupkg`,
  );
}

async function packPackage({
  rootDir,
  temporaryRoot,
  packageFeed,
  configPath,
  definition,
  run,
}) {
  const buildRoot = join(temporaryRoot, "package-build", definition.id);
  const properties = packageBuildProperties(buildRoot);
  await run(
    [
      "restore",
      definition.projectPath,
      "--configfile",
      configPath,
      "--nologo",
      ...properties,
    ],
    rootDir,
  );
  await run(
    [
      "pack",
      definition.projectPath,
      "--configuration",
      "Release",
      "--output",
      packageFeed,
      "--no-restore",
      "--nologo",
      ...properties,
    ],
    rootDir,
  );
}

async function packFirstPartyArtifacts({
  rootDir,
  temporaryRoot,
  packageFeed,
  configPath,
  run,
}) {
  await mkdir(packageFeed, { recursive: true });
  for (const definition of PACKAGE_DEFINITIONS) {
    await packPackage({
      rootDir,
      temporaryRoot,
      packageFeed,
      configPath,
      definition,
      run,
    });
  }

  const feedFiles = (await readdir(packageFeed)).sort();
  const expectedFiles = PACKAGE_DEFINITIONS.map(
    (definition) =>
      `${definition.id}.${MODULAR_MONOLITH_PLATFORM_VERSION}.nupkg`,
  ).sort();
  if (JSON.stringify(feedFiles) !== JSON.stringify(expectedFiles)) {
    fail(
      `The isolated first-party feed is not exact: expected ${expectedFiles.join(
        ", ",
      )}; found ${feedFiles.join(", ")}.`,
    );
  }

  const packages = [];
  for (const definition of PACKAGE_DEFINITIONS) {
    const archivePath = packagePath(packageFeed, definition);
    const archive = await readFile(archivePath);
    const entries = listZipEntries(archive, definition.id);
    const names = entries.map((entry) => entry.name);
    const expectedAssembly =
      definition.id === "MartiX.Platform.Analyzers"
        ? `analyzers/dotnet/cs/${definition.id}.dll`
        : `lib/${definition.targetFramework}/${definition.id}.dll`;
    if (!names.some((name) => name === expectedAssembly)) {
      fail(`Packed artifact is missing its expected assembly: ${definition.id}.`);
    }
    if (!names.some((name) => name.endsWith(".nuspec"))) {
      fail(`Packed artifact is missing its nuspec: ${definition.id}.`);
    }
    packages.push({
      id: definition.id,
      version: MODULAR_MONOLITH_PLATFORM_VERSION,
      digest: await digestFile(archivePath),
    });
  }

  return packages;
}

async function verifyPackageCacheIdentity(packageCache, packages) {
  for (const artifact of packages) {
    const packageDirectory = join(
      packageCache,
      artifact.id.toLowerCase(),
      artifact.version.toLowerCase(),
    );
    const packageFiles = (await readdir(packageDirectory)).filter((file) =>
      file.endsWith(".nupkg"),
    );
    if (packageFiles.length !== 1) {
      fail(
        `Isolated restore did not produce one cached package for ${artifact.id}.`,
      );
    }
    const cachedDigest = await digestFile(
      join(packageDirectory, packageFiles[0]),
    );
    if (cachedDigest !== artifact.digest) {
      fail(`Restore did not consume ${artifact.id} byte-for-byte from the feed.`);
    }
  }
}

function projectPaths(applicationName) {
  return {
    api: `src/${applicationName}.Api/${applicationName}.Api.csproj`,
    client: `src/${applicationName}.Client/${applicationName}.Client.csproj`,
    migrator: `src/${applicationName}.Migrator/${applicationName}.Migrator.csproj`,
    tests: `tests/${applicationName}.Tests/${applicationName}.Tests.csproj`,
  };
}

async function verifyGeneratedSolution(rootDir, generatedRoot, result) {
  const manifestPath = join(generatedRoot, "martix.platform.json");
  const schema = await readJson(
    join(rootDir, "schemas", "martix.platform.schema.json"),
    "schemas/martix.platform.schema.json",
  );
  const manifest = await readJson(manifestPath, "martix.platform.json");
  const parsed = z.fromJSONSchema(schema).safeParse(manifest);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    fail(
      `Generated alpha manifest is invalid at ${issue.path.join(".")}: ${issue.message}`,
    );
  }
  if (
    manifest.$schema !== MODULAR_MONOLITH_MANIFEST_SCHEMA_URI ||
    manifest.preset !== "modular-monolith" ||
    manifest.repository?.name !== APPLICATION_NAME ||
    manifest.providers?.length !== 1 ||
    manifest.providers[0]?.id !== result.plan.relationalProvider ||
    manifest.supportClaims?.length !== 0 ||
    manifest.security?.containsSecrets !== false
  ) {
    fail("Generated alpha manifest does not match the resolved composition.");
  }

  const actualFiles = await listFiles(generatedRoot);
  if (JSON.stringify(actualFiles) !== JSON.stringify(result.files)) {
    fail("Generated alpha solution file inventory is not deterministic.");
  }
  const paths = projectPaths(APPLICATION_NAME);
  const testSource = await readFile(
    join(generatedRoot, "tests", `${APPLICATION_NAME}.Tests`, "ModularMonolithCompositionTests.cs"),
    "utf8",
  );
  const projectSource = await readFile(join(generatedRoot, paths.tests), "utf8");
  const allSource = (
    await Promise.all(
      result.files
        .filter((file) => file.endsWith(".cs"))
        .map((file) => readFile(join(generatedRoot, file), "utf8")),
    )
  ).join("\n");
  if (
    !/<OutputType>Exe<\/OutputType>/i.test(projectSource) ||
    !/<TreatWarningsAsErrors>true<\/TreatWarningsAsErrors>/i.test(projectSource)
  ) {
    fail("Generated alpha TUnit project must be an executable with warnings as errors.");
  }
  if (
    !testSource.includes("Real_provider_transaction_and_crash_redelivery_are_idempotent") ||
    !testSource.includes("MARTIX_MODULAR_MONOLITH_DATABASE") ||
    !testSource.includes("DuplicateSuppressed") ||
    !testSource.includes("InboxReceipts") ||
    !testSource.includes("DbUpdateConcurrencyException") ||
    !testSource.includes("concurrencyConflictObserved")
  ) {
    fail(
      "Generated alpha tests must exercise real-provider concurrency, Inbox redelivery, and deduplication paths.",
    );
  }
  if (allSource.includes(FORBIDDEN_PROVIDER_APIS[result.plan.relationalProvider])) {
    fail(
      `Generated ${result.plan.relationalProvider} solution contains the other provider API.`,
    );
  }
  const providerLeaseImplementation =
    RELIABLE_EVENT_PROVIDER_IMPLEMENTATIONS[result.plan.relationalProvider];
  const forbiddenProviderLeaseImplementation =
    FORBIDDEN_RELIABLE_EVENT_PROVIDER_IMPLEMENTATIONS[
      result.plan.relationalProvider
    ];
  if (
    !allSource.includes(providerLeaseImplementation) ||
    allSource.includes(forbiddenProviderLeaseImplementation)
  ) {
    fail(
      `Generated ${result.plan.relationalProvider} solution does not use its provider-specific reliable-event lease implementation.`,
    );
  }

  return {
    manifest,
    manifestDigest: sha256(canonicalJson(manifest)),
    files: actualFiles,
    paths,
  };
}

function gateEvidence(provider, id, evidence) {
  return {
    id,
    outcome: "passed",
    evidenceDigest: sha256(canonicalJson({ provider, id, evidence })),
  };
}

async function runExpectedPendingValidation({ runMigrationOperation }) {
  try {
    await runMigrationOperation("validate");
  } catch (error) {
    if (
      error instanceof ModularMonolithAlphaVerificationError &&
      /pending migrations/i.test(error.message)
    ) {
      return {
        outcome: "failed-as-expected",
        digest: sha256(error.message),
      };
    }
    throw error;
  }

  fail(
    "Fresh database evidence expected the pre-apply migration validation to report pending migrations.",
  );
}

async function runMigrationEvidence({
  run,
  generatedRoot,
  migrator,
  environment,
}) {
  const runMigrationOperation = (operation) =>
    run(
      [
        "run",
        "--project",
        migrator,
        "--configuration",
        "Release",
        "--no-restore",
        "--no-build",
        "--",
        operation,
      ],
      generatedRoot,
      environment,
    );
  const freshValidation = await runExpectedPendingValidation({
    runMigrationOperation,
  });
  const apply = await runMigrationOperation("apply");
  const historicalValidation = await runMigrationOperation("validate");
  const historicalValidationDigest = sha256(
    historicalValidation.stdout ?? "",
  );
  const script = await runMigrationOperation("script");
  if (!/create\s+(schema|table)/i.test(script.stdout ?? "")) {
    fail("Migration script evidence did not contain relational DDL.");
  }
  const idempotentApply = await runMigrationOperation("apply");
  return {
    freshValidation,
    applyDigest: sha256(apply.stdout ?? ""),
    historicalValidationDigest,
    validateDigest: historicalValidationDigest,
    scriptDigest: sha256(script.stdout ?? ""),
    idempotentApplyDigest: sha256(idempotentApply.stdout ?? ""),
  };
}

async function runProviderVariant({
  rootDir,
  temporaryRoot,
  packageFeed,
  configPath,
  packageCache,
  provider,
  providerInputs,
  environment,
  run,
  packages,
}) {
  const generatedRoot = join(temporaryRoot, `generated-${provider}`);
  const providerEnvironment = {
    ...environment,
    NUGET_PACKAGES: packageCache,
  };
  const result = await generateModularMonolithPreset({
    applicationName: APPLICATION_NAME,
    businessModules: BUSINESS_MODULES,
    moduleDependencies: { Billing: ["Orders"] },
    relationalProvider: provider,
    outputDirectory: generatedRoot,
  });
  const generatedSolution = await verifyGeneratedSolution(
    rootDir,
    generatedRoot,
    result,
  );
  const paths = generatedSolution.paths;
  await run(
    ["restore", paths.tests, "--configfile", configPath, "--nologo"],
    generatedRoot,
    providerEnvironment,
  );
  await verifyPackageCacheIdentity(packageCache, packages);
  for (const project of [paths.api, paths.migrator, paths.tests]) {
    await run(
      [
        "build",
        project,
        "--configuration",
        "Release",
        "--no-restore",
        "--nologo",
        "-p:TreatWarningsAsErrors=true",
        "-warnaserror",
      ],
      generatedRoot,
      providerEnvironment,
    );
  }

  const providerRuntimeEnvironment = {
    ...providerEnvironment,
    MARTIX_MODULAR_MONOLITH_DATABASE: providerInputs.database,
    ConnectionStrings__Database: providerInputs.database,
    ConnectionStrings__MigrationDatabase: providerInputs.migrationDatabase,
  };
  const migrationEvidence = await runMigrationEvidence({
    run,
    generatedRoot,
    migrator: paths.migrator,
    environment: providerRuntimeEnvironment,
  });
  const testRun = await run(
    [
      "run",
      "--project",
      paths.tests,
      "--configuration",
      "Release",
      "--no-restore",
      "--no-build",
      "--",
      "--disable-logo",
    ],
    generatedRoot,
    providerRuntimeEnvironment,
  );
  const solutionDigest = await digestDirectory(
    generatedRoot,
    generatedSolution.files,
  );
  const providerGateEvidence = [
    gateEvidence(provider, "modular-monolith.generated-solution", {
      files: generatedSolution.files,
      solutionDigest: solutionDigest.digest,
      manifestDigest: generatedSolution.manifestDigest,
    }),
    gateEvidence(provider, "modular-monolith.architecture", {
      projects: result.plan.projects,
      modules: result.plan.businessModules,
      dependencies: result.plan.moduleDependencies,
      selectedProvider: provider,
    }),
    gateEvidence(provider, "modular-monolith.provider-integration", {
      provider,
      providerApi: PROVIDER_APIS[provider],
      packageId: PROVIDER_PACKAGE_IDS[provider],
      databaseEnvironmentVariable:
        providerInputs.databaseEnvironmentVariable,
      migrationDatabaseEnvironmentVariable:
        providerInputs.migrationDatabaseEnvironmentVariable,
    }),
    gateEvidence(provider, "modular-monolith.migration", {
      ...migrationEvidence,
      migrationDatabaseEnvironmentVariable:
        providerInputs.migrationDatabaseEnvironmentVariable,
    }),
    gateEvidence(provider, "modular-monolith.reliability", {
      testProject: paths.tests,
      testOutputDigest: sha256(
        `${testRun.stdout ?? ""}\n${testRun.stderr ?? ""}`,
      ),
      realProvider: true,
      transactionRollback: true,
      leaseExpiryRedelivery: true,
      inboxDeduplication: true,
    }),
  ];
  return {
    provider,
    generatedSolutionDigest: solutionDigest.digest,
    manifestDigest: generatedSolution.manifestDigest,
    inputDigest: null,
    files: generatedSolution.files,
    gates: providerGateEvidence,
    plan: result.plan,
  };
}

export async function verifyModularMonolithAlpha({
  rootDir = process.cwd(),
  applicationName = APPLICATION_NAME,
  evidenceDirectory = join(resolve(rootDir), "artifacts", "modular-monolith-alpha"),
  sourceCommit,
} = {}) {
  if (applicationName !== APPLICATION_NAME) {
    fail(`Alpha evidence uses the fixed candidate application name ${APPLICATION_NAME}.`);
  }
  const repositoryRoot = resolve(rootDir);
  await validateAlphaQualityPolicy(repositoryRoot);
  const providerInputs = requireProviderInputs(process.env);
  const sourceCommitValue = await resolveSourceCommit(
    repositoryRoot,
    sourceCommit,
  );
  const temporaryRoot = await mkdtemp(
    join(tmpdir(), "martix-modular-monolith-alpha-"),
  );
  const packageFeed = join(temporaryRoot, "feed");
  const packageCache = join(temporaryRoot, "packages");
  const environment = {
    ...process.env,
    DOTNET_CLI_HOME: join(temporaryRoot, "dotnet-home"),
    DOTNET_NOLOGO: "1",
    DOTNET_SKIP_FIRST_TIME_EXPERIENCE: "1",
    NUGET_PACKAGES: packageCache,
  };
  const dotnet = process.env.DOTNET ?? "dotnet";
  const run = (
    argumentsList,
    cwd = repositoryRoot,
    commandEnvironment = environment,
  ) =>
    runDotnet(
      dotnet,
      argumentsList,
      cwd,
      "Modular Monolith alpha",
      commandEnvironment,
      (message) => new ModularMonolithAlphaVerificationError(message),
    );

  try {
    await mkdir(packageFeed, { recursive: true });
    const configPath = await writeNuGetConfig(temporaryRoot, packageFeed);
    const packages = await packFirstPartyArtifacts({
      rootDir: repositoryRoot,
      temporaryRoot,
      packageFeed,
      configPath,
      run,
    });
    const schemaDigest = await digestFile(
      join(repositoryRoot, "schemas", "martix.platform.schema.json"),
    );
    const qualityPolicyDigest = await digestFile(
      join(repositoryRoot, "eng", "quality-gates.json"),
    );
    const commonInputDigest = sha256(
      canonicalJson({
        applicationName,
        artifacts: packages,
        businessModules: BUSINESS_MODULES,
        moduleDependencies: MODULE_DEPENDENCIES,
        platformVersion: MODULAR_MONOLITH_PLATFORM_VERSION,
        qualityPolicyDigest,
        schemaDigest,
        sourceCommit: sourceCommitValue,
      }),
    );
    const variants = [];
    for (const provider of MODULAR_MONOLITH_ALPHA_PROVIDERS) {
      const providerPackageCache = join(
        temporaryRoot,
        "packages",
        provider,
      );
      const variant = await runProviderVariant({
        rootDir: repositoryRoot,
        temporaryRoot,
        packageFeed,
        configPath,
        packageCache: providerPackageCache,
        provider,
        providerInputs: providerInputs[provider],
        environment,
        run,
        packages,
      });
      variants.push({
        ...variant,
        inputDigest: commonInputDigest,
      });
    }
    if (
      JSON.stringify(variants[0].files) !== JSON.stringify(variants[1].files)
    ) {
      fail("PostgreSQL and SQL Server generated solutions are not synchronized.");
    }
    const releaseEvidence = {
      providerCoordinates: MODULAR_MONOLITH_ALPHA_PROVIDERS.map(
        (provider) => `modular-monolith/${provider}`,
      ),
      invalidSelections: [...MODULAR_MONOLITH_ALPHA_INVALID_SELECTIONS],
      packageFeed: "isolated",
      packageIds: packages.map(({ id }) => id),
      packageDigests: packages,
      qualityPolicyDigest,
      schemaDigest,
      sourceCommit: sourceCommitValue,
      synchronizedInputDigest: commonInputDigest,
    };
    const verification = {
      packageFeed: "isolated",
      packageCache: "isolated",
      generatedVariants: variants.map(({ provider, files }) => ({
        provider,
        files,
      })),
      releaseEvidence,
    };
    const evidence = createModularMonolithAlphaEvidence({
      sourceCommit: sourceCommitValue,
      platformVersion: MODULAR_MONOLITH_PLATFORM_VERSION,
      applicationName,
      businessModules: BUSINESS_MODULES,
      moduleDependencies: MODULE_DEPENDENCIES,
      artifacts: packages,
      variants: variants.map(
        ({
          provider,
          generatedSolutionDigest,
          manifestDigest,
          inputDigest,
          gates,
        }) => ({
          provider,
          generatedSolutionDigest,
          manifestDigest,
          inputDigest,
          gates,
        }),
      ),
      releaseGate: {
        id: "modular-monolith.release-evidence",
        outcome: "passed",
        evidenceDigest: sha256(canonicalJson(releaseEvidence)),
      },
      compatibility: {
        synchronized: true,
        coordinates: releaseEvidence.providerCoordinates,
        invalidSelections: releaseEvidence.invalidSelections,
      },
      verification,
    });
    verifyModularMonolithAlphaEvidence(evidence);
    const directory = resolve(requireString(evidenceDirectory, "evidenceDirectory"));
    await mkdir(directory, { recursive: true });
    const evidencePath = join(directory, `${evidence.candidateId}.json`);
    const contents = `${JSON.stringify(
      {
        ...evidence,
      },
      null,
      2,
    )}\n`;
    try {
      await writeFile(evidencePath, contents, { encoding: "utf8", flag: "wx" });
    } catch (error) {
      if (error?.code !== "EEXIST") {
        throw error;
      }
      const existing = await readJson(evidencePath, evidencePath);
      verifyModularMonolithAlphaEvidence(existing);
      if (canonicalJson(existing) !== canonicalJson(JSON.parse(contents))) {
        fail(`Alpha evidence already exists with a different identity: ${evidencePath}`);
      }
    }
    const digestPath = `${evidencePath}.sha256`;
    const digestContents = `${evidence.evidenceDigest}  ${relative(
      directory,
      evidencePath,
    )}\n`;
    try {
      await writeFile(digestPath, digestContents, {
        encoding: "utf8",
        flag: "wx",
      });
    } catch (error) {
      if (error?.code !== "EEXIST") {
        throw error;
      }
      if ((await readFile(digestPath, "utf8")).trim() !== digestContents.trim()) {
        fail(`Alpha evidence digest sidecar is mutable: ${digestPath}`);
      }
    }
    return {
      status: "passed",
      ...evidence,
      evidencePath,
      generatedVariants: variants.map(({ provider, files }) => ({
        provider,
        files,
      })),
      gates: evidence.gates.map((gate) => gate.id),
    };
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

export async function runModularMonolithAlphaCli(
  argumentsList = process.argv.slice(2),
) {
  const options = {};
  for (let index = 0; index < argumentsList.length; index++) {
    const argument = argumentsList[index];
    if (argument === "--help" || argument === "-h") {
      console.log(
        [
          "Usage: node eng/verify-modular-monolith-alpha.mjs",
          "       [--evidence <directory>] [--source-commit <40-character-commit>]",
        ].join("\n"),
      );
      return;
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
      case "--evidence":
        options.evidenceDirectory = value;
        break;
      case "--source-commit":
        options.sourceCommit = value;
        break;
      default:
        fail(`Unknown option: ${name}.`);
    }
  }

  console.log(
    JSON.stringify(await verifyModularMonolithAlpha(options), null, 2),
  );
}

const invokedFile = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : null;

if (invokedFile === import.meta.url) {
  runModularMonolithAlphaCli().catch((error) => {
    if (
      error instanceof ModularMonolithAlphaVerificationError ||
      error instanceof ModularMonolithAlphaEvidenceError
    ) {
      console.error(`Modular Monolith alpha verification failed: ${error.message}`);
    } else {
      console.error(
        "Modular Monolith alpha verification failed due to an unexpected error.",
      );
    }
    process.exitCode = 1;
  });
}
