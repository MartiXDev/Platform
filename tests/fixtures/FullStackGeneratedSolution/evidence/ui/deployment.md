# UI deployment evidence

Provider: `vue`

The UI artifact is immutable and receives public, non-secret `/ui-config.json`
at deployment time. The public origin keeps UI, API, and authentication routes
explicit while allowing independent internal processes. Readiness, rollback,
cache revalidation, and configuration failure states are observable.
