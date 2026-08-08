using MartiX.TemplateTestApp.Billing.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace MartiX.TemplateTestApp.Billing.Infrastructure.Persistence.Migrations;

[DbContext(typeof(BillingDbContext))]
[Migration("20260101000000_InitialBilling")]
internal partial class InitialBilling : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.EnsureSchema(name: "billing");
        migrationBuilder.CreateTable(
            name: "billing_aggregate",
            schema: "billing",
            columns: table => new
            {
                id = table.Column<Guid>(
                    type: "uuid",
                    nullable: false),
                name = table.Column<string>(
                    type: "text",
                    maxLength: 200,
                    nullable: false),
                created_at = table.Column<DateTimeOffset>(
                    type: "timestamp with time zone",
                    nullable: false),
                updated_at = table.Column<DateTimeOffset>(
                    type: "timestamp with time zone",
                    nullable: false),
                concurrency_token = table.Column<Guid>(
                    type: "uuid",
                    nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey(
                    "pk_billing_aggregate",
                    x => x.id);
            });

        migrationBuilder.CreateIndex(
            name: "ix_billing_aggregate_name",
            schema: "billing",
            table: "billing_aggregate",
            column: "name",
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "billing_aggregate",
            schema: "billing");
    }
}
