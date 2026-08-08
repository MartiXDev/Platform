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
                    type: "character varying(200)",
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

        migrationBuilder.CreateTable(
            name: "outbox_messages",
            schema: "billing",
            columns: table => new
            {
                message_id = table.Column<Guid>(
                    type: "uuid",
                    nullable: false),
                event_name = table.Column<string>(
                    type: "character varying(200)",
                    maxLength: 200,
                    nullable: false),
                publisher = table.Column<string>(
                    type: "character varying(200)",
                    maxLength: 200,
                    nullable: false),
                schema_version = table.Column<int>(
                    type: "integer",
                    nullable: false),
                occurred_at_utc = table.Column<DateTimeOffset>(
                    type: "timestamp with time zone",
                    nullable: false),
                captured_at_utc = table.Column<DateTimeOffset>(
                    type: "timestamp with time zone",
                    nullable: false),
                correlation_id = table.Column<string>(
                    type: "character varying(200)",
                    maxLength: 200,
                    nullable: true),
                causation_id = table.Column<Guid>(
                    type: "uuid",
                    nullable: true),
                actor_id = table.Column<string>(
                    type: "character varying(200)",
                    maxLength: 200,
                    nullable: true),
                trace_parent = table.Column<string>(
                    type: "character varying(200)",
                    maxLength: 200,
                    nullable: true),
                content_type = table.Column<string>(
                    type: "character varying(200)",
                    maxLength: 100,
                    nullable: false),
                payload = table.Column<byte[]>(
                    type: "bytea",
                    maxLength: 262144,
                    nullable: false),
                payload_length = table.Column<int>(
                    type: "integer",
                    nullable: false),
                payload_fingerprint = table.Column<string>(
                    type: "character varying(200)",
                    maxLength: 64,
                    nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_billing_outbox_messages", x => x.message_id);
            });

        migrationBuilder.CreateTable(
            name: "outbox_deliveries",
            schema: "billing",
            columns: table => new
            {
                message_id = table.Column<Guid>(
                    type: "uuid",
                    nullable: false),
                subscription_id = table.Column<string>(
                    type: "character varying(200)",
                    maxLength: 200,
                    nullable: false),
                status = table.Column<string>(
                    type: "character varying(200)",
                    maxLength: 20,
                    nullable: false),
                attempt_count = table.Column<int>(
                    type: "integer",
                    nullable: false),
                next_attempt_at_utc = table.Column<DateTimeOffset>(
                    type: "timestamp with time zone",
                    nullable: false),
                lease_id = table.Column<Guid>(
                    type: "uuid",
                    nullable: true),
                lease_expires_at_utc = table.Column<DateTimeOffset>(
                    type: "timestamp with time zone",
                    nullable: true),
                delivered_at_utc = table.Column<DateTimeOffset>(
                    type: "timestamp with time zone",
                    nullable: true),
                last_failure_category = table.Column<string>(
                    type: "character varying(200)",
                    maxLength: 200,
                    nullable: true),
                last_failure_detail = table.Column<string>(
                    type: "character varying(200)",
                    maxLength: 1000,
                    nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey(
                    "pk_billing_outbox_deliveries",
                    x => new { x.message_id, x.subscription_id });
                table.ForeignKey(
                    "fk_billing_outbox_deliveries_message",
                    x => x.message_id,
                    principalSchema: "billing",
                    principalTable: "outbox_messages",
                    principalColumn: "message_id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "inbox_receipts",
            schema: "billing",
            columns: table => new
            {
                subscription_id = table.Column<string>(
                    type: "character varying(200)",
                    maxLength: 200,
                    nullable: false),
                message_id = table.Column<Guid>(
                    type: "uuid",
                    nullable: false),
                event_name = table.Column<string>(
                    type: "character varying(200)",
                    maxLength: 200,
                    nullable: false),
                publisher = table.Column<string>(
                    type: "character varying(200)",
                    maxLength: 200,
                    nullable: false),
                schema_version = table.Column<int>(
                    type: "integer",
                    nullable: false),
                payload_fingerprint = table.Column<string>(
                    type: "character varying(200)",
                    maxLength: 64,
                    nullable: false),
                completed_at_utc = table.Column<DateTimeOffset>(
                    type: "timestamp with time zone",
                    nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey(
                    "pk_billing_inbox_receipts",
                    x => new { x.subscription_id, x.message_id });
            });

        migrationBuilder.CreateIndex(
            name: "ix_billing_outbox_deliveries_due",
            schema: "billing",
            table: "outbox_deliveries",
            columns: new[] { "status", "next_attempt_at_utc" });

        migrationBuilder.CreateIndex(
            name: "ix_billing_inbox_receipts_completed",
            schema: "billing",
            table: "inbox_receipts",
            column: "completed_at_utc");

    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "inbox_receipts",
            schema: "billing");

        migrationBuilder.DropTable(
            name: "outbox_deliveries",
            schema: "billing");

        migrationBuilder.DropTable(
            name: "outbox_messages",
            schema: "billing");

        migrationBuilder.DropTable(
            name: "billing_aggregate",
            schema: "billing");
    }
}
