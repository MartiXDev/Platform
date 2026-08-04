# FastEndpoints foundation map

## Purpose

Map the FastEndpoints startup, configuration, source generation, Native AOT,
and scaffolding rules back to the approved FastEndpoints documentation set.

## Rule coverage

- **Startup shape and endpoint registration**
  - Rule files: `rules/foundation-startup-registration.md`
  - Primary sources:
    - [Get Started](https://fast-endpoints.com/docs/get-started)
    - [Configuration Settings](https://fast-endpoints.com/docs/configuration-settings)
  - Notes: Use for `AddFastEndpoints(...)`, `UseFastEndpoints(...)`,
    discovery strategy, and choosing between `Configure()` and the limited
    attribute-based configuration model.
- **Runtime configuration and shared endpoint options**
  - Rule files: `rules/foundation-configuration-options.md`
  - Primary sources:
    - [Configuration Settings](https://fast-endpoints.com/docs/configuration-settings)
  - Notes: Use for serializer settings, unified naming, route prefixes,
    registration filters, configurators, groups, and custom FE response
    behavior.
- **Source generation and Native AOT**
  - Rule files: `rules/foundation-source-generation-aot.md`
  - Primary sources:
    - [Configuration Settings](https://fast-endpoints.com/docs/configuration-settings)
    - [Native AOT Publishing](https://fast-endpoints.com/docs/native-aot)
  - Notes: Use for source-generated type discovery, generated serializer
    contexts, reflection cache population, AOT project properties, and AOT
    OpenAPI constraints.
- **Feature and project scaffolding**
  - Rule files: `rules/foundation-scaffolding.md`
  - Primary sources:
    - [Feature Scaffolding](https://fast-endpoints.com/docs/scaffolding)
    - [Native AOT Publishing](https://fast-endpoints.com/docs/native-aot)
  - Notes: Use for snippets, Visual Studio item templates, `dotnet new`
    feature templates, starter templates, and the AOT-ready project template.

## Maintenance notes

- Keep this map FastEndpoints-specific; generic ASP.NET Core host or middleware
  guidance belongs in the broader .NET skill package instead.
- If later work adds FastEndpoints files for testing, OpenAPI, or security,
  link them here instead of duplicating startup guidance in multiple maps.
- When FastEndpoints changes template names or generator wiring, update this map
  and the linked rule files together so cross-links stay trustworthy.
