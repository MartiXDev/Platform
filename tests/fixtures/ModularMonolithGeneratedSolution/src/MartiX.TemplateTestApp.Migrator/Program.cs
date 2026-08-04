using MartiX.TemplateTestApp.Orders;
using MartiX.TemplateTestApp.Billing;
var operation = args.FirstOrDefault()?.ToLowerInvariant() ?? "validate";
if (operation is not ("validate" or "script" or "apply"))
{
    Console.Error.WriteLine(
        "Usage: dotnet run --project MartiX.TemplateTestApp.Migrator -- [validate|script|apply]");
    return 2;
}

var migrationIdentities = new[]
{
    OrdersModule.MigrationIdentity,
    BillingModule.MigrationIdentity,
};

Console.WriteLine(
    $"{operation}: {string.Join(", ", migrationIdentities)}");
return 0;
