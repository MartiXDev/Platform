using System;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MartiX.Platform.EntityFrameworkCore.ReliableEvents;

/// <summary>Provides explicit module-owned reliable-events table mappings.</summary>
public static class ReliableEventsModelBuilderExtensions
{
    /// <summary>Maps both the Outbox and Inbox technical tables for one module schema.</summary>
    /// <param name="modelBuilder">The module model builder.</param>
    /// <param name="schema">The module-owned database schema.</param>
    /// <returns>The same model builder.</returns>
    public static ModelBuilder HasReliableEvents(
        this ModelBuilder modelBuilder,
        string schema)
    {
        ArgumentNullException.ThrowIfNull(modelBuilder);
        ValidateSchema(schema);
        modelBuilder.HasReliableEventsOutbox(schema);
        modelBuilder.HasReliableEventsInbox(schema);
        return modelBuilder;
    }

    /// <summary>Maps the immutable Outbox Message and fan-out Delivery tables.</summary>
    public static ModelBuilder HasReliableEventsOutbox(
        this ModelBuilder modelBuilder,
        string schema)
    {
        ArgumentNullException.ThrowIfNull(modelBuilder);
        ValidateSchema(schema);

        modelBuilder.Entity<OutboxMessage>(entity =>
        {
            entity.ToTable("outbox_messages", schema);
            entity.HasKey(message => message.MessageId)
                .HasName($"pk_{schema}_outbox_messages");
            entity.Property(message => message.MessageId)
                .HasColumnName("message_id");
            entity.Property(message => message.EventName)
                .HasColumnName("event_name")
                .HasMaxLength(200)
                .IsRequired();
            entity.Property(message => message.SchemaVersion)
                .HasColumnName("schema_version")
                .IsRequired();
            entity.Property(message => message.Publisher)
                .HasColumnName("publisher")
                .HasMaxLength(200)
                .IsRequired();
            entity.Property(message => message.OccurredAtUtc)
                .HasColumnName("occurred_at_utc")
                .IsRequired();
            entity.Property(message => message.CapturedAtUtc)
                .HasColumnName("captured_at_utc")
                .IsRequired();
            entity.Property(message => message.CorrelationId)
                .HasColumnName("correlation_id")
                .HasMaxLength(200);
            entity.Property(message => message.CausationId)
                .HasColumnName("causation_id");
            entity.Property(message => message.ActorId)
                .HasColumnName("actor_id")
                .HasMaxLength(200);
            entity.Property(message => message.TraceParent)
                .HasColumnName("trace_parent")
                .HasMaxLength(200);
            entity.Property(message => message.ContentType)
                .HasColumnName("content_type")
                .HasMaxLength(100)
                .IsRequired();
            entity.Property(message => message.Payload)
                .HasColumnName("payload")
                .HasMaxLength(ReliableEventEnvelope.PayloadLimitBytes)
                .IsRequired();
            entity.Property(message => message.PayloadLength)
                .HasColumnName("payload_length")
                .IsRequired();
            entity.Property(message => message.PayloadFingerprint)
                .HasColumnName("payload_fingerprint")
                .HasMaxLength(64)
                .IsRequired();
            entity.HasMany(message => message.Deliveries)
                .WithOne()
                .HasForeignKey(delivery => delivery.MessageId)
                .HasConstraintName($"fk_{schema}_outbox_deliveries_message")
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<OutboxDelivery>(entity =>
        {
            entity.ToTable("outbox_deliveries", schema);
            entity.HasKey(delivery => new
            {
                delivery.MessageId,
                delivery.SubscriptionId,
            }).HasName($"pk_{schema}_outbox_deliveries");
            entity.Property(delivery => delivery.MessageId)
                .HasColumnName("message_id");
            entity.Property(delivery => delivery.SubscriptionId)
                .HasColumnName("subscription_id")
                .HasMaxLength(200)
                .IsRequired();
            entity.Property(delivery => delivery.Status)
                .HasColumnName("status")
                .HasConversion<string>()
                .HasMaxLength(20)
                .IsRequired();
            entity.Property(delivery => delivery.AttemptCount)
                .HasColumnName("attempt_count")
                .IsRequired();
            entity.Property(delivery => delivery.NextAttemptAtUtc)
                .HasColumnName("next_attempt_at_utc")
                .IsRequired();
            entity.Property(delivery => delivery.LeaseId)
                .HasColumnName("lease_id");
            entity.Property(delivery => delivery.LeaseExpiresAtUtc)
                .HasColumnName("lease_expires_at_utc");
            entity.Property(delivery => delivery.DeliveredAtUtc)
                .HasColumnName("delivered_at_utc");
            entity.Property(delivery => delivery.LastFailureCategory)
                .HasColumnName("last_failure_category")
                .HasMaxLength(200);
            entity.Property(delivery => delivery.LastFailureDetail)
                .HasColumnName("last_failure_detail")
                .HasMaxLength(1000);
            entity.HasIndex(delivery => new
            {
                delivery.Status,
                delivery.NextAttemptAtUtc,
            }).HasDatabaseName($"ix_{schema}_outbox_deliveries_due");
        });

        return modelBuilder;
    }

    /// <summary>Maps the consumer-owned Inbox Receipt table.</summary>
    public static ModelBuilder HasReliableEventsInbox(
        this ModelBuilder modelBuilder,
        string schema)
    {
        ArgumentNullException.ThrowIfNull(modelBuilder);
        ValidateSchema(schema);

        modelBuilder.Entity<InboxReceipt>(entity =>
        {
            entity.ToTable("inbox_receipts", schema);
            entity.HasKey(receipt => new
            {
                receipt.SubscriptionId,
                receipt.MessageId,
            }).HasName($"pk_{schema}_inbox_receipts");
            entity.Property(receipt => receipt.SubscriptionId)
                .HasColumnName("subscription_id")
                .HasMaxLength(200)
                .IsRequired();
            entity.Property(receipt => receipt.MessageId)
                .HasColumnName("message_id");
            entity.Property(receipt => receipt.EventName)
                .HasColumnName("event_name")
                .HasMaxLength(200)
                .IsRequired();
            entity.Property(receipt => receipt.Publisher)
                .HasColumnName("publisher")
                .HasMaxLength(200)
                .IsRequired();
            entity.Property(receipt => receipt.SchemaVersion)
                .HasColumnName("schema_version")
                .IsRequired();
            entity.Property(receipt => receipt.PayloadFingerprint)
                .HasColumnName("payload_fingerprint")
                .HasMaxLength(64)
                .IsRequired();
            entity.Property(receipt => receipt.CompletedAtUtc)
                .HasColumnName("completed_at_utc")
                .IsRequired();
            entity.HasIndex(receipt => receipt.CompletedAtUtc)
                .HasDatabaseName($"ix_{schema}_inbox_receipts_completed");
        });

        return modelBuilder;
    }

    private static void ValidateSchema(string schema)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(schema);
        if (schema.Length > 63 ||
            schema.Any(character =>
                !(char.IsAsciiLetterOrDigit(character) || character == '_')))
        {
            throw new ArgumentException(
                "Reliable-events schemas must be bounded identifier-safe names.",
                nameof(schema));
        }
    }
}
