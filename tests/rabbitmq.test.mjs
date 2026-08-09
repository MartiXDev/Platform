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

test("RabbitMQ adapter pins the provider and preserves durable transport boundaries", async () => {
  const [
    project,
    options,
    topology,
    serializer,
    connectionManager,
    transport,
    registration,
  ] =
    await Promise.all([
      readPackageFile("MartiX.Platform.IntegrationEvents.RabbitMq.csproj"),
      readPackageFile("RabbitMqTransportOptions.cs"),
      readPackageFile("RabbitMqTopology.cs"),
      readPackageFile("RabbitMqEnvelopeSerializer.cs"),
      readPackageFile("RabbitMqConnectionManager.cs"),
      readPackageFile("RabbitMqReliableEventsTransport.cs"),
      readPackageFile("RabbitMqReliableEventsRegistration.cs"),
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
  assert.match(
    `${connectionManager}\n${transport}`,
    /publisherConfirmationsEnabled|CreateChannelOptions/,
  );
  assert.match(transport, /mandatory: true/);
  assert.match(transport, /DeliveryModes\.Persistent/);
  assert.match(transport, /BasicConsumeAsync/);
  assert.match(transport, /BasicQosAsync/);
  assert.match(transport, /BasicAckAsync/);
  assert.match(transport, /BasicNackAsync/);
  assert.match(transport, /catch \(ArgumentException/);
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
