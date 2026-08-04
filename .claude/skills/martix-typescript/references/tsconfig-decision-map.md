# tsconfig decision map

Choose configuration from the host and artifact contract.

- **Node or Bun application/package:** use `nodenext` for `module` and
  `moduleResolution`. Emit when TypeScript owns build output. Start with the
  [`tsconfig-node`](../templates/tsconfig-node.template.jsonc) template.
- **Browser application with bundler:** use `preserve` with `bundler` and
  usually `noEmit`. Start with the
  [`tsconfig-bundler`](../templates/tsconfig-bundler.template.jsonc) template.
- **Published Node-oriented library:** use `nodenext` for both options and emit
  declarations through an explicit output graph. Start with the
  [`tsconfig-library`](../templates/tsconfig-library.template.jsonc) template.
- **Direct Node type stripping:** use `nodenext` with `noEmit`; add
  `erasableSyntaxOnly` and extension rewriting to the Node template.

## Questions before editing

1. Which process executes the JavaScript?
2. Which tool owns JavaScript emit?
3. Is the package ESM, CJS, dual-format, or source-only?
4. Are declarations published or consumed through project references?
5. Which globals are intentional now that TS7 defaults `types` to `[]`?
6. Does a shared base config already own the setting?

## Beyond-strict options

Treat these as contract decisions rather than universal defaults:

- `noUncheckedIndexedAccess` adds absence to unchecked indexed reads.
- `exactOptionalPropertyTypes` distinguishes missing properties from explicit
  `undefined` unless the value type includes it.
- `noPropertyAccessFromIndexSignature` makes dictionary-style access explicit.
- `noImplicitReturns` and `noFallthroughCasesInSwitch` are control-flow policy,
  not part of the `strict` family.

Adopt them in greenfield configs when the team accepts the contract. In an
existing project, scope the migration and fix findings instead of hiding them.

## Project references

Use references when projects have real build and dependency boundaries.
Referenced projects need `composite`; declaration output becomes the contract
consumed by dependents. Validate with `tsc --build`, not only leaf `--noEmit`.
