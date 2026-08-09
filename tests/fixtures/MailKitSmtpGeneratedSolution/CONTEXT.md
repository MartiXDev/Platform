# MailKit SMTP Generated Solution context

This fixture models email as an external notification-delivery channel. A
business operation persists a validated `NotificationDeliveryIntent` first.
A bounded dispatcher then leases the intent, calls MailKit, and records only a
provider acceptance, transient failure, permanent failure, or cancellation.
Provider acceptance is not a claim of final human delivery.

The initial posture is JIT-only. TLS, authentication, cancellation, bounded
retry, redaction, metrics, operator requeue, and Mailpit evidence are explicit
acceptance requirements.
