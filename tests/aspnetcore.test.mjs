import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const repositoryRoot = join(import.meta.dirname, "..");
const compatibilityRoot = join(
  repositoryRoot,
  "tests",
  "Compatibility",
  "AspNetCoreFailureAdapterGeneratedSolution",
);

test("the ASP.NET Core adapter candidate has a packed generated consumer seam", async () => {
  const packageEvidence = JSON.parse(
    await readFile(
      join(
        repositoryRoot,
        "tests",
        "Compatibility",
        "MartiX.Platform.AspNetCore.package-content.json",
      ),
      "utf8",
    ),
  );
  const project = await readFile(
    join(
      compatibilityRoot,
      "AspNetCoreFailureAdapterGeneratedSolution.csproj",
    ),
    "utf8",
  );
  const consumer = await readFile(
    join(compatibilityRoot, "FailureAdapterContractTests.cs"),
    "utf8",
  );
  const publicApi = await readFile(
    join(
      repositoryRoot,
      "tests",
      "Compatibility",
      "MartiX.Platform.AspNetCore.public-api.txt",
    ),
    "utf8",
  );

  assert.equal(packageEvidence.packageId, "MartiX.Platform.AspNetCore");
  assert.equal(packageEvidence.targetFramework, "net10.0");
  assert.deepEqual(packageEvidence.dependencies, [
    "MartiX.Platform",
    "Microsoft.AspNetCore.OpenApi",
    "Microsoft.OpenApi",
  ]);
  assert.match(project, /<PackageReference Include="MartiX\.Platform\.AspNetCore"/);
  assert.doesNotMatch(project, /<ProjectReference/);
  assert.match(publicApi, /ProblemHttpResult ToProblemDetails/);
  assert.match(consumer, /AddMartiXProblemDetails/);
  assert.match(consumer, /ProducesMartiXProblemDetails/);
  assert.match(consumer, /application\/problem\+json/);
  assert.match(consumer, /openapi\/v1\.json/);
});
