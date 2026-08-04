# FastEndpoints source generation and Native AOT

## Purpose

Define the default FastEndpoints path for source-generated discovery and
serialization, and document the extra startup and publishing constraints that
appear when a FastEndpoints app targets Native AOT.

## Default guidance

- Install `FastEndpoints.Generator` in every project that owns FastEndpoints
  types you expect the app to discover, serialize, or bind through generated
  helpers.
- Use the generated type discovery output when startup cost matters:
  register `DiscoveredTypes.All` with `AddFastEndpoints(...)` and merge
  generated type arrays from each participating assembly when the app spans
  multiple FE projects.
- For AOT, enable generated serializer contexts and wire the generated startup
  helpers into `UseFastEndpoints(...)` so FE can register serializer contexts
  and generated reflection data without runtime reflection fallback.
- Treat generated serializer context files as maintained source artifacts and
  check them into source control, because FastEndpoints documents them as part
  of the authored code path rather than disposable build output.
- Follow the documented AOT app shape: use the slim builder, add the FE
  packages needed for generator and OpenAPI scenarios, and prefer conditional
  `PublishAot` for `Release` builds so day-to-day development stays simpler.
- If an AOT build must serve OpenAPI publicly, export swagger JSON at publish
  time, serve it as static content, and use Scalar for visualization with the
  documented ordering:
  `UseStaticFiles()` -> `UseFastEndpoints()` -> `ExportSwaggerDocsAndExitAsync()`.

## Avoid

- Do not assume reflection scanning, runtime expression compilation, NSwag, or
  SwaggerUI will behave the same in a production AOT build.
- Do not install the generator in only the entrypoint project when endpoints or
  DTOs live in referenced FE assemblies.
- Do not drop generated serializer context output from source control if the app
  depends on FE's documented serializer context generation workflow.
- Do not forget that AOT OpenAPI export and runtime visualization are separate
  concerns with separate startup steps.

## Review checklist

- Every FE assembly that contributes endpoints/DTOs/generator output references
  `FastEndpoints.Generator`.
- Startup wires in generated discovered types, serializer contexts, and
  reflection cache helpers where the selected FE mode requires them.
- AOT-specific project properties and package requirements are present only
  where the app truly intends to publish natively.
- If OpenAPI is exposed in AOT builds, export, static file serving, and Scalar
  setup all match the documented FE ordering and document names.

## Related files

- [Startup and registration](./foundation-startup-registration.md)
- [Configuration options](./foundation-configuration-options.md)
- [Scaffolding](./foundation-scaffolding.md)
- [FastEndpoints foundation map](../references/foundation-map.md)

## Source anchors

- [Configuration Settings - Source Generator Based Startup](https://fast-endpoints.com/docs/configuration-settings#source-generator-based-startup)
- [Configuration Settings - Source Generated Reflection](https://fast-endpoints.com/docs/configuration-settings#source-generated-reflection)
- [Native AOT Publishing - Project Setup](https://fast-endpoints.com/docs/native-aot#project-setup)
- [Native AOT Publishing - Enable AOT Publishing](https://fast-endpoints.com/docs/native-aot#enable-aot-publishing)
- [Native AOT Publishing - JsonSerializerContext Generation](https://fast-endpoints.com/docs/native-aot#jsonserializercontext-generation)
- [Native AOT Publishing - Use Slim Builder and Type Discovery Generator](https://fast-endpoints.com/docs/native-aot#use-slim-builder-and-type-discovery-generator)
- [Native AOT Publishing - Register Generated SerializerContext & Reflection Data](https://fast-endpoints.com/docs/native-aot#register-generated-serializercontext-reflection-data)
- [Native AOT Publishing - Swagger Setup](https://fast-endpoints.com/docs/native-aot#swagger-setup)
- [Native AOT Publishing - Simplify Swagger Setup](https://fast-endpoints.com/docs/native-aot#simplify-swagger-setup)
