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
    domainEvents,
    envelope,
    records,
    reliableModelBuilder,
    captureInterceptor,
    inboxExecutor,
    leaseCoordinator,
    dispatcher,
    options,
    diagnostics,
    retention,
    serviceCollection,
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
      readPackageFile("ReliableEvents", "DomainEventCollection.cs"),
      readPackageFile("ReliableEvents", "ReliableEventEnvelope.cs"),
      readPackageFile("ReliableEvents", "OutboxMessage.cs"),
      readPackageFile(
        "ReliableEvents",
        "ReliableEventsModelBuilderExtensions.cs",
      ),
      readPackageFile(
        "ReliableEvents",
        "ReliableEventsSaveChangesInterceptor.cs",
      ),
      readPackageFile("ReliableEvents", "ReliableEventsInboxExecutor.cs"),
      readPackageFile("ReliableEvents", "ReliableEventsLeaseCoordinator.cs"),
      readPackageFile("ReliableEvents", "ReliableEventsDispatcher.cs"),
      readPackageFile("ReliableEvents", "ReliableEventsOptions.cs"),
      readPackageFile("ReliableEvents", "ReliableEventsDiagnostics.cs"),
      readPackageFile("ReliableEvents", "ReliableEventsRetention.cs"),
      readPackageFile(
        "ReliableEvents",
        "ReliableEventsServiceCollectionExtensions.cs",
      ),
    ]);

  assert.match(project, /<PackageId>MartiX\.Platform\.EntityFrameworkCore<\/PackageId>/);
  assert.match(project, /Microsoft\.EntityFrameworkCore/);
  assert.match(
    project,
    /<PackageReference Include="Microsoft\.Extensions\.Diagnostics" /,
  );
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
  assert.match(project, /Microsoft\.Extensions\.Hosting\.Abstractions/);
  assert.match(domainEvents, /public sealed class DomainEventCollection<TEvent>/);
  assert.match(domainEvents, /Acknowledge\(/);
  assert.match(envelope, /public sealed class ReliableEventEnvelope/);
  assert.match(envelope, /SHA256/);
  assert.match(envelope, /PayloadLimitBytes/);
  assert.match(envelope, /ReadOnlyMemory<byte>/);
  assert.match(records, /public sealed class OutboxMessage/);
  assert.match(records, /public sealed class OutboxDelivery/);
  assert.match(records, /public sealed class InboxReceipt/);
  assert.match(records, /PayloadFingerprint/);
  assert.match(records, /TryFailAfterAttemptLimit/);
  assert.match(records, /Publisher/);
  assert.match(records, /payload length does not match/i);
  assert.match(reliableModelBuilder, /HasReliableEventsOutbox/);
  assert.match(reliableModelBuilder, /HasReliableEventsInbox/);
  assert.match(captureInterceptor, /SaveChangesInterceptor/);
  assert.match(captureInterceptor, /acknowledge/);
  assert.match(captureInterceptor, /SaveChangesFailed/);
  assert.match(captureInterceptor, /SaveChangesCanceled/);
  assert.match(inboxExecutor, /BeginTransactionAsync/);
  assert.match(inboxExecutor, /DuplicateSuppressed/);
  assert.match(leaseCoordinator, /FOR UPDATE SKIP LOCKED/);
  assert.match(leaseCoordinator, /READPAST/);
  assert.match(leaseCoordinator, /READCOMMITTEDLOCK/);
  assert.match(leaseCoordinator, /ExecuteUpdateAsync/);
  assert.match(leaseCoordinator, /RequeueAsync/);
  assert.match(leaseCoordinator, /LeaseId/);
  assert.match(dispatcher, /BackgroundService/);
  assert.match(dispatcher, /MaxConcurrentDeliveries/);
  assert.match(dispatcher, /AutomaticAttemptLimit/);
  assert.match(dispatcher, /ShutdownBudget/);
  assert.match(dispatcher, /CancellationToken/);
  assert.match(dispatcher, /durable work remains recoverable/);
  assert.match(options, /BatchSize = 50/);
  assert.match(options, /AutomaticAttemptLimit = 10/);
  assert.match(options, /LeaseDuration = TimeSpan\.FromSeconds\(60\)/);
  assert.match(options, /InboxReceiptRetention/);
  assert.match(diagnostics, /duplicate-suppressed/);
  assert.match(diagnostics, /CreatePendingGauge/);
  assert.match(retention, /CleanupAsync/);
  assert.match(retention, /OutboxDeliveryStatus\.Delivered/);
  assert.match(serviceCollection, /AddMetrics\(\)/);
  assert.match(serviceCollection, /TryAddSingleton<ReliableEventsOptions>\(\)/);
  assert.match(
    serviceCollection,
    /TryAddSingleton<ReliableEventsDiagnostics>\(\)/,
  );
  assert.doesNotMatch(
    [
      domainEvents,
      envelope,
      records,
      modelBuilder,
      captureInterceptor,
      inboxExecutor,
      leaseCoordinator,
      dispatcher,
      options,
      diagnostics,
      retention,
      serviceCollection,
    ].join("\n"),
    /IOutboxStore|InMemoryOutboxStore|IIntegrationEventHandler/,
  );
});
