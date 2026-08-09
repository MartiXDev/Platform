#:sdk Microsoft.NET.Sdk
#:package Aspire.Hosting@13.0.0

using Aspire.Hosting;

var builder = DistributedApplication.CreateBuilder(args);
// Generated from the validated Deployment Manifest; do not edit topology here.
var parameter_ASPNETCORE_URLS = builder.AddParameter("ASPNETCORE_URLS");
var database = builder.AddConnectionString("database");
var migrator = builder.AddExecutable("migrator", "dotnet", ".", "MartiX.Inventory.Migrator", "apply");
migrator.WithReference(database);
var api = builder.AddExecutable("api", "dotnet", ".", "MartiX.Inventory.Api");
api.WithReference(database);
api.WaitForCompletion(migrator);
api.WithEnvironment("ASPNETCORE_URLS", parameter_ASPNETCORE_URLS);
api.WithHttpHealthCheck("/health/readiness");

// SIGTERM and the declared grace periods remain application-owned shutdown semantics.
// Required configuration is supplied by the developer environment or user-secrets.
builder.Build().Run();
