# UI security evidence

Provider: `vue`

The UI uses a same-origin, server-owned session cookie and never stores access
or refresh credentials in browser persistence. Problem Details are normalized
without sensitive diagnostics. CSP, secure headers, antiforgery, safe redirect
validation, self-hosted assets, and no raw HTML sinks are release checks.
