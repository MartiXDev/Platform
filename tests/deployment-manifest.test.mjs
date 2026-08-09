import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import {
  createDeploymentManifest,
  createDeploymentEvidence,
  promoteDeploymentArtifact,
  rollbackDeploymentArtifact,
  sha256,
  verifyDeploymentDrift,
  verifyDeploymentEvidence,
  verifyDeploymentManifest,
} from "../eng/deployment-manifest.mjs";

const sourceRevision = "0123456789abcdef0123456789abcdef01234567";
const fixtureRoot = join(
  import.meta.dirname,
  "fixtures",
  "DeploymentManifestGeneratedSolution",
);

export function deploymentInput(overrides = {}) {
  return {
    application: {
      name: "MartiX.Inventory",
      platformVersion: "0.1.0-preview.1",
      platformContractVersion: "0.1.0-preview.1",
      sourceRevision,
    },
    configuration: {
      schemaVersion: "1.0.0",
      entries: [
        {
          key: "ConnectionStrings:Database",
          type: "string",
          required: true,
          sensitivity: "sensitive",
          source: "external",
          restart: "required",
          owner: "relational-persistence",
        },
        {
          key: "ASPNETCORE_URLS",
          type: "uri",
          required: true,
          sensitivity: "public",
          source: "external",
          restart: "startup",
          owner: "host",
        },
      ],
    },
    resources: [
      {
        id: "database",
        role: "stateful",
        type: "relational-database",
        configuration: ["ConnectionStrings:Database"],
        persistence: {
          durability: "durable",
          backup: "required",
          restore: "required",
          upgrade: "versioned",
          owner: "relational-persistence",
        },
      },
      {
        id: "migrator",
        role: "migrator",
        type: "one-shot",
        artifact: "migrator",
        command: "MartiX.Inventory.Migrator",
        arguments: ["apply"],
        configuration: ["ConnectionStrings:Database"],
        dependsOn: [{ resource: "database", condition: "ready" }],
        shutdown: { signal: "SIGTERM", gracePeriodSeconds: 30 },
      },
      {
        id: "api",
        role: "serving",
        type: "http-service",
        artifact: "api",
        command: "MartiX.Inventory.Api",
        configuration: ["ASPNETCORE_URLS", "ConnectionStrings:Database"],
        dependsOn: [
          { resource: "database", condition: "ready" },
          { resource: "migrator", condition: "completed" },
        ],
        ports: [
          {
            name: "http",
            number: 8080,
            protocol: "http",
            exposure: "private",
          },
        ],
        checks: {
          startup: { kind: "http", path: "/health/startup", port: "http" },
          readiness: { kind: "http", path: "/health/readiness", port: "http" },
          liveness: { kind: "http", path: "/health/liveness", port: "http" },
        },
        shutdown: { signal: "SIGTERM", gracePeriodSeconds: 30 },
      },
    ],
    migration: {
      resource: "migrator",
      order: ["migrator"],
      beforeServing: ["api"],
      concurrency: "exclusive",
    },
    profiles: [
      {
        id: "process",
        kind: "archive",
        target: "process-host",
      },
      {
        id: "container",
        kind: "oci-image",
        target: "oci",
      },
    ],
    artifacts: [
      {
        profile: "process",
        kind: "archive",
        digest: `sha256:${"1".repeat(64)}`,
      },
      {
        profile: "container",
        kind: "oci-image",
        digest: `sha256:${"2".repeat(64)}`,
      },
    ],
    ...overrides,
  };
}

test("process and OCI artifacts share one deterministic deployment identity", () => {
  const first = createDeploymentManifest(deploymentInput());
  const second = createDeploymentManifest({
    ...deploymentInput(),
    configuration: {
      ...deploymentInput().configuration,
      entries: [...deploymentInput().configuration.entries].reverse(),
    },
    resources: [...deploymentInput().resources].reverse(),
  });

  assert.deepEqual(first.identity, second.identity);
  assert.equal(first.artifacts.length, 2);
  assert.equal(first.artifacts[0].topologyDigest, first.identity.topologyDigest);
  assert.equal(first.artifacts[1].topologyDigest, first.identity.topologyDigest);
  assert.equal(verifyDeploymentManifest(first).status, "passed");
});

test("deployment evidence proves lifecycle, promotion, rollback, and drift contracts", () => {
  const manifest = createDeploymentManifest(deploymentInput());
  const evidence = createDeploymentEvidence({ manifest });

  assert.equal(verifyDeploymentEvidence(manifest, evidence).status, "passed");
  assert.equal(evidence.checks.readiness, true);
  assert.equal(evidence.checks.liveness, true);
  assert.equal(evidence.checks.gracefulShutdown, true);
  assert.equal(evidence.checks.migratorOrdering, true);
  assert.equal(evidence.checks.promotion, true);
  assert.equal(evidence.checks.rollback, true);
  assert.equal(evidence.checks.drift, true);
  assert.equal(
    promoteDeploymentArtifact({
      manifest,
      profile: "container",
      targetEnvironment: "production",
    }).rebuilt,
    false,
  );
  assert.equal(
    rollbackDeploymentArtifact({
      manifest,
      profile: "process",
    }).rebuilt,
    false,
  );
  assert.equal(
    verifyDeploymentDrift(manifest, evidence.projections[0]).status,
    "passed",
  );
});

test("deployment evidence fails closed when checks or profile projections are incomplete", () => {
  const manifest = createDeploymentManifest(deploymentInput());
  const evidence = createDeploymentEvidence({ manifest });
  const digestEvidence = (value) => {
    value.verification.evidenceDigest = sha256({
      ...value,
      verification: {
        ...value.verification,
        evidenceDigest: null,
      },
    });
  };

  const missingCheck = structuredClone(evidence);
  delete missingCheck.checks.readiness;
  digestEvidence(missingCheck);
  assert.throws(
    () => verifyDeploymentEvidence(manifest, missingCheck),
    /check|incomplete/i,
  );

  const duplicateProjection = structuredClone(evidence);
  duplicateProjection.projections[1] = duplicateProjection.projections[0];
  digestEvidence(duplicateProjection);
  assert.throws(
    () => verifyDeploymentEvidence(manifest, duplicateProjection),
    /projection|profile/i,
  );
});

test("unsupported deployment inputs fail closed before artifact promotion", () => {
  const manifest = createDeploymentManifest(deploymentInput());
  const driftedProjection = {
    ...JSON.parse(JSON.stringify(
      createDeploymentEvidence({ manifest }).projections[0],
    )),
    migration: {
      ...manifest.migration,
      beforeServing: [],
    },
  };

  assert.throws(
    () => verifyDeploymentDrift(manifest, driftedProjection),
    /drift detected/i,
  );
  assert.throws(
    () =>
      promoteDeploymentArtifact({
        manifest,
        profile: "process",
        targetEnvironment: "production",
        rebuilt: true,
      }),
    /without a production rebuild/i,
  );
  assert.throws(
    () =>
      rollbackDeploymentArtifact({
        manifest,
        profile: "process",
        artifact: {
          profile: "process",
          digest: `sha256:${"f".repeat(64)}`,
        },
      }),
    /immutable digest selected/i,
  );
});

test("topology rejects cycles, missing probes, and embedded production builds", () => {
  const missingReadiness = deploymentInput({
    resources: deploymentInput().resources.map((resource) =>
      resource.id === "api"
        ? {
            ...resource,
            checks: {
              ...resource.checks,
              readiness: undefined,
            },
          }
        : resource,
    ),
  });
  assert.throws(
    () => createDeploymentManifest(missingReadiness),
    /checks\.readiness/i,
  );

  const cycle = deploymentInput({
    resources: deploymentInput().resources.map((resource) =>
      resource.id === "database"
        ? {
            ...resource,
            dependsOn: [{ resource: "api", condition: "ready" }],
          }
        : resource,
    ),
  });
  assert.throws(
    () => createDeploymentManifest(cycle),
    /acyclic/i,
  );

  const productionBuild = deploymentInput({
    resources: deploymentInput().resources.map((resource) =>
      resource.id === "api"
        ? { ...resource, command: "dotnet publish MartiX.Inventory.Api" }
        : resource,
    ),
  });
  assert.throws(
    () => createDeploymentManifest(productionBuild),
    /production build step/i,
  );
});

test("the named Generated Solution carries immutable deployment evidence", async () => {
  const manifest = JSON.parse(
    await readFile(join(fixtureRoot, "deployment-manifest.json"), "utf8"),
  );
  const evidence = JSON.parse(
    await readFile(join(fixtureRoot, "deployment-evidence.json"), "utf8"),
  );

  assert.equal(verifyDeploymentManifest(manifest).status, "passed");
  assert.equal(verifyDeploymentEvidence(manifest, evidence).status, "passed");
  assert.deepEqual(
    manifest.artifacts.map(({ profile }) => profile),
    ["process", "container"],
  );
  assert.equal(manifest.security.containsSecrets, false);
  assert.equal(manifest.resources.find(({ id }) => id === "api").checks.readiness.path,
    "/health/readiness",
  );
});
