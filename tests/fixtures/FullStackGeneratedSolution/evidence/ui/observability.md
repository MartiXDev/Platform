# UI observability evidence

Provider: `blazor-webapp`
Rendering profile: `application`

Route and feature boundaries emit safe operation identifiers, trace
correlation, release context, and a public support identifier. Reporter
failures do not affect UI behavior. No request bodies, response bodies,
credentials, cookies, personal query values, or stack traces leave the UI.
