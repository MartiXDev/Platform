import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import {
  validateMailKitSmtpFixture,
  validateProviderAdmissionFixture,
} from "../eng/verify.mjs";

const repositoryRoot = join(import.meta.dirname, "..");
const fixtureRoot = join(
  repositoryRoot,
  "tests",
  "fixtures",
  "MailKitSmtpGeneratedSolution",
);

test("the MailKit SMTP fixture proves durable intent and controlled delivery outcomes", async () => {
  const fixture = JSON.parse(
    await readFile(join(fixtureRoot, "mailkit-smtp.json"), "utf8"),
  );
  const manifest = JSON.parse(
    await readFile(join(fixtureRoot, "martix.platform.json"), "utf8"),
  );

  const result = await validateMailKitSmtpFixture(fixture, manifest, {
    rootDir: repositoryRoot,
  });

  assert.equal(result.status, "passed");
  assert.equal(result.providerCount, 2);
  assert.equal(result.invalidSelectionCount, 2);
  assert.equal(result.behavior.outcomeCount, 4);
  assert.equal(result.behavior.mailpitVersion, "1.30.0");
});

test("the provider-neutral admission fixture has no unselected SMTP residue", async () => {
  const providerFixtureRoot = join(
    repositoryRoot,
    "tests",
    "fixtures",
    "ProviderAdmissionGeneratedSolution",
  );
  const fixture = JSON.parse(
    await readFile(join(providerFixtureRoot, "provider-admission.json"), "utf8"),
  );
  const manifest = JSON.parse(
    await readFile(join(providerFixtureRoot, "martix.platform.json"), "utf8"),
  );

  const result = await validateProviderAdmissionFixture(fixture, manifest);

  assert.equal(result.status, "passed");
  assert.equal(result.providerCount, 3);
});
