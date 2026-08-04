# FastEndpoints cookbook index

## Purpose

Index the official FastEndpoints cookbook so this standalone skill can link to
the right recipe families quickly, while keeping testing and versioning guidance
anchored in the primary docs first.

## Official cookbook sections

The official cookbook currently groups recipes under these headings:

- Auth
- Configuration
- Job Persistence
- Middleware & Pipeline
- Miscellaneous
- Results Pattern
- Serialization
- Swagger
- Testing
- Validation
- Versioning

## Workstream-relevant sections

### Testing

Use the testing section when the core testing doc identifies the default
strategy but you still need a concrete recipe for a tricky scenario.

- [Using a mock/test authentication handler for integration tests](https://gist.github.com/dj-nitehawk/84fe7b3a69d65e92a94f95e42c962f9e)
- [Integration testing with TestContainers & AppFixture](https://gist.github.com/dj-nitehawk/04a78cea10f2239eb81c958c52ec84e0)
- [Integration testing an endpoint that executes a command](https://gist.github.com/dj-nitehawk/abf3fd08bae544ee3bcafb5c5f487c4a)
- [Integration testing an endpoint that publishes an event](https://gist.github.com/dj-nitehawk/ae85c63fefb1e8163fdd37ca6dcb7bfd)
- [Unit testing an endpoint that executes a command](https://gist.github.com/dj-nitehawk/f0c5c95c57ac1f1d15c936e9d87734b0)
- [Unit testing an endpoint that publishes an event](https://gist.github.com/dj-nitehawk/8ab7bb4ce5b69152b07b9186d7c40e40)
- [Forwarding console log messages to xUnit's message sink](https://gist.github.com/dj-nitehawk/58c14fd593cf58fa5e8df95cfb9eb549)

#### Versioning

Use the versioning section when the API versioning doc defines the strategy, but
you need recipe-level samples for a chosen implementation.

- [Versioning with Asp.Versioning.Http](https://gist.github.com/dj-nitehawk/fbefbcb6273d372e5e5913accb18ab76)
- [Showing deprecated versions in Swagger with built-in versioning](https://gist.github.com/dj-nitehawk/c32e7f887389460c661b955d233b650d)

## Normative usage in this skill

- Treat cookbook recipes as implementation examples, not as the primary source
  of policy.
- Pull testing recipes in after deciding whether the scenario is integration,
  unit, auth-sensitive, infra-heavy, or side-effect-heavy.
- Pull versioning recipes in after deciding whether built-in route versioning or
  `Asp.Versioning.Http` owns the contract.
- Prefer adding a small note about first-pass coverage over pretending the
  cookbook index is exhaustive or permanent.

## Cookbook-derived synthesis for first pass

- The testing recipes reinforce a practical split: integration tests should
  verify pipeline behavior and externalized side effects, while unit tests
  should verify handler logic with explicit fake registrations.
- The versioning recipes reinforce a practical split: built-in versioning fits
  route-first release-group documentation, while `Asp.Versioning.Http` fits
  header-based or conventional API-version contracts.
- The cookbook consistently solves edge cases by extending the standard
  FastEndpoints surface instead of replacing it with a parallel test or
  versioning abstraction.

## Review checklist

- The index preserves the official cookbook section names accurately.
- Testing and versioning entries are easy to locate and link back to rule files.
- The narrative states clearly that cookbook samples are secondary to the
  official docs.
- Cross-links keep this index connected to the active testing/versioning
  workstream.

## Related files

- [Testing and versioning map](./testing-versioning-map.md)
- [Testing FastEndpoints rule](../rules/testing-fastendpoints.md)
- [Versioning and release groups rule](../rules/versioning-release-groups.md)

## Source anchors

- [FastEndpoints cookbook](https://fast-endpoints.com/docs/the-cookbook)
- [FastEndpoints integration and unit testing](https://fast-endpoints.com/docs/integration-unit-testing)
- [FastEndpoints API versioning](https://fast-endpoints.com/docs/api-versioning)
