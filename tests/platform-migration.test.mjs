import assert from "node:assert/strict";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import {
  PLATFORM_MIGRATION_TARGET_VERSION,
  applyMigration,
  createMigrationPlan,
  inspectMigration,
  verifyMigration,
  writeMigrationPlan,
} from "../eng/platform-migration.mjs";

const execFileAsync = promisify(execFile);
const repositoryRoot = join(import.meta.dirname, "..");
const fixtureRoot = join(
  repositoryRoot,
  "tests",
  "fixtures",
  "PlatformMigrationAlphaGeneratedSolution",
);

async function runGit(rootDir, argumentsList) {
  const { stdout } = await execFileAsync("git", argumentsList, {
    cwd: rootDir,
    encoding: "utf8",
  });
  return stdout.trim();
}

async function copyDirectoryContents(source, destination) {
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    if (entry.name === "bin" || entry.name === "obj") {
      continue;
    }
    const sourcePath = join(source, entry.name);
    const destinationPath = join(destination, entry.name);
    if (entry.isDirectory()) {
      await copyDirectoryContents(sourcePath, destinationPath);
    } else {
      await cp(sourcePath, destinationPath);
    }
  }
}

async function createRepository() {
  const rootDir = await mkdtemp(join(tmpdir(), "martix-migration-repository-"));
  await copyDirectoryContents(fixtureRoot, rootDir);
  await runGit(rootDir, ["init", "--initial-branch=main"]);
  await runGit(rootDir, ["config", "user.email", "migration-tests@example.invalid"]);
  await runGit(rootDir, ["config", "user.name", "Migration Tests"]);
  await runGit(rootDir, ["add", "."]);
  await runGit(rootDir, ["commit", "-m", "capture alpha fixture"]);
  return rootDir;
}

async function createPlanFile(plan) {
  const directory = await mkdtemp(join(tmpdir(), "martix-migration-plan-"));
  const path = join(directory, "migration-plan.json");
  await writeMigrationPlan(plan, path);
  return { directory, path };
}

async function withRepository(callback) {
  const rootDir = await createRepository();
  try {
    return await callback(rootDir);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
}

test("inspection is exact, read-only, and marks alpha as unsupported", async () => {
  await withRepository(async (rootDir) => {
    const beforeStatus = await runGit(rootDir, ["status", "--porcelain"]);
    const inspection = await inspectMigration({ rootDir });

    assert.equal(beforeStatus, "");
    assert.equal(inspection.status, "ready");
    assert.equal(inspection.source.platformVersion, "0.1.0-preview.1");
    assert.equal(
      inspection.source.platformContractVersion,
      "0.1.0-preview.1",
    );
    assert.equal(inspection.source.clean, true);
    assert.equal(inspection.maturity.stage, "Experimental Public Alpha");
    assert.equal(inspection.maturity.productionSupported, false);
    assert.deepEqual(
      inspection.packages.map(({ id, version }) => ({ id, version })),
      [
        {
          id: "MartiX.Platform",
          version: "0.1.0-preview.1",
        },
        {
          id: "MartiX.Platform.Analyzers",
          version: "0.1.0-preview.1",
        },
        {
          id: "MartiX.Platform.AspNetCore",
          version: "0.1.0-preview.1",
        },
        {
          id: "MartiX.Platform.EntityFrameworkCore",
          version: "0.1.0-preview.1",
        },
      ],
    );
    assert.equal(await runGit(rootDir, ["status", "--porcelain"]), "");
  });
});

test("the migration CLI exposes the non-mutating inspection command", async () => {
  await withRepository(async (rootDir) => {
    const { stdout } = await execFileAsync(
      process.execPath,
      [
        join(repositoryRoot, "eng", "platform-migration.mjs"),
        "migrate",
        "inspect",
        "--root",
        rootDir,
      ],
      { encoding: "utf8" },
    );
    const inspection = JSON.parse(stdout);

    assert.equal(inspection.kind, "migration-inspection");
    assert.equal(inspection.status, "ready");
    assert.equal(await runGit(rootDir, ["status", "--porcelain"]), "");
  });
});

test("planning is deterministic and simulates the typed owner migration in isolation", async () => {
  await withRepository(async (rootDir) => {
    const first = await createMigrationPlan({
      rootDir,
      targetVersion: PLATFORM_MIGRATION_TARGET_VERSION,
    });
    const second = await createMigrationPlan({
      rootDir,
      targetVersion: PLATFORM_MIGRATION_TARGET_VERSION,
    });

    assert.deepEqual(first, second);
    assert.equal(first.status, "ready");
    assert.equal(first.target.platformVersion, PLATFORM_MIGRATION_TARGET_VERSION);
    assert.equal(first.recovery.strategy, "source-revert");
    assert.equal(first.source.clean, true);
    assert.equal(first.steps.length, 2);
    assert.deepEqual(
      first.steps.map(({ id, kind }) => ({ id, kind })),
      [
        { id: "MXM-ALPHA-BETA-PACKAGES", kind: "msbuild-package-version" },
        { id: "MXM-ALPHA-BETA-OWNER", kind: "csharp-owner-rename" },
      ],
    );
    assert.ok(first.changes.some((change) => change.operation === "move"));
    assert.ok(first.changes.some((change) => change.operation === "edit"));
    assert.match(first.planDigest, /^sha256:[0-9a-f]{64}$/);
    assert.equal(await runGit(rootDir, ["status", "--porcelain"]), "");
  });
});

test("planning upgrades literal first-party package versions as well as shared properties", async () => {
  await withRepository(async (rootDir) => {
    const projectPath = join(
      rootDir,
      "src",
      "MartiX.AlphaRehearsal.Orders",
      "MartiX.AlphaRehearsal.Orders.csproj",
    );
    const original = await readFile(projectPath, "utf8");
    await writeFile(
      projectPath,
      original.replace(
        'Version="$(MartiXPlatformVersion)"',
        'Version="0.1.0-preview.1"',
      ),
    );
    await runGit(rootDir, ["add", projectPath]);
    await runGit(rootDir, ["commit", "-m", "capture literal package input"]);

    const plan = await createMigrationPlan({
      rootDir,
      targetVersion: PLATFORM_MIGRATION_TARGET_VERSION,
    });

    assert.equal(plan.status, "ready");
    assert.ok(
      plan.changes.some(
        (change) =>
          change.operation === "edit" &&
          change.path.endsWith("MartiX.BetaRehearsal.Orders.csproj"),
      ),
    );
  });
});

test("apply accepts only the unchanged digest-bound plan and verify records the rehearsal", async () => {
  await withRepository(async (rootDir) => {
    const plan = await createMigrationPlan({
      rootDir,
      targetVersion: PLATFORM_MIGRATION_TARGET_VERSION,
    });
    const { directory, path: planPath } = await createPlanFile(plan);

    try {
      const applied = await applyMigration({ rootDir, planPath });
      assert.equal(applied.status, "applied");
      assert.equal(applied.planDigest, plan.planDigest);

      const verification = await verifyMigration({
        rootDir,
        targetVersion: PLATFORM_MIGRATION_TARGET_VERSION,
      });
      assert.equal(verification.status, "passed");
      assert.equal(verification.rehearsal, true);
      assert.equal(verification.maturity.productionSupported, false);
      assert.equal(
        verification.manifest.platformContractVersion,
        PLATFORM_MIGRATION_TARGET_VERSION,
      );
      assert.deepEqual(verification.manifest.appliedMigrations, [
        {
          id: "MXM-ALPHA-BETA-OWNER",
          status: "rehearsed",
          from: "0.1.0-preview.1",
          to: PLATFORM_MIGRATION_TARGET_VERSION,
        },
      ]);

      const renamedSource = await readFile(
        join(
          rootDir,
          "src",
          "MartiX.BetaRehearsal.Api",
          "OwnerComposition.cs",
        ),
        "utf8",
      );
      assert.match(renamedSource, /namespace MartiX\.BetaRehearsal\.Api/);
      assert.doesNotMatch(renamedSource, /MartiX\.AlphaRehearsal/);
      assert.equal(await runGit(rootDir, ["status", "--porcelain"]).then(Boolean), true);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

test("ambiguous owner text blocks planning without mutating the source", async () => {
  await withRepository(async (rootDir) => {
    const sourcePath = join(
      rootDir,
      "src",
      "MartiX.AlphaRehearsal.Api",
      "OwnerComposition.cs",
    );
    const original = await readFile(sourcePath, "utf8");
    await writeFile(
      sourcePath,
      `${original}\npublic static class AmbiguousInput\n{\n    public const string Owner = "MartiX.AlphaRehearsal";\n}\n`,
    );
    await runGit(rootDir, ["add", sourcePath]);
    await runGit(rootDir, ["commit", "-m", "capture deliberate ambiguity"]);

    const plan = await createMigrationPlan({
      rootDir,
      targetVersion: PLATFORM_MIGRATION_TARGET_VERSION,
    });

    assert.equal(plan.status, "blocked");
    assert.equal(plan.conflicts[0].id, "MXM-AMBIGUOUS-OWNER-TEXT");
    assert.equal(plan.conflicts[0].path, "src/MartiX.AlphaRehearsal.Api/OwnerComposition.cs");
    assert.match(plan.conflicts[0].resolution, /reviewed source change/i);
    assert.equal(await readFile(sourcePath, "utf8"), `${original}\npublic static class AmbiguousInput\n{\n    public const string Owner = "MartiX.AlphaRehearsal";\n}\n`);
    assert.equal(await runGit(rootDir, ["status", "--porcelain"]), "");
  });
});

test("apply rejects stale plans and never overwrites application-owned changes", async () => {
  await withRepository(async (rootDir) => {
    const plan = await createMigrationPlan({
      rootDir,
      targetVersion: PLATFORM_MIGRATION_TARGET_VERSION,
    });
    const { directory, path: planPath } = await createPlanFile(plan);
    const sourcePath = join(
      rootDir,
      "src",
      "MartiX.AlphaRehearsal.Api",
      "OwnerComposition.cs",
    );
    const original = await readFile(sourcePath, "utf8");

    try {
      await writeFile(sourcePath, `${original}\n// application-owned change\n`);
      await assert.rejects(
        () => applyMigration({ rootDir, planPath }),
        /clean working tree|source digest/i,
      );
      assert.equal(
        await readFile(sourcePath, "utf8"),
        `${original}\n// application-owned change\n`,
      );
      assert.equal(await runGit(rootDir, ["status", "--porcelain"]).then(Boolean), true);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
