# FastEndpoints scaffolding

## Purpose

Define the default FastEndpoints-specific scaffolding choices for creating new
features, starter projects, and AOT-ready projects without falling back to
generic ASP.NET templates first.

## Default guidance

- Use the FastEndpoints snippet pack for hand-authored feature work when the
  team wants to expand a slice incrementally. The key shortcuts cover endpoint,
  DTO, validator, mapper, summary, processor, command, event, and test shells.
- Use the Visual Studio feature file set template or `dotnet new feat` when the
  codebase prefers vertical-slice folders with a predictable
  `Data.cs` / `Models.cs` / `Mapper.cs` / `Endpoint.cs` layout.
- Install `FastEndpoints.TemplatePack` once per dev environment and use the FE
  starter templates when bootstrapping FE-first solutions:
  `feproj`, `feintproj`, `fetest`, and the AOT-ready `feaot` template.
- Match the chosen scaffold to the test layout you want. Use `feintproj` when
  colocated endpoint tests are intentional, and prefer `fetest` or the starter
  project template when tests should stay separated.
- Treat scaffolds as starting points. Keep only the generated FastEndpoints
  artifacts that the slice actually needs and remove unused mapper, validator,
  data, or summary shells promptly.
- Use the OpenAPI Generator `aspnet-fastendpoints` target only when the source
  of truth is an OpenAPI contract and the team accepts the community-maintained
  generator workflow.

## Avoid

- Do not start from a generic web template if a FastEndpoints template already
  matches the desired slice or project shape.
- Do not keep every generated class just because the scaffold produced it; FE
  slices should stay lean after generation.
- Do not mix scaffolded namespace/folder conventions with a different package
  structure without normalizing the output immediately.
- Do not treat community templates or the OpenAPI generator as first-party FE
  guarantees; they have a different maintenance model.

## Review checklist

- The chosen scaffold matches the intended artifact: snippet, feature file set,
  starter project, test project, or contract-generated server.
- Generated folder and namespace layout still match the solution's FE slice
  conventions after cleanup.
- Unused scaffold artifacts have been removed before the slice is considered
  complete.
- New project scaffolds are cross-checked against
  [startup and registration](./foundation-startup-registration.md) and
  [source generation and Native AOT](./foundation-source-generation-aot.md).

## Related files

- [Startup and registration](./foundation-startup-registration.md)
- [Configuration options](./foundation-configuration-options.md)
- [Source generation and Native AOT](./foundation-source-generation-aot.md)
- [FastEndpoints foundation map](../references/foundation-map.md)

## Source anchors

- [Feature Scaffolding - Code Snippets](https://fast-endpoints.com/docs/scaffolding#code-snippets)
- [Feature Scaffolding - VS New Item Template](https://fast-endpoints.com/docs/scaffolding#vs-new-item-template)
- [Feature Scaffolding - Dotnet New Item Template](https://fast-endpoints.com/docs/scaffolding#dotnet-new-item-template)
- [Feature Scaffolding - Project Scaffolding](https://fast-endpoints.com/docs/scaffolding#project-scaffolding)
- [Feature Scaffolding - OpenAPI Generator](https://fast-endpoints.com/docs/scaffolding#openapi-generator)
- [Native AOT Publishing - Project Setup](https://fast-endpoints.com/docs/native-aot#project-setup)
