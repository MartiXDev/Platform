# Ecosystem boundary map

## Ownership table

| Topic | Keep here | Hand off |
| --- | --- | --- |
| Fluent React packages and components | Package selection, public API, slots, tokens, behavior | Generic app architecture when Fluent is incidental |
| TypeScript | Fluent prop/slot typing and TSX examples | `martix-typescript` for tsconfig, module resolution, declarations, advanced type design |
| SPFx | Fluent component and token decisions | `martix-sharepoint-spfx` for host, theme variants, packaging, deployment |
| Vue | Web Components registration, theming, DOM tag/event declarations, and contract | Vue state, routing, build architecture; deeper TypeScript configuration as needed |
| Charts | Fluent chart fit, theme, accessibility | Domain visualization architecture or third-party library internals |
| Motion | Fluent motion fit and reduced motion | General animation-system architecture beyond Fluent |
| Testing | Fluent semantics, focus, themes, SSR behavior | Repository test infrastructure |

## React-first rule

Use React v9 for nearly all Fluent UI application work. Do not dilute the main
router with equal-weight Vue guidance. The Vue branch exists because Web Components
can be used in Vue, not because Fluent UI React is portable to Vue.

## TypeScript handoff examples

Stay in this skill for:

- typing a Fluent slot;
- preserving a component ref;
- choosing `ComponentProps` usage for a thin wrapper;
- testing that a public wrapper preserves Fluent component props.
- declaring the DOM tag and event surface for Fluent custom elements used in Vue.

Open `martix-typescript` for:

- selecting `moduleResolution` for atomic icon imports;
- configuring `tsconfig` or generated Vue component declarations;
- configuring JSX and declaration emit;
- publishing a reusable component package;
- designing complex generic or discriminated-union APIs;
- type-level regression tests.

## Package maturity boundary

Package availability is not equivalent to GA support. Check each package's
published release channel and source. Surface alpha, beta, experimental, or
`_unstable` status in the implementation decision.
