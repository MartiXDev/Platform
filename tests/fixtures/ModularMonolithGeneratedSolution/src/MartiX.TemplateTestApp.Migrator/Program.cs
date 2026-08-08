using MartiX.TemplateTestApp.Orders;
using MartiX.TemplateTestApp.Billing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var operation = args.FirstOrDefault()?.ToLowerInvariant() ?? "validate";
if (operation is not ("validate" or "script" or "apply"))
{
    Console.Error.WriteLine(
        "Usage: dotnet run --project MartiX.TemplateTestApp.Migrator -- [validate|script|apply]");
    return 2;
}

var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddLogging();
OrdersModule.AddMigrationServices(builder.Services, builder.Configuration);
BillingModule.AddMigrationServices(builder.Services, builder.Configuration);
using var host = builder.Build();

Console.WriteLine(
    await OrdersModule.ExecuteMigrationAsync(
        host.Services,
        operation,
        CancellationToken.None));
Console.WriteLine(
    await BillingModule.ExecuteMigrationAsync(
        host.Services,
        operation,
        CancellationToken.None));
return 0;
