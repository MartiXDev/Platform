import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import {
  createPortableHostConformance,
  evaluatePortableHostConformance,
  verifyPortableHostConformance,
} from "../eng/portable-host-conformance.mjs";
import { validateDeploymentManifest } from "../eng/deployment-manifest.mjs";
import { validatePortableHostConformanceFixture } from "../eng/verify.mjs";

const repositoryRoot = join(import.meta.dirname, "..");
const deploymentManifestPath = join(
  repositoryRoot,
  "tests",
  "fixtures",
  "DeploymentManifestGeneratedSolution",
  "deployment-manifest.json",
);
const portableHostFixtureRoot = join(
  repositoryRoot,
  "tests",
  "fixtures",
  "PortableHostConformanceGeneratedSolution",
);
const portableHostSolutionManifestPath = join(
  portableHostFixtureRoot,
  "martix.platform.json",
);
const portableHostConformancePath = join(
  portableHostFixtureRoot,
  "portable-host-conformance.json",
);
const portableHostSchemaPath = join(
  repositoryRoot,
  "schemas",
  "portable-host-conformance.schema.json",
);

async function loadDeploymentManifest() {
  const source = JSON.parse(await readFile(deploymentManifestPath, "utf8"));
  return validateDeploymentManifest(source);
}

test("portable host evidence binds admitted profiles to one deployment identity", async () => {
  const manifest = await loadDeploymentManifest();
  const conformance = createPortableHostConformance({ manifest });

  assert.deepEqual(
    conformance.combinations.map(({ id }) => id),
    ["linux-container", "linux-process", "ubuntu-26.04", "windows-process"],
  );
  assert.ok(
    conformance.combinations.every(({ checks }) =>
      Object.values(checks).every((value) => value === true),
    ),
  );
  assert.equal(
    verifyPortableHostConformance(manifest, conformance).status,
    "passed",
  );
  assert.deepEqual(conformance.plannedTargets[0], {
    attestation: "not-attested",
    id: "active24-ubuntu-vps",
    maturity: "planned",
    provider: "active24",
  });
});

test("unsupported host coordinates and provider promotion fail closed", async () => {
  const manifest = await loadDeploymentManifest();
  const conformance = createPortableHostConformance({ manifest });

  const unsupported = structuredClone(conformance);
  unsupported.combinations.find(({ id }) => id === "linux-process").rid =
    "linux-arm64";
  assert.throws(
    () => verifyPortableHostConformance(manifest, unsupported),
    /unsupported OS\/RID\/runtime|unsupported-combination/i,
  );

  const promotedActive24 = structuredClone(conformance);
  promotedActive24.plannedTargets[0].maturity = "supported";
  assert.throws(
    () => verifyPortableHostConformance(manifest, promotedActive24),
    /Planned \/ Not Attested|support-claim/i,
  );

  const result = evaluatePortableHostConformance({
    manifest,
    conformance: unsupported,
  });
  assert.equal(result.status, "failed");
  assert.equal(result.failClosed, true);

  const failedCheck = structuredClone(conformance);
  failedCheck.combinations.find(
    ({ id }) => id === "ubuntu-26.04",
  ).checks.readiness = false;
  assert.throws(
    () => verifyPortableHostConformance(manifest, failedCheck),
    /readiness failed|fail-closed/i,
  );

  const driftedArtifact = structuredClone(conformance);
  driftedArtifact.combinations.find(
    ({ id }) => id === "linux-container",
  ).artifact.sourceDigest =
    "sha256:9999999999999999999999999999999999999999999999999999999999999999";
  assert.throws(
    () => verifyPortableHostConformance(manifest, driftedArtifact),
    /not bound|drifted/i,
  );
});

test("the named Generated Solution preserves the claim-free host seam", async () => {
  const deploymentManifest = JSON.parse(
    await readFile(deploymentManifestPath, "utf8"),
  );
  const result = await validatePortableHostConformanceFixture({
    rootDir: repositoryRoot,
    solutionManifest: JSON.parse(
      await readFile(portableHostSolutionManifestPath, "utf8"),
    ),
    conformance: JSON.parse(
      await readFile(portableHostConformancePath, "utf8"),
    ),
    conformanceSchema: JSON.parse(
      await readFile(portableHostSchemaPath, "utf8"),
    ),
    deploymentManifest,
  });

  assert.equal(result.status, "passed");
  assert.deepEqual(result.combinations, [
    {
      id: "linux-container",
      operatingSystem: "linux",
      profile: "container",
      rid: "linux-x64",
    },
    {
      id: "linux-process",
      operatingSystem: "linux",
      profile: "process",
      rid: "linux-x64",
    },
    {
      id: "ubuntu-26.04",
      operatingSystem: "linux",
      profile: "process",
      rid: "linux-x64",
    },
    {
      id: "windows-process",
      operatingSystem: "windows",
      profile: "process",
      rid: "win-x64",
    },
  ]);
});
