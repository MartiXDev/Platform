using MartiX.QuartzTestApp.Orders;
using MartiX.QuartzTestApp.Migrator.Infrastructure.DurableJobs;
using MartiX.Platform.EntityFrameworkCore.ReliableEvents;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var operation = args.FirstOrDefault()?.ToLowerInvariant() ?? "validate";
if (operation is not ("validate" or "script" or "apply"))
{
    Console.Error.WriteLine(
        "Usage: dotnet run --project MartiX.QuartzTestApp.Migrator -- [validate|script|apply]");
    return 2;
}

var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddLogging();
builder.Services.AddReliableEvents();

QuartzMigrationComposition.AddMigrationServices(builder.Services, builder.Configuration);
OrdersModule.AddMigrationServices(builder.Services, builder.Configuration);
using var host = builder.Build();


Console.WriteLine(
   await QuartzMigrationComposition.ExecuteMigrationAsync(
       host.Services,
       operation,
       CancellationToken.None));
Console.WriteLine(
    await OrdersModule.ExecuteMigrationAsync(
        host.Services,
        operation,
        CancellationToken.None));
return 0;
