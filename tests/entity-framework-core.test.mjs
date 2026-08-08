import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const repositoryRoot = join(import.meta.dirname, "..");
const packageRoot = join(
  repositoryRoot,
  "src",
  "MartiX.Platform.EntityFrameworkCore",
);

async function readPackageFile(...segments) {
  return readFile(join(packageRoot, ...segments), "utf8");
}

test("the EF Core package exposes only the admitted persistence policy surface", async () => {
  const [
    project,
    specification,
    timestamps,
    concurrency,
    interceptor,
    modelBuilder,
    databaseNaming,
  ] =
    await Promise.all([
      readPackageFile("MartiX.Platform.EntityFrameworkCore.csproj"),
      readPackageFile("Specifications", "Specification.cs"),
      readPackageFile("EntityTimestamps", "IHasEntityTimestamps.cs"),
      readPackageFile("EntityTimestamps", "IHasConcurrencyToken.cs"),
      readPackageFile(
        "EntityTimestamps",
        "EntityTimestampsSaveChangesInterceptor.cs",
      ),
      readPackageFile(
        "EntityTimestamps",
        "EntityTimestampsModelBuilderExtensions.cs",
      ),
      readPackageFile("DatabaseNaming", "DatabaseNaming.cs"),
    ]);

  assert.match(project, /<PackageId>MartiX\.Platform\.EntityFrameworkCore<\/PackageId>/);
  assert.match(project, /Microsoft\.EntityFrameworkCore/);
  assert.doesNotMatch(
    project,
    /<PackageReference\b[^>]*Include="(?:[^"]*(?:AspNetCore|Npgsql|SqlServer|IUnitOfWork|Repository))/,
  );
  assert.match(specification, /public sealed class Specification<TEntity>/);
  assert.match(specification, /IQueryable<TEntity>/);
  assert.match(specification, /Include<TProperty>/);
  assert.match(specification, /OrderBy<TProperty>/);
  assert.match(specification, /Apply<TResult>/);
  assert.match(specification, /public Specification<TEntity> (?:And|Or)\(/);
  assert.doesNotMatch(specification, /ToList(?:Async)?|First(?:OrDefault)?Async/);
  assert.match(timestamps, /public interface IHasEntityTimestamps/);
  assert.match(concurrency, /public interface IHasConcurrencyToken/);
  assert.match(interceptor, /Entries<IHasConcurrencyToken>\(\)/);
  assert.match(interceptor, /Entries<IHasEntityTimestamps>\(\)/);
  assert.match(interceptor, /GetUtcNow\(\)/);
  assert.match(interceptor, /createdAt\.CurrentValue = createdAt\.OriginalValue/);
  assert.match(interceptor, /createdAt\.IsModified = false/);
  assert.match(modelBuilder, /HasEntityTimestamps<TEntity>/);
  assert.match(databaseNaming, /public static string ToSnakeCase\(string identifier\)/);
});
