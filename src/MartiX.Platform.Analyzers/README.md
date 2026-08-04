# MartiX.Platform.Analyzers

`MartiX.Platform.Analyzers` is the build-time companion to the
`MartiX.Platform` Kernel. It is a Roslyn analyzer package with no runtime
assembly or runtime dependency.

The analyzer reports values that are provably invalid at the
`Error.Create(...)` call site:

| Diagnostic | Meaning |
| --- | --- |
| `MXP001` | A compile-time error-code value is not made of lowercase owner-prefixed dot-separated segments. |
| `MXP002` | A compile-time error-code value uses the reserved `platform.` prefix. |

Both diagnostics are warnings by default and therefore fail a consumer project
that enables `TreatWarningsAsErrors`. Values supplied through runtime variables
are not guessed by the analyzer; the Kernel still validates those values at
runtime.
