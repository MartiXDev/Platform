# UI deployment evidence

Provider: `blazor-webapp`
Rendering profile: `application`

The UI artifact is immutable and receives public, non-secret `/ui-config.json`
at deployment time. The public origin keeps UI, API, and authentication routes
explicit while allowing independent internal processes. Readiness, rollback,
cache revalidation, and configuration failure states are observable. Private
responses use `no-store`; Blazor uses prerendered Interactive Server rendering for application workflows; this profile makes no public SEO or shared-cache claim.
