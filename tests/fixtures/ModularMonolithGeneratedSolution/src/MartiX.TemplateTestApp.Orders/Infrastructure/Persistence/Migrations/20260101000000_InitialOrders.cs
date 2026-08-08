using MartiX.TemplateTestApp.Orders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace MartiX.TemplateTestApp.Orders.Infrastructure.Persistence.Migrations;

[DbContext(typeof(OrdersDbContext))]
[Migration("20260101000000_InitialOrders")]
internal partial class InitialOrders : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.EnsureSchema(name: "orders");
        migrationBuilder.CreateTable(
            name: "orders_aggregate",
            schema: "orders",
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
                    "pk_orders_aggregate",
                    x => x.id);
            });

        migrationBuilder.CreateIndex(
            name: "ix_orders_aggregate_name",
            schema: "orders",
            table: "orders_aggregate",
            column: "name",
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "orders_aggregate",
            schema: "orders");
    }
}
