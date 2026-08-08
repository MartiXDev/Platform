import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import {
  FASTENDPOINTS_COMBINATION_EVIDENCE,
} from "../eng/verify-fastendpoints.mjs";

const repositoryRoot = join(import.meta.dirname, "..");
const compatibilityRoot = join(
  repositoryRoot,
  "tests",
  "Compatibility",
  "FastEndpointsAdapterGeneratedSolution",
);

test("the FastEndpoints adapter has a named executable consumer seam", async () => {
  const packageEvidence = JSON.parse(
    await readFile(
      join(
        repositoryRoot,
        "tests",
        "Compatibility",
        "MartiX.Platform.AspNetCore.FastEndpoints.package-content.json",
      ),
      "utf8",
    ),
  );
  const project = await readFile(
    join(
      compatibilityRoot,
      "FastEndpointsAdapterGeneratedSolution.csproj",
    ),
    "utf8",
  );
  const consumer = await readFile(
    join(compatibilityRoot, "FastEndpointsAdapterContractTests.cs"),
    "utf8",
  );
  const publicApi = await readFile(
    join(
      repositoryRoot,
      "tests",
      "Compatibility",
      "MartiX.Platform.AspNetCore.FastEndpoints.public-api.txt",
    ),
    "utf8",
  );

  assert.equal(
    packageEvidence.packageId,
    "MartiX.Platform.AspNetCore.FastEndpoints",
  );
  assert.equal(packageEvidence.targetFramework, "net10.0");
  assert.deepEqual(packageEvidence.dependencies, [
    "FastEndpoints",
    "FastEndpoints.OpenApi",
    "MartiX.Platform.AspNetCore",
  ]);
  assert.match(project, /<OutputType>Exe<\/OutputType>/);
  assert.match(
    project,
    /<PackageReference Include="MartiX\.Platform\.AspNetCore\.FastEndpoints"/,
  );
  assert.doesNotMatch(project, /<ProjectReference/);
  assert.match(consumer, /MartiXEndpoint</);
  assert.match(consumer, /Validation_uses_the_canonical_problem_details_shape/);
  assert.match(consumer, /WithMartiXLifecycle/);
  assert.match(consumer, /openapi\/v1\.json/);
  assert.match(publicApi, /MartiXEndpoint<TRequest,TResponse>/);
  assert.deepEqual(
    FASTENDPOINTS_COMBINATION_EVIDENCE.map(
      ({ combination, status }) => ({ combination, status }),
    ),
    [
      {
        combination: "fastendpoints/jit/tunit/openapi",
        status: "supported",
      },
      { combination: "fastendpoints/trim", status: "Invalid" },
      { combination: "fastendpoints/native-aot", status: "Invalid" },
    ],
  );
});
