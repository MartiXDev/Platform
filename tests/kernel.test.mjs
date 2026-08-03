import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const repositoryRoot = join(import.meta.dirname, "..");
const compatibilityRoot = join(
  repositoryRoot,
  "tests",
  "Compatibility",
  "KernelResultErrorGeneratedSolution",
);

test("the Kernel candidate retains packed-consumer and artifact evidence", async () => {
  const packageEvidence = JSON.parse(
    await readFile(
      join(
        repositoryRoot,
        "tests",
        "Compatibility",
        "MartiX.Platform.package-content.json",
      ),
      "utf8",
    ),
  );
  const project = await readFile(
    join(compatibilityRoot, "KernelResultErrorGeneratedSolution.csproj"),
    "utf8",
  );
  const publicApi = await readFile(
    join(repositoryRoot, "tests", "Compatibility", "MartiX.Platform.public-api.txt"),
    "utf8",
  );

  assert.equal(packageEvidence.packageId, "MartiX.Platform");
  assert.equal(packageEvidence.targetFramework, "net10.0");
  assert.deepEqual(packageEvidence.dependencies, []);
  assert.match(project, /<PackageReference Include="MartiX\.Platform"/);
  assert.doesNotMatch(project, /<ProjectReference/);
  assert.match(publicApi, /MartiX\.Platform\.Results\.Result<T>/);
  assert.match(publicApi, /MartiX\.Platform\.Results\.ErrorKind/);
});
