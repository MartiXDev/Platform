# TypeScript anti-patterns quick reference

- **One `tsconfig` for every host:** compiler and runtime resolution diverge.
  Select config from the Node, bundler, library, or stripping host.
- **`paths` treated as runtime aliases:** production cannot find modules.
  Configure the host or use package exports and subpath imports.
- **`any` at an external boundary:** unsoundness spreads inward. Accept
  `unknown`, validate it, then expose a domain type.
- **Assertion used to silence a diagnostic:** compiler evidence is discarded.
  Narrow, validate, or correct the model.
- **Generic used once:** complexity preserves no relationship. Use a concrete
  type or union.
- **Deep recursive conditional type:** checks slow down and errors become
  opaque. Bound recursion, name stages, and simplify the public API.
- **Type annotation called validation:** malformed runtime data is trusted.
  Parse at the boundary.
- **Fallback typecheck command:** project failure can be hidden. Run the project
  command and any direct compiler command independently.
- **`skipLibCheck` changed reflexively:** a dependency or config problem may be
  masked. Diagnose the source before choosing the option.
- **TS7 upgrade based only on `tsc` success:** a linter, transformer, editor, or
  framework can still break. Inventory compiler-API consumers.
- **More TS7 workers without measurement:** CI memory and nested parallelism can
  spike. Baseline CPU and memory before tuning.
- **Declaration test imports source:** the published package remains unproven.
  Compile a consumer against built artifacts.
