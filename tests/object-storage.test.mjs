import assert from "node:assert/strict";
import test from "node:test";
import {
  AZURE_BLOB_OBJECT_STORAGE_CONTRACT,
  createAzureBlobObjectStorageEvidence,
  mapAzureBlobFailure,
  validateAzureBlobObjectStorageConfiguration,
  verifyAzureBlobObjectStorageEvidence,
} from "../eng/object-storage.mjs";

test("Azure Blob evidence records a bounded, claim-free contract until live parity passes", () => {
  const evidence = createAzureBlobObjectStorageEvidence();
  const result = verifyAzureBlobObjectStorageEvidence(evidence);

  assert.equal(result.status, "passed");
  assert.equal(result.provider, "azure-blob");
  assert.equal(result.supportStatus, "blocked");
  assert.equal(result.liveParity, "not-attested");
  assert.equal(evidence.supportClaims.length, 0);
  assert.equal(
    evidence.contract.maxObjectBytes,
    AZURE_BLOB_OBJECT_STORAGE_CONTRACT.maxObjectBytes,
  );
  assert.deepEqual(
    evidence.contract.operations.map(({ id }) => id),
    ["write", "read", "head", "delete"],
  );
});

test("Azure Blob evidence requires matching live parity before a support claim", () => {
  const evidence = createAzureBlobObjectStorageEvidence({
    liveAzure: { outcome: "passed" },
    supportClaims: ["object-storage:azure-blob"],
  });

  assert.equal(
    verifyAzureBlobObjectStorageEvidence(evidence).supportStatus,
    "eligible",
  );

  const mismatch = createAzureBlobObjectStorageEvidence({
    liveAzure: {
      outcome: "passed",
      contractDigest: "sha256:0000000000000000000000000000000000000000000000000000000000000000",
    },
  });
  assert.throws(
    () => verifyAzureBlobObjectStorageEvidence(mismatch),
    /live-Azure parity evidence does not match/i,
  );
});

test("Azure Blob evidence fails closed for unsafe retries, missing redaction, and unbounded streams", () => {
  const unsafeRetry = structuredClone(createAzureBlobObjectStorageEvidence());
  unsafeRetry.contract.retry.unsafeWrite = "retry";
  assert.throws(
    () => verifyAzureBlobObjectStorageEvidence(unsafeRetry),
    /unsafe writes must not be retried/i,
  );

  const missingRedaction = structuredClone(
    createAzureBlobObjectStorageEvidence(),
  );
  missingRedaction.contract.redaction.forbiddenData =
    missingRedaction.contract.redaction.forbiddenData.filter(
      (value) => value !== "signed-url",
    );
  assert.throws(
    () => verifyAzureBlobObjectStorageEvidence(missingRedaction),
    /signed-url/i,
  );

  const unbounded = structuredClone(createAzureBlobObjectStorageEvidence());
  unbounded.contract.maxObjectBytes = null;
  assert.throws(
    () => verifyAzureBlobObjectStorageEvidence(unbounded),
    /maxObjectBytes/i,
  );
});

test("Azure Blob configuration rejects secret-bearing endpoints and unsafe production transport", () => {
  assert.deepEqual(
    validateAzureBlobObjectStorageConfiguration({
      serviceUri: "https://storage.example.test",
      container: "objects",
      credentialSource: "managed-identity",
      environment: "production",
    }),
    {
      serviceUri: "https://storage.example.test",
      container: "objects",
      credentialSource: "managed-identity",
      environment: "production",
    },
  );

  assert.throws(
    () =>
      validateAzureBlobObjectStorageConfiguration({
        serviceUri: "https://storage.example.test/?sig=secret",
        container: "objects",
        credentialSource: "managed-identity",
        environment: "production",
      }),
    /query|credential|secret/i,
  );
  assert.throws(
    () =>
      validateAzureBlobObjectStorageConfiguration({
        serviceUri: "http://storage.example.test",
        container: "objects",
        credentialSource: "managed-identity",
        environment: "production",
      }),
    /https/i,
  );
  assert.throws(
    () =>
      validateAzureBlobObjectStorageConfiguration({
        serviceUri: "ftp://storage.example.test",
        container: "objects",
        credentialSource: "managed-identity",
        environment: "test",
      }),
    /http or https/i,
  );
});

test("Azure Blob failures map to stable provider-independent outcomes", () => {
  assert.deepEqual(mapAzureBlobFailure({ status: 404 }), {
    outcome: "not-found",
    retryable: false,
  });
  assert.deepEqual(mapAzureBlobFailure({ status: 412 }), {
    outcome: "precondition-failed",
    retryable: false,
  });
  assert.deepEqual(mapAzureBlobFailure({ status: 503 }), {
    outcome: "unavailable",
    retryable: true,
  });
  assert.deepEqual(mapAzureBlobFailure({ cancelled: true }), {
    outcome: "cancelled",
    retryable: false,
  });
});
