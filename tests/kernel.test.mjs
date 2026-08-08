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
  const actorSnapshot = await readFile(
    join(repositoryRoot, "src", "MartiX.Platform", "Security", "ActorSnapshot.cs"),
    "utf8",
  );
  const auditEvent = await readFile(
    join(repositoryRoot, "src", "MartiX.Platform", "Security", "SecurityAuditEvent.cs"),
    "utf8",
  );

  assert.equal(packageEvidence.packageId, "MartiX.Platform");
  assert.equal(packageEvidence.targetFramework, "net10.0");
  assert.deepEqual(packageEvidence.dependencies, []);
  assert.match(project, /<PackageReference Include="MartiX\.Platform"/);
  assert.doesNotMatch(project, /<ProjectReference/);
  assert.match(publicApi, /MartiX\.Platform\.Results\.Result<T>/);
  assert.match(publicApi, /MartiX\.Platform\.Results\.ErrorKind/);
  assert.match(actorSnapshot, /public sealed class ActorSnapshot/);
  assert.match(actorSnapshot, /public static ActorSnapshot Anonymous\(\)/);
  assert.match(auditEvent, /SecurityAuditEventId EventId/);
  assert.match(auditEvent, /SecurityAuditOutcome Outcome/);
  assert.doesNotMatch(auditEvent, /Dictionary<|IDictionary</);
});

test("the packed Kernel consumer requires the analyzer build asset", async () => {
  const analyzerEvidence = JSON.parse(
    await readFile(
      join(
        repositoryRoot,
        "tests",
        "Compatibility",
        "MartiX.Platform.Analyzers.package-content.json",
      ),
      "utf8",
    ),
  );
  const project = await readFile(
    join(compatibilityRoot, "KernelResultErrorGeneratedSolution.csproj"),
    "utf8",
  );
  const analyzerReadme = await readFile(
    join(repositoryRoot, "src", "MartiX.Platform.Analyzers", "README.md"),
    "utf8",
  );

  assert.equal(analyzerEvidence.packageId, "MartiX.Platform.Analyzers");
  assert.equal(analyzerEvidence.targetFramework, "netstandard2.0");
  assert.deepEqual(analyzerEvidence.dependencies, []);
  assert.deepEqual(analyzerEvidence.analyzerAssemblyEntries, [
    "analyzers/dotnet/cs/MartiX.Platform.Analyzers.dll",
  ]);
  assert.match(project, /<PackageReference Include="MartiX\.Platform\.Analyzers"/);
  assert.match(analyzerReadme, /\bMXP001\b/);
  assert.match(analyzerReadme, /\bMXP002\b/);
});
