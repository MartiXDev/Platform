# FastEndpoints startup and registration

## Purpose

Set the default startup shape for FastEndpoints applications: how the library is
registered, how endpoints are discovered, and how endpoint classes declare
their route/auth configuration.

## Default guidance

- Register FastEndpoints once during service setup with `AddFastEndpoints(...)`
  and keep app-level FastEndpoints customization in `UseFastEndpoints(...)`.
- Choose one endpoint configuration strategy per endpoint: override
  `Configure()` for anything non-trivial, or use the limited attribute-based
  model for small/simple cases. FastEndpoints expects one strategy, not both.
- Keep endpoint discovery intentional. Reflection scanning is the default, but
  if your endpoints live in excluded or separate assemblies, explicitly add the
  assemblies or switch to source-generator discovery.
- Use the endpoint base type that matches the contract you want to expose
  (`Endpoint<TRequest>`, `Endpoint<TRequest, TResponse>`,
  `EndpointWithoutRequest`, or `EndpointWithoutRequest<TResponse>`) so the
  registration surface and test shape stay predictable.
- When startup speed or AOT matters, pass source-generated discovered types into
  `AddFastEndpoints(...)` instead of relying on reflection scanning.

## Avoid

- Do not mix `Configure()` and endpoint attributes on the same endpoint, and do
  not leave an endpoint with neither configuration path.
- Do not assume all assemblies are scanned by default; FastEndpoints excludes
  some assembly names and can fail discovery if your project matches them.
- Do not hide FastEndpoints registration behind unrelated startup helpers when
  that makes discovery, prefixes, or filters hard to trace.

## Review checklist

- `AddFastEndpoints(...)` and `UseFastEndpoints(...)` are both present and used
  for the responsibilities FastEndpoints documents for each stage.
- Endpoint discovery is explicit enough to explain whether reflection or
  source-generated types are being used.
- Endpoints consistently use either `Configure()` or the limited attribute set,
  with no mixed strategy exceptions.
- Any registration-wide customization is cross-checked against
  [configuration options](./foundation-configuration-options.md).

## Related files

- [Configuration options](./foundation-configuration-options.md)
- [Source generation and Native AOT](./foundation-source-generation-aot.md)
- [Scaffolding](./foundation-scaffolding.md)
- [FastEndpoints foundation map](../references/foundation-map.md)

## Source anchors

- [Get Started](https://fast-endpoints.com/docs/get-started)
- [Get Started - Configuring With Attributes](https://fast-endpoints.com/docs/get-started#configuring-with-attributes)
- [Configuration Settings - Customizing Functionality](https://fast-endpoints.com/docs/configuration-settings#customizing-functionality)
- [Configuration Settings - Source Generator Based Startup](https://fast-endpoints.com/docs/configuration-settings#source-generator-based-startup)
