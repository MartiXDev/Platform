import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const repositoryRoot = join(import.meta.dirname, "..");
const packageRoot = join(
  repositoryRoot,
  "src",
  "MartiX.Platform.IntegrationEvents.RabbitMq",
);

async function readPackageFile(name) {
  return readFile(join(packageRoot, name), "utf8");
}

async function readPackageFiles(names) {
  return Promise.all(names.map((name) => readPackageFile(name)));
}

test("RabbitMQ adapter centralizes subscription normalization", async () => {
  const [options, topology, transport] = await readPackageFiles([
    "RabbitMqTransportOptions.cs",
    "RabbitMqTopology.cs",
    "RabbitMqReliableEventsTransport.cs",
  ]);

  assert.match(options, /GetNormalizedSubscriptions/);
  assert.match(options, /NormalizeConfiguredSubscription/);
  assert.match(options, /Encoding\.UTF8\.GetByteCount/);
  assert.match(options, /Contains\('\*'\)|Contains\('#'\)/);
  assert.match(topology, /options\.GetNormalizedSubscriptions\(\)/);
  assert.match(transport, /options\.GetNormalizedSubscriptions\(\)/);
  assert.match(transport, /NormalizeDeliverySubscription/);
});

test("RabbitMQ adapter validates composition and cleans up host-owned resources", async () => {
  const [connectionManager, registration] = await readPackageFiles([
    "RabbitMqConnectionManager.cs",
    "RabbitMqReliableEventsRegistration.cs",
  ]);

  assert.match(
    connectionManager,
    /CreateChannelOnConnectionAsync[\s\S]*connection\.DisposeAsync/,
  );
  assert.match(registration, /services\.AddReliableEvents\(\)/);
  assert.match(registration, /callbacks\.ClaimAsync/);
  assert.match(registration, /callbacks\.DeliverAsync/);
  assert.match(registration, /callbacks\.AcknowledgeAsync/);
  assert.match(registration, /callbacks\.ScheduleRetryAsync/);
  assert.match(registration, /callbacks\.FailAsync/);
});

test("RabbitMQ adapter pins the provider and preserves durable transport boundaries", async () => {
  const [
    project,
    options,
    topology,
    serializer,
    connectionManager,
    transport,
    registration,
    diagnostics,
  ] =
    await readPackageFiles([
      "MartiX.Platform.IntegrationEvents.RabbitMq.csproj",
      "RabbitMqTransportOptions.cs",
      "RabbitMqTopology.cs",
      "RabbitMqEnvelopeSerializer.cs",
      "RabbitMqConnectionManager.cs",
      "RabbitMqReliableEventsTransport.cs",
      "RabbitMqReliableEventsRegistration.cs",
      "RabbitMqTransportDiagnostics.cs",
    ]);

  assert.match(project, /PackageId>MartiX\.Platform\.IntegrationEvents\.RabbitMq/);
  assert.match(
    project,
    /PackageReference Include="RabbitMQ\.Client" Version="7\.2\.1"/,
  );
  assert.match(
    project,
    /PackageReference Include="MartiX\.Platform\.EntityFrameworkCore"/,
  );
  assert.match(options, /amqp:\/\/|amqps:\/\//);
  assert.match(options, /Subscriptions/);
  assert.match(options, /PrefetchCount/);
  assert.match(topology, /ExchangeType\.Topic/);
  assert.match(topology, /durable: true/);
  assert.match(topology, /QueueBindAsync/);
  assert.match(serializer, /LeaseId/);
  assert.match(serializer, /PayloadFingerprint/);
  assert.match(serializer, /ReliableEventEnvelope\.Rehydrate/);
  assert.match(serializer, /JsonSerializerContext/);
  assert.match(serializer, /JsonSerializable/);
  assert.doesNotMatch(serializer, /JsonSerializerOptions/);
  assert.match(
    `${connectionManager}\n${transport}`,
    /publisherConfirmationsEnabled|CreateChannelOptions/,
  );
  assert.match(diagnostics, /IMeterFactory/);
  assert.doesNotMatch(diagnostics, /new Meter\(/);
  assert.match(transport, /mandatory: true/);
  assert.match(transport, /DeliveryModes\.Persistent/);
  assert.match(transport, /BasicConsumeAsync/);
  assert.match(transport, /BasicQosAsync/);
  assert.match(transport, /BasicAckAsync/);
  assert.match(transport, /BasicNackAsync/);
  assert.match(
    transport,
    /exception is ArgumentException or InvalidOperationException/,
  );
  assert.match(transport, /catch \(Exception exception\)[\s\S]*requeueing/);
  assert.match(registration, /AddHealthChecks/);
  assert.match(registration, /RabbitMqConsumer/);
  assert.match(registration, /AttemptTimeout/);
  assert.match(registration, /AutomaticAttemptLimit/);
  assert.match(registration, /Inbox|DeliverAsync/);
  assert.doesNotMatch(
    `${options}\n${registration}`,
    /guest|password-value|client-secret-value/i,
  );
});
