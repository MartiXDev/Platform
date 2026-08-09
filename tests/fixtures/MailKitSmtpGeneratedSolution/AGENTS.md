# MailKit SMTP Generated Solution routing

- Manifest: `martix.platform.json`
- Acceptance record: `mailkit-smtp.json`
- Notification seam: `src/MartiX.MailKitSmtpTestApp.Notifications`
- Tests: `tests/MartiX.MailKitSmtpTestApp.Tests`
- Verification: `eng/verify.mjs` from the repository root

The notification intent is application-owned and durable. Keep SMTP transport
types behind the adapter; business modules must not depend on `MimeMessage`.
Use external-only configuration, never add secret values or Supported claims,
and do not create `martix.agent.json`.
