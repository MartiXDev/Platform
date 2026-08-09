# MailKit SMTP Mailpit evidence

This acceptance fixture pins Mailpit **1.30.0**, commit `af8756a`, in a
disposable Testcontainers-managed SMTP service. The test profile enables
STARTTLS and authenticated SMTP using values injected by the environment; no
credential or recipient value is checked in.

The deterministic unit tests use a capturing adapter. The Mailpit integration
profile verifies TLS negotiation, authentication, provider acceptance, and
API-visible message shape. Controlled SMTP failures return `451` for a
transient result and `550` for a permanent result. Cancellation propagates
through connect, authenticate, send, and disconnect without recording
provider acceptance.

Metrics contain only backlog age, attempts, provider acceptance, stable failure
class, latency, and terminal failure. Recipient, subject, body, attachment,
and provider response text are redacted; this is the required telemetry
redaction behavior. Automatic retry is bounded; an
operator can explicitly requeue a terminal intent. Relay acceptance is not
human-delivery proof, and this fixture makes no Native AOT claim.
